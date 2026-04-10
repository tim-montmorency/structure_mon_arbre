import * as THREE from 'three';
import { SimpleTree } from './SimpleTree.js';
import { createCamera, updateCamera } from './camera.js';
import { createGUI } from './gui.js';


const scene = new THREE.Scene();

const camera = createCamera();

const cameraParams = {
  radius: 5,      // distance
  theta: 0,       // gauche/droite
  phi: Math.PI/2  // haut/bas
};

const urlParams = new URLSearchParams(window.location.search);

for (let key in cameraParams) {
  if (urlParams.has(key)) {
    cameraParams[key] = parseFloat(urlParams.get(key));
  }
}

// UPDATE URL
const updateURL = () => {
  const params = new URLSearchParams();

  for (let key in cameraParams) {
    params.set(key, cameraParams[key].toFixed(2));
  }

  window.history.replaceState(
    {},
    '',
    window.location.pathname + '?' + params.toString()
  );
};


const renderer = new THREE.WebGLRenderer({ antialias: true }); // Créé le moteur de rendu
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


// 1. Add Ambient Light (Soft white light everywhere)
const ambientLight = new THREE.AmbientLight(0xffffff, 1); 
scene.add(ambientLight);

// 2. Add Directional Light (Sun-like light from a specific direction)
const sunLight = new THREE.DirectionalLight(0xffffff, 4.0);
sunLight.position.set(5, 10, 6); // Position it up and to the side
scene.add(sunLight);

scene.background = new THREE.Color(0x59a6d3);


// Texture
const textureLoader = new THREE.TextureLoader();
const grassTexture = textureLoader.load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg');

grassTexture.wrapS = THREE.RepeatWrapping;
grassTexture.wrapT = THREE.RepeatWrapping;
grassTexture.repeat.set(2, 2);

grassTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();



// Pastille
const geometry = new THREE.CylinderGeometry(4, 4, 0.1, 64, 1, false);

const material = new THREE.MeshStandardMaterial({
  map: grassTexture
});

const pastille = new THREE.Mesh(geometry, material);
scene.add(pastille);



// Create new tree
const myTree = new SimpleTree({ levels: 3, color: 0x5d4037 });
scene.add(myTree);

const center = new THREE.Vector3(0, 2 , 0);

// GUI
createGUI(cameraParams, updateURL);


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
function animate() {

  updateCamera(camera, cameraParams, center);
  

  renderer.render(scene, camera);
}

// WebGPU uses setAnimationLoop too
renderer.setAnimationLoop(animate);