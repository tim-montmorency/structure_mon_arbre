import * as THREE from 'three';
import { SimpleTree } from './SimpleTree.js';
import GUI from 'lil-gui';


const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const cameraParams = {
  radius: 5,      // distance
  theta: 0,       // gauche/droite
  phi: Math.PI/2  // haut/bas
};



//Pour render avec le WebGPU

const renderer = new THREE.WebGLRenderer({ antialias: true }); // Créé le moteur de rendu
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


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


// GUI


const gui = new GUI();

//Bouton reset

const resetCamera = () => {
  cameraParams.theta = 0;
  cameraParams.phi = Math.PI / 2;
  cameraParams.radius = 5;
};

// Position caméra
gui.add(cameraParams, 'theta', -Math.PI, Math.PI).name('Gauche / Droite').listen();

gui.add(cameraParams, 'phi', 0.1, Math.PI ).name('Haut / Bas').listen();

gui.add(cameraParams, 'radius', 5, 20).name('Zoom').listen();

gui.add({ resetCamera }, 'resetCamera').name('Reset Caméra');

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

  const x = cameraParams.radius * Math.sin(cameraParams.phi) * Math.cos(cameraParams.theta);
  const y = cameraParams.radius * Math.cos(cameraParams.phi);
  const z = cameraParams.radius * Math.sin(cameraParams.phi) * Math.sin(cameraParams.theta);

  camera.position.set(x, y, z);

  // toujours regarder l’arbre
  camera.lookAt(myTree.position);
  renderer.render(scene, camera);
}

// WebGPU uses setAnimationLoop too
renderer.setAnimationLoop(animate);