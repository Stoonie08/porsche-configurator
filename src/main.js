import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

document.querySelector('#app').innerHTML = '';

const style = document.createElement('style');
style.textContent = `
  html, body {
    margin: 0;
    overflow: hidden;
  }

  canvas {
    display: block;
  }

  #status {
    position: fixed;
    bottom: 24px;
    left: 24px;
    color: white;
    font: 14px system-ui;
    background: #0009;
    padding: 12px 16px;
    border-radius: 8px;
    pointer-events: none;
  }
`;
document.head.appendChild(style);

const status = document.createElement('div');
status.id = 'status';
status.textContent = 'Loading Porsche…';
document.body.appendChild(status);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color('#24272c');

// Camera
const camera = new THREE.PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  0.01,
  100
);
camera.position.set(5, 3, 5);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.querySelector('#app').appendChild(renderer.domElement);

// JPEG panorama: lighting, reflections, and background
const hdriURL = `${import.meta.env.BASE_URL}hdri/studio.jpeg`;

new THREE.TextureLoader().load(
  hdriURL,
  (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.mapping = THREE.EquirectangularReflectionMapping;

    scene.environment = texture;
    scene.environmentIntensity = 1;

    scene.background = texture;
    scene.backgroundIntensity = 1;
    scene.backgroundBlurriness = 0.15;

    // Change 0 to another angle to rotate the environment.
    const rotation = THREE.MathUtils.degToRad(0);
    scene.environmentRotation.set(0, rotation, 0);
    scene.backgroundRotation.set(0, rotation, 0);
  },
  undefined,
  (error) => {
    console.error('Environment image failed to load:', error);
  }
);

// Directional light creates shadows.
const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.position.set(3, 6, 4);
sun.castShadow = true;
sun.shadow.intensity = 0.35;

sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -4;
sun.shadow.camera.right = 4;
sun.shadow.camera.top = 4;
sun.shadow.camera.bottom = -4;
sun.shadow.camera.near = 0.1;
sun.shadow.camera.far = 20;
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.normalBias = 0.02;

scene.add(sun);
scene.add(sun.target);

// Mouse and touch controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Load the Porsche
const loader = new GLTFLoader();
const modelURL = `${import.meta.env.BASE_URL}models/porsche.glb`;

loader.load(
  modelURL,
  (gltf) => {
    // Preserve the model's original internal transforms.
    const model = new THREE.Group();
    model.add(gltf.scene);
    scene.add(model);

    // Resize the car to a consistent viewing size.
    let box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const longestSide = Math.max(size.x, size.y, size.z);

    if (!Number.isFinite(longestSide) || longestSide <= 0) {
      status.textContent = 'The model has no usable geometry bounds.';
      return;
    }

    model.scale.setScalar(4 / longestSide);

    // Center the car.
    box = new THREE.Box3().setFromObject(model);
    model.position.sub(box.getCenter(new THREE.Vector3()));
    model.updateMatrixWorld(true);

    // Enable shadows on the car.
    model.traverse((object) => {
      if (object.isMesh) {
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        // Avoid opaque shadows from transparent glass.
        object.castShadow = materials.some(
          (material) =>
            !material.transparent && !(material.transmission > 0)
        );

        object.receiveShadow = true;
      }
    });

    // Position the ground just below the car's lowest point.
    const carBounds = new THREE.Box3().setFromObject(model);
    const groundY = carBounds.min.y - 0.005;

// Create a soft circular fade texture.
const fadeCanvas = document.createElement('canvas');
fadeCanvas.width = 512;
fadeCanvas.height = 512;

const ctx = fadeCanvas.getContext('2d');
const gradient = ctx.createRadialGradient(
  256, 256, 100, // Fully visible inner area
  256, 256, 250  // Transparent outer edge
);

gradient.addColorStop(0, 'white');
gradient.addColorStop(1, 'black');

ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 512, 512);

const fadeTexture = new THREE.CanvasTexture(fadeCanvas);

// Smaller ground with softly fading edges.
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(12, 12),
  new THREE.MeshStandardMaterial({
    color: '#d7dddf',
    roughness: 1,
    metalness: 0,
    alphaMap: fadeTexture,
    transparent: true,
    depthWrite: false,
  })
);

ground.rotation.x = -Math.PI / 2;
ground.position.y = groundY;
ground.receiveShadow = true;
scene.add(ground);

    ground.rotation.x = -Math.PI / 2;
    ground.position.y = groundY;
    ground.receiveShadow = true;
    scene.add(ground);

    sun.target.position.set(0, groundY + 0.5, 0);

    // Frame the car automatically, excluding the ground.
    const sphere = new THREE.Box3()
      .setFromObject(model)
      .getBoundingSphere(new THREE.Sphere());

    const verticalFOV = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFOV =
      2 * Math.atan(Math.tan(verticalFOV / 2) * camera.aspect);

    const distance =
      sphere.radius /
      Math.sin(Math.min(verticalFOV, horizontalFOV) / 2);

    camera.position.copy(
      new THREE.Vector3(1, 0.5, 1)
        .normalize()
        .multiplyScalar(distance * 1.2)
    );

    camera.far = distance * 20;
    camera.updateProjectionMatrix();

    controls.target.set(0, 0, 0);
    controls.minDistance = sphere.radius * 0.3;
    controls.maxDistance = distance * 4;
    controls.update();
    controls.saveState();

    status.textContent =
      'Drag to rotate • Scroll to zoom • Right-drag to pan';
  },
  (event) => {
    if (event.total > 0) {
      const percent = Math.round(
        (event.loaded / event.total) * 100
      );
      status.textContent = `Loading Porsche… ${percent}%`;
    }
  },
  (error) => {
    console.error('Model loading failed:', error);
    status.textContent =
      'Could not load model. Check public/models/porsche.glb.';
  }
);

// Keep the viewer sized to the browser window.
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});