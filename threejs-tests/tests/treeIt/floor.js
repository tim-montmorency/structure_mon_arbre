import * as THREE from "three";

export function createFloor() {
  const floorGeometry = new THREE.PlaneGeometry(12, 12);

  const floorMaterial = new THREE.MeshLambertMaterial({
    color: 0x3a7f3f,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.4,
  });

  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;

  // Make floor non-clickable
  floor.userData.ignoreRaycast = true;

  console.log("✅ Floor created");

  return floor;
}
