import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa0d8ff);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 6, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(10, 15, 10);
scene.add(sun);

// Raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const selectedItems = new Set();

const loader = new GLTFLoader();
loader.load(
  "./TreeA.glb",
  (gltf) => {
    const tree = gltf.scene;
    tree.position.y = -1;
    scene.add(tree);
    console.log("✅ TreeA.glb loaded");
  },
  undefined,
  (e) => console.error(e),
);

// Click handler
window.addEventListener("click", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length === 0) return;

  const clickedMesh = intersects[0].object;

  // Find bad parent if exists
  let badParent = null;
  let current = clickedMesh;
  while (current) {
    if (current.userData.isBad === true) {
      badParent = current;
      break;
    }
    current = current.parent;
  }

  // Determine what to affect
  const target = badParent && clickedMesh !== badParent ? clickedMesh : badParent || clickedMesh;

  // If already selected → reset color
  if (selectedItems.has(target)) {
    console.log("Reset color on:", target.name || "unknown");
    target.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        child.material.color.setHex(child.userData.originalColor || 0x2e8b2e);
      }
    });
    selectedItems.delete(target);
    return;
  }

  // Save original color first time
  if (!target.userData.originalColor) {
    target.traverse((child) => {
      if (child.isMesh && child.material) {
        child.userData.originalColor = child.material.color.getHex();
      }
    });
  }

  // Apply color
  if (badParent && clickedMesh !== badParent) {
    // Orange hint on child
    console.log("Orange hint on child:", clickedMesh.name);
    clickedMesh.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        child.material.color.set(0xff8800); // Bright Orange
      }
    });
    selectedItems.add(clickedMesh);
  } else if (badParent) {
    // Red full group
    console.log("Red full group:", badParent.name);
    badParent.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        child.material.color.set(0xff0000);
      }
    });
    selectedItems.add(badParent);
  } else {
    // Green on normal branch
    console.log("Green on normal branch:", clickedMesh.name);
    clickedMesh.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        child.material.color.set(0x00ff00);
      }
    });
    selectedItems.add(clickedMesh);
  }
});

// Animation
function animate() {
  controls.update();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
