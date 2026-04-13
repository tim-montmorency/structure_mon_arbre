import * as THREE from "three";

export function addPersonSilhouette(scene) {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x1f1f1f });

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.95, 0.18), mat);
  body.position.y = 0.85;
  group.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), mat);
  head.position.y = 1.52;
  group.add(head);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.1, 0.72, 0.16);
  const leftLeg = new THREE.Mesh(legGeo, mat);
  leftLeg.position.set(-0.09, 0.36, 0);
  group.add(leftLeg);

  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.09;
  group.add(rightLeg);

  // Position and scale
  group.position.set(3.0, 0, 0);
  group.scale.set(0.72, 0.5, 0.72);
  group.rotation.y = Math.PI / 2;

  // Ignore raycast
  group.traverse((child) => {
    if (child.isMesh) {
      child.userData.ignoreRaycast = true;
    }
  });

  scene.add(group);
  console.log("✅ silhouette added");

  return group;
}
