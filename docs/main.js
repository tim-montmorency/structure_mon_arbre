// main.js
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitController } from "./OrbitController.js";
import { Ui } from "./Ui.js";
import { createGround } from "./ground.js";
import { createSky } from "./sky.js";
import { addPersonSilhouette } from "./addPersonSilhouette.js";
import { TreeInteraction } from "./TreeInteraction.js";
import { createLighting } from "./lighting.js";
import { Wind } from "./wind.js";
import { Grass } from "./grass.js";
import { createRocks } from "./rocks.js";
import Stats from "stats";

const stats = new Stats();
stats.showPanel(0); // 0: FPS, 1: ms/frame, 2: memory
document.body.appendChild(stats.dom);

// Scène
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x6496d2, 15, 80);
const skyMaterial = createSky(scene);

// Caméra
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

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

// Vent
const wind = new Wind();

// GUI (gère toute l'interface : glissières, boutons, panneau d'info, contrôles souris/molette)
const ui = new Ui(orbitController, renderer.domElement);

// Charger le modèle d'arbre
const loader = new GLTFLoader();
loader.load(
  "./Tree0.glb",
  (gltf) => {
    const tree = gltf.scene;
    tree.position.y = 0;
    tree.scale.setScalar(0.7);
    tree.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        // Normal map un peu plus forte que dans le modèle original pour mieux ressortir les détails sur les branches coupées
        if (child.material?.normalMap) {
          child.material.normalScale.set(1.8, 1.8);
          child.material.needsUpdate = true;
        }
      }
    });
    scene.add(tree);

    orbitController.centerOn(tree);

    scene.add(createGround());
    // Add grass and keep reference for toggling
    let grass = new Grass(wind);
    scene.add(grass.mesh);
    const rocks = createRocks();
    scene.add(rocks);
    addPersonSilhouette(scene);

    // Interaction avec l'arbre (gère le raycasting, la sélection, couper/rétablir)
    const treeInteraction = new TreeInteraction(scene, camera, tree);

    // Connecter les boutons du GUI à l'interaction de l'arbre
    ui.onCutBranch = () => {
      treeInteraction.cutSelected();
      ui.setRestoreEnabled(true);
    };
    ui.onRestoreBranches = () => {
      treeInteraction.restoreAll();
      ui.setRestoreEnabled(false);
    };
    ui.onValidate = () => {
      const results = treeInteraction.validate();
      ui.showFeedback(results);
    };
    ui.onRestart = () => {
      treeInteraction.restoreAll();
      ui.setRestoreEnabled(false);
    };
    treeInteraction.onSelectionChange = (count) => ui.setCutEnabled(count > 0);

    // Toggle grass and rocks presence in the scene
    ui.onToggleGrass = (enabled) => {
      if (grass) {
        if (enabled) {
          grass.activate(scene);
        } else {
          grass.deactivate();
        }
      }
      if (rocks) {
        if (enabled && !scene.children.includes(rocks)) {
          scene.add(rocks);
        } else if (!enabled && scene.children.includes(rocks)) {
          scene.remove(rocks);
        }
      }
    };
  },
  undefined,
  (e) => console.error(e),
);

// Boucle d'animation
const clock = new THREE.Clock();
function animate() {
  stats.begin();
  wind.update(clock.getDelta());
  orbitController.update();
  renderer.render(scene, camera);
  stats.end();
}
renderer.setAnimationLoop(animate);

// Gestion du redimensionnement de la fenêtre
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
