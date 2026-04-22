import * as THREE from "three";

export class Wind {
  constructor() {
    this.uniforms = {
      iTime: { value: 0 },
    };
  }

  update(delta) {
    this.uniforms.iTime.value += delta; // seconds
  }
}
