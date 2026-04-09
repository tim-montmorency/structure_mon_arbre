import * as THREE from "three";

/**
 * Setup branch indicator dots as 2D UI elements
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {THREE.Camera} camera - The Three.js camera
 * @param {THREE.Object3D} tree - The tree object to add dots to
 * @param {Map} meshToDotMap - Map to track mesh-to-dot associations
 * @param {Function} highlightBranch - Function to highlight a branch
 * @param {Function} unhighlightBranch - Function to unhighlight a branch
 * @returns {Object} Object with updateDotPositions and removeMeshDots functions
 */
export function setupBranchDotIndicators(scene, camera, tree, meshToDotMap, highlightBranch, unhighlightBranch) {
  let dotHoveredMesh = null;
  const dotPositions = [];
  const dotsContainer = createDotsContainer();

  function createDotsContainer() {
    const existing = document.getElementById("branch-dots");
    if (existing) return existing;

    const container = document.createElement("div");
    container.id = "branch-dots";
    container.style.position = "fixed";
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.pointerEvents = "none";
    container.style.zIndex = "100";
    document.body.appendChild(container);
    return container;
  }

  function addBottomDots(treeRoot) {
    if (!treeRoot) return;

    treeRoot.traverse((obj) => {
      if (obj.isMesh && obj.geometry && obj !== treeRoot) {
        const geometry = obj.geometry;
        const positions = geometry.attributes.position;

        if (!positions) return;

        // Get vertex data and transform to world space
        const vertices = [];
        for (let i = 0; i < positions.count; i++) {
          const v = new THREE.Vector3();
          v.fromBufferAttribute(positions, i);
          v.applyMatrix4(obj.matrixWorld);
          vertices.push(v);
        }

        if (vertices.length === 0) return;

        // Find the lowest and highest Y positions
        let minY = vertices[0].y;
        let maxY = vertices[0].y;

        vertices.forEach((v) => {
          if (v.y < minY) minY = v.y;
          if (v.y > maxY) maxY = v.y;
        });

        // Place dot at 10% up from the bottom
        const targetY = minY + (maxY - minY) * 0.1;

        // Find vertices near this Y height and get their average X, Z
        const nearbyVertices = vertices.filter((v) => Math.abs(v.y - targetY) < (maxY - minY) * 0.05);
        const dotPos = new THREE.Vector3();

        if (nearbyVertices.length > 0) {
          nearbyVertices.forEach((v) => dotPos.add(v));
          dotPos.divideScalar(nearbyVertices.length);
        } else {
          // Fallback: use the lowest vertex position and adjust Y
          dotPos.copy(vertices[0]);
          dotPos.y = targetY;
        }

        // Store world position and create HTML dot element
        const dotElement = document.createElement("div");
        dotElement.className = "branch-dot";
        dotElement.style.position = "fixed";
        dotElement.style.width = "8px";
        dotElement.style.height = "8px";
        dotElement.style.backgroundColor = "#ffffff";
        dotElement.style.borderRadius = "50%";
        dotElement.style.boxShadow = "0 0 4px rgba(255, 255, 255, 0.8)";
        dotElement.style.pointerEvents = "auto";
        dotElement.style.cursor = "pointer";
        dotsContainer.appendChild(dotElement);

        // Add hover events to highlight the branch
        dotElement.addEventListener("mouseenter", () => {
          dotHoveredMesh = obj;
          highlightBranch(obj);
          dotElement.style.transform = "scale(1.5)";
          dotElement.style.transition = "transform 0.2s ease";
        });

        dotElement.addEventListener("mouseleave", () => {
          dotHoveredMesh = null;
          unhighlightBranch(obj);
          dotElement.style.transform = "scale(1)";
        });

        // Track this dot for the mesh
        if (!meshToDotMap.has(obj)) {
          meshToDotMap.set(obj, []);
        }
        meshToDotMap.get(obj).push(dotElement);

        dotPositions.push({ worldPos: dotPos, element: dotElement, branch: obj });
      }
    });
  }

  function updateDotPositions() {
    dotPositions.forEach(({ worldPos, element }) => {
      const screenPos = new THREE.Vector3().copy(worldPos);
      screenPos.project(camera);

      const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth - 4;
      const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight - 4;

      // Only show if in front of camera
      if (screenPos.z > -1 && screenPos.z < 1) {
        element.style.left = x + "px";
        element.style.top = y + "px";
        element.style.display = "block";
      } else {
        element.style.display = "none";
      }
    });
  }

  function removeMeshDots(clickedMesh) {
    function isDescendantOf(child, parent) {
      let current = child;
      while (current.parent) {
        if (current.parent === parent) return true;
        current = current.parent;
      }
      return false;
    }

    const dotsToRemove = [];
    meshToDotMap.forEach((dots, mesh) => {
      if (mesh === clickedMesh || isDescendantOf(mesh, clickedMesh)) {
        dotsToRemove.push(...dots);
      }
    });

    dotsToRemove.forEach((dotElement) => {
      dotElement.remove();
      const idx = dotPositions.findIndex((d) => d.element === dotElement);
      if (idx !== -1) dotPositions.splice(idx, 1);
    });

    meshToDotMap.delete(clickedMesh);
  }

  // Initialize dots if tree exists
  if (tree) {
    addBottomDots(tree);
  }

  return { updateDotPositions, removeMeshDots };
}
