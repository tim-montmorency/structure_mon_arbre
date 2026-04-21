import * as THREE from 'three';

export class SimpleTree extends THREE.Group {
  constructor(options = {}) {
    super();
    this.maxLevels = options.levels || 3;
    this.branchColor = options.color || 0x8b4513; // Brown
    this.material = new THREE.MeshStandardMaterial({ color: this.branchColor });
    
    // Start the recursive generation
    this.generate();
  }

  generate() {
    // Clear existing children if re-generating
    this.clear();

    // Initial parameters for the trunk (Level 0)
    const trunkLevel = 0;
    const trunkHeight = 2.0;
    const trunkRadius = 0.2;

    // Create the first cylinder
    this.createBranch(this, trunkLevel, trunkHeight, trunkRadius);
  }

  createBranch(parent, level, height, radius) {
    if (level > this.maxLevels) return;

    // 1. Create Geometry
    // CylinderGeometry(radiusTop, radiusBottom, height, radialSegments)
    // We taper the top slightly by multiplying radius by 0.7
    const geometry = new THREE.CylinderGeometry(radius * 0.7, radius, height, 8);
    
    // IMPORTANT: Shift the geometry so the bottom sits at (0,0,0)
    // By default, Three.js centers cylinders. We want the "pivot" at the base.
    geometry.translate(0, height / 2, 0);

    const mesh = new THREE.Mesh(geometry, this.material);
    
    // 2. Position the branch
    // If it's the trunk (level 0), it stays at the origin.
    // If it's a child, we move it to the TOP of the parent cylinder.
    if (level > 0) {
      mesh.position.y = height; // Move to the end of the previous segment
    }

    // 3. Add to hierarchy
    parent.add(mesh);

    // 4. Generate children for the next level
    const nextLevel = level + 1;
    if (nextLevel <= this.maxLevels) {
      // Random number of branches (e.g., 2 to 4)
      const numBranches = Math.floor(Math.random() * 3) + 2;

      for (let i = 0; i < numBranches; i++) {
        // Create new stats for the child
        const childHeight = height * 0.75; // Shorter
        const childRadius = radius * 0.6;   // Thinner
        
        // Call recursion
        const childMesh = this.createBranch(mesh, nextLevel, childHeight, childRadius);
        
        // 5. Rotate the child branch randomly
        if (childMesh) {
          // Spread them out: tilt away from center (X/Z) and rotate around (Y)
          childMesh.rotation.z = (Math.random() - 0.5) * 1.5; // Tilt
          childMesh.rotation.x = (Math.random() - 0.5) * 1.5; // Tilt
          childMesh.rotation.y = Math.random() * Math.PI * 2; // Random radial direction
        }
      }
    }
    
    return mesh;
  }
}

