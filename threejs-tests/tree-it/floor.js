import * as THREE from "three";

export function createFloor() {
  const floorGeometry = new THREE.PlaneGeometry(100, 100);

  const floorMaterial = new THREE.MeshLambertMaterial({
    color: 0xdddddd,
    side: THREE.DoubleSide,
  });

  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;

  // Make floor non-clickable
  floor.userData.ignoreRaycast = true;

  console.log("✅ Floor created");

  return floor;
}
