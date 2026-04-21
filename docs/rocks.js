import * as THREE from "three";

/**
 * Creates procedural rocks scattered across the pastille.
 */
export function createRocks(opts = {}) {
  const MIN_SCALE = opts.minScale ?? 0.06;
  const MAX_SCALE = opts.maxScale ?? 0.15;
  const PASTILLE_RADIUS = 3.6;

  const group = new THREE.Group();

  // Single rock template (distorted icosahedron)
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const noise = 0.7 + Math.random() * 0.6;
    pos.setXYZ(i, x * noise, y * noise * 0.6, z * noise);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 0x8a7d6b,
    roughness: 0.9,
    metalness: 0.0,
    flatShading: true,
  });

  // Scatter rocks across pastille
  const rockPositions = [];
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 0.8 + Math.random() * (PASTILLE_RADIUS - 0.8);
    rockPositions.push({
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r,
    });
  }
  const instancedMesh = new THREE.InstancedMesh(geo, rockMaterial, rockPositions.length);
  const dummy = new THREE.Object3D();

  rockPositions.forEach((pos, i) => {
    dummy.position.set(pos.x, 0.12, pos.z);
    dummy.rotation.set(Math.random() * 0.4 - 0.2, Math.random() * Math.PI * 2, Math.random() * 0.4 - 0.2);
    const baseScale = MIN_SCALE + Math.random() * (MAX_SCALE - MIN_SCALE);
    dummy.scale.set(baseScale * (0.7 + Math.random() * 0.6), baseScale * (0.5 + Math.random() * 0.5), baseScale * (0.7 + Math.random() * 0.6));
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
  });

  instancedMesh.instanceMatrix.needsUpdate = true;
  instancedMesh.castShadow = true;
  instancedMesh.receiveShadow = true;
  instancedMesh.userData.ignoreRaycast = true;
  group.add(instancedMesh);

  return group;
}
