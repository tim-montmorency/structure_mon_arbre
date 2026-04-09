import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SimpleTree } from './SimpleTree.js';
import GUI from 'lil-gui';


const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);



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

// GUI
const gui = new GUI();

const params = {
  rotationSpeed: 0.01,
  color: '#3a1809ff',
  wireframe: false
};

gui.add(params, 'rotationSpeed', 0, 0.1);

gui.addColor(params, 'color').onChange(value => {
  myTree.material.color.set(value);
});

gui.add(params, 'wireframe').onChange(value => {
  myTree.material.wireframe = value;
});

camera.position.z = 5;

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

  myTree.rotation.y += params.rotationSpeed;
  renderer.render(scene, camera);
}

// WebGPU uses setAnimationLoop too
renderer.setAnimationLoop(animate);