import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TextTree } from './TextTree.js';

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

// --- DONNÉES DE L'ARBRE ---
// lengthFactor, inclination (deg), rotation (deg).
const treeData = `
- branche 0.5 0 0
-- branche 0.25 25 280
--- branche 0.6 35 90
--- branche 0.75 10 0
---- branche 0.9 35 270
-- branche 0.5 0 0
--- branche 0.7 25 0
---- branche 0.6 35 90
---- branche 0.6 35 270
---- branche 1 330 0
-- branche 0.5 45 120
--- branche 0.7 40 30
--- branche 0.7 40 210
-- branche 0.4 90 9
--- branche 0.8 45 110
--- branche 0.8 45 230
---- branche 0.5 10 230
---- branche 0.8 45 110
---- branche 0.8 45 230
----- branche 0.5 10 230
`;


// Create new tree
const myTree = new TextTree(treeData , { color: 0x5d4037 });
scene.add(myTree);

camera.position.z = 2;

const logHierarchy = (root) => {
  root.traverse((object) => {
    // 1. Calculate depth by climbing the parent chain
    let depth = 0;
    let current = object;
    
    // Stop climbing when we hit the root or null
    while (current.parent && current !== root) {
      depth++;
      current = current.parent;
    }

    // 2. Identify the part
    // We can use the level or name if you set it during generation
    const name = object.name || (depth === 0 ? "Tree Root" : `Branch L${depth-1}`);
    const type = object.type;

    // 3. Print with indentation
    console.log(`${'  '.repeat(depth)}|-- [${type}] ${name}`);
  });
};

// Usage:
logHierarchy(myTree);



// Animation
function animate(time) {


  renderer.render(scene, camera);
}

// WebGPU uses setAnimationLoop too
renderer.setAnimationLoop(animate);