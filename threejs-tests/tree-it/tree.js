// tree.js - Tree interaction with raycasting and highlighting
import * as THREE from "three";
import { setupBranchDotIndicators } from "./dotIndicators.js";

export function setupTreeInteraction(scene, camera, raycaster, mouse, tree) {
  let hoveredMesh = null;
  const meshMaterials = new Map(); // Store cloned materials per mesh
  const meshToDotMap = new Map(); // Map mesh to its dot elements

  // Helper function to find the first mesh with geometry/material (skip parent Groups and indicator dots)
  function getLeafMesh(intersects) {
    for (const intersection of intersects) {
      const obj = intersection.object;
      // Skip dots and other non-interactive objects
      if (obj.userData.ignoreRaycast) continue;
      // Only consider objects with geometry (actual meshes, not Groups)
      if (obj.geometry || (obj.isMesh && obj.material)) {
        return obj;
      }
    }
    return null;
  }

  // Ensure each mesh has its own cloned material
  function ensureOwnMaterial(mesh) {
    if (!meshMaterials.has(mesh)) {
      if (mesh.material) {
        const clonedMaterial = mesh.material.clone();
        meshMaterials.set(mesh, { original: mesh.material, cloned: clonedMaterial });
        mesh.material = clonedMaterial;
      }
    }
    return meshMaterials.get(mesh)?.cloned || mesh.material;
  }

  function highlightBranch(mesh) {
    if (!mesh) return;
    const material = ensureOwnMaterial(mesh);
    if (material) {
      material.emissive = new THREE.Color(0x00d4ff); // Cyan for the hovered branch
      material.emissiveIntensity = 0.35;
    }

    // Also highlight all children with a different color
    mesh.children.forEach((child) => {
      highlightChildren(child);
    });
  }

  function highlightChildren(mesh) {
    if (!mesh) return;

    const material = ensureOwnMaterial(mesh);
    if (material) {
      material.emissive = new THREE.Color(0xff69b4); // Hot pink for children
      material.emissiveIntensity = 0.35;
    }

    // Recursively highlight nested children
    mesh.children.forEach((child) => {
      highlightChildren(child);
    });
  }

  function unhighlightBranch(mesh) {
    if (!mesh) return;
    const material = meshMaterials.get(mesh)?.cloned || mesh.material;
    if (material) material.emissive?.setHex(0x000000);

    // Also unhighlight all children
    mesh.children.forEach((child) => {
      unhighlightChildren(child);
    });
  }

  function unhighlightChildren(mesh) {
    if (!mesh) return;
    const material = meshMaterials.get(mesh)?.cloned || mesh.material;
    if (material) material.emissive?.setHex(0x000000);

    // Recursively unhighlight nested children
    mesh.children.forEach((child) => {
      unhighlightChildren(child);
    });
  }

  // Hover: only the exact branch you point at
  window.addEventListener("mousemove", (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    const mesh = getLeafMesh(intersects);

    // Reset previous hover
    if (hoveredMesh && hoveredMesh !== mesh) {
      unhighlightBranch(hoveredMesh);
      hoveredMesh = null;
    }

    // Apply hover only to the exact mesh
    if (mesh && !mesh.userData.ignoreRaycast) {
      hoveredMesh = mesh;
      console.log("Hovering on branch:", mesh.name || "unnamed mesh");
      highlightBranch(mesh);
    }
  });

  // Click: remove ONLY the exact clicked mesh
  window.addEventListener("click", (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    const clickedMesh = getLeafMesh(intersects);
    if (!clickedMesh) return;

    if (clickedMesh.userData.ignoreRaycast) return;

    console.log("Clicked and removing mesh:", clickedMesh.name);

    // Clean up material from map if it exists
    meshMaterials.delete(clickedMesh);

    // Remove associated dots via the dots module
    if (removeMeshDots) {
      removeMeshDots(clickedMesh);
    }

    clickedMesh.removeFromParent();
  });

  // Setup branch dot indicators (2D UI)
  let removeMeshDots = null;
  let updateDotPositions = null;

  if (tree) {
    const dotFunctions = setupBranchDotIndicators(scene, camera, tree, meshToDotMap, highlightBranch, unhighlightBranch);
    removeMeshDots = dotFunctions.removeMeshDots;
    updateDotPositions = dotFunctions.updateDotPositions;
  }

  // Return the update function to be called in animation loop
  return { updateDotPositions };
}
