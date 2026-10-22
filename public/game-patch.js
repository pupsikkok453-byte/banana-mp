// ============================================================================
// BANANA INDUSTRIES — GLOBAL PATCH v60 (PROTOTYPE 2009 OVERHAUL EDITION)
// 100% Retention всех механик index.html + game-patch v53:
// • 5 персонажей (Егорбанан [0-4], Хохлорковь [1], Перец [1], Лимон, Картошка/Томат [R/1/2])
// • Prototype Suit Morphing + Shockwave при смене костюмов [0-4]
// • Бесшовный Wall-Run по нормалям, Mantle Vault через крыши, Wall-Eject
// • Жестокое Поглощение [C] (100% EN + HP + Маскировка 15с + Крио-импульс)
// • Новый PBR/SSS шейдер createPrototypeShader (мякоть, нормали цедры, био-волокна)
// • Улучшенное телеграфирование врагов/боссов, Phase 2 Frenzy, 3D-физика машин
// ============================================================================
(function () {
  'use strict';
  console.log("🍌 [PROTOTYPE OVERHAUL v60] Инициализация систем класса Prototype (2009)...");

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 0. МОДЕРНИЗИРОВАННЫЙ ШЕЙДЕР createPrototypeShader (SSS + ЦЕДРА + БИО-ВОЛОКНА)
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
      float metal = 0.08;
      float roughness = 0.55;
      float specPow = 36.0;
      float sssWeight = 0.25;
      vec3 emisCol = vec3(0.0);

      // Двухуровневые процедурные нормали цедры и органических волокон
      vec2 peelUv = vWorldPos.xz * 5.5 + vWorldPos.y * 2.2 + vUv * 12.0;
      float eps = 0.04;
      float hCenter = noise(peelUv);
      float nx = (noise(peelUv + vec2(eps, 0.0)) - hCenter) / eps;
      float nz = (noise(peelUv + vec2(0.0, eps)) - hCenter) / eps;

      // Высокочастотные поры цедры + микроволокна
      float poreNoise = noise(vUv * 55.0 + vWorldPos.xy * 4.0);
      float fiberWave = sin(vUv.y * 40.0 + fbm(vUv * 8.0) * 6.0);
      float bumpScale = (uPattern == 1 || uPattern == 3 || uPattern == 4 || uPattern == 10) ? 0.032 : 0.014;
      vec3 Nt = normalize(N + vec3(nx + fiberWave * 0.15, (poreNoise - 0.5) * 0.3, nz) * bumpScale);

      // Паттерны материалов (100% сохранение + био-апгрейд)
      if(uPattern == 1){
        // Наноягодная био-броня и вирусные волокна Blacklight
        vec2 g = fract(vUv * 14.0) - 0.5;
        float d = length(g);
        bool rz = (abs(vUv.x - 0.5) > 0.20) || (vUv.y > 0.65);
        vec3 bc = rz ? uCol2 : uCol1;
        float pulse = 0.5 + 0.5 * sin(vUv.y * 18.0 - uTime * 7.5 + vUv.x * 8.0);
        baseCol = d < 0.42 ? bc * (1.32 - d * 1.1) : mix(vec3(0.02, 0.04, 0.08), uRim, pulse * 0.42);
        float vein = smoothstep(0.036, 0.0, abs(abs(vUv.x - 0.5) - 0.20 - sin(vUv.y * 12.0 + uTime * 4.5) * 0.025));
        float bioFlash = smoothstep(0.88, 1.0, sin(vUv.y * 26.0 - uTime * 11.0 + fbm(vUv * 6.0) * 5.0));
        baseCol = mix(baseCol, vec3(0.9, 0.12, 0.4), vein * 0.75);
        emisCol = vec3(0.95, 0.18, 0.55) * vein * 0.55 + uRim * (pulse * 0.22 + bioFlash * 0.65);
        metal = 0.58; roughness = 0.30; specPow = 72.0; sssWeight = 0.45;
      }
      else if(uPattern == 2){
        // Хитиновые/реакторные пластины с био-швами
        vec2 g = fract(vUv * 8.0) - 0.5;
        float p = max(abs(g.x), abs(g.y));
        float seam = smoothstep(0.41, 0.49, p);
        float flow = 0.5 + 0.5 * sin(vWorldPos.y * 4.5 - uTime * 5.5);
        baseCol = mix(uCol1 * (1.22 - p * 0.75), mix(uCol2, uRim * 0.7, flow * 0.45), seam);
        emisCol = uRim * seam * flow * 0.32;
        metal = 0.52; roughness = 0.36; specPow = 54.0; sssWeight = 0.30;
      }
      else if(uPattern == 3){
        // Срез киви / лимонная мякоть с семечками и сильным свечением сока
        vec2 g = fract(vUv * 5.0) - 0.5;
        float r = length(g);
        if(r < 0.14) baseCol = vec3(0.94, 1.0, 0.90);
        else if(r < 0.23 && fract(atan(g.y, g.x) * 2.5) < 0.36) baseCol = vec3(0.04, 0.04, 0.04);
        else if(r < 0.44) baseCol = uCol1;
        else baseCol = uCol2;
        metal = 0.04; roughness = 0.45; specPow = 28.0; sssWeight = 0.75;
      }
      else if(uPattern == 4){
        // Цитрусовая цедра с эфирными порами и подповерхностной мякотью
        vec2 g = fract(vUv * vec2(3.0, 4.0));
        float edge = (g.x < 0.07 || g.x > 0.93 || g.y < 0.07 || g.y > 0.93) ? 1.0 : 0.0;
        float pores = hash(floor(vUv * 52.0)) * 0.14;
        baseCol = mix(uCol1 - pores, uCol2, edge);
        float wet = smoothstep(0.45, 0.85, noise(vWorldPos.xz * 3.5 + vWorldPos.y * 2.5));
        float fiberPulse = smoothstep(0.93, 1.0, sin(vUv.y * 32.0 + uTime * 6.0 + pores * 12.0));
        emisCol = uRim * fiberPulse * 0.18;
        metal = 0.16; roughness = 0.48 - wet * 0.26; specPow = 56.0; sssWeight = 0.68;
      }
      else if(uPattern == 5){
        // Небоскребы мегаполиса
        vec2 wc = vec2(vWorldPos.x + vWorldPos.z, vWorldPos.y) * 0.28;
        vec2 cell = floor(wc);
        vec2 f = fract(wc);
        bool isP = (f.x < 0.16 || f.x > 0.84);
        bool isL = (f.y < 0.16 || f.y > 0.84);
        if(!isP && !isL && abs(N.y) < 0.2){
          float rnd = hash(cell);
          if(rnd > 0.58){
            vec3 ww = mix(vec3(1.0, 0.85, 0.5), vec3(0.5, 0.85, 1.0), step(0.78, rnd));
            baseCol = (rnd > 0.90) ? uRim * 0.95 : ww * (0.62 + 0.35 * f.y);
            emisCol = baseCol * 0.9;
            metal = 0.35; roughness = 0.14;
          } else {
            baseCol = mix(uCol2 * 0.45, vec3(0.08, 0.16, 0.26), f.y);
            metal = 0.45; roughness = 0.18;
          }
        } else {
          baseCol = isL ? uCol2 * 0.75 : uCol1;
          metal = 0.22; roughness = 0.55;
        }
        sssWeight = 0.0;
      }
      else if(uPattern == 6){
        // Мокрый асфальт и неоновые лужи
        float grain = (hash(floor(vWorldPos.xz * 7.0)) - 0.5) * 0.04;
        float pf = sin(vWorldPos.x * 0.075) * cos(vWorldPos.z * 0.075) + sin(vWorldPos.x * 0.19 - vWorldPos.z * 0.16) * 0.5;
        bool ip = pf > 0.22;
        vec2 rc = floor(vWorldPos.xz * 0.65);
        vec2 ru = fract(vWorldPos.xz * 0.65) - 0.5;
        float rd = hash(rc);
        float rp = fract(uTime * 1.35 + rd);
        float ring = smoothstep(0.05, 0.0, abs(length(ru) - rp * 0.45)) * (1.0 - rp);
        baseCol = ip ? vec3(0.03, 0.06, 0.09) + vec3(0.14, 0.30, 0.42) * ring : (uCol1 + grain);
        if(ip){
          metal = 0.35; roughness = 0.08; specPow = 110.0;
          emisCol = vec3(0.08, 0.16, 0.28) * (0.12 + ring * 0.18);
        } else {
          metal = 0.05; roughness = 0.65; specPow = 24.0;
        }
        sssWeight = 0.0;
      }
      else if(uPattern == 7){
        // Индустриальный металл / кора корней
        vec2 g = fract(vUv * vec2(6.0, 3.0));
        float seam = (g.x < 0.06 || g.x > 0.94 || g.y < 0.06 || g.y > 0.94) ? 1.0 : 0.0;
        float rust = fbm(vUv * 8.0) * 0.32;
        baseCol = mix(uCol1 - rust, uCol2, seam);
        metal = 0.48; roughness = 0.52; specPow = 36.0; sssWeight = 0.15;
      }
      else if(uPattern == 8){
        // Органическая листва, ботва и био-холмы
        float v = fbm(vUv * 6.5);
        baseCol = mix(uCol1, uCol2, v * 0.72);
        float bioVein = smoothstep(0.86, 1.0, sin(vUv.x * 20.0 + vUv.y * 20.0 - uTime * 4.0));
        emisCol = uRim * bioVein * 0.16;
        metal = 0.08; roughness = 0.42; specPow = 32.0; sssWeight = 0.65;
      }
      else if(uPattern == 9){
        // Тактическая броня
        vec2 g = fract(vUv * vec2(12.0, 12.0));
        float c = (abs(g.x - 0.5) < 0.04 || abs(g.y - 0.5) < 0.04) ? 1.0 : 0.0;
        baseCol = mix(uCol1, uCol2, c);
        metal = 0.65; roughness = 0.32; specPow = 96.0; sssWeight = 0.05;
      }
      else if(uPattern == 10){
        // Магматические био-волокна (Форма Пекла / Эволюция)
        float cr = sin(vUv.x * 22.0 + vUv.y * 11.0 + uTime * 2.4) * 0.5 + 0.5;
        float cr2 = cos(vUv.x * 17.0 - vUv.y * 23.0 - uTime * 3.4) * 0.5 + 0.5;
        float veins = smoothstep(0.82, 1.0, cr) * 0.85 + smoothstep(0.88, 1.0, cr2) * 0.75;
        float emberPulse = 0.65 + 0.35 * sin(uTime * 4.0 + vUv.y * 6.0);
        baseCol = mix(uCol1, uCol2, 0.25 + 0.35 * cr);
        emisCol = mix(vec3(1.0, 0.32, 0.0), vec3(1.0, 0.92, 0.22), cr * cr) * (veins * emberPulse * 0.95);
        metal = 0.32; roughness = 0.45; specPow = 68.0; sssWeight = 0.55;
      }
      else {
        // Базовая органика банана / персонажей (uPattern == 0)
        float bioSpark = smoothstep(0.95, 1.0, sin(vUv.y * 24.0 - uTime * 5.0 + noise(vUv * 10.0) * 4.0));
        emisCol = uRim * bioSpark * 0.14;
        sssWeight = 0.52;
      }

      // Освещение с Wrap-диффузом и двойным бликом
      vec3 L1 = normalize(uLightDir);
      vec3 L2 = normalize(vec3(-0.6, 0.35, 0.55));
      float NdotL1 = max(dot(Nt, L1), 0.0);
      float NdotL2 = max(dot(Nt, L2), 0.0);
      float wrapA = 0.42;
      float diffWrap1 = (NdotL1 + wrapA) / (1.0 + wrapA);
      float diffWrap2 = (NdotL2 + wrapA) / (1.0 + wrapA);

      vec3 diffCol = baseCol * (uLightCol * diffWrap1 * 0.76 + uFillCol * diffWrap2 * 0.22 + vec3(0.04, 0.05, 0.08));
      diffCol *= (1.0 - metal * 0.82);

      vec3 H1 = normalize(L1 + V);
      vec3 H2 = normalize(L2 + V);
      float NdotH1 = max(dot(Nt, H1), 0.0);
      float NdotH2 = max(dot(Nt, H2), 0.0);
      float NdotV = max(dot(Nt, V), 0.0);
      float fresnel = 0.04 + 0.96 * pow(1.0 - NdotV, 5.0);

      float spec1 = pow(NdotH1, specPow) * (0.22 + 0.62 * metal) * (0.4 + 0.6 * fresnel);
      float spec2 = pow(NdotH2, specPow) * 0.25 * (0.22 + 0.62 * metal) * (0.3 + 0.7 * fresnel);
      vec3 specCol = (uLightCol * spec1 + uFillCol * spec2) * 0.85;

      // Окружение и Rim-свет
      vec3 R = reflect(-V, Nt);
      vec3 envTop = mix(vec3(0.04, 0.06, 0.10), vec3(0.16, 0.24, 0.35), 0.55);
      vec3 envBot = vec3(0.01, 0.02, 0.03);
      vec3 env = mix(envBot, envTop, smoothstep(-0.3, 0.6, R.y));
      env += vec3(0.16, 0.04, 0.08) * exp(-abs(R.y) * 6.0) * 0.32;
      env *= (0.15 + 0.38 * metal) * (1.0 - roughness * 0.68);

      float rim = pow(1.0 - NdotV, 3.0);
      vec3 rimCol = uRim * rim * 0.24;

      // Внутреннее свечение растительной мякоти (Subsurface Scattering / SSS)
      float backLight = pow(clamp(dot(V, -L1 + Nt * 0.45), 0.0, 1.0), 2.4);
      float thicknessSim = 0.45 + 0.55 * (1.0 - NdotV);
      vec3 pulpTint = mix(baseCol, vec3(1.0, 0.55, 0.18), 0.42);
      vec3 sssCol = pulpTint * (backLight * 0.42 + thicknessSim * 0.16) * sssWeight;

      emisCol = min(emisCol, vec3(1.35));
      vec3 lit = diffCol + specCol + env + rimCol + sssCol + emisCol;
      lit = lit / (lit + vec3(0.96));
      gl_FragColor = vec4(lit, 1.0);
    }
  `;

  window.createPrototypeShader = function (c1, c2 = 0x111111, pt = 0, rim = 0x00f2fe) {
    const k = c1 + '|' + c2 + '|' + pt + '|' + rim;
    if (typeof _shaderCache !== 'undefined') {
      const cached = _shaderCache.get(k);
      if (cached) {
        if (!cached._protoV60Upgraded) {
          cached.vertexShader = PROTO_VERTEX_SHADER;
          cached.fragmentShader = PROTO_FRAGMENT_SHADER;
          cached._protoV60Upgraded = true;
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
        uLightCol: { value: new THREE.Color(0xfff0d8) },
        uFillCol: { value: new THREE.Color(0x4a6a9a) },
        uPattern: { value: pt },
        uTime: (typeof globalShaderUniforms !== 'undefined' && globalShaderUniforms.uTime)
          ? globalShaderUniforms.uTime
          : { value: 0 }
      },
      vertexShader: PROTO_VERTEX_SHADER,
      fragmentShader: PROTO_FRAGMENT_SHADER
    });
    mat._protoV60Upgraded = true;
    if (typeof _shaderCache !== 'undefined') _shaderCache.set(k, mat);
    if (typeof _cachedShaderSet !== 'undefined') _cachedShaderSet.add(mat);
    return mat;
  };

  function upgradeAllSceneShaders() {
    if (typeof _shaderCache !== 'undefined') {
      _shaderCache.forEach((mat) => {
        if (mat && mat.isShaderMaterial && !mat._protoV60Upgraded) {
          mat.vertexShader = PROTO_VERTEX_SHADER;
          mat.fragmentShader = PROTO_FRAGMENT_SHADER;
          mat._protoV60Upgraded = true;
          mat.needsUpdate = true;
        }
      });
    }
    if (typeof scene !== 'undefined') {
      scene.traverse((obj) => {
        if (obj.material && obj.material.isShaderMaterial && obj.material.uniforms && obj.material.uniforms.uCol1) {
          if (!obj.material._protoV60Upgraded) {
            obj.material.vertexShader = PROTO_VERTEX_SHADER;
            obj.material.fragmentShader = PROTO_FRAGMENT_SHADER;
            obj.material._protoV60Upgraded = true;
            obj.material.needsUpdate = true;
          }
        }
      });
    }
    if (typeof rebuildHeroMesh === 'function' && typeof player !== 'undefined' && player.mesh) {
      rebuildHeroMesh();
    }
  }
  setTimeout(upgradeAllSceneShaders, 60);

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 1. БАЗОВЫЕ МИРОВЫЕ ФИКСЫ (КУСТЫ, МОРКОВЬ, ЦИКЛ ДНЯ/НОЧИ, ХОЛМЫ)
  // ═══════════════════════════════════════════════════════════════════════════
  if (typeof addProp === 'function') {
    const _origAddProp = window.addProp;
    window.addProp = function (x, z, type) {
      if (type === 'bush') return;
      return _origAddProp.apply(this, arguments);
    };
  }

  function fixCarrotMeshGround() {
    if (typeof player === 'undefined' || !player.mesh || !player.mesh.userData || !player.mesh.userData.isCarrot) return;
    try {
      player.mesh.position.y = 0;
      player.mesh.updateMatrixWorld(true);
      const bbox = new THREE.Box3().setFromObject(player.mesh);
      const scaleY = (typeof playerGroup !== 'undefined' && playerGroup.scale.y) || 1;
      if (bbox.min.y < 0.1) {
        player.mesh.position.y += (0.1 - bbox.min.y) / scaleY;
      }
    } catch (e) {}
  }
  setInterval(fixCarrotMeshGround, 500);

  const _baseRebuildHeroMesh = window.rebuildHeroMesh;
  window.rebuildHeroMesh = function () {
    if (_baseRebuildHeroMesh) _baseRebuildHeroMesh.apply(this, arguments);
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
  }, 800);

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
  }, 1200);

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 2. КИНЕМАТОГРАФИЧНАЯ СМЕНА КОСТЮМОВ ЕГОРБАНАНА (PROTOTYPE BIOMASS MORPH)
  // ═══════════════════════════════════════════════════════════════════════════
  let _suitMorphTimer = 0;
  let _suitMorphDuration = 0.42;

  function triggerPrototypeSuitMorph(idx) {
    if (typeof player === 'undefined' || !player.pos || typeof scene === 'undefined') return;
    const suit = (typeof SUITS !== 'undefined' && SUITS[idx]) ? SUITS[idx] : { slashColor: 0xff0055, name: 'КОСТЮМ' };
    const col = suit.slashColor || 0xff0055;
    const origin = player.pos.clone().add(new THREE.Vector3(0, 2.2, 0));

    // Выброс био-волокон вокруг тела
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

    // Концентрическая ударная волна и отбрасывание ближайших врагов
    if (typeof spawnGroundCrackRing === 'function') {
      spawnGroundCrackRing(player.pos, col, 11);
    }
    if (typeof spawnParticles === 'function') {
      spawnParticles(origin, col, 18);
    }
    if (typeof SoundFX !== 'undefined') {
      SoundFX.whip();
      SoundFX.hit(180, 0.22);
    }
    if (typeof triggerHitstopAndChroma === 'function') {
      triggerHitstopAndChroma(0.04, 0.45, 0.95);
    }
    if (typeof postUniforms !== 'undefined' && postUniforms.uBioPulse) {
      postUniforms.uBioPulse.value = 0.85;
    }

    // Ударная волна костюма расталкивает врагов в радиусе 7.5м
    if (typeof enemies !== 'undefined') {
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const d = e.group.position.distanceTo(player.pos);
        if (d < 7.5) {
          const push = e.group.position.clone().sub(player.pos).normalize().multiplyScalar(8);
          e.vel.x += push.x;
          e.vel.z += push.z;
          if (!e.flying) e.vel.y = Math.max(e.vel.y, 7);
        }
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
  // ═══ 3. ДВИЖОК ПЕРЕДВИЖЕНИЯ В СТИЛЕ PROTOTYPE (WALL-RUN, MANTLE VAULT, EJECT)
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

      // Исключаем наземных врагов из горизонтального выталкивания, когда игрок высоко в воздухе
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

      if (player._mantleCooldown > 0) player._mantleCooldown -= dt;

      // ─── БЕСШОВНЫЙ WALL-RUN + MANTLE VAULT ЧЕРЕЗ КОЗЫРЬКИ ЗДАНИЙ ───
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

            // MANTLE VAULT: автоматический перекат через карниз крыши без застревания
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
              // Плавная стабилизация камеры и крена вдоль стены
              const camFwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
              const wallCross = camFwd.x * player._wallNormal.z - camFwd.z * player._wallNormal.x;
              const targetRoll = THREE.MathUtils.clamp(wallCross * 0.28, -0.28, 0.28);
              player.camRoll += (targetRoll - player.camRoll) * 0.22;
              camera.up.set(Math.sin(player.camRoll), Math.cos(player.camRoll), 0).normalize();

              // Подруливание камеры вдоль стены, если игрок смотрит слишком круто в стену
              const intoWall = -(camFwd.x * player._wallNormal.x + camFwd.z * player._wallNormal.z);
              if (intoWall > 0.35 && intoWall < 0.92) {
                const tangentX = -player._wallNormal.z * (wallCross >= 0 ? 1 : -1);
                const tangentZ = player._wallNormal.x * (wallCross >= 0 ? 1 : -1);
                const desiredYaw = Math.atan2(-tangentX, -tangentZ);
                let dyaw = desiredYaw - player.camYaw;
                while (dyaw > Math.PI) dyaw -= Math.PI * 2;
                while (dyaw < -Math.PI) dyaw += Math.PI * 2;
                player.camYaw += dyaw * dt * 2.4;
              }

              // Спринт-паркур искры из-под ног на вертикальной стене
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

      // Анимация пружинного морфинга костюма Егорбанана
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

  // WALL-EJECT: отталкивание от стены с учетом нормали стены (без застревания в геометрии)
  window.performWallJump = function () {
    if (!player.isWallRunning) return;
    player.wallJumpCount++;
    player.wallJumpTimer = 1.05;
    player.facingYaw = player.camYaw;

    const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
    const wn = player._wallNormal || new THREE.Vector3(0, 0, 1);
    const boost = Math.min(1 + player.wallJumpCount * 0.22, 1.9);

    // Смещаем позицию на 1.2м по нормали от стены, чтобы исключить повторный захват AABB
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
    if (typeof spawnGroundCrackRing === 'function') {
      spawnGroundCrackRing(player.pos, 0x00f2fe, 5.5);
    }
    if (player.wallJumpCount >= 2 && typeof spawnComicPop === 'function') {
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 2, 0)), `*WALL-EJECT x${player.wallJumpCount}!*`, '#fff200');
      player.score += 60 * player.wallJumpCount;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 4. ФИЗИКА СТОЛКНОВЕНИЯ С МАШИНАМИ + ТЕЛЕГРАФИРОВАНИЕ И PHASE 2 ВРАГОВ
  // ═══════════════════════════════════════════════════════════════════════════
  if (typeof updateEnemiesAndVehicles === 'function') {
    const _origUpdateEnemies = window.updateEnemiesAndVehicles;
    window.updateEnemiesAndVehicles = function (dt, now) {
      // Фиксация замороженных целей
      const frozenPos = new Map();
      for (let i = 0; i < enemies.length; i++) {
        const en = enemies[i];
        if (en.frozen > 0) {
          en.frozen -= dt;
          en.vel.x = 0;
          en.vel.z = 0;
          en._mpMoving = false;
          frozenPos.set(en, en.group.position.clone());
        }
      }

      // Если активна Маскировка (Disguise), временно уводим координаты игрока для AI рядовых врагов
      const isDisguised = player._disguiseTimer > 0;
      const realPx = player.pos.x;
      const realPz = player.pos.z;
      if (isDisguised && !activeBoss) {
        player.pos.x = 99999;
        player.pos.z = 99999;
      }

      _origUpdateEnemies.apply(this, arguments);

      if (isDisguised && !activeBoss) {
        player.pos.x = realPx;
        player.pos.z = realPz;
      }

      for (let [en, pos] of frozenPos) {
        en.group.position.copy(pos);
      }

      // ─── ВИЗУАЛЬНОЕ ТЕЛЕГРАФИРОВАНИЕ АТАК И ФАЗА БЕШЕНСТВА (PHASE 2 < 50% HP) ───
      for (let i = 0; i < enemies.length; i++) {
        const en = enemies[i];
        if (!en || !en.group) continue;

        // Вспышка и наземный индикатор перед ударом
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

        // Фаза 2 (HP < 50%) для боссов и элитных врагов
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

      // ─── ФИЗИКА СТОЛКНОВЕНИЯ И РАЗЛЕТА АВТОМОБИЛЕЙ (destructibleCars) ───
      if (typeof destructibleCars !== 'undefined') {
        const playerSpeedSq = player.vel.x * player.vel.x + player.vel.z * player.vel.z;
        for (let i = 0; i < destructibleCars.length; i++) {
          const car = destructibleCars[i];
          if (!car || !car.group) continue;

          // Таран машины игроком на высокой скорости
          const distToPlayer = car.group.position.distanceTo(player.pos);
          if (!car.exploded && distToPlayer < 4.2 && (playerSpeedSq > 400 || (CARROT_MODE && CARROT_FORM === 2) || player.durianRam)) {
            if (typeof checkCarDestruction === 'function') {
              checkCarDestruction(player.pos, 5.0);
            }
            const pushDir = car.group.position.clone().sub(player.pos).normalize();
            car.vel.set(pushDir.x * 34, 19, pushDir.z * 34);
            car.angVel = new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 8);
            if (typeof SoundFX !== 'undefined') SoundFX.boom();
          }

          // Баллистическое движение взорванных машин
          if (car.exploded && (car.vel.lengthSq() > 0.1 || car.group.position.y > 0.05)) {
            car.group.position.addScaledVector(car.vel, dt);
            car.vel.y -= 36 * dt;
            car.vel.x *= 0.96;
            car.vel.z *= 0.96;

            if (!car.angVel) {
              car.angVel = new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 6);
            }
            car.group.rotation.x += car.angVel.x * dt;
            car.group.rotation.y += car.angVel.y * dt;
            car.group.rotation.z += car.angVel.z * dt;

            // Вторичный урон врагам от летящего кузова автомобиля
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

  // Снятие маскировки при любой атаке игрока
  const _basePerformPrimary = window.performPrimaryAttack;
  window.performPrimaryAttack = function () {
    if (player._disguiseTimer > 0) {
      deactivateDisguise(true);
    }
    if (_basePerformPrimary) return _basePerformPrimary.apply(this, arguments);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 5. УСИЛЕННЫЙ ЩИТ РЕАКТОРА И КАРТОФЕЛЬНАЯ БРОНЯ
  // ═══════════════════════════════════════════════════════════════════════════
  const origDamageToHero = window.applyDamageToHero;
  window.applyDamageToHero = function (dmg) {
    if (window.__POTATO_MODE && window.__POTATO_FORM === 1 && player._potatoArmor > 0) {
      dmg = Math.floor(dmg * 0.5);
    }
    if (player.activeModeF && player.suitIdx === 3 && player.character === 'banana' && !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE && !window.__POTATO_MODE) {
      const drain = dmg * 1.5;
      if (player.en >= drain) {
        player.en -= drain;
        if (typeof spawnComicPop === 'function') {
          spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3.2, 0)), '*ЩИТ БЛОК*', '#00f2fe');
        }
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

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 6. МЕНЮ ESC + НАПАРНИК ШРЕКИЧ ИИ [B]
  // ═══════════════════════════════════════════════════════════════════════════
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && typeof gameStarted !== 'undefined' && gameStarted) {
      document.getElementById('start-screen').style.display = 'flex';
      try { document.exitPointerLock(); } catch (err) {}
    }
    if (
      e.code === 'KeyB' &&
      typeof player !== 'undefined' &&
      player.character === 'banana' &&
      !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE && !window.__POTATO_MODE
    ) {
      if (typeof Companion !== 'undefined') {
        Companion._disabled = !Companion._disabled;
        if (Companion._disabled) {
          if (Companion.group) Companion.group.visible = false;
          Companion.shootCd = 99999;
          Companion.buffCd = 99999;
          player.companionShield = 0;
          player.companionRegen = 0;
          player.companionDmg = 0;
          if (typeof spawnComicPop === 'function') {
            spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), 'ДРОН ОТКЛЮЧЕН', '#ff0000');
          }
        } else {
          if (Companion.group) Companion.group.visible = true;
          Companion.shootCd = 0;
          Companion.buffCd = 15;
          if (typeof spawnComicPop === 'function') {
            spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), 'ДРОН ВКЛЮЧЕН', '#00ff66');
          }
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

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 7. ЛИАНОВЫЙ ГАРПУН ХОХЛОРКОВИ [ПКМ] (КД 0.6с)
  // ═══════════════════════════════════════════════════════════════════════════
  let _newVineCd = 0;
  const VINE_CD = 0.6;
  window.addEventListener('mousedown', function (e) {
    if (e.button !== 2) return;
    if (typeof player === 'undefined' || player.isDead) return;
    if (!CARROT_MODE || CARROT_FORM !== 1) return;
    if (typeof gameStarted !== 'undefined' && !gameStarted) return;
    if (typeof isLabOpen !== 'undefined' && isLabOpen) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (_newVineCd > 0) {
      if (typeof spawnComicPop === 'function') {
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '*ГАРПУН КД ' + _newVineCd.toFixed(1) + 'с*', '#2ecc71');
      }
      return;
    }
    const origin = player.pos.clone().add(new THREE.Vector3(0, 2, 0));
    const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
    const rc = new THREE.Raycaster();
    rc.set(origin, fwd);
    rc.far = 450;
    const rawHits = rc.intersectObjects(buildingMeshes, false);
    const buildHits = rawHits.filter(function (h) { return h.point.y > player.pos.y + 1; });
    const buildingDist = buildHits.length > 0 ? buildHits[0].distance : Infinity;
    let bestEnemy = null;
    let bestDist = 450;
    for (let i = 0; i < enemies.length; i++) {
      const en = enemies[i];
      const toE = en.group.position.clone().sub(player.pos);
      const dist = toE.length();
      if (dist > 450) continue;
      const dot = toE.clone().normalize().dot(fwd);
      if (dot < 0.5) continue;
      if (dist < bestDist) { bestDist = dist; bestEnemy = en; }
    }
    if (bestEnemy && bestDist <= buildingDist) {
      _newVineCd = VINE_CD;
      const isElite = (
        bestEnemy.type === 'titan' || bestEnemy.type === 'tank' ||
        bestEnemy.type === 'lemon' || bestEnemy.type === 'valkyrie' ||
        bestEnemy.type === 'necromancer' || bestEnemy.type === 'heli' ||
        bestEnemy.type === 'shield' || bestEnemy.type === 'sniper' || bestEnemy._isBoss
      );
      const tp = bestEnemy.group.position.clone().add(new THREE.Vector3(0, 2, 0));
      if (activeTendrils.length < 8) {
        activeTendrils.push(new OrganicTendril3D(scene, origin.clone(), tp.clone(), 0x2ecc71, 0.4, 0.5));
      }
      SoundFX.whip();
      triggerHitstopAndChroma(0.06, 0.4, 0.9);
      const travelMs = Math.max(250, Math.min(2000, (bestDist / 250) * 1000));
      if (isElite) {
        spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), '*К БОССУ!*', '#ff2200');
        const dir = tp.clone().sub(player.pos).normalize();
        player.vel.x = dir.x * 250;
        player.vel.z = dir.z * 250;
        player.vel.y = Math.max(20, dir.y * 50);
        player.dodgeIframes = 0.7;
        postUniforms.uRadialBlur.value = 1.3;
        const capE = bestEnemy;
        setTimeout(function () {
          if (capE && capE.group.parent) {
            const st = carrotStats();
            damageEnemy(capE, st.dmg * 4.5, new THREE.Vector3(0, 0, 0), '*СОКРУШИТЕЛЬНЫЙ УДАР!*');
            spawnParticles(tp.clone(), 0x2ecc71, 24);
            spawnGroundCrackRing(capE.group.position, 0x2ecc71, 14);
            triggerHitstopAndChroma(0.12, 0.8, 1.3);
          }
        }, travelMs);
      } else {
        spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), '*ИДИ СЮДА!*', '#2ecc71');
        const capE = bestEnemy;
        capE.vel.x = (player.pos.x - capE.group.position.x) * 8;
        capE.vel.z = (player.pos.z - capE.group.position.z) * 8;
        capE._rooted = 0.6;
        setTimeout(function () {
          if (capE && capE.group.parent) {
            const st = carrotStats();
            const fwd2 = new THREE.Vector3(-Math.sin(player.facingYaw), 0, -Math.cos(player.facingYaw));
            spawnSlashArc(player.pos.clone().add(new THREE.Vector3(0, 2, 0)), player.facingYaw, 0, 0x2ecc71, 6.5, 0.4);
            damageEnemy(capE, st.dmg * 3.0, fwd2.clone().multiplyScalar(10), '*УДАР С РАЗВОРОТА!*');
            spawnParticles(capE.group.position.clone().add(new THREE.Vector3(0, 2, 0)), 0xadff2f, 14);
            triggerHitstopAndChroma(0.08, 0.6, 1.1);
          }
        }, 450);
      }
    } else if (buildHits.length > 0) {
      _newVineCd = VINE_CD;
      const hp = buildHits[0].point;
      if (activeTendrils.length < 8) {
        activeTendrils.push(new OrganicTendril3D(scene, origin.clone(), hp.clone(), 0x2ecc71, 0.35, 0.4));
      }
      SoundFX.swing(500);
      spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), '*ЦЕПКИЙ КОРЕНЬ!*', '#2ecc71');
      const dir = hp.clone().sub(player.pos).normalize();
      player.vel.x = dir.x * 220;
      player.vel.z = dir.z * 220;
      player.vel.y = Math.max(40, Math.abs(dir.y) * 80 + 20);
      player.isGrounded = false;
      player.isBulletdropping = false;
      player.dodgeIframes = 0.5;
      postUniforms.uRadialBlur.value = 1.1;
    } else {
      spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), '*НЕТ ЦЕЛИ*', '#888888');
      SoundFX.swing(300);
    }
  }, true);
  setInterval(() => { if (_newVineCd > 0) _newVineCd = Math.max(0, _newVineCd - 0.1); }, 100);

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 8. ЖЕСТОКОЕ ПОГЛОЩЕНИЕ [C] (100% ЭНЕРГИИ + МАСКИРОВКА + КРИО-ИМПУЛЬС)
  // ═══════════════════════════════════════════════════════════════════════════
  const FREEZE_RADIUS = 15;
  const FREEZE_DMG = 20;
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
    spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 4.2, 0)), '🕵️ МАСКИРОВКА CITRUS (15с)', '#ff9f1a');
  }

  function deactivateDisguise(brokenByAttack = false) {
    player._disguiseTimer = 0;
    if (_disguiseHoloMesh && _disguiseHoloMesh.parent) {
      _disguiseHoloMesh.parent.remove(_disguiseHoloMesh);
      _disguiseHoloMesh.geometry.dispose();
      _disguiseHoloMesh.material.dispose();
      _disguiseHoloMesh = null;
    }
    if (brokenByAttack && typeof spawnComicPop === 'function') {
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3.8, 0)), '⚠️ МАСКИРОВКА СБРОШЕНА!', '#ff0055');
    }
  }

  window.addEventListener('keydown', function (e) {
    if (e.code !== 'KeyC') return;
    if (typeof player === 'undefined' || player.isDead) return;
    if (player.character !== 'banana') return;
    if (CARROT_MODE || PEPPER_MODE || LEMON_MODE || window.__POTATO_MODE) return;
    if (player.isFlying) return; // В полете C отвечает за снижение

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (player.consumeCd > 0) {
      if (typeof spawnComicPop === 'function') {
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), `*C КД ${player.consumeCd.toFixed(1)}с*`, '#00ff66');
      }
      return;
    }

    // Ищем ближайшего пехотинца для Жестокого Поглощения (Consume)
    let consumeVictim = null;
    let bestVictimDist = 16;
    for (let i = 0; i < enemies.length; i++) {
      const en = enemies[i];
      const isBossOrVehicle = (
        en._isBoss || en.type === 'titan' || en.type === 'tank' ||
        en.type === 'heli' || en.type === 'lemon' ||
        en.type === 'valkyrie' || en.type === 'necromancer'
      );
      if (isBossOrVehicle) continue;
      const d = en.group.position.distanceTo(player.pos);
      // Приоритет ослабленным пехотинцам или любому пехотинцу в радиусе 16м
      if (d < bestVictimDist) {
        bestVictimDist = d;
        consumeVictim = en;
      }
    }

    player.consumeCd = 8.0;

    // 1) ЗАХВАТ И ПОГЛОЩЕНИЕ ПЕХОТИНЦА ЩУПАЛЬЦАМИ/ЛОЗАМИ -> 100% EN + HP + МАСКИРОВКА
    if (consumeVictim) {
      const chest = player.pos.clone().add(new THREE.Vector3(0, 2.3, 0));
      const tp = consumeVictim.group.position.clone().add(new THREE.Vector3(0, 2, 0));
      for (let k = 0; k < 3; k++) {
        if (activeTendrils.length < 12) {
          activeTendrils.push(new OrganicTendril3D(scene, chest.clone(), tp.clone(), k % 2 === 0 ? 0xff0055 : 0x2ecc71, 0.45, 0.55));
        }
      }
      SoundFX.whip();
      SoundFX.devastator();
      triggerHitstopAndChroma(0.09, 0.65, 1.25);

      player.consumeState = { target: consumeVictim, timer: 0.52, duration: 0.52 };
      postUniforms.uBioPulse.value = 1.0;

      // Полное 100% восстановление энергии + исцеление + запуск маскировки после втягивания биомассы
      setTimeout(() => {
        if (!player.isDead) {
          player.en = player.maxEn;
          player.hp = Math.min(player.maxHp, player.hp + 120);
          activateDisguise(15.0);
          spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 5.2, 0)), '🧬 БИОМАССА ПОГЛОЩЕНА: 100% EN!', '#00ff66');
          updateHUD();
        }
      }, 520);
    }

    // 2) СОХРАНЕНИЕ КРИО-ЗАМОРОЗКИ ИЗ ПАТЧА v53 ДЛЯ КОСТЮМА [4] (НАНОЯГОДНАЯ БРОНЯ)
    if (player.suitIdx === 4) {
      const targets = [];
      for (let i = 0; i < enemies.length; i++) {
        const en = enemies[i];
        if (en === consumeVictim) continue;
        if (en.group.position.distanceTo(player.pos) < FREEZE_RADIUS) targets.push(en);
      }
      const groundRing = new THREE.Mesh(
        new THREE.RingGeometry(1, FREEZE_RADIUS, 40),
        new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false })
      );
      groundRing.rotation.x = -Math.PI / 2;
      groundRing.position.set(player.pos.x, 0.15, player.pos.z);
      scene.add(groundRing);
      let rt = 0;
      (function animRing() {
        rt += 0.03;
        groundRing.material.opacity = Math.max(0, 0.65 * (1 - rt));
        groundRing.scale.setScalar(1 + rt * 0.2);
        if (rt < 1) requestAnimationFrame(animRing);
        else { scene.remove(groundRing); groundRing.geometry.dispose(); groundRing.material.dispose(); }
      })();

      for (const t of targets) {
        const pos = t.group.position;
        for (let i = 0; i < 3; i++) {
          const cube = new THREE.Mesh(
            new THREE.BoxGeometry(3 - i * 0.8, 4 - i * 0.8, 3 - i * 0.8),
            new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.55 + i * 0.15, wireframe: true })
          );
          cube.position.copy(pos).add(new THREE.Vector3(0, 2, 0));
          scene.add(cube);
          setTimeout(() => { scene.remove(cube); cube.geometry.dispose(); cube.material.dispose(); }, 3000);
        }
        if (typeof spawnParticles === 'function') spawnParticles(pos.clone().add(new THREE.Vector3(0, 1, 0)), 0x00f2fe, 12);
        t.frozen = 3.0;
        t._mpMoving = false;
        t.vel.x = 0;
        t.vel.z = 0;
        if (!t._mpId && typeof damageEnemy === 'function') damageEnemy(t, FREEZE_DMG, new THREE.Vector3(), '*ЗАМОРОЖЕН!*');
      }

      if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'freeze', radius: FREEZE_RADIUS });
      if (!consumeVictim && typeof spawnComicPop === 'function') {
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 5, 0)), `❄ ЗАМОРОЗКА (${targets.length})`, '#00f2fe');
      }
      if (typeof SoundFX !== 'undefined') { SoundFX.devastator(); SoundFX.boom(); }
    } else if (!consumeVictim) {
      player.consumeCd = 1.0;
      sayShrekich('Шрекич: «Подойди ближе к пехотинцу для поглощения!»', true);
    }
  }, true);

  setInterval(() => {
    if (player.consumeCd > 0) player.consumeCd = Math.max(0, player.consumeCd - 0.1);
    if (player._disguiseTimer > 0) {
      player._disguiseTimer = Math.max(0, player._disguiseTimer - 0.1);
      if (_disguiseHoloMesh) _disguiseHoloMesh.rotation.y += 0.15;
      if (player._disguiseTimer <= 0) deactivateDisguise(false);
    }
  }, 100);

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 9. T — БОЖЕСТВЕННЫЙ СИНТЕЗ ЕГОРА (НАНОЯГОДНАЯ БРОНЯ [4])
  // ═══════════════════════════════════════════════════════════════════════════
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
        if (typeof spawnComicPop === 'function') {
          spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), `*T КД ${Math.ceil(nanoUltCd)}с*`, '#ff4400');
        }
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
      const bar = document.getElementById('t-bar');
      if (bar) bar.style.width = Math.min(100, (tHoldTimer / 5) * 100) + '%';
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
          new THREE.MeshBasicMaterial({ color: 0x00f2fe, side: THREE.DoubleSide, transparent: true, opacity: 1 })
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
          const en = enemies[i];
          if (en.group.position.distanceTo(player.pos) <= 50) {
            damageEnemy(en, 2400, new THREE.Vector3(0, 16, 0), '*БОЖЕСТВЕННЫЙ СИНТЕЗ!*');
          }
        }
        if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'nano_ult', radius: 50 });
        if (typeof spawnComicPop === 'function') {
          spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 5, 0)), '⚡ БОЖЕСТВЕННЫЙ СИНТЕЗ! ⚡', '#00f2fe');
        }
        if (typeof SoundFX !== 'undefined') { SoundFX.devastator(); SoundFX.boom(); }
      }
    }
  }, 100);

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 10. F-СПОСОБНОСТИ, ТАНКИ APC, ОПУТЫВАНИЕ ВЕРТОЛЕТОВ, ЯРОСТЬ ПЕРЦА
  // ═══════════════════════════════════════════════════════════════════════════
  player._suitCdMap = player._suitCdMap || [0, 0, 0, 0, 0];
  const origTriggerF = window.triggerUniqueAbilityF;
  window.triggerUniqueAbilityF = function () {
    if (window.__POTATO_MODE) return;
    const idx = player.suitIdx;
    if (CARROT_MODE) {
      if (CARROT_FORM === 2) {
        if (player._suitCdMap[4] > 0) {
          if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 5, 0)), `*F КД ${player._suitCdMap[4].toFixed(1)}с*`, '#f9ca24');
          return;
        }
        if (player.carrotStamina < 60) {
          if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 4, 0)), '*МАЛО СТАМИНЫ!*', '#ff2200');
          return;
        }
        player._suitCdMap[4] = 8;
        carrotEarthquake();
        if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'earthquake', radius: 40 });
      } else {
        if (player._suitCdMap[3] > 0) {
          if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), `*F КД ${player._suitCdMap[3].toFixed(1)}с*`, '#f9ca24');
          return;
        }
        player._suitCdMap[3] = 8;
        carrotRootBind();
        if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'root_bind', radius: 22 });
      }
      return;
    }
    if (player.character === 'banana' && !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE) {
      if (player._suitCdMap[idx] > 0) {
        if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), `*F КД ${player._suitCdMap[idx].toFixed(1)}с*`, '#f9ca24');
        return;
      }
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
            alliedTurrets.push({ group: g, life: 15 * (player.mutTurretMult || 1), cd: 0 });
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

  const origRootBind = window.carrotRootBind;
  window.carrotRootBind = function () {
    if (origRootBind) origRootBind.apply(this, arguments);
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.flying && e.group.position.distanceTo(player.pos) < 25) {
        e.flying = false;
        e.group.position.y = 0;
        e.vel.y = 0;
        if (typeof spawnComicPop === 'function') {
          spawnComicPop(e.group.position.clone().add(new THREE.Vector3(0, 2, 0)), 'СБИТ!', '#2ecc71');
        }
      }
    }
  };

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
  // ═══ 11. 5-Й ПЕРСОНАЖ: МОРГЕНКАРТОШКА & ГРОМТОМАТ (ПОЛНОЕ СОХРАНЕНИЕ + PBR)
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
    const g = new THREE.Group();
    const pelvis = new THREE.Group();
    pelvis.position.y = 1.65;
    g.add(pelvis);
    const spine = new THREE.Group();
    pelvis.add(spine);
    const neck = new THREE.Group();
    neck.position.y = 1.95;
    spine.add(neck);
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.4;
    neck.add(headGroup);
    const armL = new THREE.Group();
    armL.position.set(-1.0, 1.55, 0);
    spine.add(armL);
    const armR = new THREE.Group();
    armR.position.set(1.0, 1.55, 0);
    spine.add(armR);
    const legL = new THREE.Group();
    legL.position.set(-0.35, 0, 0);
    pelvis.add(legL);
    const legR = new THREE.Group();
    legR.position.set(0.35, 0, 0);
    pelvis.add(legR);

    const isMorg = (form === 1);
    const bodyMat = isMorg
      ? createPrototypeShader(0x8B0000, 0x3a0000, 7, 0xD2B48C)
      : createPrototypeShader(0x4A0010, 0xFF2200, 10, 0xFF4400);
    const bellyMat = isMorg
      ? createPrototypeShader(0xD2B48C, 0x8B4513, 4, 0xffe4b5)
      : createPrototypeShader(0xFF2200, 0x8b0000, 4, 0xffaa00);
    const headMat = isMorg
      ? createPrototypeShader(0xE8C4A0, 0x8B5A2B, 4, 0xffe4b5)
      : createPrototypeShader(0xFF0000, 0x7a0000, 4, 0xff5500);
    const hairMat = new THREE.MeshStandardMaterial({ color: isMorg ? 0x2A1A0F : 0x0A0A0A });
    const armMat = bodyMat;
    const legMat = new THREE.MeshStandardMaterial({ color: isMorg ? 0x2A2A2A : 0x1A1A1A });
    const accentMat = isMorg
      ? new THREE.MeshBasicMaterial({ color: 0x3E2723 })
      : createPrototypeShader(0x00FF00, 0x006600, 4, 0xadff2f);

    const torso = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 1.5, 10), bodyMat), 1.04);
    torso.position.y = 1.1;
    spine.add(torso);

    if (isMorg) {
      for (let s = 0; s < 4; s++) {
        const stripeH = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: 0x000000 }));
        stripeH.position.set(0, 0.55 + s * 0.35, 0.86);
        spine.add(stripeH);
      }
      for (let sv = 0; sv < 3; sv++) {
        const stripeV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.06), new THREE.MeshBasicMaterial({ color: 0x000000 }));
        stripeV.position.set(-0.6 + sv * 0.6, 1.15, 0.86);
        spine.add(stripeV);
      }
      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.78, 12, 10), bellyMat);
      belly.position.set(0, 0.7, 0.55);
      belly.scale.set(1.05, 0.95, 0.55);
      spine.add(belly);
      const beard = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.85, 8), hairMat);
      beard.position.set(0, 0.05, 0.48);
      beard.rotation.x = Math.PI;
      headGroup.add(beard);
      const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.05), new THREE.MeshBasicMaterial({ color: 0x000000 }));
      eyeL.position.set(-0.18, 0.45, 0.48);
      headGroup.add(eyeL);
      const eyeR = eyeL.clone();
      eyeR.position.x = 0.18;
      headGroup.add(eyeR);
    } else {
      const belly2 = new THREE.Mesh(new THREE.SphereGeometry(0.82, 14, 12), bellyMat);
      belly2.position.set(0, 0.65, 0.5);
      belly2.scale.set(1.1, 1.0, 0.6);
      spine.add(belly2);
      const eyeL2 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), new THREE.MeshBasicMaterial({ color: 0xFFFFFF }));
      eyeL2.position.set(-0.2, 0.45, 0.52);
      headGroup.add(eyeL2);
      const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), new THREE.MeshBasicMaterial({ color: 0x000000 }));
      pupilL.position.set(-0.2, 0.45, 0.62);
      headGroup.add(pupilL);
      const eyeR2 = eyeL2.clone();
      eyeR2.position.x = 0.2;
      headGroup.add(eyeR2);
      const pupilR = pupilL.clone();
      pupilR.position.x = 0.2;
      headGroup.add(pupilR);
    }

    const head = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 12), headMat), 1.04);
    head.position.y = 0.4;
    head.scale.set(1, 1.05, 1);
    headGroup.add(head);

    if (isMorg) {
      const hairLong = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.75, 12), hairMat);
      hairLong.position.set(0, 0.68, -0.05);
      headGroup.add(hairLong);
    } else {
      const hairShort = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
      hairShort.position.set(0, 0.65, -0.02);
      headGroup.add(hairShort);
    }

    function buildArm(side) {
      const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.7, 8), armMat);
      upperArm.position.y = -0.35;
      side.add(upperArm);
      const elbow = new THREE.Group();
      elbow.position.y = -0.7;
      side.add(elbow);
      const foreArm = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.65, 8), armMat);
      foreArm.position.y = -0.32;
      elbow.add(foreArm);
      const wrist = new THREE.Group();
      wrist.position.y = -0.65;
      elbow.add(wrist);
      if (isMorg) {
        if (side === armR) {
          const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 6), new THREE.MeshStandardMaterial({ color: 0x5D4037 }));
          handle.position.y = -0.9;
          wrist.add(handle);
          const hammerHead = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.75), createPrototypeShader(0x8E8E8E, 0x2a2a2a, 7, 0xD2B48C)), 1.05);
          hammerHead.position.y = -1.75;
          wrist.add(hammerHead);
        }
        const fist = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 8), headMat);
        fist.position.y = -0.08;
        wrist.add(fist);
      } else {
        const glove = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), accentMat), 1.05);
        glove.position.y = -0.08;
        wrist.add(glove);
      }
      return { shoulder: side, elbow: elbow, wrist: wrist };
    }
    const armLData = buildArm(armL);
    const armRData = buildArm(armR);

    function buildLeg(side) {
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.85, 8), legMat);
      thigh.position.y = -0.42;
      side.add(thigh);
      const knee = new THREE.Group();
      knee.position.y = -0.85;
      side.add(knee);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.85, 8), legMat);
      shin.position.y = -0.42;
      knee.add(shin);
      return { hip: side, knee: knee };
    }
    const legLData = buildLeg(legL);
    const legRData = buildLeg(legR);

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
    if (!window.__POTATO_MODE) {
      if (origPPA) return origPPA.apply(this, arguments);
      return;
    }
    if (player.isDead || player.consumeState || player.attackTimer > 0.08) return;

    if (potatoComboTimer <= 0) potatoCombo = 0;
    potatoComboTimer = 1.5;

    const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
    const isMorg = (window.__POTATO_FORM === 1);
    const maxCombo = isMorg ? 3 : 5;
    potatoCombo = (potatoCombo % maxCombo) + 1;

    const comboStep = (isMorg && potatoCombo === 3) ? 5 : potatoCombo;
    player.comboStep = comboStep;
    player.attackDuration = PLAYER_COMBO[comboStep].dur;
    player.attackTimer = player.attackDuration;
    player.comboResetTimer = 1.5;
    player.facingYaw = player.camYaw;
    player.vel.x += fwd.x * PLAYER_COMBO[comboStep].lunge;
    player.vel.z += fwd.z * PLAYER_COMBO[comboStep].lunge;

    const rageBoost = (!isMorg && player._tomatoRage > 0) ? 1.45 : 1.0;
    const baseDmg = ((window.__POTATO_FORM === 1) ? 90 : 70) * rageBoost;
    const dmgMult = (potatoCombo === maxCombo) ? 2.5 : 1.0;
    const isFinisher = (potatoCombo === maxCombo);

    const chest = new THREE.Vector3(player.pos.x, player.pos.y + 2.3, player.pos.z);
    const slashColor = (window.__POTATO_FORM === 1) ? 0x8B4513 : 0xFF2200;
    spawnSlashArc(chest.clone().add(fwd.clone().multiplyScalar(1.7)), player.facingYaw, PLAYER_COMBO[comboStep].tilt, slashColor, isMorg ? 4.8 : 4.0, 0.2);

    if (isFinisher) {
      if (isMorg) {
        spawnGroundCrackRing(new THREE.Vector3(player.pos.x + fwd.x * 3.5, 0, player.pos.z + fwd.z * 3.5), 0x8B4513, 10);
        SoundFX.devastator();
        triggerHitstopAndChroma(0.05, 0.6, 1.1);
      } else {
        const fireBall = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 10), new THREE.MeshBasicMaterial({ color: 0xFF2200 }));
        fireBall.position.copy(chest);
        scene.add(fireBall);
        projectiles.push({ mesh: fireBall, vel: new THREE.Vector3(fwd.x * 45, 0, fwd.z * 45), life: 1.5, fromPlayer: true, dmg: baseDmg * 2.5, radius: 3.0 });
        spawnParticles(chest, 0xFF2200, 12);
        triggerHitstopAndChroma(0.05, 0.6, 1.1);
      }
    }
    SoundFX.swing(200 + potatoCombo * 50);

    let hr = isMorg ? 6.0 : 5.0;
    if (isFinisher) hr = isMorg ? 10 : 6.5;
    const hx = player.pos.x + fwd.x * 3.4;
    const hz = player.pos.z + fwd.z * 3.4;

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const dx = e.group.position.x - hx;
      const dz = e.group.position.z - hz;
      if (dx * dx + dz * dz <= (hr + e.radius) * (hr + e.radius)) {
        const finalDmg = baseDmg * dmgMult;
        if (isFinisher && isMorg) e.vel.y = 18;
        damageEnemy(e, finalDmg, new THREE.Vector3(fwd.x * 3, 0, fwd.z * 3), isFinisher ? (isMorg ? '*ТЯЖЁЛЫЙ!*' : '*ОГНЕННЫЙ ШАР!*') : '');
      }
    }
    if (window.__MP && window.__MP.room && window.__MP.remotes) {
      window.__MP.remotes.forEach(function (r, id) {
        const ddx = r.group.position.x - hx;
        const ddz = r.group.position.z - hz;
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
          for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            const d = e.group.position.distanceTo(player.pos);
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
      for (let j = enemies.length - 1; j >= 0; j--) {
        const en = enemies[j];
        const dist = en.group.position.distanceTo(player.pos);
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
      const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
      player.vel.x += fwd.x * 180;
      player.vel.z += fwd.z * 180;
      player.dodgeIframes = 0.6;
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '💥 ТАРАН! 💥', '#8B4513');
      SoundFX.devastator();
      setTimeout(function () {
        for (let i = enemies.length - 1; i >= 0; i--) {
          const e = enemies[i];
          if (e.group.position.distanceTo(player.pos) < 8) {
            e.vel.y = Math.max(e.vel.y, 18);
            damageEnemy(e, 180, fwd.clone().multiplyScalar(8), '*ТАРАН!*');
          }
        }
        checkCarDestruction(player.pos, 8);
      }, 200);
      if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'potato_ram', radius: 8, damage: 180 });
    } else {
      if (player._potatoSauceCd > 0) return;
      player._potatoSauceCd = 3.0;
      const fwd2 = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '🍅 СТРУЯ СОУСА! 🍅', '#FF2200');
      for (let step = 1; step < 16; step++) {
        (function (s) {
          setTimeout(function () {
            const p = player.pos.clone().add(fwd2.clone().multiplyScalar(s));
            spawnParticles(p, 0xCC0000, 4);
            for (let i = enemies.length - 1; i >= 0; i--) {
              const e = enemies[i];
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

  // Клавиша C для Моргенкартошки (Лечение+Броня) и Громтомата (Ярость пламени)
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

  // Клавиша T для Громтомата (Томатный портал за спину врага)
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
      const d = player.pos.distanceTo(enemies[i].group.position);
      if (d < bestD) { bestD = d; bestE = enemies[i]; }
    }
    if (bestE) {
      const enemyYaw = bestE.group.rotation.y || 0;
      const behindOffset = new THREE.Vector3(-Math.sin(enemyYaw) * 3.5, 0, -Math.cos(enemyYaw) * 3.5);
      player.pos.copy(bestE.group.position).add(behindOffset);
      player.facingYaw = enemyYaw + Math.PI;
      player.vel.set(0, 0, 0);
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '🍅 ТОМАТНЫЙ ПОРТАЛ!', '#FF2200');
      spawnParticles(player.pos.clone(), 0xFF2200, 24);
      SoundFX.whip();
      if (window.__MP && window.__MP.room) {
        window.__MP.room.send('mv', { x: player.pos.x, y: player.pos.y, z: player.pos.z, ry: player.facingYaw || 0, anim: 0 });
      }
    } else {
      player._potatoPortalCd = 0;
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), 'НЕТ ЦЕЛЕЙ', '#888888');
    }
  }, true);

  // Переключение формы Картошки/Томата на R и 1 / 2
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
    const badge = document.querySelector('.suit-badge');
    if (badge) badge.innerText = form === 1 ? '🥔 МОРГЕНКАРТОШКА' : '🍅 ГРОМТОМАТ';
    const powers = document.getElementById('ui-powers-desc');
    if (powers) {
      powers.innerHTML = form === 1
        ? '<b>ЛКМ:</b> 3-Hit (3-й AoE) | <b>Q:</b> Прыжок-молот | <b>C:</b> Лечение+броня | <b>F:</b> Таран | <b>R/1/2:</b> Форма'
        : '<b>ЛКМ:</b> 5-Hit (шар огня) | <b>Q:</b> Сверхнова | <b>C:</b> Ярость | <b>F:</b> Струя соуса | <b>T:</b> Портал | <b>R/1/2:</b> Форма';
    }
    heroAuraLight.color.setHex(form === 1 ? 0x8B4513 : 0xFF2200);
    spawnGroundCrackRing(player.pos, form === 1 ? 0x8B4513 : 0xFF2200, 10);
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

  // Карточка выбора Моргенкартошки в меню
  setInterval(function () {
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
  }, 300);

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
      if (Math.random() < 0.25) {
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

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 12. ФРАЗЫ, TOAST-УВЕДОМЛЕНИЯ И ОТКЛЮЧЕНИЕ ГОЛОСА ДЛЯ КАРТОШКИ
  // ═══════════════════════════════════════════════════════════════════════════
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

  console.log("🍌 [PROTOTYPE OVERHAUL v60] Все 5 персонажей, шейдер SSS/Цедра, паркур и боссы активированы.");
})();
