import * as THREE from "three";

export function createFloor() {
  const geometry = new THREE.CylinderGeometry(4, 4, 0.1, 64, 1, false);

  const textureLoader = new THREE.TextureLoader();
  const grassTexture = textureLoader.load("https://threejs.org/examples/textures/terrain/grasslight-big.jpg");

  grassTexture.wrapS = THREE.RepeatWrapping;
  grassTexture.wrapT = THREE.RepeatWrapping;
  grassTexture.repeat.set(2, 2);
  grassTexture.anisotropy = 8;

  const material = new THREE.MeshStandardMaterial({
    map: grassTexture,
  });

  const pastille = new THREE.Mesh(geometry, material);
  pastille.receiveShadow = true;
  pastille.userData.ignoreRaycast = true;

  return pastille;
}
