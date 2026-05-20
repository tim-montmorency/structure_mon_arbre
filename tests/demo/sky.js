import * as THREE from "three";

export function createSky(scene) {
  const vertexShader = `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 uSkyColor;
    uniform vec3 uHorizonColor;
    uniform vec3 uGroundColor;
    uniform vec3 uSunDirection;
    uniform float uCloudCoverage;
    uniform float uCloudDensity;
    uniform float uCloudScale;
    uniform float uTime;

    varying vec3 vWorldPosition;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                         -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
             + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                               dot(x12.zw,x12.zw)), 0.0);
      m = m * m;
      m = m * m;
      vec3 x_ = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x_) - 0.5;
      vec3 ox = floor(x_ + 0.5);
      vec3 a0 = x_ - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x = a0.x * x0.x + h.x * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      for (int i = 0; i < 5; i++) {
        value += amplitude * snoise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
      }
      return value;
    }

    void main() {
      vec3 dir = normalize(vWorldPosition);
      float y = dir.y;

      // Ciel gradient
      vec3 sky = mix(uHorizonColor, uSkyColor, smoothstep(0.0, 0.4, y));
      sky = mix(uGroundColor, sky, smoothstep(-0.08, 0.02, y));

      // Soleil
      float sunDot = max(dot(dir, normalize(uSunDirection)), 0.0);
      vec3 sunGlow = vec3(1.0, 0.95, 0.8) * pow(sunDot, 256.0) * 2.0;
      vec3 sunHalo = vec3(1.0, 0.9, 0.7) * pow(sunDot, 8.0) * 0.3;

      // Nuages
      vec3 clouds = vec3(0.0);
      if (y > 0.0) {
        vec2 uv = dir.xz / (y + 0.1) * uCloudScale * 0.01;
        uv += uTime * 0.005;

        float noise = fbm(uv * 3.0);
        float coverage = 1.0 - uCloudCoverage * 0.01;
        float cloudShape = smoothstep(coverage - 0.1, coverage + 0.2, noise * 0.5 + 0.5);
        cloudShape *= uCloudDensity * 0.01;

        vec3 cloudColor = mix(vec3(0.8, 0.85, 0.9), vec3(1.0), sunDot * 0.5 + 0.5);
        clouds = cloudColor * cloudShape * smoothstep(0.0, 0.15, y);
      }

      gl_FragColor = vec4(sky + sunGlow + sunHalo + clouds, 1.0);
    }
  `;

  const skyMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uSkyColor: { value: new THREE.Color(0.48, 0.68, 0.84) },
      uHorizonColor: { value: new THREE.Color(0.76, 0.82, 0.94) },
      uGroundColor: { value: new THREE.Color(0.4, 0.55, 0.72) },
      uSunDirection: { value: new THREE.Vector3(0.5, 0.5, 0.3) },
      uCloudCoverage: { value: 50.0 },
      uCloudDensity: { value: 50.0 },
      uCloudScale: { value: 30.0 },
      uTime: { value: 0.0 },
    },
    side: THREE.BackSide,
    depthWrite: false,
  });

  const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 32), skyMaterial);
  skyMesh.userData.ignoreRaycast = true;
  scene.add(skyMesh);

  return skyMaterial;
}
