import * as THREE from "three";

/**
 * Crée un groupe de brins d'herbe animés par le vent, avec des zones de terre nue (dirt
 * patches) pour plus de réalisme. Utilise une géométrie instanciée pour des performances
 * optimales, et un shader personnalisé pour l'animation du vent et l'éclairage.
 */
export class Grass {
  constructor(wind, opts = {}) {
    const BLADE_COUNT = opts.count ?? 80000;
    const RADIUS = opts.radius ?? 4.0;
    const BLADE_HEIGHT = opts.bladeHeight ?? 0.15;
    const BLADE_HEIGHT_VAR = opts.bladeHeightVariation ?? 0.08;
    const BLADE_WIDTH = opts.bladeWidth ?? 0.04;
    const NOISE_SCALE = opts.noiseScale ?? 0.67;
    const PATCHINESS = opts.patchiness ?? 0.92; // 0 = tout terre, 1 = toute herbe

    // Un offset aléatoire pour les échantillons de bruit, afin que chaque pastille ait une répartition différente des zones d'herbe/terre
    const noiseOffsetX = Math.random() * 1000;
    const noiseOffsetZ = Math.random() * 1000;

    // Une fonction de hash rapide pour générer du bruit à partir de coordonnées, utilisée pour les zones d'herbe/terre et la variation des brins
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

    // Une fonction de bruit à plusieurs octaves (fractal brownian motion) pour des motifs plus intéressants
    function fbmNoise(x, y) {
      return smoothNoise(x, y) * 0.6 + smoothNoise(x * 2.3 + 5.2, y * 2.3 + 1.3) * 0.3 + smoothNoise(x * 5.1 + 2.8, y * 5.1 + 7.9) * 0.1;
    }

    function isDirt(px, pz) {
      const n = fbmNoise((px + noiseOffsetX) * NOISE_SCALE, (pz + noiseOffsetZ) * NOISE_SCALE);
      return n < 1.0 - PATCHINESS;
    }

    // --- Modèle de brin d'herbe : 7 rangées de paires + 1 pointe = 15 sommets ---
    const ROWS = 7;
    const templatePos = [];
    const templateH = [];
    const templateIdx = [];

    for (let i = 0; i < ROWS; i++) {
      const t = i / ROWS;
      const w = 1.0 - t * 0.92; // taille du brin, plus fin vers le haut
      templatePos.push(-0.5 * w, t, 0.0); // gauche
      templatePos.push(0.5 * w, t, 0.0); // droite
      templateH.push(t, t);
    }
    // Pointe du brin
    templatePos.push(0.0, 1.0, 0.0);
    templateH.push(1.0);

    // Indices pour les triangles : deux par paire de rangées, plus un pour la pointe
    for (let i = 0; i < ROWS - 1; i++) {
      const b = i * 2;
      templateIdx.push(b, b + 1, b + 2);
      templateIdx.push(b + 2, b + 1, b + 3);
    }
    // Dernière paire -> pointe
    const last = (ROWS - 1) * 2;
    templateIdx.push(last, last + 1, ROWS * 2);

    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(templatePos), 3));
    geo.setAttribute("aHeightPercent", new THREE.BufferAttribute(new Float32Array(templateH), 1));
    geo.setIndex(templateIdx);

    // --- Attributs par instance ---
    const offsets = new Float32Array(BLADE_COUNT * 2);
    const bladeData = new Float32Array(BLADE_COUNT * 4); // hauteur, largeur, yaw, hash

    let placed = 0;
    for (let attempt = 0; placed < BLADE_COUNT && attempt < BLADE_COUNT * 3; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const r = RADIUS * Math.sqrt(Math.random());
      const px = Math.cos(angle) * r;
      const pz = Math.sin(angle) * r;

      // Vérifier si cette position doit être de l'herbe ou de la terre, en utilisant le bruit procédural
      if (isDirt(px, pz)) continue;

      offsets[placed * 2] = px;
      offsets[placed * 2 + 1] = pz;
      bladeData[placed * 4] = BLADE_HEIGHT + Math.random() * BLADE_HEIGHT_VAR;
      bladeData[placed * 4 + 1] = BLADE_WIDTH * (0.6 + Math.random() * 0.8);
      bladeData[placed * 4 + 2] = Math.random() * Math.PI * 2; // yaw
      bladeData[placed * 4 + 3] = Math.random(); // hash
      placed++;
    }

    // Si on n'a pas réussi à placer tous les brins (à cause des zones de terre), on ajuste le compte dans la géométrie
    geo.instanceCount = placed;

    geo.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offsets, 2));
    geo.setAttribute("aBladeData", new THREE.InstancedBufferAttribute(bladeData, 4));

    // --- Vertex shader ---
    const vertexShader = /* glsl */ `
    attribute vec2 aOffset;
    attribute vec4 aBladeData; // hauteur, largeur, yaw, hash
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

    // Bruit de gradient 2D -> float dans [-1, 1]
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

      // Position de base du brin avant toute animation : appliquer la largeur, la hauteur, et la rotation de yaw
      vec3 pos = position;
      pos.x *= bladeWidth;
      pos.y *= bladeHeight;

      // Appliquer la rotation de yaw autour de l'axe Y pour orienter le brin dans la direction souhaitée
      float cy = cos(yaw);
      float sy = sin(yaw);
      vec3 rotated = vec3(
        pos.x * cy - pos.z * sy,
        pos.y,
        pos.x * sy + pos.z * cy
      );

      // --- Courbure naturelle ---
      float curveAmount = 0.15 + hash * 0.2;

      // Échantillonner le bruit en utilisant le temps + la position dans le monde
      float noiseSample = noise12(vec2(time * 0.35) + grassBladeWorldPos.xz);
      // Ajouter le bruit animé à la courbure de l'herbe
      curveAmount += noiseSample * 0.1;

      // --- Direction du vent à partir du bruit ---
      // Échantillonner le bruit puis le remapper dans la plage [0, 2PI]
      float windDir = noise12(grassBladeWorldPos.xz * 0.05 + 0.05 * time);
      windDir = remap(windDir, -1.0, 1.0, 0.0, PI * 2.0);

      // --- Intensité du vent à partir du bruit ---
      // Un autre échantillon de bruit pour la force du vent
      float windNoiseSample = noise12(grassBladeWorldPos.xz * 0.25 + time);
      // Essayer de le façonner un peu avec easeIn(), c'est assez arbitraire
      float windLeanAngle = remap(windNoiseSample, -1.0, 1.0, 0.25, 1.0);
      windLeanAngle = easeIn(windLeanAngle, 2.0) * 1.25;

      // --- Appliquer la courbure + le vent (espace monde, après la rotation de yaw) ---
      float bendFactor = easeIn(h, 2.0);

      // Inclinaison naturelle
      float naturalDir = yaw + 1.5;
      rotated.x += cos(naturalDir) * curveAmount * bendFactor * bladeHeight;
      rotated.z += sin(naturalDir) * curveAmount * bendFactor * bladeHeight;

      // Inclinaison due au vent
      rotated.x += cos(windDir) * windLeanAngle * bendFactor * bladeHeight * 0.4;
      rotated.z += sin(windDir) * windLeanAngle * bendFactor * bladeHeight * 0.4;

      // Position finale dans le monde (0.05 = surface du sol)
      vec3 worldPos = rotated + vec3(aOffset.x, 0.05, aOffset.y);

      // Approximation de la normale du brin (orientée vers l'extérieur de la surface du brin)
      vec3 bladeForward = vec3(-sy, 0.0, cy); // perpendiculaire à yaw
      vec3 bladeUp = vec3(0.0, 1.0, 0.0);
      vec3 bladeNormal = normalize(mix(bladeForward, bladeUp, 0.5));
      vWorldNormal = normalize((modelMatrix * vec4(bladeNormal, 0.0)).xyz);
      vWorldPos = (modelMatrix * vec4(worldPos, 1.0)).xyz;

      // Requis par les chunks d'ombre de Three.js : normale en espace vue + position dans le monde
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

      // Couleur : base vert foncé, pointe vert jaunâtre
      vec3 baseColour = vec3(0.04, 0.18, 0.02);
      vec3 tipColour  = vec3(0.35, 0.52, 0.12);
      // Dégradé de la base à la pointe, contrôlé par la fonction de mise en forme
      vec3 diffuseColour = mix(baseColour, tipColour, easeIn(h, 4.0));

      // Occlusion ambiante
      float density = 0.8;
      float aoForDensity = mix(1.0, 0.25, density);
      float ao = mix(aoForDensity, 1.0, easeIn(h, 2.0));

      // --- Éclairage ---
      vec3 N = normalize(vWorldNormal);
      vec3 L = normalize(sunDirection);
      vec3 V = normalize(cameraPosition - vWorldPos);
      vec3 H = normalize(L + V);

      // Ombre (intégrée à Three.js)
      float shadow = getShadowMask();

      // Diffuse (éclairage enveloppé pour un rendu plus doux)
      float NdotL = dot(N, L);
      float diffuse = max(0.0, NdotL * 0.5 + 0.5); // half-lambert

      // Translucence : lumière traversant les brins par l'arrière
      float translucency = max(0.0, dot(-N, L)) * 0.5 * easeIn(h, 2.0);

      // Spéculaire
      float spec = pow(max(0.0, dot(N, H)), 24.0) * 0.2 * easeIn(h, 2.0);

      // Combinaison — l'ombre affecte les contributions du soleil
      vec3 ambient = ambientColor * diffuseColour * 0.7;
      vec3 sun = sunColor * diffuseColour * diffuse * 1.2 * shadow;
      vec3 trans = sunColor * tipColour * translucency * shadow;
      vec3 specular = sunColor * spec * shadow;

      vec3 color = (ambient + sun + trans + specular) * ao;

      gl_FragColor = vec4(color, 1.0);
    }
  `;

    // Direction du soleil correspond à lighting.js : position (5, 4, 6) normalisée
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
