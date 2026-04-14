// main.js
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createCamera, updateCamera } from "./camera.js";
import { createGUI } from "./gui.js";
import { createFloor } from "./floor.js";
import { createSky } from "./sky.js";
import { addPersonSilhouette } from "./silhouette.js";
import { setupTreeInteraction } from "./tree.js";
import { createLighting } from "./lighting.js";

// Scene setup
const scene = new THREE.Scene();
scene.background = createSky();
scene.fog = new THREE.Fog(0x2a4a5a, 1, 20);

// Camera setup with parameters
const camera = createCamera();

const cameraParams = {
  distance: 3,
  rotation: 0,
  height: Math.PI / 2.2,
};

// Load camera parameters from URL if available
const urlParams = new URLSearchParams(window.location.search);
for (let key in cameraParams) {
  if (urlParams.has(key)) {
    cameraParams[key] = parseFloat(urlParams.get(key));
  }
}

// Update URL with camera parameters
const updateURL = () => {
  const params = new URLSearchParams();
  for (let key in cameraParams) {
    params.set(key, cameraParams[key].toFixed(2));
  }
  window.history.replaceState({}, "", window.location.pathname + "?" + params.toString());
};

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting setup
createLighting(scene);

// Ray caster for interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Load tree model
const loader = new GLTFLoader();
let updateDotPositions = null;
let toggleDotsVisibility = null;

loader.load(
  "./TreeA.glb",
  (gltf) => {
    const tree = gltf.scene;
    tree.position.y = 0;
    scene.add(tree);
    

    scene.add(createFloor());
    addPersonSilhouette(scene);

    // Add environment
    const treeInteraction = setupTreeInteraction(scene, camera, raycaster, mouse, tree);
    updateDotPositions = treeInteraction.updateDotPositions;
    toggleDotsVisibility = treeInteraction.toggleDotsVisibility;

    // On passe renderer.domElement à createGUI
    createGUI(cameraParams, updateURL, toggleDotsVisibility, renderer.domElement);
  },
  undefined,
  (e) => console.error(e),
);

// Animation loop
function animate() {
  const center = new THREE.Vector3(0, 1.5, 0);
  updateCamera(camera, cameraParams, center);
  if (updateDotPositions) updateDotPositions();
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});