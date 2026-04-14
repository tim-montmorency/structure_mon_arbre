// lighting.js
import * as THREE from "three";

export function createLighting(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  const sunLight = new THREE.DirectionalLight(0xffffff, 5.0);
  sunLight.position.set(5, 2.52, 6);
  scene.add(sunLight);
}