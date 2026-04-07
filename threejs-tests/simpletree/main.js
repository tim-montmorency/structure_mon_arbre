import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SimpleTree } from './SimpleTree.js';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

//Pour render avec le WebGPU

const renderer = new THREE.WebGLRenderer({ antialias: true }); // Créé le moteur de rendu
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controle Camp
const controls = new OrbitControls(camera, renderer.domElement);

// 1. Add Ambient Light (Soft white light everywhere)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); 
scene.add(ambientLight);

// 2. Add Directional Light (Sun-like light from a specific direction)
const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
sunLight.position.set(5, 10, 7); // Position it up and to the side
scene.add(sunLight);

// Cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Create new tree
const myTree = new SimpleTree({ levels: 3, color: 0x5d4037 });
scene.add(myTree);

camera.position.z = 5;

// Animation
function animate(time) {


  renderer.render(scene, camera);
}

// WebGPU uses setAnimationLoop too
renderer.setAnimationLoop(animate);