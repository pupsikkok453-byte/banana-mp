// ============================================================================
// BANANA INDUSTRIES — MERGED GLOBAL PATCH v200 (SAGA + NEXT-GEN OVERHAUL)
// Объединение v110 (18 глав, соло-боссы, гарпун 240м, крио, тюрьма)
// и v65 (Sky-Rails, Evo-Модули, анатомическая геометрия, кинематика, рэгдоллы).
// 100% сохранение всех механик, сюжета и правок v53–v110.
// ============================================================================
(function () {
  'use strict';

  if (window.__BANANA_MERGED_V200) return;
  window.__BANANA_MERGED_V200 = true;

  console.log('🍌 [BANANA MERGED v200] Загрузка: 18 глав саги + 4 соло-босса + Sky-Rails + Evo-Модули + Кинематика...');

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 1. УЛУЧШЕННЫЙ ШЕЙДЕР (SSS + ЦЕДРА + КОНТРАСТ) — из v110
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

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    float fbm(vec2 p){
      float v = 0.0, a = 0.5;
      for(int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.04; a *= 0.5; }
      return v;
    }
    void main(){
      vec3 N = normalize(vNormal);
      vec3 V = normalize(vViewPos);
      vec3 baseCol = uCol1;
      float metal = 0.12;
      float roughness = 0.48;
      float specPow = 42.0;
      float sssWeight = 0.30;
      vec3 emisCol = vec3(0.0);

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
        metal = 0.28; roughness = 0.40 - wet * 0.24; specPow = 64.0; sssWeight = 0.72;
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
      float celShade = mix(diffWrap1, smoothstep(0.18, 0.22, diffWrap1) * 0.55 + smoothstep(0.55, 0.62, diffWrap1) * 0.45, 0.28);
      vec3 diffCol = baseCol * (uLightCol * celShade * 0.85 + uFillCol * diffWrap2 * 0.26 + vec3(0.06, 0.07, 0.11));
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
        if (!cached._mergedV200) {
          cached.vertexShader = PROTO_VERTEX_SHADER;
          cached.fragmentShader = PROTO_FRAGMENT_SHADER;
          cached._mergedV200 = true;
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
          ? globalShaderUniforms.uTime : { value: 0 }
      },
      vertexShader: PROTO_VERTEX_SHADER,
      fragmentShader: PROTO_FRAGMENT_SHADER
    });
    mat._mergedV200 = true;
    if (typeof _shaderCache !== 'undefined') _shaderCache.set(k, mat);
    if (typeof _cachedShaderSet !== 'undefined') _cachedShaderSet.add(mat);
    return mat;
  };

  function upgradeGraphicsPipeline() {
    if (typeof _shaderCache !== 'undefined') {
      _shaderCache.forEach((mat) => {
        if (mat && mat.isShaderMaterial && !mat._mergedV200) {
          mat.vertexShader = PROTO_VERTEX_SHADER;
          mat.fragmentShader = PROTO_FRAGMENT_SHADER;
          mat._mergedV200 = true;
          mat.needsUpdate = true;
        }
      });
    }
    if (typeof scene !== 'undefined') {
      scene.traverse((obj) => {
        if (obj.material && obj.material.isShaderMaterial && obj.material.uniforms && obj.material.uniforms.uCol1) {
          if (!obj.material._mergedV200) {
            obj.material.vertexShader = PROTO_VERTEX_SHADER;
            obj.material.fragmentShader = PROTO_FRAGMENT_SHADER;
            obj.material._mergedV200 = true;
            obj.material.needsUpdate = true;
          }
        }
      });
    }
    if (typeof renderer !== 'undefined') renderer.toneMappingExposure = 1.35;
    if (typeof hemiLight !== 'undefined') {
      hemiLight.intensity = 1.15;
      hemiLight.color.setHex(0x99ddff);
      hemiLight.groundColor.setHex(0x281822);
    }
    if (typeof moonLight !== 'undefined') moonLight.intensity = 1.55;
    if (typeof rebuildHeroMesh === 'function' && typeof player !== 'undefined' && player.mesh) {
      rebuildHeroMesh();
    }
  }
  setTimeout(upgradeGraphicsPipeline, 80);

  function getSafeOpenGroundPos(x, z, extraMargin = 6) {
    let sx = x, sz = z;
    if (typeof buildings === 'undefined') return new THREE.Vector3(sx, 0, sz);
    for (let iter = 0; iter < 8; iter++) {
      let inside = false;
      for (let i = 0; i < buildings.length; i++) {
        const b = buildings[i];
        if (sx > b.minX - extraMargin && sx < b.maxX + extraMargin && sz > b.minZ - extraMargin && sz < b.maxZ + extraMargin) {
          inside = true;
          const dxMin = Math.abs(sx - (b.minX - extraMargin));
          const dxMax = Math.abs(sx - (b.maxX + extraMargin));
          const dzMin = Math.abs(sz - (b.minZ - extraMargin));
          const dzMax = Math.abs(sz - (b.maxZ + extraMargin));
          const m = Math.min(dxMin, dxMax, dzMin, dzMax);
          if (m === dxMin) sx = b.minX - extraMargin - 2;
          else if (m === dxMax) sx = b.maxX + extraMargin + 2;
          else if (m === dzMin) sz = b.minZ - extraMargin - 2;
          else sz = b.maxZ + extraMargin + 2;
        }
      }
      if (!inside) break;
    }
    return new THREE.Vector3(sx, 0, sz);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 2. EVO-МОДУЛИ (из v65) + TOAST + КОРОННЫЕ ФРАЗЫ
  // ═══════════════════════════════════════════════════════════════════════════
  const EVO_STORAGE_KEY = 'banana_v200_evo_modules';
  const EvoModules = {
    owned: {},
    load() {
      try {
        const raw = localStorage.getItem(EVO_STORAGE_KEY);
        if (raw) this.owned = JSON.parse(raw) || {};
      } catch (e) { this.owned = {}; }
    },
    save() { try { localStorage.setItem(EVO_STORAGE_KEY, JSON.stringify(this.owned)); } catch (e) {} },
    has(id) { return !!this.owned[id]; },
    buy(id, cost) {
      if (this.has(id) || typeof player === 'undefined' || player.ep < cost) return false;
      player.ep -= cost;
      this.owned[id] = true;
      this.save();
      if (typeof Save !== 'undefined' && Save.save) Save.save();
      if (typeof updateHUD === 'function') updateHUD();
      return true;
    }
  };
  EvoModules.load();
  window.__EVO_MODULES = EvoModules;

  window.__SKY_RAILS = [];
  window.__RAGDOLLS = [];
  window.__AERIAL_SPEEDERS = [];
  window.__STREET_HYDRANTS = [];
  const activeTimedZones = [];
  const activeDebrisPieces = [];
  const activeChainArcs = [];

  const toastContainer = document.createElement('div');
  toastContainer.id = 'merged-toast-container';
  toastContainer.style.cssText = 'position:fixed;top:92px;right:18px;z-index:85;display:flex;flex-direction:column;gap:8px;pointer-events:none;max-width:360px;';
  document.body.appendChild(toastContainer);

  function showPatchToast(title, text, borderColor) {
    const el = document.createElement('div');
    el.style.cssText = 'background:rgba(10,14,18,0.94);border:2px solid #000;outline:2px solid ' + (borderColor || '#f9ca24') + ';padding:8px 12px;color:#fff;font-size:12px;font-weight:800;transform:skewX(-4deg);box-shadow:5px 5px 0 #000;transition:opacity 0.25s, transform 0.25s;';
    el.innerHTML = '<div style="color:' + (borderColor || '#f9ca24') + ';font-family:Bangers,Impact,sans-serif;font-size:16px;letter-spacing:1px;">' + title + '</div><div style="color:#eaffea;margin-top:2px;">' + text + '</div>';
    toastContainer.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'skewX(-4deg) translateX(30px)'; setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 260); }, 3200);
  }
  window.showPatchToast = showPatchToast;

  const POTATO_QUOTES = [
    'Моргенкартошка: «Крахмал в жилах — молот в руках!»',
    'Моргенкартошка: «Кто не спрятался — тот пюре!»',
    'Моргенкартошка: «Белорусский джаггернаут на связи!»',
    'Громтомат: «Томатная паста из цитрусов готова!»',
    'Громтомат: «Жарьте соус, сейчас будет Сверхнова!»'
  ];

  if (typeof window.sayShrekich === 'function') {
    const _origSayShrekichM = window.sayShrekich;
    window.sayShrekich = function (text, silent) {
      if (window.__POTATO_MODE) return;
      return _origSayShrekichM.call(this, text, silent);
    };
  }
  if (typeof ShrekichVoice !== 'undefined' && typeof ShrekichVoice.speak === 'function') {
    const _origSpeakM = ShrekichVoice.speak;
    ShrekichVoice.speak = function (text) {
      if (window.__POTATO_MODE) return;
      return _origSpeakM.call(this, text);
    };
  }

  function sendMP(type, payload) {
    try { if (window.__MP && window.__MP.room && typeof window.__MP.room.send === 'function') window.__MP.room.send(type, payload); } catch (e) {}
  }

  if (typeof window.addProp === 'function') {
    const _origAddPropM = window.addProp;
    window.addProp = function (x, z, type) { if (type === 'bush') return; return _origAddPropM.apply(this, arguments); };
  }

  function fixCarrotMeshGround() {
    if (typeof player === 'undefined' || !player.mesh || !player.mesh.userData || !player.mesh.userData.isCarrot) return;
    try {
      player.mesh.position.y = 0;
      player.mesh.updateMatrixWorld(true);
      const bbox = new THREE.Box3().setFromObject(player.mesh);
      const scaleY = (typeof playerGroup !== 'undefined' && playerGroup.scale.y) || 1;
      if (bbox.min.y < 0.1) player.mesh.position.y += (0.1 - bbox.min.y) / scaleY;
    } catch (e) {}
  }
  window.fixCarrotMeshGround = fixCarrotMeshGround;
  setInterval(fixCarrotMeshGround, 500);

  if (typeof TimeOfDay !== 'undefined') TimeOfDay.speed = 1 / 90;

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 3. NEON SKY-RAILS (из v65) — 40 кабелей с гриндом
  // ═══════════════════════════════════════════════════════════════════════════
  function buildNeonSkyRails() {
    if (typeof buildings === 'undefined' || buildings.length < 4 || window.__SKY_RAILS.length > 0) return;
    const tallBuildings = buildings.filter((b) => b && b.topY > 35 && Math.abs(b.x) < 1800 && Math.abs(b.z) < 1800);
    const railColors = [0x00f2fe, 0xff0055, 0xf9ca24];
    const usedPairs = new Set();
    const candidatePairs = [];
    for (let i = 0; i < tallBuildings.length; i++) {
      for (let j = i + 1; j < tallBuildings.length; j++) {
        const b1 = tallBuildings[i], b2 = tallBuildings[j];
        const dist = Math.hypot(b1.x - b2.x, b1.z - b2.z);
        if (dist >= 45 && dist <= 165) candidatePairs.push({ b1, b2, dist });
      }
    }
    candidatePairs.sort((a, b) => Math.abs(a.dist - 95) - Math.abs(b.dist - 95));
    const maxRails = Math.min(40, candidatePairs.length);
    const pulseTorusGeo = new THREE.TorusGeometry(0.52, 0.09, 6, 12);
    for (let idx = 0; idx < maxRails; idx++) {
      const pair = candidatePairs[idx];
      const key = pair.b1.x + ',' + pair.b1.z + '|' + pair.b2.x + ',' + pair.b2.z;
      if (usedPairs.has(key)) continue;
      usedPairs.add(key);
      const pStart = new THREE.Vector3(pair.b1.x, pair.b1.topY + 0.6, pair.b1.z);
      const pEnd = new THREE.Vector3(pair.b2.x, pair.b2.topY + 0.6, pair.b2.z);
      const sag = Math.min(12, pair.dist * 0.08);
      const pMid1 = pStart.clone().lerp(pEnd, 0.33); pMid1.y -= sag * 0.85;
      const pMid2 = pStart.clone().lerp(pEnd, 0.66); pMid2.y -= sag * 0.85;
      const curve = new THREE.CatmullRomCurve3([pStart, pMid1, pMid2, pEnd]);
      const colHex = railColors[idx % railColors.length];
      const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.28, 6, false);
      const tubeMat = new THREE.MeshBasicMaterial({ color: colHex });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      scene.add(tubeMesh);
      const pylonMat = createPrototypeShader(0x242c38, 0x0a0d12, 2, colHex);
      for (const anchorPt of [pStart, pEnd]) {
        const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.8, 6), pylonMat);
        pylon.position.copy(anchorPt).add(new THREE.Vector3(0, 0.3, 0));
        scene.add(pylon);
      }
      const pulseRings = [];
      for (let p = 0; p < 2; p++) {
        const prMesh = new THREE.Mesh(pulseTorusGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
        scene.add(prMesh);
        pulseRings.push({ mesh: prMesh, t: p * 0.5 });
      }
      window.__SKY_RAILS.push({
        id: idx, curve, mesh: tubeMesh, color: colHex, length: curve.getLength(),
        pulseRings, bboxCenter: pStart.clone().lerp(pEnd, 0.5), maxHalfSpan: pair.dist * 0.6 + 15
      });
    }
    console.log('⚡ [MERGED] Построено неоновых Sky-Rail: ' + window.__SKY_RAILS.length);
  }

  function findClosestSkyRailPoint(pos, maxDist) {
    let bestRail = null, bestT = 0, bestPt = null, bestDistSq = maxDist * maxDist;
    for (let i = 0; i < window.__SKY_RAILS.length; i++) {
      const r = window.__SKY_RAILS[i];
      const dxC = pos.x - r.bboxCenter.x, dzC = pos.z - r.bboxCenter.z;
      if (dxC * dxC + dzC * dzC > r.maxHalfSpan * r.maxHalfSpan) continue;
      const steps = 16;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const pt = r.curve.getPoint(t);
        const dSq = pt.distanceToSquared(pos);
        if (dSq < bestDistSq) { bestDistSq = dSq; bestRail = r; bestT = t; bestPt = pt; }
      }
    }
    if (!bestRail) return null;
    let fineT = bestT;
    for (let delta of [-0.03, -0.015, 0.015, 0.03]) {
      const nt = Math.max(0, Math.min(1, bestT + delta));
      const npt = bestRail.curve.getPoint(nt);
      const dSq = npt.distanceToSquared(pos);
      if (dSq < bestDistSq) { bestDistSq = dSq; fineT = nt; bestPt = npt; }
    }
    return { rail: bestRail, t: fineT, point: bestPt, dist: Math.sqrt(bestDistSq) };
  }

  function startSkyRailGrind(hit) {
    if (!hit || !hit.rail || player.isDead) return;
    player.isGrinding = true;
    player._grindRail = hit.rail;
    player._grindT = hit.t;
    player._grindCooldown = 0.35;
    const tangent = hit.rail.curve.getTangent(hit.t).normalize();
    const lookFwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw)).normalize();
    player._grindDir = tangent.dot(lookFwd) >= -0.1 ? 1 : -1;
    player.isGrounded = false;
    player.isFlying = false;
    player.isWallRunning = false;
    player.isBulletdropping = false;
    player.vel.set(0, 0, 0);
    player.momentum = 1.0;
    player.momentumMult = 1.8;
    const speedLines = document.getElementById('speed-lines');
    if (speedLines) speedLines.classList.add('hot');
    if (typeof postUniforms !== 'undefined' && postUniforms.uRadialBlur) postUniforms.uRadialBlur.value = 0.85;
    if (typeof SoundFX !== 'undefined') SoundFX.swing(540);
    if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3.2, 0)), '⚡ NEON SKY-RAIL GRIND! x1.8 ⚡', '#00f2fe');
  }

  function exitSkyRailGrind(withJumpFlip) {
    if (!player.isGrinding) return;
    const rail = player._grindRail;
    const t = player._grindT || 0.5;
    const dirSign = player._grindDir || 1;
    let tangent = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
    if (rail && rail.curve) tangent = rail.curve.getTangent(Math.max(0, Math.min(1, t))).normalize().multiplyScalar(dirSign);
    player.isGrinding = false;
    player._grindRail = null;
    player._grindCooldown = 0.45;
    const speedLines = document.getElementById('speed-lines');
    if (speedLines) speedLines.classList.remove('hot');
    if (withJumpFlip) {
      player.vel.set(tangent.x * 58, 28, tangent.z * 58);
      player.airFlipTimer = 0.55;
      player.isGrounded = false;
      if (typeof SoundFX !== 'undefined') SoundFX.whip();
      if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '*САЛЬТО С РЕЛЬСА!*', '#f9ca24');
    } else {
      player.vel.set(tangent.x * 42, 8, tangent.z * 42);
    }
  }

  function updateSkyRailsAndGrinding(dt, now) {
    if (player._grindCooldown > 0) player._grindCooldown = Math.max(0, player._grindCooldown - dt);
    for (let i = 0; i < window.__SKY_RAILS.length; i++) {
      const r = window.__SKY_RAILS[i];
      if (r.bboxCenter.distanceToSquared(player.pos) > 260 * 260) continue;
      for (let p = 0; p < r.pulseRings.length; p++) {
        const pr = r.pulseRings[p];
        pr.t = (pr.t + dt * 0.45) % 1.0;
        const pt = r.curve.getPoint(pr.t);
        const tan = r.curve.getTangent(pr.t);
        pr.mesh.position.copy(pt);
        pr.mesh.lookAt(pt.clone().add(tan));
      }
    }
    if (player.isGrinding && player._grindRail) {
      const rail = player._grindRail;
      const grindSpeed = 75;
      const dtParam = (grindSpeed / Math.max(10, rail.length)) * dt * player._grindDir;
      player._grindT += dtParam;
      if (player._grindT >= 1.0 || player._grindT <= 0.0) {
        player._grindT = Math.max(0, Math.min(1, player._grindT));
        exitSkyRailGrind(true);
        return;
      }
      const pt = rail.curve.getPoint(player._grindT);
      const tangent = rail.curve.getTangent(player._grindT).normalize().multiplyScalar(player._grindDir);
      player.pos.copy(pt).add(new THREE.Vector3(0, 0.35, 0));
      player.vel.set(0, 0, 0);
      player.isGrounded = false;
      player.facingYaw = Math.atan2(-tangent.x, -tangent.z);
      player.momentum = 1.0;
      player.momentumMult = 1.8;
      const speedLines = document.getElementById('speed-lines');
      if (speedLines) speedLines.classList.add('hot');
      if (typeof postUniforms !== 'undefined' && postUniforms.uRadialBlur) postUniforms.uRadialBlur.value = 0.85;
      const crossTurn = tangent.x * Math.cos(player.camYaw) - tangent.z * Math.sin(player.camYaw);
      player.camRoll = THREE.MathUtils.lerp(player.camRoll, THREE.MathUtils.clamp(crossTurn * 0.35, -0.32, 0.32), Math.min(1, dt * 10));
      if (Math.random() < 0.85 && typeof spawnSparks === 'function') spawnSparks(player.pos.clone().add(new THREE.Vector3(0, 0.1, 0)), 2, rail.color);
      return;
    }
    if (!player.isGrinding && (!player._grindCooldown || player._grindCooldown <= 0) && player.pos.y > 12) {
      if (!player.isGrounded || keys['Space']) {
        const hit = findClosestSkyRailPoint(player.pos, 4.5);
        if (hit && (keys['Space'] || (player.vel.y <= 2 && player.pos.y >= hit.point.y - 1.5))) startSkyRailGrind(hit);
      }
    }
  }

  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' && typeof player !== 'undefined' && !player.isDead) {
      if (player.isGrinding) { e.preventDefault(); e.stopPropagation(); exitSkyRailGrind(true); }
      else if ((!player._grindCooldown || player._grindCooldown <= 0) && player.pos.y > 10) {
        const hit = findClosestSkyRailPoint(player.pos, 4.5);
        if (hit) { e.preventDefault(); e.stopPropagation(); startSkyRailGrind(hit); }
      }
    }
  }, true);

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 4. АНАТОМИЧЕСКИЕ ГЕОМЕТРИИ (Lathe/Extrude) — из v65
  // ═══════════════════════════════════════════════════════════════════════════
  const SharedGeometries = {
    latheTorsoV: null, lathePauldron: null, latheNozzle: null,
    extrudeWarhammerHead: null, extrudeHexShield: null, extrudeFacetedBlade: null,
    debrisRock: null, armorShard: null,
    init() {
      if (this.latheTorsoV) return;
      const torsoPts = [
        new THREE.Vector2(0.01, 0.0), new THREE.Vector2(0.56, 0.05), new THREE.Vector2(0.52, 0.35),
        new THREE.Vector2(0.64, 0.72), new THREE.Vector2(0.88, 1.18), new THREE.Vector2(0.92, 1.42),
        new THREE.Vector2(0.62, 1.58), new THREE.Vector2(0.01, 1.62)
      ];
      this.latheTorsoV = new THREE.LatheGeometry(torsoPts, 12);
      const pauldronPts = [
        new THREE.Vector2(0.01, 0.0), new THREE.Vector2(0.46, 0.06), new THREE.Vector2(0.52, 0.22),
        new THREE.Vector2(0.38, 0.42), new THREE.Vector2(0.01, 0.48)
      ];
      this.lathePauldron = new THREE.LatheGeometry(pauldronPts, 10);
      const nozzlePts = [
        new THREE.Vector2(0.18, 0.0), new THREE.Vector2(0.26, 0.14),
        new THREE.Vector2(0.14, 0.28), new THREE.Vector2(0.24, 0.46)
      ];
      this.latheNozzle = new THREE.LatheGeometry(nozzlePts, 10);
      const hammerShape = new THREE.Shape();
      hammerShape.moveTo(-0.55, -0.36); hammerShape.lineTo(0.55, -0.36); hammerShape.lineTo(0.68, -0.18);
      hammerShape.lineTo(0.68, 0.18); hammerShape.lineTo(0.55, 0.36); hammerShape.lineTo(-0.55, 0.36);
      hammerShape.lineTo(-0.68, 0.18); hammerShape.lineTo(-0.68, -0.18); hammerShape.closePath();
      this.extrudeWarhammerHead = new THREE.ExtrudeGeometry(hammerShape, { depth: 0.62, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.12, bevelThickness: 0.12 });
      this.extrudeWarhammerHead.center();
      const hexShape = new THREE.Shape();
      const hexR = 1.15;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const hx = Math.cos(a) * hexR, hy = Math.sin(a) * hexR;
        if (i === 0) hexShape.moveTo(hx, hy); else hexShape.lineTo(hx, hy);
      }
      hexShape.closePath();
      this.extrudeHexShield = new THREE.ExtrudeGeometry(hexShape, { depth: 0.08, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.05, bevelThickness: 0.04 });
      this.extrudeHexShield.center();
      this.debrisRock = new THREE.DodecahedronGeometry(0.65, 0);
      this.armorShard = new THREE.BoxGeometry(0.55, 0.42, 0.22);
    }
  };
  SharedGeometries.init();

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 5. HERO EVO CATALOG — из v65
  // ═══════════════════════════════════════════════════════════════════════════
  const HERO_EVO_CATALOG = {
    pepper: [
      { id: 'pepper_blue_flame', icon: '🔥', title: '«Синее Пламя Сковилля»', cost: 300, desc: 'Урон +35%, атаки игнорируют щиты (en._shield).' },
      { id: 'pepper_meteor_core', icon: '☄️', title: '«Метеоритное Ядро»', cost: 450, desc: 'Огненное падение создаёт лавовый гейзер на 6 сек.' }
    ],
    carrot: [
      { id: 'carrot_poison_ivy', icon: '🌿', title: '«Ядовитый Плющ»', cost: 300, desc: 'Опутывание наносит урон ядом и высасывает HP.' },
      { id: 'carrot_ancient_ent', icon: '🪨', title: '«Кора Древнего Энта»', cost: 450, desc: '3 глыбы вокруг Гиганта, урон -45%, бур оставляет шипы.' }
    ],
    lemon: [
      { id: 'lemon_mega_hive', icon: '🕷️', title: '«Мега-Улей»', cost: 300, desc: 'До 8 пауков, стрельба +50%, щиты 0x44ffaa.' },
      { id: 'lemon_bold_superconductor', icon: '⚡', title: '«Сверхпроводник BOLD»', cost: 450, desc: 'Луч бьёт цепной дугой по 3 ближайшим.' }
    ],
    potato: [
      { id: 'potato_starch_juggernaut', icon: '🥔', title: '«Крахмальный Джаггернаут»', cost: 300, desc: 'Таран оставляет огненный след 5с, смена формы - грави-волна.' },
      { id: 'potato_thermo_ketchup', icon: '🍅', title: '«Термоядерный Кетчуп»', cost: 450, desc: 'Соус и Сверхнова замедляют -60% и детонируют повторно.' }
    ],
    banana: [
      { id: 'banana_shrek_singularity', icon: '🌀', title: '«Сингулярность Шрекича»', cost: 500, desc: 'Ракета создаёт гравитационную воронку 18м на 4с.' }
    ]
  };

  window.buyHeroEvoModule = function (modId, cost) {
    if (EvoModules.buy(modId, cost)) {
      SoundFX.devastator();
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3.2, 0)), '⚡ МОДУЛЬ ЭВОЛЮЦИИ АКТИВИРОВАН! ⚡', '#00ff66');
      showPatchToast('🧬 ТЕРМИНАЛ BI', 'Модуль эволюции установлен!', '#00ff66');
      applyActiveEvoVisuals();
      window.renderLabTab('suits');
    } else {
      SoundFX.hit(120, 0.15);
      showPatchToast('⚠️ ОШИБКА СИНТЕЗА', 'Недостаточно EP!', '#ff0055');
    }
  };

  const _origRenderLabTabM = window.renderLabTab;
  window.renderLabTab = function (tabName) {
    if (tabName !== 'suits') { if (_origRenderLabTabM) return _origRenderLabTabM.apply(this, arguments); return; }
    document.getElementById('lab-ep-val').innerText = player.ep;
    document.getElementById('lab-score-val').innerText = player.score.toLocaleString('ru-RU');
    document.getElementById('lab-wave-val').innerText = player.wave;
    const container = document.getElementById('lab-content');
    if (!container) return;
    container.innerHTML = '';
    let activeCharKey = 'banana';
    if (window.__POTATO_MODE || player.character === 'potato') activeCharKey = 'potato';
    else if (PEPPER_MODE || player.character === 'pepper') activeCharKey = 'pepper';
    else if (CARROT_MODE || player.character === 'carrot') activeCharKey = 'carrot';
    else if (LEMON_MODE || player.character === 'lemon') activeCharKey = 'lemon';
    if (activeCharKey === 'banana') {
      const suitGrid = document.createElement('div');
      suitGrid.className = 'lab-grid';
      SUITS.forEach((s, i) => {
        const cost = s.level * 60, m = 1 + (s.level - 1) * 0.25;
        const card = document.createElement('div');
        card.className = 'lab-card' + (player.suitIdx === i ? ' active' : '');
        card.innerHTML = `<div><h3>[${i}] ${s.name} (Ур. ${s.level})</h3><p>${s.desc}</p><div style="font-size:11px;color:#7bed9f;margin-bottom:8px;font-weight:900;">❤️ ${Math.round(s.maxHp * m)} | ⚡ ${Math.round(s.maxEn * m)} | ⚔️ ${Math.round(s.dmg * m)}</div></div><div><button class="lab-btn" style="width:100%;background:#f9ca24;" onclick="window.equipSuit(${i});window.renderLabTab('suits');">${player.suitIdx === i ? '✓ АКТИВНЫЙ' : 'АКТИВИРОВАТЬ'}</button><button class="lab-btn" style="width:100%;background:#00d2d3;margin-top:5px;" onclick="window.upgradeSuit(${i})">⬆️ +25% — ${cost} EP</button></div>`;
        suitGrid.appendChild(card);
      });
      container.appendChild(suitGrid);
    }
    const evoHeader = document.createElement('div');
    evoHeader.style.cssText = 'margin:16px 0 10px;padding:8px 12px;background:#14281d;border-left:4px solid #f9ca24;font-weight:900;color:#f9ca24;font-size:14px;text-transform:uppercase;';
    evoHeader.innerText = '⚡ БОЕВЫЕ МОДУЛИ ЭВОЛЮЦИИ';
    container.appendChild(evoHeader);
    const evoGrid = document.createElement('div');
    evoGrid.className = 'lab-grid';
    const order = [activeCharKey, ...['banana', 'pepper', 'carrot', 'lemon', 'potato'].filter((k) => k !== activeCharKey)];
    const charNames = { banana: '🍌 ЕГОРБАНАН', pepper: '🌶️ КАПИТАН ПЕРЕЦ', carrot: '🥕 ХОХЛОРКОВЬ', lemon: '🍋 ДИМОН ЛИМОН', potato: '🥔 МОРГЕНКАРТОШКА / ГРОМТОМАТ' };
    order.forEach((cKey) => {
      const mods = HERO_EVO_CATALOG[cKey] || [];
      mods.forEach((mod) => {
        const isOwned = EvoModules.has(mod.id);
        const canAfford = player.ep >= mod.cost;
        const isCurrentHero = cKey === activeCharKey;
        const card = document.createElement('div');
        card.className = 'lab-card' + (isOwned ? ' active' : '');
        card.style.outlineColor = isOwned ? '#00ff66' : (isCurrentHero ? '#00f2fe' : '#2ecc71');
        card.innerHTML = `<div><div style="font-size:10px;color:#00f2fe;font-weight:900;margin-bottom:3px;">${charNames[cKey]} ${isCurrentHero ? '· [ВАШ ГЕРОЙ]' : ''}</div><h3>${mod.icon} ${mod.title}</h3><p>${mod.desc}</p></div><div>${isOwned ? `<button class="lab-btn" style="width:100%;background:#00ff66;color:#000;" disabled>✓ УСТАНОВЛЕН</button>` : `<button class="lab-btn" style="width:100%;background:${canAfford ? '#f9ca24' : '#444'};color:${canAfford ? '#000' : '#999'};" ${canAfford ? '' : 'disabled'} onclick="window.buyHeroEvoModule('${mod.id}', ${mod.cost})">КУПИТЬ ЗА ${mod.cost} EP</button>`}</div>`;
        evoGrid.appendChild(card);
      });
    });
    container.appendChild(evoGrid);
  };

  function applyActiveEvoVisuals() {
    if (PEPPER_MODE && EvoModules.has('pepper_blue_flame') && player.mesh && player.mesh.userData) {
      const ud = player.mesh.userData;
      [ud.fistL, ud.fistR, ud.fistAuraL, ud.fistAuraR, ud.fireAura, ud.innerAura].forEach((m) => {
        if (m && m.material && m.material.color) m.material.color.setHex(0x00e5ff);
      });
      if (typeof heroAuraLight !== 'undefined') heroAuraLight.color.setHex(0x00e5ff);
    }
    updateEntBouldersMesh();
  }

  let _entBoulderGroup = null;
  function updateEntBouldersMesh() {
    const shouldHave = CARROT_MODE && CARROT_FORM === 2 && EvoModules.has('carrot_ancient_ent') && !player.isDead;
    if (!shouldHave) {
      if (_entBoulderGroup && _entBoulderGroup.parent) _entBoulderGroup.parent.remove(_entBoulderGroup);
      _entBoulderGroup = null;
      return;
    }
    if (!_entBoulderGroup) {
      _entBoulderGroup = new THREE.Group();
      const rockMat = createPrototypeShader(0x6e5a44, 0x2e2214, 7, 0x2ecc71);
      for (let i = 0; i < 3; i++) {
        const rock = addInkOutline(new THREE.Mesh(SharedGeometries.debrisRock, rockMat), 1.05);
        rock.scale.setScalar(1.35);
        const a = (i / 3) * Math.PI * 2;
        rock.position.set(Math.cos(a) * 2.4, 1.8, Math.sin(a) * 2.4);
        _entBoulderGroup.add(rock);
      }
      playerGroup.add(_entBoulderGroup);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 6. ДЕТАЛИЗИРОВАННАЯ МОРГЕНКАРТОШКА / ГРОМТОМАТ (из v65)
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
    form = form === 2 ? 2 : 1;
    SharedGeometries.init();
    const g = new THREE.Group();
    const pelvis = new THREE.Group(); pelvis.position.y = 1.65; g.add(pelvis);
    const spine = new THREE.Group(); pelvis.add(spine);
    const neck = new THREE.Group(); neck.position.y = 1.92; spine.add(neck);
    const headGroup = new THREE.Group(); headGroup.position.y = 0.35; neck.add(headGroup);
    const armL = new THREE.Group(); armL.position.set(-1.06, 1.56, 0); spine.add(armL);
    const armR = new THREE.Group(); armR.position.set(1.06, 1.56, 0); spine.add(armR);
    const legL = new THREE.Group(); legL.position.set(-0.38, 0, 0); pelvis.add(legL);
    const legR = new THREE.Group(); legR.position.set(0.38, 0, 0); pelvis.add(legR);
    const isMorg = form === 1;
    const bodyMat = isMorg
      ? createPrototypeShader(0x8b4513, 0x3e1f08, 7, 0xf9ca24)
      : createPrototypeShader(0x880814, 0xff3800, 10, 0xffaa00);
    const skinMat = isMorg
      ? createPrototypeShader(0xd8b48a, 0x8c6239, 4, 0xffeaa7)
      : createPrototypeShader(0xff2200, 0x800000, 10, 0xfff200);
    const rootArmorMat = isMorg
      ? createPrototypeShader(0x4e342e, 0x1f120e, 2, 0x2ecc71)
      : createPrototypeShader(0x1b5e20, 0x0a280e, 8, 0x44ffaa);
    const legMat = createPrototypeShader(0x242830, 0x0d1014, 9, isMorg ? 0xf9ca24 : 0xff2200);
    const beardMat = createPrototypeShader(0x2c1b10, 0x120a05, 8, 0xd4a017);
    const goldMat = createPrototypeShader(0xf9ca24, 0xb8860b, 9, 0xffffff);

    const torso = addInkOutline(new THREE.Mesh(SharedGeometries.latheTorsoV, bodyMat), 1.045);
    torso.scale.set(1.08, 1.0, 0.92);
    spine.add(torso);

    const magmaVeins = [];
    const knuckleArcs = [];

    if (isMorg) {
      for (let r = 0; r < 4; r++) {
        const rib = addInkOutline(new THREE.Mesh(new THREE.TorusGeometry(0.68 + r * 0.05, 0.07, 6, 12, Math.PI * 1.15), rootArmorMat), 1.04);
        rib.rotation.x = Math.PI / 2 + 0.15; rib.rotation.z = -0.18;
        rib.position.set(0, 0.52 + r * 0.24, 0.12);
        spine.add(rib);
      }
      const belt = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.24, 12), rootArmorMat), 1.04);
      belt.position.y = 0.22; spine.add(belt);
      const buckle = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.30, 0.16), goldMat), 1.05);
      buckle.position.set(0, 0.22, 0.62); spine.add(buckle);
      for (let layer = 0; layer < 3; layer++) {
        const bCone = addInkOutline(new THREE.Mesh(new THREE.ConeGeometry(0.42 - layer * 0.06, 0.65 + layer * 0.18, 9), beardMat), 1.045);
        bCone.rotation.x = Math.PI - 0.12;
        bCone.position.set(0, 0.08 - layer * 0.18, 0.44 + layer * 0.04);
        headGroup.add(bCone);
      }
      const mustache = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.12, 0.16), beardMat), 1.04);
      mustache.position.set(0, 0.24, 0.52); headGroup.add(mustache);
      for (let s of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.06), new THREE.MeshBasicMaterial({ color: 0xffeaa7 }));
        eye.position.set(s * 0.19, 0.44, 0.49); headGroup.add(eye);
      }
    } else {
      for (let v = 0; v < 5; v++) {
        const vein = new THREE.Mesh(new THREE.TorusGeometry(0.62 + (v % 2) * 0.12, 0.045, 6, 14, Math.PI), new THREE.MeshBasicMaterial({ color: 0xfff200 }));
        vein.position.set(0, 0.42 + v * 0.22, 0.1);
        vein.rotation.x = Math.PI / 2 + (v - 2) * 0.18;
        spine.add(vein); magmaVeins.push(vein);
      }
      for (let c = 0; c < 5; c++) {
        const crestSpike = addInkOutline(new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.52 + (2 - Math.abs(c - 2)) * 0.15, 6), new THREE.MeshBasicMaterial({ color: 0xffaa00 })), 1.04);
        crestSpike.position.set(0, 0.85, 0.22 - c * 0.14);
        crestSpike.rotation.x = -0.25 + c * 0.12;
        headGroup.add(crestSpike);
      }
      for (let s of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfff200 }));
        eye.position.set(s * 0.2, 0.44, 0.48); headGroup.add(eye);
      }
    }

    const head = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(0.54, 14, 12), skinMat), 1.045);
    head.position.y = 0.38; head.scale.set(1.0, 1.08, 0.98); headGroup.add(head);

    function buildArm(sideGroup, sign) {
      const pauldron = addInkOutline(new THREE.Mesh(SharedGeometries.lathePauldron, rootArmorMat), 1.045);
      pauldron.position.set(sign * 0.08, -0.08, 0);
      pauldron.rotation.z = -sign * 0.35;
      sideGroup.add(pauldron);
      const upperArm = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.17, 0.72, 8), bodyMat), 1.045);
      upperArm.position.y = -0.36; sideGroup.add(upperArm);
      const elbow = new THREE.Group(); elbow.position.y = -0.72; sideGroup.add(elbow);
      const foreArm = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.15, 0.66, 8), skinMat), 1.045);
      foreArm.position.y = -0.33; elbow.add(foreArm);
      const wrist = new THREE.Group(); wrist.position.y = -0.66; elbow.add(wrist);
      const fist = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), isMorg ? skinMat : rootArmorMat), 1.045);
      fist.position.y = -0.10; wrist.add(fist);
      let weaponMesh = fist;
      if (isMorg && sideGroup === armR) {
        const hammerGroup = new THREE.Group();
        const shaft = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 2.05, 8), rootArmorMat), 1.04);
        shaft.position.y = -0.95; hammerGroup.add(shaft);
        const headMat = createPrototypeShader(0x5a626a, 0x1e2226, 2, 0x2ecc71);
        const hHead = addInkOutline(new THREE.Mesh(SharedGeometries.extrudeWarhammerHead, headMat), 1.045);
        hHead.position.y = -1.92; hammerGroup.add(hHead);
        const runeMat = new THREE.MeshBasicMaterial({ color: 0x2ecc71 });
        for (let sideZ of [-0.33, 0.33]) {
          const runeRing = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.22, 6), runeMat);
          runeRing.position.set(0, -1.92, sideZ); hammerGroup.add(runeRing);
        }
        wrist.add(hammerGroup); weaponMesh = hammerGroup;
      } else if (!isMorg) {
        for (let k = -1; k <= 1; k++) {
          const spike = addInkOutline(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.26, 5), rootArmorMat), 1.04);
          spike.rotation.x = Math.PI / 2;
          spike.position.set(k * 0.11, -0.12, 0.26);
          wrist.add(spike);
        }
        const arcRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 5, 10), new THREE.MeshBasicMaterial({ color: 0x00f2fe, wireframe: true }));
        arcRing.position.y = -0.12; wrist.add(arcRing); knuckleArcs.push(arcRing);
      }
      return { shoulder: sideGroup, elbow, wrist, fist: weaponMesh };
    }
    const armLData = buildArm(armL, -1), armRData = buildArm(armR, 1);

    function buildLeg(sideGroup) {
      const thigh = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.21, 0.85, 8), legMat), 1.045);
      thigh.position.y = -0.42; sideGroup.add(thigh);
      const knee = new THREE.Group(); knee.position.y = -0.85; sideGroup.add(knee);
      const shin = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.18, 0.85, 8), legMat), 1.045);
      shin.position.y = -0.42; knee.add(shin);
      const boot = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.20, 0.52), rootArmorMat), 1.045);
      boot.position.set(0, -0.82, 0.10); knee.add(boot);
      return { hip: sideGroup, knee };
    }
    const legLData = buildLeg(legL), legRData = buildLeg(legR);

    g.userData = {
      pelvis, spine, neck, headGroup, armL: armLData, armR: armRData, legL: legLData, legR: legRData,
      magmaVeins, knuckleArcs, limeShield: null, backTentacles: null, isPotato: true, potatoForm: form
    };
    return g;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 7. БОЕВОЙ УРОН / BATTLE DAMAGE / ВРАГИ-ДЕТАЛИ (из v65)
  // ═══════════════════════════════════════════════════════════════════════════
  function enhanceEnemyModel(en) {
    if (!en || !en.group || en._v65Enhanced) return;
    en._v65Enhanced = true;
    const g = en.group;
    if (en._sniper || en.type === 'sniper') {
      const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 2.5, 0.8), new THREE.Vector3(0, 2.5, 38)]);
      const laserLine = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xff0033, transparent: true, opacity: 0.75 }));
      g.add(laserLine); en._sniperLaser = laserLine;
    }
    if (en._shield || en.type === 'shield') {
      const hexMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.42 });
      const hexBarrier = new THREE.Mesh(SharedGeometries.extrudeHexShield, hexMat);
      hexBarrier.position.set(-0.95, 2.2, 0.85);
      hexBarrier.rotation.y = -0.25;
      g.add(hexBarrier); en._hexBarrierMesh = hexBarrier;
    }
    if (en._medic || en.type === 'medic') {
      const droneG = new THREE.Group();
      const dBody = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), new THREE.MeshBasicMaterial({ color: 0x00ff66 }));
      const dRing = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.04, 4, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      dRing.rotation.x = Math.PI / 2;
      droneG.add(dBody, dRing);
      droneG.position.set(1.2, 3.6, 0);
      g.add(droneG); en._medDrone = droneG;
    }
    if (en._kamikaze || en.type === 'kamikaze') {
      const barrelGroup = new THREE.Group();
      const bMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
      for (let side of [-0.32, 0.32]) {
        const brl = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.95, 8), bMat.clone());
        brl.position.set(side, 2.35, -0.48);
        barrelGroup.add(brl);
      }
      g.add(barrelGroup); en._kamikazeBarrels = barrelGroup;
    }
    if (en.type === 'tank' && !en._isStoryConstruct && !en._isPhasePylon) {
      en._tankWheels = [];
      g.traverse((child) => {
        if (child.isMesh && child.geometry && child.geometry.type === 'CylinderGeometry') {
          if (Math.abs(child.position.y - 0.85) < 0.2) en._tankWheels.push(child);
          if (Math.abs(child.position.y - 3.0) < 0.2 && child.position.z > 1.0) en._tankBarrel = child;
        }
      });
    }
    if (en.type === 'heli' && !en._isStoryConstruct) {
      const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.9, 0.22), new THREE.MeshBasicMaterial({ color: 0x111111 }));
      tailRotor.position.set(0.22, 0.65, -4.35);
      g.add(tailRotor); en._tailRotor = tailRotor;
    }
  }

  ['spawnCitrusSoldier', 'spawnCitrusAPC', 'spawnCitrusHeli'].forEach((fnName) => {
    if (typeof window[fnName] === 'function') {
      const _orig = window[fnName];
      window[fnName] = function () {
        const res = _orig.apply(this, arguments);
        if (enemies.length > 0) enhanceEnemyModel(enemies[enemies.length - 1]);
        return res;
      };
    }
  });

  function triggerEnemyBattleDamage(en) {
    if (!en || en._battleDamaged || !en.group) return;
    const isHeavyOrBoss = en._isBoss || en.type === 'brawler' || en.type === 'tank' || en.type === 'heli' ||
      en.type === 'titan' || en.type === 'lemon' || en.type === 'valkyrie' || en.type === 'necromancer';
    if (!isHeavyOrBoss) return;
    en._battleDamaged = true;
    const worldPos = en.group.position.clone().add(new THREE.Vector3(0, 2.6, 0));
    const shardMat = createPrototypeShader(0x8a5a30, 0x221105, 7, 0xff4400);
    for (let i = 0; i < 3; i++) {
      const shard = addInkOutline(new THREE.Mesh(SharedGeometries.armorShard, shardMat), 1.04);
      shard.position.copy(worldPos).add(new THREE.Vector3((Math.random() - 0.5) * 1.5, Math.random() * 1.5, (Math.random() - 0.5) * 1.5));
      scene.add(shard);
      activeDebrisPieces.push({
        mesh: shard, vel: new THREE.Vector3((Math.random() - 0.5) * 18, 10 + Math.random() * 10, (Math.random() - 0.5) * 18),
        rotVel: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
        life: 1.35, sinkPhase: false, sharedGeo: true
      });
    }
    const exposedCore = new THREE.Mesh(new THREE.OctahedronGeometry(en._isBoss ? 1.1 : 0.55, 0), new THREE.MeshBasicMaterial({ color: 0xff3300 }));
    exposedCore.position.set(0, en._isBoss ? 6.0 : 2.2, 0.65);
    en.group.add(exposedCore); en._exposedCoreMesh = exposedCore;
    if (typeof spawnComicPop === 'function') spawnComicPop(worldPos.clone().add(new THREE.Vector3(0, 2.5, 0)), '💥 БРОНЯ ПРОБИТА! 💥', '#ff9f1a');
    if (typeof SoundFX !== 'undefined') SoundFX.boom();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 8. КИНЕМАТИКА / SMEAR / RIBBON / RAGDOLL (из v65)
  // ═══════════════════════════════════════════════════════════════════════════
  function lerpAngle(cur, target, alpha) { return THREE.MathUtils.lerp(cur || 0, target, alpha); }

  const weaponTrailHistory = [];
  const MAX_TRAIL_POINTS = 6;
  const trailPositionsAttr = new THREE.BufferAttribute(new Float32Array((MAX_TRAIL_POINTS - 1) * 6 * 3), 3);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', trailPositionsAttr);
  const trailMat = new THREE.MeshBasicMaterial({ color: 0xff0055, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  const weaponRibbonMesh = new THREE.Mesh(trailGeo, trailMat);
  weaponRibbonMesh.frustumCulled = false;
  weaponRibbonMesh.visible = false;
  scene.add(weaponRibbonMesh);

  function updateWeaponSmearAndRibbonTrail(dt) {
    if (!player.mesh || !player.mesh.userData) return;
    const ud = player.mesh.userData;
    const isStriking = player.attackTimer > 0.02;
    const armR = ud.armR, armL = ud.armL;
    const activeHand = (player.comboStep % 2 === 0 && armL) ? armL : (armR || armL);
    const strikeNode = activeHand ? (activeHand.wrist || activeHand.elbow || activeHand.pivot || activeHand.shoulder) : null;
    const smearMesh = activeHand ? (activeHand.fist || activeHand.wrist || activeHand.elbow) : null;
    if (isStriking && strikeNode) {
      const p = 1 - player.attackTimer / Math.max(0.05, player.attackDuration || 0.25);
      const inFastStrike = p >= 0.22 && p <= 0.72;
      if (smearMesh && smearMesh.scale) {
        if (inFastStrike) smearMesh.scale.set(1.2, 1.45, 1.2);
        else smearMesh.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, dt * 16));
      }
      const wp = new THREE.Vector3();
      strikeNode.getWorldPosition(wp);
      const upOffset = new THREE.Vector3(0, 0.42, 0);
      weaponTrailHistory.unshift({ top: wp.clone().add(upOffset), bot: wp.clone().sub(upOffset) });
      if (weaponTrailHistory.length > MAX_TRAIL_POINTS) weaponTrailHistory.pop();
      if (weaponTrailHistory.length >= 2) {
        const arr = trailPositionsAttr.array;
        let ptr = 0;
        for (let i = 0; i < weaponTrailHistory.length - 1; i++) {
          const a = weaponTrailHistory[i], b = weaponTrailHistory[i + 1];
          arr[ptr++] = a.top.x; arr[ptr++] = a.top.y; arr[ptr++] = a.top.z;
          arr[ptr++] = a.bot.x; arr[ptr++] = a.bot.y; arr[ptr++] = a.bot.z;
          arr[ptr++] = b.top.x; arr[ptr++] = b.top.y; arr[ptr++] = b.top.z;
          arr[ptr++] = a.bot.x; arr[ptr++] = a.bot.y; arr[ptr++] = a.bot.z;
          arr[ptr++] = b.bot.x; arr[ptr++] = b.bot.y; arr[ptr++] = b.bot.z;
          arr[ptr++] = b.top.x; arr[ptr++] = b.top.y; arr[ptr++] = b.top.z;
        }
        for (; ptr < arr.length; ptr++) arr[ptr] = wp.x;
        trailPositionsAttr.needsUpdate = true;
        let trailCol = getSuitData().slashColor || 0xff0055;
        if (PEPPER_MODE && EvoModules.has('pepper_blue_flame')) trailCol = 0x00e5ff;
        else if (window.__POTATO_MODE) trailCol = window.__POTATO_FORM === 1 ? 0x2ecc71 : 0xff2200;
        trailMat.color.setHex(trailCol);
        trailMat.opacity = 0.62;
        weaponRibbonMesh.visible = true;
      }
    } else {
      if (smearMesh && smearMesh.scale) smearMesh.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, dt * 14));
      trailMat.opacity = Math.max(0, trailMat.opacity - dt * 4.5);
      if (trailMat.opacity <= 0.02) { weaponRibbonMesh.visible = false; weaponTrailHistory.length = 0; }
    }
  }

  let _prevFacingYaw = 0;
  function applySmoothHeroKinematics(dt, now) {
    if (!player.mesh || !player.mesh.userData) return;
    const ud = player.mesh.userData;
    const kLerp = Math.min(1, dt * 14);
    let yawDelta = player.facingYaw - _prevFacingYaw;
    while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
    while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
    _prevFacingYaw = player.facingYaw;
    const hSpeed = Math.hypot(player.vel.x, player.vel.z);
    const isMoving = keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD'] || hSpeed > 3.5;
    const isSprint = keys['ShiftLeft'] || keys['ShiftRight'];
    const bankTarget = isMoving ? THREE.MathUtils.clamp(-yawDelta * 5.5, -0.28, 0.28) : 0;
    if (ud.pelvis) ud.pelvis.rotation.z = lerpAngle(ud.pelvis.rotation.z, bankTarget, kLerp);
    if (ud.headGroup || ud.neck) {
      const headNode = ud.headGroup || ud.neck;
      let lookDiff = player.camYaw - player.facingYaw;
      while (lookDiff > Math.PI) lookDiff -= Math.PI * 2;
      while (lookDiff < -Math.PI) lookDiff += Math.PI * 2;
      const targetHeadYaw = THREE.MathUtils.clamp(lookDiff * 0.55, -0.65, 0.65);
      const targetHeadPitch = THREE.MathUtils.clamp(-player.camPitch * 0.35, -0.35, 0.35);
      headNode.rotation.y = lerpAngle(headNode.rotation.y, targetHeadYaw, kLerp);
      headNode.rotation.x = lerpAngle(headNode.rotation.x, targetHeadPitch, kLerp);
    }
    if (ud.magmaVeins && ud.magmaVeins.length) {
      const pulse = 0.7 + 0.3 * Math.sin(now * 0.01);
      for (let i = 0; i < ud.magmaVeins.length; i++) ud.magmaVeins[i].scale.setScalar(0.95 + pulse * 0.1);
    }
    if (ud.knuckleArcs && ud.knuckleArcs.length) {
      for (let i = 0; i < ud.knuckleArcs.length; i++) {
        ud.knuckleArcs[i].rotation.x += dt * 12;
        ud.knuckleArcs[i].rotation.y += dt * 9;
      }
    }
    if (ud.isPotato && player.attackTimer > 0) {
      const p = THREE.MathUtils.clamp(1 - player.attackTimer / Math.max(0.05, player.attackDuration || 0.3), 0, 1);
      const isMorg = ud.potatoForm === 1;
      if (isMorg) {
        if (potatoCombo === 3) {
          let shX = 0, elX = -0.5, spX = 0;
          if (p < 0.32) { const w = p / 0.32; shX = -2.85 * w; elX = -0.95 * w; spX = -0.45 * w; }
          else if (p < 0.62) { const s = (p - 0.32) / 0.30; shX = -2.85 + 2.45 * s; elX = -0.95 + 0.75 * s; spX = -0.45 + 1.05 * s; }
          else { const r = (p - 0.62) / 0.38; shX = -0.4 * (1 - r); elX = -0.2 - 0.45 * r; spX = 0.6 * (1 - r); }
          ud.spine.rotation.x = lerpAngle(ud.spine.rotation.x, spX, kLerp * 1.4);
          ud.armR.shoulder.rotation.x = lerpAngle(ud.armR.shoulder.rotation.x, shX, kLerp * 1.5);
          ud.armL.shoulder.rotation.x = lerpAngle(ud.armL.shoulder.rotation.x, shX * 0.9, kLerp * 1.5);
          ud.armR.elbow.rotation.x = lerpAngle(ud.armR.elbow.rotation.x, elX, kLerp * 1.5);
          ud.armL.elbow.rotation.x = lerpAngle(ud.armL.elbow.rotation.x, elX, kLerp * 1.5);
        } else {
          const dir = potatoCombo % 2 === 1 ? 1 : -1;
          const swingArc = Math.sin(p * Math.PI);
          ud.spine.rotation.y = lerpAngle(ud.spine.rotation.y, dir * swingArc * 0.75, kLerp * 1.4);
          ud.armR.shoulder.rotation.x = lerpAngle(ud.armR.shoulder.rotation.x, -1.65 * swingArc, kLerp * 1.5);
          ud.armR.shoulder.rotation.z = lerpAngle(ud.armR.shoulder.rotation.z, -dir * 0.55 * swingArc, kLerp * 1.5);
          ud.armR.elbow.rotation.x = lerpAngle(ud.armR.elbow.rotation.x, -0.75 - 0.35 * swingArc, kLerp * 1.5);
        }
      } else {
        const isRight = potatoCombo % 2 === 1;
        const activeArm = isRight ? ud.armR : ud.armL;
        const guardArm = isRight ? ud.armL : ud.armR;
        const strikeWave = Math.sin(p * Math.PI);
        const isUppercut = potatoCombo === 4 || potatoCombo === 5;
        ud.spine.rotation.y = lerpAngle(ud.spine.rotation.y, (isRight ? 0.68 : -0.68) * strikeWave, kLerp * 1.5);
        ud.spine.rotation.x = lerpAngle(ud.spine.rotation.x, isUppercut ? -0.35 * strikeWave : 0.22 * strikeWave, kLerp * 1.5);
        activeArm.shoulder.rotation.x = lerpAngle(activeArm.shoulder.rotation.x, (isUppercut ? -2.65 : -1.85) * strikeWave, kLerp * 1.6);
        activeArm.elbow.rotation.x = lerpAngle(activeArm.elbow.rotation.x, isUppercut ? -1.15 * strikeWave : -0.45 * strikeWave, kLerp * 1.6);
        guardArm.shoulder.rotation.x = lerpAngle(guardArm.shoulder.rotation.x, -0.85, kLerp);
        guardArm.elbow.rotation.x = lerpAngle(guardArm.elbow.rotation.x, -1.15, kLerp);
      }
      return;
    }
    if (player.attackTimer <= 0 && !player.consumeState && player.airFlipTimer <= 0 && !player.isSliding) {
      const phase = now * (isSprint ? 0.019 : 0.013);
      if (isMoving && (player.isGrounded || player.isWallRunning || player.isGrinding)) {
        const sL = Math.sin(phase), sR = Math.sin(phase + Math.PI);
        if (ud.spine) {
          ud.spine.rotation.y = lerpAngle(ud.spine.rotation.y, -sL * 0.22, kLerp);
          ud.spine.rotation.x = lerpAngle(ud.spine.rotation.x, player.isGrinding ? 0.35 : (isSprint ? 0.28 : 0.14), kLerp);
        }
        if (ud.armL && ud.armL.elbow) ud.armL.elbow.rotation.x = lerpAngle(ud.armL.elbow.rotation.x, -0.65 - Math.sin(phase + Math.PI) * 0.35, kLerp);
        if (ud.armR && ud.armR.elbow) ud.armR.elbow.rotation.x = lerpAngle(ud.armR.elbow.rotation.x, -0.65 - Math.sin(phase) * 0.35, kLerp);
        if (ud.legL && ud.legL.knee) ud.legL.knee.rotation.x = lerpAngle(ud.legL.knee.rotation.x, Math.max(0, Math.sin(phase)) * 1.25, kLerp);
        if (ud.legR && ud.legR.knee) ud.legR.knee.rotation.x = lerpAngle(ud.legR.knee.rotation.x, Math.max(0, Math.sin(phase + Math.PI)) * 1.25, kLerp);
      } else {
        const breath = Math.sin(now * 0.0035);
        if (ud.spine) {
          ud.spine.rotation.x = lerpAngle(ud.spine.rotation.x, 0.05 + breath * 0.04, kLerp);
          ud.spine.rotation.y = lerpAngle(ud.spine.rotation.y, 0, kLerp);
        }
        if (ud.armL) {
          const shL = ud.armL.shoulder || ud.armL.pivot;
          if (shL) shL.rotation.x = lerpAngle(shL.rotation.x, -0.22 + breath * 0.06, kLerp);
          if (ud.armL.elbow) ud.armL.elbow.rotation.x = lerpAngle(ud.armL.elbow.rotation.x, -0.58 + breath * 0.08, kLerp);
        }
        if (ud.armR) {
          const shR = ud.armR.shoulder || ud.armR.pivot;
          if (shR) shR.rotation.x = lerpAngle(shR.rotation.x, -0.28 - breath * 0.06, kLerp);
          if (ud.armR.elbow) ud.armR.elbow.rotation.x = lerpAngle(ud.armR.elbow.rotation.x, -0.68 - breath * 0.08, kLerp);
        }
        if (ud.legL && ud.legL.knee) ud.legL.knee.rotation.x = lerpAngle(ud.legL.knee.rotation.x, 0.08, kLerp);
        if (ud.legR && ud.legR.knee) ud.legR.knee.rotation.x = lerpAngle(ud.legR.knee.rotation.x, 0.08, kLerp);
      }
    }
  }

  function spawnEnemyDeathRagdoll(en, knockVec) {
    if (!en || !en.group) return;
    const g = en.group;
    scene.add(g);
    const dir = new THREE.Vector3(g.position.x - player.pos.x, 0, g.position.z - player.pos.z);
    if (dir.lengthSq() < 0.01) dir.set(Math.random() - 0.5, 0, Math.random() - 0.5);
    dir.normalize();
    const impulseX = dir.x * 26 + (knockVec ? knockVec.x * 3.5 : 0);
    const impulseZ = dir.z * 26 + (knockVec ? knockVec.z * 3.5 : 0);
    const impulseY = 16 + Math.random() * 6;
    window.__RAGDOLLS.push({
      group: g, armL: en.armL, armR: en.armR, legL: en.legL, legR: en.legR,
      vel: new THREE.Vector3(impulseX, impulseY, impulseZ), timer: 0, maxLife: 0.75,
      color: en.type === 'lemon' ? 0xfff200 : 0xff7f00
    });
  }

  function updateRagdolls(dt, now) {
    for (let i = window.__RAGDOLLS.length - 1; i >= 0; i--) {
      const rg = window.__RAGDOLLS[i];
      rg.timer += dt;
      rg.vel.y -= 42 * dt;
      rg.group.position.addScaledVector(rg.vel, dt);
      rg.group.rotation.x += 11 * dt;
      rg.group.rotation.z += 7 * dt;
      if (rg.armL) rg.armL.rotation.x = Math.sin(now * 0.04 + i) * 2.2;
      if (rg.armR) rg.armR.rotation.x = Math.cos(now * 0.04 + i) * 2.2;
      if (rg.legL) rg.legL.rotation.x = Math.cos(now * 0.035 + i) * 1.8;
      if (rg.legR) rg.legR.rotation.x = Math.sin(now * 0.035 + i) * 1.8;
      let hitBuilding = false;
      const gx = rg.group.position.x, gz = rg.group.position.z, gy = rg.group.position.y;
      for (let bIdx = 0; bIdx < buildings.length; bIdx++) {
        const b = buildings[bIdx];
        if (gx > b.minX && gx < b.maxX && gz > b.minZ && gz < b.maxZ && gy < b.topY) { hitBuilding = true; break; }
      }
      const hitGround = rg.timer > 0.12 && gy <= 0.4;
      if (hitGround || hitBuilding || rg.timer >= rg.maxLife) {
        const burstPos = rg.group.position.clone();
        burstPos.y = Math.max(0.5, burstPos.y);
        if (typeof spawnParticles === 'function') spawnParticles(burstPos, rg.color, 18);
        if (typeof spawnGroundCrackRing === 'function') spawnGroundCrackRing(new THREE.Vector3(burstPos.x, 0, burstPos.z), rg.color, 5.5);
        if (typeof SoundFX !== 'undefined') SoundFX.hit(110, 0.14);
        if (typeof safeDisposeGroup === 'function') safeDisposeGroup(rg.group);
        if (rg.group.parent) rg.group.parent.remove(rg.group);
        window.__RAGDOLLS.splice(i, 1);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 9. ГАРПУН ХОХЛОРКОВИ 240М + КРИСТАЛЛИЧЕСКАЯ ТЮРЬМА + КРИО-КУБ (v110)
  // ═══════════════════════════════════════════════════════════════════════════
  window.carrotPrimaryAttack = function () {
    if (player.attackTimer > 0.08) return;
    if (!player.isGrounded && !player.isWallRunning && !player.isFlying && player.pos.y > 4 && CARROT_FORM === 1 && !player._activeGrapple) {
      if (!player.isBulletdropping) {
        player.isBulletdropping = true;
        player.vel.y = -70;
        const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
        player.vel.x = fwd.x * 22; player.vel.z = fwd.z * 22;
        SoundFX.whip();
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 2, 0)), '*КОРНЕВОЙ КОЛ!*', '#2ecc71');
      }
      return;
    }
    if (CARROT_FORM === 2) {
      if (player.comboResetTimer <= 0) player.comboStep = 0;
      player.comboStep = (player.comboStep % 2) + 1;
      player.comboResetTimer = 1.5;
      player.attackDuration = 0.55;
      player.attackTimer = player.attackDuration;
      player.facingYaw = player.camYaw;
      const fwd = new THREE.Vector3(-Math.sin(player.facingYaw), 0, -Math.cos(player.facingYaw));
      player.vel.x += fwd.x * 10; player.vel.z += fwd.z * 10;
      const st = carrotStats();
      const dmg = st.dmg * 2.8;
      const chest = new THREE.Vector3(player.pos.x, player.pos.y + 4, player.pos.z);
      spawnSlashArc(chest.clone().add(fwd.clone().multiplyScalar(5)), player.facingYaw, player.comboStep % 2 ? 0.4 : -0.4, 0xff5500, 14, 0.42);
      SoundFX.swing(120); SoundFX.devastator();
      spawnGroundCrackRing(new THREE.Vector3(player.pos.x + fwd.x * 7, 0, player.pos.z + fwd.z * 7), 0xff5500, 20);
      const hr = 20;
      const hx = player.pos.x + fwd.x * 7, hz = player.pos.z + fwd.z * 7;
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const dx = e.group.position.x - hx, dz = e.group.position.z - hz;
        if (dx * dx + dz * dz <= (hr + e.radius) * (hr + e.radius)) {
          let fd = dmg;
          if (player.comboStep === 2) { fd *= 1.5; e.vel.y = Math.max(e.vel.y, 18); }
          damageEnemy(e, fd, new THREE.Vector3(fwd.x * 8, 0, fwd.z * 8), player.comboStep === 2 ? '*ГИГАНТСКИЙ ФИНИШЕР!*' : '*РАЗМАХ ГИГАНТА!*');
        }
      }
      checkCarDestruction(new THREE.Vector3(hx, 0, hz), hr);
      return;
    }
    if (player.comboResetTimer <= 0) player.comboStep = 0;
    player.comboStep = (player.comboStep % 5) + 1;
    player.comboResetTimer = 1.6;
    const combos = [
      null,
      { dur: 0.21, tilt: -0.2, r: 11.5, lunge: 14, dmg: 1.15, label: '*ХЛЫСТ ЛОЗОЙ!*' },
      { dur: 0.21, tilt: 0.2, r: 11.5, lunge: 14, dmg: 1.15, label: '*ХЛЫСТ ЛОЗОЙ!*' },
      { dur: 0.30, tilt: 0, r: 14.5, lunge: 15, dmg: 1.35, label: '*360° БОТВА!*', spin: true },
      { dur: 0.34, tilt: -0.5, r: 12.5, lunge: 14, dmg: 1.55, label: '*КОРНЕВОЙ АППЕРКОТ!*', launch: true },
      { dur: 0.46, tilt: -1.0, r: 15.5, lunge: 20, dmg: 2.25, label: '*КОРНЕВОЙ ШКВАЛ!*', finisher: true }
    ];
    const C = combos[player.comboStep];
    player.attackDuration = C.dur;
    player.attackTimer = C.dur;
    player.facingYaw = player.camYaw;
    const fwd = new THREE.Vector3(-Math.sin(player.facingYaw), 0, -Math.cos(player.facingYaw));
    player.vel.x += fwd.x * C.lunge; player.vel.z += fwd.z * C.lunge;
    const st = carrotStats();
    const dmg = st.dmg * C.dmg;
    const chest = new THREE.Vector3(player.pos.x, player.pos.y + 2, player.pos.z);
    spawnSlashArc(chest.clone().add(fwd.clone().multiplyScalar(3.2)), player.facingYaw, C.tilt, 0x2ecc71, C.r * 0.75, 0.24);
    if (activeTendrils.length < 10) activeTendrils.push(new OrganicTendril3D(scene, chest.clone(), chest.clone().add(fwd.clone().multiplyScalar(C.r + 2)), 0x2ecc71, 0.35, 0.25));
    if (C.spin) spawnGroundCrackRing(new THREE.Vector3(player.pos.x, 0, player.pos.z), 0x2ecc71, C.r);
    if (C.finisher) { SoundFX.devastator(); spawnGroundCrackRing(new THREE.Vector3(player.pos.x + fwd.x * 5, 0, player.pos.z + fwd.z * 5), 0x2ecc71, C.r); }
    SoundFX.swing(200 + player.comboStep * 50);
    const hx = player.pos.x + fwd.x * (C.spin ? 3 : 6.0), hz = player.pos.z + fwd.z * (C.spin ? 3 : 6.0), hr = C.r;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const dx = e.group.position.x - hx, dz = e.group.position.z - hz;
      if (dx * dx + dz * dz <= (hr + e.radius) * (hr + e.radius)) {
        if (C.launch && e.type !== 'titan') e.vel.y = 18;
        if (C.finisher) e.vel.y = Math.max(e.vel.y, 14);
        damageEnemy(e, dmg, new THREE.Vector3(fwd.x * (C.finisher ? 6 : 3.0), 0, fwd.z * (C.finisher ? 6 : 3.0)), C.label);
      }
    }
    if (C.finisher) triggerHitstopAndChroma(0.03, 0.5, 1.0);
    checkCarDestruction(new THREE.Vector3(hx, 0, hz), hr);
  };

  let _newVineCd = 0;
  const VINE_CD = 0.60;
  const HARPOON_MAX_RANGE = 240;
  const HARPOON_PULL_SPEED = 48;
  player._activeGrapple = null;

  window.carrotGiantDrillDash = function () {
    if (!CARROT_MODE || CARROT_FORM !== 2 || player.isDead) return;
    if (player._giantDrillCd > 0) {
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 5, 0)), '*БУР КД ' + player._giantDrillCd.toFixed(1) + 'с*', '#ff5500');
      return;
    }
    if (player.carrotStamina < 40) { spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 5, 0)), '*МАЛО СТАМИНЫ!*', '#ff2200'); return; }
    player.carrotStamina -= 40;
    player._giantDrillCd = 4.0;
    SoundFX.devastator(); SoundFX.boom();
    triggerHitstopAndChroma(0.14, 0.9, 1.4);
    player.facingYaw = player.camYaw;
    const fwd = new THREE.Vector3(-Math.sin(player.facingYaw), 0, -Math.cos(player.facingYaw));
    player.vel.x = fwd.x * 68; player.vel.z = fwd.z * 68; player.vel.y = 6;
    player.dodgeIframes = 0.65;
    spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 6, 0)), '*МОРКОВНЫЙ БУР!*', '#ff5500');
    const st = carrotStats();
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.group.position.distanceTo(player.pos) < 18) damageEnemy(e, st.dmg * 5.0, fwd.clone().multiplyScalar(10), '*РАЗОРВАНО БУРОМ!*');
    }
    checkCarDestruction(player.pos, 10);
    // v65: шипы от "Древнего Энта"
    if (EvoModules.has('carrot_ancient_ent')) {
      const stx = carrotStats();
      const startX = player.pos.x, startZ = player.pos.z;
      for (let step = 1; step <= 8; step++) {
        const sx = startX + fwd.x * step * 4.5;
        const sz = startZ + fwd.z * step * 4.5;
        if (typeof eruptGroundSpike === 'function') eruptGroundSpike(sx, sz, step * 45);
        for (let i = enemies.length - 1; i >= 0; i--) {
          const en = enemies[i];
          if (Math.hypot(en.group.position.x - sx, en.group.position.z - sz) < 5.0) {
            en.vel.y = Math.max(en.vel.y, 16);
            damageEnemy(en, stx.dmg * 1.8, new THREE.Vector3(0, 10, 0), '*🪨 ШИП ЭНТА!*');
          }
        }
      }
    }
  };

  window.carrotVineHarpoon = function () {
    if (!CARROT_MODE || CARROT_FORM !== 1 || player.isDead) return;
    if (_newVineCd > 0) {
      if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '*ГАРПУН КД ' + _newVineCd.toFixed(1) + 'с*', '#2ecc71');
      return;
    }
    const origin = player.pos.clone().add(new THREE.Vector3(0, 2.2, 0));
    const camDir = new THREE.Vector3(); camera.getWorldDirection(camDir); camDir.normalize();
    const fwdFlat = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw)).normalize();
    const aimDir = new THREE.Vector3(fwdFlat.x, THREE.MathUtils.clamp(camDir.y + 0.08, -0.35, 0.65), fwdFlat.z).normalize();
    const rc = new THREE.Raycaster();
    const rayStart = origin.clone().addScaledVector(fwdFlat, 1.8);
    rc.set(rayStart, aimDir); rc.far = HARPOON_MAX_RANGE;
    const rawHits = rc.intersectObjects(buildingMeshes, false);
    let validBuildHit = null;
    for (let i = 0; i < rawHits.length; i++) {
      const h = rawHits[i];
      if (h.point.y <= 0.8) continue;
      const toPt = h.point.clone().sub(player.pos);
      const flatToPt = new THREE.Vector3(toPt.x, 0, toPt.z);
      const flatDist = flatToPt.length();
      if (flatDist < 5.0 || flatDist > HARPOON_MAX_RANGE) continue;
      if (flatToPt.normalize().dot(fwdFlat) < 0.75) continue;
      const safePoint = h.point.clone().addScaledVector(fwdFlat, -2.2);
      safePoint.y = Math.max(2.5, h.point.y);
      validBuildHit = { point: safePoint, distance: h.distance };
      break;
    }
    if (!validBuildHit) {
      const fallbackDir = new THREE.Vector3(fwdFlat.x, 0.12, fwdFlat.z).normalize();
      rc.set(rayStart, fallbackDir); rc.far = HARPOON_MAX_RANGE;
      const fbHits = rc.intersectObjects(buildingMeshes, false);
      for (let i = 0; i < fbHits.length; i++) {
        const h = fbHits[i];
        if (h.point.y <= 0.8) continue;
        const toPt = h.point.clone().sub(player.pos);
        const flatToPt = new THREE.Vector3(toPt.x, 0, toPt.z);
        const flatDist = flatToPt.length();
        if (flatDist < 5.0 || flatDist > HARPOON_MAX_RANGE) continue;
        if (flatToPt.normalize().dot(fwdFlat) < 0.75) continue;
        const safePoint = h.point.clone().addScaledVector(fwdFlat, -2.2);
        safePoint.y = Math.max(2.5, h.point.y);
        validBuildHit = { point: safePoint, distance: h.distance };
        break;
      }
    }
    let bestEnemy = null, bestEnemyDist = 180;
    for (let i = 0; i < enemies.length; i++) {
      const en = enemies[i];
      if (!en || !en.group) continue;
      const toE = en.group.position.clone().sub(player.pos);
      const flatDist = Math.hypot(toE.x, toE.z);
      if (flatDist < 3.0 || flatDist > 180) continue;
      const dot = new THREE.Vector3(toE.x, 0, toE.z).normalize().dot(fwdFlat);
      if (dot < 0.78) continue;
      if (flatDist < bestEnemyDist) { bestEnemyDist = flatDist; bestEnemy = en; }
    }
    const buildingDist = validBuildHit ? validBuildHit.distance : Infinity;
    if (bestEnemy && bestEnemyDist <= buildingDist + 4) {
      _newVineCd = VINE_CD;
      const isHeavy = (bestEnemy._isBoss || bestEnemy._isStoryConstruct || bestEnemy.type === 'titan' || bestEnemy.type === 'tank' ||
        bestEnemy.type === 'lemon' || bestEnemy.type === 'valkyrie' || bestEnemy.type === 'necromancer' || bestEnemy.type === 'heli');
      const tp = bestEnemy.group.position.clone().add(new THREE.Vector3(0, 1.8, 0));
      SoundFX.whip();
      if (isHeavy) {
        const stopPoint = bestEnemy.group.position.clone().addScaledVector(fwdFlat, -3.8);
        stopPoint.y = Math.max(1.0, bestEnemy.group.position.y + 1.5);
        const dur = Math.min(2.0, Math.max(0.2, bestEnemyDist / HARPOON_PULL_SPEED));
        const vine = new OrganicTendril3D(scene, origin.clone(), tp, 0x2ecc71, 0.42, dur + 0.1);
        activeTendrils.push(vine);
        player._activeGrapple = { targetPos: stopPoint, initialDir: fwdFlat.clone(), speed: HARPOON_PULL_SPEED, timer: 0, maxDuration: dur, enemyRef: bestEnemy, tendril: vine };
        spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), '*🌿 К БОССУ!*', '#ff2200');
      } else {
        if (activeTendrils.length < 10) activeTendrils.push(new OrganicTendril3D(scene, origin.clone(), tp, 0x2ecc71, 0.42, 0.4));
        spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), '*ИДИ СЮДА!*', '#2ecc71');
        const capE = bestEnemy;
        capE._rooted = 1.0;
        const pullDest = player.pos.clone().addScaledVector(fwdFlat, 2.5);
        let step = 0;
        const pullTimer = setInterval(() => {
          step++;
          if (!capE || !capE.group || !capE.group.parent || step >= 8) {
            clearInterval(pullTimer);
            if (capE && capE.group && capE.group.parent) {
              const st = carrotStats();
              spawnSlashArc(player.pos.clone().add(new THREE.Vector3(0, 2, 0)), player.facingYaw, 0, 0x2ecc71, 8.5, 0.35);
              damageEnemy(capE, st.dmg * 3.4, fwdFlat.clone().multiplyScalar(8), '*УДАР С РАЗВОРОТА!*');
            }
            return;
          }
          capE.group.position.lerp(pullDest, 0.42);
        }, 25);
      }
      return;
    }
    if (validBuildHit) {
      _newVineCd = VINE_CD;
      const hp = validBuildHit.point;
      const distB = validBuildHit.distance;
      const dur = Math.min(2.6, Math.max(0.22, distB / HARPOON_PULL_SPEED));
      const vine = new OrganicTendril3D(scene, origin.clone(), hp.clone(), 0x2ecc71, 0.40, dur + 0.1);
      activeTendrils.push(vine);
      player._activeGrapple = { targetPos: hp, initialDir: fwdFlat.clone(), speed: HARPOON_PULL_SPEED, timer: 0, maxDuration: dur, enemyRef: null, tendril: vine };
      player.isGrounded = false; player.isBulletdropping = false;
      player.facingYaw = player.camYaw;
      SoundFX.swing(480);
      spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), `*🌿 ГАРПУН (${Math.round(distB)}М)*`, '#2ecc71');
      return;
    }
    _newVineCd = VINE_CD;
    const shortTarget = player.pos.clone().addScaledVector(fwdFlat, 24);
    shortTarget.y = Math.max(1.5, player.pos.y + 4.0);
    const vine = new OrganicTendril3D(scene, origin.clone(), shortTarget.clone(), 0x2ecc71, 0.35, 0.42);
    activeTendrils.push(vine);
    player._activeGrapple = { targetPos: shortTarget, initialDir: fwdFlat.clone(), speed: 44, timer: 0, maxDuration: 0.42, enemyRef: null, tendril: vine };
    player.facingYaw = player.camYaw;
    SoundFX.swing(420);
  };

  window.addEventListener('mousedown', function (e) {
    if (e.button !== 2) return;
    if (typeof player === 'undefined' || player.isDead) return;
    if (!CARROT_MODE) return;
    if (typeof gameStarted !== 'undefined' && !gameStarted) return;
    if (typeof isLabOpen !== 'undefined' && isLabOpen) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if (CARROT_FORM === 1) window.carrotVineHarpoon();
    else window.carrotGiantDrillDash();
  }, true);

  setInterval(() => { if (_newVineCd > 0) _newVineCd = Math.max(0, _newVineCd - 0.05); }, 50);

  const _origRootBindM = window.carrotRootBind;
  window.carrotRootBind = function () {
    if (!CARROT_MODE || player.isDead) return;
    player.carrotStamina = Math.max(40, player.carrotStamina);
    player.carrotRootBindCd = 0;
    if (_origRootBindM) _origRootBindM.apply(this, arguments);
    const bindRadius = CARROT_FORM === 2 ? 48 : 38;
    const st = carrotStats();
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const d = e.group.position.distanceTo(player.pos);
      if (d < bindRadius) {
        e._rooted = e._isBoss ? 1.8 : 4.5;
        if (e.flying && !e._isBoss) { e.flying = false; e.group.position.y = 0; e.vel.y = 0; spawnComicPop(e.group.position.clone().add(new THREE.Vector3(0, 2, 0)), '*СБИТ КОРНЯМИ!*', '#2ecc71'); }
        damageEnemy(e, st.dmg * 1.4, new THREE.Vector3(), '');
      }
    }
    spawnGroundCrackRing(player.pos, 0x2ecc71, bindRadius * 0.85);
    // v65: Poison Ivy
    if (EvoModules.has('carrot_poison_ivy')) {
      for (let i = 0; i < enemies.length; i++) {
        const en = enemies[i];
        if (en.group.position.distanceTo(player.pos) <= bindRadius) {
          en._poisonIvyTimer = 4.5;
          en._poisonIvyDps = st.dmg * 0.85;
        }
      }
      spawnGroundCrackRing(player.pos, 0x00ff88, bindRadius);
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 4, 0)), '🌿 ЯДОВИТЫЙ ПЛЮЩ: ВАМПИРИЗМ! 🌿', '#00ff88');
    }
  };

  // Кристаллическая тюрьма
  player._crystalPrisonHitsNeeded = 0;
  player._crystalPrisonMesh = null;

  function trapPlayerInSegmentationCrystal(hitsRequired = 4) {
    if (player._crystalPrisonHitsNeeded > 0 || player.isDead) return;
    player._crystalPrisonHitsNeeded = hitsRequired;
    if (player._crystalPrisonMesh && player._crystalPrisonMesh.parent) player._crystalPrisonMesh.parent.remove(player._crystalPrisonMesh);
    const prisonGroup = new THREE.Group();
    const boxMat = new THREE.MeshPhongMaterial({ color: 0xff00ff, emissive: 0x4a0058, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    const cube = new THREE.Mesh(new THREE.BoxGeometry(3.4, 4.8, 3.4), boxMat);
    cube.position.y = 2.4;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3.45, 4.85, 3.45)), new THREE.LineBasicMaterial({ color: 0xffffff }));
    edges.position.y = 2.4;
    prisonGroup.add(cube, edges);
    playerGroup.add(prisonGroup);
    player._crystalPrisonMesh = prisonGroup;
    spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 4.5, 0)), '💎 СЕГМЕНТАЦИЯ! ЖМИТЕ [ЛКМ]/[Q] (4 РАЗА)!', '#ff00ff');
    SoundFX.hit(180, 0.3);
  }

  function registerPlayerBreakoutAttempt() {
    if (player._crystalPrisonHitsNeeded <= 0) return false;
    player._crystalPrisonHitsNeeded--;
    SoundFX.hit(260 + (4 - player._crystalPrisonHitsNeeded) * 80, 0.15);
    if (player._crystalPrisonMesh) player._crystalPrisonMesh.scale.setScalar(0.9 + Math.random() * 0.2);
    if (player._crystalPrisonHitsNeeded <= 0) {
      if (player._crystalPrisonMesh && player._crystalPrisonMesh.parent) player._crystalPrisonMesh.parent.remove(player._crystalPrisonMesh);
      player._crystalPrisonMesh = null;
      SoundFX.boom(); SoundFX.devastator();
      spawnGroundCrackRing(player.pos, 0x00ff66, 14);
      spawnParticles(player.pos.clone().add(new THREE.Vector3(0, 2, 0)), 0xff00ff, 25);
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 4.5, 0)), '💥 ПЕРЕДОЗИРОВКА ВИТАМИНОВ: ТЮРЬМА РАЗБИТА! 💥', '#00ff66');
      for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].group.position.distanceTo(player.pos) < 15) damageEnemy(enemies[i], 650, new THREE.Vector3(0, 12, 0), '*ВЗРЫВ СИНТЕЗА!*');
      }
    } else {
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3.8, 0)), `*ТРЕЩИНА! ЕЩЁ ${player._crystalPrisonHitsNeeded} УДАРА!*`, '#fff200');
    }
    return true;
  }
  window.registerPlayerBreakoutAttempt = registerPlayerBreakoutAttempt;

  // Крио-Куб [C] для банана
  const CRYO_FREEZE_RADIUS = 24;
  const CRYO_FREEZE_DURATION = 5.5;
  const CRYO_BASE_DMG = 95;

  function createSolidIceCubePrison(targetPos, targetRadius, durationSec) {
    const group = new THREE.Group();
    const w = Math.max(2.6, targetRadius * 2.1), h = Math.max(4.4, targetRadius * 3.1);
    const iceOuterMat = new THREE.MeshPhongMaterial({ color: 0x18c8ff, emissive: 0x053858, specular: 0xffffff, shininess: 120, transparent: true, opacity: 0.58, side: THREE.DoubleSide, depthWrite: false });
    const outerCube = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), iceOuterMat);
    outerCube.position.y = h * 0.5; group.add(outerCube);
    const iceInnerMat = new THREE.MeshBasicMaterial({ color: 0xb8f8ff, transparent: true, opacity: 0.36, side: THREE.DoubleSide, depthWrite: false });
    const innerCore = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, h * 0.82, w * 0.78), iceInnerMat);
    innerCore.position.y = h * 0.5; innerCore.rotation.y = Math.PI * 0.25; group.add(innerCore);
    const edgesLine = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w * 1.01, h * 1.01, w * 1.01)), new THREE.LineBasicMaterial({ color: 0xe0ffff, transparent: true, opacity: 0.95 }));
    edgesLine.position.y = h * 0.5; group.add(edgesLine);
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const spikeH = h * (0.45 + (i % 2) * 0.2);
      const spike = new THREE.Mesh(new THREE.ConeGeometry(w * 0.18, spikeH, 5), iceOuterMat);
      spike.position.set(Math.cos(ang) * (w * 0.48), spikeH * 0.45, Math.sin(ang) * (w * 0.48));
      spike.rotation.z = -Math.cos(ang) * 0.28; spike.rotation.x = Math.sin(ang) * 0.28;
      group.add(spike);
    }
    const baseFrost = new THREE.Mesh(new THREE.RingGeometry(w * 0.3, w * 0.95, 20), new THREE.MeshBasicMaterial({ color: 0x88f6ff, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }));
    baseFrost.rotation.x = -Math.PI / 2; baseFrost.position.y = 0.08; group.add(baseFrost);
    group.position.copy(targetPos);
    scene.add(group);
    group.scale.set(0.2, 0.05, 0.2);
    let growT = 0;
    const growAnim = setInterval(() => {
      growT += 0.16;
      const s = Math.min(1, growT);
      const backOut = 1 + 0.15 * Math.sin(s * Math.PI);
      group.scale.set(s * backOut, s, s * backOut);
      if (growT >= 1) { group.scale.set(1, 1, 1); clearInterval(growAnim); }
    }, 16);
    const cleanup = () => {
      if (!group.parent) return;
      if (typeof spawnParticles === 'function') spawnParticles(group.position.clone().add(new THREE.Vector3(0, h * 0.5, 0)), 0x66f2ff, 18);
      scene.remove(group);
      group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    };
    const timerId = setTimeout(cleanup, durationSec * 1000);
    return { group, cleanup, timerId };
  }

  window.addEventListener('keydown', function (e) {
    if (e.code !== 'KeyC') return;
    if (typeof player === 'undefined' || player.isDead) return;
    if (registerPlayerBreakoutAttempt()) return;
    if (player.character !== 'banana') return;
    if (CARROT_MODE || PEPPER_MODE || LEMON_MODE || window.__POTATO_MODE) return;
    if (player.isFlying) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if (player._cryoCd > 0) {
      if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), `*❄ КРИО-КУБ КД ${player._cryoCd.toFixed(1)}с*`, '#00f2fe');
      return;
    }
    player._cryoCd = 7.5;
    player.consumeCd = 7.5;
    createSolidIceCubePrison(player.pos.clone(), 1.5, 1.8);
    player.dodgeIframes = Math.max(player.dodgeIframes, 1.2);
    player.en = player.maxEn;
    player.hp = Math.min(player.maxHp, player.hp + 95);
    const cryoWave = new THREE.Mesh(new THREE.RingGeometry(1, CRYO_FREEZE_RADIUS, 48), new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    cryoWave.rotation.x = -Math.PI / 2; cryoWave.position.set(player.pos.x, 0.18, player.pos.z); scene.add(cryoWave);
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
      if (en.group.position.distanceTo(player.pos) <= CRYO_FREEZE_RADIUS) frozenTargets.push(en);
    }
    for (const en of frozenTargets) {
      if (en._isJirigory && en._fatCarapaceActive) {
        en._fatCarapaceActive = false;
        if (en._carapaceMesh) en._carapaceMesh.visible = false;
        en._rooted = 2.5;
        setBossCastBar('❄️ ЖИРОВОЙ ПАНЦИРЬ РАСКОЛОТ МОРОЗИЛКОЙ! ❄️', 100, true);
        setTimeout(() => setBossCastBar('', 0, false), 1800);
        spawnComicPop(en.group.position.clone().add(new THREE.Vector3(0, 9, 0)), '*❄️ ПАНЦИРЬ РАСКОЛОТ ЛЬДОМ!*', '#00f2fe');
      }
      if (en._isPinnacleBoss && en._cryoImmunityTimer > 0) {
        spawnComicPop(en.group.position.clone().add(new THREE.Vector3(0, 8, 0)), `*🛡️ КРИО-АДАПТАЦИЯ (${Math.ceil(en._cryoImmunityTimer)}с)*`, '#ff9f1a');
        continue;
      }
      if (en._iceCubePrison) { clearTimeout(en._iceCubePrison.timerId); en._iceCubePrison.cleanup(); }
      if (en.flying && en.type !== 'valkyrie' && !en._isPinnacleBoss) { en.flying = false; en.group.position.y = 0; }
      const freezeTime = en._isPinnacleBoss ? 2.0 : CRYO_FREEZE_DURATION;
      if (en._isPinnacleBoss) en._cryoImmunityTimer = 11.0;
      const prison = createSolidIceCubePrison(en.group.position.clone(), en.radius || 1.4, freezeTime);
      en._iceCubePrison = prison;
      en.frozen = freezeTime;
      en._rooted = freezeTime;
      en._frozenLockedPos = en.group.position.clone();
      en._telegraphT = 0; en._pendingRanged = null; en.meleeAnim = 0;
      en.attackCd = Math.max(en.attackCd || 0, freezeTime + 0.5);
      en.vel.set(0, 0, 0); en._mpMoving = false;
      if (!en._mpId && typeof damageEnemy === 'function') {
        en._suppressShatterOnFreezeInit = true;
        damageEnemy(en, CRYO_BASE_DMG, new THREE.Vector3(), '*❄ ВМЕРЗ В ЛЁД!*');
        en._suppressShatterOnFreezeInit = false;
      }
    }
    if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'freeze', radius: CRYO_FREEZE_RADIUS });
    if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 5.2, 0)), `❄️ МОРОЗИЛЬНАЯ УСТАНОВКА (${frozenTargets.length})!`, '#00f2fe');
    if (typeof SoundFX !== 'undefined') { SoundFX.devastator(); SoundFX.boom(); }
    if (typeof triggerHitstopAndChroma === 'function') triggerHitstopAndChroma(0.08, 0.65, 1.25);
    updateHUD();
  }, true);

  setInterval(() => { if (player._cryoCd > 0) player._cryoCd = Math.max(0, player._cryoCd - 0.1); }, 100);

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 10. ДВИЖОК 4 ХАРДКОРНЫХ СОЛО-БОССОВ (v110) + ФАЗОВЫЕ ВРАТА
  // ═══════════════════════════════════════════════════════════════════════════
  let _soloBossLock = false;
  const worldHazards = [];
  const shockwaveRings = [];
  const bossPhasePylons = [];

  const bossCastEl = document.createElement('div');
  bossCastEl.id = 'boss-cast-bar-wrap';
  bossCastEl.style.cssText = 'position:fixed;top:186px;left:50%;transform:translateX(-50%);width:510px;z-index:26;background:rgba(12,0,22,.96);border:3px solid #000;outline:2px solid #ff0055;padding:6px 12px;display:none;text-align:center;box-shadow:0 0 25px rgba(255,0,85,.6),5px 5px 0 #000;pointer-events:none;';
  bossCastEl.innerHTML = '<div id="boss-cast-label" style="font-family:Bangers,Impact,sans-serif;font-size:16px;color:#fff200;letter-spacing:1.5px;margin-bottom:4px;">⚠️ АТАКА БОССА ⚠️</div><div style="width:100%;height:12px;background:#1a0010;border:2px solid #000;overflow:hidden;"><div id="boss-cast-fill" style="width:0%;height:100%;background:linear-gradient(90deg,#ff0055,#fff200);transition:width .06s linear;"></div></div>';
  document.body.appendChild(bossCastEl);

  function setBossCastBar(label, pct, visible = true) {
    if (!visible) { bossCastEl.style.display = 'none'; return; }
    bossCastEl.style.display = 'block';
    const lbl = document.getElementById('boss-cast-label');
    const fill = document.getElementById('boss-cast-fill');
    if (lbl) lbl.innerText = label;
    if (fill) fill.style.width = Math.max(0, Math.min(100, pct)) + '%';
  }
  window.setBossCastBar = setBossCastBar;

  function clearBossPhasePylons() {
    for (let i = bossPhasePylons.length - 1; i >= 0; i--) {
      const p = bossPhasePylons[i];
      if (p.group && p.group.parent) scene.remove(p.group);
      const idx = enemies.indexOf(p);
      if (idx !== -1) enemies.splice(idx, 1);
    }
    bossPhasePylons.length = 0;
  }

  function spawnBossPhaseGatePylons(boss, colorHex, labelText) {
    clearBossPhasePylons();
    boss._invulnGateActive = true;
    const bPos = boss.group.position;
    if (!boss._gateShieldMesh) {
      boss._gateShieldMesh = new THREE.Mesh(new THREE.SphereGeometry(6.5, 16, 16), new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.42, wireframe: true }));
      boss._gateShieldMesh.position.y = 6.0;
      boss.group.add(boss._gateShieldMesh);
    }
    boss._gateShieldMesh.material.color.setHex(colorHex);
    boss._gateShieldMesh.visible = true;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const px = bPos.x + Math.cos(a) * 22;
      const pz = bPos.z + Math.sin(a) * 22;
      const safe = getSafeOpenGroundPos(px, pz, 4);
      const g = new THREE.Group();
      g.position.copy(safe);
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(2.6, 0), new THREE.MeshPhongMaterial({ color: colorHex, emissive: colorHex, emissiveIntensity: 0.4, shininess: 100 }));
      crystal.position.y = 4.2; g.add(crystal);
      const ring = new THREE.Mesh(new THREE.RingGeometry(2.8, 3.8, 20), new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.25; g.add(ring);
      scene.add(g);
      const pylonObj = {
        type: 'tank', _isPhasePylon: true, group: g, hp: 1400, maxHp: 1400,
        vel: new THREE.Vector3(), speed: 0, radius: 3.2, attackCd: 99, dodgeCd: 99,
        flying: false, _rooted: 0
      };
      enemies.push(pylonObj);
      bossPhasePylons.push(pylonObj);
    }
    setBossCastBar(`🛡️ ${labelText} — РАЗБЕЙТЕ 3 КРИСТАЛЛА ВОКРУГ БОССА! 🛡️`, 100, true);
    spawnComicPop(bPos.clone().add(new THREE.Vector3(0, 11, 0)), `🛡️ ${labelText}! РАЗБЕЙТЕ 3 ПИЛОНА!`, '#fff200');
    SoundFX.bossRoar();
  }

  function enterSoloBossArena(bossObj) {
    _soloBossLock = true;
    clearBossPhasePylons();
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e === bossObj) continue;
      if (e._iceCubePrison) { clearTimeout(e._iceCubePrison.timerId); enCleanupIce(e); }
      if (enemyHpBars && enemyHpBars.has(e)) {
        const bar = enemyHpBars.get(e);
        if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
        enemyHpBars.delete(e);
      }
      if (e.group && e.group.parent) scene.remove(e.group);
      enemies.splice(i, 1);
    }
  }

  function enCleanupIce(e) {
    if (e && e._iceCubePrison) { clearTimeout(e._iceCubePrison.timerId); e._iceCubePrison.cleanup(); e._iceCubePrison = null; }
  }

  const _origSpawnStrikeForceM = window.spawnStrikeForce;
  window.spawnStrikeForce = function () {
    if (_soloBossLock || activeBoss) return;
    if (enemies.length >= 6) return;
    if (_origSpawnStrikeForceM) return _origSpawnStrikeForceM.apply(this, arguments);
  };

  const _origAdvanceWaveM = window.advanceWave;
  window.advanceWave = function () {
    if (_soloBossLock || activeBoss) return;
    if (_origAdvanceWaveM) return _origAdvanceWaveM.apply(this, arguments);
  };

  const _origCheckBossConditionsM = window.checkBossConditions;
  window.checkBossConditions = function () {
    if (_soloBossLock || (window.StoryCampaign && !window.StoryCampaign.completed)) return;
    if (_origCheckBossConditionsM) return _origCheckBossConditionsM.apply(this, arguments);
  };

  function spawnJumpableShockwave(origin, maxRadius, speed, colorHex, dmgVal) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.38, 8, 36), new THREE.MeshBasicMaterial({ color: colorHex }));
    ring.rotation.x = Math.PI / 2; ring.position.set(origin.x, 0.45, origin.z); scene.add(ring);
    shockwaveRings.push({ mesh: ring, center: origin.clone(), radius: 1.5, maxRadius, speed, dmg: dmgVal, hitPlayer: false });
  }

  function spawnHazardPool(pos, radius, colorHex, durationSec, isFatSlow = false) {
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 20), new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.68, side: THREE.DoubleSide, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(pos.x, 0.14, pos.z); scene.add(mesh);
    worldHazards.push({ mesh, pos: pos.clone(), radius, life: durationSec, maxLife: durationSec, isFatSlow });
  }

  // ОСНОВНОЙ damageEnemy — объединяем v110 (фазовые врата, damage cap) + v65 (grind bonus, ragdoll, battle damage)
  const _origDamageEnemyMerged = window.damageEnemy;
  window.damageEnemy = function (en, dmg, knockVec, popText) {
    if (!en) return;

    // === Бонусы v65 ===
    if (player.isGrinding) dmg *= 1.8;
    if (PEPPER_MODE && EvoModules.has('pepper_blue_flame')) {
      dmg *= 1.35;
      if (en._shield) {
        en._shield = false;
        if (en._hexBarrierMesh) en._hexBarrierMesh.visible = false;
        popText = '*🔥 ЩИТ ПРОЖЖЁН СИНИМ ПЛАМЕНЕМ!*';
      }
    }
    en._hitStagger = 0.2;

    // === Phase Pylon (v110) ===
    if (en._isPhasePylon) {
      const resPylon = _origDamageEnemyMerged.call(this, en, dmg * 1.5, knockVec, '*💥 ПИЛОН ЩИТА!*');
      const alivePylons = bossPhasePylons.filter((p) => p && p.hp > 0 && enemies.indexOf(p) !== -1);
      if (alivePylons.length === 0 && activeBoss && activeBoss._invulnGateActive) {
        activeBoss._invulnGateActive = false;
        if (activeBoss._gateShieldMesh) activeBoss._gateShieldMesh.visible = false;
        activeBoss._rooted = 3.0;
        setBossCastBar('💥 ЩИТ ФАЗЫ СНЯТ! БОСС УЯЗВИМ! 💥', 100, true);
        setTimeout(() => setBossCastBar('', 0, false), 2000);
        spawnComicPop(activeBoss.group.position.clone().add(new THREE.Vector3(0, 10, 0)), '💥 ЩИТ БОССА РАЗРУШЕН! В АТАКУ!', '#00ff66');
        SoundFX.boom();
      }
      return resPylon;
    }

    // === Логика Pinnacle Boss (v110) ===
    if (en._isPinnacleBoss) {
      if (en._invulnGateActive) {
        const alivePylons = bossPhasePylons.filter((p) => p && p.hp > 0 && enemies.indexOf(p) !== -1);
        if (alivePylons.length > 0) {
          spawnComicPop(en.group.position.clone().add(new THREE.Vector3(0, 9, 0)), `*🛡️ НЕУЯЗВИМ! РАЗБЕЙТЕ ПИЛОНЫ (${alivePylons.length})!*`, '#fff200');
          return;
        } else {
          en._invulnGateActive = false;
          if (en._gateShieldMesh) en._gateShieldMesh.visible = false;
        }
      }
      if (en._isSoloJirigory && en._fatCarapaceActive) {
        if (dmg >= 130 || LEMON_MODE || player._multifruitTitanActive) {
          en._fatCarapaceActive = false;
          if (en._carapaceMesh) en._carapaceMesh.visible = false;
          en._rooted = 3.0;
          setBossCastBar('💥 ПАНЦИРЬ ЖИРИГОРЯ ПРОБИТ! 💥', 100, true);
          setTimeout(() => setBossCastBar('', 0, false), 1800);
          popText = '*💥 ЗОЛОТОЙ ПАНЦИРЬ РАЗБИТ!*';
          SoundFX.boom();
        } else {
          en.hp = Math.min(en.maxHp, en.hp + 200);
          spawnComicPop(en.group.position.clone().add(new THREE.Vector3(0, 9, 0)), '*💛 ЖИР ПОГЛОТИЛ УДАР! ЖМИТЕ [Q]/[F]/[C]!*', '#fff200');
          return;
        }
      }
      if (en._isBeetrootTitan && en._beetArmorClosed) {
        if (dmg >= 135 || PEPPER_MODE || LEMON_MODE) {
          en._beetArmorClosed = false;
          if (en._diamondCoreMesh) en._diamondCoreMesh.material.color.setHex(0xff00ff);
          popText = '*💎 АЛМАЗНОЕ ЯДРО ВСКРЫТО!*';
          SoundFX.boom();
        } else {
          dmg *= 0.25;
          popText = '*🛡️ СВЕКОЛЬНАЯ БРОНЯ!*';
        }
      }
      if (en._castingUltimate) {
        en._ultInterruptHits = (en._ultInterruptHits || 0) + 1;
        if (en._ultInterruptHits >= 5 || dmg >= 180) {
          en._castingUltimate = false;
          en._rooted = 3.5;
          if (en._sunSphere && en._sunSphere.parent) scene.remove(en._sunSphere);
          setBossCastBar('🌈 УЛЬТИМЕЙТ БОССА СБИТ! 🌈', 100, true);
          setTimeout(() => setBossCastBar('', 0, false), 1800);
          popText = '*🌈 КАСТ БОССА ПРЕРВАН!*';
          SoundFX.devastator();
        }
      }
      if (en.frozen > 0 && !en._suppressShatterOnFreezeInit && dmg > 15) {
        dmg *= 1.65;
        popText = '*💎 РАСКОЛ ЛЬДА!*';
      }
      const totalEngineMult = Math.max(1, (player.comboMult || 1) * (player.momentumMult || 1) * (player.rageActive > 0 ? 2 : 1) * (player.spicinessActive > 0 ? 1.6 : 1));
      const maxAllowedRawDmg = (en.maxHp * 0.042) / totalEngineMult;
      if (dmg > maxAllowedRawDmg) dmg = maxAllowedRawDmg;
    } else if (en.frozen > 0 && !en._suppressShatterOnFreezeInit && dmg > 15) {
      dmg *= 2.0;
      popText = '*💎 РАСКОЛ ЛЬДА! x2*';
    }

    const prevHp = en.hp;
    const res = _origDamageEnemyMerged.call(this, en, dmg, knockVec, popText);

    // Battle Damage (v65)
    if (en.hp > 0 && en.maxHp > 0 && en.hp / en.maxHp < 0.5 && !en._battleDamaged) {
      triggerEnemyBattleDamage(en);
    }

    // Ragdoll on death (v65)
    if (prevHp > 0 && en.hp <= 0 && !en._ragdollSpawned) {
      en._ragdollSpawned = true;
      spawnEnemyDeathRagdoll(en, knockVec);
    }

    // Phase Gates at 66% / 33% (v110)
    if (en._isPinnacleBoss && en.hp > 0) {
      const pct = en.hp / en.maxHp;
      if (pct <= 0.66 && !en._gate66Triggered) {
        en._gate66Triggered = true;
        en.hp = Math.round(en.maxHp * 0.66);
        spawnBossPhaseGatePylons(en, 0xff00ff, 'ФАЗОВЫЕ ВРАТА I (66% HP)');
      } else if (pct <= 0.33 && !en._gate33Triggered) {
        en._gate33Triggered = true;
        en.hp = Math.round(en.maxHp * 0.33);
        spawnBossPhaseGatePylons(en, 0x00f2fe, 'ФАЗОВЫЕ ВРАТА II (33% HP)');
      }
    }

    if (en.hp <= 0) {
      enCleanupIce(en);
      if (en._isPinnacleBoss) { _soloBossLock = false; clearBossPhasePylons(); setBossCastBar('', 0, false); }
    }
    return res;
  };

  // === 4 Соло-Босса (v110) — spawn functions ===
  window.spawnSoloFinalGrapestasik = function (x, z) {
    const safePt = getSafeOpenGroundPos(x, z, 8);
    if (activeBoss && activeBoss.group && activeBoss.group.parent) scene.remove(activeBoss.group);
    const g = new THREE.Group(); g.position.copy(safePt);
    const bioMat = createPrototypeShader(0x3a1058, 0x160028, 1, 0xd252ff);
    const berryMat = createPrototypeShader(0x52187a, 0x220438, 4, 0xff00ff);
    const vineMat = createPrototypeShader(0x1f3a18, 0x0a1806, 8, 0x2ecc71);
    const glowViolet = new THREE.MeshBasicMaterial({ color: 0xe066ff });
    const torso = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(3.3, 2.4, 6.6, 12), bioMat), 1.04);
    torso.position.y = 6.8; g.add(torso);
    const spiralCore = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.24, 8, 24), glowViolet);
    spiralCore.position.set(0, 6.4, 2.55); g.add(spiralCore);
    for (let side of [-1, 1]) {
      for (let b = 0; b < 7; b++) {
        const berry = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(0.78, 8, 8), berryMat), 1.04);
        berry.position.set(side * (3.3 + (b % 2) * 0.6), 8.9 + Math.floor(b / 3) * 0.65, ((b % 3) - 1) * 0.65);
        g.add(berry);
      }
    }
    const neck = new THREE.Group(); neck.position.set(0, 10.4, 0); g.add(neck);
    const head = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(2.1, 12, 12), bioMat), 1.04);
    head.position.y = 1.6; neck.add(head);
    for (let side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.58, 8, 8), glowViolet);
      eye.scale.set(1.2, 0.75, 0.6); eye.position.set(side * 0.75, 1.85, 1.8); neck.add(eye);
    }
    const leafCrown = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.2, 5), vineMat);
    leafCrown.position.set(-0.6, 3.8, 0); leafCrown.rotation.z = 0.4; neck.add(leafCrown);
    const armLPivot = new THREE.Group(); armLPivot.position.set(-3.7, 9.2, 0); g.add(armLPivot);
    const armL = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.7, 5.2, 8), bioMat), 1.04);
    armL.position.y = -2.5; armLPivot.add(armL);
    const armRPivot = new THREE.Group(); armRPivot.position.set(3.7, 9.2, 0); g.add(armRPivot);
    armRPivot.add(armL.clone());
    const legLPivot = new THREE.Group(); legLPivot.position.set(-1.5, 3.6, 0); g.add(legLPivot);
    const legL = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.9, 3.8, 8), bioMat), 1.04);
    legL.position.y = -1.9; legLPivot.add(legL);
    const legRPivot = new THREE.Group(); legRPivot.position.set(1.5, 3.6, 0); g.add(legRPivot);
    legRPivot.add(legL.clone());
    scene.add(g);
    activeBoss = {
      type: 'lemon', _isBoss: true, _isPinnacleBoss: true, _isSoloGrapestasik: true,
      name: 'БИО-ТИТАН ГРЕЙПСТАСИК («ИСТИННАЯ ГОРЕЧЬ»)',
      group: g, armL: armLPivot, armR: armRPivot, legL: legLPivot, legR: legRPivot,
      neck, spark: spiralCore, ankle: spiralCore,
      hp: 90000, maxHp: 90000, vel: new THREE.Vector3(), speed: 16.5, radius: 5.2,
      attackCd: 1.3, windup: 0, dodgeCd: 99, flying: false,
      phase: 1, chargeCd: 999, lightningCd: 999, _phase2: false, _phase3: false, _rooted: 0,
      _abilityCooldown: 1.8, _abilityRotation: 0, _cryoImmunityTimer: 0
    };
    enemies.push(activeBoss);
    enterSoloBossArena(activeBoss);
    showBossHUD('🍇 СОЛО-БОСС 1/4: БИО-ТИТАН ГРЕЙПСТАСИК 🍇', 'ФАЗОВЫЕ ВРАТА НА 66% И 33% HP!');
    SoundFX.bossRoar();
    return activeBoss;
  };

  window.spawnSoloFinalJirigory = function (x, z) {
    const safePt = getSafeOpenGroundPos(x, z, 8);
    if (activeBoss && activeBoss.group && activeBoss.group.parent) scene.remove(activeBoss.group);
    const g = new THREE.Group(); g.position.copy(safePt); g.scale.setScalar(1.25);
    const fatMat = createPrototypeShader(0xe8b828, 0x9c6e08, 4, 0xfff200);
    const hairMat = createPrototypeShader(0xf5d76e, 0xb8860b, 0, 0xffffff);
    const puddle = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6.8, 1.4, 16), fatMat);
    puddle.position.y = 0.7; g.add(puddle);
    const belly = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(4.2, 16, 14), fatMat), 1.04);
    belly.scale.set(1.18, 1.05, 1.1); belly.position.y = 4.6; g.add(belly);
    const chest = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(3.4, 14, 12), fatMat), 1.04);
    chest.scale.set(1.25, 0.9, 1.0); chest.position.y = 7.8; g.add(chest);
    const neck = new THREE.Group(); neck.position.set(0, 9.8, 0); g.add(neck);
    const head = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(1.9, 14, 14), fatMat), 1.04);
    head.position.y = 1.4; neck.add(head);
    const mane = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 2.3, 2.8, 12), hairMat);
    mane.position.set(0, 1.6, -0.35); neck.add(mane);
    const armLPivot = new THREE.Group(); armLPivot.position.set(-4.2, 8.2, 0); g.add(armLPivot);
    const armL = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.9, 4.6, 10), fatMat), 1.04);
    armL.position.y = -2.2; armLPivot.add(armL);
    const armRPivot = new THREE.Group(); armRPivot.position.set(4.2, 8.2, 0); g.add(armRPivot);
    armRPivot.add(armL.clone());
    const crystalGroup = new THREE.Group();
    const iceCrystalMat = new THREE.MeshPhongMaterial({ color: 0x66f2ff, emissive: 0x0a4868, transparent: true, opacity: 0.78 });
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const shard = new THREE.Mesh(new THREE.ConeGeometry(1.1, 6.5, 5), iceCrystalMat);
      shard.position.set(Math.cos(ang) * 4.2, 7.5 + (i % 2) * 1.5, Math.sin(ang) * 4.2);
      shard.rotation.z = -Math.cos(ang) * 0.55; shard.rotation.x = Math.sin(ang) * 0.55;
      crystalGroup.add(shard);
    }
    crystalGroup.visible = false; g.add(crystalGroup);
    const carapaceMesh = new THREE.Mesh(new THREE.SphereGeometry(6.2, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfff200, transparent: true, opacity: 0.42, wireframe: true }));
    carapaceMesh.position.y = 5.5; carapaceMesh.visible = false; g.add(carapaceMesh);
    const legLPivot = new THREE.Group(), legRPivot = new THREE.Group();
    g.add(legLPivot, legRPivot);
    scene.add(g);
    activeBoss = {
      type: 'brawler', _isBoss: true, _isPinnacleBoss: true, _isJirigory: true, _isSoloJirigory: true,
      _fatCarapaceActive: false, _carapaceMesh: carapaceMesh, _crystalGroup: crystalGroup,
      name: 'АБСОЛЮТНЫЙ ЖИРИГОРЬ («ЗОЛОТОЙ СТАНДАРТ»)',
      group: g, armL: armLPivot, armR: armRPivot, legL: legLPivot, legR: legRPivot,
      neck, ankle: belly,
      hp: 105000, maxHp: 105000, vel: new THREE.Vector3(), speed: 15.0, radius: 6.2,
      attackCd: 1.4, meleeCd: 0, meleeAnim: 0, _meleeDur: 0.5,
      dodgeCd: 99, flying: false, phase: 1, _phase2: false, _phase3: false, _rooted: 0,
      _abilityCooldown: 1.8, _abilityRotation: 0, _cryoImmunityTimer: 0
    };
    enemies.push(activeBoss);
    enterSoloBossArena(activeBoss);
    showBossHUD('💛 СОЛО-БОСС 2/4: АБСОЛЮТНЫЙ ЖИРИГОРЬ 💛', 'ПРЫГАЙТЕ ЧЕРЕЗ ЦУНАМИ! ПРОБИВАЙТЕ ПАНЦИРЬ [C]/[Q]/[F]!');
    SoundFX.bossRoar();
    return activeBoss;
  };

  window.spawnSoloBeetrootTitanGoretzka = function (x, z) {
    const safePt = getSafeOpenGroundPos(x, z, 8);
    if (activeBoss && activeBoss.group && activeBoss.group.parent) scene.remove(activeBoss.group);
    const g = new THREE.Group(); g.position.copy(safePt); g.scale.setScalar(1.22);
    const beetMat = createPrototypeShader(0x7a1238, 0x2e0414, 4, 0xff0055);
    const suitRemnantMat = createPrototypeShader(0x1a1a22, 0x08080c, 7, 0xd252ff);
    const leafMat = createPrototypeShader(0x2ecc71, 0x145a32, 8, 0xff0055);
    const torso = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(3.4, 2.5, 6.4, 12), beetMat), 1.04);
    torso.position.y = 6.6; g.add(torso);
    const diamondCore = new THREE.Mesh(new THREE.OctahedronGeometry(1.35, 0), new THREE.MeshPhongMaterial({ color: 0xff00ff, emissive: 0x8800aa, shininess: 140 }));
    diamondCore.position.set(0, 6.8, 2.6); g.add(diamondCore);
    const neck = new THREE.Group(); neck.position.set(0, 10.0, 0); g.add(neck);
    const head = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(2.0, 14, 14), beetMat), 1.04);
    head.position.y = 1.6; neck.add(head);
    const beard = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.2, 8), suitRemnantMat);
    beard.rotation.x = Math.PI; beard.position.set(0, 0.5, 1.1); neck.add(beard);
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.55, 3.2, 5), leafMat);
      leaf.position.set((i - 2.5) * 0.4, 3.8, 0); leaf.rotation.z = (i - 2.5) * 0.28; neck.add(leaf);
    }
    const armLPivot = new THREE.Group(); armLPivot.position.set(-3.8, 9.0, 0); g.add(armLPivot);
    const armL = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.75, 5.0, 8), beetMat), 1.04);
    armL.position.y = -2.4; armLPivot.add(armL);
    const armRPivot = new THREE.Group(); armRPivot.position.set(3.8, 9.0, 0); g.add(armRPivot);
    armRPivot.add(armL.clone());
    const legLPivot = new THREE.Group(); legLPivot.position.set(-1.5, 3.4, 0); g.add(legLPivot);
    const legL = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.9, 3.6, 8), suitRemnantMat), 1.04);
    legL.position.y = -1.8; legLPivot.add(legL);
    const legRPivot = new THREE.Group(); legRPivot.position.set(1.5, 3.4, 0); g.add(legRPivot);
    legRPivot.add(legL.clone());
    scene.add(g);
    activeBoss = {
      type: 'brawler', _isBoss: true, _isPinnacleBoss: true, _isBeetrootTitan: true,
      _beetArmorClosed: true, _diamondCoreMesh: diamondCore,
      name: 'ТИТАН ГОРЕЦКА — ИНКВИЗИТОР АЛЬЯНСА КОРНЕЙ',
      group: g, armL: armLPivot, armR: armRPivot, legL: legLPivot, legR: legRPivot,
      neck, ankle: diamondCore,
      hp: 115000, maxHp: 115000, vel: new THREE.Vector3(), speed: 17.0, radius: 5.5,
      attackCd: 1.3, meleeCd: 0, meleeAnim: 0, _meleeDur: 0.45,
      dodgeCd: 99, flying: false, phase: 1, _phase2: false, _phase3: false, _rooted: 0,
      _abilityCooldown: 1.7, _abilityRotation: 0, _cryoImmunityTimer: 0
    };
    enemies.push(activeBoss);
    enterSoloBossArena(activeBoss);
    showBossHUD('🟣 СОЛО-БОСС 3/4: СВЕКОЛЬНЫЙ ТИТАН ГОРЕЦКА 🟣', 'ВСКРЫВАЙТЕ АЛМАЗ [Q]/[F]! ВЫБИВАЙТЕСЬ ИЗ КРИСТАЛЛОВ!');
    SoundFX.bossRoar();
    return activeBoss;
  };

  window.spawnSoloMonolithOfSterility = function (x, z) {
    const safePt = getSafeOpenGroundPos(x, z, 8);
    if (activeBoss && activeBoss.group && activeBoss.group.parent) scene.remove(activeBoss.group);
    const g = new THREE.Group(); g.position.copy(safePt); g.scale.setScalar(1.3);
    const sterileMat = new THREE.MeshPhongMaterial({ color: 0xf0f6ff, emissive: 0x223850, specular: 0xffffff, shininess: 160 });
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.55 });
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.0, 6.2, 8), sterileMat);
    torso.position.y = 6.4; g.add(torso);
    const torsoWire = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.1, 6.3, 8), wireMat);
    torsoWire.position.y = 6.4; g.add(torsoWire);
    for (let s of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const wingShard = new THREE.Mesh(new THREE.ConeGeometry(0.85, 4.8, 4), sterileMat);
        wingShard.position.set(s * (3.2 + k * 0.9), 8.8 + k * 0.7, -0.5);
        wingShard.rotation.z = -s * (0.45 + k * 0.2);
        g.add(wingShard);
      }
    }
    const neck = new THREE.Group(); neck.position.set(0, 9.8, 0); g.add(neck);
    const head = new THREE.Mesh(new THREE.OctahedronGeometry(1.85, 1), sterileMat);
    head.position.y = 1.5; neck.add(head);
    for (let s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.2), new THREE.MeshBasicMaterial({ color: 0x00f2fe }));
      eye.position.set(s * 0.65, 1.6, 1.65); neck.add(eye);
    }
    const armLPivot = new THREE.Group(); armLPivot.position.set(-3.4, 8.8, 0); g.add(armLPivot);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4.8, 1.2), sterileMat);
    armL.position.y = -2.4; armLPivot.add(armL);
    const armRPivot = new THREE.Group(); armRPivot.position.set(3.4, 8.8, 0); g.add(armRPivot);
    armRPivot.add(armL.clone());
    const legLPivot = new THREE.Group(); legLPivot.position.set(-1.3, 3.4, 0); g.add(legLPivot);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(1.3, 3.6, 1.3), sterileMat);
    legL.position.y = -1.8; legLPivot.add(legL);
    const legRPivot = new THREE.Group(); legRPivot.position.set(1.3, 3.4, 0); g.add(legRPivot);
    legRPivot.add(legL.clone());
    scene.add(g);
    activeBoss = {
      type: 'lemon', _isBoss: true, _isPinnacleBoss: true, _isSterilityMonolith: true,
      name: 'МОНОЛИТ СТЕРИЛЬНОСТИ («ДОМИНИОН СТЕРИЛЬНОСТИ»)',
      group: g, armL: armLPivot, armR: armRPivot, legL: legLPivot, legR: legRPivot,
      neck, spark: head, ankle: torso,
      hp: 135000, maxHp: 135000, vel: new THREE.Vector3(), speed: 18.5, radius: 5.5,
      attackCd: 1.2, windup: 0, dodgeCd: 99, flying: false,
      phase: 1, chargeCd: 999, lightningCd: 999, _phase2: false, _phase3: false, _rooted: 0,
      _abilityCooldown: 1.5, _abilityRotation: 0, _cryoImmunityTimer: 0
    };
    enemies.push(activeBoss);
    enterSoloBossArena(activeBoss);
    showBossHUD('⚪ ФИНАЛЬНЫЙ БОСС (4/4): МОНОЛИТ СТЕРИЛЬНОСТИ ⚪', 'УКЛОНЯЙТЕСЬ ОТ ЛУЧЕЙ И ВОЛН! РАЗБИВАЙТЕ ОБЕЛИСКИ!');
    SoundFX.bossRoar();
    return activeBoss;
  };

  function updateSoloPinnacleBossAI(b, dt, now) {
    if (!b || b.hp <= 0 || !b.group || !b.group.parent) return;
    if (b._cryoImmunityTimer > 0) b._cryoImmunityTimer -= dt;
    if (b.frozen > 0 || b._rooted > 0) return;
    const bPos = b.group.position;
    const hpPct = b.hp / b.maxHp;

    if (b._isSoloGrapestasik) {
      b._abilityCooldown -= dt;
      if (b._abilityCooldown > 0) return;
      const moveIdx = b._abilityRotation % 4; b._abilityRotation++;
      b._abilityCooldown = hpPct < 0.5 ? 2.6 : 3.3;
      if (moveIdx === 0) {
        const dir = new THREE.Vector3(player.pos.x - bPos.x, 0, player.pos.z - bPos.z).normalize();
        setBossCastBar('⚡ ГРОМОВОЙ НАТИСК — РЫВОК! ⚡', 100, true);
        setTimeout(() => setBossCastBar('', 0, false), 1000);
        SoundFX.bossRoar();
        b.vel.x = dir.x * 95; b.vel.z = dir.z * 95;
        for (let s = 1; s <= 5; s++) {
          setTimeout(() => {
            if (!b.group.parent) return;
            const pt = bPos.clone().addScaledVector(dir, s * 5);
            spawnGroundCrackRing(pt, 0xd252ff, 7);
            if (player.pos.distanceTo(pt) < 6.5) applyDamageToHero(36);
          }, s * 100);
        }
      } else if (moveIdx === 1) {
        setBossCastBar('🔮 СПИРАЛЬНЫЙ ЛУЧ + ВОЛНА (ПРЫГАЙТЕ!) 🔮', 100, true);
        setTimeout(() => setBossCastBar('', 0, false), 1400);
        spawnJumpableShockwave(bPos.clone(), 38, 26, 0xd252ff, 34);
        const baseYaw = Math.atan2(player.pos.x - bPos.x, player.pos.z - bPos.z);
        for (let k = -3; k <= 3; k++) {
          const a = baseYaw + k * 0.2;
          const pr = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff00ff }));
          pr.position.copy(bPos).add(new THREE.Vector3(0, 3.5, 0));
          scene.add(pr);
          projectiles.push({ mesh: pr, vel: new THREE.Vector3(Math.sin(a) * 48, 0, Math.cos(a) * 48), life: 2.5, fromPlayer: false, dmg: 30 });
        }
      } else if (moveIdx === 2) {
        setBossCastBar('🌀 СИНГУЛЯРНОСТЬ: РЫВОК ИЗ КРУГА! 🌀', 100, true);
        let ticks = 0;
        const pullInt = setInterval(() => {
          ticks++;
          if (!b.group.parent || ticks >= 16) {
            clearInterval(pullInt);
            setBossCastBar('', 0, false);
            if (b.group.parent && b.frozen <= 0) {
              SoundFX.boom();
              spawnGroundCrackRing(bPos, 0xff0055, 22);
              if (player.pos.distanceTo(bPos) < 19 && player.pos.y < 6) { applyDamageToHero(48); player.vel.y = 22; }
            }
            return;
          }
          if (player.pos.distanceTo(bPos) < 35 && player.pos.distanceTo(bPos) > 4) {
            const pull = bPos.clone().sub(player.pos).normalize();
            player.pos.x += pull.x * 0.68; player.pos.z += pull.z * 0.68;
          }
        }, 60);
      } else {
        const behind = new THREE.Vector3(Math.sin(player.camYaw) * 6, 0, Math.cos(player.camYaw) * 6);
        const tpPos = getSafeOpenGroundPos(player.pos.x + behind.x, player.pos.z + behind.z, 3);
        bPos.copy(tpPos);
        SoundFX.whip();
        spawnGroundCrackRing(bPos, 0xd252ff, 12);
        spawnComicPop(bPos.clone().add(new THREE.Vector3(0, 9, 0)), '*👾 ПРОРЫВ ИЗ ПРОШЛОГО!*', '#d252ff');
        setTimeout(() => { if (b.group.parent && player.pos.distanceTo(bPos) < 9.5) applyDamageToHero(38); }, 420);
      }
    }

    if (b._isSoloJirigory) {
      if (hpPct <= 0.65 && !b._phase2) { b._phase2 = true; b.group.scale.setScalar(1.48); if (b._crystalGroup) b._crystalGroup.visible = true; }
      b._abilityCooldown -= dt;
      if (b._abilityCooldown > 0) return;
      const moveIdx = b._abilityRotation % 4; b._abilityRotation++;
      b._abilityCooldown = hpPct < 0.5 ? 2.7 : 3.4;
      if (moveIdx === 0) {
        b.vel.y = 26;
        setBossCastBar('💛 ЦУНАМИ ЗОЛОТОГО СТАНДАРТА (ПРЫГАЙТЕ 3 ВОЛНЫ!) 💛', 100, true);
        setTimeout(() => {
          setBossCastBar('', 0, false);
          if (!b.group.parent || b.frozen > 0) return;
          SoundFX.boom();
          for (let w = 0; w < 3; w++) setTimeout(() => { if (b.group.parent) spawnJumpableShockwave(bPos.clone(), 40, 26, 0xfff200, 35); }, w * 380);
        }, 700);
      } else if (moveIdx === 1) {
        b._fatCarapaceActive = true;
        if (b._carapaceMesh) b._carapaceMesh.visible = true;
        setBossCastBar('🛡️ ПАНЦИРЬ ПОГЛОЩЕНИЯ! [C]/[Q]/[F]! 🛡️', 100, true);
        setTimeout(() => { b._fatCarapaceActive = false; if (b._carapaceMesh) b._carapaceMesh.visible = false; setBossCastBar('', 0, false); }, 4500);
      } else if (moveIdx === 2) {
        setBossCastBar('❄️💛 ЗАЛП РЕКРИСТАЛЛИЗАЦИИ + ГЕЙЗЕРЫ! 💛❄️', 100, true);
        setTimeout(() => setBossCastBar('', 0, false), 1200);
        spawnHazardPool(player.pos.clone(), 6.0, 0xe8b828, 7.0, true);
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2;
          const pr = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.4, 6), new THREE.MeshBasicMaterial({ color: 0x00f2fe }));
          pr.rotation.x = Math.PI / 2; pr.position.copy(bPos).add(new THREE.Vector3(0, 4.0, 0));
          scene.add(pr);
          projectiles.push({ mesh: pr, vel: new THREE.Vector3(Math.sin(a) * 46, 0, Math.cos(a) * 46), life: 2.5, fromPlayer: false, dmg: 30 });
        }
      } else {
        const dir = new THREE.Vector3(player.pos.x - bPos.x, 0, player.pos.z - bPos.z).normalize();
        b.vel.x = dir.x * 88; b.vel.z = dir.z * 88;
        SoundFX.devastator();
        spawnComicPop(bPos.clone().add(new THREE.Vector3(0, 10, 0)), '*💛 БА-БАХ! ТАРАН!*', '#fff200');
        setTimeout(() => { if (b.group.parent && player.pos.distanceTo(bPos) < 11) applyDamageToHero(40); }, 350);
      }
    }

    if (b._isBeetrootTitan) {
      b._abilityCooldown -= dt;
      if (b._abilityCooldown > 0) return;
      const moveIdx = b._abilityRotation % 4; b._abilityRotation++;
      b._abilityCooldown = 2.9;
      if (moveIdx === 0) {
        setBossCastBar('💎 СЕГМЕНТАЦИЯ БАЛАНСА: [ЛКМ]/[Q] 4 РАЗА! 💎', 100, true);
        trapPlayerInSegmentationCrystal(4);
        const strikeSpot = player.pos.clone();
        setTimeout(() => {
          setBossCastBar('', 0, false);
          if (!b.group.parent) return;
          SoundFX.boom();
          const laser = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 120, 12), new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.75 }));
          laser.position.set(strikeSpot.x, 60, strikeSpot.z);
          scene.add(laser);
          setTimeout(() => { scene.remove(laser); laser.geometry.dispose(); laser.material.dispose(); }, 450);
          spawnGroundCrackRing(strikeSpot, 0xff00ff, 12);
          if (Math.hypot(player.pos.x - strikeSpot.x, player.pos.z - strikeSpot.z) < 6.5) applyDamageToHero(52);
        }, 2100);
      } else if (moveIdx === 1) {
        b._beetArmorClosed = true;
        if (b._diamondCoreMesh) b._diamondCoreMesh.material.color.setHex(0x330033);
        setBossCastBar('☁️ ПЕСТИЦИД «ОМНИОБЕЗЗАРАЖИВАТЕЛЬ» + БРОНЯ! ☁️', 100, true);
        setTimeout(() => setBossCastBar('', 0, false), 1800);
        spawnComicPop(bPos.clone().add(new THREE.Vector3(0, 10, 0)), '*☁️ УПОРЯДОЧИВАНИЕ ДНК!*', '#ff00ff');
        for (let gIdx = 0; gIdx < 3; gIdx++) {
          const gasPt = player.pos.clone().add(new THREE.Vector3((gIdx - 1) * 8, 0, (Math.random() - 0.5) * 8));
          spawnHazardPool(gasPt, 6.5, 0xaa00ff, 8.0, true);
        }
      } else if (moveIdx === 2) {
        setBossCastBar('☄️ БУРЯКОВЫЙ МЕТЕОРИТНЫЙ ЗАЛП! ☄️', 100, true);
        setTimeout(() => setBossCastBar('', 0, false), 1600);
        spawnJumpableShockwave(bPos.clone(), 42, 27, 0xff0055, 36);
        for (let m = 0; m < 6; m++) {
          setTimeout(() => {
            if (!b.group.parent) return;
            const pt = player.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 8, 0, (Math.random() - 0.5) * 8));
            spawnGroundCrackRing(pt, 0xff0055, 6);
            setTimeout(() => {
              SoundFX.boom();
              if (Math.hypot(player.pos.x - pt.x, player.pos.z - pt.z) < 5.5 && player.pos.y < 5) applyDamageToHero(34);
            }, 600);
          }, m * 250);
        }
      } else {
        b._beetArmorClosed = false;
        if (b._diamondCoreMesh) b._diamondCoreMesh.material.color.setHex(0x00ff66);
        const dir = new THREE.Vector3(player.pos.x - bPos.x, 0, player.pos.z - bPos.z).normalize();
        b.vel.x = dir.x * 92; b.vel.z = dir.z * 92;
        SoundFX.bossRoar();
        setBossCastBar('💎 ХРУСТ-Л-ХРУСТ! АЛМАЗ ОТКРЫТ! 💎', 100, true);
        setTimeout(() => setBossCastBar('', 0, false), 2200);
      }
    }

    if (b._isSterilityMonolith) {
      if (hpPct <= 0.45 && !b._phase3) { b._phase3 = true; activateNanoberry2DivineSynthesis(); }
      b._abilityCooldown -= dt;
      if (b._abilityCooldown > 0) return;
      const moveIdx = b._abilityRotation % 4; b._abilityRotation++;
      b._abilityCooldown = 2.5;
      if (moveIdx === 0) {
        setBossCastBar('⚪ ЛУЧ СТЕРИЛЬНОСТИ (ПРЫГАЙТЕ!) ⚪', 100, true);
        setTimeout(() => setBossCastBar('', 0, false), 1500);
        SoundFX.devastator();
        const beamGeo = new THREE.CylinderGeometry(1.0, 1.0, 44, 10);
        beamGeo.rotateX(Math.PI / 2);
        const beamMesh = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
        scene.add(beamMesh);
        let sw = 0;
        const startA = Math.atan2(player.pos.x - bPos.x, player.pos.z - bPos.z) - 1.1;
        const swInt = setInterval(() => {
          sw += 0.045;
          if (!b.group.parent || sw >= 1.0) { clearInterval(swInt); scene.remove(beamMesh); beamGeo.dispose(); beamMesh.material.dispose(); return; }
          const a = startA + sw * 2.2;
          const d = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
          const ch = bPos.clone().add(new THREE.Vector3(0, 3.0, 0));
          beamMesh.position.copy(ch).addScaledVector(d, 22);
          beamMesh.lookAt(ch.clone().addScaledVector(d, 44));
          const toP = player.pos.clone().sub(bPos);
          const prj = toP.x * d.x + toP.z * d.z;
          if (prj > 0 && prj < 44 && player.pos.y < 5.0) {
            const perpSq = (toP.x * toP.x + toP.z * toP.z) - prj * prj;
            if (perpSq < 5.0) applyDamageToHero(20);
          }
        }, 30);
      } else if (moveIdx === 1) {
        setBossCastBar('📐 ГЕОМЕТРИЗАЦИЯ (ПЕРЕПРЫГИВАЙТЕ КОЛЬЦА!) 📐', 100, true);
        setTimeout(() => setBossCastBar('', 0, false), 1400);
        for (let w = 0; w < 3; w++) setTimeout(() => { if (b.group.parent) spawnJumpableShockwave(bPos.clone(), 44, 29, 0xffffff, 38); }, w * 340);
      } else if (moveIdx === 2) {
        const behind = new THREE.Vector3(Math.sin(player.camYaw) * 5, 0, Math.cos(player.camYaw) * 5);
        bPos.copy(getSafeOpenGroundPos(player.pos.x + behind.x, player.pos.z + behind.z, 3));
        trapPlayerInSegmentationCrystal(4);
        setBossCastBar('⚪ ДОМИНИОН: РАЗБЕЙТЕ КЛЕТКУ [ЛКМ]/[Q]! ⚪', 100, true);
        setTimeout(() => setBossCastBar('', 0, false), 1800);
      } else {
        setBossCastBar('⚪ ПЕРВИЧНАЯ ОЧИСТКА: ШТОРМ! ⚪', 100, true);
        setTimeout(() => setBossCastBar('', 0, false), 1200);
        SoundFX.boom();
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2;
          const pr = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), new THREE.MeshBasicMaterial({ color: 0xe0ffff }));
          pr.position.copy(bPos).add(new THREE.Vector3(0, 3.8, 0));
          scene.add(pr);
          projectiles.push({ mesh: pr, vel: new THREE.Vector3(Math.sin(a) * 50, 0, Math.cos(a) * 50), life: 2.5, fromPlayer: false, dmg: 32 });
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 11. ПОЛНАЯ 18-ГЛАВНАЯ САГА (v110)
  // ═══════════════════════════════════════════════════════════════════════════
  const StoryCampaign = {
    chapter: 1, totalChapters: 18, completed: false, mode: 'destroy',
    objectives: [], defendTimer: 0, defendCore: null,
    waypointBeam: null, waypointRing: null, epilogueGarden: null,
    targetPos: new THREE.Vector3(0, 0, -35), bossEntity: null
  };
  window.StoryCampaign = StoryCampaign;

  const storyHudEl = document.createElement('div');
  storyHudEl.id = 'story-campaign-hud';
  storyHudEl.style.cssText = 'position:fixed;top:54px;left:50%;transform:translateX(-50%) skewX(-4deg);z-index:25;min-width:500px;max-width:760px;background:linear-gradient(135deg,rgba(18,6,28,.95),rgba(40,10,18,.92));border:3px solid #000;outline:3px solid #f9ca24;padding:8px 18px;text-align:center;box-shadow:0 8px 25px rgba(0,0,0,.85),6px 6px 0 #000;pointer-events:auto;';
  storyHudEl.innerHTML = '<div id="story-ch-title" style="font-family:Bangers,Impact,sans-serif;font-size:19px;color:#f9ca24;letter-spacing:1.5px;text-shadow:2px 2px 0 #000;">📖 ГЛАВА 1/18: ПРОБУЖДЕНИЕ ОРАНЖ</div><div id="story-ch-desc" style="font-size:12px;font-weight:900;color:#fff;margin-top:2px;">Уничтожьте 3 Якоря Цитрус Дефенс</div><div id="story-ch-dist" style="font-size:11px;font-weight:900;color:#00f2fe;margin-top:3px;">📍 ДО ЦЕЛИ: 0 М</div>';
  document.body.appendChild(storyHudEl);

  const comicDialogEl = document.createElement('div');
  comicDialogEl.id = 'comic-dialog-panel';
  comicDialogEl.style.cssText = 'position:fixed;bottom:108px;right:18px;width:455px;z-index:60;background:#fff8e7;border:4px solid #000;outline:3px solid #ff7f00;padding:12px 14px;color:#000;box-shadow:8px 8px 0 #000;display:none;transform:rotate(-1deg);pointer-events:none;';
  comicDialogEl.innerHTML = '<div id="comic-dlg-header" style="background:#ff7f00;color:#000;font-family:Bangers,Impact,sans-serif;font-size:18px;padding:2px 8px;border:2px solid #000;display:inline-block;margin-bottom:6px;letter-spacing:1px;">ПРИЗЫВ К ОРУЖИЮ</div><div style="display:flex;gap:10px;align-items:center;"><div id="comic-dlg-avatar" style="width:58px;height:58px;border:3px solid #000;background:#6a1b9a;display:flex;align-items:center;justify-content:center;font-size:34px;flex-shrink:0;">🍇</div><div id="comic-dlg-text" style="font-size:12.5px;font-weight:900;line-height:1.35;color:#111;"></div></div>';
  document.body.appendChild(comicDialogEl);

  let _comicDlgTimer = null;
  function showComicCutsceneBanner(header, speakerIcon, bgHex, text, durationMs = 8000) {
    const hEl = document.getElementById('comic-dlg-header'), aEl = document.getElementById('comic-dlg-avatar'), tEl = document.getElementById('comic-dlg-text');
    if (hEl) hEl.innerText = header;
    if (aEl) { aEl.innerText = speakerIcon; aEl.style.background = bgHex; }
    if (tEl) tEl.innerHTML = text;
    comicDialogEl.style.display = 'block';
    clearTimeout(_comicDlgTimer);
    _comicDlgTimer = setTimeout(() => { comicDialogEl.style.display = 'none'; }, durationMs);
  }

  function ensureStoryWaypointMesh() {
    if (StoryCampaign.waypointBeam) return;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 220, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xf9ca24, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
    beam.position.y = 110; scene.add(beam);
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.5, 5.2, 24), new THREE.MeshBasicMaterial({ color: 0xf9ca24, side: THREE.DoubleSide, transparent: true, opacity: 0.85, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.25; scene.add(ring);
    StoryCampaign.waypointBeam = beam; StoryCampaign.waypointRing = ring;
  }

  function spawnStoryObjectiveConstruct(x, y, z, kind) {
    const safePt = getSafeOpenGroundPos(x, z, 6);
    const g = new THREE.Group(); g.position.set(safePt.x, y, safePt.z);
    if (kind === 'anchor') {
      const pylonMat = createPrototypeShader(0xff7f00, 0x5a2000, 2, 0xfff200);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 4.2, 10, 8), pylonMat); base.position.y = 5; g.add(base);
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(2.4, 1), new THREE.MeshBasicMaterial({ color: 0xfff200 })); core.position.y = 12.5; g.add(core);
    } else if (kind === 'acid_dreadnought') {
      const orbMat = createPrototypeShader(0xff7f00, 0x9a3800, 4, 0x00ff66);
      const sphere = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(5.5, 16, 16), orbMat), 1.04); g.add(sphere);
      const acidVat = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.4, 3.2, 12), new THREE.MeshBasicMaterial({ color: 0x44ffaa })); acidVat.position.set(0, -4.5, 0); g.add(acidVat);
    } else if (kind === 'shrekich_server') {
      const srvMat = createPrototypeShader(0x0a2e1c, 0x00ff66, 2, 0x00f2fe);
      const tower = new THREE.Mesh(new THREE.BoxGeometry(3.2, 8.5, 3.2), srvMat); tower.position.y = 4.25; g.add(tower);
      const virusCore = new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 12), new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true })); virusCore.position.y = 6.5; g.add(virusCore);
      const ring = new THREE.Mesh(new THREE.RingGeometry(12.5, 14.0, 32), new THREE.MeshBasicMaterial({ color: 0x00f2fe, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.25; g.add(ring);
    } else if (kind === 'symbiote_hive') {
      const hiveMat = createPrototypeShader(0x4a1268, 0x180028, 1, 0xff00ff);
      const mound = addInkOutline(new THREE.Mesh(new THREE.ConeGeometry(4.8, 11, 10), hiveMat), 1.04); mound.position.y = 5.5; g.add(mound);
    } else if (kind === 'fat_geyser') {
      const fatMat = createPrototypeShader(0xe8b828, 0x8a5800, 4, 0xfff200);
      const crater = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 5.0, 6, 12), fatMat); crater.position.y = 3; g.add(crater);
      const fountain = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.2, 14, 10), new THREE.MeshBasicMaterial({ color: 0xfff200, transparent: true, opacity: 0.75 })); fountain.position.y = 10; g.add(fountain);
    } else if (kind === 'arctic_pylon') {
      const iceMat = new THREE.MeshPhongMaterial({ color: 0x18c8ff, emissive: 0x053858, transparent: true, opacity: 0.8 });
      const shard = new THREE.Mesh(new THREE.ConeGeometry(3.8, 16, 6), iceMat); shard.position.y = 8; g.add(shard);
    } else if (kind === 'cosmic_beet_ship') {
      const beetMat = createPrototypeShader(0x8a1442, 0x380418, 4, 0xff00ff);
      const rootBody = addInkOutline(new THREE.Mesh(new THREE.ConeGeometry(5.0, 9.5, 12), beetMat), 1.04);
      rootBody.rotation.x = Math.PI; rootBody.position.y = 8.0; g.add(rootBody);
      for (let i = 0; i < 5; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.2, 4.5, 5), createPrototypeShader(0x2ecc71, 0x145a32, 8));
        leaf.position.set((i - 2) * 0.9, 14.2, 0); leaf.rotation.z = (i - 2) * 0.25; g.add(leaf);
      }
    } else if (kind === 'pesticide_sprayer') {
      const tankMat = createPrototypeShader(0xd4a017, 0x5a3e00, 7, 0xff00ff);
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.2, 8, 10), tankMat); tank.position.y = 4; g.add(tank);
      const cloud = new THREE.Mesh(new THREE.SphereGeometry(5.5, 10, 10), new THREE.MeshBasicMaterial({ color: 0xb833ff, transparent: true, opacity: 0.35, wireframe: true })); cloud.position.y = 7.5; g.add(cloud);
    } else if (kind === 'sterility_obelisk') {
      const obMat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x334455, shininess: 150 });
      const ob = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 3.2, 18, 4), obMat); ob.position.y = 9; g.add(ob);
    }
    scene.add(g);
    const hpVal = kind === 'acid_dreadnought' ? 9500 : (kind === 'shrekich_server' ? 1400 : 3800);
    const constructEnemy = {
      type: kind === 'acid_dreadnought' ? 'heli' : 'tank',
      _isStoryConstruct: true, _constructKind: kind, group: g,
      hp: hpVal, maxHp: hpVal, vel: new THREE.Vector3(),
      speed: kind === 'acid_dreadnought' ? 7 : 0,
      radius: kind === 'acid_dreadnought' ? 5.8 : 4.4,
      attackCd: 99, dodgeCd: 99, flying: kind === 'acid_dreadnought', _rooted: 0
    };
    enemies.push(constructEnemy);
    return constructEnemy;
  }

  function activateNanoberry2DivineSynthesis() {
    player._multifruitTitanActive = true;
    player._nanoberry2Active = true;
    player.maxHp = Math.max(player.maxHp, 2000);
    player.hp = player.maxHp;
    player.maxEn = Math.max(player.maxEn, 1000);
    player.en = player.maxEn;
    if (!player._nano2CoreGroup) {
      const coreG = new THREE.Group();
      const berryCols = [0xff0055, 0x00f2fe, 0xfff200, 0x2ecc71, 0xbb44ff, 0xff7f00];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshBasicMaterial({ color: berryCols[i] }));
        b.position.set(Math.cos(a) * 0.25, 2.3 + Math.sin(a) * 0.25, 0.72); coreG.add(b);
      }
      const rainbowAura = new THREE.Mesh(new THREE.SphereGeometry(2.5, 16, 16), new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.25, wireframe: true }));
      rainbowAura.position.y = 2.0; coreG.add(rainbowAura);
      playerGroup.add(coreG);
      player._nano2CoreGroup = coreG;
    }
    spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 5.5, 0)), '🌈 НАНОЯГОДНЫЙ КОСТЮМ 2.0: БОЖЕСТВЕННЫЙ СИНТЕЗ! 🌈', '#00f2fe');
    SoundFX.devastator();
    triggerHitstopAndChroma(0.18, 1.2, 1.6);
    updateHUD();
  }

  function buildEpilogueMultifruitGarden() {
    if (StoryCampaign.epilogueGarden) return;
    const g = new THREE.Group(); g.position.set(0, 0, 0);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 4.2, 18, 10), createPrototypeShader(0x5a3e22, 0x2a1808, 7, 0xff00ff));
    trunk.position.y = 9; g.add(trunk);
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(12, 16, 14), createPrototypeShader(0x2ecc71, 0x145a32, 8, 0xadff2f));
    canopy.position.y = 20; g.add(canopy);
    const starCols = [0xff0055, 0xfff200, 0x00f2fe, 0x2ecc71, 0xff7f00, 0xbb44ff];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), new THREE.MeshBasicMaterial({ color: starCols[i % starCols.length] }));
      star.position.set(Math.cos(a) * 10, 14 + (i % 3) * 2, Math.sin(a) * 10);
      g.add(star);
    }
    scene.add(g);
    StoryCampaign.epilogueGarden = g;
  }

  function startStoryChapter(ch) {
    _soloBossLock = false;
    clearBossPhasePylons();
    setBossCastBar('', 0, false);
    if (StoryCampaign.defendCore && StoryCampaign.defendCore.parent) { scene.remove(StoryCampaign.defendCore); StoryCampaign.defendCore = null; }
    StoryCampaign.chapter = ch;
    StoryCampaign.objectives = [];
    StoryCampaign.bossEntity = null;
    ensureStoryWaypointMesh();
    const titleEl = document.getElementById('story-ch-title');
    const descEl = document.getElementById('story-ch-desc');
    switch (ch) {
      case 1:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 1/18: ПРОБУЖДЕНИЕ ОРАНЖ';
        descEl.innerText = 'Уничтожьте 3 Якоря Цитрус Дефенс вокруг Штаба BI';
        showComicCutsceneBanner('ЧАСТЬ 5: АПЕЛЬСИНОВАЯ ОРДА', '🍊', '#ff7f00', '<b>Грейпстасик:</b> «Я, Грейпстасик, призываю вас! Якоря Цитрус Дефенс... их единственная цель — уничтожение!»');
        [[0, -35], [-55, 18], [55, 18]].forEach(([x, z]) => StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'anchor')));
        break;
      case 2:
        StoryCampaign.mode = 'defend';
        StoryCampaign.defendTimer = 25.0;
        titleEl.innerText = '📖 ГЛАВА 2/18: ОБОРОНА ШТАБА BANANA INDUSTRIES';
        descEl.innerText = 'Удерживайте периметр Ядра Синтеза BI 25 секунд!';
        showComicCutsceneBanner('ОСАДА ШТАБА BI', '🛡️', '#00f2fe', '<b>Шрекич ИИ:</b> «Апельсиновые Сентинелы штурмуют площадь! Продержись 25 секунд!»');
        const coreGroup = new THREE.Mesh(new THREE.OctahedronGeometry(3.5, 1), new THREE.MeshBasicMaterial({ color: 0x00ff66, wireframe: true }));
        coreGroup.position.set(0, 4.5, -15); scene.add(coreGroup);
        StoryCampaign.defendCore = coreGroup;
        StoryCampaign.targetPos.set(0, 0, -15);
        break;
      case 3:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 3/18: ПЕРЕХВАТ БРОНЕКОНВОЯ CITRUS DEFENSE';
        descEl.innerText = 'Уничтожьте 3 бронетранспортёра APC!';
        showComicCutsceneBanner('АРМИЯ НА МАРШЕ', '🚜', '#ff9f1a', '<b>Orange Captain:</b> «Банан-Индастриз — это вчера! Цитрус Дефенс — это завтра!»');
        [[-45, 70], [0, 85], [45, 70]].forEach(([x, z]) => {
          const pt = getSafeOpenGroundPos(x, z, 6);
          spawnCitrusAPC(pt.x, pt.z);
          StoryCampaign.objectives.push(enemies[enemies.length - 1]);
        });
        break;
      case 4:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 4/18: КИСЛОТНЫЙ ДРЕДНОУТ';
        descEl.innerText = 'Сбейте летающий Кислотный Апельсин-Дредноут!';
        showComicCutsceneBanner('ЧАСТЬ 6: КИСЛОТНЫЙ ТРИУМФ', '🍇', '#6a1b9a', '<b>Грейпстасик:</b> «Банан-Индастриз... весь этот сладкий, мягкий мир... он будет стёрт!»');
        StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(0, 14, 40, 'acid_dreadnought'));
        break;
      case 5:
        StoryCampaign.mode = 'shrekich_servers';
        titleEl.innerText = '📖 ГЛАВА 5/18: ОЧИСТКА СЕРВЕРОВ ШРЕКИЧА';
        descEl.innerText = 'Разбейте вирусные ядра на 3 серверах!';
        showComicCutsceneBanner('ШРЕКИЧ ИИ ВЗЛОМАН!', '💻', '#00aa44', '<b>Шрекич ИИ:</b> «Вирус Грейпстасика заразил 3 моих серверных узла! Сбей наросты ударом!»');
        [[0, 32], [-42, 10], [42, 10]].forEach(([x, z]) => StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'shrekich_server')));
        break;
      case 6:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 6/18: ЧАСТЬ XI — ПРОРЫВ СИМБИОТА';
        descEl.innerText = 'Уничтожьте 3 Улья Симбиота Грейпстасика!';
        showComicCutsceneBanner('ПРОРЫВ ИЗ ПРОШЛОГО', '🍋', '#f9ca24', '<b>Димон Лимон:</b> «Энергия зашкаливает! Из ульев прорывается сам Био-Грейпстасик!»');
        [[0, -40], [-48, -20], [48, -20]].forEach(([x, z]) => StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'symbiote_hive')));
        break;
      case 7:
        StoryCampaign.mode = 'boss';
        titleEl.innerText = '🔥 ГЛАВА 7/18 (СОЛО-БОСС 1/4): БИО-ТИТАН ГРЕЙПСТАСИК';
        descEl.innerText = 'Победите Грейпстасика (разбивайте пилоны на 66% и 33%)!';
        showComicCutsceneBanner('СОЛО-ДУЭЛЬ: РОЖДЕНИЕ ГРЕЙПСТАСИКА!', '👾', '#3a1058', '<b>Био-Грейпстасик:</b> «Выходим один на один! Я перепрограммирую этот мир на ИСТИННУЮ ГОРЕЧЬ!»', 9500);
        StoryCampaign.bossEntity = window.spawnSoloFinalGrapestasik(0, -25);
        break;
      case 8:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 8/18: ЧАСТЬ XII — ЛИПКОЕ ВТОРЖЕНИЕ';
        descEl.innerText = 'Разрушьте 3 Золотых Гейзера био-полимера!';
        showComicCutsceneBanner('НОВОЕ СОСТОЯНИЕ ВЕЩЕСТВА', '💛', '#d4a017', '<b>Димон Лимон:</b> «Это не кислота Грейпстасика! Слишком густая... Обнаружен жировой био-полимер Жиригоря!»');
        [[0, 45], [-45, 25], [45, 25]].forEach(([x, z]) => StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'fat_geyser')));
        break;
      case 9:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 9/18: КАТАЛИЗАТОРЫ РЕКРИСТАЛЛИЗАЦИИ';
        descEl.innerText = 'Разбейте 3 Арктических Пилона!';
        showComicCutsceneBanner('ХРУСТЬ-ХРУСТЬ...', '❄️', '#00f2fe', '<b>Егорбанан:</b> «Он использует арктический холод как катализатор! Уничтожь ледяные пилоны!»');
        [[-45, -35], [45, -35], [0, -65]].forEach(([x, z]) => StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'arctic_pylon')));
        break;
      case 10:
        StoryCampaign.mode = 'boss';
        titleEl.innerText = '🔥 ГЛАВА 10/18 (СОЛО-БОСС 2/4): АБСОЛЮТНЫЙ ЖИРИГОРЬ';
        descEl.innerText = 'Победите Жиригоря (прыгайте через цунами, пробивайте панцирь)!';
        showComicCutsceneBanner('СОЛО-ДУЭЛЬ: СТОЛКНОВЕНИЕ ВЕКА!', '💛', '#e8b828', '<b>Жиригорь:</b> «Приветствую, мои сочные! Я Жиригорь, и я выхожу против тебя ОДИН НА ОДИН!»', 9500);
        StoryCampaign.bossEntity = window.spawnSoloFinalJirigory(0, 30);
        break;
      case 11:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 11/18: ЧАСТЬ XV — КОСМИЧЕСКАЯ ИНКВИЗИЦИЯ';
        descEl.innerText = 'Уничтожьте 3 Космических Буряка-Инквизитора!';
        showComicCutsceneBanner('ПРИГОВОР ГАЛАКТИКИ: АЛЬЯНС КОРНЕЙ', '🟣', '#8a1442', '<b>Горецка:</b> «Вы создали Мультифрукт. Приговор: Тотальное Сегментирование!»', 9500);
        [[0, -35], [-52, 20], [52, 20]].forEach(([x, z]) => StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'cosmic_beet_ship')));
        break;
      case 12:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 12/18: ЧАСТЬ XX — ЦИТАДЕЛЬ ЧИСТОТЫ';
        descEl.innerText = 'Вырвитесь из Кристаллической Сегментации!';
        showComicCutsceneBanner('КОД «ПРОБОЙНИК»', '💎', '#ff00ff', '<b>Горецка:</b> «Вы — системная ошибка!»<br><b>Егорбанан:</b> «Кисляк-Резонанс: МАКСИМУМ! Разбиваем кристаллы изнутри!»', 9000);
        trapPlayerInSegmentationCrystal(4);
        [[-40, 50], [40, 50], [0, 80]].forEach(([x, z]) => StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'cosmic_beet_ship')));
        break;
      case 13:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 13/18: ЧАСТЬ XXII — ПЕСТИЦИД «ОМНИОБЕЗЗАРАЖИВАТЕЛЬ»';
        descEl.innerText = 'Уничтожьте 3 Распылителя пестицида!';
        showComicCutsceneBanner('ОПЕРАЦИЯ «ЧИСТЫЕ СЕГМЕНТЫ»', '☁️', '#6a1b9a', '<b>Горецка:</b> «Это ПЕСТИЦИД "ОМНИОБЕЗЗАРАЖИВАТЕЛЬ"! Он упорядочивает ДНК в мёртвые сегменты!»<br><b>Хохлорковь:</b> «Джунгли не погибли! Я чувствую пульс ядра!»', 9500);
        [[0, -45], [-48, -15], [48, -15]].forEach(([x, z]) => StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'pesticide_sprayer')));
        break;
      case 14:
        StoryCampaign.mode = 'boss';
        titleEl.innerText = '🔥 ГЛАВА 14/18 (СОЛО-БОСС 3/4): ТИТАН ГОРЕЦКА';
        descEl.innerText = 'Вскрывайте Алмаз в груди Титана!';
        showComicCutsceneBanner('ГНЕВ СВЕКОЛЬНОГО ТИТАНА', '🟣', '#7a1238', '<b>Горецка:</b> «Нет! Моя ДНК... она... ВКУСНЕЕТ?! Стерильность или смерть!»<br><b>Перец:</b> «Попробуй-ка на вкус Острый Цитрон!»', 10000);
        StoryCampaign.bossEntity = window.spawnSoloBeetrootTitanGoretzka(0, 25);
        break;
      case 15:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 15/18: НАЧАЛО ДИСТИЛЛЯЦИИ';
        descEl.innerText = 'Разрушьте 4 Белых Обелиска Первичной Очистки!';
        showComicCutsceneBanner('ЗАБЫТЫЙ ОСТАТОК — УЛЬТИМАТУМ СТЕРИЛЬНОСТИ', '⚪', '#3a4a5a', '<b>Монолит:</b> «Ты думал, победил, Банан? Твой "Синтез" лишь сжал меня... Я подарю вам покой Дистилляции!»', 9500);
        [[-45, 45], [45, 45], [-45, -45], [45, -45]].forEach(([x, z]) => StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'sterility_obelisk')));
        break;
      case 16:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 16/18: НАНОЯГОДЫ 2.0 И РЫЦАРЬ ОСТРОТЫ';
        descEl.innerText = 'Наноягодный Костюм 2.0 активирован! Разбейте 3 Ядра Доминиона!';
        showComicCutsceneBanner('ОШИБКА 101: СИСТЕМА ЭВОЛЮЦИОНИРУЕТ!', '🌈', '#ff0055', '<b>Перец:</b> «Моё сердце полно жара!»<br><b>Егорбанан:</b> «Система не сбоит. Она ЭВОЛЮЦИОНИРУЕТ!»', 10000);
        activateNanoberry2DivineSynthesis();
        [[0, 55], [-42, 20], [42, 20]].forEach(([x, z]) => StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'sterility_obelisk')));
        break;
      case 17:
        StoryCampaign.mode = 'boss';
        titleEl.innerText = '🔥 ГРАНД-ФИНАЛ (СОЛО-БОСС 4/4): МОНОЛИТ СТЕРИЛЬНОСТИ';
        descEl.innerText = 'Сокрушите Монолит Волной Ионизации!';
        showComicCutsceneBanner('ДОМИНИОН СТЕРИЛЬНОСТИ ПРОТИВ ТОРЖЕСТВА СИНТЕЗА!', '⚪', '#1a2a3a', '<b>Монолит:</b> «Здесь больше нет хаоса. Совершенный порядок: ДОМИНИОН СТЕРИЛЬНОСТИ!»<br><b>Егорбанан:</b> «Я возвращаю Вкус! ВОЛНА ИОНИЗАЦИИ!»', 10500);
        activateNanoberry2DivineSynthesis();
        StoryCampaign.bossEntity = window.spawnSoloMonolithOfSterility(0, -25);
        break;
      default:
        StoryCampaign.completed = true;
        _soloBossLock = false;
        buildEpilogueMultifruitGarden();
        titleEl.innerText = '🏆 ГРАНД-ФИНАЛ: «СТАТУС: БАЛАНС. ЖИЗНЬ ПРОРОСЛА.»';
        descEl.innerText = 'Все 18 глав и 4 Соло-Босса пройдены! (+30 000 EP)';
        document.getElementById('story-ch-dist').innerText = '🌳 Древо Мультифрукта «M» расцвело! [Нажмите N для новой игры+]';
        if (StoryCampaign.waypointBeam) StoryCampaign.waypointBeam.visible = false;
        if (StoryCampaign.waypointRing) StoryCampaign.waypointRing.visible = false;
        player.ep += 30000;
        player.score += 300000;
        updateHUD(); updateScoreDisplay();
        showComicCutsceneBanner('ФИНАЛ МИРА (THE END OF THE SAGA)', '🌳', '#2ecc71', '<b>Вся Команда:</b> «Наш Единый Баланс — это начало нашей Мультифрукт-Галактики. Упорядоченность мертва. Но Вкус... он вечен!»<br><b>Шрекич ИИ:</b> «СТАТУС: БАЛАНС. ЖИЗНЬ ПРОРОСЛА.»', 14000);
        break;
    }
  }
  window.startStoryChapter = startStoryChapter;

  setTimeout(() => { startStoryChapter(1); }, 900);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyN' && gameStarted && !player.isDead) {
      if (StoryCampaign.completed) startStoryChapter(1);
      else startStoryChapter(StoryCampaign.chapter + 1);
    }
  });

  // Story tick
  setInterval(() => {
    if (!gameStarted || player.isDead || StoryCampaign.completed) return;
    const ch = StoryCampaign.chapter;
    const descEl = document.getElementById('story-ch-desc');
    const distEl = document.getElementById('story-ch-dist');
    const nowSec = performance.now() * 0.001;
    if (StoryCampaign.mode === 'destroy') {
      StoryCampaign.objectives = StoryCampaign.objectives.filter((obj) => obj && obj.hp > 0 && enemies.indexOf(obj) !== -1);
      if (StoryCampaign.objectives.length === 0) {
        SoundFX.devastator();
        player.ep += 450; player.score += 7000;
        updateHUD(); updateScoreDisplay();
        startStoryChapter(ch + 1);
        return;
      }
      let nearest = StoryCampaign.objectives[0];
      let minD = player.pos.distanceTo(nearest.group.position);
      for (let i = 1; i < StoryCampaign.objectives.length; i++) {
        const d = player.pos.distanceTo(StoryCampaign.objectives[i].group.position);
        if (d < minD) { minD = d; nearest = StoryCampaign.objectives[i]; }
      }
      StoryCampaign.targetPos.copy(nearest.group.position);
      if (descEl) descEl.innerText = `Целей главы осталось: ${StoryCampaign.objectives.length} | [N] — пропуск главы`;
    } else if (StoryCampaign.mode === 'shrekich_servers') {
      StoryCampaign.objectives = StoryCampaign.objectives.filter((obj) => obj && obj.hp > 0 && enemies.indexOf(obj) !== -1);
      for (let i = StoryCampaign.objectives.length - 1; i >= 0; i--) {
        const srv = StoryCampaign.objectives[i];
        const flatDist = Math.hypot(player.pos.x - srv.group.position.x, player.pos.z - srv.group.position.z);
        if (flatDist < 15.0) damageEnemy(srv, 95, new THREE.Vector3(), '*💻 ОЧИСТКА!*');
      }
      StoryCampaign.objectives = StoryCampaign.objectives.filter((obj) => obj && obj.hp > 0 && enemies.indexOf(obj) !== -1);
      if (StoryCampaign.objectives.length === 0) {
        SoundFX.devastator();
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 4, 0)), '💻 СЕРВЕРЫ ОЧИЩЕНЫ!', '#00ff66');
        player.ep += 500;
        startStoryChapter(ch + 1);
        return;
      }
      StoryCampaign.targetPos.copy(StoryCampaign.objectives[0].group.position);
      if (descEl) descEl.innerText = `Очистите серверы Шрекича (Осталось: ${StoryCampaign.objectives.length})`;
    } else if (StoryCampaign.mode === 'defend') {
      StoryCampaign.defendTimer -= 0.1;
      if (StoryCampaign.defendCore) StoryCampaign.defendCore.rotation.y += 0.08;
      if (enemies.length < 4) {
        const a = Math.random() * Math.PI * 2;
        spawnCitrusSoldier(Math.cos(a) * 24, -15 + Math.sin(a) * 24, 'mandarin');
      }
      if (descEl) descEl.innerText = `Обороняйте Ядро! Осталось: ${Math.max(0, StoryCampaign.defendTimer).toFixed(1)} сек`;
      if (StoryCampaign.defendTimer <= 0) {
        SoundFX.devastator();
        player.ep += 400;
        startStoryChapter(ch + 1);
        return;
      }
    } else if (StoryCampaign.mode === 'boss') {
      const b = StoryCampaign.bossEntity;
      if (!b || b.hp <= 0 || enemies.indexOf(b) === -1) {
        _soloBossLock = false;
        clearBossPhasePylons();
        setBossCastBar('', 0, false);
        SoundFX.devastator();
        player.ep += 2000; player.score += 35000;
        updateHUD(); updateScoreDisplay();
        startStoryChapter(ch + 1);
        return;
      }
      StoryCampaign.targetPos.copy(b.group.position);
    }
    if (StoryCampaign.waypointBeam && StoryCampaign.waypointRing) {
      StoryCampaign.waypointBeam.visible = true;
      StoryCampaign.waypointRing.visible = true;
      StoryCampaign.waypointBeam.position.x = StoryCampaign.targetPos.x;
      StoryCampaign.waypointBeam.position.z = StoryCampaign.targetPos.z;
      StoryCampaign.waypointRing.position.set(StoryCampaign.targetPos.x, 0.3, StoryCampaign.targetPos.z);
      StoryCampaign.waypointRing.scale.setScalar(1 + Math.sin(nowSec * 5) * 0.2);
      const distMeters = Math.round(Math.hypot(player.pos.x - StoryCampaign.targetPos.x, player.pos.z - StoryCampaign.targetPos.z));
      if (distEl) distEl.innerText = `📍 ДО ЦЕЛИ: ${distMeters} М | [N] — СЛЕДУЮЩАЯ ГЛАВА`;
    }
  }, 100);

  // Волна ионизации на ЛКМ при multifruit
  const _origPPAM = window.performPrimaryAttack;
  window.performPrimaryAttack = function () {
    if (registerPlayerBreakoutAttempt()) return;
    if (player.isDead || player.consumeState) return;
    if (typeof applyMeleeSoftLockLunge === 'function') { /* soft-lock внутри potato-логики */ }
    if (!window.__POTATO_MODE) {
      if (_origPPAM) _origPPAM.apply(this, arguments);
    } else {
      // Полная potato-атака (v65)
      if (player.attackTimer > 0.08) return;
      if (potatoComboTimer <= 0) potatoCombo = 0;
      potatoComboTimer = 1.5;
      const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
      const isMorg = window.__POTATO_FORM === 1;
      const maxCombo = isMorg ? 3 : 5;
      potatoCombo = (potatoCombo % maxCombo) + 1;
      const comboStep = isMorg && potatoCombo === 3 ? 5 : potatoCombo;
      player.comboStep = comboStep;
      player.attackDuration = PLAYER_COMBO[comboStep].dur;
      player.attackTimer = player.attackDuration;
      player.comboResetTimer = 1.5;
      player.facingYaw = player.camYaw;
      player.vel.x += fwd.x * PLAYER_COMBO[comboStep].lunge;
      player.vel.z += fwd.z * PLAYER_COMBO[comboStep].lunge;
      let baseDmg = isMorg ? 95 : 76;
      if (!isMorg && player._tomatoRage > 0) baseDmg *= 1.45;
      const isFinisher = potatoCombo === maxCombo;
      const dmgMult = isFinisher ? 2.5 : 1.0;
      const chest = new THREE.Vector3(player.pos.x, player.pos.y + 2.3, player.pos.z);
      const slashColor = isMorg ? 0x2ecc71 : 0xff2200;
      spawnSlashArc(chest.clone().add(fwd.clone().multiplyScalar(1.8)), player.facingYaw, PLAYER_COMBO[comboStep].tilt, slashColor, isMorg ? 5.2 : 4.2, 0.22);
      if (isFinisher) {
        if (isMorg) {
          spawnGroundCrackRing(new THREE.Vector3(player.pos.x + fwd.x * 3.6, 0, player.pos.z + fwd.z * 3.6), 0x2ecc71, 11);
          SoundFX.devastator(); triggerHitstopAndChroma(0.06, 0.65, 1.15);
        } else {
          const fireBall = new THREE.Mesh(new THREE.SphereGeometry(0.72, 10, 10), new THREE.MeshBasicMaterial({ color: 0xff2200 }));
          fireBall.position.copy(chest); scene.add(fireBall);
          projectiles.push({ mesh: fireBall, vel: new THREE.Vector3(fwd.x * 48, 0, fwd.z * 48), life: 1.5, fromPlayer: true, dmg: baseDmg * 2.5, radius: 3.0 });
          spawnParticles(chest, 0xff2200, 12);
          triggerHitstopAndChroma(0.05, 0.6, 1.1);
        }
      }
      SoundFX.swing(190 + potatoCombo * 48);
      const hr = isFinisher ? (isMorg ? 10.5 : 6.8) : (isMorg ? 6.2 : 5.2);
      const hx = player.pos.x + fwd.x * 3.4, hz = player.pos.z + fwd.z * 3.4;
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const dx = e.group.position.x - hx, dz = e.group.position.z - hz;
        if (dx * dx + dz * dz <= (hr + e.radius) * (hr + e.radius)) {
          if (isFinisher && isMorg) e.vel.y = 18;
          damageEnemy(e, baseDmg * dmgMult, new THREE.Vector3(fwd.x * 3.5, 0, fwd.z * 3.5), isFinisher ? (isMorg ? '*🔨 КРУШИТЕЛЬ!*' : '*🔥 ХУК!*') : '');
        }
      }
      checkCarDestruction(new THREE.Vector3(hx, 0, hz), hr);
    }
    if (player._multifruitTitanActive) {
      const fwd2 = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
      const chest2 = player.pos.clone().add(new THREE.Vector3(0, 2.3, 0));
      spawnSlashArc(chest2.clone().add(fwd2.clone().multiplyScalar(3)), player.facingYaw, 0, 0x7cfc00, 9.0, 0.25);
      spawnSlashArc(chest2.clone().add(fwd2.clone().multiplyScalar(4.2)), player.facingYaw, 0.3, 0xff00ff, 10.0, 0.28);
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.group.position.distanceTo(player.pos) <= 16) damageEnemy(e, 340, fwd2.clone().multiplyScalar(6), '*🌈 ВОЛНА ИОНИЗАЦИИ!*');
      }
    }
  };

  const _origPerformDevastatorM = window.performDevastator;
  window.performDevastator = function () {
    registerPlayerBreakoutAttempt();
    if (!window.__POTATO_MODE) {
      if (_origPerformDevastatorM) return _origPerformDevastatorM.apply(this, arguments);
      return;
    }
    if (player.isDead || player.consumeState) return;
    if (window.__POTATO_FORM === 1) {
      if (player._potatoSlamCd > 0) return;
      player._potatoSlamCd = 4.0;
      player.vel.y = 22;
      SoundFX.whip();
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '⚡ ГРОМОВОЙ МОЛОТ! ⚡', '#8B4513');
      setTimeout(() => {
        player.vel.y = -85;
        setTimeout(() => {
          spawnGroundCrackRing(player.pos, 0x8B4513, 18);
          spawnParticles(player.pos.clone().add(new THREE.Vector3(0, 1, 0)), 0x8B4513, 28);
          SoundFX.boom(); SoundFX.devastator();
          triggerHitstopAndChroma(0.12, 0.9, 1.4);
          if (typeof spawnLandingCrater === 'function') spawnLandingCrater(player.pos, 5);
          for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            const d = e.group.position.distanceTo(player.pos);
            if (d < 15) { e.vel.y = Math.max(e.vel.y, 16); damageEnemy(e, 260 * (1 - d / 17), new THREE.Vector3(), '*🔨 ЗЕМЛЕТРЯСЕНИЕ!*'); }
          }
        }, 280);
      }, 360);
    } else {
      if (player._potatoNovaCd > 0) return;
      player._potatoNovaCd = 5.0;
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '🔥 СВЕРХНОВА! 🔥', '#FF2200');
      SoundFX.devastator(); SoundFX.boom();
      triggerHitstopAndChroma(0.1, 0.8, 1.3);
      spawnGroundCrackRing(player.pos, 0xFF2200, 15);
      spawnParticles(player.pos.clone().add(new THREE.Vector3(0, 2, 0)), 0xFF2200, 36);
      const hasThermo = EvoModules.has('potato_thermo_ketchup');
      for (let j = enemies.length - 1; j >= 0; j--) {
        const en = enemies[j];
        const dist = en.group.position.distanceTo(player.pos);
        if (dist < 15) {
          en.vel.y = Math.max(en.vel.y, 13);
          if (hasThermo) en._ketchupSlowTimer = 4.0;
          damageEnemy(en, 310 * (1 - dist / 17), new THREE.Vector3(), '*🔥 СВЕРХНОВА!*');
        }
      }
      if (hasThermo) activeTimedZones.push({ kind: 'ketchup_bomb', pos: player.pos.clone(), radius: 14, dmg: 280, color: 0xff2200, life: 2.0, maxLife: 2.0 });
    }
  };

  const _origTriggerUniqueAbilityFM = window.triggerUniqueAbilityF;
  window.triggerUniqueAbilityF = function () {
    registerPlayerBreakoutAttempt();
    if (!window.__POTATO_MODE) {
      if (_origTriggerUniqueAbilityFM) return _origTriggerUniqueAbilityFM.apply(this, arguments);
      return;
    }
    if (player.isDead) return;
    const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw)).normalize();
    if (window.__POTATO_FORM === 1) {
      if (player._potatoRamCd > 0) return;
      player._potatoRamCd = 6.0;
      const startPos = player.pos.clone();
      player.vel.x += fwd.x * 95; player.vel.z += fwd.z * 95;
      player.dodgeIframes = 0.6;
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '💥 КРАХМАЛЬНЫЙ ТАРАН! 💥', '#8B4513');
      SoundFX.devastator();
      if (EvoModules.has('potato_starch_juggernaut')) {
        for (let s = 1; s <= 5; s++) {
          const trailPos = startPos.clone().addScaledVector(fwd, s * 3.8);
          const patchMesh = new THREE.Mesh(new THREE.CircleGeometry(2.6, 12), new THREE.MeshBasicMaterial({ color: 0xff5500, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
          patchMesh.rotation.x = -Math.PI / 2;
          patchMesh.position.set(trailPos.x, 0.14, trailPos.z);
          scene.add(patchMesh);
          activeTimedZones.push({ kind: 'starch_fire_trail', pos: trailPos, radius: 3.4, color: 0xff5500, mesh: patchMesh, life: 5.0, maxLife: 5.0, tickAccum: 0 });
        }
      }
      setTimeout(() => {
        for (let i = enemies.length - 1; i >= 0; i--) {
          const e = enemies[i];
          if (e.group.position.distanceTo(player.pos) < 8.5) {
            e.vel.y = Math.max(e.vel.y, 18);
            damageEnemy(e, 195, fwd.clone().multiplyScalar(8), '*ТАРАН!*');
          }
        }
      }, 180);
    } else {
      if (player._potatoSauceCd > 0) return;
      player._potatoSauceCd = 3.0;
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '🍅 СТРУЯ СОУСА! 🍅', '#FF2200');
      const hasThermo = EvoModules.has('potato_thermo_ketchup');
      for (let step = 1; step < 16; step++) {
        setTimeout(() => {
          const p = player.pos.clone().addScaledVector(fwd, step * 1.15);
          spawnParticles(p, 0xcc0000, 3);
          for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            if (e.group.position.distanceTo(p) < 3.4) {
              if (hasThermo) e._ketchupSlowTimer = 4.0;
              damageEnemy(e, 32, fwd.clone(), '');
            }
          }
        }, step * 25);
      }
      if (hasThermo) activeTimedZones.push({ kind: 'ketchup_bomb', pos: player.pos.clone().addScaledVector(fwd, 10), radius: 9.0, dmg: 210, color: 0xff2200, life: 2.0, maxLife: 2.0 });
    }
  };

  // Полный ввод potato (C/T/R/1/2)
  window.addEventListener('keydown', function (e) {
    if (!window.__POTATO_MODE || player.isDead) return;
    if (e.code === 'KeyC') {
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      if (window.__POTATO_FORM === 1) {
        if (player._potatoHealCd > 0) return;
        player._potatoHealCd = 10.0;
        player.hp = Math.min(player.maxHp, player.hp + 250);
        player._potatoArmor = 4.0;
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '🌱 ПИТАНИЕ КОРНЕЙ (+250 HP)', '#2ecc71');
        spawnGroundCrackRing(player.pos, 0x2ecc71, 8);
        SoundFX.hit(150, 0.3);
        updateHUD();
      } else {
        if (player._potatoRageCd > 0) return;
        player._potatoRageCd = 12.0;
        player._tomatoRage = 6.0;
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '🔥 ИСПЫТАНИЕ ПЛАМЕНЕМ!', '#FF4400');
        SoundFX.devastator();
      }
    } else if (e.code === 'KeyT' && window.__POTATO_FORM === 2) {
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      if (player._potatoPortalCd > 0) return;
      let bestE = null, bestD = 9999;
      for (let i = 0; i < enemies.length; i++) {
        const d = player.pos.distanceTo(enemies[i].group.position);
        if (d < bestD) { bestD = d; bestE = enemies[i]; }
      }
      if (bestE) {
        player._potatoPortalCd = 25.0;
        player.pos.copy(bestE.group.position).add(new THREE.Vector3(0, 0, 3.8));
        player.vel.set(0, 0, 0);
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '🍅 ТОМАТНЫЙ ПОРТАЛ!', '#FF2200');
        spawnParticles(player.pos.clone(), 0xFF2200, 20);
        SoundFX.whip();
      }
    } else if (e.code === 'KeyR') {
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      switchPotatoForm(window.__POTATO_FORM === 1 ? 2 : 1);
    } else if (e.code === 'Digit1' || e.code === 'Numpad1') {
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      if (window.__POTATO_FORM !== 1) switchPotatoForm(1);
    } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      if (window.__POTATO_FORM !== 2) switchPotatoForm(2);
    }
  }, true);

  const _origGetSuitDataM = window.getSuitData;
  window.getSuitData = function () {
    if (window.__POTATO_MODE) {
      if (window.__POTATO_FORM === 1) return { id: 'potato1', name: 'МОРГЕНКАРТОШКА', desc: 'Танк корней и земли.', maxHp: 800, maxEn: 300, speed: 23, dmg: 95, canFly: false, level: 1, slashColor: 0x2ecc71, quote: '' };
      return { id: 'potato2', name: 'ГРОМТОМАТ', desc: 'Магматический боксёр.', maxHp: 620, maxEn: 400, speed: 31, dmg: 76, canFly: false, level: 1, slashColor: 0xff2200, quote: '' };
    }
    return _origGetSuitDataM ? _origGetSuitDataM.apply(this, arguments) : SUITS[player.suitIdx];
  };

  function switchPotatoForm(form) {
    window.__POTATO_FORM = form === 2 ? 2 : 1;
    player.maxHp = window.__POTATO_FORM === 1 ? 800 : 620;
    player.hp = Math.min(player.hp, player.maxHp);
    if (typeof window.rebuildHeroMesh === 'function') window.rebuildHeroMesh();
    const isMorg = window.__POTATO_FORM === 1;
    const badge = document.querySelector('.suit-badge');
    if (badge) badge.innerText = isMorg ? '🥔 МОРГЕНКАРТОШКА' : '🍅 ГРОМТОМАТ';
    const powers = document.getElementById('ui-powers-desc');
    if (powers) {
      powers.innerHTML = isMorg
        ? '<b>ЛКМ:</b> 3-Hit Молот | <b>Q:</b> Громовой Молот | <b>C:</b> Корни (+250 HP) | <b>F:</b> Таран | <b>R/1/2:</b> Форма'
        : '<b>ЛКМ:</b> 5-Hit Бокс | <b>Q:</b> Сверхнова | <b>C:</b> Пламя | <b>F:</b> Струя Соуса | <b>T:</b> Портал | <b>R:</b> Форма';
    }
    spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3.2, 0)), isMorg ? '🥔 МОРГЕНКАРТОШКА!' : '🍅 ГРОМТОМАТ!', isMorg ? '#2ecc71' : '#ff2200');
    showPatchToast(isMorg ? '🥔 ФОРМА ТАНКА' : '🍅 ФОРМА БЕРСЕРКА', POTATO_QUOTES[Math.floor(Math.random() * POTATO_QUOTES.length)], isMorg ? '#2ecc71' : '#ff2200');
    SoundFX.devastator();
    triggerHitstopAndChroma(0.08, 0.5, 1.1);
    if (EvoModules.has('potato_starch_juggernaut')) {
      spawnGroundCrackRing(player.pos, 0xf9ca24, 16);
      for (let i = enemies.length - 1; i >= 0; i--) {
        const en = enemies[i];
        const d = en.group.position.distanceTo(player.pos);
        if (d <= 15) {
          const push = en.group.position.clone().sub(player.pos).normalize().multiplyScalar(18);
          en.vel.y = Math.max(en.vel.y, 16);
          damageEnemy(en, 165, push, '*💥 ГРАВИ-ВОЛНА ФОРМЫ!*');
        }
      }
    }
    sendMP('charState', { char: 'potato', form: window.__POTATO_FORM });
  }
  window.switchPotatoForm = switchPotatoForm;

  window.equipPotato = function () {
    window.__POTATO_MODE = true;
    window.__POTATO_FORM = 1;
    player.character = 'potato';
    player.suitIdx = 4;
    PEPPER_MODE = false; CARROT_MODE = false; LEMON_MODE = false; CARROT_FORM = 1;
    playerGroup.scale.set(1, 1, 1);
    player.maxHp = 800; player.hp = 800; player.maxEn = 300; player.en = 300;
    window.rebuildHeroMesh();
    switchPotatoForm(1);
    if (typeof Companion !== 'undefined' && Companion.group) Companion.group.visible = false;
    const hotbar = document.getElementById('suit-hotbar');
    if (hotbar) hotbar.style.display = 'none';
    heroAuraLight.color.setHex(0x2ecc71);
    updateHUD(); updateScoreDisplay();
  };

  const _origRebuildHeroM = window.rebuildHeroMesh;
  window.rebuildHeroMesh = function () {
    if (window.__POTATO_MODE) {
      if (player.mesh && playerGroup.children.indexOf(player.mesh) >= 0) {
        if (typeof safeDisposeGroup === 'function') safeDisposeGroup(player.mesh);
        playerGroup.remove(player.mesh);
      }
      player.mesh = window.createPotatoMesh(window.__POTATO_FORM);
      playerGroup.add(player.mesh);
      const hotbar = document.getElementById('suit-hotbar');
      if (hotbar) hotbar.style.display = 'none';
      if (typeof Companion !== 'undefined' && Companion.group) Companion.group.visible = false;
      return;
    }
    if (_origRebuildHeroM) _origRebuildHeroM.apply(this, arguments);
    fixCarrotMeshGround();
    applyActiveEvoVisuals();
  };

  const _origToggleCarrotFormM = window.toggleCarrotForm;
  window.toggleCarrotForm = function () {
    if (_origToggleCarrotFormM) _origToggleCarrotFormM.apply(this, arguments);
    if (player.character === 'carrot') {
      player.maxHp = CARROT_FORM === 2 ? 800 : 480;
      player.hp = player.maxHp;
      updateHUD();
    }
    fixCarrotMeshGround();
    updateEntBouldersMesh();
  };

  const _origStartGameSessionM = window.startGameSession;
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
      return;
    }
    if (_origStartGameSessionM) return _origStartGameSessionM.apply(this, arguments);
  };

  function injectPotatoCharacterCard() {
    const cs = document.getElementById('char-select');
    if (!cs || document.getElementById('btn-potato')) return;
    const grid = cs.querySelector('.char-grid');
    if (!grid) return;
    const card = document.createElement('div');
    card.id = 'btn-potato';
    card.className = 'char-card';
    card.dataset.char = 'potato';
    card.innerHTML = '<div class="char-portrait">🥔</div><h3 style="color:#8B4513;text-shadow:2px 2px 0 #000,0 0 10px #D2B48C;">МОРГЕНКАРТОШКА</h3><div class="tag" style="color:#D2B48C;">ТАНК · ГРОМТОМАТ · ЗЕМЛЯ</div><p><b>Морген (форма 1):</b> 3-hit молот с рунами, прыжок-молот, корни+броня, таран.<br><b>Громтомат (форма 2):</b> 5-hit бокс, сверхнова, струя соуса, портал.</p><button style="background:linear-gradient(90deg,#8B4513,#D2B48C);color:#fff;font-weight:900;">ИГРАТЬ ЗА КАРТОШКУ</button>';
    card.addEventListener('click', function () {
      player.character = 'potato';
      document.getElementById('char-select').style.display = 'none';
      window.startGameSession(window.__pendingLoad || null);
    });
    grid.appendChild(card);
  }
  injectPotatoCharacterCard();

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 12. AERIAL SPEEDERS / HYDRANTS / ОБЛОМКИ / ПУЛ СВЕТА (v65)
  // ═══════════════════════════════════════════════════════════════════════════
  function buildAerialSpeederTraffic() {
    if (window.__AERIAL_SPEEDERS.length > 0) return;
    const trackConfigs = [
      { y: 42, rx: 165, rz: 145, cx: 0, cz: -20, color: 0x00f2fe },
      { y: 56, rx: 240, rz: 195, cx: -40, cz: 30, color: 0xff0055 },
      { y: 68, rx: 190, rz: 230, cx: 50, cz: -40, color: 0xf9ca24 },
      { y: 82, rx: 280, rz: 250, cx: 0, cz: 0, color: 0x00ff66 }
    ];
    const tracks = trackConfigs.map((cfg) => {
      const pts = [];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const wobble = Math.sin(a * 3) * 18;
        pts.push(new THREE.Vector3(cfg.cx + Math.cos(a) * (cfg.rx + wobble), cfg.y + Math.cos(a * 2) * 4, cfg.cz + Math.sin(a) * (cfg.rz - wobble)));
      }
      return { curve: new THREE.CatmullRomCurve3(pts, true), color: cfg.color };
    });
    const speederHullGeo = new THREE.BoxGeometry(3.4, 0.95, 7.2);
    const speederCanopyGeo = new THREE.BoxGeometry(2.4, 0.65, 3.4);
    const thrusterGeo = SharedGeometries.latheNozzle;
    for (let i = 0; i < 25; i++) {
      const tr = tracks[i % tracks.length];
      const g = new THREE.Group();
      const hullMat = createPrototypeShader(0x1e2738, 0x0a0e17, 2, tr.color);
      g.add(addInkOutline(new THREE.Mesh(speederHullGeo, hullMat), 1.04));
      const canopy = new THREE.Mesh(speederCanopyGeo, new THREE.MeshBasicMaterial({ color: 0x081420 }));
      canopy.position.set(0, 0.65, -0.3); g.add(canopy);
      const stripMat = new THREE.MeshBasicMaterial({ color: tr.color });
      for (let side of [-1.74, 1.74]) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 6.8), stripMat);
        strip.position.set(side, 0.1, 0); g.add(strip);
      }
      const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffdd });
      for (let side of [-1.05, 1.05]) {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.24, 0.12), hlMat);
        hl.position.set(side, 0.05, 3.62); g.add(hl);
      }
      const trailMat = new THREE.MeshBasicMaterial({ color: 0xff0044, transparent: true, opacity: 0.8 });
      for (let side of [-0.9, 0.9]) {
        const noz = new THREE.Mesh(thrusterGeo, hullMat);
        noz.rotation.x = Math.PI / 2; noz.position.set(side, 0, -3.6); g.add(noz);
        const plume = new THREE.Mesh(new THREE.ConeGeometry(0.28, 3.2, 6), trailMat);
        plume.rotation.x = -Math.PI / 2; plume.position.set(side, 0, -5.2); g.add(plume);
      }
      const tStart = (i / 25) % 1.0;
      const startPos = tr.curve.getPoint(tStart);
      g.position.copy(startPos); scene.add(g);
      window.__AERIAL_SPEEDERS.push({ group: g, track: tr, t: tStart, speedT: 0.022 + (i % 4) * 0.004, pos: startPos.clone(), prevPos: startPos.clone(), delta: new THREE.Vector3(), destroyedTimer: 0, color: tr.color });
    }
    const hydrantCoords = [[-22, -18], [24, -18], [-28, 22], [28, 22], [0, 38], [-52, -32], [52, -32], [-65, 15], [65, 15], [-18, -52], [18, -52], [42, 55], [-42, 55], [85, -15], [-85, -15], [0, -82]];
    const hydMat = createPrototypeShader(0xeb2f06, 0x7a0c00, 7, 0xfff200);
    for (let i = 0; i < hydrantCoords.length; i++) {
      const [hx, hz] = hydrantCoords[i];
      const hg = new THREE.Group(); hg.position.set(hx, 0, hz);
      const body = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 1.15, 8), hydMat), 1.05);
      body.position.y = 0.58;
      const cap = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), hydMat), 1.05);
      cap.position.y = 1.15;
      hg.add(body, cap); scene.add(hg);
      window.__STREET_HYDRANTS.push({ group: hg, pos: new THREE.Vector3(hx, 0, hz), broken: false, geyserTimer: 0 });
    }
  }

  function updateAerialSpeedersAndHydrants(dt, now) {
    player._ridingSpeeder = null;
    for (let i = 0; i < window.__AERIAL_SPEEDERS.length; i++) {
      const sp = window.__AERIAL_SPEEDERS[i];
      if (sp.destroyedTimer > 0) { sp.destroyedTimer -= dt; if (sp.destroyedTimer <= 0) sp.group.visible = true; continue; }
      sp.prevPos.copy(sp.pos);
      sp.t = (sp.t + sp.speedT * dt) % 1.0;
      const nextPt = sp.track.curve.getPoint(sp.t);
      const tangent = sp.track.curve.getTangent(sp.t);
      sp.pos.copy(nextPt);
      sp.delta.subVectors(sp.pos, sp.prevPos);
      sp.group.position.copy(sp.pos);
      sp.group.lookAt(sp.pos.clone().add(tangent));
      const dx = Math.abs(player.pos.x - sp.pos.x), dz = Math.abs(player.pos.z - sp.pos.z);
      const topSurfaceY = sp.pos.y + 0.85;
      if (dx < 2.8 && dz < 4.4 && player.pos.y >= topSurfaceY - 1.6 && player.pos.y <= topSurfaceY + 1.8 && player.vel.y <= 4) {
        player.pos.y = topSurfaceY;
        player.pos.add(sp.delta);
        player.vel.y = 0;
        player.isGrounded = true; player.isFlying = false; player.isBulletdropping = false;
        player._ridingSpeeder = sp;
      }
      if (player.attackTimer > 0.1 && player._ridingSpeeder !== sp && player.pos.distanceToSquared(sp.pos) < 36) {
        sp.destroyedTimer = 14.0;
        sp.group.visible = false;
        player.ep += 65; player.score += 450;
        SoundFX.boom();
        spawnParticles(sp.pos.clone(), sp.color, 22);
        spawnComicPop(sp.pos.clone().add(new THREE.Vector3(0, 2, 0)), '💥 СПИДЕР СБИТ! +65 EP 💥', '#00f2fe');
        updateHUD(); updateScoreDisplay();
      }
    }
    for (let i = 0; i < window.__STREET_HYDRANTS.length; i++) {
      const h = window.__STREET_HYDRANTS[i];
      if (!h.broken) {
        if (player.attackTimer > 0.05 && player.pos.distanceToSquared(h.pos) < 25) {
          h.broken = true; h.geyserTimer = 8.0; h.group.visible = false;
          SoundFX.boom();
          spawnComicPop(h.pos.clone().add(new THREE.Vector3(0, 2.5, 0)), '💦 ПРОРЫВ ГИДРАНТА! 💦', '#00f2fe');
        }
      } else if (h.geyserTimer > 0) {
        h.geyserTimer -= dt;
        if (Math.random() < 0.75 && typeof ParticlePool !== 'undefined') {
          const p = ParticlePool.get(0x66e0ff);
          p.position.copy(h.pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.5, (Math.random() - 0.5) * 0.8));
          scene.add(p);
          ParticlePool.active.push({ mesh: p, vel: new THREE.Vector3((Math.random() - 0.5) * 4, 22 + Math.random() * 10, (Math.random() - 0.5) * 4), life: 0.55 });
        }
        for (let eIdx = 0; eIdx < enemies.length; eIdx++) {
          const en = enemies[eIdx];
          if (Math.hypot(en.group.position.x - h.pos.x, en.group.position.z - h.pos.z) < 4.2) en.vel.y = Math.max(en.vel.y, 20);
        }
        if (Math.hypot(player.pos.x - h.pos.x, player.pos.z - h.pos.z) < 2.6 && player.pos.y < 3.0) {
          player.vel.y = Math.max(player.vel.y, 24);
          player.isGrounded = false;
          player.hp = Math.min(player.maxHp, player.hp + 15 * dt);
        }
        if (h.geyserTimer <= 0) { h.broken = false; h.group.visible = true; }
      }
    }
  }

  const pooledProjectileLights = [];
  function initPooledProjectileLights() {
    if (pooledProjectileLights.length > 0) return;
    for (let i = 0; i < 4; i++) {
      const pl = new THREE.PointLight(0x00f2fe, 0, 22);
      pl.position.set(0, -500, 0);
      scene.add(pl);
      pooledProjectileLights.push(pl);
    }
  }
  function updatePooledProjectileLights() {
    initPooledProjectileLights();
    const candidates = [];
    if (typeof Rocket !== 'undefined' && Rocket.active) {
      for (let i = 0; i < Rocket.active.length; i++) candidates.push({ pos: Rocket.active[i].mesh.position, color: 0xff0055, intensity: 3.2 });
    }
    if (typeof pepperBeamEffects !== 'undefined') {
      for (let i = 0; i < pepperBeamEffects.length; i++) {
        const col = EvoModules.has('pepper_blue_flame') ? 0x00e5ff : 0xff4400;
        candidates.push({ pos: pepperBeamEffects[i].beam.position, color: col, intensity: 3.5 });
      }
    }
    if (typeof LEMON_LASER_FX !== 'undefined' && LEMON_LASER_FX.length > 0) candidates.push({ pos: LEMON_LASER_FX[0].mesh.position, color: 0x44ffaa, intensity: 3.0 });
    for (let i = 0; i < activeTimedZones.length; i++) candidates.push({ pos: activeTimedZones[i].pos, color: activeTimedZones[i].color, intensity: 2.8 });
    for (let i = 0; i < projectiles.length && candidates.length < 6; i++) {
      const pr = projectiles[i];
      if (pr && pr.mesh) {
        const col = (pr.mesh.material && pr.mesh.material.color) ? pr.mesh.material.color.getHex() : 0x00f2fe;
        candidates.push({ pos: pr.mesh.position, color: col, intensity: 2.4 });
      }
    }
    for (let i = 0; i < 4; i++) {
      const pl = pooledProjectileLights[i];
      if (i < candidates.length) {
        pl.position.copy(candidates[i].pos).add(new THREE.Vector3(0, 0.8, 0));
        pl.color.setHex(candidates[i].color);
        pl.intensity = candidates[i].intensity;
      } else pl.intensity = 0;
    }
  }

  const debrisMeshPool = [];
  function getPooledDebrisMesh(colorHex) {
    let m = debrisMeshPool.pop();
    if (!m) m = addInkOutline(new THREE.Mesh(SharedGeometries.debrisRock, createPrototypeShader(0x3a3f46, 0x16191d, 7, colorHex || 0xff7f00)), 1.04);
    m.visible = true; scene.add(m);
    return m;
  }

  const _origSpawnGroundCrackRingM = window.spawnGroundCrackRing;
  window.spawnGroundCrackRing = function (pos, colorHex = 0xff0055, maxR = 11) {
    if (_origSpawnGroundCrackRingM) _origSpawnGroundCrackRingM.call(this, pos, colorHex, maxR);
    if (!pos || activeDebrisPieces.length > 48) return;
    const count = Math.min(12, Math.max(8, Math.round(maxR * 0.75)));
    const ringR = Math.min(maxR * 0.55, 7.5);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      const rock = getPooledDebrisMesh(colorHex);
      const scale = 0.45 + Math.random() * 0.65;
      rock.scale.set(scale, scale * (0.7 + Math.random() * 0.6), scale);
      rock.position.set(pos.x + Math.cos(a) * ringR * 0.4, 0.15, pos.z + Math.sin(a) * ringR * 0.4);
      rock.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      activeDebrisPieces.push({
        mesh: rock,
        vel: new THREE.Vector3(Math.cos(a) * (6 + Math.random() * 8), 8 + Math.random() * 7, Math.sin(a) * (6 + Math.random() * 8)),
        rotVel: new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8),
        life: 1.2, pooledRock: true
      });
    }
  };

  function updateDebrisAndZones(dt) {
    for (let i = activeDebrisPieces.length - 1; i >= 0; i--) {
      const d = activeDebrisPieces[i];
      d.life -= dt;
      if (d.mesh.position.y > 0.25 || d.vel.y > 0) {
        d.vel.y -= 32 * dt;
        d.mesh.position.addScaledVector(d.vel, dt);
        d.mesh.rotation.x += d.rotVel.x * dt;
        d.mesh.rotation.y += d.rotVel.y * dt;
        d.mesh.rotation.z += d.rotVel.z * dt;
        if (d.mesh.position.y < 0.25 && d.vel.y < 0) { d.mesh.position.y = 0.25; d.vel.set(0, 0, 0); }
      } else if (d.life < 0.35) d.mesh.position.y -= dt * 1.4;
      if (d.life <= 0) {
        if (d.pooledRock) { d.mesh.visible = false; scene.remove(d.mesh); debrisMeshPool.push(d.mesh); }
        else {
          scene.remove(d.mesh);
          if (!d.sharedGeo && d.mesh.geometry) d.mesh.geometry.dispose();
          if (d.mesh.material && typeof safeDisposeMaterial === 'function') safeDisposeMaterial(d.mesh.material);
        }
        activeDebrisPieces.splice(i, 1);
      }
    }
    for (let i = activeTimedZones.length - 1; i >= 0; i--) {
      const z = activeTimedZones[i];
      z.life -= dt;
      z.tickAccum = (z.tickAccum || 0) + dt;
      if (z.mesh) {
        z.mesh.rotation.y += dt * 2.5;
        if (z.mesh.material && z.mesh.material.opacity !== undefined) z.mesh.material.opacity = Math.min(0.75, Math.max(0, (z.life / z.maxLife) * 0.75));
      }
      if (z.kind === 'lava_geyser' && z.tickAccum >= 0.45) {
        z.tickAccum = 0;
        spawnParticles(z.pos.clone().add(new THREE.Vector3(0, 1, 0)), z.color, 6);
        for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
          const en = enemies[eIdx];
          if (en.group.position.distanceTo(z.pos) <= z.radius) { en.vel.y = Math.max(en.vel.y, 15); damageEnemy(en, z.dmgPerTick, new THREE.Vector3(0, 8, 0), '*🌋 ГЕЙЗЕР!*'); }
        }
      } else if (z.kind === 'shrek_singularity') {
        for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
          const en = enemies[eIdx];
          const d = en.group.position.distanceTo(z.pos);
          if (d <= z.radius && d > 1.5) {
            const pull = z.pos.clone().sub(en.group.position).normalize();
            en.group.position.addScaledVector(pull, 18 * dt);
            if (z.tickAccum >= 0.5) damageEnemy(en, 45, new THREE.Vector3(), '');
          }
        }
        if (z.tickAccum >= 0.5) z.tickAccum = 0;
      } else if (z.kind === 'starch_fire_trail' && z.tickAccum >= 0.35) {
        z.tickAccum = 0;
        for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
          const en = enemies[eIdx];
          if (en.group.position.distanceTo(z.pos) <= z.radius) damageEnemy(en, 55, new THREE.Vector3(), '*🔥 СЛЕД ДЖАГГЕРНАУТА!*');
        }
      } else if (z.kind === 'ketchup_bomb' && z.life <= 0) {
        SoundFX.boom();
        spawnGroundCrackRing(z.pos, 0xff2200, z.radius);
        spawnParticles(z.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xff2200, 20);
        for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
          const en = enemies[eIdx];
          if (en.group.position.distanceTo(z.pos) <= z.radius) { en.vel.y = Math.max(en.vel.y, 16); damageEnemy(en, z.dmg, new THREE.Vector3(0, 10, 0), '*🍅 ТЕРМОЯДЕРНЫЙ КЕТЧУП!*'); }
        }
      }
      if (z.life <= 0) {
        if (z.mesh) {
          scene.remove(z.mesh);
          if (z.mesh.geometry) z.mesh.geometry.dispose();
          if (z.mesh.material && typeof safeDisposeMaterial === 'function') safeDisposeMaterial(z.mesh.material);
        }
        activeTimedZones.splice(i, 1);
      }
    }
    for (let i = activeChainArcs.length - 1; i >= 0; i--) {
      const arc = activeChainArcs[i];
      arc.life -= dt;
      if (arc.life <= 0) {
        scene.remove(arc.line);
        if (arc.line.geometry) arc.line.geometry.dispose();
        if (arc.line.material) arc.line.material.dispose();
        activeChainArcs.splice(i, 1);
      }
    }
  }

  // === Lemon evo modules (v65) ===
  const _origSpawnLemonSpiderBotM = window.spawnLemonSpiderBot;
  window.spawnLemonSpiderBot = function () {
    if (_origSpawnLemonSpiderBotM) _origSpawnLemonSpiderBotM.apply(this, arguments);
    if (EvoModules.has('lemon_mega_hive') && typeof LEMON_BOTS !== 'undefined' && LEMON_BOTS.length > 0) {
      const bot = LEMON_BOTS[LEMON_BOTS.length - 1];
      if (bot && !bot._hiveUpgraded) {
        bot._hiveUpgraded = true;
        bot.life = 18;
        const shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(0.68, 8, 8), new THREE.MeshBasicMaterial({ color: 0x44ffaa, transparent: true, opacity: 0.38, wireframe: true }));
        bot.group.add(shieldMesh);
        bot._miniShield = shieldMesh;
      }
    }
  };

  window.lemonSummonSpiders = function () {
    if (player.lemonSummonCd > 0) return;
    player.lemonSummonCd = 10.0;
    SoundFX.devastator();
    const maxBots = EvoModules.has('lemon_mega_hive') ? 8 : 4;
    const batchCount = EvoModules.has('lemon_mega_hive') ? 4 : 2;
    spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3.5, 0)), EvoModules.has('lemon_mega_hive') ? '*🕷️ МЕГА-УЛЕЙ: 8 ПАУКОВ!*' : '*РЕПУЛЬСОРЫ!*', '#44ffaa');
    const alive = (typeof LEMON_BOTS !== 'undefined' ? LEMON_BOTS : []).filter((b) => b.alive).length;
    const toSpawn = Math.min(batchCount, maxBots - alive);
    for (let i = 0; i < toSpawn; i++) window.spawnLemonSpiderBot();
  };

  const _origLemonPlasmaBeamTickM = window.lemonPlasmaBeamTick;
  window.lemonPlasmaBeamTick = function (dt) {
    if (_origLemonPlasmaBeamTickM) _origLemonPlasmaBeamTickM.call(this, dt);
    if (!EvoModules.has('lemon_bold_superconductor') || enemies.length < 2) return;
    const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw)).normalize();
    const start = player.pos.clone().add(new THREE.Vector3(0, 2.2, 0));
    let primaryHit = null;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const toE = e.group.position.clone().sub(start);
      const proj = toE.dot(fwd);
      if (proj > 0 && proj < 35) {
        const perpSq = toE.lengthSq() - proj * proj;
        if (perpSq <= (e.radius + 1.8) * (e.radius + 1.8)) { primaryHit = e; break; }
      }
    }
    if (!primaryHit) return;
    const neighbors = enemies.filter((e) => e !== primaryHit && e.hp > 0 && e.group.position.distanceTo(primaryHit.group.position) < 20)
      .sort((a, b) => a.group.position.distanceTo(primaryHit.group.position) - b.group.position.distanceTo(primaryHit.group.position)).slice(0, 3);
    for (let i = 0; i < neighbors.length; i++) {
      const nb = neighbors[i];
      damageEnemy(nb, LEMON_DMG * 1.35 * dt, new THREE.Vector3(), '');
      if (Math.random() < 0.35) {
        const p1 = primaryHit.group.position.clone().add(new THREE.Vector3(0, 2, 0));
        const p2 = nb.group.position.clone().add(new THREE.Vector3(0, 2, 0));
        const mid = p1.clone().lerp(p2, 0.5).add(new THREE.Vector3((Math.random() - 0.5) * 2, 1.2, (Math.random() - 0.5) * 2));
        const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, mid, p2]);
        const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x00f2fe }));
        scene.add(line);
        activeChainArcs.push({ line, life: 0.08 });
      }
    }
  };

  // Banana singularity (v65)
  const _origExplodeRocketM = window.explodeRocket;
  window.explodeRocket = function (r) {
    const pos = r && r.mesh ? r.mesh.position.clone() : player.pos.clone();
    if (_origExplodeRocketM) _origExplodeRocketM.apply(this, arguments);
    if (EvoModules.has('banana_shrek_singularity')) {
      const vortexMesh = new THREE.Mesh(new THREE.TorusKnotGeometry(2.6, 0.45, 36, 8), new THREE.MeshBasicMaterial({ color: 0xaa00ff, transparent: true, opacity: 0.65, wireframe: true }));
      vortexMesh.position.copy(pos).add(new THREE.Vector3(0, 2.2, 0));
      scene.add(vortexMesh);
      activeTimedZones.push({ kind: 'shrek_singularity', pos: pos.clone(), radius: 18.0, color: 0xaa00ff, mesh: vortexMesh, life: 4.0, maxLife: 4.0, tickAccum: 0 });
      spawnComicPop(pos.clone().add(new THREE.Vector3(0, 4, 0)), '🌀 СИНГУЛЯРНОСТЬ ШРЕКИЧА (18М)! 🌀', '#00f2fe');
    }
  };

  // Pepper meteor core (v65)
  function spawnMeteorCoreLavaGeyser(pos) {
    const col = EvoModules.has('pepper_blue_flame') ? 0x00e5ff : 0xff3300;
    const geyserMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 4.5, 9, 12, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.65, wireframe: true, side: THREE.DoubleSide }));
    geyserMesh.position.set(pos.x, 4.5, pos.z); scene.add(geyserMesh);
    const st = pepperStats();
    activeTimedZones.push({ kind: 'lava_geyser', pos: pos.clone(), radius: 9.5, dmgPerTick: st.dmg * 1.15, color: col, mesh: geyserMesh, life: 6.0, maxLife: 6.0, tickAccum: 0 });
    spawnComicPop(pos.clone().add(new THREE.Vector3(0, 4, 0)), '☄️ МЕТЕОРИТНОЕ ЯДРО: ЛАВОВЫЙ ГЕЙЗЕР! ☄️', '#ff9f1a');
  }
  const _origPepperFireBeamM = window.pepperFireBeam;
  window.pepperFireBeam = function () {
    if (_origPepperFireBeamM) _origPepperFireBeamM.apply(this, arguments);
    if (EvoModules.has('pepper_blue_flame') && typeof pepperBeamEffects !== 'undefined' && pepperBeamEffects.length > 0) {
      const latest = pepperBeamEffects[pepperBeamEffects.length - 1];
      if (latest && latest.beam && latest.beam.material) latest.beam.material.color.setHex(0x00e5ff);
      if (latest && latest.core && latest.core.material) latest.core.material.color.setHex(0xffffff);
    }
  };

  // === Объединённый applyDamageToHero ===
  const _origApplyDamageToHeroM = window.applyDamageToHero;
  window.applyDamageToHero = function (dmg) {
    if (player.isDead) return;
    // Carrot Ancient Ent (v65)
    if (CARROT_MODE && CARROT_FORM === 2 && EvoModules.has('carrot_ancient_ent')) {
      dmg *= 0.55;
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 4.2, 0)), '*🪨 БЛОК КОРОЙ ЭНТА!*', '#2ecc71');
    }
    // Potato armor (both)
    if (window.__POTATO_MODE && window.__POTATO_FORM === 1 && player._potatoArmor > 0) dmg = Math.floor(dmg * 0.5);
    // Multifruit (v110)
    if (player._multifruitTitanActive) dmg = Math.floor(dmg * 0.55);
    // Energy shield suit idx 3 (v53 fix)
    if (player.activeModeF && player.suitIdx === 3 && player.character === 'banana' && !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE && !window.__POTATO_MODE) {
      const drain = dmg * 1.5;
      if (player.en >= drain) {
        player.en -= drain;
        if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3.2, 0)), '*ЩИТ БЛОК*', '#00f2fe');
        return;
      } else {
        player.activeModeF = false;
        if (player.mesh && player.mesh.userData && player.mesh.userData.limeShield) player.mesh.userData.limeShield.visible = false;
      }
    }
    if (_origApplyDamageToHeroM) return _origApplyDamageToHeroM.apply(this, arguments);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 13. МЕГАДИСПЕТЧЕР ВРЕМЕНИ — соединение v65 и v110 в один тик
  // ═══════════════════════════════════════════════════════════════════════════
  let _wasDiveAttacking = false;
  let _carrotGroundCheckAccum = 0;
  const _origUpdatePlayerChoreoM = window.updatePlayerChoreographyAndCamera;

  window.updatePlayerChoreographyAndCamera = function (dt, now) {
    // Инициализация мира при первом кадре
    if (window.__SKY_RAILS.length === 0 && typeof buildings !== 'undefined' && buildings.length > 0) {
      buildNeonSkyRails();
      buildAerialSpeederTraffic();
    }

    // Кулдауны v65
    if (typeof player._potatoArmor === 'number' && player._potatoArmor > 0) player._potatoArmor = Math.max(0, player._potatoArmor - dt);
    if (typeof player._potatoHealCd === 'number' && player._potatoHealCd > 0) player._potatoHealCd = Math.max(0, player._potatoHealCd - dt);
    if (typeof player._potatoRageCd === 'number' && player._potatoRageCd > 0) player._potatoRageCd = Math.max(0, player._potatoRageCd - dt);
    if (typeof player._potatoRamCd === 'number' && player._potatoRamCd > 0) player._potatoRamCd = Math.max(0, player._potatoRamCd - dt);
    if (typeof player._potatoSauceCd === 'number' && player._potatoSauceCd > 0) player._potatoSauceCd = Math.max(0, player._potatoSauceCd - dt);
    if (typeof player._potatoPortalCd === 'number' && player._potatoPortalCd > 0) player._potatoPortalCd = Math.max(0, player._potatoPortalCd - dt);
    if (typeof player._potatoSlamCd === 'number' && player._potatoSlamCd > 0) player._potatoSlamCd = Math.max(0, player._potatoSlamCd - dt);
    if (typeof player._potatoNovaCd === 'number' && player._potatoNovaCd > 0) player._potatoNovaCd = Math.max(0, player._potatoNovaCd - dt);
    if (typeof player._tomatoRage === 'number' && player._tomatoRage > 0) player._tomatoRage = Math.max(0, player._tomatoRage - dt);
    if (potatoComboTimer > 0) { potatoComboTimer -= dt; if (potatoComboTimer <= 0) potatoCombo = 0; }

    if (player._suitCdMap) {
      for (let i = 0; i < 5; i++) if (player._suitCdMap[i] > 0) player._suitCdMap[i] = Math.max(0, player._suitCdMap[i] - dt);
    }

    // Carrot ground check
    _carrotGroundCheckAccum += dt;
    if (_carrotGroundCheckAccum >= 0.5) { _carrotGroundCheckAccum = 0; fixCarrotMeshGround(); }

    // Ent boulders
    updateEntBouldersMesh();
    if (_entBoulderGroup) {
      _entBoulderGroup.rotation.y += dt * 2.8;
      for (let i = enemies.length - 1; i >= 0; i--) {
        const en = enemies[i];
        if (en.group.position.distanceTo(player.pos) < 6.8 && (!en._entKnockCd || en._entKnockCd <= 0)) {
          en._entKnockCd = 1.1;
          en.vel.y = Math.max(en.vel.y, 14);
          const push = en.group.position.clone().sub(player.pos).normalize().multiplyScalar(10);
          damageEnemy(en, 85, push, '*🪨 СБИТ ГЛЫБОЙ!*');
        }
      }
    }

    // Проверка приземления после pepper dive
    const preDive = player.diveAttackActive;
    _wasDiveAttacking = preDive;

    // v110: Обёртка с кристаллической тюрьмой и грапплом
    const isFrozen = (window.__MP && window.__MP._myRootedUntil > now) || player._crystalPrisonHitsNeeded > 0;
    const savedX = player.pos.x, savedZ = player.pos.z, preY = player.pos.y;

    const hiddenEnemies = [];
    if (preY > 3 || player._activeGrapple) {
      for (let i = 0; i < enemies.length; i++) {
        const en = enemies[i];
        if (en.flying && !player._activeGrapple) continue;
        if (player._activeGrapple || Math.abs(en.group.position.y - preY) > 3) {
          hiddenEnemies.push({ en, x: en.group.position.x, z: en.group.position.z });
          en.group.position.x = 99999; en.group.position.z = 99999;
        }
      }
    }

    // Вызов базовой choreo (она обновляет движение игрока и камеру)
    if (_origUpdatePlayerChoreoM) _origUpdatePlayerChoreoM.call(this, dt, now);

    // Восстановить скрытых
    for (let i = 0; i < hiddenEnemies.length; i++) {
      const h = hiddenEnemies[i];
      if (h.en.group && h.en.group.position) { h.en.group.position.x = h.x; h.en.group.position.z = h.z; }
    }

    // Grapple movement (v110)
    if (player._activeGrapple) {
      const g = player._activeGrapple;
      g.timer += dt;
      const toTarget = g.targetPos.clone().sub(player.pos);
      const dist = toTarget.length();
      const forwardDot = toTarget.x * g.initialDir.x + toTarget.z * g.initialDir.z;
      if ((keys['Space'] && g.timer > 0.12) || dist <= 2.8 || forwardDot <= 0.2 || g.timer >= g.maxDuration || player.isWallRunning) {
        const finishedEnemy = g.enemyRef;
        player._activeGrapple = null;
        player.vel.set(g.initialDir.x * 4, Math.max(0, Math.min(8, player.vel.y)), g.initialDir.z * 4);
        if (finishedEnemy && finishedEnemy.group && finishedEnemy.group.parent) {
          const st = carrotStats();
          damageEnemy(finishedEnemy, st.dmg * 4.5, g.initialDir.clone().multiplyScalar(8), '*СОКРУШИТЕЛЬНЫЙ УДАР!*');
          spawnParticles(finishedEnemy.group.position.clone().add(new THREE.Vector3(0, 2, 0)), 0x2ecc71, 20);
          spawnGroundCrackRing(finishedEnemy.group.position, 0x2ecc71, 12);
        }
      } else {
        const dir = toTarget.clone().divideScalar(dist);
        const step = Math.min(dist, g.speed * dt);
        player.pos.addScaledVector(dir, step);
        player.vel.set(0, 0, 0);
        player.facingYaw = Math.atan2(-g.initialDir.x, -g.initialDir.z);
        playerGroup.position.copy(player.pos);
      }
    }

    if (player.pos.y < 0) player.pos.y = 0;

    if (isFrozen) {
      player.pos.x = savedX; player.pos.z = savedZ;
      player.vel.x = 0; player.vel.z = 0;
      playerGroup.position.copy(player.pos);
    }

    // Pepper dive meteor core (v65)
    if (_wasDiveAttacking && !player.diveAttackActive && player.isGrounded && PEPPER_MODE && EvoModules.has('pepper_meteor_core')) {
      spawnMeteorCoreLavaGeyser(player.pos.clone());
      _wasDiveAttacking = false;
    }

    // Обновления v65
    updateSkyRailsAndGrinding(dt, now);
    updateAerialSpeedersAndHydrants(dt, now);
    updateDebrisAndZones(dt);
    updateRagdolls(dt, now);
    updatePooledProjectileLights();

    // Кинематика + Smear + Ribbon
    applySmoothHeroKinematics(dt, now);
    updateWeaponSmearAndRibbonTrail(dt);

    // Shoulder cam (v65)
    const rgt = new THREE.Vector3(Math.cos(player.camYaw), 0, -Math.sin(player.camYaw));
    const shoulderOffset = rgt.clone().multiplyScalar(0.8);
    camera.position.add(shoulderOffset);
    const lookTarget = new THREE.Vector3(
      player.pos.x + shoulderOffset.x,
      player.pos.y + (CARROT_FORM === 2 ? 5.0 : 2.8),
      player.pos.z + shoulderOffset.z
    );
    camera.lookAt(lookTarget);

    // Существующие фиксы v53
    if (player.activeModeF && player.character !== 'banana') {
      player.activeModeF = false;
      if (player.mesh && player.mesh.userData && player.mesh.userData.limeShield) player.mesh.userData.limeShield.visible = false;
    }
    if (player.activeModeF && player.suitIdx === 3 && player.character === 'banana' && !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE) {
      player.en -= 15 * dt;
      if (player.en <= 0) { player.en = 0; player.activeModeF = false; if (player.mesh && player.mesh.userData.limeShield) player.mesh.userData.limeShield.visible = false; }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 14. РАСШИРЕННЫЙ updateEnemiesAndVehicles (v65 + v110)
  // ═══════════════════════════════════════════════════════════════════════════
  const _origUpdateEnemiesM = window.updateEnemiesAndVehicles;
  window.updateEnemiesAndVehicles = function (dt, now) {
    // SoloBoss lock — убираем всех кроме босса и пилонов
    if (_soloBossLock && activeBoss) {
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e !== activeBoss && !e._isPhasePylon) {
          if (e.group && e.group.parent) scene.remove(e.group);
          enemies.splice(i, 1);
        }
      }
    }
    // Frozen логика (v110) + v65 effects
    for (let i = 0; i < enemies.length; i++) {
      const en = enemies[i];
      if (!en || !en.group) continue;
      enhanceEnemyModel(en);
      if (en._entKnockCd > 0) en._entKnockCd -= dt;
      if (en._hitStagger > 0) {
        en._hitStagger = Math.max(0, en._hitStagger - dt);
        en.group.rotation.x = -Math.sin((en._hitStagger / 0.2) * Math.PI) * 0.28;
      } else en.group.rotation.x = THREE.MathUtils.lerp(en.group.rotation.x || 0, 0, Math.min(1, dt * 10));
      if (en._poisonIvyTimer > 0) {
        en._poisonIvyTimer -= dt;
        en._poisonTick = (en._poisonTick || 0) + dt;
        if (en._poisonTick >= 0.5) {
          en._poisonTick = 0;
          const dmg = (en._poisonIvyDps || 45) * 0.5;
          player.hp = Math.min(player.maxHp, player.hp + 12);
          spawnParticles(en.group.position.clone().add(new THREE.Vector3(0, 1.8, 0)), 0x00ff88, 3);
          damageEnemy(en, dmg, new THREE.Vector3(), '');
          if (!enemies.includes(en)) continue;
        }
      }
      if (en._ketchupSlowTimer > 0) {
        en._ketchupSlowTimer -= dt;
        if (!en._origBaseSpeed) en._origBaseSpeed = en.speed;
        en.speed = en._origBaseSpeed * 0.4;
      } else if (en._origBaseSpeed) {
        en.speed = en._origBaseSpeed; en._origBaseSpeed = null;
      }
      // v65 model animations
      if (en._medDrone) {
        en._medDrone.position.x = Math.cos(now * 0.004 + i) * 1.35;
        en._medDrone.position.z = Math.sin(now * 0.004 + i) * 1.35;
        en._medDrone.rotation.y += dt * 4;
      }
      if (en._kamikazeBarrels) {
        const blinkOn = Math.sin(now * 0.025) > 0;
        en._kamikazeBarrels.children.forEach((b) => { if (b.material) b.material.color.setHex(blinkOn ? 0xffff00 : 0xff0000); });
      }
      if (en._tankWheels && en._tankWheels.length && en._moving) {
        for (let w = 0; w < en._tankWheels.length; w++) en._tankWheels[w].rotation.x += dt * 6;
      }
      if (en._tankBarrel) {
        const targetZ = en._shooting > 0 ? 1.45 : 2.0;
        en._tankBarrel.position.z = THREE.MathUtils.lerp(en._tankBarrel.position.z, targetZ, Math.min(1, dt * 12));
      }
      if (en._tailRotor) { en._tailRotor.rotation.x += dt * 24; en.group.rotation.x = THREE.MathUtils.lerp(en.group.rotation.x, 0.18, Math.min(1, dt * 5)); }
      if (en._battleDamaged && Math.random() < 0.35) {
        const smokePos = en.group.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 2.2, (Math.random() - 0.5) * 1.2));
        spawnParticles(smokePos, Math.random() < 0.4 ? 0xfff200 : 0x222222, 1);
        if (en._exposedCoreMesh) en._exposedCoreMesh.rotation.y += dt * 6;
      }
      // Frozen tick
      if (en.frozen > 0) {
        en.frozen -= dt;
        en._rooted = Math.max(en._rooted || 0, en.frozen);
        en.vel.set(0, 0, 0);
        en._telegraphT = 0; en.meleeAnim = 0;
        if (en._frozenLockedPos) en.group.position.copy(en._frozenLockedPos);
        if (en._iceCubePrison && en._iceCubePrison.group) en._iceCubePrison.group.position.copy(en.group.position);
        if (en.frozen <= 0 && en._iceCubePrison) enCleanupIce(en);
      }
    }

    if (_origUpdateEnemiesM) _origUpdateEnemiesM.call(this, dt, now);

    // Solo boss AI (v110)
    if (activeBoss && activeBoss._isPinnacleBoss) updateSoloPinnacleBossAI(activeBoss, dt, now);

    // Phase pylons rotate
    for (let i = 0; i < bossPhasePylons.length; i++) {
      const p = bossPhasePylons[i];
      if (p && p.group) p.group.rotation.y += dt * 2.5;
    }

    // Shockwaves (v110)
    for (let i = shockwaveRings.length - 1; i >= 0; i--) {
      const sw = shockwaveRings[i];
      sw.radius += sw.speed * dt;
      sw.mesh.scale.setScalar(sw.radius);
      const distP = Math.hypot(player.pos.x - sw.center.x, player.pos.z - sw.center.z);
      if (!sw.hitPlayer && Math.abs(distP - sw.radius) < 1.8 && player.pos.y < 2.6) {
        sw.hitPlayer = true;
        applyDamageToHero(sw.dmg);
        player.vel.y = 16;
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '*🌊 СБИТ ВОЛНОЙ (ПРЫГАЙТЕ ВЫШЕ)!*', '#fff200');
      }
      if (sw.radius >= sw.maxRadius) {
        scene.remove(sw.mesh); sw.mesh.geometry.dispose(); sw.mesh.material.dispose(); shockwaveRings.splice(i, 1);
      }
    }
    // Hazards (v110)
    for (let i = worldHazards.length - 1; i >= 0; i--) {
      const h = worldHazards[i];
      h.life -= dt;
      h.mesh.material.opacity = Math.max(0, 0.68 * (h.life / h.maxLife));
      if (player.pos.y < 1.5 && Math.hypot(player.pos.x - h.pos.x, player.pos.z - h.pos.z) < h.radius) {
        if (h.isFatSlow) { player.vel.x *= 0.76; player.vel.z *= 0.76; }
        if (Math.random() < dt * 2.4) applyDamageToHero(8);
      }
      if (h.life <= 0) { scene.remove(h.mesh); h.mesh.geometry.dispose(); h.mesh.material.dispose(); worldHazards.splice(i, 1); }
    }

    // Lemon mega-hive spider speed boost
    if (LEMON_MODE && EvoModules.has('lemon_mega_hive') && typeof LEMON_BOTS !== 'undefined') {
      for (let i = 0; i < LEMON_BOTS.length; i++) {
        const b = LEMON_BOTS[i];
        if (!b || !b.alive) continue;
        if (b.cd > 0) b.cd = Math.max(0, b.cd - dt * 0.5);
        if (b.kamikazeTarget && b.kamikazeTarget.group && b.group.position.distanceTo(b.kamikazeTarget.group.position) < 3.2) {
          spawnGroundCrackRing(b.group.position, 0x44ffaa, 10);
          for (let j = enemies.length - 1; j >= 0; j--) {
            if (enemies[j].group.position.distanceTo(b.group.position) < 8.5) damageEnemy(enemies[j], 160, new THREE.Vector3(0, 12, 0), '*🛡️ ВЗРЫВ ЩИТА ПАУКА!*');
          }
        }
      }
    }
  };

  // Wave if HP < 50% — Battle Damage (уже в damageEnemy)

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 15. ЭПИЛОГ-САД + SKY-RAIL init при загрузке + Мини-карта с боссами
  // ═══════════════════════════════════════════════════════════════════════════
  setTimeout(() => {
    buildNeonSkyRails();
    buildAerialSpeederTraffic();
  }, 300);

  if (typeof drawMinimap === 'function') {
    const _origDrawMinimapM = window.drawMinimap;
    window.drawMinimap = function () {
      _origDrawMinimapM.apply(this, arguments);
      if (StoryCampaign.completed || !StoryCampaign.targetPos) return;
      const c = document.getElementById('minimap-canvas');
      if (!c) return;
      const ctx = c.getContext('2d');
      const sc = 0.16, cx = 70, cy = 70;
      let tx = cx + (StoryCampaign.targetPos.x - player.pos.x) * sc;
      let tz = cy + (StoryCampaign.targetPos.z - player.pos.z) * sc;
      const dx = tx - cx, dz = tz - cy;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 58) { tx = cx + (dx / dist) * 58; tz = cy + (dz / dist) * 58; }
      ctx.save();
      ctx.fillStyle = '#fff200';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tx, tz, 6, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.restore();
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 16. ВОССТАНОВЛЕНИЕ 100% СИСТЕМ v53 (TimeOfDay, щит, шрекич, картошка)
  // ═══════════════════════════════════════════════════════════════════════════
  setTimeout(() => {
    if (typeof scene === 'undefined') return;
    scene.traverse((o) => {
      if (o.geometry && o.geometry.type === 'SphereGeometry') {
        const p = o.geometry.parameters;
        if (p && p.radius >= 4000) o.visible = false;
      }
    });
  }, 1000);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && typeof gameStarted !== 'undefined' && gameStarted) {
      const ss = document.getElementById('start-screen');
      if (ss) ss.style.display = 'flex';
      try { document.exitPointerLock(); } catch (err) {}
    }
    if (e.code === 'KeyB' && typeof player !== 'undefined' && player.character === 'banana' && !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE && !window.__POTATO_MODE) {
      if (typeof Companion !== 'undefined') {
        Companion._disabled = !Companion._disabled;
        if (Companion._disabled) {
          if (Companion.group) Companion.group.visible = false;
          Companion.shootCd = 99999; Companion.buffCd = 99999;
          player.companionShield = 0; player.companionRegen = 0; player.companionDmg = 0;
          spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), 'ДРОН ОТКЛЮЧЕН', '#ff0000');
        } else {
          if (Companion.group) Companion.group.visible = true;
          Companion.shootCd = 0; Companion.buffCd = 15;
          spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), 'ДРОН ВКЛЮЧЕН', '#00ff66');
        }
      }
    }
  });

  if (typeof Companion !== 'undefined' && Companion.update) {
    const _origUpdateCompanionM = Companion.update;
    Companion.update = function (dt, now) {
      _origUpdateCompanionM.call(this, dt, now);
      if ((this._disabled || window.__POTATO_MODE) && this.group) {
        this.group.visible = false;
        this.shootCd = 99999; this.buffCd = 99999;
      }
    };
  }

  console.log('🍌 [BANANA MERGED v200] Всё загружено: 18 глав саги, 4 соло-босса, гарпун 240м, крио-куб, кристаллическая тюрьма, Sky-Rails, Evo-Модули, анатомическая геометрия, кинематика, рэгдоллы, аэро-спидеры и гидранты.');
})();
