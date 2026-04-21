import * as THREE from "three"; // Importe la bibliothèque Three.js
import { OrbitControls } from "three/addons/controls/OrbitControls.js"; // Permet de tourner autour de la scène avec la souris

// Création de la scène (l'univers 3D)
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa0d8ff);

// Création de la caméra
const camera = new THREE.PerspectiveCamera(
  90, // Angle de vue (FOV)
  window.innerWidth / window.innerHeight, // Ratio largeur/hauteur
  0.1, // Distance minimale visible
  1000, // Distance maximale visible
);
camera.position.set(10, 5, 5); // Place la caméra un peu en arrière et en hauteur

// Création du renderer
const renderer = new THREE.WebGLRenderer({ antialias: true }); // Créé le moteur de rendu
renderer.setSize(window.innerWidth, window.innerHeight); // Taille de l'affichage
document.body.appendChild(renderer.domElement); // Ajoute le canvas dans la page

// Contrôles (permet de tourner avec la souris)
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 3, 0); // Point de focus (le centre de l'arbre)

// Lumières
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Lumière générale
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.1); // Lumière directionnelle
directionalLight.position.set(10, 15, 10);
scene.add(directionalLight);

// Tronc 3D de l'arbre
const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 4, 8); // Forme du tronc
const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8b5a2b }); // Couleur
const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);

scene.add(trunk); // Ajoute le tronc à la scène

function animate() {
  controls.update(); // Met à jour les contrôles
  renderer.render(scene, camera); // Pour render la scène
}

renderer.setAnimationLoop(animate); // Démarre la boucle d'animation
