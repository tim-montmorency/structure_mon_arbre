

import * as THREE from "three";

export class OrbitController {
  constructor(camera, options = {}) {

    this.distance = options.distance ?? 10;
    this.height = options.height ?? Math.PI / 4;
    this.rotation = options.rotation ?? 0;
   // this.target = options.target ?? new THREE.Vector3(0, 1.5, 0);
    this.maxHeight = options.maxHeight ?? 5.5;
    this.offset = options.offset ?? new THREE.Vector3(0, -0.60, 0);
    this.lookMin = 2;
    this.lookMax = 4;

    this.camera = camera;
    this.update();
  }


  // centerOn(object) {
  //   const box = new THREE.Box3().setFromObject(object);
  //   box.getCenter(this.target);
  //   this.update();
  // }

  update() {
  const split = 0.8;
  const maxHeight = this.maxHeight + this.distance * 0.2;
  const cylinderHeight = (maxHeight * split);

  let y = 0;
  let x = 0;
  let z = 0;
  let targetHeight = 0;

  if (this.height < split) {
    // Cylinder
    y = this.height * maxHeight;
    x = this.distance * Math.cos(this.rotation);
    z = this.distance * Math.sin(this.rotation);
    targetHeight = Math.min(Math.max(y, this.lookMin), this.lookMax);
  } else {
    // Sphere écrasée
    const t = (this.height - split) / (1 - split);
    const angle = t * (Math.PI / 2);

    const xzRadius = this.distance;
    x = xzRadius * Math.cos(this.rotation) * Math.cos(angle);
    z = xzRadius * Math.sin(this.rotation) * Math.cos(angle);

    const yRadius = maxHeight - cylinderHeight;
    y = cylinderHeight + Math.sin(angle) * yRadius;

    targetHeight = Math.min(Math.max(cylinderHeight, this.lookMin), this.lookMax);
  }

  // --- 1. SMOOTH POSITION MOVEMENT ---
  // Create a Vector3 for the calculated raw destination
  const targetCamPos = new THREE.Vector3(
    this.offset.x + x,
    this.offset.y + y,
    this.offset.z + z
  );

  // Lerp factor (0.05 = 5% of the distance covered per frame). 
  // Lower = smoother/slower, Higher = snappier.
  const lerpFactor = 0.05; 
  this.camera.position.lerp(targetCamPos, lerpFactor);


  // --- 2. SMOOTH LOOK-AT MOVEMENT ---
  // Calculate the ideal look-at point
  const targetLookAt = new THREE.Vector3(this.offset.x, this.offset.y + targetHeight, this.offset.z);

  // If you don't track the current look-at target across frames, create a placeholder in your class
  if (!this.currentLookAt) {
    this.currentLookAt = targetLookAt.clone();
  }

  // Smoothly slide the look-at target point
  this.currentLookAt.lerp(targetLookAt, lerpFactor);
  
  // Make the camera look at the smoothed target point
  this.camera.lookAt(this.currentLookAt);
}

}