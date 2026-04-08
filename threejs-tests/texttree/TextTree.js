import * as THREE from 'three';

export class TextTree extends THREE.Group {
  constructor(data, options = {}) {
    super();
    this.branchColor = options.color || 0x8b4513;
    this.baseLength = options.baseLength || 1.0;
    this.baseRadius = options.baseRadius || 0.12; // Nouveau paramètre pour l'épaisseur initiale
    this.radiusStep = options.radiusStep || 0.45; // Réduction d'épaisseur par niveau


    // On crée un matériau unique pour tout l'arbre
    this.material = new THREE.MeshStandardMaterial({ color: this.branchColor });

    this.name = options.name || "TextTree";
    this._generate(data);
  }

  _generate(data) {
    const lines = data.trim().split('\n');
    const levels = [];

    lines.forEach((line) => {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 5) return;

      const prefix = parts[0];
      const level = prefix.length - 1;

      // Format : [prefixe] [type] [facteurLongueur] [inclinaisonDeg] [rotationDeg]
      const lengthFactor = parseFloat(parts[2]);
      const inclinationDeg = parseFloat(parts[3]);
      const rotationDeg = parseFloat(parts[4]);

      // 1. Calcul de la longueur relative au parent
      let parentLength = this.baseLength;
      if (level > 0 && levels[level - 1]) {
        parentLength = levels[level - 1].userData.actualLength;
      }
      const actualLength = parentLength * lengthFactor;

      // 2. Calcul du rayon basé sur la profondeur (level)
      // Plus on est profond, plus c'est fin
      const currentLevelRadius = this.baseRadius * Math.pow(this.radiusStep, level);
      const nextLevelRadius = this.baseRadius * Math.pow(this.radiusStep, level + 1);



      // 3. Création du Pivot (L'articulation à la base)
      const pivot = new THREE.Group();
      pivot.rotation.y = THREE.MathUtils.degToRad(rotationDeg);
      pivot.rotation.z = THREE.MathUtils.degToRad(inclinationDeg);
      pivot.userData.actualLength = actualLength;

      // 4. Création du Mesh
      // Rayon haut, Rayon bas, Hauteur, Segments
      const geometry = new THREE.CylinderGeometry(nextLevelRadius, currentLevelRadius, actualLength, 8);
      const mesh = new THREE.Mesh(geometry, this.material);

      // Décalage pour que la base du cylindre soit sur le pivot
      mesh.position.y = actualLength / 2;
      mesh.name = `${parts[1]}_L${level}`;
      mesh.userData.isBranch = true;
      mesh.userData.level = level;

      pivot.add(mesh);

      // 5. Attachement hiérarchique
      if (level === 0) {
        this.add(pivot);
      } else {
        const parentPivot = levels[level - 1];
        if (parentPivot) {
          // On place le pivot à la fin (le haut) de la branche parente
          pivot.position.y = parentPivot.userData.actualLength;
          parentPivot.add(pivot);
        }
      }

      // On stocke ce pivot comme dernier parent connu pour ce niveau
      levels[level] = pivot;
    });
  }


}