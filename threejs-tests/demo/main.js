import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createCamera, updateCamera } from "./camera.js";
import { createGUI } from "./gui.js";
import { createFloor } from "./floor.js";
import { createSky } from "./sky.js";
import { addPersonSilhouette } from "./silhouette.js";
import { setupTreeInteraction } from "./tree.js";

// Scene setup
const scene = new THREE.Scene();
scene.background = createSky();

const fog = new THREE.Fog(0x2a4a5a, 1, 20);
scene.fog = fog;

// Camera setup with parameters
const camera = createCamera();

const cameraParams = {
  radius: 3,
  theta: 0,
  phi: Math.PI / 2.2,
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
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

// Sun light
const sunLight = new THREE.DirectionalLight(0xffffff, 5.0);
sunLight.position.set(5, 2.52, 6); // Position it up and to the side
scene.add(sunLight);


// Ray caster for interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// --- Manual middle-mouse drag (Blender-style) ---
let isMiddleMouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;

renderer.domElement.addEventListener("mousedown", (e) => {
  if (e.button === 1) {
    e.preventDefault();
    isMiddleMouseDown = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }
});

window.addEventListener("mousemove", (e) => {
  if (!isMiddleMouseDown) return;

  const dx = e.clientX - lastMouseX;
  const dy = e.clientY - lastMouseY;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;

  const rotateSpeed = 0.005;
  cameraParams.theta -= dx * rotateSpeed;
  cameraParams.theta = Math.max(-Math.PI, Math.min(Math.PI, cameraParams.theta));
  cameraParams.phi -= dy * rotateSpeed;
  cameraParams.phi = Math.max(0.01, Math.min(Math.PI / 2, cameraParams.phi));

  updateURL();
  updateSliders();
});

window.addEventListener("mouseup", (e) => {
  if (e.button === 1) {
    isMiddleMouseDown = false;
  }
});

// Update slider displays
const updateSliders = () => {
  const sliders = document.querySelectorAll("input[type='range']");
  if (sliders.length >= 3) {
    sliders[0].value = cameraParams.theta;
    sliders[0].nextElementSibling.textContent = cameraParams.theta.toFixed(2);
    sliders[1].value = cameraParams.phi;
    sliders[1].nextElementSibling.textContent = cameraParams.phi.toFixed(2);
    sliders[2].value = cameraParams.radius;
    sliders[2].nextElementSibling.textContent = cameraParams.radius.toFixed(2);
  }
};

// Scroll wheel for zooming
renderer.domElement.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const zoomSpeed = 0.5;
    cameraParams.radius += e.deltaY > 0 ? zoomSpeed : -zoomSpeed;
    cameraParams.radius = Math.max(1, Math.min(50, cameraParams.radius));
    updateURL();
    updateSliders();
  },
  { passive: false },
);

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
    console.log("✅ TreeA.glb loaded");

    // Add environment
    const floor = createFloor();
    scene.add(floor);

    addPersonSilhouette(scene);

    // Setup tree interaction
    const treeInteraction = setupTreeInteraction(scene, camera, raycaster, mouse, tree);
    updateDotPositions = treeInteraction.updateDotPositions;
    toggleDotsVisibility = treeInteraction.toggleDotsVisibility;

    // GUI setup (after tree is loaded so toggleDotsVisibility is defined)
    createGUI(cameraParams, updateURL, toggleDotsVisibility);
  },
  undefined,
  (e) => console.error(e),
);

// Animation loop
function animate() {
  const center = new THREE.Vector3(0, 1.5, 0);
  updateCamera(camera, cameraParams, center);

  // Update dot positions if they exist
  if (updateDotPositions) {
    updateDotPositions();
  }

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
