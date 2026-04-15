// main.js
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitController } from "./OrbitController.js";
import { GUI } from "./gui.js";
import { createFloor } from "./floor.js";
import { createSky } from "./sky.js";
import { addPersonSilhouette } from "./addPersonSilhouette.js";
import { TreeInteraction } from "./TreeInteraction.js";
import { createLighting } from "./lighting.js";

// Scène
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x6496d2, 15, 80);
const skyMaterial = createSky(scene);

// Caméra
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Contrôleur d'orbite
const orbitController = new OrbitController(camera, {
  distance: 2,
  height: Math.PI / 3,
  rotation: 0,
  target: new THREE.Vector3(0, 1.5, 0),
});

// Charger les paramètres de caméra depuis l'URL si disponibles
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has("distance")) orbitController.distance = parseFloat(urlParams.get("distance"));
if (urlParams.has("height")) orbitController.height = parseFloat(urlParams.get("height"));
if (urlParams.has("rotation")) orbitController.rotation = parseFloat(urlParams.get("rotation"));

// Rendu
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Éclairage
createLighting(scene);

// GUI (gère toute l'interface : glissières, boutons, panneau d'info, contrôles souris/molette)
const gui = new GUI(orbitController, renderer.domElement);

// Charger le modèle d'arbre
const loader = new GLTFLoader();
loader.load(
  "./ActualBadTree.glb",
  (gltf) => {
    const tree = gltf.scene;
    tree.position.y = 0;
    tree.scale.setScalar(0.7);
    tree.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    scene.add(tree);

    orbitController.centerOn(tree);

    scene.add(createFloor());
    addPersonSilhouette(scene);

    // Interaction avec l'arbre (gère le raycasting, la sélection, couper/rétablir)
    const treeInteraction = new TreeInteraction(scene, camera, tree);

    // Connecter les boutons du GUI à l'interaction de l'arbre
    gui.onCutBranch = () => treeInteraction.cutSelected();
    gui.onRestoreBranches = () => {
      treeInteraction.restoreAll();
    };
    gui.onValidate = () => {
      const results = treeInteraction.validate();
      gui.showFeedback(results);
    };
    gui.onRestart = () => {
      treeInteraction.restoreAll();
    };
  },
  undefined,
  (e) => console.error(e),
);

// Boucle d'animation
function animate() {
  orbitController.update();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

// Gestion du redimensionnement de la fenêtre
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
