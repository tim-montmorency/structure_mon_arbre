// lighting.js
import * as THREE from "three";

export function createLighting(scene) {
  // Lumière ambiante douce pour éclairer les zones à l'ombre
  //scene.add(new THREE.HemisphereLight(0x87ceeb, 0x553322, 10));

  // THREE.AmbientLight(color, intensity)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); 

// Add it directly to your scene
scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xfff8ee, 5);
  sunLight.position.set(4, 5, 3);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.1;
  sunLight.shadow.camera.far = 30;
  sunLight.shadow.camera.left = -5;
  sunLight.shadow.camera.right = 5;
  sunLight.shadow.camera.top = 6;
  sunLight.shadow.camera.bottom = -2;
  sunLight.shadow.bias = -0.0005;
  sunLight.shadow.normalBias = 0.02;
  scene.add(sunLight);

  return { sunLight };
}
