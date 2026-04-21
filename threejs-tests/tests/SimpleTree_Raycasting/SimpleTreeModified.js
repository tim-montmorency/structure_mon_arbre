import * as THREE from 'three';

export class SimpleTree extends THREE.Group {
    constructor(options = {}) {
        super();
        this.branchColor = options.color || 0x8B5F2B;
        this.seed = Math.floor(Math.random() * 200) + 1;
        this.random = this.seededRandom(this.seed);

        this.material = new THREE.MeshStandardMaterial({
            color: this.branchColor,
            roughness: 0.82,
            metalness: 0.1
        });

        this.allBranches = [];
        this.generate();
    }

    seededRandom(seed) {
        let s = seed % 2147483647;
        if (s <= 0) s += 2147483646;
        return () => {
            s = s * 16807 % 2147483647;
            return (s - 1) / 2147483646;
        };
    }

    rnd(min, max) {
        return min + this.random() * (max - min);
    }

    generate() {
        this.clear();
        this.allBranches = [];

        // Realistic trunk
        const trunkHeight = 13.5;
        const trunkBaseRadius = 0.58;
        const trunkTopRadius = 0.29;

        const trunkGeo = new THREE.CylinderGeometry(trunkTopRadius, trunkBaseRadius, trunkHeight, 20);
        trunkGeo.translate(0, trunkHeight / 2, 0);

        const trunk = new THREE.Mesh(trunkGeo, this.material.clone());
        trunk.userData.isTrunk = true;
        this.add(trunk);
        this.allBranches.push(trunk);

        // 6 to 9 main scaffold branches
        const numMain = Math.floor(this.random() * 4) + 6;

        for (let i = 0; i < numMain; i++) {
            this.createMainBranch(trunk, trunkHeight, trunkTopRadius, i, numMain);
        }
    }

    createMainBranch(trunk, trunkHeight, trunkTopRadius, index, total) {
        const height = this.rnd(5.0, 7.5);
        const baseRadius = trunkTopRadius * this.rnd(0.85, 1.12);

        const group = new THREE.Group();
        trunk.add(group);

        // Proper 360° distribution
        group.rotation.y = (index / total) * Math.PI * 2 + this.rnd(-0.25, 0.25);

        // Main branch with higher resolution and slight curve
        const geo = new THREE.CylinderGeometry(baseRadius * 0.75, baseRadius * 0.38, height, 14);
        geo.translate(0, height / 2, 0);

        const branch = new THREE.Mesh(geo, this.material.clone());
        branch.userData.level = 1;
        group.add(branch);
        this.allBranches.push(branch);

        // Good vertical positioning
        branch.position.y = this.rnd(3.2, 9.2);

        // Natural angles - more outward
        branch.rotation.x = this.rnd(0.32, 0.68);
        branch.rotation.z = this.rnd(-0.42, 0.42);

        // Add secondary branches
        this.addChildBranches(branch, height, baseRadius * 0.62, 4);
    }

    addChildBranches(parent, parentHeight, parentRadius, depth) {
        if (depth <= 0) return;

        const num = depth === 2 ? 3 : 2;

        for (let i = 0; i < num; i++) {
            const height = parentHeight * this.rnd(0.5, 0.78);
            const radius = parentRadius * this.rnd(0.58, 0.85);

            const geo = new THREE.CylinderGeometry(radius * 0.88, radius * 0.45, height, 12);
            geo.translate(0, height / 2, 0);

            const branch = new THREE.Mesh(geo, this.material.clone());
            branch.userData.level = parent.userData.level + 1;
            parent.add(branch);
            this.allBranches.push(branch);

            branch.position.y = parentHeight * this.rnd(0.4, 0.88);

            branch.rotation.y = (i / num) * Math.PI * 2 + this.rnd(-0.75, 0.75);
            branch.rotation.x = this.rnd(0.35, 0.85);
            branch.rotation.z = this.rnd(-0.4, 0.4);

            this.addChildBranches(branch, height, radius, depth - 1);
        }
    }

    getAllBranches() {
        return this.allBranches;
    }
}