import * as THREE from "three";

export class TreeInteraction {
  constructor(scene, camera, tree) {
    this.scene = scene;
    this.camera = camera;
    this.tree = tree;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.hoveredMesh = null;
    this.selectedMeshes = new Set(); // Sélection multiple
    this.meshMaterials = new Map();
    this.cutBranches = []; // {mesh, parent} pour le rétablissement
    this.wrongCutCount = 0; // Nombre de bonnes branches coupées par erreur
    this.onSelectionChange = null; // callback(count)

    // Snapshot de toutes les branches bad au chargement
    this.allBadBranches = [];
    this.tree.traverse((child) => {
      if (child.userData.isBad === true) {
        const tag = this._getTag(child);
        this.allBadBranches.push({ node: child, name: child.name || "unnamed", tag });
      }
    });

    this._setupHover();
    this._setupClick();
    this._createOutline();
  }

  // --- Outline solide autour de l'arbre (ne réagit pas au survol/clic) ---
  _createOutline() {
    const meshes = [];
    this.tree.traverse((child) => {
      if (child.isMesh) meshes.push(child);
    });
    const outlineMat = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      side: THREE.BackSide,
    });
    for (const mesh of meshes) {
      const geo = mesh.geometry.clone();
      const pos = geo.attributes.position;
      const norm = geo.attributes.normal;
      if (!pos || !norm) continue;
      const thickness = 0.25;
      for (let i = 0; i < pos.count; i++) {
        pos.setXYZ(i, pos.getX(i) + norm.getX(i) * thickness, pos.getY(i) + norm.getY(i) * thickness, pos.getZ(i) + norm.getZ(i) * thickness);
      }
      pos.needsUpdate = true;
      const outlineMesh = new THREE.Mesh(geo, outlineMat);
      outlineMesh.userData.ignoreRaycast = true;
      outlineMesh.userData.isOutline = true;
      outlineMesh.castShadow = false;
      outlineMesh.receiveShadow = false;
      mesh.add(outlineMesh);
    }
  }

  // --- Obtenir le premier mesh interactif des intersections ---
  _getLeafMesh(intersects) {
    for (const intersection of intersects) {
      const obj = intersection.object;
      if (obj.userData.ignoreRaycast) continue;
      if (obj.geometry || (obj.isMesh && obj.material)) return obj;
    }
    return null;
  }

  // --- Vérifier si un mesh fait partie d'une branche sélectionnée ---
  _isInSelection(mesh) {
    let current = mesh;
    while (current) {
      if (this.selectedMeshes.has(current)) return true;
      current = current.parent;
    }
    return false;
  }

  // --- Vérifier si un ancêtre (pas le mesh lui-même) est sélectionné ---
  _hasSelectedAncestor(mesh) {
    let current = mesh.parent;
    while (current) {
      if (this.selectedMeshes.has(current)) return true;
      current = current.parent;
    }
    return false;
  }

  // --- Cloner le matériau pour que chaque mesh puisse être surligné indépendamment ---
  _ensureOwnMaterial(mesh) {
    if (!this.meshMaterials.has(mesh)) {
      if (mesh.material) {
        const cloned = mesh.material.clone();
        this.meshMaterials.set(mesh, { original: mesh.material, cloned });
        mesh.material = cloned;
      }
    }
    return this.meshMaterials.get(mesh)?.cloned || mesh.material;
  }

  // --- Surligner la branche survolée (cyan) et ses enfants (rose) ---
  _highlightBranch(mesh) {
    if (!mesh || this._isInSelection(mesh)) return;
    const mat = this._ensureOwnMaterial(mesh);
    if (mat) {
      mat.emissive = new THREE.Color(0x00d4ff);
      mat.emissiveIntensity = 0.35;
    }
    mesh.children.forEach((child) => this._highlightChildren(child));
  }

  _highlightChildren(mesh) {
    if (!mesh || mesh.userData.isOutline || this._isInSelection(mesh)) return;
    const mat = this._ensureOwnMaterial(mesh);
    if (mat) {
      mat.emissive = new THREE.Color(0xff69b4);
      mat.emissiveIntensity = 0.35;
    }
    mesh.children.forEach((child) => this._highlightChildren(child));
  }

  // --- Retirer le surlignage (ne touche pas aux branches sélectionnées) ---
  _unhighlightBranch(mesh) {
    if (!mesh || this._isInSelection(mesh)) return;
    const mat = this.meshMaterials.get(mesh)?.cloned || mesh.material;
    if (mat) mat.emissive?.setHex(0x000000);
    mesh.children.forEach((child) => this._unhighlightChildren(child));
  }

  _unhighlightChildren(mesh) {
    if (!mesh || mesh.userData.isOutline || this._isInSelection(mesh)) return;
    const mat = this.meshMaterials.get(mesh)?.cloned || mesh.material;
    if (mat) mat.emissive?.setHex(0x000000);
    mesh.children.forEach((child) => this._unhighlightChildren(child));
  }

  // --- Surlignage de sélection (vert) ---
  _selectBranch(mesh) {
    if (!mesh) return;
    const mat = this._ensureOwnMaterial(mesh);
    if (mat) {
      mat.emissive = new THREE.Color(0xff0000);
      mat.emissiveIntensity = 0.5;
    }
    mesh.children.forEach((child) => this._selectChildren(child));
  }

  _selectChildren(mesh) {
    if (!mesh || mesh.userData.isOutline) return;
    const mat = this._ensureOwnMaterial(mesh);
    if (mat) {
      mat.emissive = new THREE.Color(0xffb3b3);
      mat.emissiveIntensity = 0.4;
    }
    mesh.children.forEach((child) => this._selectChildren(child));
  }

  // --- Survol sur une branche déjà sélectionnée (vert foncé) ---
  _hoverSelectedBranch(mesh) {
    if (!mesh) return;
    const mat = this._ensureOwnMaterial(mesh);
    if (mat) {
      mat.emissive = new THREE.Color(0x00cc00);
      mat.emissiveIntensity = 0.6;
    }
    mesh.children.forEach((child) => this._hoverSelectedChildren(child));
  }

  _hoverSelectedChildren(mesh) {
    if (!mesh || mesh.userData.isOutline) return;
    const mat = this._ensureOwnMaterial(mesh);
    if (mat) {
      mat.emissive = new THREE.Color(0x008800);
      mat.emissiveIntensity = 0.5;
    }
    mesh.children.forEach((child) => this._hoverSelectedChildren(child));
  }

  // --- Retirer le surlignage de sélection (préserver les branches encore sélectionnées) ---
  _deselectBranch(mesh) {
    if (!mesh || mesh.userData.isOutline) return;
    if (this.selectedMeshes.has(mesh)) {
      this._selectBranch(mesh);
      return;
    }
    const mat = this.meshMaterials.get(mesh)?.cloned || mesh.material;
    if (mat) mat.emissive?.setHex(0x000000);
    mesh.children.forEach((child) => this._deselectBranch(child));
  }

  // --- Trouver le tag (string) dans le userData d'un mesh ---
  _getTag(mesh) {
    if (!mesh || !mesh.userData) return null;
    for (const key of Object.keys(mesh.userData)) {
      if (key === "name" || key === "isBad" || key === "ignoreRaycast") continue;
      if (typeof mesh.userData[key] === "string" && mesh.userData[key].length > 0) {
        return mesh.userData[key];
      }
    }
    return null;
  }

  // --- Trouver le tag en remontant la hiérarchie ---
  _getTagInHierarchy(mesh) {
    let current = mesh;
    while (current) {
      const tag = this._getTag(current);
      if (tag) return tag;
      current = current.parent;
    }
    return null;
  }

  // --- Vérifier si ce mesh précis est indestructible (ne remonte PAS la hiérarchie) ---
  _isIndestructible(mesh) {
    return this._getTag(mesh) === "indestructible";
  }

  // --- Vérifier le statut défectueux dans la hiérarchie ---
  _checkBadStatus(mesh) {
    if (mesh.userData.isBad === true) return { isBad: true, isParentBad: false };
    let current = mesh;
    while (current.parent) {
      current = current.parent;
      if (current.userData.isBad === true) return { isBad: false, isParentBad: true };
    }
    return { isBad: false, isParentBad: false };
  }

  // --- Survol ---
  _setupHover() {
    window.addEventListener("mousemove", (event) => {
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);
      const mesh = this._getLeafMesh(intersects);

      // Retirer le surlignage précédent
      if (this.hoveredMesh && this.hoveredMesh !== mesh) {
        if (this.selectedMeshes.has(this.hoveredMesh)) {
          this._selectBranch(this.hoveredMesh);
        } else {
          this._unhighlightBranch(this.hoveredMesh);
        }
        this.hoveredMesh = null;
      }

      // Curseur interdit si la branche est indestructible
      if (mesh && this._isIndestructible(mesh)) {
        document.body.style.cursor = "not-allowed";
        return;
      }

      // Curseur interdit si le mesh est enfant d'une branche sélectionnée
      if (mesh && this._hasSelectedAncestor(mesh)) {
        document.body.style.cursor = "not-allowed";
        return;
      }

      if (mesh && !mesh.userData.ignoreRaycast) {
        document.body.style.cursor = "pointer";
        this.hoveredMesh = mesh;
        if (this.selectedMeshes.has(mesh)) {
          this._hoverSelectedBranch(mesh);
        } else if (!this._isInSelection(mesh)) {
          this._highlightBranch(mesh);
        }
      } else {
        document.body.style.cursor = "default";
      }
    });
  }

  // --- Clic pour sélectionner / désélectionner ---
  _setupClick() {
    window.addEventListener("click", (event) => {
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);
      const clicked = this._getLeafMesh(intersects);
      if (!clicked) return;

      // Bloquer le clic si la branche est indestructible
      if (this._isIndestructible(clicked)) return;

      // Bloquer le clic si un ancêtre est sélectionné
      if (this._hasSelectedAncestor(clicked)) return;

      // Si déjà sélectionné, désélectionner
      if (this.selectedMeshes.has(clicked)) {
        this.selectedMeshes.delete(clicked);
        this._deselectBranch(clicked);
        this.onSelectionChange?.(this.selectedMeshes.size);
        return;
      }

      const badStatus = this._checkBadStatus(clicked);
      const tag = this._getTagInHierarchy(clicked);
      let statusMessage = "GOOD BRANCH";
      if (badStatus.isBad) statusMessage = tag ? `BAD BRANCH: ${tag}` : "BAD BRANCH";
      else if (badStatus.isParentBad) statusMessage = tag ? `Parent is bad branch: ${tag}` : "Parent is bad branch";

      console.log("Selected:", clicked.name || "unnamed mesh", `[${statusMessage}]`);

      // Ajouter à la sélection
      this.selectedMeshes.add(clicked);
      this._selectBranch(clicked);
      this.onSelectionChange?.(this.selectedMeshes.size);
    });
  }

  // --- Désélectionner toutes les branches ---
  _deselectAll() {
    const meshes = [...this.selectedMeshes];
    this.selectedMeshes.clear();
    this.onSelectionChange?.(0);
    for (const mesh of meshes) {
      this._deselectBranch(mesh);
    }
  }

  // --- Couper toutes les branches sélectionnées ---
  cutSelected() {
    if (this.selectedMeshes.size === 0) return;

    for (const mesh of this.selectedMeshes) {
      // Compter le mesh lui-même + tous ses descendants qui sont de bonnes branches
      const badNodes = new Set(this.allBadBranches.map((b) => b.node));
      mesh.traverse((child) => {
        if (child.userData.isOutline) return;
        if (child.isMesh && !badNodes.has(child)) {
          // Vérifier qu'aucun ancêtre jusqu'au mesh coupé n'est bad
          let isBad = false;
          let current = child;
          while (current) {
            if (badNodes.has(current)) {
              isBad = true;
              break;
            }
            if (current === mesh) break;
            current = current.parent;
          }
          if (!isBad) this.wrongCutCount++;
        }
      });
      const parent = mesh.parent;
      this.cutBranches.push({ mesh, parent });
      mesh.removeFromParent();
      this.meshMaterials.delete(mesh);
      console.log("Cut branch:", mesh.name || "unnamed mesh");
    }
    this.selectedMeshes.clear();
    this.onSelectionChange?.(0);
  }

  // --- Rétablir toutes les branches coupées ---
  restoreAll() {
    // Copier puis vider la sélection AVANT de retirer le surlignage
    const selected = [...this.selectedMeshes];
    this.selectedMeshes.clear();
    for (const mesh of selected) {
      this._deselectBranch(mesh);
    }

    for (const { mesh, parent } of this.cutBranches) {
      if (parent) parent.add(mesh);
      this._deselectBranch(mesh);
    }
    this.cutBranches = [];
    this.wrongCutCount = 0;
    this.onSelectionChange?.(0);
    console.log("All branches restored");
  }

  // --- Vérifier si un nœud est encore connecté à l'arbre ---
  _isConnectedToTree(node) {
    let current = node;
    while (current) {
      if (current === this.tree) return true;
      current = current.parent;
    }
    return false;
  }

  // --- Valider : retourner les résultats (branches coupées ou sélectionnées vs manquées) ---
  validate() {
    const cut = []; // branches bad correctement retirées ou sélectionnées
    const missed = []; // branches bad encore présentes et non sélectionnées

    // Branche identifiée si coupée OU si elle (ou un ancêtre) est sélectionnée
    const isSelectedOrDescendant = (node) => {
      let current = node;
      while (current) {
        if (this.selectedMeshes.has(current)) return true;
        current = current.parent;
      }
      return false;
    };

    for (const bad of this.allBadBranches) {
      if (!this._isConnectedToTree(bad.node) || isSelectedOrDescendant(bad.node)) {
        cut.push({ name: bad.name, tag: bad.tag, isBad: true });
      } else {
        missed.push({ name: bad.name, tag: bad.tag });
      }
    }

    // Compter les sélections incorrectes (même logique que cutSelected)
    let wrongSelectionCount = 0;
    const badNodes = new Set(this.allBadBranches.map((b) => b.node));
    for (const mesh of this.selectedMeshes) {
      mesh.traverse((child) => {
        if (child.userData.isOutline) return;
        if (child.isMesh && !badNodes.has(child)) {
          let isBad = false;
          let current = child;
          while (current) {
            if (badNodes.has(current)) {
              isBad = true;
              break;
            }
            if (current === mesh) break;
            current = current.parent;
          }
          if (!isBad) wrongSelectionCount++;
        }
      });
    }

    return { cut, missed, wrongCutCount: this.wrongCutCount + wrongSelectionCount };
  }
}
