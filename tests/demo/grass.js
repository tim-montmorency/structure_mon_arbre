import * as THREE from "three";

/**
 * Grass system using noise-based wind, easeIn color gradient,
 * ambient occlusion, and 15-vertex curved blade geometry.
 * Usage: const grass = new Grass(wind, opts); scene.add(grass.mesh);
 */
export class Grass {
  constructor(wind, opts = {}) {
    const BLADE_COUNT = opts.count ?? 80000;
    const RADIUS = opts.radius ?? 4.0;
    const BLADE_HEIGHT = opts.bladeHeight ?? 0.15;
    const BLADE_HEIGHT_VAR = opts.bladeHeightVariation ?? 0.08;
    const BLADE_WIDTH = opts.bladeWidth ?? 0.04;
    const NOISE_SCALE = opts.noiseScale ?? 0.67;
    const PATCHINESS = opts.patchiness ?? 0.92; // 0 = all dirt, 1 = all grass

    // Random offset so patches change every refresh
    const noiseOffsetX = Math.random() * 1000;
    const noiseOffsetZ = Math.random() * 1000;

    // Smooth value noise (matches eztree's simplex approach)
    function hash(x, y) {
      const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      return n - Math.floor(n);
    }

    function smoothNoise(x, y) {
      const ix = Math.floor(x),
        iy = Math.floor(y);
      const fx = x - ix,
        fy = y - iy;
      const sx = fx * fx * (3 - 2 * fx);
      const sy = fy * fy * (3 - 2 * fy);
      const a = hash(ix, iy) + (hash(ix + 1, iy) - hash(ix, iy)) * sx;
      const b = hash(ix, iy + 1) + (hash(ix + 1, iy + 1) - hash(ix, iy + 1)) * sx;
      return a + (b - a) * sy;
    }

    // Multi-octave noise for natural look
    function fbmNoise(x, y) {
      return smoothNoise(x, y) * 0.6 + smoothNoise(x * 2.3 + 5.2, y * 2.3 + 1.3) * 0.3 + smoothNoise(x * 5.1 + 2.8, y * 5.1 + 7.9) * 0.1;
    }

    function isDirt(px, pz) {
      const n = fbmNoise((px + noiseOffsetX) * NOISE_SCALE, (pz + noiseOffsetZ) * NOISE_SCALE);
      return n < 1.0 - PATCHINESS;
    }

    // --- Blade template: 7 rows of pairs + 1 tip = 15 vertices ---
    const ROWS = 7;
    const templatePos = [];
    const templateH = [];
    const templateIdx = [];

    for (let i = 0; i < ROWS; i++) {
      const t = i / ROWS;
      const w = 1.0 - t * 0.92; // taper toward tip
      templatePos.push(-0.5 * w, t, 0.0); // left
      templatePos.push(0.5 * w, t, 0.0); // right
      templateH.push(t, t);
    }
    // Tip vertex
    templatePos.push(0.0, 1.0, 0.0);
    templateH.push(1.0);

    // Quad strip indices
    for (let i = 0; i < ROWS - 1; i++) {
      const b = i * 2;
      templateIdx.push(b, b + 1, b + 2);
      templateIdx.push(b + 2, b + 1, b + 3);
    }
    // Last pair -> tip
    const last = (ROWS - 1) * 2;
    templateIdx.push(last, last + 1, ROWS * 2);

    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(templatePos), 3));
    geo.setAttribute("aHeightPercent", new THREE.BufferAttribute(new Float32Array(templateH), 1));
    geo.setIndex(templateIdx);

    // --- Per-instance attributes ---
    const offsets = new Float32Array(BLADE_COUNT * 2);
    const bladeData = new Float32Array(BLADE_COUNT * 4); // height, width, yaw, hash

    let placed = 0;
    for (let attempt = 0; placed < BLADE_COUNT && attempt < BLADE_COUNT * 3; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const r = RADIUS * Math.sqrt(Math.random());
      const px = Math.cos(angle) * r;
      const pz = Math.sin(angle) * r;

      // Skip blade if in a dirt patch
      if (isDirt(px, pz)) continue;

      offsets[placed * 2] = px;
      offsets[placed * 2 + 1] = pz;
      bladeData[placed * 4] = BLADE_HEIGHT + Math.random() * BLADE_HEIGHT_VAR;
      bladeData[placed * 4 + 1] = BLADE_WIDTH * (0.6 + Math.random() * 0.8);
      bladeData[placed * 4 + 2] = Math.random() * Math.PI * 2; // yaw
      bladeData[placed * 4 + 3] = Math.random(); // hash
      placed++;
    }

    // Trim to actual placed count
    geo.instanceCount = placed;

    geo.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offsets, 2));
    geo.setAttribute("aBladeData", new THREE.InstancedBufferAttribute(bladeData, 4));

    // --- Vertex shader ---
    const vertexShader = /* glsl */ `
    attribute vec2 aOffset;
    attribute vec4 aBladeData; // height, width, yaw, hash
    attribute float aHeightPercent;

    uniform float iTime;

    varying float vHeightPercent;
    varying vec3 vWorldPos;
    varying vec3 vWorldNormal;

    #include <common>
    #include <shadowmap_pars_vertex>

    // PI already defined by <common>

    float easeIn(float x, float p) {
      return pow(x, p);
    }

    float remap(float val, float inMin, float inMax, float outMin, float outMax) {
      return outMin + (outMax - outMin) * ((val - inMin) / (inMax - inMin));
    }

    // 2D gradient noise -> float in [-1, 1]
    vec2 hash2(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
      return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
    }

    float noise12(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
            dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
        mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
            dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    void main() {
      float h = aHeightPercent;
      vHeightPercent = h;

      float bladeHeight = aBladeData.x;
      float bladeWidth  = aBladeData.y;
      float yaw         = aBladeData.z;
      float hash        = aBladeData.w;

      float time = iTime;
      vec3 grassBladeWorldPos = vec3(aOffset.x, 0.0, aOffset.y);

      // Scale blade template
      vec3 pos = position;
      pos.x *= bladeWidth;
      pos.y *= bladeHeight;

      // Rotate by yaw (around Y)
      float cy = cos(yaw);
      float sy = sin(yaw);
      vec3 rotated = vec3(
        pos.x * cy - pos.z * sy,
        pos.y,
        pos.x * sy + pos.z * cy
      );

      // --- Natural curve ---
      float curveAmount = 0.15 + hash * 0.2;

      // Sample noise using time + world position
      float noiseSample = noise12(vec2(time * 0.35) + grassBladeWorldPos.xz);
      // Add the animated noise onto the grass curve
      curveAmount += noiseSample * 0.1;

      // --- Wind direction from noise ---
      // Sample noise and then remap into the range [0, 2PI]
      float windDir = noise12(grassBladeWorldPos.xz * 0.05 + 0.05 * time);
      windDir = remap(windDir, -1.0, 1.0, 0.0, PI * 2.0);

      // --- Wind strength from noise ---
      // Another noise sample for the strength of the wind
      float windNoiseSample = noise12(grassBladeWorldPos.xz * 0.25 + time);
      // Try and shape it a bit with easeIn(), this is pretty arbitrary
      float windLeanAngle = remap(windNoiseSample, -1.0, 1.0, 0.25, 1.0);
      windLeanAngle = easeIn(windLeanAngle, 2.0) * 1.25;

      // --- Apply curve + wind (world space, after yaw rotation) ---
      float bendFactor = easeIn(h, 2.0);

      // Natural lean
      float naturalDir = yaw + 1.5;
      rotated.x += cos(naturalDir) * curveAmount * bendFactor * bladeHeight;
      rotated.z += sin(naturalDir) * curveAmount * bendFactor * bladeHeight;

      // Wind lean
      rotated.x += cos(windDir) * windLeanAngle * bendFactor * bladeHeight * 0.4;
      rotated.z += sin(windDir) * windLeanAngle * bendFactor * bladeHeight * 0.4;

      // Final world position (0.05 = floor surface)
      vec3 worldPos = rotated + vec3(aOffset.x, 0.05, aOffset.y);

      // Approximate blade normal (facing outward from blade surface)
      vec3 bladeForward = vec3(-sy, 0.0, cy); // perpendicular to yaw
      vec3 bladeUp = vec3(0.0, 1.0, 0.0);
      vec3 bladeNormal = normalize(mix(bladeForward, bladeUp, 0.5));
      vWorldNormal = normalize((modelMatrix * vec4(bladeNormal, 0.0)).xyz);
      vWorldPos = (modelMatrix * vec4(worldPos, 1.0)).xyz;

      // Required by Three.js shadow chunks: view-space normal + world position
      vec3 transformedNormal = normalize(normalMatrix * bladeNormal);
      vec4 worldPosition = modelMatrix * vec4(worldPos, 1.0);
      #include <shadowmap_vertex>

      gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
    }
  `;

  // --- Fragment shader ---
  const fragmentShader = /* glsl */ `
    uniform vec3 sunDirection;
    uniform vec3 sunColor;
    uniform vec3 ambientColor;

    varying float vHeightPercent;
    varying vec3 vWorldPos;
    varying vec3 vWorldNormal;

    #include <common>
    #include <packing>
    #include <lights_pars_begin>
    #include <shadowmap_pars_fragment>
    #include <shadowmask_pars_fragment>

    float easeIn(float x, float p) {
      return pow(x, p);
    }

    void main() {
      float h = vHeightPercent;

      // Color: dark green base, yellowish-green tip
      vec3 baseColour = vec3(0.04, 0.18, 0.02);
      vec3 tipColour  = vec3(0.35, 0.52, 0.12);
      // Gradient from base to tip, controlled by shaping function
      vec3 diffuseColour = mix(baseColour, tipColour, easeIn(h, 4.0));

      // Ambient occlusion
      float density = 0.8;
      float aoForDensity = mix(1.0, 0.25, density);
      float ao = mix(aoForDensity, 1.0, easeIn(h, 2.0));

      // --- Lighting ---
      vec3 N = normalize(vWorldNormal);
      vec3 L = normalize(sunDirection);
      vec3 V = normalize(cameraPosition - vWorldPos);
      vec3 H = normalize(L + V);

      // Shadow (Three.js built-in)
      float shadow = getShadowMask();

      // Diffuse (wrap lighting for softer look)
      float NdotL = dot(N, L);
      float diffuse = max(0.0, NdotL * 0.5 + 0.5); // half-lambert

      // Translucency: light shining through blades from behind
      float translucency = max(0.0, dot(-N, L)) * 0.5 * easeIn(h, 2.0);

      // Specular
      float spec = pow(max(0.0, dot(N, H)), 24.0) * 0.2 * easeIn(h, 2.0);

      // Combine — shadow affects sun contributions
      vec3 ambient = ambientColor * diffuseColour * 0.7;
      vec3 sun = sunColor * diffuseColour * diffuse * 1.2 * shadow;
      vec3 trans = sunColor * tipColour * translucency * shadow;
      vec3 specular = sunColor * spec * shadow;

      vec3 color = (ambient + sun + trans + specular) * ao;

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  // Sun direction matches lighting.js: position (5, 4, 6) normalized
  const sunDir = new THREE.Vector3(5, 4, 6).normalize();

  const mat = new THREE.ShaderMaterial({
    lights: true,
    uniforms: {
      ...THREE.UniformsLib.lights,
      ...wind.uniforms,
      sunDirection: { value: sunDir },
      sunColor: { value: new THREE.Color(1.0, 0.95, 0.85) },
      ambientColor: { value: new THREE.Color(0.6, 0.65, 0.8) },
    },
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
  });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.receiveShadow = true;
    mesh.userData.ignoreRaycast = true;

    this.mesh = mesh;
    this._geometry = geo;
    this._material = mat;
    this._active = true;
  }

  activate(scene) {
    if (!this._active && this.mesh && scene && !scene.children.includes(this.mesh)) {
      scene.add(this.mesh);
      this._active = true;
    } else if (!this._active && this.mesh && scene) {
      this.mesh.visible = true;
      this._active = true;
    }
  }

  deactivate() {
    if (this.mesh) {
      this.mesh.visible = false;
      this._active = false;
    }
  }

}
