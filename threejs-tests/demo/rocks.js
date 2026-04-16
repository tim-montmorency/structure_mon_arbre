import * as THREE from "three";

// Same patch centers as grass.js
const dirtPatches = [
  { x: 2.0, z: 0.5 },
  { x: -1.1, z: 2.0 },
  { x: 0.3, z: -2.2 },
];

/**
 * Creates procedural rocks — some on dirt patches, some scattered on grass.
 */
export function createRocks(opts = {}) {
  const MIN_SCALE = opts.minScale ?? 0.06;
  const MAX_SCALE = opts.maxScale ?? 0.15;
  const PASTILLE_RADIUS = 3.6;

  const group = new THREE.Group();

  // Create 3 rock shape templates
  const templates = [];
  for (let t = 0; t < 3; t++) {
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
    templates.push(geo);
  }

  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 0x8a7d6b,
    roughness: 0.9,
    metalness: 0.0,
    flatShading: true,
  });

  // Collect all rock positions: some on patches, some on grass
  const rockPositions = [];

  // 1-2 rocks near each dirt patch center
  dirtPatches.forEach((patch) => {
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      rockPositions.push({
        x: patch.x + (Math.random() - 0.5) * 0.4, // jitter around patch center
        z: patch.z + (Math.random() - 0.5) * 0.2, // more elongated jitter to avoid perfect circles
      });
    }
  });

  // 4-5 rocks scattered on the grass
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 0.8 + Math.random() * (PASTILLE_RADIUS - 0.8);
    rockPositions.push({
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r,
    });
  }

  const totalRocks = rockPositions.length;
  const geo = templates[0];
  const instancedMesh = new THREE.InstancedMesh(geo, rockMaterial, totalRocks);
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
