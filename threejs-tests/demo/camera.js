import * as THREE from "three";

export function createCamera() {
  return new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
}

export function updateCamera(camera, params, center) {
  const x = params.distance * Math.sin(params.height) * Math.cos(params.rotation);
  const y = params.distance * Math.cos(params.height);
  const z = params.distance * Math.sin(params.height) * Math.sin(params.rotation);

  camera.position.set(center.x + x, center.y + y, center.z + z);

  camera.lookAt(center);
}
