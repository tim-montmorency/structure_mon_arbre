// main.js
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitController } from "./scripts/OrbitController.js";
import { Ui } from "./scripts/Ui.js";
import { createGround } from "./scripts/ground.js";
import { createSky } from "./scripts/sky.js";
import { addPersonSilhouette } from "./scripts/addPersonSilhouette.js";
import { TreeInteraction } from "./scripts/TreeInteraction.js";
import { createLighting } from "./scripts/lighting.js";
import { Wind } from "./scripts/wind.js";
import { Grass } from "./scripts/grass.js";
import { createRocks } from "./scripts/rocks.js";

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
  //target: new THREE.Vector3(0, 1, 0),
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
 const { sunLight } = createLighting(scene);

// Vent
const wind = new Wind();

// Arbres disponibles
const TREES = [
  { id: 1, label: "Arbre 8", model: "./models/Tree8.glb", scale: 0.7 },
  { id: 2, label: "Arbre 2", model: "./models/Tree2.glb", scale: 0.7 },
  { id: 3, label: "Arbre 7", model: "./models/Tree7.glb", scale: 0.7 },
  { id: 4, label: "Arbre 1", model: "./models/Tree1.glb", scale: 0.85 },
  { id: 5, label: "Arbre 6", model: "./models/Tree6.glb", scale: 0.7 },
  { id: 6, label: "Arbre 4", model: "./models/Tree4.glb", scale: 0.7 },
  { id: 7, label: "Arbre 3", model: "./models/Tree3.glb", scale: 0.7 },
  { id: 8, label: "Arbre 5", model: "./models/Tree5.glb", scale: 0.7 },
  { id: 9, label: "Arbre 9", model: "./models/Tree9.glb", scale: 0.7 },
];

// GUI (gère toute l'interface : glissières, boutons, panneau d'info, contrôles souris/molette)
const ui = new Ui(orbitController, renderer.domElement, TREES);
ui.onTreeSelect = (index) => loadTree(TREES[index]);

// État de la scène
const loader = new GLTFLoader();
let currentTree = null;
let treeInteraction = null;
let environmentLoaded = false;
let grass = null;
let rocks = null;

function loadTree(config) {
  // Réinitialiser l'état de l'UI
  ui.resetExercise();

  // Nettoyer l'ancienne interaction (retire les écouteurs d'événements)
  if (treeInteraction) {
    treeInteraction.destroy();
    treeInteraction = null;
  }

  // Retirer l'arbre précédent
  if (currentTree) {
    scene.remove(currentTree);
    currentTree = null;
  }

  loader.load(
    config.model,
    (gltf) => {
      const tree = gltf.scene;
      tree.position.y = 0;
      tree.scale.setScalar(config.scale);
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
      currentTree = tree;

      //orbitController.centerOn(tree);

      // Charger l'environnement une seule fois
      if (!environmentLoaded) {
        scene.add(createGround());
        grass = new Grass(wind);
        scene.add(grass.mesh);
        rocks = createRocks();
        scene.add(rocks);
        addPersonSilhouette(scene);

        // Connecter le toggle de l'herbe et des rochers (une seule fois)
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

        environmentLoaded = true;
      }

      // Interaction avec l'arbre (gère le raycasting, la sélection, couper/rétablir)
      treeInteraction = new TreeInteraction(scene, camera, tree);

      // Connecter les boutons du GUI à l'interaction de l'arbre
      ui.onCutBranch = () => {
        treeInteraction.cutSelected();
        ui.setRestoreEnabled(true);
        ui.setValidateEnabled(true); // des branches ont été coupées -> on peut valider
      };
      ui.onRestoreBranches = () => {
        treeInteraction.restoreAll();
        ui.setRestoreEnabled(false);
        // Après rétablissement, valider n'est possible que s'il reste des sélections
        ui.setValidateEnabled(treeInteraction.selectedMeshes.size > 0);
      };
      ui.onValidate = () => {
        const results = treeInteraction.validate();
        ui.showFeedback(results);
      };
      ui.onRestart = () => {
        treeInteraction.restoreAll();
        ui.setRestoreEnabled(false);
      };
      treeInteraction.onSelectionChange = (count) => {
        ui.setCutEnabled(count > 0);
        // Permettre la validation si des branches sont sélectionnées OU déjà coupées
        ui.setValidateEnabled(count > 0 || treeInteraction.cutBranches.length > 0);
      };
    },
    undefined,
    (e) => console.error(e),
  );
}

// Prochain exercice : passe à l'arbre suivant dans la liste
ui.onNextExercise = () => {
  const nextIndex = (ui._activeTreeIndex + 1) % TREES.length;
  ui._advanceToTree(nextIndex);
};

// Charger le premier arbre
loadTree(TREES[0]);



function updateSunlight(time) {
  // Convert time to seconds
  const seconds = time * 0.00005; 
  
  // Adjust speed and radius of the rotation orbit
  const speed = 0.5; 
  const angle = seconds * speed;
  const radius = 5; // Distance from the center (X and Z)

  // Rotate around the Y-axis (X and Z change, Y stays constant)
  sunLight.position.x = Math.cos(angle) * radius;
  sunLight.position.z = Math.sin(angle) * radius;
  sunLight.position.y = 5; // Keep your original height from createLighting
}

// Boucle d'animation
const clock = new THREE.Clock();
function animate(time = 0) {
  wind.update(clock.getDelta());
  orbitController.update();
  //updateSunlight(time);
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

// Gestion du redimensionnement de la fenêtre
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
