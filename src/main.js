import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createUI } from "./ui.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";

// Interface
const ui = createUI();
const viewer = ui.viewer;
const status = ui.status;

let panorama = null;
let backgroundMode = "studio";
let timeOfDay = "day";
let groundMaterial = null;
let paintMaterials = [];
let overview = null;
let transition = null;
let presets = {};
let contactShadowPlane = null;
let framingBounds = null;
let autoFrame = true;
// Fraction of the viewer available to full-car preset framing.
const framingFill = 1.9;

function fitView(view, aspect = camera.aspect) {
  if (!framingBounds || !view) return view;
  const target = new THREE.Vector3(...view.target);
  const position = new THREE.Vector3(...view.position);
  const backward = position.clone().sub(target).normalize();
  const basis = new THREE.Matrix4().lookAt(position, target, camera.up);
  const right = new THREE.Vector3().setFromMatrixColumn(basis, 0);
  const up = new THREE.Vector3().setFromMatrixColumn(basis, 1);
  const fill = view.fill ?? framingFill;
  const tanY = Math.tan(THREE.MathUtils.degToRad(view.fov) / 2) * fill;
  const tanX = tanY * aspect;
  // Side can fit closer than its original preset distance.
  let distance = view.fitToBounds
    ? camera.near * 2
    : position.distanceTo(target);
  for (const x of [framingBounds.min.x, framingBounds.max.x]) {
    for (const y of [framingBounds.min.y, framingBounds.max.y]) {
      for (const z of [framingBounds.min.z, framingBounds.max.z]) {
        const offset = new THREE.Vector3(x, y, z).sub(target);
        const depthOffset = offset.dot(backward);
        distance = Math.max(
          distance,
          depthOffset + Math.abs(offset.dot(right)) / tanX,
          depthOffset + Math.abs(offset.dot(up)) / tanY,
          depthOffset + camera.near * 2,
        );
      }
    }
  }
  return {
    ...view,
    position: target.clone().addScaledVector(backward, distance).toArray(),
  };
}

function applyView(view) {
  camera.position.fromArray(view.position);
  controls.target.fromArray(view.target);
  camera.fov = view.fov;
  camera.updateProjectionMatrix();
  controls.update();
}

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color("#d7dddf");
scene.environmentIntensity = 0.5;
scene.environmentRotation.y = THREE.MathUtils.degToRad(184);
scene.backgroundRotation.y = scene.environmentRotation.y;

// Camera
const camera = new THREE.PerspectiveCamera(
  50,
  viewer.clientWidth / viewer.clientHeight,
  0.01,
  100,
);

camera.position.set(5, 3, 5);

// Renderer
const renderer = new THREE.WebGLRenderer({
  antialias: true,
});

renderer.setSize(viewer.clientWidth, viewer.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

viewer.prepend(renderer.domElement);

// Depth of field: used only for Tire view after its transition.
// Antialiasing for views that use postprocessing.
const renderTarget = new THREE.WebGLRenderTarget(
  viewer.clientWidth,
  viewer.clientHeight,
  {
    type: THREE.HalfFloatType,
    samples: 4,
  },
);

const composer = new EffectComposer(renderer, renderTarget);
composer.setPixelRatio(renderer.getPixelRatio());
composer.setSize(viewer.clientWidth, viewer.clientHeight);
composer.addPass(new RenderPass(scene, camera));

const bokeh = new BokehPass(scene, camera, {
  focus: 0.96,
  aperture: 0.003,
  maxblur: 0.008,
});

// Bokeh renders the scene again using a depth-only material.
// Preserve the lighting shadow maps during that auxiliary render, and keep
// the transparent contact-shadow overlay out of the depth buffer. Its color
// is already included by RenderPass; the ground supplies the floor depth.
const renderBokeh = bokeh.render.bind(bokeh);
bokeh.render = (renderer, writeBuffer, readBuffer, ...args) => {
  const autoUpdate = renderer.shadowMap.autoUpdate;
  const needsUpdate = renderer.shadowMap.needsUpdate;
  const contactVisible = contactShadowPlane?.visible;
  const overrideMaterial = scene.overrideMaterial;

  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = false;
  if (contactShadowPlane) contactShadowPlane.visible = false;

  try {
    renderBokeh(renderer, writeBuffer, readBuffer, ...args);
  } finally {
    renderer.shadowMap.autoUpdate = autoUpdate;
    renderer.shadowMap.needsUpdate = needsUpdate;
    scene.overrideMaterial = overrideMaterial;
    if (contactShadowPlane) contactShadowPlane.visible = contactVisible;
  }
};

composer.addPass(bokeh);
composer.addPass(new OutputPass());

let activeView = "Overview";

const dofSettings = {
  enabled: true,
  focus: 0.96,
  aperture: 0.003,
  maxblur: 0.008,
};

// HDR environment
const hdriURL = `${import.meta.env.BASE_URL}hdri/studio.hdr`;

new HDRLoader().load(
  hdriURL,
  (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;

    scene.environment = texture;
    panorama = texture;

    if (backgroundMode === "panorama") {
      scene.background = texture;
    }

    scene.backgroundIntensity = timeOfDay === "night" ? 0.12 : 0.3;
    scene.backgroundBlurriness = 0.1;
  },
  undefined,
  (error) => {
    console.error("HDR environment failed to load:", error);
  },
);

// Directional light
const sun = new THREE.DirectionalLight(0xffffff, 3);

sun.position.set(3, 6, 4);
sun.castShadow = true;
sun.shadow.intensity = 0.65;

sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -4;
sun.shadow.camera.right = 4;
sun.shadow.camera.top = 4;
sun.shadow.camera.bottom = -4;
sun.shadow.camera.near = 0.1;
sun.shadow.camera.far = 20;
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.normalBias = 0.005;

scene.add(sun);
scene.add(sun.target);

// Mouse and touch controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Elastic lower orbit limit. Angles are measured down from the top.
const elasticOrbitSettings = {
  startAngle: 90,
  stopAngle: 100,
  resistance: 2.5, // Higher = harder to drag beyond 90 degrees.
  returnDuration: 200, // Milliseconds to return on release.
};

controls.screenSpacePanning = false;
const elasticOrbit = installElasticOrbit(
  controls,
  camera,
  elasticOrbitSettings,
);

function installElasticOrbit(orbit, orbitCamera, settings) {
  const start = THREE.MathUtils.degToRad(settings.startAngle);
  const stop = THREE.MathUtils.degToRad(settings.stopAngle);
  const zone = stop - start;
  const offset = new THREE.Vector3();
  const spherical = new THREE.Spherical();
  const originalUpdate = orbit.update.bind(orbit);
  let dragging = false;
  let returning = null;

  function readAngle() {
    offset.copy(orbitCamera.position).sub(orbit.target);
    return spherical.setFromVector3(offset).phi;
  }

  function setAngle(angle) {
    offset.copy(orbitCamera.position).sub(orbit.target);
    spherical.setFromVector3(offset);
    spherical.phi = angle;
    orbitCamera.position
      .copy(orbit.target)
      .add(offset.setFromSpherical(spherical));
    orbitCamera.lookAt(orbit.target);
  }

  orbit.maxPolarAngle = start;
  orbit.addEventListener("start", () => {
    dragging = true;
    returning = null;
    orbit.maxPolarAngle = stop;
  });

  orbit.addEventListener("end", () => {
    dragging = false;
    const angle = readAngle();
    returning =
      angle > start
        ? { angle: Math.min(angle, stop), time: performance.now() }
        : null;
    orbit.maxPolarAngle = start;
  });

  // OrbitControls calls update for pointer input as well as each animation frame.
  // Wrap that single entry point so resistance is applied consistently.
  orbit.update = (...args) => {
    const before = readAngle();
    orbit.maxPolarAngle = dragging ? stop : start;
    const changed = originalUpdate(...args);
    const after = readAngle();

    if (dragging && after > start && after > before) {
      const base = Math.max(start, Math.min(before, stop));
      const drag = after - base;
      const remaining = stop - base;
      let angle =
        base + remaining * (1 - Math.exp(-drag / (zone * settings.resistance)));
      if (stop - angle < THREE.MathUtils.degToRad(0.03)) angle = stop;
      setAngle(Math.min(angle, stop));
    } else if (!dragging && returning) {
      const t = Math.min(
        (performance.now() - returning.time) / settings.returnDuration,
        1,
      );
      const ease = t * t * (3 - 2 * t);
      setAngle(THREE.MathUtils.lerp(returning.angle, start, ease));
      if (t === 1) returning = null;
    }
    return changed;
  };

  return {
    cancel() {
      dragging = false;
      returning = null;
      orbit.maxPolarAngle = start;
    },
  };
}

function capture() {
  return {
    position: camera.position.toArray(),
    target: controls.target.toArray(),
    fov: camera.fov,
  };
}

function moveTo(view) {
  if (!view) return;
  elasticOrbit.cancel();
  controls.autoRotate = false;
  ui.syncAutoRotate(false);

  controls.enableDamping = false;
  controls.update();

  transition = {
    from: capture(),
    to: view,
    start: performance.now(),
  };
}

controls.addEventListener("start", () => {
  autoFrame = false;
  controls.autoRotate = false;
  ui.syncAutoRotate(false);
  transition = null;
  controls.enableDamping = true;
  ui.manualView();
});

// Connect interface actions
ui.connect({
  paint(color) {
    paintMaterials.forEach(({ material, original }) => {
      if (color === null) {
        material.color.copy(original);
      } else {
        material.color.set(color);
      }
    });
  },

  view(name) {
    activeView = name;
    autoFrame = name !== "Tire";
    moveTo(autoFrame ? fitView(presets[name]) : presets[name]);
  },

  restore(view) {
    autoFrame = false;
    activeView = view.name === "Tire" ? "Tire" : "Custom";
    ui.manualView();
    moveTo(view);
  },

  dof(key, value) {
    dofSettings[key] = value;

    if (key !== "enabled") {
      bokeh.uniforms[key].value = value;
    }
  },

  autoRotate(enabled) {
    elasticOrbit.cancel();
    transition = null;
    autoFrame = false;
    controls.enableDamping = true;
    controls.autoRotate = enabled;
    controls.autoRotateSpeed = 1;
    ui.manualView();
  },

  capture,

  fov(value) {
    autoFrame = false;
    transition = null;
    controls.enableDamping = true;
    camera.fov = value;
    camera.updateProjectionMatrix();
  },

  environment(key, value) {
    if (key === "background" || key === "timeOfDay") {
      if (key === "background") backgroundMode = value;
      else timeOfDay = value;
      const night = timeOfDay === "night";
      const studioColor = night ? "#363d48" : "#d7dddf";
      if (backgroundMode === "panorama") {
        scene.background = panorama || new THREE.Color(studioColor);
      } else {
        scene.background = new THREE.Color(
          backgroundMode === "dark" ? "#24272c" : studioColor,
        );
      }
      groundMaterial?.color.set(night ? "#555e6e" : "#d7dddf");
      if (key === "timeOfDay") {
        scene.environmentIntensity = night ? 0.16 : 0.5;
        renderer.toneMappingExposure = night ? 0.85 : 1.25;
        sun.intensity = night ? 0.35 : 3;
        scene.backgroundIntensity = night ? 0.12 : 0.3;
      }
    }

    if (key === "brightness") {
      scene.environmentIntensity = value;
    }

    if (key === "exposure") {
      renderer.toneMappingExposure = value;
    }

    if (key === "rotation") {
      scene.environmentRotation.y = THREE.MathUtils.degToRad(value);
      scene.backgroundRotation.y = scene.environmentRotation.y;
    }
  },
});

// Load the Porsche
const loader = new GLTFLoader();
const modelURL = `${import.meta.env.BASE_URL}models/porsche.glb`;

loader.load(
  modelURL,
  (gltf) => {
    const model = new THREE.Group();
    model.add(gltf.scene);
    scene.add(model);

    // Normalize the car to four units along its longest side.
    let box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const longestSide = Math.max(size.x, size.y, size.z);

    if (!Number.isFinite(longestSide) || longestSide <= 0) {
      status.textContent = "The model has no usable geometry bounds.";
      return;
    }

    model.scale.setScalar(4 / longestSide);

    // Center the car.
    box = new THREE.Box3().setFromObject(model);
    model.position.sub(box.getCenter(new THREE.Vector3()));
    model.updateMatrixWorld(true);

    // Model shadows
    model.traverse((object) => {
      if (!object.isMesh) return;

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      object.castShadow = materials.some(
        (material) => !material.transparent && !(material.transmission > 0),
      );

      object.receiveShadow = true;
    });

    const carBounds = new THREE.Box3().setFromObject(model);
    framingBounds = carBounds.clone();
    const groundY = carBounds.min.y - 0.005;

    // Ground fade texture
    const fadeCanvas = document.createElement("canvas");
    fadeCanvas.width = 512;
    fadeCanvas.height = 512;

    const ctx = fadeCanvas.getContext("2d");
    const gradient = ctx.createRadialGradient(256, 256, 100, 256, 256, 250);

    gradient.addColorStop(0, "white");
    gradient.addColorStop(1, "black");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const fadeTexture = new THREE.CanvasTexture(fadeCanvas);

    // Ground plane
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshStandardMaterial({
        color: "#d7dddf",
        roughness: 0.1,
        metalness: 0,
        alphaMap: fadeTexture,
        transparent: true,
        depthWrite: false,
      }),
    );

    groundMaterial = ground.material;
    groundMaterial.color.set(timeOfDay === "night" ? "#555e6e" : "#d7dddf");
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = groundY;
    ground.receiveShadow = true;
    scene.add(ground);

    // Contact shadow settings
    const contactSettings = {
      // The composer blends in linear light; 0.05 was barely visible here.
      opacity: 0.38,
      height: 0.9,
      softness: 8,
    };

    const shadowSize = 6;
    const shadowResolution = 2048;

    const contactTarget = new THREE.WebGLRenderTarget(
      shadowResolution,
      shadowResolution,
    );

    const contactScene = new THREE.Scene();

    const contactMaterial = new THREE.ShaderMaterial({
      uniforms: {
        groundHeight: { value: groundY },
        fadeHeight: { value: contactSettings.height },
      },

      vertexShader: `
        varying float worldHeight;

        void main() {
          vec4 worldPosition =
            modelMatrix * vec4(position, 1.0);

          worldHeight = worldPosition.y;

          gl_Position =
            projectionMatrix * viewMatrix * worldPosition;
        }
      `,

      fragmentShader: `
        uniform float groundHeight;
        uniform float fadeHeight;
        varying float worldHeight;

        void main() {
          float height =
            max(worldHeight - groundHeight, 0.0);

          float strength =
            1.0 - smoothstep(0.0, fadeHeight, height);

          gl_FragColor = vec4(
            0.0,
            0.0,
            0.0,
            strength
          );
        }
      `,

      side: THREE.DoubleSide,
      blending: THREE.NoBlending,
      toneMapped: false,
    });

    // Copy shadow-casting meshes into the temporary scene.
    model.updateMatrixWorld(true);

    model.traverse((object) => {
      if (!object.isMesh || !object.castShadow || !object.visible) {
        return;
      }

      const shadowMesh = new THREE.Mesh(object.geometry, contactMaterial);

      shadowMesh.matrixAutoUpdate = false;
      shadowMesh.matrix.copy(object.matrixWorld);
      contactScene.add(shadowMesh);
    });

    // Capture the underside of the car.
    const contactCamera = new THREE.OrthographicCamera(
      -shadowSize / 2,
      shadowSize / 2,
      shadowSize / 2,
      -shadowSize / 2,
      0.001,
      contactSettings.height + 0.01,
    );

    contactCamera.position.set(0, groundY - 0.01, 0);
    contactCamera.up.set(0, 0, -1);
    contactCamera.lookAt(0, groundY + 1, 0);
    contactCamera.updateMatrixWorld(true);

    const oldTarget = renderer.getRenderTarget();
    const oldClearColor = renderer.getClearColor(new THREE.Color());
    const oldClearAlpha = renderer.getClearAlpha();

    renderer.setRenderTarget(contactTarget);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(contactScene, contactCamera);

    renderer.setRenderTarget(oldTarget);
    renderer.setClearColor(oldClearColor, oldClearAlpha);

    contactMaterial.dispose();

    // Display the blurred contact shadow.
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(shadowSize, shadowSize),
      new THREE.ShaderMaterial({
        uniforms: {
          shadowTexture: {
            value: contactTarget.texture,
          },
          opacity: {
            value: contactSettings.opacity,
          },
          blurStep: {
            value: contactSettings.softness / shadowResolution,
          },
        },

        vertexShader: `
          varying vec2 shadowUV;

          void main() {
            shadowUV = uv;

            gl_Position =
              projectionMatrix *
              modelViewMatrix *
              vec4(position, 1.0);
          }
        `,

        fragmentShader: `
          uniform sampler2D shadowTexture;
          uniform float opacity;
          uniform float blurStep;

          varying vec2 shadowUV;

          void main() {
            float shadow = 0.0;
            float totalWeight = 0.0;

            for (int x = -2; x <= 2; x++) {
              for (int y = -2; y <= 2; y++) {
                vec2 offset = vec2(float(x), float(y));

                float weight =
                  exp(-dot(offset, offset) / 3.0);

                shadow += texture2D(
                  shadowTexture,
                  shadowUV + offset * blurStep
                ).a * weight;

                totalWeight += weight;
              }
            }

            float radius =
              length((shadowUV - 0.5) * 6.0);

            float groundFade =
              1.0 - smoothstep(
                2.34375,
                5.859375,
                radius
              );

            gl_FragColor = vec4(
              0.0,
              0.0,
              0.0,
              shadow / totalWeight *
              opacity *
              groundFade
            );
          }
        `,

        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );

    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = groundY + 0.001;

    ground.renderOrder = -2;
    contactShadow.renderOrder = -1;

    contactShadowPlane = contactShadow;
    scene.add(contactShadow);
    sun.target.position.set(0, groundY + 0.5, 0);

    // Camera framing
    const sphere = new THREE.Box3()
      .setFromObject(model)
      .getBoundingSphere(new THREE.Sphere());

    const verticalFOV = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFOV = 2 * Math.atan(Math.tan(verticalFOV / 2) * 2); // Reference viewer is 2:1.

    const distance =
      sphere.radius / Math.sin(Math.min(verticalFOV, horizontalFOV) / 2);

    // Your Overview angle and zoom
    camera.position.copy(
      new THREE.Vector3(1.5, 0.1, 1)
        .normalize()
        .multiplyScalar(distance * 0.55),
    );

    camera.far = distance * 20;
    camera.updateProjectionMatrix();

    controls.target.set(0, 0, 0);
    controls.minDistance = sphere.radius * 0.3;
    controls.maxDistance = distance * 4;

    // Your Overview pan offset
    const overviewRight = new THREE.Vector3()
      .subVectors(camera.position, controls.target)
      .cross(camera.up)
      .normalize();

    const overviewPan = overviewRight.multiplyScalar(0.25);

    camera.position.add(overviewPan);
    controls.target.add(overviewPan);

    controls.update();
    controls.saveState();

    overview = capture();

    // Camera presets
    const viewDistance = distance * 0.75;

    const makeView = (direction) => ({
      position: new THREE.Vector3(...direction)
        .normalize()
        .multiplyScalar(viewDistance)
        .toArray(),
      target: [0, 0, 0],
      fov: 50,
    });

    presets = {
      Overview: overview,
      Front: {
        position: [0.010901050324025816, 0, 5.068318534132417],
        target: [-0.019844639886794097, 0, 0.07718651795449007],
        fov: 20,
        // Reserve at least 5% padding on each edge when fitting the car.
        fill: 0.9,
      },
      Side: {
        ...makeView([1, 0.15, 0]),
        fitToBounds: true,
        fill: 0.99, // Increase toward 0.98 for tighter framing.
      },
      Rear: {
        position: [
          1.8153585563381227e-14, 0.2671502486916026, -5.61841061233397,
        ],
        target: [0, 0, 0],
        fov: 20,
      },

      Top: {
        ...makeView([0, 1, 0.001]),
        position: makeView([0, 1, 0.001]).position.map((value) => value * 1.15),
      },

      Tire: {
        position: [
          1.4962581340216916, -0.10506878645395193, -1.9585883798814994,
        ],
        target: [
          -0.8104223428854729, -0.15550155773199673, -0.09559836838965592,
        ],
        fov: 50,
      },
    };

    // Fit the initial full-car view using the actual viewer dimensions.
    if (autoFrame && presets[activeView]) {
      applyView(fitView(presets[activeView]));
      controls.saveState();
    }

    // Locate the paint material.
    const seen = new Set();

    model.traverse((object) => {
      if (!object.isMesh) return;

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      materials.forEach((material) => {
        if (material.name === "metalicCarPaint_mtl" && !seen.has(material)) {
          seen.add(material);

          paintMaterials.push({
            material,
            original: material.color.clone(),
          });
        }
      });
    });

    ui.ready(paintMaterials.length > 0);

    status.textContent = "Drag to rotate • Scroll to zoom • Right-drag to pan";
  },

  (event) => {
    if (event.total > 0) {
      const percent = Math.round((event.loaded / event.total) * 100);

      status.textContent = `Loading Porsche… ${percent}%`;
    }
  },

  (error) => {
    console.error("Model loading failed:", error);

    status.textContent =
      "Could not load model. Check public/models/porsche.glb.";
  },
);

// Resize
new ResizeObserver(() => {
  const width = viewer.clientWidth;
  const height = viewer.clientHeight;
  if (width <= 0 || height <= 0) return;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(viewer.clientWidth, viewer.clientHeight);
  composer.setSize(width, height);

  // Refit named full-car views. Manual edits and Tire retain their framing.
  if (autoFrame && presets[activeView]) {
    const fitted = fitView(presets[activeView]);
    if (transition) {
      transition = { from: capture(), to: fitted, start: performance.now() };
    } else {
      const damping = controls.enableDamping;
      controls.enableDamping = false;
      applyView(fitted);
      controls.enableDamping = damping;
    }
  }
}).observe(viewer);

// Render loop
renderer.setAnimationLoop(() => {
  if (transition) {
    const t = Math.min((performance.now() - transition.start) / 700, 1);

    const k = t * t * (3 - 2 * t);

    camera.position.lerpVectors(
      new THREE.Vector3(...transition.from.position),
      new THREE.Vector3(...transition.to.position),
      k,
    );

    controls.target.lerpVectors(
      new THREE.Vector3(...transition.from.target),
      new THREE.Vector3(...transition.to.target),
      k,
    );

    camera.fov = THREE.MathUtils.lerp(
      transition.from.fov,
      transition.to.fov,
      k,
    );

    camera.updateProjectionMatrix();
    ui.syncFov(camera.fov);

    if (t === 1) {
      transition = null;
      controls.enableDamping = true;
    }
  }

  controls.update();

  // Keep lighting, transparent blending and output conversion consistent
  // in every view. Only the blur pass changes when DOF is toggled.
  bokeh.enabled = activeView === "Tire" && dofSettings.enabled && !transition;
  composer.render();
});
