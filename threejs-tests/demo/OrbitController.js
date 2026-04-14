

import * as THREE from "three";

export class OrbitController {
  constructor(camera, options = {}) {

      this.distance =  options.distance ?? 10;
      this.height =  options.height ?? Math.PI / 4;
      this.rotation = options.rotation ?? 0;
      this.target = options.target ?? new THREE.Vector3(0, 1.5, 0);

    this.camera = camera;
    this.update();
  }


  centerOn(object) {
    const box = new THREE.Box3().setFromObject(object);
    box.getCenter(this.target);
    this.update();
  }

  update() {
    const x = this.distance * Math.sin(this.height) * Math.cos(this.rotation);
    const y = this.distance * Math.cos(this.height);
    const z = this.distance * Math.sin(this.height) * Math.sin(this.rotation);

    this.camera.position.set(
      this.target.x + x,
      this.target.y + y,
      this.target.z + z
    );

    this.camera.lookAt(this.target);
  }

}