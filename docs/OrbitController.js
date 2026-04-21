

import * as THREE from "three";

export class OrbitController {
  constructor(camera, options = {}) {

    this.distance = options.distance ?? 10;
    this.height = options.height ?? Math.PI / 4;
    this.rotation = options.rotation ?? 0;
    this.target = options.target ?? new THREE.Vector3(0, 1.5, 0);
    this.maxHeight = options.maxHeight ?? 5.5;
    this.offset = options.offset ?? new THREE.Vector3(0, 0.2, 0);
    this.lookMin = 1;
    this.lookMax = 4;

    this.camera = camera;
    this.update();
  }


  centerOn(object) {
    const box = new THREE.Box3().setFromObject(object);
    box.getCenter(this.target);
    this.update();
  }

  update() {

    //const maxHeight = this.curveHeight + this.distance; //cyclinger + radius of sphere


    // const curvePercent = cylinderHeight / this.maxHeight;
    const split = 0.8;
    const cylinderHeight = (this.maxHeight * split);


    let y = 0;
    let x = 0;
    let z = 0;

    let targetHeight = 0;

    // console.log("cylinderHeight", cylinderHeight);
    // console.log("curvePercent", curvePercent);

    if (this.height < split) {
      // cyclinder
      y = this.height * this.maxHeight;
      x = this.distance * Math.cos(this.rotation);
      z = this.distance * Math.sin(this.rotation);
      targetHeight = Math.min(Math.max(y, this.lookMin), this.lookMax);
    } else {
      // spehre écrasée

      // pourcentage dans la sphere
      const t = (this.height - split) / (1 - split);
      // smooth
      const angle = t * (Math.PI / 2);

      // XZ
      const xzRadius = this.distance;
      x = xzRadius * Math.cos(this.rotation) * Math.cos(angle);
      z = xzRadius * Math.sin(this.rotation) * Math.cos(angle);

      // Y compressé
      const yRadius = this.maxHeight - cylinderHeight;
      y = cylinderHeight + Math.sin(angle) * yRadius;

      targetHeight = Math.min(Math.max(cylinderHeight, this.lookMin), this.lookMax);
    }

    this.camera.position.set(
      this.offset.x + x,
      this.offset.y + y,
      this.offset.z + z
    );

    // console.log(this.camera.position.y);


    const targetPosition = new THREE.Vector3(this.offset.x, this.offset.y + targetHeight, this.offset.z);

    this.camera.lookAt(targetPosition);
  }

}