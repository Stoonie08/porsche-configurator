// USD Time variants: materials use KHR_materials_variants; visibility/lights
// use usdTimeVariants extras authored by the accompanying exporter.
export async function createTimeVariants(gltf) {
  const parser = gltf.parser;
  const data = parser.json.extras?.usdTimeVariants;
  if (!data) return null; // Older GLBs keep their existing behavior.
  if (data.version !== 1 || !data.states?.day || !data.states?.night) {
    throw new Error('Unsupported USD Time variant metadata. Re-export the GLB.');
  }
  const nodes = new Map();
  const meshes = [];
  gltf.scene.traverse(object => {
    const association = parser.associations.get(object);
    if (association?.nodes !== undefined) {
      const objects = nodes.get(association.nodes) || [];
      objects.push(object);
      nodes.set(association.nodes, objects);
    }
    if (object.isMesh && association?.meshes !== undefined) {
      meshes.push({ object, association, original: object.material, states: {} });
    }
  });
  // Load variants once. Switching Day/Night then makes no network requests.
  for (const mode of ['day', 'night']) {
    const state = data.states[mode];
    for (const record of meshes) {
      const {object, association, original} = record;
      const primitive = parser.json.meshes[association.meshes].primitives[association.primitives ?? 0];
      const mappings = primitive.extensions?.KHR_materials_variants?.mappings || [];
      const mapping = mappings.find(m => m.variants.includes(state.variant));
      if (!mapping || mapping.material === primitive.material) {
        record.states[mode] = original;
        continue;
      }
      try {
        object.material = await parser.getDependency('material', mapping.material);
        // Keep GLTFLoader's vertex color / flat shading / tangent adjustments.
        parser.assignFinalMaterial(object);
        record.states[mode] = object.material;
      } finally {
        object.material = original;
      }
    }
  }
  const lightObjects = new Map();
  for (const mode of ['day', 'night']) {
    for (const id of Object.keys(data.states[mode].lights || {})) {
      if (lightObjects.has(id)) continue;
      const lights = new Set();
      for (const root of nodes.get(Number(id)) || []) {
        // Stop at descendant glTF nodes: each light is controlled by its own node.
        const visit = object => {
          if (object !== root && parser.associations.get(object)?.nodes !== undefined) return;
          if (object.isLight) lights.add(object);
          for (const child of object.children) visit(child);
        };
        visit(root);
      }
      lightObjects.set(id, lights);
    }
  }
  return {
    apply(mode) {
      const state = data.states[mode];
      if (!state) throw new Error('Unknown Time state: ' + mode);
      for (const record of meshes) record.object.material = record.states[mode];
      for (const [id, visible] of Object.entries(state.visibility)) {
        for (const object of nodes.get(Number(id)) || []) object.visible = visible;
      }
      for (const [id, values] of Object.entries(state.lights || {})) {
        for (const light of lightObjects.get(id) || []) {
          light.intensity = values.intensity ?? 1;
          light.color.fromArray(values.color || [1, 1, 1]);
          if (light.isPointLight || light.isSpotLight) light.distance = values.range ?? 0;
          if (light.isSpotLight && values.spot) {
            light.angle = values.spot.outerConeAngle;
            light.penumbra = light.angle > 0 ? 1 - values.spot.innerConeAngle / light.angle : 0;
          }
        }
      }
    },
  };
}
