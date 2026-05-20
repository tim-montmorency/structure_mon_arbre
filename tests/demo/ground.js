import * as THREE from "three";

export function createGround() {
  const geometry = new THREE.CylinderGeometry(4, 4, 0.1, 64, 1, false);

  const textureLoader = new THREE.TextureLoader();

  const dirtColor = textureLoader.load("./dirt_color.jpg");
  dirtColor.wrapS = THREE.RepeatWrapping;
  dirtColor.wrapT = THREE.RepeatWrapping;
  dirtColor.repeat.set(3, 3);
  dirtColor.anisotropy = 8;
  dirtColor.colorSpace = THREE.SRGBColorSpace;

  const dirtNormal = textureLoader.load("./dirt_normal.jpg");
  dirtNormal.wrapS = THREE.RepeatWrapping;
  dirtNormal.wrapT = THREE.RepeatWrapping;
  dirtNormal.repeat.set(3, 3);
  dirtNormal.anisotropy = 8;

  const material = new THREE.MeshPhongMaterial({
    map: dirtColor,
    normalMap: dirtNormal,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.01,
    shininess: 0.1,
  });

  const pastille = new THREE.Mesh(geometry, material);
  pastille.receiveShadow = true;
  pastille.userData.ignoreRaycast = true;

  return pastille;
}
