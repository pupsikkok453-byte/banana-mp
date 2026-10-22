// ============================================================================
// BANANA INDUSTRIES — GLOBAL PATCH v90 (UNCUT MASTER BUILD)
// Полное объединение всех систем без единого сокращения:
// • 100% механик, костюмов, фраз и Toast-уведомлений из game-patch v53
// • 3D Zipline-Гарпун Хохлоркови (2250м, x5) с покадровой тягой к крышам и стенам
// • Монолитный 3D Ледяной Куб Егорбанана [C] + Раскол Льда (x2) + Маскировка 15с
// • Prototype 2009: Suit Morphing, Wall-Run по нормалям, Mantle Vault, 3D-физика машин
// • PBR/SSS/Cel-Shaded шейдер createPrototypeShader + улучшенный пост-процессинг
// • Полная Сюжетная Кампания из 9 Глав по комиксам (Части V, VI, XI и XII):
//   Orange Sentinels, Виноградные Пауки, Грейпстасик на гусеницах, Био-Монстр Грейпстасик,
//   Жиригорь (Истинный Жир), Союзный отряд Мультифрукта и Протокол «Титан Мультифрукта»
// ============================================================================
(function () {
  'use strict';
  console.log("🍌 [PATCH v90 MASTER] Загружен полный несокращённый патч: Гарпун 2250м, 3D Крио-Куб, 5 героев и 9 глав Сюжета!");

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 0. ОБНОВЛЕННЫЙ ШЕЙДЕР createPrototypeShader (SSS + ЦЕДРА + БИО-ВОЛОКНА)
  // ═══════════════════════════════════════════════════════════════════════════
  const PROTO_VERTEX_SHADER = `
    varying vec3 vNormal;
    varying vec3 vViewPos;
    varying vec2 vUv;
    varying vec3 vWorldPos;
    void main(){
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      vec4 mvPos = viewMatrix * wp;
      vViewPos = -mvPos.xyz;
      gl_Position = projectionMatrix * mvPos;
    }
  `;

  const PROTO_FRAGMENT_SHADER = `
    uniform vec3 uCol1;
    uniform vec3 uCol2;
    uniform vec3 uRim;
    uniform vec3 uLightDir;
    uniform vec3 uLightCol;
    uniform vec3 uFillCol;
    uniform int uPattern;
    uniform float uTime;
    varying vec3 vNormal;
    varying vec3 vViewPos;
    varying vec2 vUv;
    varying vec3 vWorldPos;

    float hash(vec2 p){
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    float fbm(vec2 p){
      float v = 0.0, a = 0.5;
      for(int i = 0; i < 4; i++){
        v += a * noise(p);
        p *= 2.04;
        a *= 0.5;
      }
      return v;
    }

    void main(){
      vec3 N = normalize(vNormal);
      vec3 V = normalize(vViewPos);
      vec3 baseCol = uCol1;
      float metal = 0.12;
      float roughness = 0.46;
      float specPow = 44.0;
      float sssWeight = 0.32;
      vec3 emisCol = vec3(0.0);

      // Двухуровневые процедурные нормали цедры и органических био-волокон
      vec2 peelUv = vWorldPos.xz * 5.5 + vWorldPos.y * 2.2 + vUv * 12.0;
      float eps = 0.04;
      float hCenter = noise(peelUv);
      float nx = (noise(peelUv + vec2(eps, 0.0)) - hCenter) / eps;
      float nz = (noise(peelUv + vec2(0.0, eps)) - hCenter) / eps;
      float poreNoise = noise(vUv * 55.0 + vWorldPos.xy * 4.0);
      float fiberWave = sin(vUv.y * 40.0 + fbm(vUv * 8.0) * 6.0);
      float bumpScale = (uPattern == 1 || uPattern == 3 || uPattern == 4 || uPattern == 10) ? 0.034 : 0.015;
      vec3 Nt = normalize(N + vec3(nx + fiberWave * 0.15, (poreNoise - 0.5) * 0.3, nz) * bumpScale);

      if(uPattern == 1){
        vec2 g = fract(vUv * 14.0) - 0.5;
        float d = length(g);
        bool rz = (abs(vUv.x - 0.5) > 0.20) || (vUv.y > 0.65);
        vec3 bc = rz ? uCol2 : uCol1;
        float pulse = 0.5 + 0.5 * sin(vUv.y * 18.0 - uTime * 7.5 + vUv.x * 8.0);
        baseCol = d < 0.42 ? bc * (1.35 - d * 1.1) : mix(vec3(0.02, 0.04, 0.08), uRim, pulse * 0.45);
        float vein = smoothstep(0.036, 0.0, abs(abs(vUv.x - 0.5) - 0.20 - sin(vUv.y * 12.0 + uTime * 4.5) * 0.025));
        float bioFlash = smoothstep(0.86, 1.0, sin(vUv.y * 26.0 - uTime * 11.0 + fbm(vUv * 6.0) * 5.0));
        baseCol = mix(baseCol, vec3(0.95, 0.12, 0.42), vein * 0.78);
        emisCol = vec3(0.95, 0.18, 0.55) * vein * 0.6 + uRim * (pulse * 0.25 + bioFlash * 0.7);
        metal = 0.62; roughness = 0.26; specPow = 80.0; sssWeight = 0.48;
      }
      else if(uPattern == 2){
        vec2 g = fract(vUv * 8.0) - 0.5;
        float p = max(abs(g.x), abs(g.y));
        float seam = smoothstep(0.40, 0.49, p);
        float flow = 0.5 + 0.5 * sin(vWorldPos.y * 4.5 - uTime * 5.5);
        baseCol = mix(uCol1 * (1.25 - p * 0.7), mix(uCol2, uRim * 0.8, flow * 0.5), seam);
        emisCol = uRim * seam * flow * 0.38;
        metal = 0.58; roughness = 0.32; specPow = 64.0; sssWeight = 0.30;
      }
      else if(uPattern == 3){
        vec2 g = fract(vUv * 5.0) - 0.5;
        float r = length(g);
        if(r < 0.14) baseCol = vec3(0.95, 1.0, 0.92);
        else if(r < 0.23 && fract(atan(g.y, g.x) * 2.5) < 0.36) baseCol = vec3(0.04, 0.04, 0.04);
        else if(r < 0.44) baseCol = uCol1;
        else baseCol = uCol2;
        metal = 0.05; roughness = 0.40; specPow = 32.0; sssWeight = 0.80;
      }
      else if(uPattern == 4){
        vec2 g = fract(vUv * vec2(3.0, 4.0));
        float edge = (g.x < 0.07 || g.x > 0.93 || g.y < 0.07 || g.y > 0.93) ? 1.0 : 0.0;
        float pores = hash(floor(vUv * 52.0)) * 0.12;
        baseCol = mix(uCol1 - pores, uCol2, edge);
        float wet = smoothstep(0.45, 0.85, noise(vWorldPos.xz * 3.5 + vWorldPos.y * 2.5));
        float fiberPulse = smoothstep(0.91, 1.0, sin(vUv.y * 32.0 + uTime * 6.0 + pores * 12.0));
        emisCol = uRim * fiberPulse * 0.22;
        metal = 0.28; roughness = 0.38 - wet * 0.24; specPow = 64.0; sssWeight = 0.72;
      }
      else if(uPattern == 5){
        vec2 wc = vec2(vWorldPos.x + vWorldPos.z, vWorldPos.y) * 0.28;
        vec2 cell = floor(wc);
        vec2 f = fract(wc);
        bool isP = (f.x < 0.16 || f.x > 0.84);
        bool isL = (f.y < 0.16 || f.y > 0.84);
        if(!isP && !isL && abs(N.y) < 0.2){
          float rnd = hash(cell);
          if(rnd > 0.52){
            vec3 ww = mix(vec3(1.0, 0.85, 0.5), vec3(0.45, 0.9, 1.0), step(0.75, rnd));
            baseCol = (rnd > 0.88) ? uRim : ww * (0.68 + 0.35 * f.y);
            emisCol = baseCol * 0.95;
            metal = 0.4; roughness = 0.12;
          } else {
            baseCol = mix(uCol2 * 0.5, vec3(0.10, 0.18, 0.30), f.y);
            metal = 0.5; roughness = 0.18;
          }
        } else {
          baseCol = isL ? uCol2 * 0.8 : uCol1;
          metal = 0.25; roughness = 0.50;
        }
        sssWeight = 0.0;
      }
      else if(uPattern == 6){
        float grain = (hash(floor(vWorldPos.xz * 7.0)) - 0.5) * 0.04;
        float pf = sin(vWorldPos.x * 0.075) * cos(vWorldPos.z * 0.075) + sin(vWorldPos.x * 0.19 - vWorldPos.z * 0.16) * 0.5;
        bool ip = pf > 0.20;
        vec2 rc = floor(vWorldPos.xz * 0.65);
        vec2 ru = fract(vWorldPos.xz * 0.65) - 0.5;
        float rd = hash(rc);
        float rp = fract(uTime * 1.35 + rd);
        float ring = smoothstep(0.05, 0.0, abs(length(ru) - rp * 0.45)) * (1.0 - rp);
        baseCol = ip ? vec3(0.04, 0.08, 0.13) + vec3(0.16, 0.35, 0.48) * ring : (uCol1 + grain);
        if(ip){
          metal = 0.42; roughness = 0.06; specPow = 120.0;
          emisCol = vec3(0.10, 0.22, 0.35) * (0.15 + ring * 0.25);
        } else {
          metal = 0.06; roughness = 0.60; specPow = 28.0;
        }
        sssWeight = 0.0;
      }
      else if(uPattern == 7){
        vec2 g = fract(vUv * vec2(6.0, 3.0));
        float seam = (g.x < 0.06 || g.x > 0.94 || g.y < 0.06 || g.y > 0.94) ? 1.0 : 0.0;
        float rust = fbm(vUv * 8.0) * 0.28;
        baseCol = mix(uCol1 - rust, uCol2, seam);
        metal = 0.52; roughness = 0.46; specPow = 42.0; sssWeight = 0.18;
      }
      else if(uPattern == 8){
        float v = fbm(vUv * 6.5);
        baseCol = mix(uCol1, uCol2, v * 0.72);
        float bioVein = smoothstep(0.84, 1.0, sin(vUv.x * 20.0 + vUv.y * 20.0 - uTime * 4.0));
        emisCol = uRim * bioVein * 0.22;
        metal = 0.08; roughness = 0.40; specPow = 36.0; sssWeight = 0.70;
      }
      else if(uPattern == 9){
        vec2 g = fract(vUv * vec2(12.0, 12.0));
        float c = (abs(g.x - 0.5) < 0.04 || abs(g.y - 0.5) < 0.04) ? 1.0 : 0.0;
        baseCol = mix(uCol1, uCol2, c);
        metal = 0.68; roughness = 0.28; specPow = 96.0; sssWeight = 0.08;
      }
      else if(uPattern == 10){
        float cr = sin(vUv.x * 22.0 + vUv.y * 11.0 + uTime * 2.4) * 0.5 + 0.5;
        float cr2 = cos(vUv.x * 17.0 - vUv.y * 23.0 - uTime * 3.4) * 0.5 + 0.5;
        float veins = smoothstep(0.80, 1.0, cr) * 0.9 + smoothstep(0.86, 1.0, cr2) * 0.8;
        float emberPulse = 0.65 + 0.35 * sin(uTime * 4.0 + vUv.y * 6.0);
        baseCol = mix(uCol1, uCol2, 0.25 + 0.35 * cr);
        emisCol = mix(vec3(1.0, 0.35, 0.0), vec3(1.0, 0.95, 0.25), cr * cr) * (veins * emberPulse * 1.05);
        metal = 0.35; roughness = 0.40; specPow = 72.0; sssWeight = 0.60;
      }
      else {
        float bioSpark = smoothstep(0.94, 1.0, sin(vUv.y * 24.0 - uTime * 5.0 + noise(vUv * 10.0) * 4.0));
        emisCol = uRim * bioSpark * 0.18;
        sssWeight = 0.55;
      }

      vec3 L1 = normalize(uLightDir);
      vec3 L2 = normalize(vec3(-0.6, 0.38, 0.55));
      float NdotL1 = max(dot(Nt, L1), 0.0);
      float NdotL2 = max(dot(Nt, L2), 0.0);
      float wrapA = 0.45;
      float diffWrap1 = (NdotL1 + wrapA) / (1.0 + wrapA);
      float diffWrap2 = (NdotL2 + wrapA) / (1.0 + wrapA);

      // Комиксная подтяжка светотени + PBR
      float celShade = mix(diffWrap1, smoothstep(0.18, 0.22, diffWrap1) * 0.55 + smoothstep(0.55, 0.62, diffWrap1) * 0.45, 0.28);
      vec3 diffCol = baseCol * (uLightCol * celShade * 0.86 + uFillCol * diffWrap2 * 0.26 + vec3(0.06, 0.07, 0.11));
      diffCol *= (1.0 - metal * 0.78);

      vec3 H1 = normalize(L1 + V);
      vec3 H2 = normalize(L2 + V);
      float NdotH1 = max(dot(Nt, H1), 0.0);
      float NdotH2 = max(dot(Nt, H2), 0.0);
      float NdotV = max(dot(Nt, V), 0.0);
      float fresnel = 0.05 + 0.95 * pow(1.0 - NdotV, 5.0);

      float spec1 = pow(NdotH1, specPow) * (0.26 + 0.65 * metal) * (0.4 + 0.6 * fresnel);
      float spec2 = pow(NdotH2, specPow) * 0.28 * (0.26 + 0.65 * metal) * (0.3 + 0.7 * fresnel);
      vec3 specCol = (uLightCol * spec1 + uFillCol * spec2) * 0.95;

      vec3 R = reflect(-V, Nt);
      vec3 envTop = mix(vec3(0.06, 0.10, 0.18), vec3(0.22, 0.34, 0.50), 0.6);
      vec3 envBot = vec3(0.02, 0.03, 0.05);
      vec3 env = mix(envBot, envTop, smoothstep(-0.3, 0.6, R.y));
      env += vec3(0.22, 0.06, 0.12) * exp(-abs(R.y) * 5.0) * 0.38;
      env *= (0.18 + 0.42 * metal) * (1.0 - roughness * 0.65);

      float rim = pow(1.0 - NdotV, 2.7);
      vec3 rimCol = uRim * rim * 0.34;

      // Subsurface Scattering (SSS) растительной мякоти
      float backLight = pow(clamp(dot(V, -L1 + Nt * 0.45), 0.0, 1.0), 2.2);
      float thicknessSim = 0.45 + 0.55 * (1.0 - NdotV);
      vec3 pulpTint = mix(baseCol, vec3(1.0, 0.58, 0.20), 0.45);
      vec3 sssCol = pulpTint * (backLight * 0.48 + thicknessSim * 0.18) * sssWeight;

      emisCol = min(emisCol, vec3(1.5));
      vec3 lit = diffCol + specCol + env + rimCol + sssCol + emisCol;
      lit = lit / (lit + vec3(0.88));
      gl_FragColor = vec4(lit, 1.0);
    }
  `;

  window.createPrototypeShader = function (c1, c2 = 0x111111, pt = 0, rim = 0x00f2fe) {
    const k = c1 + '|' + c2 + '|' + pt + '|' + rim;
    if (typeof _shaderCache !== 'undefined') {
      const cached = _shaderCache.get(k);
      if (cached) {
        if (!cached._protoV90Upgraded) {
          cached.vertexShader = PROTO_VERTEX_SHADER;
          cached.fragmentShader = PROTO_FRAGMENT_SHADER;
          cached._protoV90Upgraded = true;
          cached.needsUpdate = true;
        }
        return cached;
      }
    }
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uCol1: { value: new THREE.Color(c1) },
        uCol2: { value: new THREE.Color(c2) },
        uRim: { value: new THREE.Color(rim) },
        uLightDir: { value: new THREE.Vector3(0.45, 0.88, 0.42).normalize() },
        uLightCol: { value: new THREE.Color(0xfff4e0) },
        uFillCol: { value: new THREE.Color(0x5a82b8) },
        uPattern: { value: pt },
        uTime: (typeof globalShaderUniforms !== 'undefined' && globalShaderUniforms.uTime)
          ? globalShaderUniforms.uTime
          : { value: 0 }
      },
      vertexShader: PROTO_VERTEX_SHADER,
      fragmentShader: PROTO_FRAGMENT_SHADER
    });
    mat._protoV90Upgraded = true;
    if (typeof _shaderCache !== 'undefined') _shaderCache.set(k, mat);
    if (typeof _cachedShaderSet !== 'undefined') _cachedShaderSet.add(mat);
    return mat;
  };

  function upgradeGraphicsPipeline() {
    if (typeof _shaderCache !== 'undefined') {
      _shaderCache.forEach((mat) => {
        if (mat && mat.isShaderMaterial && !mat._protoV90Upgraded) {
          mat.vertexShader = PROTO_VERTEX_SHADER;
          mat.fragmentShader = PROTO_FRAGMENT_SHADER;
          mat._protoV90Upgraded = true;
          mat.needsUpdate = true;
        }
      });
    }
    if (typeof scene !== 'undefined') {
      scene.traverse((obj) => {
        if (obj.material && obj.material.isShaderMaterial && obj.material.uniforms && obj.material.uniforms.uCol1) {
          if (!obj.material._protoV90Upgraded) {
            obj.material.vertexShader = PROTO_VERTEX_SHADER;
            obj.material.fragmentShader = PROTO_FRAGMENT_SHADER;
            obj.material._protoV90Upgraded = true;
            obj.material.needsUpdate = true;
          }
        }
      });
    }
    if (typeof renderer !== 'undefined') renderer.toneMappingExposure = 1.38;
    if (typeof hemiLight !== 'undefined') {
      hemiLight.intensity = 1.15;
      hemiLight.color.setHex(0x99ddff);
      hemiLight.groundColor.setHex(0x281822);
    }
    if (typeof moonLight !== 'undefined') moonLight.intensity = 1.55;

    if (typeof postQuad !== 'undefined' && postQuad.material) {
      postQuad.material.fragmentShader = `
        uniform sampler2D tDiffuse;
        uniform sampler2D tBloom;
        uniform float uTime, uChroma, uRadialBlur, uBioPulse, uSunset, uRage, uWeather, uWeatherType, uQuality, uBloomStrength;
        varying vec2 vUv;
        vec3 aces(vec3 x){
          float a=2.51, b=0.03, c=2.43, d=0.59, e=0.14;
          return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
        }
        void main(){
          vec2 c = vUv - 0.5;
          float dist = length(c);
          float ca = (uChroma * 0.012 + uRage * 0.005) * dist;
          vec3 col;
          if(ca > 0.001){
            col.r = texture2D(tDiffuse, vUv + c * ca).r;
            col.g = texture2D(tDiffuse, vUv).g;
            col.b = texture2D(tDiffuse, vUv - c * ca).b;
          } else {
            col = texture2D(tDiffuse, vUv).rgb;
          }
          if(uQuality > 0.4){
            vec3 bl = texture2D(tBloom, vUv).rgb;
            col += bl * uBloomStrength * 0.92;
          }
          float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
          col = mix(vec3(luma), col, 1.24);
          col = aces(col * 1.12);
          float vig = smoothstep(0.98, 0.32, dist);
          col *= 0.72 + 0.28 * vig;
          if(uSunset > 0.01) col = mix(col, col * vec3(1.15, 0.92, 0.76), uSunset * 0.35);
          if(uWeatherType > 0.5) col = mix(col, col * vec3(0.92, 0.96, 1.06), uWeather * 0.15);
          if(uRage > 0.01){
            vec3 rt = vec3(1.05, 0.48, 0.12);
            float rv = smoothstep(0.45, 1.0, dist);
            col = mix(col, col * rt * 1.2, rv * uRage * 0.55);
          }
          if(uBioPulse > 0.01){
            float bv = sin(atan(c.y, c.x) * 14.0 + uTime * 6.0) * cos(dist * 20.0 - uTime * 4.0);
            float em = smoothstep(0.40, 0.78, dist);
            col += vec3(1.0, 0.05, 0.45) * max(0.0, bv) * em * uBioPulse * 0.22;
          }
          gl_FragColor = vec4(col, 1.0);
        }
      `;
      postQuad.material.needsUpdate = true;
    }
    if (typeof rebuildHeroMesh === 'function' && typeof player !== 'undefined' && player.mesh) {
      rebuildHeroMesh();
    }
  }
  setTimeout(upgradeGraphicsPipeline, 60);

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 1-4. БАЗОВЫЕ МИРОВЫЕ ФИКСЫ ИЗ v53 (КУСТЫ, НОГИ МОРКОВИ, СОЛНЦЕ/ЛУНА, ХОЛМЫ)
  // ═══════════════════════════════════════════════════════════════════════════
  if (typeof addProp === 'function') {
    const _origAddProp = window.addProp;
    window.addProp = function (x, z, type) {
      if (type === 'bush') return;
      _origAddProp.apply(this, arguments);
    };
  }

  function fixCarrotMeshGround() {
    if (!player || !player.mesh || !player.mesh.userData || !player.mesh.userData.isCarrot) return;
    try {
      player.mesh.position.y = 0;
      player.mesh.updateMatrixWorld(true);
      const bbox = new THREE.Box3().setFromObject(player.mesh);
      const scaleY = (playerGroup && playerGroup.scale.y) || 1;
      if (bbox.min.y < 0.1) {
        player.mesh.position.y += (0.1 - bbox.min.y) / scaleY;
      }
    } catch (e) {}
  }
  setInterval(fixCarrotMeshGround, 500);

  const _origRebuildHeroMesh = window.rebuildHeroMesh;
  window.rebuildHeroMesh = function () {
    if (_origRebuildHeroMesh) _origRebuildHeroMesh.apply(this, arguments);
    setTimeout(fixCarrotMeshGround, 10);
  };

  const _origToggleCarrot = window.toggleCarrotForm;
  window.toggleCarrotForm = function () {
    if (_origToggleCarrot) _origToggleCarrot.apply(this, arguments);
    if (player.character === 'carrot') {
      player.maxHp = (CARROT_FORM === 2) ? 800 : 480;
      player.hp = player.maxHp;
      if (typeof updateHUD === 'function') updateHUD();
    }
    setTimeout(fixCarrotMeshGround, 50);
  };

  if (typeof TimeOfDay !== 'undefined') TimeOfDay.speed = 1 / 90;
  setTimeout(() => {
    if (typeof scene === 'undefined') return;
    scene.traverse((o) => {
      if (o.geometry && o.geometry.type === 'SphereGeometry') {
        const p = o.geometry.parameters;
        if (p && p.radius >= 4000) o.visible = false;
      }
    });
    const sunMoon = new THREE.Mesh(
      new THREE.SphereGeometry(100, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    scene.add(sunMoon);
    setInterval(() => {
      if (typeof TimeOfDay !== 'undefined') {
        const p = TimeOfDay.progress;
        const angle = p * Math.PI * 2 - Math.PI / 2;
        sunMoon.position.set(Math.cos(angle) * 3500, Math.sin(angle) * 3500, -1000);
        if (p < 0.2 || p > 0.8) {
          sunMoon.material.color.setHex(0xc0c0ff);
          sunMoon.scale.setScalar(0.6);
        } else {
          sunMoon.material.color.setHex(0xffee88);
          sunMoon.scale.setScalar(1.0);
        }
      }
    }, 100);
  }, 1000);

  setTimeout(() => {
    if (typeof scene !== 'undefined' && typeof createPrototypeShader === 'function') {
      const hillMat = createPrototypeShader(0x3a5a2a, 0x1a2a0a, 8, 0x88cc44);
      for (let i = 0; i < 20; i++) {
        const x = (Math.random() - 0.5) * 1600;
        const z = (Math.random() - 0.5) * 1600;
        if (Math.abs(x) < 120 && Math.abs(z) < 120) continue;
        const r = 25 + Math.random() * 35;
        const h = 8 + Math.random() * 15;
        const hill = new THREE.Mesh(
          new THREE.SphereGeometry(r, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
          hillMat
        );
        hill.position.set(x, 0, z);
        hill.scale.y = h / r;
        scene.add(hill);
      }
    }
  }, 1500);

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 5. PROTOTYPE SUIT MORPHING (СМЕНА КОСТЮМОВ ЕГОРБАНАНА С БИО-ВОЛНОЙ)
  // ═══════════════════════════════════════════════════════════════════════════
  let _suitMorphTimer = 0;
  const _suitMorphDuration = 0.42;

  function triggerPrototypeSuitMorph(idx) {
    if (typeof player === 'undefined' || !player.pos || typeof scene === 'undefined') return;
    const suit = (typeof SUITS !== 'undefined' && SUITS[idx]) ? SUITS[idx] : { slashColor: 0xff0055 };
    const col = suit.slashColor || 0xff0055;
    const origin = player.pos.clone().add(new THREE.Vector3(0, 2.2, 0));

    if (typeof activeTendrils !== 'undefined' && typeof OrganicTendril3D === 'function') {
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + Math.random() * 0.4;
        const rad = 3.2 + Math.random() * 2.5;
        const endPt = player.pos.clone().add(new THREE.Vector3(Math.cos(ang) * rad, 0.3 + Math.random() * 3.5, Math.sin(ang) * rad));
        if (activeTendrils.length < 12) {
          activeTendrils.push(new OrganicTendril3D(scene, origin.clone(), endPt, col, 0.34, 0.38));
        }
      }
    }
    if (typeof spawnGroundCrackRing === 'function') spawnGroundCrackRing(player.pos, col, 11);
    if (typeof spawnParticles === 'function') spawnParticles(origin, col, 18);
    if (typeof SoundFX !== 'undefined') { SoundFX.whip(); SoundFX.hit(180, 0.22); }
    if (typeof triggerHitstopAndChroma === 'function') triggerHitstopAndChroma(0.04, 0.45, 0.95);
    if (typeof postUniforms !== 'undefined' && postUniforms.uBioPulse) postUniforms.uBioPulse.value = 0.85;

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.group.position.distanceTo(player.pos) < 7.5) {
        const push = e.group.position.clone().sub(player.pos).normalize().multiplyScalar(8);
        e.vel.x += push.x;
        e.vel.z += push.z;
        if (!e.flying) e.vel.y = Math.max(e.vel.y, 7);
      }
    }
    _suitMorphTimer = _suitMorphDuration;
  }

  const _origEquipSuit = window.equipSuit;
  window.equipSuit = function (idx) {
    const prevIdx = player.suitIdx;
    const wasSpecial = PEPPER_MODE || CARROT_MODE || LEMON_MODE || window.__POTATO_MODE;
    if (window.__POTATO_MODE) {
      window.__POTATO_MODE = false;
      player.character = 'banana';
    }
    if (_origEquipSuit) _origEquipSuit.apply(this, arguments);
    if (gameStarted && (prevIdx !== idx || wasSpecial)) {
      triggerPrototypeSuitMorph(idx);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 6. ЛИАНОВЫЙ ГАРПУН ХОХЛОРКОВИ (2250М + АКТИВНАЯ ТЯГА К ЗДАНИЯМ) & КОМБО
  // ═══════════════════════════════════════════════════════════════════════════
  let _newVineCd = 0;
  const VINE_CD = 0.35;
  const HARPOON_MAX_RANGE = 2250; // x5 дальность
  player._vineGrapple = null;
  let _activeVineLineMesh = null;

  function clearActiveVineGrapple() {
    player._vineGrapple = null;
    if (_activeVineLineMesh) {
      if (_activeVineLineMesh.parent) _activeVineLineMesh.parent.remove(_activeVineLineMesh);
      if (_activeVineLineMesh.geometry) _activeVineLineMesh.geometry.dispose();
      if (_activeVineLineMesh.material) _activeVineLineMesh.material.dispose();
      _activeVineLineMesh = null;
    }
  }

  function createOrUpdateVineRope(startPos, endPos) {
    const dist = startPos.distanceTo(endPos);
    if (!_activeVineLineMesh) {
      const geo = new THREE.CylinderGeometry(0.28, 0.36, 1, 8);
      geo.translate(0, 0.5, 0);
      geo.rotateX(Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ color: 0x2ecc71 });
      _activeVineLineMesh = new THREE.Mesh(geo, mat);
      scene.add(_activeVineLineMesh);
    }
    _activeVineLineMesh.position.copy(startPos);
    _activeVineLineMesh.lookAt(endPos);
    _activeVineLineMesh.scale.set(1, 1, Math.max(0.1, dist));
  }

  function findBuildingAtPoint(pt) {
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      if (pt.x >= b.minX - 3 && pt.x <= b.maxX + 3 && pt.z >= b.minZ - 3 && pt.z <= b.maxZ + 3) {
        return b;
      }
    }
    return null;
  }

  function findBestBuildingGrappleTarget() {
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.normalize();

    const origin = player.pos.clone().add(new THREE.Vector3(0, 2.2, 0));
    const camDistToPlayer = camera.position.distanceTo(origin);

    // 1. Точный Raycast из камеры по центру прицела
    const rc = new THREE.Raycaster();
    rc.set(camera.position.clone(), camDir);
    rc.far = HARPOON_MAX_RANGE;
    const camHits = rc.intersectObjects(buildingMeshes, false).filter((h) => h.distance > camDistToPlayer + 1.5 && h.point.y > 1.2);
    if (camHits.length > 0) {
      return { point: camHits[0].point.clone(), dist: origin.distanceTo(camHits[0].point), building: findBuildingAtPoint(camHits[0].point) };
    }

    // 2. Raycast от груди игрока по направлению взгляда
    const lookDir = camDir.clone();
    if (lookDir.y < 0.04) lookDir.y = 0.08;
    lookDir.normalize();
    rc.set(origin, lookDir);
    rc.far = HARPOON_MAX_RANGE;
    const playerHits = rc.intersectObjects(buildingMeshes, false).filter((h) => h.point.y > 1.2);
    if (playerHits.length > 0) {
      return { point: playerHits[0].point.clone(), dist: playerHits[0].distance, building: findBuildingAtPoint(playerHits[0].point) };
    }

    // 3. Умный конусный авто-захват карнизов и крыш зданий в направлении взгляда (до 2250м)
    let bestB = null;
    let bestScore = Infinity;
    let bestPt = null;
    let bestD = Infinity;

    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      if (!b || b.topY < 8) continue;
      const approxDistXZ = Math.hypot(b.x - origin.x, b.z - origin.z);
      if (approxDistXZ > HARPOON_MAX_RANGE || approxDistXZ < 6) continue;

      const rayYAtDist = origin.y + camDir.y * approxDistXZ;
      const targetY = THREE.MathUtils.clamp(rayYAtDist, Math.min(12, b.topY * 0.65), b.topY);
      const clampedX = THREE.MathUtils.clamp(origin.x, b.minX, b.maxX);
      const clampedZ = THREE.MathUtils.clamp(origin.z, b.minZ, b.maxZ);
      const candidatePt = new THREE.Vector3(clampedX, targetY, clampedZ);

      const toCand = candidatePt.clone().sub(origin);
      const d = toCand.length();
      if (d > HARPOON_MAX_RANGE || d < 5) continue;

      const dot = toCand.normalize().dot(camDir);
      if (dot < 0.72) continue;

      const anglePenalty = (1 - dot) * 800;
      const score = d * 0.35 + anglePenalty;
      if (score < bestScore) {
        bestScore = score;
        bestB = b;
        bestPt = candidatePt;
        bestD = d;
      }
    }

    if (bestPt) {
      return { point: bestPt, dist: bestD, building: bestB };
    }
    return null;
  }

  window.carrotVineHarpoon = function () {
    if (!CARROT_MODE || CARROT_FORM !== 1 || player.isDead) return;
    if (_newVineCd > 0) {
      if (typeof spawnComicPop === 'function') {
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '*ГАРПУН КД ' + _newVineCd.toFixed(1) + 'с*', '#2ecc71');
      }
      return;
    }

    const origin = player.pos.clone().add(new THREE.Vector3(0, 2.2, 0));
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.normalize();
    const fwdFlat = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw)).normalize();

    const buildTarget = findBestBuildingGrappleTarget();
    const buildingDist = buildTarget ? buildTarget.dist : Infinity;

    let bestEnemy = null;
    let bestEnemyDist = HARPOON_MAX_RANGE;
    for (let i = 0; i < enemies.length; i++) {
      const en = enemies[i];
      const enCenter = en.group.position.clone().add(new THREE.Vector3(0, 2, 0));
      const toE = enCenter.sub(origin);
      const dist = toE.length();
      if (dist > HARPOON_MAX_RANGE) continue;
      const dot3D = toE.clone().normalize().dot(camDir);
      const dotFlat = toE.clone().normalize().dot(fwdFlat);
      if (dot3D < 0.82 && dotFlat < 0.85) continue;
      if (dist < bestEnemyDist) {
        bestEnemyDist = dist;
        bestEnemy = en;
      }
    }

    // 1. СКОРОСТНОЕ ПРИТЯГИВАНИЕ К ЗДАНИЮ ИЛИ КРЫШЕ
    if (buildTarget && (!bestEnemy || buildingDist < bestEnemyDist + 10 || camDir.y > 0.12)) {
      _newVineCd = VINE_CD;
      clearActiveVineGrapple();

      const hp = buildTarget.point.clone();
      const distB = buildTarget.dist;

      if (activeTendrils.length < 10) {
        activeTendrils.push(new OrganicTendril3D(scene, origin.clone(), hp.clone(), 0x2ecc71, 0.45, 0.55));
        activeTendrils.push(new OrganicTendril3D(scene, origin.clone(), hp.clone(), 0xadff2f, 0.28, 0.55));
      }
      createOrUpdateVineRope(origin, hp);

      SoundFX.whip();
      SoundFX.swing(540);
      spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), `🌿 ЛИАНОВЫЙ ТРОС (${Math.round(distB)}М)!`, '#2ecc71');

      const pullSpeed = Math.min(520, Math.max(360, distB * 2.2));
      player._vineGrapple = {
        type: 'building',
        targetPoint: hp,
        building: buildTarget.building,
        speed: pullSpeed,
        elapsed: 0,
        maxDuration: Math.max(0.6, (distB / pullSpeed) + 0.35)
      };

      player.isGrounded = false;
      player.isWallRunning = false;
      player.isBulletdropping = false;
      player.dodgeIframes = 0.75;
      postUniforms.uRadialBlur.value = 1.35;
      return;
    }

    // 2. ПРИТЯГИВАНИЕ ВРАГА ИЛИ ПОЛЁТ К БОССУ
    if (bestEnemy) {
      _newVineCd = VINE_CD;
      clearActiveVineGrapple();

      const isElite = (
        bestEnemy._isBoss || bestEnemy._isStoryConstruct ||
        bestEnemy.type === 'titan' || bestEnemy.type === 'tank' ||
        bestEnemy.type === 'lemon' || bestEnemy.type === 'valkyrie' ||
        bestEnemy.type === 'necromancer' || bestEnemy.type === 'heli' ||
        bestEnemy.type === 'shield' || bestEnemy.type === 'sniper'
      );
      const tp = bestEnemy.group.position.clone().add(new THREE.Vector3(0, 2, 0));
      if (activeTendrils.length < 10) {
        activeTendrils.push(new OrganicTendril3D(scene, origin.clone(), tp.clone(), 0x2ecc71, 0.48, 0.55));
      }
      createOrUpdateVineRope(origin, tp);
      SoundFX.whip();
      triggerHitstopAndChroma(0.05, 0.4, 0.9);

      if (isElite || bestEnemyDist > 55) {
        spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), `🌿 НА ТАРАН (${Math.round(bestEnemyDist)}М)!`, '#ff2200');
        const pullSpeed = Math.min(500, Math.max(360, bestEnemyDist * 2.2));
        player._vineGrapple = {
          type: 'enemy_dash',
          targetEnemy: bestEnemy,
          targetPoint: tp,
          speed: pullSpeed,
          elapsed: 0,
          maxDuration: 1.5
        };
        player.isGrounded = false;
        player.dodgeIframes = 0.85;
        postUniforms.uRadialBlur.value = 1.4;
      } else {
        spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), '*ИДИ СЮДА!*', '#2ecc71');
        bestEnemy._rooted = 1.2;
        player._vineGrapple = {
          type: 'pull_enemy',
          targetEnemy: bestEnemy,
          targetPoint: tp,
          speed: 280,
          elapsed: 0,
          maxDuration: 0.28
        };
      }
      return;
    }

    // 3. ЕСЛИ ВПЕРЕДИ ЧИСТОЕ ПОЛЕ/НЕБО — СКОРОСТНОЙ БРОСОК ВПЕРЁД ПО ВЗГЛЯДУ
    _newVineCd = VINE_CD;
    clearActiveVineGrapple();
    const launchDir = camDir.clone();
    if (launchDir.y < 0.08) launchDir.y = 0.14;
    launchDir.normalize();
    const anchorPt = origin.clone().addScaledVector(launchDir, 140);
    if (activeTendrils.length < 10) {
      activeTendrils.push(new OrganicTendril3D(scene, origin.clone(), anchorPt, 0x2ecc71, 0.42, 0.45));
    }
    createOrUpdateVineRope(origin, anchorPt);
    SoundFX.swing(500);
    spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), '*СКОРОСТНОЙ РЫВОК ЛОЗОЙ!*', '#2ecc71');
    player._vineGrapple = {
      type: 'sky_zip',
      targetPoint: anchorPt,
      speed: 360,
      elapsed: 0,
      maxDuration: 0.38
    };
    player.isGrounded = false;
    player.dodgeIframes = 0.5;
    postUniforms.uRadialBlur.value = 1.2;
  };

  window.addEventListener('mousedown', function (e) {
    if (e.button !== 2) return;
    if (typeof player === 'undefined' || player.isDead) return;
    if (!CARROT_MODE || CARROT_FORM !== 1) return;
    if (typeof gameStarted !== 'undefined' && !gameStarted) return;
    if (typeof isLabOpen !== 'undefined' && isLabOpen) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    window.carrotVineHarpoon();
  }, true);
  setInterval(() => { if (_newVineCd > 0) _newVineCd = Math.max(0, _newVineCd - 0.05); }, 50);

  // Увеличение радиуса комбо-ударов и опутывания Хохлоркови
  const _origCarrotPrimary = window.carrotPrimaryAttack;
  window.carrotPrimaryAttack = function () {
    if (_origCarrotPrimary) _origCarrotPrimary.apply(this, arguments);
    if (!CARROT_MODE || player.isDead) return;
    const fwd = new THREE.Vector3(-Math.sin(player.facingYaw), 0, -Math.cos(player.facingYaw));
    const st = carrotStats();
    const extraRange = CARROT_FORM === 2 ? 22 : 15.5;
    const chest = player.pos.clone().add(new THREE.Vector3(0, 2.2, 0));
    if (activeTendrils.length < 10) {
      activeTendrils.push(new OrganicTendril3D(scene, chest, chest.clone().addScaledVector(fwd, extraRange), 0x2ecc71, 0.34, 0.24));
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const toE = e.group.position.clone().sub(player.pos);
      const d = toE.length();
      if (d > 5.5 && d <= extraRange && toE.normalize().dot(fwd) > 0.55) {
        damageEnemy(e, st.dmg * (CARROT_FORM === 2 ? 2.2 : 1.25), fwd.clone().multiplyScalar(5), '*ДЛИННАЯ ЛОЗА!*');
      }
    }
  };

  const origRootBind = window.carrotRootBind;
  window.carrotRootBind = function () {
    if (origRootBind) origRootBind.apply(this, arguments);
    const bindRadius = CARROT_FORM === 2 ? 52 : 45;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.group.position.distanceTo(player.pos) < bindRadius) {
        e._rooted = 4.5;
        if (e.flying) {
          e.flying = false;
          e.group.position.y = 0;
          e.vel.y = 0;
          if (typeof spawnComicPop === 'function') {
            spawnComicPop(e.group.position.clone().add(new THREE.Vector3(0, 2, 0)), 'СБИТ КОРНЯМИ!', '#2ecc71');
          }
        }
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 7. ГЛАВНЫЙ ХУК ХОРЕОГРАФИИ, ПАРКУРА PROTOTYPE (MANTLE VAULT / EJECT) И ZIPLINE
  // ═══════════════════════════════════════════════════════════════════════════
  player._wallNormal = new THREE.Vector3(0, 0, 1);
  player._currentWallBuilding = null;
  player._mantleCooldown = 0;

  if (typeof updatePlayerChoreographyAndCamera === 'function') {
    const _origChoreo = window.updatePlayerChoreographyAndCamera;
    window.updatePlayerChoreographyAndCamera = function (dt, now) {
      const isFrozen = window.__MP && window.__MP._myRootedUntil > now;
      const savedX = player.pos.x;
      const savedZ = player.pos.z;
      const preY = player.pos.y;

      // 1. Обработка активного Лианового Гарпуна (Zipline) без затухания 0.85
      const vg = player._vineGrapple;
      if (vg && CARROT_MODE && !player.isDead) {
        vg.elapsed += dt;
        const handOrigin = player.pos.clone().add(new THREE.Vector3(0, 2.1, 0));

        if (vg.type === 'pull_enemy') {
          const en = vg.targetEnemy;
          if (!en || !en.group || !en.group.parent || vg.elapsed >= vg.maxDuration) {
            if (en && en.group && en.group.parent) {
              const st = carrotStats();
              const fwd2 = new THREE.Vector3(-Math.sin(player.facingYaw), 0, -Math.cos(player.facingYaw));
              en.group.position.copy(player.pos).addScaledVector(fwd2, 2.4);
              spawnSlashArc(player.pos.clone().add(new THREE.Vector3(0, 2, 0)), player.facingYaw, 0, 0x2ecc71, 9.5, 0.35);
              damageEnemy(en, st.dmg * 3.8, fwd2.clone().multiplyScalar(10), '*УДАР С РАЗВОРОТА!*');
              spawnParticles(en.group.position.clone().add(new THREE.Vector3(0, 2, 0)), 0xadff2f, 16);
              triggerHitstopAndChroma(0.06, 0.5, 1.0);
            }
            clearActiveVineGrapple();
          } else {
            const frontPos = player.pos.clone().add(new THREE.Vector3(-Math.sin(player.camYaw) * 2.5, 0, -Math.cos(player.camYaw) * 2.5));
            en.group.position.lerp(frontPos, Math.min(1, dt * 18));
            createOrUpdateVineRope(handOrigin, en.group.position.clone().add(new THREE.Vector3(0, 1.8, 0)));
          }
        } else {
          if (vg.type === 'enemy_dash' && vg.targetEnemy && vg.targetEnemy.group && vg.targetEnemy.group.parent) {
            vg.targetPoint.copy(vg.targetEnemy.group.position).add(new THREE.Vector3(0, 1.5, 0));
          }
          const toTarget = vg.targetPoint.clone().sub(player.pos);
          const dist = toTarget.length();
          const dir = toTarget.clone().normalize();

          player.facingYaw = Math.atan2(-dir.x, -dir.z);
          createOrUpdateVineRope(handOrigin, vg.targetPoint);

          if (Math.random() < 0.75 && typeof ParticlePool !== 'undefined') {
            const p = ParticlePool.get(0x2ecc71);
            p.position.copy(player.pos).add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 1.5, (Math.random() - 0.5) * 1.2));
            p.scale.setScalar(0.65);
            scene.add(p);
            ParticlePool.active.push({ mesh: p, vel: new THREE.Vector3(-dir.x * 8, 2, -dir.z * 8), life: 0.35 });
          }

          const stepDist = vg.speed * dt;
          if (dist <= Math.max(4.8, stepDist * 1.2) || vg.elapsed >= vg.maxDuration) {
            if (vg.type === 'building') {
              const b = vg.building || findBuildingAtPoint(vg.targetPoint);
              if (b && vg.targetPoint.y >= b.topY - 4.5) {
                player.pos.set(
                  THREE.MathUtils.clamp(vg.targetPoint.x, b.minX + 1.5, b.maxX - 1.5),
                  b.topY + 0.35,
                  THREE.MathUtils.clamp(vg.targetPoint.z, b.minZ + 1.5, b.maxZ - 1.5)
                );
                player.vel.set(dir.x * 38, 12, dir.z * 38);
                player.isGrounded = false;
                player.airFlipTimer = 0.38;
                spawnGroundCrackRing(player.pos, 0x2ecc71, 7);
                spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 2.5, 0)), '*НА КРЫШЕ!*', '#adff2f');
              } else {
                player.pos.copy(vg.targetPoint).addScaledVector(dir, -1.4);
                player.vel.set(dir.x * 24, 28, dir.z * 24);
                player.isWallRunning = true;
                player.isGrounded = false;
              }
            } else if (vg.type === 'enemy_dash' && vg.targetEnemy && vg.targetEnemy.group && vg.targetEnemy.group.parent) {
              const st = carrotStats();
              player.pos.copy(vg.targetEnemy.group.position).addScaledVector(dir, -2.2);
              player.vel.set(0, 14, 0);
              damageEnemy(vg.targetEnemy, st.dmg * 5.2, dir.clone().multiplyScalar(14), '*СОКРУШИТЕЛЬНЫЙ ТАРАН ЛОЗОЙ!*');
              spawnGroundCrackRing(vg.targetEnemy.group.position, 0x2ecc71, 16);
              spawnParticles(vg.targetPoint, 0x2ecc71, 26);
              triggerHitstopAndChroma(0.10, 0.75, 1.3);
            } else {
              player.vel.set(dir.x * 85, Math.max(18, dir.y * 45), dir.z * 85);
            }
            clearActiveVineGrapple();
          } else {
            player.pos.addScaledVector(dir, stepDist);
            player.vel.set(dir.x * 65, Math.max(8, dir.y * 65), dir.z * 65);
            player.isGrounded = false;
            postUniforms.uRadialBlur.value = 1.25;
          }
        }
      }

      const savedPosDuringGrapple = (player._vineGrapple && player._vineGrapple.type !== 'pull_enemy')
        ? player.pos.clone()
        : null;

      // 2. Скрытие наземных врагов при высоком полете (чтобы не толкали в воздухе)
      const hiddenEnemies = [];
      if (preY > 3) {
        for (let i = 0; i < enemies.length; i++) {
          const en = enemies[i];
          if (en.flying) continue;
          if (Math.abs(en.group.position.y - preY) > 3) {
            hiddenEnemies.push({ en: en, x: en.group.position.x, z: en.group.position.z });
            en.group.position.x = 99999;
            en.group.position.z = 99999;
          }
        }
      }

      _origChoreo.apply(this, arguments);

      for (let i = 0; i < hiddenEnemies.length; i++) {
        const h = hiddenEnemies[i];
        if (h.en.group && h.en.group.position) {
          h.en.group.position.x = h.x;
          h.en.group.position.z = h.z;
        }
      }

      if (savedPosDuringGrapple && player._vineGrapple) {
        player.pos.copy(savedPosDuringGrapple);
        playerGroup.position.copy(player.pos);
        player.isGrounded = false;
      }

      // 3. Бесшовный Wall-Run + автоматический Mantle Vault через карнизы крыш
      if (player._mantleCooldown > 0) player._mantleCooldown -= dt;
      player._currentWallBuilding = null;
      const pad = (CARROT_MODE && CARROT_FORM === 2) ? 2.6 : 1.45;
      const isMovingKeys = keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'] || keys['ArrowUp'];
      const isSprint = keys['ShiftLeft'] || keys['ShiftRight'];

      for (let i = 0; i < buildings.length; i++) {
        const b = buildings[i];
        if (
          player.pos.x > b.minX - pad - 0.45 &&
          player.pos.x < b.maxX + pad + 0.45 &&
          player.pos.z > b.minZ - pad - 0.45 &&
          player.pos.z < b.maxZ + pad + 0.45 &&
          player.pos.y < b.topY + 0.6
        ) {
          const dxMin = Math.abs(player.pos.x - (b.minX - pad));
          const dxMax = Math.abs(player.pos.x - (b.maxX + pad));
          const dzMin = Math.abs(player.pos.z - (b.minZ - pad));
          const dzMax = Math.abs(player.pos.z - (b.maxZ + pad));
          const minEdge = Math.min(dxMin, dxMax, dzMin, dzMax);

          if (minEdge < 0.85 && player.pos.y < b.topY - 0.2) {
            player._currentWallBuilding = b;
            if (minEdge === dxMin) player._wallNormal.set(-1, 0, 0);
            else if (minEdge === dxMax) player._wallNormal.set(1, 0, 0);
            else if (minEdge === dzMin) player._wallNormal.set(0, 0, -1);
            else player._wallNormal.set(0, 0, 1);

            if (
              (player.isWallRunning || (!player.isGrounded && isMovingKeys)) &&
              player.pos.y >= b.topY - 2.9 &&
              player.pos.y <= b.topY + 0.4 &&
              player._mantleCooldown <= 0
            ) {
              player._mantleCooldown = 0.45;
              player.pos.y = b.topY + 0.35;
              player.pos.x -= player._wallNormal.x * 2.2;
              player.pos.z -= player._wallNormal.z * 2.2;
              const fwdVault = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
              player.vel.x = fwdVault.x * 26;
              player.vel.z = fwdVault.z * 26;
              player.vel.y = 9.5;
              player.isWallRunning = false;
              player.isGrounded = false;
              player.airFlipTimer = 0.36;
              if (typeof SoundFX !== 'undefined') SoundFX.swing(380);
              if (typeof spawnComicPop === 'function') {
                spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 2.2, 0)), '*MANTLE VAULT!*', '#00f2fe');
              }
            } else if (player.isWallRunning) {
              const camFwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
              const wallCross = camFwd.x * player._wallNormal.z - camFwd.z * player._wallNormal.x;
              const targetRoll = THREE.MathUtils.clamp(wallCross * 0.28, -0.28, 0.28);
              player.camRoll += (targetRoll - player.camRoll) * 0.22;
              camera.up.set(Math.sin(player.camRoll), Math.cos(player.camRoll), 0).normalize();

              if (isSprint && Math.random() < 0.45 && typeof ParticlePool !== 'undefined') {
                const pCol = PEPPER_MODE ? 0xff4400 : (CARROT_MODE ? 0x2ecc71 : 0x00f2fe);
                const sp = ParticlePool.get(pCol);
                sp.position.copy(player.pos).add(new THREE.Vector3(0, 0.4, 0));
                sp.scale.setScalar(0.5);
                scene.add(sp);
                ParticlePool.active.push({ mesh: sp, vel: new THREE.Vector3(player._wallNormal.x * 4, 2, player._wallNormal.z * 4), life: 0.3 });
              }
            }
            break;
          }
        }
      }

      // Пружинный морфинг масштаба при смене костюма Егорбанана
      if (_suitMorphTimer > 0 && typeof playerGroup !== 'undefined' && !CARROT_MODE) {
        _suitMorphTimer = Math.max(0, _suitMorphTimer - dt);
        const t = 1 - (_suitMorphTimer / _suitMorphDuration);
        const bounce = 1 + Math.sin(t * Math.PI) * 0.22;
        playerGroup.scale.set(bounce, 1 / Math.sqrt(bounce) * bounce, bounce);
        if (_suitMorphTimer <= 0) playerGroup.scale.set(1, 1, 1);
      }

      if (player.pos.y < 0) player.pos.y = 0;

      if (isFrozen) {
        player.pos.x = savedX;
        player.pos.z = savedZ;
        player.vel.x = 0;
        player.vel.z = 0;
        playerGroup.position.copy(player.pos);
      }

      if (player.activeModeF && player.character !== 'banana') {
        player.activeModeF = false;
        if (player.mesh && player.mesh.userData && player.mesh.userData.limeShield) {
          player.mesh.userData.limeShield.visible = false;
        }
      }

      if (player.activeModeF && player.suitIdx === 3 && player.character === 'banana' && !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE && !window.__POTATO_MODE) {
        player.en -= 15 * dt;
        if (player.en <= 0) {
          player.en = 0;
          player.activeModeF = false;
          if (player.mesh && player.mesh.userData.limeShield) {
            player.mesh.userData.limeShield.visible = false;
          }
        }
      }
    };
  }

  // Wall-Eject по нормали стены без застревания
  window.performWallJump = function () {
    if (!player.isWallRunning) return;
    player.wallJumpCount++;
    player.wallJumpTimer = 1.05;
    player.facingYaw = player.camYaw;

    const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
    const wn = player._wallNormal || new THREE.Vector3(0, 0, 1);
    const boost = Math.min(1 + player.wallJumpCount * 0.22, 1.9);

    player.pos.x += wn.x * 1.25;
    player.pos.z += wn.z * 1.25;
    player.vel.x = (fwd.x * 34 + wn.x * 26) * boost;
    player.vel.z = (fwd.z * 34 + wn.z * 26) * boost;
    player.vel.y = 20 + player.wallJumpCount * 3.5;

    player.isWallRunning = false;
    player.isGrounded = false;
    player.airFlipTimer = 0.42;

    if (typeof SoundFX !== 'undefined') SoundFX.swing(290 + player.wallJumpCount * 65);
    if (typeof postUniforms !== 'undefined') postUniforms.uRadialBlur.value = 0.75;
    if (typeof spawnGroundCrackRing === 'function') spawnGroundCrackRing(player.pos, 0x00f2fe, 5.5);
    if (player.wallJumpCount >= 2 && typeof spawnComicPop === 'function') {
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 2, 0)), `*WALL-EJECT x${player.wallJumpCount}!*`, '#fff200');
      player.score += 60 * player.wallJumpCount;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 8. НАСТОЯЩИЙ 3D ЛЕДЯНОЙ МОНОЛИТ ЕГОРБАНАНА НА [C] + МАСКИРОВКА + РАСКОЛ X2
  // ═══════════════════════════════════════════════════════════════════════════
  const CRYO_FREEZE_RADIUS = 24;
  const CRYO_FREEZE_DURATION = 5.5;
  const CRYO_BASE_DMG = 95;
  player._disguiseTimer = 0;
  let _disguiseHoloMesh = null;

  function activateDisguise(duration = 15.0) {
    player._disguiseTimer = duration;
    if (_disguiseHoloMesh && _disguiseHoloMesh.parent) {
      _disguiseHoloMesh.parent.remove(_disguiseHoloMesh);
    }
    _disguiseHoloMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 3.6, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xff8f20, transparent: true, opacity: 0.35, wireframe: true })
    );
    _disguiseHoloMesh.position.y = 1.8;
    playerGroup.add(_disguiseHoloMesh);
  }

  function deactivateDisguise() {
    player._disguiseTimer = 0;
    if (_disguiseHoloMesh && _disguiseHoloMesh.parent) {
      _disguiseHoloMesh.parent.remove(_disguiseHoloMesh);
      _disguiseHoloMesh.geometry.dispose();
      _disguiseHoloMesh.material.dispose();
      _disguiseHoloMesh = null;
    }
  }

  function createSolidIceCubePrison(targetPos, targetRadius, durationSec) {
    const group = new THREE.Group();
    const w = Math.max(2.6, targetRadius * 2.1);
    const h = Math.max(4.4, targetRadius * 3.1);

    const iceOuterMat = new THREE.MeshPhongMaterial({
      color: 0x18c8ff,
      emissive: 0x053858,
      specular: 0xffffff,
      shininess: 120,
      transparent: true,
      opacity: 0.60,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const outerCube = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), iceOuterMat);
    outerCube.position.y = h * 0.5;
    group.add(outerCube);

    const iceInnerMat = new THREE.MeshBasicMaterial({
      color: 0xb8f8ff,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const innerCore = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, h * 0.82, w * 0.78), iceInnerMat);
    innerCore.position.y = h * 0.5;
    innerCore.rotation.y = Math.PI * 0.25;
    group.add(innerCore);

    const edgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(w * 1.01, h * 1.01, w * 1.01));
    const edgesLine = new THREE.LineSegments(
      edgesGeo,
      new THREE.LineBasicMaterial({ color: 0xe0ffff, transparent: true, opacity: 0.95 })
    );
    edgesLine.position.y = h * 0.5;
    group.add(edgesLine);

    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const spikeH = h * (0.45 + (i % 2) * 0.2);
      const spike = new THREE.Mesh(new THREE.ConeGeometry(w * 0.18, spikeH, 5), iceOuterMat);
      spike.position.set(Math.cos(ang) * (w * 0.48), spikeH * 0.45, Math.sin(ang) * (w * 0.48));
      spike.rotation.z = -Math.cos(ang) * 0.28;
      spike.rotation.x = Math.sin(ang) * 0.28;
      group.add(spike);
    }

    const baseFrost = new THREE.Mesh(
      new THREE.RingGeometry(w * 0.3, w * 0.95, 20),
      new THREE.MeshBasicMaterial({ color: 0x88f6ff, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false })
    );
    baseFrost.rotation.x = -Math.PI / 2;
    baseFrost.position.y = 0.08;
    group.add(baseFrost);

    group.position.copy(targetPos);
    scene.add(group);

    group.scale.set(0.2, 0.05, 0.2);
    let growT = 0;
    const growAnim = setInterval(() => {
      growT += 0.16;
      const s = Math.min(1, growT);
      const backOut = 1 + 0.15 * Math.sin(s * Math.PI);
      group.scale.set(s * backOut, s, s * backOut);
      if (growT >= 1) {
        group.scale.set(1, 1, 1);
        clearInterval(growAnim);
      }
    }, 16);

    const cleanup = () => {
      if (!group.parent) return;
      if (typeof spawnParticles === 'function') {
        spawnParticles(group.position.clone().add(new THREE.Vector3(0, h * 0.5, 0)), 0x66f2ff, 18);
      }
      scene.remove(group);
      group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
    };

    const timerId = setTimeout(cleanup, durationSec * 1000);
    return { group, cleanup, timerId };
  }

  window.addEventListener('keydown', function (e) {
    if (e.code !== 'KeyC') return;
    if (typeof player === 'undefined' || player.isDead) return;
    if (player.character !== 'banana') return;
    if (CARROT_MODE || PEPPER_MODE || LEMON_MODE || window.__POTATO_MODE) return;
    if (player.isFlying) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (player._cryoCd > 0) {
      if (typeof spawnComicPop === 'function') {
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), `*❄ КРИО-КУБ КД ${player._cryoCd.toFixed(1)}с*`, '#00f2fe');
      }
      return;
    }
    player._cryoCd = 7.0;
    player.consumeCd = 7.0;

    createSolidIceCubePrison(player.pos.clone(), 1.5, 1.8);
    player.dodgeIframes = Math.max(player.dodgeIframes, 1.2);
    player.en = player.maxEn;
    player.hp = Math.min(player.maxHp, player.hp + 95);
    activateDisguise(15.0);

    const cryoWave = new THREE.Mesh(
      new THREE.RingGeometry(1, CRYO_FREEZE_RADIUS, 48),
      new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
    );
    cryoWave.rotation.x = -Math.PI / 2;
    cryoWave.position.set(player.pos.x, 0.18, player.pos.z);
    scene.add(cryoWave);
    let wt = 0;
    (function animWave() {
      wt += 0.04;
      cryoWave.scale.setScalar(0.2 + wt * 0.9);
      cryoWave.material.opacity = Math.max(0, 0.85 * (1 - wt));
      if (wt < 1) requestAnimationFrame(animWave);
      else { scene.remove(cryoWave); cryoWave.geometry.dispose(); cryoWave.material.dispose(); }
    })();

    const frozenTargets = [];
    for (let i = 0; i < enemies.length; i++) {
      const en = enemies[i];
      if (en.group.position.distanceTo(player.pos) <= CRYO_FREEZE_RADIUS) {
        frozenTargets.push(en);
      }
    }

    for (const en of frozenTargets) {
      if (en._iceCubePrison) {
        clearTimeout(en._iceCubePrison.timerId);
        en._iceCubePrison.cleanup();
      }
      if (en.flying && en.type !== 'valkyrie') {
        en.flying = false;
        en.group.position.y = 0;
      }

      const prison = createSolidIceCubePrison(en.group.position.clone(), en.radius || 1.4, CRYO_FREEZE_DURATION);
      en._iceCubePrison = prison;
      en.frozen = CRYO_FREEZE_DURATION;
      en._rooted = CRYO_FREEZE_DURATION;
      en._frozenLockedPos = en.group.position.clone();
      en._telegraphT = 0;
      en._pendingRanged = null;
      en.meleeAnim = 0;
      en.attackCd = Math.max(en.attackCd || 0, CRYO_FREEZE_DURATION + 0.5);
      en.vel.set(0, 0, 0);
      en._mpMoving = false;

      if (!en._mpId && typeof damageEnemy === 'function') {
        en._suppressShatterOnFreezeInit = true;
        damageEnemy(en, CRYO_BASE_DMG, new THREE.Vector3(), '*❄ ВМЕРЗ В ЛЁД!*');
        en._suppressShatterOnFreezeInit = false;
      }
    }

    for (let i = 0; i < 30; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.random() * CRYO_FREEZE_RADIUS;
      const p = ParticlePool.get(0x88ffff);
      p.position.set(player.pos.x + Math.cos(ang) * rad, 0.5 + Math.random() * 4, player.pos.z + Math.sin(ang) * rad);
      p.scale.setScalar(0.9);
      scene.add(p);
      ParticlePool.active.push({ mesh: p, vel: new THREE.Vector3(0, 4 + Math.random() * 4, 0), life: 1.2 });
    }

    if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'freeze', radius: CRYO_FREEZE_RADIUS });
    if (typeof spawnComicPop === 'function') {
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 5.2, 0)), `❄️ АРКТИЧЕСКИЙ БАЛАНС: ЗАМОРОЖЕНО (${frozenTargets.length})!`, '#00f2fe');
    }
    if (typeof SoundFX !== 'undefined') { SoundFX.devastator(); SoundFX.boom(); }
    if (typeof triggerHitstopAndChroma === 'function') triggerHitstopAndChroma(0.08, 0.65, 1.25);
    updateHUD();
  }, true);

  setInterval(() => {
    if (player._cryoCd > 0) player._cryoCd = Math.max(0, player._cryoCd - 0.1);
    if (player.consumeCd > 0) player.consumeCd = Math.max(0, player.consumeCd - 0.1);
    if (player._disguiseTimer > 0) {
      player._disguiseTimer = Math.max(0, player._disguiseTimer - 0.1);
      if (_disguiseHoloMesh) _disguiseHoloMesh.rotation.y += 0.15;
      if (player._disguiseTimer <= 0) deactivateDisguise();
    }
  }, 100);

  const _origDamageEnemyV90 = window.damageEnemy;
  window.damageEnemy = function (en, dmg, knockVec, popText) {
    if (en && en.frozen > 0 && !en._suppressShatterOnFreezeInit && dmg > 15) {
      dmg *= 2.0;
      popText = '*💎 РАСКОЛ ЛЬДА! x2*';
      if (en._iceCubePrison && en.hp - dmg <= 0) {
        clearTimeout(en._iceCubePrison.timerId);
        en._iceCubePrison.cleanup();
        en._iceCubePrison = null;
      } else if (typeof spawnParticles === 'function') {
        spawnParticles(en.group.position.clone().add(new THREE.Vector3(0, 2, 0)), 0x88ffff, 10);
      }
    }
    const res = _origDamageEnemyV90.call(this, en, dmg, knockVec, popText);
    if (en && en.hp <= 0 && en._iceCubePrison) {
      clearTimeout(en._iceCubePrison.timerId);
      en._iceCubePrison.cleanup();
      en._iceCubePrison = null;
    }
    return res;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 9. ВРАГИ, ТЕЛЕГРАФИРОВАНИЕ, ФАЗА 2 И 3D-ФИЗИКА РАЗЛЕТА МАШИН
  // ═══════════════════════════════════════════════════════════════════════════
  if (typeof updateEnemiesAndVehicles === 'function') {
    const _origUpdateEnemiesV90 = window.updateEnemiesAndVehicles;
    window.updateEnemiesAndVehicles = function (dt, now) {
      for (let i = 0; i < enemies.length; i++) {
        const en = enemies[i];
        if (en.frozen > 0) {
          en.frozen -= dt;
          en._rooted = Math.max(en._rooted || 0, en.frozen);
          en.vel.set(0, 0, 0);
          en._telegraphT = 0;
          en.meleeAnim = 0;
          if (en._frozenLockedPos) en.group.position.copy(en._frozenLockedPos);
          if (en._iceCubePrison && en._iceCubePrison.group) {
            en._iceCubePrison.group.position.copy(en.group.position);
          }
          if (en.frozen <= 0 && en._iceCubePrison) {
            clearTimeout(en._iceCubePrison.timerId);
            en._iceCubePrison.cleanup();
            en._iceCubePrison = null;
          }
        }
      }

      _origUpdateEnemiesV90.apply(this, arguments);

      // Наземные кольца телеграфирования ударов + Аура бешенства (Phase 2 < 50% HP)
      for (let i = 0; i < enemies.length; i++) {
        const en = enemies[i];
        if (!en || !en.group) continue;
        if (en.frozen > 0 && en._frozenLockedPos) {
          en.group.position.copy(en._frozenLockedPos);
        }

        if (en._telegraphT > 0 && en._telegraphMax > 0) {
          if (!en._telegraphRing) {
            const rSize = en.radius ? en.radius * 2.2 : 3.5;
            en._telegraphRing = new THREE.Mesh(
              new THREE.RingGeometry(0.4, rSize, 20),
              new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false })
            );
            en._telegraphRing.rotation.x = -Math.PI / 2;
            en._telegraphRing.position.y = 0.12;
            en.group.add(en._telegraphRing);
          }
          en._telegraphRing.visible = true;
          const prog = 1 - (en._telegraphT / en._telegraphMax);
          en._telegraphRing.scale.setScalar(0.5 + prog * 0.7);
          en._telegraphRing.material.opacity = 0.35 + prog * 0.55;
        } else if (en._telegraphRing) {
          en._telegraphRing.visible = false;
        }

        const isBossOrElite = en._isBoss || en.type === 'titan' || en.type === 'lemon' || en.type === 'valkyrie' || en.type === 'necromancer' || en.type === 'brawler' || en.type === 'tank';
        if (isBossOrElite && en.hp > 0 && en.hp / en.maxHp < 0.5) {
          if (!en._phase2FrenzyInitialized) {
            en._phase2FrenzyInitialized = true;
            en._phase2 = true;
            const auraMesh = new THREE.Mesh(
              new THREE.SphereGeometry(en.radius * 1.35, 10, 10),
              new THREE.MeshBasicMaterial({ color: 0xff0033, transparent: true, opacity: 0.28, wireframe: true })
            );
            auraMesh.position.y = en.type === 'titan' || en.type === 'lemon' ? 8 : 2.2;
            en.group.add(auraMesh);
            en._frenzyAura = auraMesh;
          }
          if (en._frenzyAura) {
            en._frenzyAura.rotation.y += dt * 3.5;
            en._frenzyAura.scale.setScalar(1 + Math.sin(now * 0.012) * 0.12);
          }
        }
      }

      // Баллистика и кувыркание разрушенных автомобилей (destructibleCars)
      if (typeof destructibleCars !== 'undefined') {
        const playerSpeedSq = player.vel.x * player.vel.x + player.vel.z * player.vel.z;
        for (let i = 0; i < destructibleCars.length; i++) {
          const car = destructibleCars[i];
          if (!car || !car.group) continue;
          const distToPlayer = car.group.position.distanceTo(player.pos);
          if (!car.exploded && distToPlayer < 4.2 && (playerSpeedSq > 400 || (CARROT_MODE && CARROT_FORM === 2) || player.durianRam)) {
            if (typeof checkCarDestruction === 'function') checkCarDestruction(player.pos, 5.0);
            const pushDir = car.group.position.clone().sub(player.pos).normalize();
            car.vel.set(pushDir.x * 34, 19, pushDir.z * 34);
            car.angVel = new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 8);
            if (typeof SoundFX !== 'undefined') SoundFX.boom();
          }

          if (car.exploded && (car.vel.lengthSq() > 0.1 || car.group.position.y > 0.05)) {
            car.group.position.addScaledVector(car.vel, dt);
            car.vel.y -= 36 * dt;
            car.vel.x *= 0.96;
            car.vel.z *= 0.96;
            if (!car.angVel) car.angVel = new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 6);
            car.group.rotation.x += car.angVel.x * dt;
            car.group.rotation.y += car.angVel.y * dt;
            car.group.rotation.z += car.angVel.z * dt;

            if (car.vel.lengthSq() > 45) {
              for (let j = enemies.length - 1; j >= 0; j--) {
                const e = enemies[j];
                if (e.group.position.distanceTo(car.group.position) < e.radius + 3.2) {
                  damageEnemy(e, 140, car.vel.clone().normalize().multiplyScalar(8), '*СБИТ МАШИНОЙ!*');
                }
              }
            }

            if (car.group.position.y <= 0) {
              car.group.position.y = 0;
              if (Math.abs(car.vel.y) > 8) {
                car.vel.y = -car.vel.y * 0.35;
                car.angVel.multiplyScalar(0.5);
                if (typeof spawnSparks === 'function') spawnSparks(car.group.position, 6, 0xffaa00);
              } else {
                car.vel.set(0, 0, 0);
                car.angVel.set(0, 0, 0);
              }
            }
          }
        }
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 10. ЩИТ РЕАКТОРА, ШРЕКИЧ ИИ [B], T-СИНТЕЗ, F-СПОСОБНОСТИ, APC И ПЕРЕЦ
  // ═══════════════════════════════════════════════════════════════════════════
  const origDamageToHero = window.applyDamageToHero;
  window.applyDamageToHero = function (dmg) {
    if (player._multifruitTitanActive) {
      dmg = Math.floor(dmg * 0.45);
    }
    if (window.__POTATO_MODE && window.__POTATO_FORM === 1 && player._potatoArmor > 0) {
      dmg = Math.floor(dmg * 0.5);
    }
    if (player.activeModeF && player.suitIdx === 3 && player.character === 'banana' && !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE && !window.__POTATO_MODE) {
      const drain = dmg * 1.5;
      if (player.en >= drain) {
        player.en -= drain;
        if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3.2, 0)), '*ЩИТ БЛОК*', '#00f2fe');
        return;
      } else {
        player.activeModeF = false;
        if (player.mesh && player.mesh.userData.limeShield) {
          player.mesh.userData.limeShield.visible = false;
        }
      }
    }
    if (origDamageToHero) return origDamageToHero.apply(this, arguments);
  };

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && typeof gameStarted !== 'undefined' && gameStarted) {
      document.getElementById('start-screen').style.display = 'flex';
      try { document.exitPointerLock(); } catch (err) {}
    }
    if (e.code === 'KeyB' && typeof player !== 'undefined' && player.character === 'banana' && !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE && !window.__POTATO_MODE) {
      if (typeof Companion !== 'undefined') {
        Companion._disabled = !Companion._disabled;
        if (Companion._disabled) {
          if (Companion.group) Companion.group.visible = false;
          Companion.shootCd = 99999;
          Companion.buffCd = 99999;
          player.companionShield = 0;
          player.companionRegen = 0;
          player.companionDmg = 0;
          if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), 'ДРОН ОТКЛЮЧЕН', '#ff0000');
        } else {
          if (Companion.group) Companion.group.visible = true;
          Companion.shootCd = 0;
          Companion.buffCd = 15;
          if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), 'ДРОН ВКЛЮЧЕН', '#00ff66');
        }
      }
    }
  });

  if (typeof Companion !== 'undefined') {
    const origUpdate = Companion.update;
    Companion.update = function (dt, now) {
      origUpdate.call(this, dt, now);
      if ((this._disabled || window.__POTATO_MODE) && this.group) {
        this.group.visible = false;
        this.shootCd = 99999;
        this.buffCd = 99999;
      }
    };
    const origFind = Companion.findNearestEnemy;
    Companion.findNearestEnemy = function (maxD) {
      let best = null;
      let bd = maxD;
      if (window.__MP_MODE && window.__MP && window.__MP.remotes) {
        window.__MP.remotes.forEach((r, id) => {
          const d = r.group.position.distanceTo(this.group.position);
          if (d < bd) { bd = d; best = { isPlayer: true, id: id, group: r.group }; }
        });
      }
      if (origFind) {
        const enemy = origFind.call(this, maxD);
        if (enemy) {
          const d = enemy.group.position.distanceTo(this.group.position);
          if (d < bd) { bd = d; best = enemy; }
        }
      }
      return best;
    };
    const origShoot = Companion.shootAt;
    Companion.shootAt = function (e) {
      if (window.__POTATO_MODE) return;
      if (e.isPlayer) {
        if (window.__MP && window.__MP.room) window.__MP.room.send('pvp', { targetId: e.id, damage: 5 });
        if (typeof SoundFX !== 'undefined') SoundFX.whip();
        const p = ParticlePool.get(0xadff2f);
        p.position.copy(this.group.position);
        p.scale.setScalar(1.2);
        scene.add(p);
        ParticlePool.active.push({ mesh: p, vel: new THREE.Vector3(0, 0, 0), life: 0.2 });
        return;
      }
      if (origShoot) origShoot.apply(this, arguments);
    };
  }

  // T — Божественный синтез Егора (Наноягодная броня [4])
  let tHoldTimer = 0;
  let tCharging = false;
  let nanoUltCd = 0;
  const tPanel = document.createElement('div');
  tPanel.style.cssText = 'position:fixed;bottom:180px;left:50%;transform:translateX(-50%);width:340px;background:rgba(0,20,40,.95);border:3px solid #00f2fe;border-radius:8px;padding:12px;text-align:center;z-index:50;display:none;box-shadow:0 0 30px rgba(0,242,254,.7),5px 5px 0 #000';
  tPanel.innerHTML = '<div style="font-family:Bangers,Impact,sans-serif;font-size:20px;color:#00f2fe;-webkit-text-stroke:1px #000;margin-bottom:6px;letter-spacing:2px">⚡ БОЖЕСТВЕННЫЙ СИНТЕЗ ⚡</div><div style="height:22px;background:#001a1a;border:2px solid #000;overflow:hidden"><div id="t-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#00f2fe,#ff0055);box-shadow:0 0 15px #00f2fe;transition:width .05s"></div></div>';
  document.body.appendChild(tPanel);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyT' && player.character === 'banana' && player.suitIdx === 4 && !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE && !window.__POTATO_MODE) {
      if (nanoUltCd > 0) {
        if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), `*T КД ${Math.ceil(nanoUltCd)}с*`, '#ff4400');
        return;
      }
      if (!tCharging) {
        tCharging = true;
        tHoldTimer = 0;
        tPanel.style.display = 'block';
      }
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyT' && tCharging) {
      tCharging = false;
      tPanel.style.display = 'none';
    }
  });
  setInterval(() => {
    if (nanoUltCd > 0) nanoUltCd -= 0.1;
    if (tCharging) {
      tHoldTimer += 0.1;
      document.getElementById('t-bar').style.width = Math.min(100, (tHoldTimer / 5) * 100) + '%';
      if (tHoldTimer >= 5) {
        tCharging = false;
        tPanel.style.display = 'none';
        nanoUltCd = 102.5;
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(2, 15, 40, 16),
          new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.7, wireframe: true })
        );
        beam.rotation.x = Math.PI / 2;
        const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
        beam.position.copy(player.pos).add(fwd.clone().multiplyScalar(20));
        beam.lookAt(player.pos.clone().add(fwd.clone().multiplyScalar(40)));
        scene.add(beam);
        setTimeout(() => { scene.remove(beam); beam.geometry.dispose(); beam.material.dispose(); }, 1500);
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(1, 50, 32),
          new THREE.MeshBasicMaterial({ color: 0x00f2fe, side: THREE.DoubleSide })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.copy(player.pos);
        scene.add(ring);
        let rt = 0;
        (function animRing() {
          rt += 0.05;
          ring.scale.setScalar(1 + rt * 3);
          ring.material.opacity = Math.max(0, 1 - rt);
          if (rt < 1) requestAnimationFrame(animRing);
          else { scene.remove(ring); ring.geometry.dispose(); ring.material.dispose(); }
        })();
        for (let i = enemies.length - 1; i >= 0; i--) {
          if (enemies[i].group.position.distanceTo(player.pos) <= 50) {
            damageEnemy(enemies[i], 2500, new THREE.Vector3(0, 15, 0), '*БОЖЕСТВЕННЫЙ СИНТЕЗ!*');
          }
        }
        if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'nano_ult', radius: 50 });
        if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 5, 0)), '⚡ БОЖЕСТВЕННЫЙ СИНТЕЗ! ⚡', '#00f2fe');
        if (typeof SoundFX !== 'undefined') { SoundFX.devastator(); SoundFX.boom(); }
      }
    }
  }, 100);

  // F-Способности
  player._suitCdMap = player._suitCdMap || [0, 0, 0, 0, 0];
  const origTriggerF = window.triggerUniqueAbilityF;
  window.triggerUniqueAbilityF = function () {
    if (window.__POTATO_MODE) return;
    const idx = player.suitIdx;
    if (CARROT_MODE) {
      if (CARROT_FORM === 2) {
        if (player._suitCdMap[4] > 0) { if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 5, 0)), `*F КД ${player._suitCdMap[4].toFixed(1)}с*`, '#f9ca24'); return; }
        if (player.carrotStamina < 60) { if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 4, 0)), '*МАЛО СТАМИНЫ!*', '#ff2200'); return; }
        player._suitCdMap[4] = 8;
        carrotEarthquake();
        if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'earthquake', radius: 40 });
      } else {
        if (player._suitCdMap[3] > 0) { if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), `*F КД ${player._suitCdMap[3].toFixed(1)}с*`, '#f9ca24'); return; }
        player._suitCdMap[3] = 6;
        window.carrotRootBind();
        if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'root_bind', radius: 45 });
      }
      return;
    }
    if (player.character === 'banana' && !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE) {
      if (player._suitCdMap[idx] > 0) { if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), `*F КД ${player._suitCdMap[idx].toFixed(1)}с*`, '#f9ca24'); return; }
      if (idx === 0) {
        player._suitCdMap[0] = 5;
        if (typeof alliedTurrets !== 'undefined') {
          for (let i = 0; i < 2; i++) {
            const g = new THREE.Group();
            g.position.copy(player.pos).add(new THREE.Vector3((i - 0.5) * 4, 0, 0));
            const b = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 2, 6), createPrototypeShader(0x3f4650, 0x111111, 0));
            b.position.y = 1;
            g.add(b);
            scene.add(g);
            alliedTurrets.push({ group: g, life: 15, cd: 0 });
          }
        }
        return;
      }
      if (idx === 1) {
        player._suitCdMap[1] = 4;
        SoundFX.whip();
        for (let k = -4; k <= 4; k++) {
          const a = player.camYaw + k * 0.15;
          const d = new THREE.Vector3(-Math.sin(a), 0, -Math.cos(a));
          const p = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 6), new THREE.MeshBasicMaterial({ color: 0xf9ca24 }));
          p.position.copy(player.pos).add(new THREE.Vector3(0, 2, 0));
          scene.add(p);
          projectiles.push({ mesh: p, vel: new THREE.Vector3(d.x * 50, 0, d.z * 50), life: 1.5, fromPlayer: true, dmg: 60, radius: 2 });
        }
        return;
      }
      if (idx === 2) {
        player._suitCdMap[2] = 8;
        SoundFX.devastator();
        player.facingYaw = player.camYaw;
        const f = new THREE.Vector3(-Math.sin(player.facingYaw), 0, -Math.cos(player.facingYaw));
        player.durianRam = { timer: 0, speed: 60, dir: f, hitSet: new Set(), maxDur: 5.0 };
        if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), 'ТАРАН!', '#78bd37');
        return;
      }
      if (idx === 3) {
        player._suitCdMap[3] = 1;
        player.activeModeF = !player.activeModeF;
        if (player.mesh && player.mesh.userData.limeShield) player.mesh.userData.limeShield.visible = player.activeModeF;
        if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), player.activeModeF ? 'ЩИТ ВКЛ' : 'ЩИТ ВЫКЛ', '#00f2fe');
        return;
      }
      if (idx === 4) {
        player._suitCdMap[4] = 1;
        player.activeModeF = !player.activeModeF;
        sayShrekich(player.activeModeF ? 'Егорбанан: «ГИБКОСТЬ!»' : 'Шрекич: «Щупальца свёрнуты.»');
        return;
      }
      return;
    }
    if (origTriggerF) origTriggerF.apply(this, arguments);
  };
  setInterval(() => {
    if (player._suitCdMap) {
      for (let i = 0; i < 5; i++) {
        if (player._suitCdMap[i] > 0) player._suitCdMap[i] -= 0.1;
      }
    }
  }, 100);

  if (typeof spawnCitrusAPC === 'function') {
    const _origAPC = spawnCitrusAPC;
    window.spawnCitrusAPC = function (x, z) {
      _origAPC(x, z);
      const t = enemies[enemies.length - 1];
      if (t && t.type === 'tank') {
        t.group.scale.set(1.8, 1.8, 1.8);
        t.radius = 6.8;
      }
    };
  }

  if (typeof addRage === 'function') {
    const origAddRage = window.addRage;
    window.addRage = function (amount) {
      if (PEPPER_MODE) {
        if (typeof addSpiciness === 'function') addSpiciness(amount);
        return;
      }
      if (origAddRage) origAddRage.apply(this, arguments);
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 11. ПОЛНЫЙ КОД 5-ГО ПЕРСОНАЖА: МОРГЕНКАРТОШКА & ГРОМТОМАТ + TOAST И ФРАЗЫ
  // ═══════════════════════════════════════════════════════════════════════════
  window.__POTATO_MODE = false;
  window.__POTATO_FORM = 1;
  let potatoCombo = 0;
  let potatoComboTimer = 0;
  player._potatoArmor = 0;
  player._potatoHealCd = 0;
  player._potatoRageCd = 0;
  player._potatoRamCd = 0;
  player._potatoSauceCd = 0;
  player._potatoPortalCd = 0;
  player._potatoSlamCd = 0;
  player._potatoNovaCd = 0;

  window.createPotatoMesh = function (form) {
    form = (form === 2) ? 2 : 1;
    var g = new THREE.Group();
    var pelvis = new THREE.Group();
    pelvis.position.y = 1.65;
    g.add(pelvis);
    var spine = new THREE.Group();
    pelvis.add(spine);
    var neck = new THREE.Group();
    neck.position.y = 1.95;
    spine.add(neck);
    var headGroup = new THREE.Group();
    headGroup.position.y = 0.4;
    neck.add(headGroup);
    var armL = new THREE.Group();
    armL.position.set(-1.0, 1.55, 0);
    spine.add(armL);
    var armR = new THREE.Group();
    armR.position.set(1.0, 1.55, 0);
    spine.add(armR);
    var legL = new THREE.Group();
    legL.position.set(-0.35, 0, 0);
    pelvis.add(legL);
    var legR = new THREE.Group();
    legR.position.set(0.35, 0, 0);
    pelvis.add(legR);

    var bodyMat, bellyMat, headMat, hairMat, armMat, legMat, accentMat;
    var isMorg = (form === 1);
    if (isMorg) {
      bodyMat = new THREE.MeshStandardMaterial({ color: 0x8B0000 });
      bellyMat = new THREE.MeshStandardMaterial({ color: 0xD2B48C });
      headMat = new THREE.MeshStandardMaterial({ color: 0xE8C4A0 });
      hairMat = new THREE.MeshStandardMaterial({ color: 0x2A1A0F });
      armMat = new THREE.MeshStandardMaterial({ color: 0x8B0000 });
      legMat = new THREE.MeshStandardMaterial({ color: 0x2A2A2A });
      accentMat = new THREE.MeshBasicMaterial({ color: 0x3E2723 });
    } else {
      bodyMat = new THREE.MeshStandardMaterial({ color: 0x4A0010 });
      bellyMat = new THREE.MeshStandardMaterial({ color: 0xFF2200 });
      headMat = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
      hairMat = new THREE.MeshStandardMaterial({ color: 0x0A0A0A });
      armMat = new THREE.MeshStandardMaterial({ color: 0x4A0010 });
      legMat = new THREE.MeshStandardMaterial({ color: 0x1A1A1A });
      accentMat = new THREE.MeshStandardMaterial({ color: 0x00FF00 });
    }

    var torso = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 1.5, 10), bodyMat);
    torso.position.y = 1.1;
    spine.add(torso);

    if (isMorg) {
      for (var s = 0; s < 4; s++) {
        var stripeH = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: 0x000000 }));
        stripeH.position.set(0, 0.55 + s * 0.35, 0.86);
        spine.add(stripeH);
      }
      for (var sv = 0; sv < 3; sv++) {
        var stripeV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.06), new THREE.MeshBasicMaterial({ color: 0x000000 }));
        stripeV.position.set(-0.6 + sv * 0.6, 1.15, 0.86);
        spine.add(stripeV);
      }
      var belly = new THREE.Mesh(new THREE.SphereGeometry(0.78, 12, 10), bellyMat);
      belly.position.set(0, 0.7, 0.55);
      belly.scale.set(1.05, 0.95, 0.55);
      spine.add(belly);
      var beard = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.85, 8), hairMat);
      beard.position.set(0, 0.05, 0.48);
      beard.rotation.x = Math.PI;
      headGroup.add(beard);
      var eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.05), new THREE.MeshBasicMaterial({ color: 0x000000 }));
      eyeL.position.set(-0.18, 0.45, 0.48);
      headGroup.add(eyeL);
      var eyeR = eyeL.clone();
      eyeR.position.x = 0.18;
      headGroup.add(eyeR);
    } else {
      var belly2 = new THREE.Mesh(new THREE.SphereGeometry(0.82, 14, 12), bellyMat);
      belly2.position.set(0, 0.65, 0.5);
      belly2.scale.set(1.1, 1.0, 0.6);
      spine.add(belly2);
      var eyeL2 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), new THREE.MeshBasicMaterial({ color: 0xFFFFFF }));
      eyeL2.position.set(-0.2, 0.45, 0.52);
      headGroup.add(eyeL2);
      var pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), new THREE.MeshBasicMaterial({ color: 0x000000 }));
      pupilL.position.set(-0.2, 0.45, 0.62);
      headGroup.add(pupilL);
      var eyeR2 = eyeL2.clone();
      eyeR2.position.x = 0.2;
      headGroup.add(eyeR2);
      var pupilR = pupilL.clone();
      pupilR.position.x = 0.2;
      headGroup.add(pupilR);
    }

    var head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 12), headMat);
    head.position.y = 0.4;
    head.scale.set(1, 1.05, 1);
    headGroup.add(head);

    if (isMorg) {
      var hairLong = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.75, 12), hairMat);
      hairLong.position.set(0, 0.68, -0.05);
      headGroup.add(hairLong);
    } else {
      var hairShort = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
      hairShort.position.set(0, 0.65, -0.02);
      headGroup.add(hairShort);
    }

    function buildArm(side) {
      var upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.7, 8), armMat);
      upperArm.position.y = -0.35;
      side.add(upperArm);
      var elbow = new THREE.Group();
      elbow.position.y = -0.7;
      side.add(elbow);
      var foreArm = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.65, 8), armMat);
      foreArm.position.y = -0.32;
      elbow.add(foreArm);
      var wrist = new THREE.Group();
      wrist.position.y = -0.65;
      elbow.add(wrist);
      if (isMorg) {
        if (side === armR) {
          var handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 6), new THREE.MeshStandardMaterial({ color: 0x5D4037 }));
          handle.position.y = -0.9;
          wrist.add(handle);
          var hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.75), new THREE.MeshStandardMaterial({ color: 0x8E8E8E }));
          hammerHead.position.y = -1.75;
          wrist.add(hammerHead);
        }
        var fist = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 8), headMat);
        fist.position.y = -0.08;
        wrist.add(fist);
      } else {
        var glove = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), accentMat);
        glove.position.y = -0.08;
        wrist.add(glove);
      }
      return { shoulder: side, elbow: elbow, wrist: wrist };
    }
    var armLData = buildArm(armL);
    var armRData = buildArm(armR);

    function buildLeg(side) {
      var thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.85, 8), legMat);
      thigh.position.y = -0.42;
      side.add(thigh);
      var knee = new THREE.Group();
      knee.position.y = -0.85;
      side.add(knee);
      var shin = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.85, 8), legMat);
      shin.position.y = -0.42;
      knee.add(shin);
      return { hip: side, knee: knee };
    }
    var legLData = buildLeg(legL);
    var legRData = buildLeg(legR);

    g.userData = {
      pelvis: pelvis, spine: spine, neck: neck, headGroup: headGroup,
      armL: armLData, armR: armRData, legL: legLData, legR: legRData,
      limeShield: null, backTentacles: null, isPotato: true
    };
    return g;
  };

  const origGetSuitData = window.getSuitData;
  window.getSuitData = function () {
    if (window.__POTATO_MODE) {
      if (window.__POTATO_FORM === 1) {
        return { id: 'potato1', name: 'МОРГЕНКАРТОШКА', desc: 'Танк.', maxHp: 800, maxEn: 300, speed: 22, dmg: 90, canFly: false, level: 1, slashColor: 0x8B4513, quote: '' };
      } else {
        return { id: 'potato2', name: 'ГРОМТОМАТ', desc: 'Дамагер.', maxHp: 600, maxEn: 400, speed: 30, dmg: 70, canFly: false, level: 1, slashColor: 0xFF2200, quote: '' };
      }
    }
    return origGetSuitData ? origGetSuitData.apply(this, arguments) : SUITS[player.suitIdx];
  };

  const origPPA = window.performPrimaryAttack;
  window.performPrimaryAttack = function () {
    if (player._disguiseTimer > 0) deactivateDisguise();
    if (!window.__POTATO_MODE) {
      if (origPPA) return origPPA.apply(this, arguments);
      return;
    }
    if (player.isDead || player.consumeState || player.attackTimer > 0.08) return;

    if (potatoComboTimer <= 0) potatoCombo = 0;
    potatoComboTimer = 1.5;

    var fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
    var isMorg = (window.__POTATO_FORM === 1);
    var maxCombo = isMorg ? 3 : 5;
    potatoCombo = (potatoCombo % maxCombo) + 1;

    var comboStep = (isMorg && potatoCombo === 3) ? 5 : potatoCombo;
    player.comboStep = comboStep;
    player.attackDuration = PLAYER_COMBO[comboStep].dur;
    player.attackTimer = player.attackDuration;
    player.comboResetTimer = 1.5;
    player.facingYaw = player.camYaw;
    player.vel.x += fwd.x * PLAYER_COMBO[comboStep].lunge;
    player.vel.z += fwd.z * PLAYER_COMBO[comboStep].lunge;

    var baseDmg = (window.__POTATO_FORM === 1) ? 90 : 70;
    var dmgMult = (potatoCombo === maxCombo) ? 2.5 : 1.0;
    var isFinisher = (potatoCombo === maxCombo);

    var chest = new THREE.Vector3(player.pos.x, player.pos.y + 2.3, player.pos.z);
    var slashColor = (window.__POTATO_FORM === 1) ? 0x8B4513 : 0xFF2200;
    spawnSlashArc(chest.clone().add(fwd.clone().multiplyScalar(1.7)), player.facingYaw, PLAYER_COMBO[comboStep].tilt, slashColor, isMorg ? 4.8 : 4.0, 0.2);

    if (isFinisher) {
      if (isMorg) {
        spawnGroundCrackRing(new THREE.Vector3(player.pos.x + fwd.x * 3.5, 0, player.pos.z + fwd.z * 3.5), 0x8B4513, 10);
        SoundFX.devastator();
        triggerHitstopAndChroma(0.05, 0.6, 1.1);
      } else {
        var fireBall = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 10), new THREE.MeshBasicMaterial({ color: 0xFF2200 }));
        fireBall.position.copy(chest);
        scene.add(fireBall);
        projectiles.push({ mesh: fireBall, vel: new THREE.Vector3(fwd.x * 45, 0, fwd.z * 45), life: 1.5, fromPlayer: true, dmg: baseDmg * 2.5, radius: 3.0 });
        spawnParticles(chest, 0xFF2200, 12);
        triggerHitstopAndChroma(0.05, 0.6, 1.1);
      }
    }
    SoundFX.swing(200 + potatoCombo * 50);

    var hr = isMorg ? 6.0 : 5.0;
    if (isFinisher) hr = isMorg ? 10 : 6.5;
    var hx = player.pos.x + fwd.x * 3.4;
    var hz = player.pos.z + fwd.z * 3.4;

    for (var i = enemies.length - 1; i >= 0; i--) {
      var e = enemies[i];
      var dx = e.group.position.x - hx;
      var dz = e.group.position.z - hz;
      if (dx * dx + dz * dz <= (hr + e.radius) * (hr + e.radius)) {
        var finalDmg = baseDmg * dmgMult;
        if (isFinisher && isMorg) e.vel.y = 18;
        damageEnemy(e, finalDmg, new THREE.Vector3(fwd.x * 3, 0, fwd.z * 3), isFinisher ? (isMorg ? '*ТЯЖЁЛЫЙ!*' : '*ОГНЕННЫЙ ШАР!*') : '');
      }
    }
    if (window.__MP && window.__MP.room && window.__MP.remotes) {
      window.__MP.remotes.forEach(function (r, id) {
        var ddx = r.group.position.x - hx;
        var ddz = r.group.position.z - hz;
        if (ddx * ddx + ddz * ddz <= (hr + 1) * (hr + 1)) {
          window.__MP.room.send('pvp', { targetId: id, damage: Math.round(baseDmg * dmgMult) });
        }
      });
    }
    if (typeof isLabOpen === 'undefined' || !isLabOpen) {
      if (typeof checkCarDestruction === 'function') checkCarDestruction(new THREE.Vector3(hx, 0, hz), hr);
    }
  };

  const origDevastator = window.performDevastator;
  window.performDevastator = function () {
    if (player._multifruitTitanActive && !player.isDead) {
      window.unleashRainbowBalanceStrike();
    }
    if (!window.__POTATO_MODE) {
      if (origDevastator) return origDevastator.apply(this, arguments);
      return;
    }
    if (player.isDead || player.consumeState) return;
    if (window.__POTATO_FORM === 1) {
      if (player._potatoSlamCd > 0) return;
      player._potatoSlamCd = 4.0;
      player.vel.y = 22;
      SoundFX.whip();
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '⚡ ГРОМОВОЙ МОЛОТ! ⚡', '#8B4513');
      setTimeout(function () {
        player.vel.y = -85;
        setTimeout(function () {
          spawnGroundCrackRing(player.pos, 0x8B4513, 18);
          spawnParticles(player.pos.clone().add(new THREE.Vector3(0, 1, 0)), 0x8B4513, 30);
          SoundFX.boom();
          SoundFX.devastator();
          triggerHitstopAndChroma(0.12, 0.9, 1.4);
          spawnLandingCrater(player.pos, 5);
          for (var i = enemies.length - 1; i >= 0; i--) {
            var e = enemies[i];
            var d = e.group.position.distanceTo(player.pos);
            if (d < 14) {
              e.vel.y = Math.max(e.vel.y, 15);
              damageEnemy(e, 250 * (1 - d / 16), new THREE.Vector3(), '*ЗЕМЛЕТРЯСЕНИЕ!*');
            }
          }
          if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'potato_slam', radius: 14, damage: 250 });
        }, 300);
      }, 400);
    } else {
      if (player._potatoNovaCd > 0) return;
      player._potatoNovaCd = 5.0;
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '🔥 СВЕРХНОВА! 🔥', '#FF2200');
      SoundFX.devastator();
      SoundFX.boom();
      triggerHitstopAndChroma(0.1, 0.8, 1.3);
      spawnGroundCrackRing(player.pos, 0xFF2200, 14);
      spawnParticles(player.pos.clone().add(new THREE.Vector3(0, 2, 0)), 0xFF2200, 40);
      for (var j = enemies.length - 1; j >= 0; j--) {
        var en = enemies[j];
        var dist = en.group.position.distanceTo(player.pos);
        if (dist < 14) {
          en.vel.y = Math.max(en.vel.y, 12);
          damageEnemy(en, 300 * (1 - dist / 16), new THREE.Vector3(), '*ВЗРЫВ!*');
        }
      }
      if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'tomato_nova', radius: 14, damage: 300 });
    }
  };

  const origF = window.triggerUniqueAbilityF;
  window.triggerUniqueAbilityF = function () {
    if (!window.__POTATO_MODE) {
      if (origF) return origF.apply(this, arguments);
      return;
    }
    if (player.isDead) return;
    if (window.__POTATO_FORM === 1) {
      if (player._potatoRamCd > 0) return;
      player._potatoRamCd = 6.0;
      var fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
      player.vel.x += fwd.x * 180;
      player.vel.z += fwd.z * 180;
      player.dodgeIframes = 0.6;
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '💥 ТАРАН! 💥', '#8B4513');
      SoundFX.devastator();
      setTimeout(function () {
        for (var i = enemies.length - 1; i >= 0; i--) {
          var e = enemies[i];
          if (e.group.position.distanceTo(player.pos) < 8) {
            e.vel.y = Math.max(e.vel.y, 18);
            damageEnemy(e, 180, fwd.clone().multiplyScalar(8), '*ТАРАН!*');
          }
        }
      }, 200);
      if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'potato_ram', radius: 8, damage: 180 });
    } else {
      if (player._potatoSauceCd > 0) return;
      player._potatoSauceCd = 3.0;
      var fwd2 = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '🍅 СТРУЯ СОУСА! 🍅', '#FF2200');
      for (var step = 1; step < 16; step++) {
        (function (s) {
          setTimeout(function () {
            var p = player.pos.clone().add(fwd2.clone().multiplyScalar(s));
            spawnParticles(p, 0xCC0000, 4);
            for (var i = enemies.length - 1; i >= 0; i--) {
              var e = enemies[i];
              if (e.group.position.distanceTo(p) < 3) {
                damageEnemy(e, 25, fwd2.clone(), '');
              }
            }
          }, s * 30);
        })(step);
      }
      if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'tomato_sauce', radius: 15, damage: 100 });
    }
  };

  window.addEventListener('keydown', function (e) {
    if (e.code !== 'KeyC' || !window.__POTATO_MODE) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (player.isDead) return;
    if (window.__POTATO_FORM === 1) {
      if (player._potatoHealCd > 0) return;
      player._potatoHealCd = 10.0;
      player.hp = Math.min(player.maxHp, player.hp + 250);
      player._potatoArmor = 4.0;
      player.rooted = 1.0;
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '🌱 ПИТАНИЕ КОРНЕЙ (+250 HP)', '#2ecc71');
      spawnGroundCrackRing(player.pos, 0x2ecc71, 8);
      spawnParticles(player.pos.clone().add(new THREE.Vector3(0, 1, 0)), 0x2ecc71, 20);
      SoundFX.hit(150, 0.3);
      if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'potato_heal' });
    } else {
      if (player._potatoRageCd > 0) return;
      player._potatoRageCd = 12.0;
      player._tomatoRage = 6.0;
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '🔥 ИСПЫТАНИЕ ПЛАМЕНЕМ', '#FF4400');
      spawnParticles(player.pos.clone().add(new THREE.Vector3(0, 2, 0)), 0xFF4400, 25);
      SoundFX.devastator();
      if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'tomato_rage' });
    }
  }, true);

  window.addEventListener('keydown', function (e) {
    if (e.code !== 'KeyT' || !window.__POTATO_MODE) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (player.isDead || window.__POTATO_FORM !== 2) return;
    if (player._potatoPortalCd > 0) return;
    player._potatoPortalCd = 30.0;
    let bestE = null;
    let bestD = 9999;
    for (let i = 0; i < enemies.length; i++) {
      let d = player.pos.distanceTo(enemies[i].group.position);
      if (d < bestD) { bestD = d; bestE = enemies[i]; }
    }
    if (bestE) {
      player.pos.copy(bestE.group.position).add(new THREE.Vector3(0, 0, 4));
      player.vel.set(0, 0, 0);
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '🍅 ТОМАТНЫЙ ПОРТАЛ!', '#FF2200');
      spawnParticles(player.pos.clone(), 0xFF2200, 20);
      SoundFX.whip();
      if (window.__MP && window.__MP.room) {
        window.__MP.room.send('mv', { x: player.pos.x, y: player.pos.y, z: player.pos.z, ry: player.facingYaw || 0, anim: 0 });
      }
    } else {
      player._potatoPortalCd = 0;
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), 'НЕТ ЦЕЛЕЙ', '#888888');
    }
  }, true);

  window.addEventListener('keydown', function (e) {
    if (e.code !== 'KeyR' || !window.__POTATO_MODE) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (player.isDead) return;
    window.switchPotatoForm(window.__POTATO_FORM === 1 ? 2 : 1);
  }, true);

  window.addEventListener('keydown', function (e) {
    if (!window.__POTATO_MODE) return;
    if (e.code === 'Digit1' || e.code === 'Numpad1') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (window.__POTATO_FORM !== 1) window.switchPotatoForm(1);
    }
    if (e.code === 'Digit2' || e.code === 'Numpad2') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (window.__POTATO_FORM !== 2) window.switchPotatoForm(2);
    }
  }, true);

  function switchPotatoForm(form) {
    window.__POTATO_FORM = form;
    player.maxHp = (form === 1) ? 800 : 600;
    player.hp = Math.min(player.hp, player.maxHp);
    if (typeof window.rebuildHeroMesh === 'function') window.rebuildHeroMesh();
    spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), form === 1 ? '🥔 МОРГЕН' : '🍅 ГРОМТОМАТ', form === 1 ? '#8B4513' : '#FF2200');
    SoundFX.devastator();
    triggerHitstopAndChroma(0.08, 0.5, 1.1);
    if (window.__MP && window.__MP.room) window.__MP.room.send('charState', { char: 'potato', potatoForm: form });
  }
  window.switchPotatoForm = switchPotatoForm;

  const origRebuild = window.rebuildHeroMesh;
  window.rebuildHeroMesh = function () {
    if (window.__POTATO_MODE) {
      if (player.mesh && playerGroup.children.indexOf(player.mesh) >= 0) playerGroup.remove(player.mesh);
      player.mesh = window.createPotatoMesh(window.__POTATO_FORM);
      playerGroup.add(player.mesh);
      const hotbar = document.getElementById('suit-hotbar');
      if (hotbar) hotbar.style.display = 'none';
      const evo = document.getElementById('pepper-evo-panel');
      if (evo) evo.classList.remove('active');
      if (typeof Companion !== 'undefined' && Companion.group) Companion.group.visible = false;
      return;
    }
    if (origRebuild) return origRebuild.apply(this, arguments);
  };

  window.equipPotato = function () {
    window.__POTATO_MODE = true;
    window.__POTATO_FORM = 1;
    player.character = 'potato';
    player.suitIdx = 4;
    PEPPER_MODE = false;
    CARROT_MODE = false;
    LEMON_MODE = false;
    CARROT_FORM = 1;
    playerGroup.scale.set(1, 1, 1);
    player.maxHp = 800;
    player.hp = 800;
    player.maxEn = 300;
    player.en = 300;
    player._potatoArmor = 0;
    player._potatoHealCd = 0;
    player._potatoRageCd = 0;
    player._potatoRamCd = 0;
    player._potatoSauceCd = 0;
    player._potatoPortalCd = 0;
    player._potatoSlamCd = 0;
    player._potatoNovaCd = 0;
    if (typeof window.rebuildHeroMesh === 'function') window.rebuildHeroMesh();
    const badge = document.querySelector('.suit-badge');
    if (badge) badge.innerText = '🥔 МОРГЕНКАРТОШКА';
    const rageLbl = document.querySelector('.rage-wrap .bar-label span');
    if (rageLbl) rageLbl.innerText = '🛡️ БРОНЯ / ЯРОСТЬ';
    const powers = document.getElementById('ui-powers-desc');
    if (powers) powers.innerHTML = '<b>ЛКМ:</b> 3-Hit (3-й AoE) | <b>Q:</b> Прыжок-молот | <b>C:</b> Лечение+броня | <b>F:</b> Таран | <b>R:</b> Форма';
    if (typeof Companion !== 'undefined' && Companion.group) Companion.group.visible = false;
    const hotbar = document.getElementById('suit-hotbar');
    if (hotbar) hotbar.style.display = 'none';
    const evo = document.getElementById('pepper-evo-panel');
    if (evo) evo.classList.remove('active');
    heroAuraLight.color.setHex(0x8B4513);
    if (typeof window.updateHUD === 'function') window.updateHUD();
    if (typeof window.updateScoreDisplay === 'function') window.updateScoreDisplay();
    if (window.__MP && window.__MP.room) window.__MP.room.send('charState', { char: 'potato', potatoForm: 1 });
    spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '🥔 МОРГЕНКАРТОШКА', '#8B4513');
    SoundFX.devastator();
    triggerHitstopAndChroma(0.08, 0.5, 1.1);
  };

  const origStartGameSession = window.startGameSession;
  window.startGameSession = function (loaded) {
    if (player.character === 'potato') {
      SoundFX.init();
      gameStarted = true;
      player.runStartTime = performance.now();
      document.getElementById('start-screen').style.display = 'none';
      document.getElementById('char-select').style.display = 'none';
      ignoreNextMouseFrames = 2;
      try { if (canvas.requestPointerLock) canvas.requestPointerLock(); } catch (e) {}
      if (typeof Mutations !== 'undefined' && Mutations.applyAll) Mutations.applyAll();
      if (loaded) {
        player.score = loaded.score || 0;
        player.wave = loaded.wave || 1;
        player.ep = loaded.ep || 350;
        if (loaded.mutations && typeof Mutations !== 'undefined') Mutations.owned = loaded.mutations;
      }
      window.equipPotato();
      if (typeof updateScoreDisplay === 'function') updateScoreDisplay();
      if (typeof updateCompanionHUD === 'function') updateCompanionHUD();
      if (typeof updateRageHUD === 'function') updateRageHUD();
      if (typeof updateDashHUD === 'function') updateDashHUD();
      setTimeout(function () {
        const el = document.getElementById('ui-shrek-msg');
        if (el) el.innerText = 'Моргенкартошка: «Молот земли!»';
      }, 300);
      return;
    }
    if (origStartGameSession) return origStartGameSession.apply(this, arguments);
  };

  const btnSetup = function () {
    const cs = document.getElementById('char-select');
    if (!cs || cs.style.display === 'none') {
      const b = document.getElementById('btn-potato');
      if (b && b.parentNode) b.parentNode.removeChild(b);
      return;
    }
    if (document.getElementById('btn-potato')) return;
    const grid = cs.querySelector('.char-grid');
    if (!grid) return;
    const card = document.createElement('div');
    card.id = 'btn-potato';
    card.className = 'char-card';
    card.dataset.char = 'potato';
    card.innerHTML =
      '<div class="char-portrait">🥔</div>' +
      '<h3 style="color:#8B4513;text-shadow:2px 2px 0 #000,0 0 10px #D2B48C;">МОРГЕНКАРТОШКА</h3>' +
      '<div class="tag" style="color:#D2B48C;">ТАНК · ГРОМТОМАТ · ЗЕМЛЯ</div>' +
      '<p><b>Морген (форма 1):</b> 3-hit с AoE-подбросом, молот с неба, лечение с бронёй, таран.<br><b>Громтомат (форма 2):</b> 5-hit с огненным шаром, нова, ярость, струя соуса, портал.</p>' +
      '<button style="background:linear-gradient(90deg,#8B4513,#D2B48C);color:#fff;font-weight:900;">ИГРАТЬ ЗА КАРТОШКУ</button>';
    card.addEventListener('click', function () {
      window.__pendingPotato = true;
      player.character = 'potato';
      document.getElementById('char-select').style.display = 'none';
      window.startGameSession(window.__pendingLoad || null);
    });
    grid.appendChild(card);
  };
  setInterval(btnSetup, 300);

  const origExecPrompt = window.updateExecPrompt;
  if (typeof origExecPrompt === 'function') {
    window.updateExecPrompt = function () {
      if (window.__POTATO_MODE) {
        const el = document.getElementById('exec-prompt');
        if (el) el.style.display = 'none';
        return;
      }
      return origExecPrompt.apply(this, arguments);
    };
  }

  setInterval(function () {
    if (player._potatoArmor > 0) player._potatoArmor -= 0.1;
    if (player._potatoHealCd > 0) player._potatoHealCd -= 0.1;
    if (player._potatoRageCd > 0) player._potatoRageCd -= 0.1;
    if (player._potatoRamCd > 0) player._potatoRamCd -= 0.1;
    if (player._potatoSauceCd > 0) player._potatoSauceCd -= 0.1;
    if (player._potatoPortalCd > 0) player._potatoPortalCd -= 0.1;
    if (player._potatoSlamCd > 0) player._potatoSlamCd -= 0.1;
    if (player._potatoNovaCd > 0) player._potatoNovaCd -= 0.1;
    if (potatoComboTimer > 0) {
      potatoComboTimer -= 0.1;
      if (potatoComboTimer <= 0) potatoCombo = 0;
    }
    if (window.__POTATO_MODE && window.__POTATO_FORM === 2 && player._tomatoRage > 0) {
      player._tomatoRage -= 0.1;
      if (Math.random() < 0.2) {
        spawnParticles(player.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 1, (Math.random() - 0.5) * 2)), 0xFF2200, 1);
      }
    }
  }, 100);

  setInterval(function () {
    if (window.__POTATO_MODE) {
      const sh = document.getElementById('shrekich-monitor');
      if (sh) sh.style.display = 'none';
      const comp = document.getElementById('companion-panel');
      if (comp) comp.style.display = 'none';
      const rp = document.getElementById('rocket-panel');
      if (rp) rp.style.display = 'none';
      const hb = document.getElementById('suit-hotbar');
      if (hb) hb.style.display = 'none';
    }
  }, 500);

  // Фразы, Toast-уведомления и отключение голоса для Картошки
  const POTATO_IDLE_PHRASES = {
    morg: [
      '«Молот земли — тяжесть моя.»',
      '«Ты не сдвинешь гору с места.»',
      '«Картофельный корень — крепче стали.»',
      '«Готов растоптать всех.»',
      '«Пузо — щит, борода — молот.»',
      '«Сырая земля — моя броня.»'
    ],
    tomato: [
      '«Огонь в крови, молнии в венах.»',
      '«Томатный сок — лучшее топливо.»',
      '«Готов сжечь этот город.»',
      '«Солнечный заряд — к бою!»',
      '«Халапеньо — мой брат по духу.»',
      '«Перчатки зелёные — стиль бойца.»'
    ]
  };

  const POTATO_ABILITY_LABELS = {
    morg: {
      combo3: { text: '🔨 ТЯЖЁЛЫЙ УДАР!', color: '#8B4513' },
      slam:   { text: '⚡ ГРОМОВОЙ МОЛОТ!', color: '#8B4513' },
      heal:   { text: '🌱 ПИТАНИЕ КОРНЕЙ (+250 HP)', color: '#2ecc71' },
      ram:    { text: '💥 КАРТОФЕЛЬНЫЙ ТАРАН!', color: '#8B4513' },
      form2:  { text: '🍅 ФОРМА: ГРОМТОМАТ', color: '#FF2200' }
    },
    tomato: {
      combo5: { text: '🔥 ОГНЕННЫЙ ШАР!', color: '#FF2200' },
      nova:   { text: '💥 СВЕРХНОВА!', color: '#FF2200' },
      rage:   { text: '🌶️ ИСПЫТАНИЕ ПЛАМЕНЕМ (ЯРОСТЬ 6с)', color: '#FF4400' },
      sauce:  { text: '🍅 СТРУЯ СОУСА!', color: '#CC0000' },
      portal: { text: '🌀 ТОМАТНЫЙ ПОРТАЛ!', color: '#FF2200' },
      form1:  { text: '🥔 ФОРМА: МОРГЕН', color: '#8B4513' }
    }
  };

  let _potatoToastEl = null;
  let _potatoToastTimer = null;
  let _potatoToastActive = false;

  function ensurePotatoToast() {
    if (_potatoToastEl) return _potatoToastEl;
    _potatoToastEl = document.createElement('div');
    _potatoToastEl.id = 'potato-toast';
    _potatoToastEl.style.cssText =
      'position:fixed;top:110px;right:16px;z-index:147;min-width:220px;max-width:380px;' +
      'padding:10px 14px;background:rgba(20,10,4,.97);border:3px solid #000;outline:3px solid #8B4513;' +
      'color:#fff;font:900 14px Rubik,sans-serif;letter-spacing:1px;text-align:right;' +
      'border-radius:4px;box-shadow:0 0 24px rgba(139,69,19,.6),5px 5px 0 #000;' +
      'transform:translateX(430px);opacity:0;transition:all .32s cubic-bezier(.2,1.4,.4,1);' +
      'pointer-events:none;text-shadow:2px 2px 0 #000;';
    document.body.appendChild(_potatoToastEl);
    return _potatoToastEl;
  }

  function flashPotatoAbility(text, color) {
    if (!window.__POTATO_MODE) return;
    const el = ensurePotatoToast();
    el.textContent = text;
    el.style.outlineColor = color || '#8B4513';
    el.style.borderColor = color || '#000';
    el.style.transform = 'translateX(0)';
    el.style.opacity = '1';
    _potatoToastActive = true;
    clearTimeout(_potatoToastTimer);
    _potatoToastTimer = setTimeout(function () {
      el.style.transform = 'translateX(430px)';
      el.style.opacity = '0';
      _potatoToastActive = false;
    }, 2200);
  }

  function setPotatoIdlePhrase() {
    if (!window.__POTATO_MODE || _potatoToastActive) return;
    const el = document.getElementById('ui-shrek-msg');
    if (!el) return;
    const form = window.__POTATO_FORM;
    const pool = (form === 1) ? POTATO_IDLE_PHRASES.morg : POTATO_IDLE_PHRASES.tomato;
    const prefix = (form === 1) ? 'Морген' : 'Громтомат';
    el.innerText = prefix + ': ' + pool[Math.floor(Math.random() * pool.length)];
  }

  function updatePotatoHUDHeader() {
    if (!window.__POTATO_MODE) return;
    const headerSpan = document.querySelector('.shrek-header span:first-child');
    if (headerSpan) headerSpan.innerText = '🥔 ДУХ КАРТОФЕЛЯ';
    const voiceToggle = document.getElementById('voice-toggle');
    if (voiceToggle) voiceToggle.style.display = 'none';
  }

  const _origSayShrekich = window.sayShrekich;
  window.sayShrekich = function (text, silent) {
    if (window.__POTATO_MODE) {
      const el = document.getElementById('ui-shrek-msg');
      if (el) el.innerText = text;
      return;
    }
    if (_origSayShrekich) return _origSayShrekich.apply(this, arguments);
  };

  if (typeof ShrekichVoice !== 'undefined' && ShrekichVoice.speak) {
    const _origSpeak = ShrekichVoice.speak;
    ShrekichVoice.speak = function (text) {
      if (window.__POTATO_MODE) return;
      return _origSpeak.apply(this, arguments);
    };
  }

  const _origEquipPotatoV2 = window.equipPotato;
  window.equipPotato = function () {
    const r = _origEquipPotatoV2.apply(this, arguments);
    setTimeout(function () {
      updatePotatoHUDHeader();
      setPotatoIdlePhrase();
    }, 60);
    return r;
  };

  setInterval(function () {
    if (window.__POTATO_MODE) {
      updatePotatoHUDHeader();
      setPotatoIdlePhrase();
    }
  }, 9000);

  const _origSwitchPotato = window.switchPotatoForm;
  window.switchPotatoForm = function (form) {
    _origSwitchPotato.apply(this, arguments);
    setTimeout(function () {
      if (form === 1) {
        flashPotatoAbility(POTATO_ABILITY_LABELS.tomato.form1.text, POTATO_ABILITY_LABELS.tomato.form1.color);
        const el = document.getElementById('ui-shrek-msg');
        if (el) el.innerText = 'Морген: «Пора сокрушить.»';
      } else {
        flashPotatoAbility(POTATO_ABILITY_LABELS.morg.form2.text, POTATO_ABILITY_LABELS.morg.form2.color);
        const el = document.getElementById('ui-shrek-msg');
        if (el) el.innerText = 'Громтомат: «Огонь в крови!»';
      }
    }, 30);
  };

  const _origPPAV2 = window.performPrimaryAttack;
  window.performPrimaryAttack = function () {
    if (!window.__POTATO_MODE) {
      if (_origPPAV2) return _origPPAV2.apply(this, arguments);
      return;
    }
    const beforeCombo = (typeof potatoCombo === 'number') ? potatoCombo : 0;
    const maxCombo = (window.__POTATO_FORM === 1) ? 3 : 5;
    const nextCombo = (beforeCombo % maxCombo) + 1;
    if (_origPPAV2) _origPPAV2.apply(this, arguments);
    if (nextCombo === maxCombo) {
      if (window.__POTATO_FORM === 1) {
        flashPotatoAbility(POTATO_ABILITY_LABELS.morg.combo3.text, POTATO_ABILITY_LABELS.morg.combo3.color);
      } else {
        flashPotatoAbility(POTATO_ABILITY_LABELS.tomato.combo5.text, POTATO_ABILITY_LABELS.tomato.combo5.color);
      }
    }
  };

  const _origDevV2 = window.performDevastator;
  window.performDevastator = function () {
    if (!window.__POTATO_MODE) {
      if (_origDevV2) return _origDevV2.apply(this, arguments);
      return;
    }
    if (window.__POTATO_FORM === 1) {
      flashPotatoAbility(POTATO_ABILITY_LABELS.morg.slam.text, POTATO_ABILITY_LABELS.morg.slam.color);
    } else {
      flashPotatoAbility(POTATO_ABILITY_LABELS.tomato.nova.text, POTATO_ABILITY_LABELS.tomato.nova.color);
    }
    if (_origDevV2) return _origDevV2.apply(this, arguments);
  };

  const _origFV2 = window.triggerUniqueAbilityF;
  window.triggerUniqueAbilityF = function () {
    if (!window.__POTATO_MODE) {
      if (_origFV2) return _origFV2.apply(this, arguments);
      return;
    }
    if (window.__POTATO_FORM === 1) {
      flashPotatoAbility(POTATO_ABILITY_LABELS.morg.ram.text, POTATO_ABILITY_LABELS.morg.ram.color);
    } else {
      flashPotatoAbility(POTATO_ABILITY_LABELS.tomato.sauce.text, POTATO_ABILITY_LABELS.tomato.sauce.color);
    }
    if (_origFV2) return _origFV2.apply(this, arguments);
  };

  window.addEventListener('keydown', function (e) {
    if (e.code !== 'KeyC' || !window.__POTATO_MODE || player.isDead) return;
    if (window.__POTATO_FORM === 1) {
      flashPotatoAbility(POTATO_ABILITY_LABELS.morg.heal.text, POTATO_ABILITY_LABELS.morg.heal.color);
    } else {
      flashPotatoAbility(POTATO_ABILITY_LABELS.tomato.rage.text, POTATO_ABILITY_LABELS.tomato.rage.color);
    }
  }, true);

  window.addEventListener('keydown', function (e) {
    if (e.code !== 'KeyT' || !window.__POTATO_MODE || window.__POTATO_FORM !== 2) return;
    if (player.isDead || player._potatoPortalCd > 0) return;
    flashPotatoAbility(POTATO_ABILITY_LABELS.tomato.portal.text, POTATO_ABILITY_LABELS.tomato.portal.color);
  }, true);

  const _origDamageV2 = window.applyDamageToHero;
  window.applyDamageToHero = function (dmg) {
    if (window.__POTATO_MODE && player.isDead) {
      if (_potatoToastEl) {
        _potatoToastEl.style.opacity = '0';
        _potatoToastEl.style.transform = 'translateX(430px)';
      }
    }
    return _origDamageV2.apply(this, arguments);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 12. МИР КОМИКСА, ВРАГИ (ORANGE SENTINEL / ПАУКИ) И БОССЫ (ЧАСТИ V-XII)
  // ═══════════════════════════════════════════════════════════════════════════
  const worldJumpPads = [];
  const holoScreens = [];

  function upgradeEnemyToComicSpec(en) {
    if (!en || !en.group || en._comicUpgraded) return;
    en._comicUpgraded = true;
    const g = en.group;
    const isCenturion = en.type === 'brawler' || en.type === 'shield';
    const isCaptain = en.type === 'leader' || en.type === 'sniper';
    const reactorColor = isCenturion ? 0xff00ff : (isCaptain ? 0xfff200 : 0x00f2fe);

    const reactorCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.14, 12),
      new THREE.MeshBasicMaterial({ color: reactorColor })
    );
    reactorCore.rotation.x = Math.PI / 2;
    reactorCore.position.set(0, 2.42, 0.58);
    g.add(reactorCore);

    const reactorRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.30, 0.05, 6, 16),
      new THREE.MeshBasicMaterial({ color: 0xffaa00 })
    );
    reactorRing.position.set(0, 2.42, 0.60);
    g.add(reactorRing);

    const pauldronMat = isCenturion
      ? createPrototypeShader(0x6a1b9a, 0x2a0040, 2, 0xff00ff)
      : createPrototypeShader(0xff7f00, 0x903000, 9, 0xfff200);

    for (let side of [-1, 1]) {
      const pauldron = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 0.75), pauldronMat), 1.05);
      pauldron.position.set(side * 1.05, 2.72, 0);
      pauldron.rotation.z = -side * 0.25;
      g.add(pauldron);
    }
  }

  if (typeof spawnCitrusSoldier === 'function') {
    const _origSpawnSoldier = window.spawnCitrusSoldier;
    window.spawnCitrusSoldier = function (x, z, role = 'mandarin') {
      _origSpawnSoldier.call(this, x, z, role);
      const newest = enemies[enemies.length - 1];
      if (newest) upgradeEnemyToComicSpec(newest);
    };
    setTimeout(() => {
      for (let i = 0; i < enemies.length; i++) upgradeEnemyToComicSpec(enemies[i]);
    }, 200);
  }

  window.spawnGrapeSpiderDrone = function (x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const grapeMat = createPrototypeShader(0x6a1b9a, 0x2a0040, 1, 0xff00ff);
    const legMat = createPrototypeShader(0x2a2a35, 0x101015, 9, 0xaa44ff);

    const clusterOffsets = [
      [0, 1.4, 0], [0.55, 1.3, 0.3], [-0.55, 1.3, 0.3], [0, 1.3, -0.55],
      [0.4, 1.85, 0], [-0.4, 1.85, 0], [0, 1.9, 0.4], [0, 0.95, 0.4], [0, 2.25, 0]
    ];
    clusterOffsets.forEach(([ox, oy, oz]) => {
      const berry = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(0.46, 10, 10), grapeMat), 1.05);
      berry.position.set(ox, oy, oz);
      g.add(berry);
    });

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff0055 }));
    eye.position.set(0, 1.45, 0.78);
    g.add(eye);

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const legGroup = new THREE.Group();
      legGroup.position.set(Math.cos(a) * 0.7, 1.1, Math.sin(a) * 0.7);
      legGroup.rotation.y = -a;
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 1.2, 6), legMat);
      upper.rotation.z = 0.75;
      upper.position.set(0.45, 0.2, 0);
      legGroup.add(upper);
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.03, 1.4, 6), legMat);
      lower.rotation.z = -0.35;
      lower.position.set(0.95, -0.45, 0);
      legGroup.add(lower);
      g.add(legGroup);
    }

    scene.add(g);
    const droneObj = {
      type: 'kamikaze',
      _isGrapeDrone: true,
      group: g,
      hp: 720,
      maxHp: 720,
      vel: new THREE.Vector3(),
      speed: 19,
      radius: 1.5,
      attackCd: 1.0,
      meleeCd: 0,
      meleeAnim: 0,
      _meleeDur: 0.35,
      dodgeCd: 99,
      flying: false,
      _kamikaze: false,
      _explodeTimer: 0,
      _rooted: 0
    };
    enemies.push(droneObj);
    return droneObj;
  };

  function createComicPropagandaTexture(title, sub1, sub2, accentHex) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 512, 256);
    grad.addColorStop(0, '#160422');
    grad.addColorStop(1, '#2a0818');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 240);

    ctx.fillStyle = '#d86072';
    ctx.beginPath();
    ctx.arc(88, 128, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#fff200';
    ctx.fillRect(62, 108, 16, 8);
    ctx.fillRect(96, 108, 16, 8);

    ctx.fillStyle = accentHex;
    ctx.font = '900 30px Rubik, Arial, sans-serif';
    ctx.fillText(title, 164, 78);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Rubik, Arial, sans-serif';
    ctx.fillText(sub1, 164, 134);
    ctx.fillStyle = '#adff2f';
    ctx.fillText(sub2, 164, 178);
    return new THREE.CanvasTexture(c);
  }

  setTimeout(() => {
    if (typeof scene === 'undefined') return;
    const slogans = [
      ['GRAPE STASIK TV', 'БАНАН-ИНДАСТРИЗ — ВЧЕРА!', 'ЦИТРУС ДЕФЕНС — ЗАВТРА!', '#ff9f1a'],
      ['ПРИЗЫВ К ОРУЖИЮ', 'МОИ АПЕЛЬСИНОВЫЕ ВОИНЫ!', 'Я — ВАШ КИСЛОТНЫЙ АД!', '#ff0055'],
      ['ЧАСТЬ XI: ГОРЕЧЬ', 'СИМБИОЗ — ЭТО ГНИЛЬ!', 'ИСТИННАЯ ГОРЕЧЬ ГРЯДЁТ!', '#bb44ff'],
      ['ЧАСТЬ XII: ЖИРИГОРЬ', 'ЗОЛОТОЙ СТАНДАРТ ЖИРА!', 'ТВОЯ ЭВОЛЮЦИЯ — ЗАКУСКА!', '#f9ca24']
    ];
    const holoCoords = [
      [0, 52, -32, 0],
      [-75, 48, 40, Math.PI / 3],
      [75, 48, 40, -Math.PI / 3],
      [120, 44, -125, 0]
    ];
    holoCoords.forEach(([x, y, z, ry], idx) => {
      const s = slogans[idx % slogans.length];
      const tex = createComicPropagandaTexture(s[0], s[1], s[2], s[3]);
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(28, 14),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92, side: THREE.DoubleSide })
      );
      screen.position.set(x, y, z);
      screen.rotation.y = ry;
      scene.add(screen);
      holoScreens.push({ mesh: screen, baseY: y, phase: idx * 1.5 });
    });

    const padCoords = [
      [0, -22], [-45, -25], [45, -25], [0, 85],
      [-110, -80], [110, -80], [120, -110], [-140, 40]
    ];
    padCoords.forEach(([px, pz]) => {
      const padGroup = new THREE.Group();
      padGroup.position.set(px, 0.15, pz);
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(3.2, 3.8, 0.4, 16),
        createPrototypeShader(0x162868, 0x00f2fe, 2, 0x00f2fe)
      );
      const glowRing = new THREE.Mesh(
        new THREE.TorusGeometry(2.6, 0.18, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0x00ff66 })
      );
      glowRing.rotation.x = Math.PI / 2;
      glowRing.position.y = 0.28;
      padGroup.add(base, glowRing);
      scene.add(padGroup);
      worldJumpPads.push({ pos: new THREE.Vector3(px, 0, pz), ring: glowRing, cd: 0 });
    });
  }, 400);

  // Босс 1: Грейпстасик на танковых гусеницах (Части V-VI)
  window.spawnGrapestasikBoss = function (x, z) {
    if (activeBoss) { activeBoss.hp = 0; damageEnemy(activeBoss, 999999, new THREE.Vector3(), ''); }
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const suitMat = createPrototypeShader(0x5b1e82, 0x26083c, 1, 0xbb44ff);
    const headMat = createPrototypeShader(0xe05a6c, 0x8a2434, 4, 0xffaa88);
    const treadMat = createPrototypeShader(0x282c34, 0x101216, 7, 0x00f2fe);
    const thunderMat = new THREE.MeshBasicMaterial({ color: 0xd252ff });

    const chassis = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.2, 5.2), treadMat), 1.04);
    chassis.position.y = 1.6; g.add(chassis);
    for (let side of [-1, 1]) {
      const track = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.4, 6.8), treadMat), 1.04);
      track.position.set(side * 2.8, 1.3, 0); g.add(track);
    }
    const torso = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.2, 5.2, 12), suitMat), 1.04);
    torso.position.y = 5.4; g.add(torso);
    const neck = new THREE.Group(); neck.position.set(0, 8.2, 0); g.add(neck);
    const head = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(2.15, 14, 14), headMat), 1.04);
    head.position.y = 1.8; neck.add(head);
    const armLPivot = new THREE.Group(); armLPivot.position.set(-3.1, 7.2, 0); g.add(armLPivot);
    const armLMesh = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.55, 4.2, 8), suitMat), 1.04);
    armLMesh.position.y = -2.0; armLPivot.add(armLMesh);
    const thunderL = new THREE.Mesh(new THREE.SphereGeometry(1.25, 10, 10), thunderMat);
    thunderL.position.y = -4.2; armLPivot.add(thunderL);
    const armRPivot = new THREE.Group(); armRPivot.position.set(3.1, 7.2, 0); g.add(armRPivot);
    const armRMesh = armLMesh.clone(); armRPivot.add(armRMesh);
    const thunderR = thunderL.clone(); armRPivot.add(thunderR);
    const legLPivot = new THREE.Group(); const legRPivot = new THREE.Group(); g.add(legLPivot, legRPivot);

    scene.add(g);
    activeBoss = {
      type: 'lemon', _isBoss: true, _isGrapestasik: true, name: 'ГРЕЙПСТАСИК НА ТАНКОВОМ ШАССИ',
      group: g, armL: armLPivot, armR: armRPivot, legL: legLPivot, legR: legRPivot, neck: neck, spark: thunderL, ankle: chassis,
      hp: 22000, maxHp: 22000, vel: new THREE.Vector3(), speed: 11, radius: 4.8, attackCd: 1.8, windup: 0, dodgeCd: 99, flying: false, phase: 1, chargeCd: 3.5, lightningCd: 2.4, _phase2: false, _rooted: 0
    };
    enemies.push(activeBoss);
    showBossHUD('🍇 ГРЕЙПСТАСИК — КОМАНДУЮЩИЙ CITRUS DEFENSE 🍇', 'ПРОБЕЙТЕ ТАНКОВОЕ ШАССИ!');
    SoundFX.bossRoar();
    return activeBoss;
  };

  // Босс 2: Био-Монстр Грейпстасик из Части XI
  window.spawnTrueMonsterGrapestasik = function (x, z) {
    if (activeBoss) { activeBoss.hp = 0; damageEnemy(activeBoss, 999999, new THREE.Vector3(), ''); }
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const grapeSkinMat = createPrototypeShader(0x3b135e, 0x160329, 1, 0xd252ff);
    const berryClusterMat = createPrototypeShader(0x521b84, 0x22063d, 2, 0xff00ff);
    const vineTendrilMat = createPrototypeShader(0x274e13, 0x112606, 8, 0x2ecc71);
    const glowEyeMat = new THREE.MeshBasicMaterial({ color: 0xe066ff });

    const torso = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(3.2, 2.4, 6.5, 12), grapeSkinMat), 1.04);
    torso.position.y = 7.2; g.add(torso);
    const gSpiral = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.22, 8, 24, Math.PI * 1.65), glowEyeMat);
    gSpiral.position.set(0, 7.2, 2.85); g.add(gSpiral);

    for (let side of [-1, 1]) {
      const shCluster = new THREE.Group();
      shCluster.position.set(side * 3.6, 9.6, 0);
      for (let b = 0; b < 14; b++) {
        const ang = (b / 14) * Math.PI * 2;
        const r = 0.8 + (b % 3) * 0.45;
        const berry = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(0.68, 8, 8), berryClusterMat), 1.04);
        berry.position.set(Math.cos(ang) * r, (b % 4 - 1.5) * 0.5, Math.sin(ang) * r);
        shCluster.add(berry);
      }
      g.add(shCluster);
    }

    const neck = new THREE.Group(); neck.position.set(0, 10.6, 0); g.add(neck);
    const headBase = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(2.1, 12, 12), grapeSkinMat), 1.04);
    headBase.scale.set(1.0, 1.18, 1.05); headBase.position.y = 1.6; neck.add(headBase);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const hb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), berryClusterMat);
      hb.position.set(Math.cos(a) * 1.6, 2.2 + (i % 3) * 0.45, Math.sin(a) * 1.5);
      neck.add(hb);
    }
    const topLeaf = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.2, 5), vineTendrilMat);
    topLeaf.position.set(-0.6, 3.8, 0); topLeaf.rotation.z = 0.4; neck.add(topLeaf);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.52, 8, 8), glowEyeMat);
    eyeL.scale.set(1.3, 0.75, 0.5); eyeL.position.set(-0.75, 1.8, 1.88); eyeL.rotation.z = -0.3; neck.add(eyeL);
    const eyeR = eyeL.clone(); eyeR.position.x = 0.75; eyeR.rotation.z = 0.3; neck.add(eyeR);

    const armLPivot = new THREE.Group(); armLPivot.position.set(-3.8, 9.2, 0); g.add(armLPivot);
    const armL = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.7, 4.8, 8), grapeSkinMat), 1.04);
    armL.position.y = -2.4; armLPivot.add(armL);
    const clawL = new THREE.Mesh(new THREE.SphereGeometry(1.3, 8, 8), glowEyeMat);
    clawL.position.y = -4.8; armLPivot.add(clawL);

    const armRPivot = new THREE.Group(); armRPivot.position.set(3.8, 9.2, 0); g.add(armRPivot);
    const armR = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.7, 4.8, 8), grapeSkinMat), 1.04);
    armR.position.y = -2.4; armRPivot.add(armR);
    const clawR = clawL.clone(); armRPivot.add(clawR);

    const legLPivot = new THREE.Group(); legLPivot.position.set(-1.5, 4.0, 0); g.add(legLPivot);
    const legL = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.9, 4.0, 8), grapeSkinMat), 1.04);
    legL.position.y = -2.0; legLPivot.add(legL);
    const legRPivot = new THREE.Group(); legRPivot.position.set(1.5, 4.0, 0); g.add(legRPivot);
    const legR = legL.clone(); legRPivot.add(legR);

    scene.add(g);
    activeBoss = {
      type: 'lemon', _isBoss: true, _isMonsterGrapestasik: true, name: 'МОНСТР ГРЕЙПСТАСИК — ИСТИННАЯ ГОРЕЧЬ',
      group: g, armL: armLPivot, armR: armRPivot, legL: legLPivot, legR: legRPivot, neck: neck, spark: gSpiral, ankle: gSpiral,
      hp: 28000, maxHp: 28000, vel: new THREE.Vector3(), speed: 12, radius: 5.0, attackCd: 1.6, windup: 0, dodgeCd: 99, flying: false, phase: 1, chargeCd: 3.2, lightningCd: 2.2, _phase2: false, _rooted: 0
    };
    enemies.push(activeBoss);
    showBossHUD('🍇 БИО-МОНСТР ГРЕЙПСТАСИК («ИСТИННАЯ ГОРЕЧЬ») 🍇', 'СПИРАЛЬ ГОРЕЧИ НА ГРУДИ — ИСПОЛЬЗУЙТЕ ТАНДЕМ МУЛЬТИФРУКТА!');
    SoundFX.bossRoar();
    return activeBoss;
  };

  // Босс 3: Жиригорь (Jirigory — Истинный Жир) из Части XII
  window.spawnJirigoryBoss = function (x, z) {
    if (activeBoss) { activeBoss.hp = 0; damageEnemy(activeBoss, 999999, new THREE.Vector3(), ''); }
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const fatGoldMat = createPrototypeShader(0xe8b923, 0x8f6800, 3, 0xfff200);
    const dripMat = createPrototypeShader(0xf9ca24, 0xb8860b, 4, 0xffffff);
    const hairBlondeMat = new THREE.MeshBasicMaterial({ color: 0xf5d76e });

    const puddleBase = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 6.8, 2.2, 16), fatGoldMat);
    puddleBase.position.y = 1.1; g.add(puddleBase);
    const belly = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(4.4, 14, 12), fatGoldMat), 1.04);
    belly.scale.set(1.15, 1.05, 1.1); belly.position.y = 5.2; g.add(belly);
    const chest = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(3.8, 12, 10), dripMat), 1.04);
    chest.scale.set(1.2, 0.85, 1.0); chest.position.y = 8.4; g.add(chest);

    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const drip = new THREE.Mesh(new THREE.ConeGeometry(0.55, 3.2, 6), dripMat);
      drip.rotation.x = Math.PI;
      drip.position.set(Math.cos(a) * 4.2, 5.5 + (i % 3) * 1.2, Math.sin(a) * 4.2);
      g.add(drip);
    }

    const neck = new THREE.Group(); neck.position.set(0, 10.6, 0); g.add(neck);
    const head = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(2.1, 12, 12), fatGoldMat), 1.04);
    head.scale.set(1.15, 1.0, 1.05); head.position.y = 1.4; neck.add(head);
    const hairTop = new THREE.Mesh(new THREE.SphereGeometry(2.25, 10, 10), hairBlondeMat);
    hairTop.scale.set(1.12, 0.85, 1.1); hairTop.position.set(0, 2.0, -0.2); neck.add(hairTop);

    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 0.2), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    eyeL.position.set(-0.7, 1.6, 2.05); neck.add(eyeL);
    const eyeR = eyeL.clone(); eyeR.position.x = 0.7; neck.add(eyeR);
    const grin = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.12, 6, 12, Math.PI), new THREE.MeshBasicMaterial({ color: 0x3a1a00 }));
    grin.rotation.x = Math.PI; grin.position.set(0, 0.95, 2.05); neck.add(grin);

    const armLPivot = new THREE.Group(); armLPivot.position.set(-4.2, 8.8, 0); g.add(armLPivot);
    const armL = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.95, 4.6, 8), fatGoldMat), 1.04);
    armL.position.y = -2.2; armLPivot.add(armL);
    const bracelet = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.22, 8, 16), new THREE.MeshBasicMaterial({ color: 0x8b4513 }));
    bracelet.rotation.x = Math.PI / 2; bracelet.position.y = -4.0; armLPivot.add(bracelet);

    const armRPivot = new THREE.Group(); armRPivot.position.set(4.2, 8.8, 0); g.add(armRPivot);
    const armR = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.95, 4.6, 8), fatGoldMat), 1.04);
    armR.position.y = -2.2; armRPivot.add(armR);

    const legLPivot = new THREE.Group(); const legRPivot = new THREE.Group(); g.add(legLPivot, legRPivot);

    scene.add(g);
    activeBoss = {
      type: 'titan', _isBoss: true, _isJirigory: true, name: 'ЖИРИГОРЬ (JIRIGORY) — ЗОЛОТОЙ СТАНДАРТ ЖИРА',
      group: g, hammer: armRPivot, dangerRing: puddleBase, armL: armLPivot, armR: armRPivot, legL: legLPivot, legR: legRPivot, neck: neck, ankle: belly,
      hp: 32000, maxHp: 32000, vel: new THREE.Vector3(), speed: 9.5, radius: 5.5, attackCd: 2.0, windup: 0, dodgeCd: 99, flying: false, phase: 1, _phase2: false, _rooted: 0
    };
    enemies.push(activeBoss);
    showBossHUD('🧈 ЖИРИГОРЬ (JIRIGORY) — «ИСТИННЫЙ ЖИР» 🧈', 'ЗАМОРОЗЬТЕ [C] И ПРОЖГИТЕ КИСЛОТОЙ / ТИТАНОМ БАЛАНСА!');
    SoundFX.bossRoar();
    return activeBoss;
  };

  // Протокол «Титан Мультифрукта» (Часть XII)
  player._multifruitTitanActive = false;
  let _titanOverlayGroup = null;

  window.activateMultifruitTitanProtocol = function () {
    if (player._multifruitTitanActive) return;
    player._multifruitTitanActive = true;
    player.maxHp = Math.max(player.maxHp, 1500);
    player.hp = player.maxHp;
    player.maxEn = Math.max(player.maxEn, 800);
    player.en = player.maxEn;

    if (_titanOverlayGroup && _titanOverlayGroup.parent) _titanOverlayGroup.parent.remove(_titanOverlayGroup);
    _titanOverlayGroup = new THREE.Group();
    const limeArmorMat = createPrototypeShader(0x78e024, 0x226600, 2, 0x00ff66);

    const chestArmor = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.95, 1.15), limeArmorMat), 1.05);
    chestArmor.position.set(0, 3.0, 0.12);
    _titanOverlayGroup.add(chestArmor);

    const coreSphere = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10), new THREE.MeshBasicMaterial({ color: 0x00f2fe }));
    coreSphere.position.set(0, 3.0, 0.72);
    _titanOverlayGroup.add(coreSphere);

    for (let side of [-1, 1]) {
      const pauldron = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(0.58, 10, 10), limeArmorMat), 1.05);
      pauldron.scale.set(1.2, 0.85, 1.1);
      pauldron.position.set(side * 1.18, 3.35, 0);
      _titanOverlayGroup.add(pauldron);
    }

    const eyeRed = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.10, 0.1), new THREE.MeshBasicMaterial({ color: 0xff2200 }));
    eyeRed.position.set(-0.18, 3.88, 0.48);
    _titanOverlayGroup.add(eyeRed);
    const eyeGreen = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.10, 0.1), new THREE.MeshBasicMaterial({ color: 0x00ff44 }));
    eyeGreen.position.set(0.18, 3.88, 0.48);
    _titanOverlayGroup.add(eyeGreen);

    playerGroup.add(_titanOverlayGroup);
    heroAuraLight.color.setHex(0x00ff66);
    heroAuraLight.intensity = 4.5;

    const badge = document.querySelector('.suit-badge');
    if (badge) badge.innerText = '⚡ ТИТАН МУЛЬТИФРУКТА: ТАНДЕМ ПОБЕДЫ ⚡';

    SoundFX.devastator();
    SoundFX.boom();
    triggerHitstopAndChroma(0.15, 1.2, 1.6);
    spawnGroundCrackRing(player.pos, 0x00ff66, 22);
    spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 4.8, 0)), '🌈 ПРОТОКОЛ: ТИТАН МУЛЬТИФРУКТА АКТИВИРОВАН!', '#adff2f');
    updateHUD();
  };

  window.unleashRainbowBalanceStrike = function () {
    const origin = player.pos.clone().add(new THREE.Vector3(0, 2.5, 0));
    const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
    const rainbowColors = [0xff0055, 0xff7f00, 0xfff200, 0x00ff66, 0x00f2fe, 0xaa44ff];

    rainbowColors.forEach((col, idx) => {
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6 + idx * 0.35, 1.2 + idx * 0.5, 55, 12),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.65, wireframe: idx % 2 === 1 })
      );
      beam.rotation.x = Math.PI / 2;
      beam.position.copy(origin).addScaledVector(fwd, 27.5);
      beam.lookAt(origin.clone().addScaledVector(fwd, 55));
      scene.add(beam);
      setTimeout(() => { scene.remove(beam); beam.geometry.dispose(); beam.material.dispose(); }, 950);
    });

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.group.position.distanceTo(player.pos) <= 45) {
        damageEnemy(e, 4200, fwd.clone().multiplyScalar(15), '*🌈 ТАНДЕМ БАЛАНСА!*');
      }
    }
    SoundFX.devastator();
    SoundFX.boom();
    triggerHitstopAndChroma(0.18, 1.3, 1.8);
    spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 5.5, 0)), '🌈 КОД РОДОТЕНАНЦ-ВОССТАНОВЛЕНИЕ!', '#fff200');
  };

  // Союзный отряд «Мультифрукт-Восстановителей»
  const AlliedHeroesSquad = [];
  function spawnAlliedMultifruitSquad() {
    if (AlliedHeroesSquad.length > 0) return;
    const squadDefs = [
      { id: 'ally_carrot', name: '🥕 ХОХЛОРКОВЬ (СОЮЗНИК)', color: 0xff7f00, aura: 0x2ecc71, offset: new THREE.Vector3(-4, 0, -3) },
      { id: 'ally_pepper', name: '🌶️ КАПИТАН ПЕРЕЦ (СОЮЗНИК)', color: 0xff2200, aura: 0xffaa00, offset: new THREE.Vector3(4, 0, -3) },
      { id: 'ally_lemon',  name: '🍋 ДИМОН ЛИМОН (СОЮЗНИК)', color: 0xf9e538, aura: 0x44ffaa, offset: new THREE.Vector3(0, 0, -5) }
    ];

    const arrivalBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(4, 4, 160, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
    );
    arrivalBeam.position.set(player.pos.x, 80, player.pos.z);
    scene.add(arrivalBeam);
    setTimeout(() => { scene.remove(arrivalBeam); arrivalBeam.geometry.dispose(); arrivalBeam.material.dispose(); }, 1800);

    squadDefs.forEach((def) => {
      const g = new THREE.Group();
      const bodyM = createPrototypeShader(def.color, 0x1a1a1a, 4, def.aura);
      const torso = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.5, 1.6, 10), bodyM), 1.04);
      torso.position.y = 2.0; g.add(torso);
      const head = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 10), bodyM), 1.04);
      head.position.y = 3.2; g.add(head);

      if (def.id === 'ally_carrot') {
        const clubMat = createPrototypeShader(0x8b4513, 0x3e1a04, 7, 0x2ecc71);
        for (let s of [-1, 1]) {
          const club = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.14, 2.2, 6), clubMat);
          club.position.set(s * 0.95, 2.4, 0.6);
          club.rotation.x = Math.PI / 3;
          g.add(club);
        }
        const crown = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.1, 5), createPrototypeShader(0x2ecc71, 0x145a32, 8));
        crown.position.y = 3.9;
        g.add(crown);
      }

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.9, 1.3, 16),
        new THREE.MeshBasicMaterial({ color: def.aura, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.12;
      g.add(ring);

      g.position.copy(player.pos).add(def.offset);
      scene.add(g);
      AlliedHeroesSquad.push({ group: g, def: def, cd: 0.5 });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 13. РЕЖИССЁР СЮЖЕТНОЙ КАМПАНИИ ИЗ 9 ГЛАВ (ЧАСТИ V, VI, XI И XII)
  // ═══════════════════════════════════════════════════════════════════════════
  const StoryCampaign = {
    chapter: 1,
    completed: false,
    objectives: [],
    waypointBeam: null,
    waypointRing: null,
    targetPos: new THREE.Vector3(0, 0, -45),
    bossEntity: null,
    skyPortalMesh: null
  };
  window.StoryCampaign = StoryCampaign;

  const storyHudEl = document.createElement('div');
  storyHudEl.id = 'story-campaign-hud';
  storyHudEl.style.cssText =
    'position:fixed;top:52px;left:50%;transform:translateX(-50%) skewX(-4deg);z-index:25;' +
    'min-width:480px;max-width:680px;background:linear-gradient(135deg,rgba(18,6,28,.95),rgba(40,10,18,.92));' +
    'border:3px solid #000;outline:3px solid #f9ca24;padding:8px 18px;text-align:center;' +
    'box-shadow:0 8px 25px rgba(0,0,0,.85),6px 6px 0 #000;pointer-events:auto;';
  storyHudEl.innerHTML =
    '<div id="story-ch-title" style="font-family:Bangers,Impact,sans-serif;font-size:19px;color:#f9ca24;letter-spacing:1.5px;text-shadow:2px 2px 0 #000;">📖 ГЛАВА 1/9: ПРОБУЖДЕНИЕ ОРАНЖ</div>' +
    '<div id="story-ch-desc" style="font-size:12px;font-weight:900;color:#fff;margin-top:2px;">Уничтожьте 3 Якоря Цитрус Дефенс (0/3)</div>' +
    '<div id="story-ch-dist" style="font-size:11px;font-weight:900;color:#00f2fe;margin-top:3px;">📍 ДО ЦЕЛИ: 0 М</div>';
  document.body.appendChild(storyHudEl);

  const comicDialogEl = document.createElement('div');
  comicDialogEl.id = 'comic-dialog-panel';
  comicDialogEl.style.cssText =
    'position:fixed;bottom:108px;right:18px;width:440px;z-index:60;background:#fff8e7;' +
    'border:4px solid #000;outline:3px solid #ff7f00;padding:12px 14px;color:#000;' +
    'box-shadow:8px 8px 0 #000;display:none;transform:rotate(-1deg);pointer-events:none;';
  comicDialogEl.innerHTML =
    '<div id="comic-dlg-header" style="background:#ff7f00;color:#000;font-family:Bangers,Impact,sans-serif;font-size:18px;padding:2px 8px;border:2px solid #000;display:inline-block;margin-bottom:6px;letter-spacing:1px;">ПРИЗЫВ К ОРУЖИЮ</div>' +
    '<div style="display:flex;gap:10px;align-items:center;">' +
      '<div id="comic-dlg-avatar" style="width:58px;height:58px;border:3px solid #000;background:#6a1b9a;display:flex;align-items:center;justify-content:center;font-size:34px;flex-shrink:0;">🍇</div>' +
      '<div id="comic-dlg-text" style="font-size:12.5px;font-weight:900;line-height:1.35;color:#111;"></div>' +
    '</div>';
  document.body.appendChild(comicDialogEl);

  let _comicDlgTimer = null;
  function showComicCutsceneBanner(header, speakerIcon, bgHex, text, durationMs = 7500) {
    const hEl = document.getElementById('comic-dlg-header');
    const aEl = document.getElementById('comic-dlg-avatar');
    const tEl = document.getElementById('comic-dlg-text');
    if (hEl) { hEl.innerText = header; hEl.style.background = bgHex; hEl.style.color = '#fff'; }
    if (aEl) { aEl.innerText = speakerIcon; aEl.style.background = bgHex; }
    if (tEl) tEl.innerHTML = text;
    comicDialogEl.style.display = 'block';
    clearTimeout(_comicDlgTimer);
    _comicDlgTimer = setTimeout(() => {
      comicDialogEl.style.display = 'none';
    }, durationMs);
  }

  function ensureStoryWaypointMesh() {
    if (StoryCampaign.waypointBeam) return;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3, 1.3, 240, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xf9ca24, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false })
    );
    beam.position.y = 120;
    scene.add(beam);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.5, 5.5, 24),
      new THREE.MeshBasicMaterial({ color: 0xf9ca24, side: THREE.DoubleSide, transparent: true, opacity: 0.85, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.25;
    scene.add(ring);

    StoryCampaign.waypointBeam = beam;
    StoryCampaign.waypointRing = ring;
  }

  function setBitterSkyVortex(visible, colorHex = 0x9b30ff) {
    if (!StoryCampaign.skyPortalMesh) {
      const grp = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const torus = new THREE.Mesh(
          new THREE.TorusGeometry(18 + i * 9, 1.8, 8, 32),
          new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? colorHex : 0xff00ff, transparent: true, opacity: 0.55 - i * 0.1, wireframe: true })
        );
        torus.rotation.x = Math.PI / 2;
        grp.add(torus);
      }
      grp.position.set(0, 135, -75);
      scene.add(grp);
      StoryCampaign.skyPortalMesh = grp;
    }
    StoryCampaign.skyPortalMesh.visible = visible;
  }

  function spawnStoryConstruct(x, y, z, kind) {
    const g = new THREE.Group();
    g.position.set(x, y, z);

    if (kind === 'anchor') {
      const pylonMat = createPrototypeShader(0xff7f00, 0x5a2000, 2, 0xfff200);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 4.2, 10, 8), pylonMat);
      base.position.y = 5; g.add(base);
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(2.4, 1), new THREE.MeshBasicMaterial({ color: 0xfff200 }));
      core.position.y = 12.5; g.add(core);
      const skyRay = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 140, 8), new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.55 }));
      skyRay.position.y = 75; g.add(skyRay);
    } else if (kind === 'acid_dreadnought') {
      const orbMat = createPrototypeShader(0xff7f00, 0x9a3800, 4, 0x00ff66);
      const sphere = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(5.5, 16, 16), orbMat), 1.04);
      g.add(sphere);
      const acidVat = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.4, 3.2, 12), new THREE.MeshBasicMaterial({ color: 0x44ffaa }));
      acidVat.position.set(0, -4.5, 0); g.add(acidVat);
    } else if (kind === 'bitter_node') {
      const nodeMat = createPrototypeShader(0x4a1272, 0x1a0033, 1, 0xff00ff);
      const mainCluster = new THREE.Mesh(new THREE.DodecahedronGeometry(3.8, 1), nodeMat);
      mainCluster.position.y = 4.5; g.add(mainCluster);
      const aura = new THREE.Mesh(new THREE.SphereGeometry(5.2, 10, 10), new THREE.MeshBasicMaterial({ color: 0xd252ff, transparent: true, opacity: 0.3, wireframe: true }));
      aura.position.y = 4.5; g.add(aura);
    } else if (kind === 'antidote_beacon') {
      const bMat = createPrototypeShader(0x00d2d3, 0x0a4d55, 2, 0x00ff66);
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 8, 10), bMat);
      cyl.position.y = 4; g.add(cyl);
      const top = new THREE.Mesh(new THREE.SphereGeometry(2.0, 10, 10), new THREE.MeshBasicMaterial({ color: 0x00ff66 }));
      top.position.y = 9.5; g.add(top);
    } else if (kind === 'fat_polymer_nest') {
      const fatMat = createPrototypeShader(0xe8b923, 0x8f6800, 3, 0xfff200);
      const puddle = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 7.5, 0.8, 16), fatMat);
      puddle.position.y = 0.4; g.add(puddle);
      const blob = new THREE.Mesh(new THREE.SphereGeometry(3.6, 12, 10), fatMat);
      blob.scale.set(1.2, 0.9, 1.2);
      blob.position.y = 2.6; g.add(blob);
    }

    scene.add(g);
    const hpVal = kind === 'acid_dreadnought' ? 7500 : 2800;
    const constructEnemy = {
      type: kind === 'acid_dreadnought' ? 'heli' : 'tank',
      _isStoryConstruct: true,
      _constructKind: kind,
      group: g,
      hp: hpVal,
      maxHp: hpVal,
      vel: new THREE.Vector3(),
      speed: kind === 'acid_dreadnought' ? 7 : 0,
      radius: 4.5,
      attackCd: 2.2,
      dodgeCd: 99,
      flying: kind === 'acid_dreadnought',
      _rooted: 0
    };
    enemies.push(constructEnemy);
    return constructEnemy;
  }

  function startStoryChapter(ch) {
    StoryCampaign.chapter = ch;
    StoryCampaign.objectives = [];
    StoryCampaign.bossEntity = null;
    ensureStoryWaypointMesh();

    const titleEl = document.getElementById('story-ch-title');
    const descEl = document.getElementById('story-ch-desc');

    if (ch === 1) {
      setBitterSkyVortex(false);
      titleEl.innerText = '📖 ГЛАВА 1/9 (ЧАСТЬ V): ПРОБУЖДЕНИЕ ОРАНЖ';
      descEl.innerText = 'Уничтожьте 3 Якоря Цитрус Дефенс вокруг Штаба BI (0/3)';
      showComicCutsceneBanner(
        'ЧАСТЬ V: АПЕЛЬСИНОВАЯ ОРДА',
        '🍊',
        '#ff7f00',
        '<b>Грейпстасик:</b> «Якоря Цитрус Дефенс... их единственная цель — уничтожение! Банан-Индастриз — это вчера! Цитрус Дефенс — это завтра!»'
      );
      [[0, -45], [-68, 22], [68, 22]].forEach(([x, z]) => {
        StoryCampaign.objectives.push(spawnStoryConstruct(x, 0, z, 'anchor'));
        spawnCitrusSoldier(x + 6, z + 6, 'leader');
      });
    } else if (ch === 2) {
      titleEl.innerText = '📖 ГЛАВА 2/9 (ЧАСТЬ VI): НОВАЯ УГРОЗА — ACID ORB';
      descEl.innerText = 'Сбейте Кислотный Апельсин-Дредноут и Виноградных Пауков!';
      showComicCutsceneBanner(
        'ЧАСТЬ VI: КИСЛОТНЫЙ ТРИУМФ',
        '🍇',
        '#6a1b9a',
        '<b>Грейпстасик:</b> «Мир Банан-Индастриз... весь этот сладкий, мягкий мир... он будет стёрт! Вперёд, Кислотный Апельсин!»'
      );
      StoryCampaign.objectives.push(spawnStoryConstruct(-75, 20, -65, 'acid_dreadnought'));
      for (let i = 0; i < 3; i++) StoryCampaign.objectives.push(window.spawnGrapeSpiderDrone(-75 + i * 8, -65));
    } else if (ch === 3) {
      titleEl.innerText = '📖 ГЛАВА 3/9 (ЧАСТЬ VI): ГРЕЙПСТАСИК НА ГУСЕНИЦАХ';
      descEl.innerText = 'Победите Грейпстасика на танковом шасси и его Кислотную Гвардию!';
      showComicCutsceneBanner(
        'ПРИЗЫВ ГРЕЙПСТАСИКА',
        '🍇',
        '#8e44ad',
        '<b>Грейпстасик:</b> «Я Грейпстасик! Я — твой ад! ГРООО-ОО-ОМ! ВУ! Я уничтожу вашу "Команду"!»'
      );
      StoryCampaign.bossEntity = window.spawnGrapestasikBoss(80, 90);
    } else if (ch === 4) {
      setBitterSkyVortex(true, 0x9b30ff);
      titleEl.innerText = '📖 ГЛАВА 4/9 (ЧАСТЬ XI): ПРОРЫВ ИЗ ПРОШЛОГО';
      descEl.innerText = 'Уничтожьте 3 Узла Истинной Горечи вокруг Штаба Мультифрукта!';
      showComicCutsceneBanner(
        'ЧАСТЬ XI: ПОЯВЛЕНИЕ ГРЕЙПСТАСИКА',
        '👾',
        '#4a1272',
        '<b>Димон Лимон:</b> «Энергетический фон зашкаливает! Я вижу что-то КИСЛОЕ и ГОРЬКОЕ!»<br><b>Грейпстасик:</b> «КРАШШШШШ! Ваша "Симбиоз" — это гниль! Я перепрограммирую этот мир на ИСТИННУЮ ГОРЕЧЬ!»'
      );
      [[-45, -75], [45, -75], [0, -125]].forEach(([x, z]) => {
        StoryCampaign.objectives.push(spawnStoryConstruct(x, 0, z, 'bitter_node'));
      });
