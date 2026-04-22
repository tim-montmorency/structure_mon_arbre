import * as THREE from "three";

export function addPersonSilhouette(scene) {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x1f1f1f });

  // Corps
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.95, 0.28), mat);
  body.position.y = 0.85;
  group.add(body);

  // Tête
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), mat);
  head.position.y = 1.52;
  group.add(head);

  // Jambes
  const legGeo = new THREE.BoxGeometry(0.16, 0.72, 0.24);
  const leftLeg = new THREE.Mesh(legGeo, mat);
  leftLeg.position.set(-0.09, 0.36, 0);
  group.add(leftLeg);

  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.09;
  group.add(rightLeg);

  // Bras
  const armGeo = new THREE.BoxGeometry(0.12, 0.7, 0.12);
  const leftArm = new THREE.Mesh(armGeo, mat);
  leftArm.position.set(-0.38, 1, 0);
  leftArm.rotation.z = -Math.PI / 5;
  group.add(leftArm);

  const rightArm = leftArm.clone();
  rightArm.position.x = 0.38;
  rightArm.rotation.z = Math.PI / 5;
  group.add(rightArm);

  // Position et échelle
  group.position.set(3.0, 0, 0);
  group.scale.set(1.0, 1.2, 1.0);
  group.rotation.y = Math.PI / 2;

  // Ignorer le raycast
  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.userData.ignoreRaycast = true;
    }
  });

  scene.add(group);
  console.log("✅ silhouette added");

  return group;
}
