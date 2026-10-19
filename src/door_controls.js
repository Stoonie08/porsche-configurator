import * as THREE from 'three';

// Coordinates are in the uploaded GLB's door-group space, BEFORE viewer scaling.
// The small disconnected components in L/R_doorExt_geo are the exterior handles.
export const DOOR_SETTINGS = {
  speed: 1,
  iconSize: 26,
  insideOpacity: 0.35,
  fadeDuration: 0.2,
  occlusionInterval: 0.15,
  left: {
    node: 'doorLeft_grp', clip: 'doorLeft_grp_xform_anim',
    handle: [113, 73.6, -51.7], outward: [1, 0, 0],
    glass: 'L_doorGlass_geo',
  },
  right: {
    node: 'doorRight_grp', clip: 'doorRight_grp_xform_anim',
    handle: [-113.3, 73.6, -51.7], outward: [-1, 0, 0],
    glass: 'R_doorGlass_geo',
  },
};

export function createDoorControls({ root, clips, camera, canvas, viewer, onToggle }) {
  const mixer = new THREE.AnimationMixer(root);
  const doors = [];
  const raycaster = new THREE.Raycaster();
  const world = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const cameraPosition = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const blockers = [];
  let elapsed = 0;
  let lastOcclusion = -Infinity;
  let disposed = false;
  const previousPosition = viewer.style.position;
  const changedPosition = getComputedStyle(viewer).position === 'static';
  if (changedPosition) viewer.style.position = 'relative';

  const style = document.createElement('style');
  style.textContent = `
    .porsche-door-hotspots { position:absolute; inset:0; pointer-events:none;
      z-index:5; overflow:hidden; border-radius:inherit; }
    .porsche-door-hotspot { position:absolute; left:0; top:0; margin:0;
      padding:0; display:grid; place-items:center; box-sizing:border-box;
      border:1px solid rgba(255,255,255,.9); border-radius:50%;
      background:radial-gradient(circle at 30% 25%,rgba(255,255,255,.5),rgba(255,255,255,.1) 65%);
      backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); color:#fff; cursor:pointer;
      pointer-events:auto; touch-action:manipulation;
      box-shadow:inset 0 1px 3px rgba(255,255,255,.5),0 2px 8px rgba(0,0,0,.2);
      -webkit-tap-highlight-color:transparent; }
    .porsche-door-hotspot:focus-visible { outline:2px solid #fff; outline-offset:3px; }
    .porsche-door-hotspot[hidden] { display:none; }
    .porsche-door-hotspot::after { content:""; position:absolute; inset:-4px;
      border:1px solid rgba(255,255,255,.55); border-radius:50%;
      animation:porsche-door-pulse 2.4s ease-out infinite; pointer-events:none; }
    @keyframes porsche-door-pulse { 0% { transform:scale(.9); opacity:0; }
      20% { opacity:.6; } 100% { transform:scale(1.45); opacity:0; } }
    @media (prefers-reduced-motion:reduce) { .porsche-door-hotspot::after { animation:none; opacity:.25; } }
    @media (pointer:coarse) { .porsche-door-hotspot { min-width:40px; min-height:40px; } }
  `;
  const overlay = document.createElement('div');
  overlay.className = 'porsche-door-hotspots';
  viewer.append(style, overlay);

  root.traverse(object => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    if (materials.some(m => m && !m.transparent && !(m.transmission > 0))) blockers.push(object);
  });

  for (const side of ['left', 'right']) {
    const config = DOOR_SETTINGS[side];
    const node = root.getObjectByName(config.node);
    if (!node) { console.warn(`Missing door node: ${config.node}`); continue; }
    // usd2gltf may export door and window as separate clips, or one flattened clip.
    // Bind each side's descendant transform tracks to one shared timeline.
    const tracks = new Map();
    let hasGlass = false;
    for (const source of clips) for (const track of source.tracks) {
      const parsed = THREE.PropertyBinding.parseTrackName(track.name);
      if (!['position', 'quaternion', 'scale'].includes(parsed.propertyName)) continue;
      const target = THREE.PropertyBinding.findNode(root, parsed.nodeName);
      let belongs = false;
      for (let p = target; p; p = p.parent) if (p === node) belongs = true;
      if (belongs && !tracks.has(track.name)) {
        tracks.set(track.name, track.clone());
        if (target.name === config.glass) hasGlass = true;
      }
    }
    if (!tracks.size) { console.warn(`No animation for ${config.node}`); continue; }
    if (!hasGlass) console.warn(`No baked window animation for ${config.glass}; re-export your updated USD.`);
    const clip = new THREE.AnimationClip(config.node + '_with_window', -1, [...tracks.values()]);
    const start = Math.min(...clip.tracks.map(track => track.times[0]));
    for (const track of clip.tracks) track.shift(-start);
    clip.resetDuration();
    if (!(clip.duration > 0)) continue;
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    action.paused = true;
    action.time = 0;

    const button = document.createElement('button');
    button.className = 'porsche-door-hotspot';
    button.type = 'button';
    button.style.width = button.style.height = `${DOOR_SETTINGS.iconSize}px`;
    button.hidden = true;
    overlay.appendChild(button);
    const door = {
      side, node, action, clip, button, time:0, target:0, occluded:false,
      opacity:0,
      handle:new THREE.Vector3(...config.handle),
      outward:new THREE.Vector3(...config.outward),
    };
    function label() {
      const open = door.target > 0;
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', `${open ? 'Close' : 'Open'} ${side} door`);
      button.title = `${open ? 'Close' : 'Open'} ${side} door`;
    }
    label();
    // Native buttons also support Enter/Space. Keep taps away from orbit handlers.
    for (const event of ['pointerdown', 'pointerup', 'dblclick', 'keydown', 'keyup']) {
      button.addEventListener(event, e => e.stopPropagation());
    }
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      if (button.disabled) return;
      door.target = door.target > 0 ? 0 : clip.duration;
      label();
      onToggle?.(side, door.target > 0);
    });
    doors.push(door);
  }
  mixer.update(0);

  function update(deltaSeconds) {
    if (disposed) return;
    const dt = Math.min(Math.max(deltaSeconds || 0, 0), 0.1);
    elapsed += dt;
    let moving = false;
    for (const door of doors) {
      const difference = door.target - door.time;
      if (Math.abs(difference) > 1e-8) {
        door.time += Math.sign(difference) * Math.min(Math.abs(difference), dt * Math.max(0.01, DOOR_SETTINGS.speed));
        door.action.time = door.time;
        moving = true;
      }

    }
    if (moving) mixer.update(0);
    root.updateWorldMatrix(true, true);
    camera.updateMatrixWorld();
    camera.getWorldPosition(cameraPosition);
    const canvasRect = canvas.getBoundingClientRect();
    const viewerRect = viewer.getBoundingClientRect();
    const testOcclusion = elapsed - lastOcclusion >= DOOR_SETTINGS.occlusionInterval;
    if (testOcclusion) lastOcclusion = elapsed;
    const visibleBlockers = testOcclusion ? blockers.filter(mesh => {
      for (let p = mesh; p; p = p.parent) if (!p.visible) return false;
      return true;
    }) : null;

    for (const door of doors) {
      world.copy(door.handle).applyMatrix4(door.node.matrixWorld);
      normal.copy(door.outward).transformDirection(door.node.matrixWorld);
      direction.subVectors(cameraPosition, world);
      const facing = direction.dot(normal) > 0;
      projected.copy(world).project(camera);
      let hierarchyVisible = true;
      for (let p = door.node; p; p = p.parent) if (!p.visible) hierarchyVisible = false;
      const inFrame = canvasRect.width > 0 && canvasRect.height > 0 &&
        projected.z > -1 && projected.z < 1 &&
        Math.abs(projected.x) < 0.98 && Math.abs(projected.y) < 0.98;
      if (inFrame && testOcclusion) {
        direction.subVectors(world, cameraPosition);
        const distance = direction.length();
        raycaster.set(cameraPosition, direction.normalize());
        raycaster.near = 0;
        raycaster.far = Math.max(0, distance - 0.012);
        // Ignore this door's own panels: its inside face should retain a faded control.
        const otherParts = visibleBlockers.filter(mesh => {
          for (let p = mesh; p; p = p.parent) if (p === door.node) return false;
          return true;
        });
        door.occluded = raycaster.intersectObjects(otherParts, false).length > 0;
      }
      const blocked = !hierarchyVisible || !inFrame || door.occluded;
      const targetOpacity = blocked ? 0 : facing ? 1 : DOOR_SETTINGS.insideOpacity;
      const fadeStep = dt / Math.max(0.01, DOOR_SETTINGS.fadeDuration);
      door.opacity += Math.sign(targetOpacity - door.opacity) * Math.min(Math.abs(targetOpacity - door.opacity), fadeStep);
      door.button.style.opacity = String(door.opacity);
      door.button.disabled = blocked;
      door.button.style.pointerEvents = blocked ? 'none' : 'auto';
      door.button.tabIndex = blocked ? -1 : 0;
      door.button.hidden = door.opacity <= 0.001;
      if (!door.button.hidden) {
        const x = canvasRect.left - viewerRect.left - viewer.clientLeft + viewer.scrollLeft + (projected.x + 1) * canvasRect.width / 2;
        const y = canvasRect.top - viewerRect.top - viewer.clientTop + viewer.scrollTop + (1 - projected.y) * canvasRect.height / 2;
        door.button.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      }
    }
  }

  return {
    update,
    count: doors.length,
    dispose() {
      if (disposed) return;
      disposed = true;
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
      overlay.remove();
      style.remove();
      if (changedPosition) viewer.style.position = previousPosition;
    },
  };
}
