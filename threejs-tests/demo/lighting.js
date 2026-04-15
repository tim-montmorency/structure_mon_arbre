// lighting.js
import * as THREE from "three";

export function createLighting(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  const sunLight = new THREE.DirectionalLight(0xffffff, 4.0);
  sunLight.position.set(5, 4, 6);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.1;
  sunLight.shadow.camera.far = 30;
  sunLight.shadow.camera.left = -10;
  sunLight.shadow.camera.right = 10;
  sunLight.shadow.camera.top = 10;
  sunLight.shadow.camera.bottom = -10;
  scene.add(sunLight);
}