// main.js
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitController } from "./OrbitController.js";
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

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Orbit
const orbitController = new OrbitController(camera, {
  distance: 2,
  height: Math.PI / 3,
  rotation: 0,
  target: new THREE.Vector3(0, 1.5, 0),
});

// Load camera parameters from URL if available
const urlParams = new URLSearchParams(window.location.search);

if (urlParams.has("distance")) orbitController["distance"] = parseFloat(urlParams.get("distance"));
if (urlParams.has("height")) orbitController["height"] = parseFloat(urlParams.get("height"));
if (urlParams.has("rotation")) orbitController["rotation"] = parseFloat(urlParams.get("rotation"));

// Update URL with camera parameters
const updateURL = () => {
  const params = new URLSearchParams();

  params.set("distance", orbitController["distance"].toFixed(2));
  params.set("height", orbitController["height"].toFixed(2));
  params.set("rotation", orbitController["rotation"].toFixed(2));

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

loader.load(
  "./ActualBadTree.glb",
  (gltf) => {
    const tree = gltf.scene;
    tree.position.y = 0;
    scene.add(tree);

    scene.add(createFloor());
    addPersonSilhouette(scene);

    // Setup tree interaction
    setupTreeInteraction(scene, camera, raycaster, mouse, tree);

    // Create GUI
    createGUI(orbitController, updateURL, renderer.domElement);
  },
  undefined,
  (e) => console.error(e),
);

// Animation loop
function animate() {
  const center = new THREE.Vector3(0, 1.5, 0);
  orbitController.update();
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
