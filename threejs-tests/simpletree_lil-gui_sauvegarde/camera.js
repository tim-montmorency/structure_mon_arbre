import * as THREE from 'three';

export function createCamera() {
  return new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
}

export function updateCamera(camera, params, center) {
  const x = params.radius * Math.sin(params.phi) * Math.cos(params.theta);
  const y = params.radius * Math.cos(params.phi);
  const z = params.radius * Math.sin(params.phi) * Math.sin(params.theta);

  camera.position.set(
    center.x + x,
    center.y + y,
    center.z + z
  );

  camera.lookAt(center);
}