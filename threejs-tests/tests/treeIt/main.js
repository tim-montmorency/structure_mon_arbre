import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { addPersonSilhouette } from "./silhouette.js";
import { createFloor } from "./floor.js";
import { createSky } from "./sky.js";
import { setupTreeInteraction } from "./tree.js";

const scene = new THREE.Scene();
scene.background = createSky();

const fog = new THREE.Fog(0x2a4a5a, 1, 20);
scene.fog = fog;

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 6, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 1.5));

// Top light
const topLight = new THREE.DirectionalLight(0xffffff, 1.5);
topLight.position.set(0, 20, 0);
topLight.castShadow = false; // No shadows
scene.add(topLight);

// Right light
const rightLight = new THREE.DirectionalLight(0xffffff, 1.2);
rightLight.position.set(15, 10, 0);
rightLight.castShadow = false;
scene.add(rightLight);

// Left light
const leftLight = new THREE.DirectionalLight(0xffffff, 1.2);
leftLight.position.set(-15, 10, 0);
leftLight.castShadow = false;
scene.add(leftLight);

// Front light
const frontLight = new THREE.DirectionalLight(0xffffff, 1.0);
frontLight.position.set(0, 10, 15);
frontLight.castShadow = false;
scene.add(frontLight);

// Raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const loader = new GLTFLoader();
loader.load(
  "./TreeA.glb",
  (gltf) => {
    const tree = gltf.scene;
    tree.position.y = 0; // ← Changed to 0 so it sits on the floor
    scene.add(tree);

    console.log("✅ ActualBadTree.glb loaded");

    const floor = createFloor();
    scene.add(floor);

    addPersonSilhouette(scene);

    // Setup tree interaction (only tree is clickable)
    setupTreeInteraction(scene, camera, raycaster, mouse, tree);

    // Animation
    function animate() {
      controls.update();
      renderer.render(scene, camera);
    }
    renderer.setAnimationLoop(animate);
  },
  undefined,
  (e) => console.error(e),
);

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
