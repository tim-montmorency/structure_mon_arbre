import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SimpleTree } from './SimpleTreeModified.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1a2f);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 8, 20);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 5, 0);

const ambient = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(12, 25, 10);
scene.add(sun);

// Create Tree
const myTree = new SimpleTree({ color: 0x8B5F2B });
scene.add(myTree);

// Raycasting + Highlight
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(myTree.getAllBranches(), true);

    if (intersects.length > 0) {
        let obj = intersects[0].object;
        if (obj.userData.isTrunk) return;        // Skip trunk

        const isHighlighted = obj.userData.highlighted || false;
        toggleHighlight(obj, !isHighlighted);
    }
}

function toggleHighlight(branchMesh, highlight) {
    const originalColor = 0x8B5F2B;   // same as tree color

    branchMesh.traverse((child) => {
        if (child.isMesh) {
            child.userData.highlighted = highlight;

            if (highlight) {
                child.material = child.material.clone();
                child.material.color.set(0xff3333);
                child.material.emissive = new THREE.Color(0x660000);
            } else {
                child.material.color.set(originalColor);
                child.material.emissive = new THREE.Color(0x000000);
            }
        }
    });
}

window.addEventListener('click', onClick);

// Animation
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});