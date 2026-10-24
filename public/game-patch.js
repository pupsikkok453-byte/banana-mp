// ============================================================================
// BANANA INDUSTRIES — GLOBAL PATCH v110 (FULL 18-CHAPTER SAGA & HARDCORE BOSSES)
// • Гарпун Хохлоркови [ПКМ]: дальность увеличена в 1.5 раза (240 м), плавный полёт
// • ХАРДКОРНЫЕ СОЛО-БОССЫ (Защита от ваншотов, Неуязвимые Фазовые Врата 66%/33%,
//   Крио-адаптация, телепорты, 5-ступенчатые механики контр-игры):
//   1) Био-Титан Грейпстасик («Истинная Горечь») — Глава 7
//   2) Абсолютный Жиригорь («Золотой Стандарт») — Глава 10
//   3) Свекольный Титан Горецка («Инквизитор Альянса Корней») — Глава 14
//   4) Монолит Стерильности Горецкий («Доминион Стерильности») — Глава 17
// • Продолжение Сюжета по Частям XV–XXII: Пестицид «Омниобеззараживатель»,
//   Кристаллические Тюрьмы, Рыцарь Остроты, Наноягодный Костюм 2.0 и Сад Мультифрукта
// • 100% сохранение всех 5 персонажей, 3D Крио-Куба [C], шейдера SSS и правок v53–v100
// ============================================================================
(function () {
  'use strict';
  console.log("🍌 [PATCH v110] Загружен: Гарпун 240м (x1.5), Хардкорные Соло-Боссы с Фазовыми Вратами и 18 Глав Саги (Горецка и Монолит Стерильности).");

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 0. УЛУЧШЕННЫЙ ШЕЙДЕР И ГРАФИЧЕСКИЙ ПАЙПЛАЙН (SSS + ЦЕДРА + КОНТРАСТ)
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
        if (!cached._protoV110Upgraded) {
          cached.vertexShader = PROTO_VERTEX_SHADER;
          cached.fragmentShader = PROTO_FRAGMENT_SHADER;
          cached._protoV110Upgraded = true;
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
    mat._protoV110Upgraded = true;
    if (typeof _shaderCache !== 'undefined') _shaderCache.set(k, mat);
    if (typeof _cachedShaderSet !== 'undefined') _cachedShaderSet.add(mat);
    return mat;
  };

  function upgradeGraphicsPipeline() {
    if (typeof _shaderCache !== 'undefined') {
      _shaderCache.forEach((mat) => {
        if (mat && mat.isShaderMaterial && !mat._protoV110Upgraded) {
          mat.vertexShader = PROTO_VERTEX_SHADER;
          mat.fragmentShader = PROTO_FRAGMENT_SHADER;
          mat._protoV110Upgraded = true;
          mat.needsUpdate = true;
        }
      });
    }
    if (typeof scene !== 'undefined') {
      scene.traverse((obj) => {
        if (obj.material && obj.material.isShaderMaterial && obj.material.uniforms && obj.material.uniforms.uCol1) {
          if (!obj.material._protoV110Upgraded) {
            obj.material.vertexShader = PROTO_VERTEX_SHADER;
            obj.material.fragmentShader = PROTO_FRAGMENT_SHADER;
            obj.material._protoV110Upgraded = true;
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
  // ═══ 1. ГАРПУН ХОХЛОРКОВИ: ДАЛЬНОСТЬ X1.5 (240 М) + БЕЗОПАСНОЕ ПРИТЯГИВАНИЕ
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

  window.carrotPrimaryAttack = function () {
    if (player.attackTimer > 0.08) return;
    if (!player.isGrounded && !player.isWallRunning && !player.isFlying && player.pos.y > 4 && CARROT_FORM === 1 && !player._activeGrapple) {
      if (!player.isBulletdropping) {
        player.isBulletdropping = true;
        player.vel.y = -70;
        const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
        player.vel.x = fwd.x * 22;
        player.vel.z = fwd.z * 22;
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
      player.vel.x += fwd.x * 10;
      player.vel.z += fwd.z * 10;
      const st = carrotStats();
      const dmg = st.dmg * 2.8;
      const chest = new THREE.Vector3(player.pos.x, player.pos.y + 4, player.pos.z);
      spawnSlashArc(chest.clone().add(fwd.clone().multiplyScalar(5)), player.facingYaw, player.comboStep % 2 ? 0.4 : -0.4, 0xff5500, 14, 0.42);
      SoundFX.swing(120);
      SoundFX.devastator();
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
      { dur: 0.21, tilt: 0.2,  r: 11.5, lunge: 14, dmg: 1.15, label: '*ХЛЫСТ ЛОЗОЙ!*' },
      { dur: 0.30, tilt: 0,    r: 14.5, lunge: 15, dmg: 1.35, label: '*360° БОТВА!*', spin: true },
      { dur: 0.34, tilt: -0.5, r: 12.5, lunge: 14, dmg: 1.55, label: '*КОРНЕВОЙ АППЕРКОТ!*', launch: true },
      { dur: 0.46, tilt: -1.0, r: 15.5, lunge: 20, dmg: 2.25, label: '*КОРНЕВОЙ ШКВАЛ!*', finisher: true }
    ];
    const C = combos[player.comboStep];
    player.attackDuration = C.dur;
    player.attackTimer = C.dur;
    player.facingYaw = player.camYaw;
    const fwd = new THREE.Vector3(-Math.sin(player.facingYaw), 0, -Math.cos(player.facingYaw));
    player.vel.x += fwd.x * C.lunge;
    player.vel.z += fwd.z * C.lunge;
    const st = carrotStats();
    const dmg = st.dmg * C.dmg;
    const chest = new THREE.Vector3(player.pos.x, player.pos.y + 2, player.pos.z);

    spawnSlashArc(chest.clone().add(fwd.clone().multiplyScalar(3.2)), player.facingYaw, C.tilt, 0x2ecc71, C.r * 0.75, 0.24);
    if (activeTendrils.length < 10) {
      const whipEnd = chest.clone().add(fwd.clone().multiplyScalar(C.r + 2));
      activeTendrils.push(new OrganicTendril3D(scene, chest.clone(), whipEnd, 0x2ecc71, 0.35, 0.25));
    }

    if (C.spin) spawnGroundCrackRing(new THREE.Vector3(player.pos.x, 0, player.pos.z), 0x2ecc71, C.r);
    if (C.finisher) {
      SoundFX.devastator();
      spawnGroundCrackRing(new THREE.Vector3(player.pos.x + fwd.x * 5, 0, player.pos.z + fwd.z * 5), 0x2ecc71, C.r);
    }
    SoundFX.swing(200 + player.comboStep * 50);

    const hx = player.pos.x + fwd.x * (C.spin ? 3 : 6.0);
    const hz = player.pos.z + fwd.z * (C.spin ? 3 : 6.0);
    const hr = C.r;
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

  // ─── ГАРПУН ХОХЛОРКОВИ: ДАЛЬНОСТЬ УВЕЛИЧЕНА В 1.5 РАЗА (160 * 1.5 = 240 МЕТРОВ!) ───
  let _newVineCd = 0;
  const VINE_CD = 0.60;
  const HARPOON_MAX_RANGE = 240; // Увеличено ровно в 1.5 раза по сравнению с v100 (160 -> 240м)!
  const HARPOON_PULL_SPEED = 48; // Плавная, контролируемая скорость притягивания!
  player._activeGrapple = null;

  window.carrotGiantDrillDash = function () {
    if (!CARROT_MODE || CARROT_FORM !== 2 || player.isDead) return;
    if (player._giantDrillCd > 0) {
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 5, 0)), '*БУР КД ' + player._giantDrillCd.toFixed(1) + 'с*', '#ff5500');
      return;
    }
    if (player.carrotStamina < 40) {
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 5, 0)), '*МАЛО СТАМИНЫ!*', '#ff2200');
      return;
    }
    player.carrotStamina -= 40;
    player._giantDrillCd = 4.0;
    SoundFX.devastator();
    SoundFX.boom();
    triggerHitstopAndChroma(0.14, 0.9, 1.4);
    player.facingYaw = player.camYaw;
    const fwd = new THREE.Vector3(-Math.sin(player.facingYaw), 0, -Math.cos(player.facingYaw));
    player.vel.x = fwd.x * 68;
    player.vel.z = fwd.z * 68;
    player.vel.y = 6;
    player.dodgeIframes = 0.65;
    spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 6, 0)), '*МОРКОВНЫЙ БУР!*', '#ff5500');
    const st = carrotStats();
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.group.position.distanceTo(player.pos) < 18) {
        damageEnemy(e, st.dmg * 5.0, fwd.clone().multiplyScalar(10), '*РАЗОРВАНО БУРОМ!*');
      }
    }
    checkCarDestruction(player.pos, 10);
  };

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
    const aimDir = new THREE.Vector3(fwdFlat.x, THREE.MathUtils.clamp(camDir.y + 0.08, -0.35, 0.65), fwdFlat.z).normalize();

    const rc = new THREE.Raycaster();
    const rayStart = origin.clone().addScaledVector(fwdFlat, 1.8);
    rc.set(rayStart, aimDir);
    rc.far = HARPOON_MAX_RANGE;

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

    // Если прямой луч прошел чуть выше крыши, проверяем горизонтально-приподнятый луч до 240м
    if (!validBuildHit) {
      const fallbackDir = new THREE.Vector3(fwdFlat.x, 0.12, fwdFlat.z).normalize();
      rc.set(rayStart, fallbackDir);
      rc.far = HARPOON_MAX_RANGE;
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

    let bestEnemy = null;
    let bestEnemyDist = 180;
    for (let i = 0; i < enemies.length; i++) {
      const en = enemies[i];
      if (!en || !en.group) continue;
      const toE = en.group.position.clone().sub(player.pos);
      const flatDist = Math.hypot(toE.x, toE.z);
      if (flatDist < 3.0 || flatDist > 180) continue;
      const dot = new THREE.Vector3(toE.x, 0, toE.z).normalize().dot(fwdFlat);
      if (dot < 0.78) continue;
      if (flatDist < bestEnemyDist) {
        bestEnemyDist = flatDist;
        bestEnemy = en;
      }
    }

    const buildingDist = validBuildHit ? validBuildHit.distance : Infinity;

    if (bestEnemy && bestEnemyDist <= buildingDist + 4) {
      _newVineCd = VINE_CD;
      const isHeavy = (
        bestEnemy._isBoss || bestEnemy._isStoryConstruct ||
        bestEnemy.type === 'titan' || bestEnemy.type === 'tank' ||
        bestEnemy.type === 'lemon' || bestEnemy.type === 'valkyrie' ||
        bestEnemy.type === 'necromancer' || bestEnemy.type === 'heli'
      );
      const tp = bestEnemy.group.position.clone().add(new THREE.Vector3(0, 1.8, 0));
      SoundFX.whip();

      if (isHeavy) {
        const stopPoint = bestEnemy.group.position.clone().addScaledVector(fwdFlat, -3.8);
        stopPoint.y = Math.max(1.0, bestEnemy.group.position.y + 1.5);
        const dur = Math.min(2.0, Math.max(0.2, bestEnemyDist / HARPOON_PULL_SPEED));
        const vine = new OrganicTendril3D(scene, origin.clone(), tp, 0x2ecc71, 0.42, dur + 0.1);
        activeTendrils.push(vine);

        player._activeGrapple = {
          targetPos: stopPoint,
          initialDir: fwdFlat.clone(),
          speed: HARPOON_PULL_SPEED,
          timer: 0,
          maxDuration: dur,
          enemyRef: bestEnemy,
          tendril: vine
        };
        spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), '*🌿 К БОССУ!*', '#ff2200');
      } else {
        if (activeTendrils.length < 10) {
          activeTendrils.push(new OrganicTendril3D(scene, origin.clone(), tp, 0x2ecc71, 0.42, 0.4));
        }
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

      player._activeGrapple = {
        targetPos: hp,
        initialDir: fwdFlat.clone(),
        speed: HARPOON_PULL_SPEED,
        timer: 0,
        maxDuration: dur,
        enemyRef: null,
        tendril: vine
      };
      player.isGrounded = false;
      player.isBulletdropping = false;
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
    player._activeGrapple = {
      targetPos: shortTarget,
      initialDir: fwdFlat.clone(),
      speed: 44,
      timer: 0,
      maxDuration: 0.42,
      enemyRef: null,
      tendril: vine
    };
    player.facingYaw = player.camYaw;
    SoundFX.swing(420);
  };

  window.addEventListener('mousedown', function (e) {
    if (e.button !== 2) return;
    if (typeof player === 'undefined' || player.isDead) return;
    if (!CARROT_MODE) return;
    if (typeof gameStarted !== 'undefined' && !gameStarted) return;
    if (typeof isLabOpen !== 'undefined' && isLabOpen) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (CARROT_FORM === 1) window.carrotVineHarpoon();
    else window.carrotGiantDrillDash();
  }, true);

  setInterval(() => { if (_newVineCd > 0) _newVineCd = Math.max(0, _newVineCd - 0.05); }, 50);

  const _origRootBind = window.carrotRootBind;
  window.carrotRootBind = function () {
    if (!CARROT_MODE || player.isDead) return;
    player.carrotStamina = Math.max(40, player.carrotStamina);
    player.carrotRootBindCd = 0;
    if (_origRootBind) _origRootBind.apply(this, arguments);
    const bindRadius = CARROT_FORM === 2 ? 48 : 38;
    const st = carrotStats();
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const d = e.group.position.distanceTo(player.pos);
      if (d < bindRadius) {
        e._rooted = e._isBoss ? 1.8 : 4.5;
        if (e.flying && !e._isBoss) {
          e.flying = false;
          e.group.position.y = 0;
          e.vel.y = 0;
          spawnComicPop(e.group.position.clone().add(new THREE.Vector3(0, 2, 0)), '*СБИТ КОРНЯМИ!*', '#2ecc71');
        }
        damageEnemy(e, st.dmg * 1.4, new THREE.Vector3(), '');
      }
    }
    spawnGroundCrackRing(player.pos, 0x2ecc71, bindRadius * 0.85);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 2. ПОКАДРОВОЕ ДВИЖЕНИЕ + КРИСТАЛЛИЧЕСКАЯ ТЮРЬМА СЕГМЕНТАЦИИ ГОРЕЦКИ
  // ═══════════════════════════════════════════════════════════════════════════
  player._crystalPrisonHitsNeeded = 0;
  player._crystalPrisonMesh = null;

  function trapPlayerInSegmentationCrystal(hitsRequired = 4) {
    if (player._crystalPrisonHitsNeeded > 0 || player.isDead) return;
    player._crystalPrisonHitsNeeded = hitsRequired;
    if (player._crystalPrisonMesh && player._crystalPrisonMesh.parent) {
      player._crystalPrisonMesh.parent.remove(player._crystalPrisonMesh);
    }
    const prisonGroup = new THREE.Group();
    const boxMat = new THREE.MeshPhongMaterial({
      color: 0xff00ff,
      emissive: 0x4a0058,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide
    });
    const cube = new THREE.Mesh(new THREE.BoxGeometry(3.4, 4.8, 3.4), boxMat);
    cube.position.y = 2.4;
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(3.45, 4.85, 3.45)),
      new THREE.LineBasicMaterial({ color: 0xffffff })
    );
    edges.position.y = 2.4;
    prisonGroup.add(cube, edges);
    playerGroup.add(prisonGroup);
    player._crystalPrisonMesh = prisonGroup;
    spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 4.5, 0)), '💎 СЕГМЕНТАЦИЯ! ЖМИТЕ [ЛКМ]/[Q] (4 РАЗА) ДЛЯ ПРОРЫВА!', '#ff00ff');
    SoundFX.hit(180, 0.3);
  }

  function registerPlayerBreakoutAttempt() {
    if (player._crystalPrisonHitsNeeded <= 0) return false;
    player._crystalPrisonHitsNeeded--;
    SoundFX.hit(260 + (4 - player._crystalPrisonHitsNeeded) * 80, 0.15);
    if (player._crystalPrisonMesh) {
      player._crystalPrisonMesh.scale.setScalar(0.9 + Math.random() * 0.2);
    }
    if (player._crystalPrisonHitsNeeded <= 0) {
      if (player._crystalPrisonMesh && player._crystalPrisonMesh.parent) {
        player._crystalPrisonMesh.parent.remove(player._crystalPrisonMesh);
      }
      player._crystalPrisonMesh = null;
      SoundFX.boom();
      SoundFX.devastator();
      spawnGroundCrackRing(player.pos, 0x00ff66, 14);
      spawnParticles(player.pos.clone().add(new THREE.Vector3(0, 2, 0)), 0xff00ff, 25);
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 4.5, 0)), '💥 ПЕРЕДОЗИРОВКА ВИТАМИНОВ: ТЮРЬМА РАЗБИТА! 💥', '#00ff66');
      // Взрыв кристаллической тюрьмы наносит урон врагам вокруг!
      for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].group.position.distanceTo(player.pos) < 15) {
          damageEnemy(enemies[i], 650, new THREE.Vector3(0, 12, 0), '*ВЗРЫВ СИНТЕЗА!*');
        }
      }
    } else {
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3.8, 0)), `*ТРЕЩИНА! ЕЩЁ ${player._crystalPrisonHitsNeeded} УДАРА!*`, '#fff200');
    }
    return true;
  }

  if (typeof updatePlayerChoreographyAndCamera === 'function') {
    const _origChoreo = window.updatePlayerChoreographyAndCamera;
    window.updatePlayerChoreographyAndCamera = function (dt, now) {
      const isFrozen = (window.__MP && window.__MP._myRootedUntil > now) || player._crystalPrisonHitsNeeded > 0;
      const savedX = player.pos.x;
      const savedZ = player.pos.z;
      const preY = player.pos.y;

      if (CARROT_MODE) {
        const maxAllowedVel = CARROT_FORM === 2 ? 70 : 52;
        const hVel = Math.hypot(player.vel.x, player.vel.z);
        if (hVel > maxAllowedVel) {
          const scale = maxAllowedVel / hVel;
          player.vel.x *= scale;
          player.vel.z *= scale;
        }
      }

      const hiddenEnemies = [];
      if (preY > 3 || player._activeGrapple) {
        for (let i = 0; i < enemies.length; i++) {
          const en = enemies[i];
          if (en.flying && !player._activeGrapple) continue;
          if (player._activeGrapple || Math.abs(en.group.position.y - preY) > 3) {
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

      if (player.activeModeF && player.suitIdx === 3 && player.character === 'banana' && !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE) {
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

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 3. НАСТОЯЩИЙ 3D ЛЕДЯНОЙ КУБ НА [C] + РАСКОЛ ЛЬДА X2 + КРИО-АДАПТАЦИЯ БОССОВ
  // ═══════════════════════════════════════════════════════════════════════════
  const CRYO_FREEZE_RADIUS = 24;
  const CRYO_FREEZE_DURATION = 5.5;
  const CRYO_BASE_DMG = 95;

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
      opacity: 0.58,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const outerCube = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), iceOuterMat);
    outerCube.position.y = h * 0.5;
    group.add(outerCube);

    const iceInnerMat = new THREE.MeshBasicMaterial({
      color: 0xb8f8ff,
      transparent: true,
      opacity: 0.36,
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
    if (registerPlayerBreakoutAttempt()) return;
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
    player._cryoCd = 7.5;
    player.consumeCd = 7.5;

    createSolidIceCubePrison(player.pos.clone(), 1.5, 1.8);
    player.dodgeIframes = Math.max(player.dodgeIframes, 1.2);
    player.en = player.maxEn;
    player.hp = Math.min(player.maxHp, player.hp + 95);

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
      // Раскол панциря Жиригоря льдом всегда срабатывает!
      if (en._isJirigory && en._fatCarapaceActive) {
        en._fatCarapaceActive = false;
        if (en._carapaceMesh) en._carapaceMesh.visible = false;
        en._rooted = 2.5;
        setBossCastBar('❄️ ЖИРОВОЙ ПАНЦИРЬ РАСКОЛОТ МОРОЗИЛКОЙ! ❄️', 100, true);
        setTimeout(() => setBossCastBar('', 0, false), 1800);
        spawnComicPop(en.group.position.clone().add(new THREE.Vector3(0, 9, 0)), '*❄️ ПАНЦИРЬ РАСКОЛОТ ЛЬДОМ!*', '#00f2fe');
      }

      // Крио-Адаптация Финальных Боссов: нельзя держать босса в вечной заморозке!
      if (en._isPinnacleBoss && en._cryoImmunityTimer > 0) {
        spawnComicPop(en.group.position.clone().add(new THREE.Vector3(0, 8, 0)), `*🛡️ КРИО-АДАПТАЦИЯ БОССА (${Math.ceil(en._cryoImmunityTimer)}с)*`, '#ff9f1a');
        continue;
      }

      if (en._iceCubePrison) {
        clearTimeout(en._iceCubePrison.timerId);
        en._iceCubePrison.cleanup();
      }
      if (en.flying && en.type !== 'valkyrie' && !en._isPinnacleBoss) {
        en.flying = false;
        en.group.position.y = 0;
      }

      const freezeTime = en._isPinnacleBoss ? 2.0 : CRYO_FREEZE_DURATION;
      if (en._isPinnacleBoss) en._cryoImmunityTimer = 11.0;

      const prison = createSolidIceCubePrison(en.group.position.clone(), en.radius || 1.4, freezeTime);
      en._iceCubePrison = prison;
      en.frozen = freezeTime;
      en._rooted = freezeTime;
      en._frozenLockedPos = en.group.position.clone();
      en._telegraphT = 0;
      en._pendingRanged = null;
      en.meleeAnim = 0;
      en.attackCd = Math.max(en.attackCd || 0, freezeTime + 0.5);
      en.vel.set(0, 0, 0);
      en._mpMoving = false;

      if (!en._mpId && typeof damageEnemy === 'function') {
        en._suppressShatterOnFreezeInit = true;
        damageEnemy(en, CRYO_BASE_DMG, new THREE.Vector3(), '*❄ ВМЕРЗ В ЛЁД!*');
        en._suppressShatterOnFreezeInit = false;
      }
    }

    if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'freeze', radius: CRYO_FREEZE_RADIUS });
    if (typeof spawnComicPop === 'function') {
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 5.2, 0)), `❄️ МОРОЗИЛЬНАЯ УСТАНОВКА (${frozenTargets.length})!`, '#00f2fe');
    }
    if (typeof SoundFX !== 'undefined') { SoundFX.devastator(); SoundFX.boom(); }
    if (typeof triggerHitstopAndChroma === 'function') triggerHitstopAndChroma(0.08, 0.65, 1.25);
    updateHUD();
  }, true);

  setInterval(() => {
    if (player._cryoCd > 0) player._cryoCd = Math.max(0, player._cryoCd - 0.1);
  }, 100);

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 4. ДВИЖОК ХАРДКОРНЫХ ФИНАЛЬНЫХ БОССОВ (ЗАЩИТА ОТ ВАНШОТОВ + ФАЗОВЫЕ ВРАТА)
  // ═══════════════════════════════════════════════════════════════════════════
  let _soloBossLock = false;
  const worldHazards = [];
  const shockwaveRings = [];
  const bossPhasePylons = []; // Кристаллы/обелиски неуязвимости фазовых врат босса

  const bossCastEl = document.createElement('div');
  bossCastEl.id = 'boss-cast-bar-wrap';
  bossCastEl.style.cssText =
    'position:fixed;top:186px;left:50%;transform:translateX(-50%);width:510px;z-index:26;' +
    'background:rgba(12,0,22,.96);border:3px solid #000;outline:2px solid #ff0055;padding:6px 12px;' +
    'display:none;text-align:center;box-shadow:0 0 25px rgba(255,0,85,.6),5px 5px 0 #000;pointer-events:none;';
  bossCastEl.innerHTML =
    '<div id="boss-cast-label" style="font-family:Bangers,Impact,sans-serif;font-size:16px;color:#fff200;letter-spacing:1.5px;margin-bottom:4px;">⚠️ АТАКА БОССА ⚠️</div>' +
    '<div style="width:100%;height:12px;background:#1a0010;border:2px solid #000;overflow:hidden;">' +
      '<div id="boss-cast-fill" style="width:0%;height:100%;background:linear-gradient(90deg,#ff0055,#fff200);transition:width .06s linear;"></div>' +
    '</div>';
  document.body.appendChild(bossCastEl);

  function setBossCastBar(label, pct, visible = true) {
    if (!visible) {
      bossCastEl.style.display = 'none';
      return;
    }
    bossCastEl.style.display = 'block';
    const lbl = document.getElementById('boss-cast-label');
    const fill = document.getElementById('boss-cast-fill');
    if (lbl) lbl.innerText = label;
    if (fill) fill.style.width = Math.max(0, Math.min(100, pct)) + '%';
  }

  function clearBossPhasePylons() {
    for (let i = bossPhasePylons.length - 1; i >= 0; i--) {
      const p = bossPhasePylons[i];
      if (p.group && p.group.parent) scene.remove(p.group);
      const idx = enemies.indexOf(p);
      if (idx !== -1) enemies.splice(idx, 1);
    }
    bossPhasePylons.length = 0;
  }

  // Спавн 3 энергетических обелисков вокруг босса на Фазовых Вратах (66% и 33% HP), делающих босса НЕУЯЗВИМЫМ, пока игрок их не разобьет!
  function spawnBossPhaseGatePylons(boss, colorHex, labelText) {
    clearBossPhasePylons();
    boss._invulnGateActive = true;
    const bPos = boss.group.position;

    if (!boss._gateShieldMesh) {
      boss._gateShieldMesh = new THREE.Mesh(
        new THREE.SphereGeometry(6.5, 16, 16),
        new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.42, wireframe: true })
      );
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
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(2.6, 0),
        new THREE.MeshPhongMaterial({ color: colorHex, emissive: colorHex, emissiveIntensity: 0.4, shininess: 100 })
      );
      crystal.position.y = 4.2;
      g.add(crystal);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(2.8, 3.8, 20),
        new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.25;
      g.add(ring);
      scene.add(g);

      const pylonObj = {
        type: 'tank',
        _isPhasePylon: true,
        group: g,
        hp: 1400,
        maxHp: 1400,
        vel: new THREE.Vector3(),
        speed: 0,
        radius: 3.2,
        attackCd: 99,
        dodgeCd: 99,
        flying: false,
        _rooted: 0
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
      if (e._iceCubePrison) {
        clearTimeout(e._iceCubePrison.timerId);
        enCleanupIce(e);
      }
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
    if (e && e._iceCubePrison) {
      clearTimeout(e._iceCubePrison.timerId);
      e._iceCubePrison.cleanup();
      e._iceCubePrison = null;
    }
  }

  const _origSpawnStrikeForce = window.spawnStrikeForce;
  window.spawnStrikeForce = function () {
    if (_soloBossLock || activeBoss) return;
    if (enemies.length >= 6) return;
    if (_origSpawnStrikeForce) return _origSpawnStrikeForce.apply(this, arguments);
  };

  const _origAdvanceWave = window.advanceWave;
  window.advanceWave = function () {
    if (_soloBossLock || activeBoss) return;
    if (_origAdvanceWave) return _origAdvanceWave.apply(this, arguments);
  };

  const _origCheckBossConditions = window.checkBossConditions;
  window.checkBossConditions = function () {
    if (_soloBossLock || (window.StoryCampaign && !window.StoryCampaign.completed)) return;
    if (_origCheckBossConditions) return _origCheckBossConditions.apply(this, arguments);
  };

  function spawnJumpableShockwave(origin, maxRadius, speed, colorHex, dmgVal) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.38, 8, 36),
      new THREE.MeshBasicMaterial({ color: colorHex })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(origin.x, 0.45, origin.z);
    scene.add(ring);
    shockwaveRings.push({
      mesh: ring,
      center: origin.clone(),
      radius: 1.5,
      maxRadius: maxRadius,
      speed: speed,
      dmg: dmgVal,
      hitPlayer: false
    });
  }

  function spawnHazardPool(pos, radius, colorHex, durationSec, isFatSlow = false) {
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 20),
      new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.68, side: THREE.DoubleSide, depthWrite: false })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos.x, 0.14, pos.z);
    scene.add(mesh);
    worldHazards.push({ mesh, pos: pos.clone(), radius, life: durationSec, maxLife: durationSec, isFatSlow });
  }

  // ─── ПЕРЕХВАТ УРОНА ПО ФИНАЛЬНЫМ БОССАМ: DAMAGE CAP (БЕЗ ВАНШОТОВ!) + ФАЗОВЫЕ ВРАТА ───
  const _origDamageEnemyV110 = window.damageEnemy;
  window.damageEnemy = function (en, dmg, knockVec, popText) {
    if (!en) return;

    // Если игрок бьет по фазовому пилону босса — ускоренное разрушение пилона!
    if (en._isPhasePylon) {
      const resPylon = _origDamageEnemyV110.call(this, en, dmg * 1.5, knockVec, '*💥 ПИЛОН ЩИТА!*');
      // Проверяем, все ли пилоны разбиты
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

    if (en._isPinnacleBoss) {
      // 1. Если активны Фазовые Врата (не разбиты 3 кристалла вокруг босса) — босс НЕУЯЗВИМ!
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

      // 2. Механика Панциря Жиригоря
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

      // 3. Механика Алмазного Ядра Свекольного Титана Горецки (уязвимо, когда открыто или от сильных способностей!)
      if (en._isBeetrootTitan && en._beetArmorClosed) {
        if (dmg >= 135 || PEPPER_MODE || LEMON_MODE) {
          en._beetArmorClosed = false;
          if (en._diamondCoreMesh) en._diamondCoreMesh.material.color.setHex(0xff00ff);
          popText = '*💎 АЛМАЗНОЕ ЯДРО ВСКРЫТО («ОСТРЫЙ ЦИТРОН»)!*';
          SoundFX.boom();
        } else {
          dmg *= 0.25;
          popText = '*🛡️ СВЕКОЛЬНАЯ БРОНЯ (ВСКРОЙТЕ ЯДРО ЧЕРЕЗ [Q]/[F])!*';
        }
      }

      // 4. Сбивание ультимейта босса
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

      // 5. ЖЕСТКИЙ ЛИМИТ УРОНА ЗА ОДИН УДАР (DAMAGE CAP):
      // Делим входящий dmg на текущий раздутый player.comboMult * momentumMult, чтобы ни один удар не сносил больше 4.2% HP босса!
      if (en.frozen > 0 && !en._suppressShatterOnFreezeInit && dmg > 15) {
        dmg *= 1.65;
        popText = '*💎 РАСКОЛ ЛЬДА!*';
      }
      const totalEngineMult = Math.max(1, (player.comboMult || 1) * (player.momentumMult || 1) * (player.rageActive > 0 ? 2 : 1) * (player.spicinessActive > 0 ? 1.6 : 1));
      const maxAllowedRawDmg = (en.maxHp * 0.042) / totalEngineMult;
      if (dmg > maxAllowedRawDmg) {
        dmg = maxAllowedRawDmg;
      }
    } else if (en.frozen > 0 && !en._suppressShatterOnFreezeInit && dmg > 15) {
      dmg *= 2.0;
      popText = '*💎 РАСКОЛ ЛЬДА! x2*';
    }

    const res = _origDamageEnemyV110.call(this, en, dmg, knockVec, popText);

    // Проверка срабатывания Фазовых Врат на 66% и 33% HP у Финальных Боссов!
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
      if (en._isPinnacleBoss) {
        _soloBossLock = false;
        clearBossPhasePylons();
        setBossCastBar('', 0, false);
      }
    }
    return res;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 5. ЧЕТЫРЕ СОЛО-БОССА САГИ (ГРЕЙПСТАСИК, ЖИРИГОРЬ, ГОРЕЦКА, МОНОЛИТ)
  // ═══════════════════════════════════════════════════════════════════════════

  // 1) БИО-ТИТАН ГРЕЙПСТАСИК (Глава 7)
  window.spawnSoloFinalGrapestasik = function (x, z) {
    const safePt = getSafeOpenGroundPos(x, z, 8);
    if (activeBoss && activeBoss.group && activeBoss.group.parent) scene.remove(activeBoss.group);

    const g = new THREE.Group();
    g.position.copy(safePt);
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
      neck: neck, spark: spiralCore, ankle: spiralCore,
      hp: 90000, maxHp: 90000, vel: new THREE.Vector3(), speed: 16.5, radius: 5.2,
      attackCd: 1.3, windup: 0, dodgeCd: 99, flying: false,
      phase: 1, chargeCd: 999, lightningCd: 999, _phase2: false, _phase3: false, _rooted: 0,
      _abilityCooldown: 1.8, _abilityRotation: 0, _cryoImmunityTimer: 0
    };
    enemies.push(activeBoss);
    enterSoloBossArena(activeBoss);
    showBossHUD('🍇 СОЛО-БОСС 1/4: БИО-ТИТАН ГРЕЙПСТАСИК 🍇', 'ФАЗОВЫЕ ВРАТА НА 66% И 33% HP! УВОРАЧИВАЙТЕСЬ ОТ ЛУЧЕЙ И СИНГУЛЯРНОСТИ!');
    SoundFX.bossRoar();
    return activeBoss;
  };

  // 2) АБСОЛЮТНЫЙ ЖИРИГОРЬ (Глава 10)
  window.spawnSoloFinalJirigory = function (x, z) {
    const safePt = getSafeOpenGroundPos(x, z, 8);
    if (activeBoss && activeBoss.group && activeBoss.group.parent) scene.remove(activeBoss.group);

    const g = new THREE.Group();
    g.position.copy(safePt);
    g.scale.setScalar(1.25);
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
    const bracelet = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.22, 8, 12), new THREE.MeshStandardMaterial({ color: 0x8b5a2b }));
    bracelet.rotation.x = Math.PI / 2; bracelet.position.y = -4.0; armLPivot.add(bracelet);
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

    const carapaceMesh = new THREE.Mesh(
      new THREE.SphereGeometry(6.2, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff200, transparent: true, opacity: 0.42, wireframe: true })
    );
    carapaceMesh.position.y = 5.5; carapaceMesh.visible = false; g.add(carapaceMesh);

    const legLPivot = new THREE.Group(), legRPivot = new THREE.Group();
    g.add(legLPivot, legRPivot);
    scene.add(g);

    activeBoss = {
      type: 'brawler', _isBoss: true, _isPinnacleBoss: true, _isJirigory: true, _isSoloJirigory: true,
      _fatCarapaceActive: false, _carapaceMesh: carapaceMesh, _crystalGroup: crystalGroup,
      name: 'АБСОЛЮТНЫЙ ЖИРИГОРЬ («ЗОЛОТОЙ СТАНДАРТ»)',
      group: g, armL: armLPivot, armR: armRPivot, legL: legLPivot, legR: legRPivot,
      neck: neck, ankle: belly,
      hp: 105000, maxHp: 105000, vel: new THREE.Vector3(), speed: 15.0, radius: 6.2,
      attackCd: 1.4, meleeCd: 0, meleeAnim: 0, _meleeDur: 0.5,
      dodgeCd: 99, flying: false, phase: 1, _phase2: false, _phase3: false, _rooted: 0,
      _abilityCooldown: 1.8, _abilityRotation: 0, _cryoImmunityTimer: 0
    };
    enemies.push(activeBoss);
    enterSoloBossArena(activeBoss);
    showBossHUD('💛 СОЛО-БОСС 2/4: АБСОЛЮТНЫЙ ЖИРИГОРЬ 💛', 'ПРЫГАЙТЕ ЧЕРЕЗ ЦУНАМИ! ПРОБИВАЙТЕ ЖИРОВОЙ ПАНЦИРЬ НА [C] / [Q] / [F]!');
    SoundFX.bossRoar();
    return activeBoss;
  };

  // 3) СВЕКОЛЬНЫЙ ТИТАН ГОРЕЦКА — ИНКВИЗИТОР АЛЬЯНСА КОРНЕЙ (Глава 14, Части XV–XXII)
  window.spawnSoloBeetrootTitanGoretzka = function (x, z) {
    const safePt = getSafeOpenGroundPos(x, z, 8);
    if (activeBoss && activeBoss.group && activeBoss.group.parent) scene.remove(activeBoss.group);

    const g = new THREE.Group();
    g.position.copy(safePt);
    g.scale.setScalar(1.22);

    const beetMat = createPrototypeShader(0x7a1238, 0x2e0414, 4, 0xff0055);
    const suitRemnantMat = createPrototypeShader(0x1a1a22, 0x08080c, 7, 0xd252ff);
    const leafMat = createPrototypeShader(0x2ecc71, 0x145a32, 8, 0xff0055);

    // Могучий свекольно-бордовый торс с рваным черным пиджаком Инквизитора и Алмазным Ядром в груди!
    const torso = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(3.4, 2.5, 6.4, 12), beetMat), 1.04);
    torso.position.y = 6.6; g.add(torso);

    const diamondCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.35, 0),
      new THREE.MeshPhongMaterial({ color: 0xff00ff, emissive: 0x8800aa, shininess: 140 })
    );
    diamondCore.position.set(0, 6.8, 2.6);
    g.add(diamondCore);

    // Бородатая голова Инквизитора Горецки с пучком свекольной ботвы на макушке (из Частей XV и XXII!)
    const neck = new THREE.Group(); neck.position.set(0, 10.0, 0); g.add(neck);
    const head = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(2.0, 14, 14), beetMat), 1.04);
    head.position.y = 1.6; neck.add(head);
    const beard = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.2, 8), suitRemnantMat);
    beard.rotation.x = Math.PI; beard.position.set(0, 0.5, 1.1); neck.add(beard);

    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.55, 3.2, 5), leafMat);
      leaf.position.set((i - 2.5) * 0.4, 3.8, 0);
      leaf.rotation.z = (i - 2.5) * 0.28;
      neck.add(leaf);
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
      neck: neck, ankle: diamondCore,
      hp: 115000, maxHp: 115000, vel: new THREE.Vector3(), speed: 17.0, radius: 5.5,
      attackCd: 1.3, meleeCd: 0, meleeAnim: 0, _meleeDur: 0.45,
      dodgeCd: 99, flying: false, phase: 1, _phase2: false, _phase3: false, _rooted: 0,
      _abilityCooldown: 1.7, _abilityRotation: 0, _cryoImmunityTimer: 0
    };
    enemies.push(activeBoss);
    enterSoloBossArena(activeBoss);
    showBossHUD('🟣 СОЛО-БОСС 3/4: СВЕКОЛЬНЫЙ ТИТАН ГОРЕЦКА 🟣', 'ВСКРЫВАЙТЕ АЛМАЗ В ГРУДИ СПОСОБНОСТЯМИ [Q]/[F]! ВЫБИВАЙТЕСЬ ИЗ КРИСТАЛЛОВ СЕГМЕНТАЦИИ!');
    SoundFX.bossRoar();
    return activeBoss;
  };

  // 4) МОНОЛИТ СТЕРИЛЬНОСТИ ГОРЕЦКИЙ — ДОМИНИОН СТЕРИЛЬНОСТИ (Финальный Босс Саги, Глава 17)
  window.spawnSoloMonolithOfSterility = function (x, z) {
    const safePt = getSafeOpenGroundPos(x, z, 8);
    if (activeBoss && activeBoss.group && activeBoss.group.parent) scene.remove(activeBoss.group);

    const g = new THREE.Group();
    g.position.copy(safePt);
    g.scale.setScalar(1.3);

    const sterileMat = new THREE.MeshPhongMaterial({
      color: 0xf0f6ff,
      emissive: 0x223850,
      specular: 0xffffff,
      shininess: 160
    });
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.55 });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.0, 6.2, 8), sterileMat);
    torso.position.y = 6.4; g.add(torso);
    const torsoWire = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.1, 6.3, 8), wireMat);
    torsoWire.position.y = 6.4; g.add(torsoWire);

    // Плечевые кристаллические крылья Стерильности (из страниц 17–20 комикса!)
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
      neck: neck, spark: head, ankle: torso,
      hp: 135000, maxHp: 135000, vel: new THREE.Vector3(), speed: 18.5, radius: 5.5,
      attackCd: 1.2, windup: 0, dodgeCd: 99, flying: false,
      phase: 1, chargeCd: 999, lightningCd: 999, _phase2: false, _phase3: false, _rooted: 0,
      _abilityCooldown: 1.5, _abilityRotation: 0, _cryoImmunityTimer: 0
    };
    enemies.push(activeBoss);
    enterSoloBossArena(activeBoss);
    showBossHUD('⚪ ФИНАЛЬНЫЙ БОСС САГИ (4/4): МОНОЛИТ СТЕРИЛЬНОСТИ ⚪', 'УКЛОНЯЙТЕСЬ ОТ ЛУЧЕЙ СТЕРИЛЬНОСТИ И ВОЛН ГЕОМЕТРИЗАЦИИ! РАЗБИВАЙТЕ ОБЕЛИСКИ!');
    SoundFX.bossRoar();
    return activeBoss;
  };

  // ─── АКТИВНЫЙ ИИ ВСЕХ 4 ФИНАЛЬНЫХ СОЛО-БОССОВ ───
  function updateSoloPinnacleBossAI(b, dt, now) {
    if (!b || b.hp <= 0 || !b.group || !b.group.parent) return;
    if (b._cryoImmunityTimer > 0) b._cryoImmunityTimer -= dt;
    if (b.frozen > 0 || b._rooted > 0) return;

    const bPos = b.group.position;
    const hpPct = b.hp / b.maxHp;

    // 1) БИО-ТИТАН ГРЕЙПСТАСИК
    if (b._isSoloGrapestasik) {
      b._abilityCooldown -= dt;
      if (b._abilityCooldown > 0) return;
      const moveIdx = b._abilityRotation % 4;
      b._abilityRotation++;
      b._abilityCooldown = hpPct < 0.5 ? 2.6 : 3.3;

      if (moveIdx === 0) {
        // Громовой Натиск + Рывок прямо в игрока
        const dir = new THREE.Vector3(player.pos.x - bPos.x, 0, player.pos.z - bPos.z).normalize();
        setBossCastBar('⚡ ГРОМОВОЙ НАТИСК («ГРООО-ОО-ОМ! ВУ!») — РЫВОК ВПЕРЕД! ⚡', 100, true);
        setTimeout(() => setBossCastBar('', 0, false), 1000);
        SoundFX.bossRoar();
        b.vel.x = dir.x * 95;
        b.vel.z = dir.z * 95;
        for (let s = 1; s <= 5; s++) {
          setTimeout(() => {
            if (!b.group.parent) return;
            const pt = bPos.clone().addScaledVector(dir, s * 5);
            spawnGroundCrackRing(pt, 0xd252ff, 7);
            if (player.pos.distanceTo(pt) < 6.5) applyDamageToHero(36);
          }, s * 100);
        }
      } else if (moveIdx === 1) {
        // Двойной вращающийся лазер Горечи + прыжковая волна
        setBossCastBar('🔮 СПИРАЛЬНЫЙ ЛУЧ ГОРЕЧИ + ВОЛНА (ПРЫГАЙТЕ!) 🔮', 100, true);
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
        // Сингулярность Истинной Горечи (затягивание + взрыв)
        setBossCastBar('🌀 СИНГУЛЯРНОСТЬ ГОРЕЧИ: ВЫРВИТЕСЬ НА РЫВКЕ ИЗ КРУГА! 🌀', 100, true);
        let ticks = 0;
        const pullInt = setInterval(() => {
          ticks++;
          if (!b.group.parent || ticks >= 16) {
            clearInterval(pullInt);
            setBossCastBar('', 0, false);
            if (b.group.parent && b.frozen <= 0) {
              SoundFX.boom();
              spawnGroundCrackRing(bPos, 0xff0055, 22);
              if (player.pos.distanceTo(bPos) < 19 && player.pos.y < 6) {
                applyDamageToHero(48);
                player.vel.y = 22;
              }
            }
            return;
          }
          if (player.pos.distanceTo(bPos) < 35 && player.pos.distanceTo(bPos) > 4) {
            const pull = bPos.clone().sub(player.pos).normalize();
            player.pos.x += pull.x * 0.68;
            player.pos.z += pull.z * 0.68;
          }
        }, 60);
      } else {
        // Телепорт за спину игрока с сокрушительным ударом!
        const behind = new THREE.Vector3(Math.sin(player.camYaw) * 6, 0, Math.cos(player.camYaw) * 6);
        const tpPos = getSafeOpenGroundPos(player.pos.x + behind.x, player.pos.z + behind.z, 3);
        bPos.copy(tpPos);
        SoundFX.whip();
        spawnGroundCrackRing(bPos, 0xd252ff, 12);
        spawnComicPop(bPos.clone().add(new THREE.Vector3(0, 9, 0)), '*👾 ПРОРЫВ ИЗ ПРОШЛОГО!*', '#d252ff');
        setTimeout(() => {
          if (b.group.parent && player.pos.distanceTo(bPos) < 9.5) {
            applyDamageToHero(38);
          }
        }, 420);
      }
    }

    // 2) АБСОЛЮТНЫЙ ЖИРИГОРЬ
    if (b._isSoloJirigory) {
      if (hpPct <= 0.65 && !b._phase2) {
        b._phase2 = true;
        b.group.scale.setScalar(1.48);
        if (b._crystalGroup) b._crystalGroup.visible = true;
      }
      b._abilityCooldown -= dt;
      if (b._abilityCooldown > 0) return;
      const moveIdx = b._abilityRotation % 4;
      b._abilityRotation++;
      b._abilityCooldown = hpPct < 0.5 ? 2.7 : 3.4;

      if (moveIdx === 0) {
        // Тройное Цунами Золотого Стандарта
        b.vel.y = 26;
        setBossCastBar('💛 ЦУНАМИ ЗОЛОТОГО СТАНДАРТА (ПРЫГАЙТЕ ЧЕРЕЗ 3 ВОЛНЫ!) 💛', 100, true);
        setTimeout(() => {
          setBossCastBar('', 0, false);
          if (!b.group.parent || b.frozen > 0) return;
          SoundFX.boom();
          for (let w = 0; w < 3; w++) {
            setTimeout(() => {
              if (b.group.parent) spawnJumpableShockwave(bPos.clone(), 40, 26, 0xfff200, 35);
            }, w * 380);
          }
        }, 700);
      } else if (moveIdx === 1) {
        // Включение Панциря Поглощения
        b._fatCarapaceActive = true;
        if (b._carapaceMesh) b._carapaceMesh.visible = true;
        setBossCastBar('🛡️ ПАНЦИРЬ ПОГЛОЩЕНИЯ АКТИВЕН! ПРОБЕЙТЕ НА [C] / [Q] / [F]! 🛡️', 100, true);
        setTimeout(() => {
          b._fatCarapaceActive = false;
          if (b._carapaceMesh) b._carapaceMesh.visible = false;
          setBossCastBar('', 0, false);
        }, 4500);
      } else if (moveIdx === 2) {
        // Гейзерный разлом + Залп Жирной Рекристаллизации
        setBossCastBar('❄️💛 ЗАЛП ЖИРНОЙ РЕКРИСТАЛЛИЗАЦИИ + ГЕЙЗЕРЫ! 💛❄️', 100, true);
        setTimeout(() => setBossCastBar('', 0, false), 1200);
        spawnHazardPool(player.pos.clone(), 6.0, 0xe8b828, 7.0, true);
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2;
          const pr = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.4, 6), new THREE.MeshBasicMaterial({ color: 0x00f2fe }));
          pr.rotation.x = Math.PI / 2;
          pr.position.copy(bPos).add(new THREE.Vector3(0, 4.0, 0));
          scene.add(pr);
          projectiles.push({ mesh: pr, vel: new THREE.Vector3(Math.sin(a) * 46, 0, Math.cos(a) * 46), life: 2.5, fromPlayer: false, dmg: 30 });
        }
      } else {
        // Таран Животом со взрывом
        const dir = new THREE.Vector3(player.pos.x - bPos.x, 0, player.pos.z - bPos.z).normalize();
        b.vel.x = dir.x * 88;
        b.vel.z = dir.z * 88;
        SoundFX.devastator();
        spawnComicPop(bPos.clone().add(new THREE.Vector3(0, 10, 0)), '*💛 БА-БАХ! ТАРАН ЗОЛОТОГО СТАНДАРТА!*', '#fff200');
        setTimeout(() => {
          if (b.group.parent && player.pos.distanceTo(bPos) < 11) applyDamageToHero(40);
        }, 350);
      }
    }

    // 3) СВЕКОЛЬНЫЙ ТИТАН ГОРЕЦКА — ИНКВИЗИТОР АЛЬЯНСА КОРНЕЙ (Части XV–XXII)
    if (b._isBeetrootTitan) {
      b._abilityCooldown -= dt;
      if (b._abilityCooldown > 0) return;
      const moveIdx = b._abilityRotation % 4;
      b._abilityRotation++;
      b._abilityCooldown = 2.9;

      if (moveIdx === 0) {
        // СПОСОБНОСТЬ 1: «КРИСТАЛЛИЧЕСКАЯ СЕГМЕНТАЦИЯ БАЛАНСА» (Запирает игрока в розовый кристалл, нужно разбить 4 ударами!)
        setBossCastBar('💎 СЕГМЕНТАЦИЯ БАЛАНСА: ЖМИТЕ [ЛКМ]/[Q] ЧТОБЫ РАЗБИТЬ ТЮРЬМУ! 💎', 100, true);
        trapPlayerInSegmentationCrystal(4);
        // Через 2.2 секунды по месту тюрьмы бьет орбитальный луч Инквизиции!
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
          if (Math.hypot(player.pos.x - strikeSpot.x, player.pos.z - strikeSpot.z) < 6.5) {
            applyDamageToHero(52);
          }
        }, 2100);
      } else if (moveIdx === 1) {
        // СПОСОБНОСТЬ 2: «ПЕСТИЦИД ОМНИОБЕЗЗАРАЖИВАТЕЛЬ» (Фиолетовые газовые облака + закрытие брони)
        b._beetArmorClosed = true;
        if (b._diamondCoreMesh) b._diamondCoreMesh.material.color.setHex(0x330033);
        setBossCastBar('☁️ ПЕСТИЦИД «ОМНИОБЕЗЗАРАЖИВАТЕЛЬ» + БРОНЯ ЗАКРЫТА (ПРОБЕЙТЕ Q/F)! ☁️', 100, true);
        setTimeout(() => setBossCastBar('', 0, false), 1800);
        spawnComicPop(bPos.clone().add(new THREE.Vector3(0, 10, 0)), '*☁️ УПОРЯДОЧИВАНИЕ ДНК В СЕГМЕНТЫ!*', '#ff00ff');
        for (let gIdx = 0; gIdx < 3; gIdx++) {
          const gasPt = player.pos.clone().add(new THREE.Vector3((gIdx - 1) * 8, 0, (Math.random() - 0.5) * 8));
          spawnHazardPool(gasPt, 6.5, 0xaa00ff, 8.0, true);
        }
      } else if (moveIdx === 2) {
        // СПОСОБНОСТЬ 3: «ОРБИТАЛЬНЫЙ СВЕКОЛЬНЫЙ ОБСТРЕЛ» + Прыжковая волна
        setBossCastBar('☄️ ПРИГОВОР ГАЛАКТИКИ: БУРЯКОВЫЙ МЕТЕОРИТНЫЙ ЗАЛП! ☄️', 100, true);
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
        // СПОСОБНОСТЬ 4: «ГНЕВ СВЕКОЛЬНОГО ТИТАНА (ХРУСТ-Л-ХРУСТ!)» — рывок + открытие алмазного ядра на 4 сек!
        b._beetArmorClosed = false;
        if (b._diamondCoreMesh) b._diamondCoreMesh.material.color.setHex(0x00ff66);
        const dir = new THREE.Vector3(player.pos.x - bPos.x, 0, player.pos.z - bPos.z).normalize();
        b.vel.x = dir.x * 92;
        b.vel.z = dir.z * 92;
        SoundFX.bossRoar();
        setBossCastBar('💎 ХРУСТ-Л-ХРУСТ! АЛМАЗНОЕ ЯДРО В ГРУДИ ОТКРЫТО — АТАКУЙТЕ! 💎', 100, true);
        setTimeout(() => setBossCastBar('', 0, false), 2200);
      }
    }

    // 4) МОНОЛИТ СТЕРИЛЬНОСТИ ГОРЕЦКИЙ — ДОМИНИОН СТЕРИЛЬНОСТИ (Глава 17, Финал Саги)
    if (b._isSterilityMonolith) {
      if (hpPct <= 0.45 && !b._phase3) {
        b._phase3 = true;
        activateNanoberry2DivineSynthesis();
      }
      b._abilityCooldown -= dt;
      if (b._abilityCooldown > 0) return;
      const moveIdx = b._abilityRotation % 4;
      b._abilityRotation++;
      b._abilityCooldown = 2.5;

      if (moveIdx === 0) {
        // СПОСОБНОСТЬ 1: «ЛУЧ СТЕРИЛЬНОСТИ (ЗДЕСЬ БОЛЬШЕ НЕТ ХАОСА)» — двойной крестообразный белый лазер!
        setBossCastBar('⚪ ЛУЧ СТЕРИЛЬНОСТИ: «ЗДЕСЬ БОЛЬШЕ НЕТ ХАОСА!» (ПРЫГАЙТЕ!) ⚪', 100, true);
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
          if (!b.group.parent || sw >= 1.0) {
            clearInterval(swInt);
            scene.remove(beamMesh);
            beamGeo.dispose();
            beamMesh.material.dispose();
            return;
          }
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
        // СПОСОБНОСТЬ 2: «ВОЛНА ГЕОМЕТРИЗАЦИИ» — 3 быстрых белых каркасных кольца подряд!
        setBossCastBar('📐 ГЕОМЕТРИЗАЦИЯ РЕАЛЬНОСТИ (ПЕРЕПРЫГИВАЙТЕ БЕЛЫЕ КОЛЬЦА!) 📐', 100, true);
        setTimeout(() => setBossCastBar('', 0, false), 1400);
        for (let w = 0; w < 3; w++) {
          setTimeout(() => {
            if (b.group.parent) spawnJumpableShockwave(bPos.clone(), 44, 29, 0xffffff, 38);
          }, w * 340);
        }
      } else if (moveIdx === 2) {
        // СПОСОБНОСТЬ 3: «ДОМИНИОН СТЕРИЛЬНОСТИ» — блинк за спину + Кристаллическая Клетка
        const behind = new THREE.Vector3(Math.sin(player.camYaw) * 5, 0, Math.cos(player.camYaw) * 5);
        bPos.copy(getSafeOpenGroundPos(player.pos.x + behind.x, player.pos.z + behind.z, 3));
        trapPlayerInSegmentationCrystal(4);
        setBossCastBar('⚪ ДОМИНИОН СТЕРИЛЬНОСТИ: РАЗБЕЙТЕ КЛЕТКУ [ЛКМ]/[Q]! ⚪', 100, true);
        setTimeout(() => setBossCastBar('', 0, false), 1800);
      } else {
        // СПОСОБНОСТЬ 4: «ПЕРВИЧНАЯ ОЧИСТКА» — круговой залп из 16 серебряных кристаллов + гравитационный импульс
        setBossCastBar('⚪ ПЕРВИЧНАЯ ОЧИСТКА: КРИСТАЛЛИЧЕСКИЙ ШТОРМ! ⚪', 100, true);
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

  // Встраиваем обновление Соло-Боссов и Фазовых Пилонов в кадр
  if (typeof updateEnemiesAndVehicles === 'function') {
    const _origUpdateEnemiesV110 = window.updateEnemiesAndVehicles;
    window.updateEnemiesAndVehicles = function (dt, now) {
      if (_soloBossLock && activeBoss) {
        for (let i = enemies.length - 1; i >= 0; i--) {
          const e = enemies[i];
          if (e !== activeBoss && !e._isPhasePylon) {
            if (e.group && e.group.parent) scene.remove(e.group);
            enemies.splice(i, 1);
          }
        }
      }

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
            enCleanupIce(en);
          }
        }
      }

      _origUpdateEnemiesV110.apply(this, arguments);

      if (activeBoss && activeBoss._isPinnacleBoss) {
        updateSoloPinnacleBossAI(activeBoss, dt, now);
      }

      for (let i = 0; i < bossPhasePylons.length; i++) {
        const p = bossPhasePylons[i];
        if (p && p.group) p.group.rotation.y += dt * 2.5;
      }

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
          scene.remove(sw.mesh);
          sw.mesh.geometry.dispose();
          sw.mesh.material.dispose();
          shockwaveRings.splice(i, 1);
        }
      }

      for (let i = worldHazards.length - 1; i >= 0; i--) {
        const h = worldHazards[i];
        h.life -= dt;
        h.mesh.material.opacity = Math.max(0, 0.68 * (h.life / h.maxLife));
        if (player.pos.y < 1.5 && Math.hypot(player.pos.x - h.pos.x, player.pos.z - h.pos.z) < h.radius) {
          if (h.isFatSlow) {
            player.vel.x *= 0.76;
            player.vel.z *= 0.76;
          }
          if (Math.random() < dt * 2.4) applyDamageToHero(8);
        }
        if (h.life <= 0) {
          scene.remove(h.mesh);
          h.mesh.geometry.dispose();
          h.mesh.material.dispose();
          worldHazards.splice(i, 1);
        }
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 6. ПОЛНАЯ 18-ГЛАВНАЯ КОСМИЧЕСКАЯ САГА ПО ВСЕМ СТРАНИЦАМ КОМИКСА
  // ═══════════════════════════════════════════════════════════════════════════
  const StoryCampaign = {
    chapter: 1,
    totalChapters: 18,
    completed: false,
    mode: 'destroy',
    objectives: [],
    defendTimer: 0,
    defendCore: null,
    waypointBeam: null,
    waypointRing: null,
    rodotenancDrones: null,
    epilogueGarden: null,
    targetPos: new THREE.Vector3(0, 0, -35),
    bossEntity: null
  };
  window.StoryCampaign = StoryCampaign;

  const storyHudEl = document.createElement('div');
  storyHudEl.id = 'story-campaign-hud';
  storyHudEl.style.cssText =
    'position:fixed;top:54px;left:50%;transform:translateX(-50%) skewX(-4deg);z-index:25;' +
    'min-width:500px;max-width:760px;background:linear-gradient(135deg,rgba(18,6,28,.95),rgba(40,10,18,.92));' +
    'border:3px solid #000;outline:3px solid #f9ca24;padding:8px 18px;text-align:center;' +
    'box-shadow:0 8px 25px rgba(0,0,0,.85),6px 6px 0 #000;pointer-events:auto;';
  storyHudEl.innerHTML =
    '<div id="story-ch-title" style="font-family:Bangers,Impact,sans-serif;font-size:19px;color:#f9ca24;letter-spacing:1.5px;text-shadow:2px 2px 0 #000;">📖 ГЛАВА 1/18: ПРОБУЖДЕНИЕ ОРАНЖ</div>' +
    '<div id="story-ch-desc" style="font-size:12px;font-weight:900;color:#fff;margin-top:2px;">Уничтожьте 3 Якоря Цитрус Дефенс</div>' +
    '<div id="story-ch-dist" style="font-size:11px;font-weight:900;color:#00f2fe;margin-top:3px;">📍 ДО ЦЕЛИ: 0 М</div>';
  document.body.appendChild(storyHudEl);

  const comicDialogEl = document.createElement('div');
  comicDialogEl.id = 'comic-dialog-panel';
  comicDialogEl.style.cssText =
    'position:fixed;bottom:108px;right:18px;width:455px;z-index:60;background:#fff8e7;' +
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
  function showComicCutsceneBanner(header, speakerIcon, bgHex, text, durationMs = 8000) {
    const hEl = document.getElementById('comic-dlg-header');
    const aEl = document.getElementById('comic-dlg-avatar');
    const tEl = document.getElementById('comic-dlg-text');
    if (hEl) hEl.innerText = header;
    if (aEl) {
      aEl.innerText = speakerIcon;
      aEl.style.background = bgHex;
    }
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
      new THREE.CylinderGeometry(1.2, 1.2, 220, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xf9ca24, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })
    );
    beam.position.y = 110;
    scene.add(beam);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.5, 5.2, 24),
      new THREE.MeshBasicMaterial({ color: 0xf9ca24, side: THREE.DoubleSide, transparent: true, opacity: 0.85, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.25;
    scene.add(ring);

    StoryCampaign.waypointBeam = beam;
    StoryCampaign.waypointRing = ring;
  }

  function spawnStoryObjectiveConstruct(x, y, z, kind) {
    const safePt = getSafeOpenGroundPos(x, z, 6);
    const g = new THREE.Group();
    g.position.set(safePt.x, y, safePt.z);

    if (kind === 'anchor') {
      const pylonMat = createPrototypeShader(0xff7f00, 0x5a2000, 2, 0xfff200);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 4.2, 10, 8), pylonMat);
      base.position.y = 5; g.add(base);
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(2.4, 1), new THREE.MeshBasicMaterial({ color: 0xfff200 }));
      core.position.y = 12.5; g.add(core);
    } else if (kind === 'acid_dreadnought') {
      const orbMat = createPrototypeShader(0xff7f00, 0x9a3800, 4, 0x00ff66);
      const sphere = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(5.5, 16, 16), orbMat), 1.04);
      g.add(sphere);
      const acidVat = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.4, 3.2, 12), new THREE.MeshBasicMaterial({ color: 0x44ffaa }));
      acidVat.position.set(0, -4.5, 0); g.add(acidVat);
    } else if (kind === 'shrekich_server') {
      const srvMat = createPrototypeShader(0x0a2e1c, 0x00ff66, 2, 0x00f2fe);
      const tower = new THREE.Mesh(new THREE.BoxGeometry(3.2, 8.5, 3.2), srvMat);
      tower.position.y = 4.25; g.add(tower);
      const virusCore = new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 12), new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true }));
      virusCore.position.y = 6.5; g.add(virusCore);
      const ring = new THREE.Mesh(new THREE.RingGeometry(12.5, 14.0, 32), new THREE.MeshBasicMaterial({ color: 0x00f2fe, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.25; g.add(ring);
    } else if (kind === 'symbiote_hive') {
      const hiveMat = createPrototypeShader(0x4a1268, 0x180028, 1, 0xff00ff);
      const mound = addInkOutline(new THREE.Mesh(new THREE.ConeGeometry(4.8, 11, 10), hiveMat), 1.04);
      mound.position.y = 5.5; g.add(mound);
    } else if (kind === 'fat_geyser') {
      const fatMat = createPrototypeShader(0xe8b828, 0x8a5800, 4, 0xfff200);
      const crater = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 5.0, 6, 12), fatMat);
      crater.position.y = 3; g.add(crater);
      const fountain = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.2, 14, 10), new THREE.MeshBasicMaterial({ color: 0xfff200, transparent: true, opacity: 0.75 }));
      fountain.position.y = 10; g.add(fountain);
    } else if (kind === 'arctic_pylon') {
      const iceMat = new THREE.MeshPhongMaterial({ color: 0x18c8ff, emissive: 0x053858, transparent: true, opacity: 0.8 });
      const shard = new THREE.Mesh(new THREE.ConeGeometry(3.8, 16, 6), iceMat);
      shard.position.y = 8; g.add(shard);
    } else if (kind === 'cosmic_beet_ship') {
      // Космический Буряк-Корабль Инквизиции Горецки (Часть XV комикса!)
      const beetMat = createPrototypeShader(0x8a1442, 0x380418, 4, 0xff00ff);
      const rootBody = addInkOutline(new THREE.Mesh(new THREE.ConeGeometry(5.0, 9.5, 12), beetMat), 1.04);
      rootBody.rotation.x = Math.PI;
      rootBody.position.y = 8.0;
      g.add(rootBody);
      for (let i = 0; i < 5; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.2, 4.5, 5), createPrototypeShader(0x2ecc71, 0x145a32, 8));
        leaf.position.set((i - 2) * 0.9, 14.2, 0);
        leaf.rotation.z = (i - 2) * 0.25;
        g.add(leaf);
      }
    } else if (kind === 'pesticide_sprayer') {
      // Распылитель секретного пестицида «Омниобеззараживатель» (Часть XXII комикса!)
      const tankMat = createPrototypeShader(0xd4a017, 0x5a3e00, 7, 0xff00ff);
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.2, 8, 10), tankMat);
      tank.position.y = 4; g.add(tank);
      const cloud = new THREE.Mesh(new THREE.SphereGeometry(5.5, 10, 10), new THREE.MeshBasicMaterial({ color: 0xb833ff, transparent: true, opacity: 0.35, wireframe: true }));
      cloud.position.y = 7.5; g.add(cloud);
    } else if (kind === 'sterility_obelisk') {
      // Белый Обелиск Стерильности и Геометризации (Часть «Начало Дистилляции»!)
      const obMat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x334455, shininess: 150 });
      const ob = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 3.2, 18, 4), obMat);
      ob.position.y = 9; g.add(ob);
    }

    scene.add(g);
    const hpVal = kind === 'acid_dreadnought' ? 9500 : (kind === 'shrekich_server' ? 1400 : 3800);
    const constructEnemy = {
      type: kind === 'acid_dreadnought' ? 'heli' : 'tank',
      _isStoryConstruct: true,
      _constructKind: kind,
      group: g,
      hp: hpVal,
      maxHp: hpVal,
      vel: new THREE.Vector3(),
      speed: kind === 'acid_dreadnought' ? 7 : 0,
      radius: kind === 'acid_dreadnought' ? 5.8 : 4.4,
      attackCd: 99,
      dodgeCd: 99,
      flying: kind === 'acid_dreadnought',
      _rooted: 0
    };
    enemies.push(constructEnemy);
    return constructEnemy;
  }

  // Пробуждение «Наноягодного Костюма 2.0: Божественный Синтез» и «Рыцаря Остроты» (Страницы 19–20 комикса!)
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
        b.position.set(Math.cos(a) * 0.25, 2.3 + Math.sin(a) * 0.25, 0.72);
        coreG.add(b);
      }
      const rainbowAura = new THREE.Mesh(
        new THREE.SphereGeometry(2.5, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.25, wireframe: true })
      );
      rainbowAura.position.y = 2.0;
      coreG.add(rainbowAura);
      playerGroup.add(coreG);
      player._nano2CoreGroup = coreG;
    }

    spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 5.5, 0)), '🌈 НАНОЯГОДНЫЙ КОСТЮМ 2.0: БОЖЕСТВЕННЫЙ СИНТЕЗ! 🌈', '#00f2fe');
    SoundFX.devastator();
    triggerHitstopAndChroma(0.18, 1.2, 1.6);
    updateHUD();
  }

  // Постройка финального Сада Мультифрукта со знаком «M» и звёздными фруктами (Эпилог, Страница 21!)
  function buildEpilogueMultifruitGarden() {
    if (StoryCampaign.epilogueGarden) return;
    const g = new THREE.Group();
    g.position.set(0, 0, 0);

    // Древо Синтеза со светящимся знаком «M»
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 4.2, 18, 10),
      createPrototypeShader(0x5a3e22, 0x2a1808, 7, 0xff00ff)
    );
    trunk.position.y = 9; g.add(trunk);

    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(12, 16, 14),
      createPrototypeShader(0x2ecc71, 0x145a32, 8, 0xadff2f)
    );
    canopy.position.y = 20; g.add(canopy);

    // Радужные Звёздные Фрукты вокруг древа и Радужный Кристалл Синтеза
    const starCols = [0xff0055, 0xfff200, 0x00f2fe, 0x2ecc71, 0xff7f00, 0xbb44ff];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const star = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.1, 0),
        new THREE.MeshBasicMaterial({ color: starCols[i % starCols.length] })
      );
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
    if (StoryCampaign.defendCore && StoryCampaign.defendCore.parent) {
      scene.remove(StoryCampaign.defendCore);
      StoryCampaign.defendCore = null;
    }
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
        showComicCutsceneBanner(
          'ЧАСТЬ 5: АПЕЛЬСИНОВАЯ ОРДА', '🍊', '#ff7f00',
          '<b>Грейпстасик:</b> «Я, Грейпстасик, призываю вас! Якоря Цитрус Дефенс... их единственная цель — уничтожение!»'
        );
        [[0, -35], [-55, 18], [55, 18]].forEach(([x, z]) => {
          StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'anchor'));
        });
        break;

      case 2:
        StoryCampaign.mode = 'defend';
        StoryCampaign.defendTimer = 25.0;
        titleEl.innerText = '📖 ГЛАВА 2/18: ОБОРОНА ШТАБА BANANA INDUSTRIES';
        descEl.innerText = 'Удерживайте периметр Ядра Синтеза BI в течение 25 секунд!';
        showComicCutsceneBanner(
          'ОСАДА ШТАБА BI', '🛡️', '#00f2fe',
          '<b>Шрекич ИИ:</b> «Апельсиновые Сентинелы штурмуют площадь! Продержись 25 секунд!»'
        );
        const coreGroup = new THREE.Mesh(new THREE.OctahedronGeometry(3.5, 1), new THREE.MeshBasicMaterial({ color: 0x00ff66, wireframe: true }));
        coreGroup.position.set(0, 4.5, -15);
        scene.add(coreGroup);
        StoryCampaign.defendCore = coreGroup;
        StoryCampaign.targetPos.set(0, 0, -15);
        break;

      case 3:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 3/18: ПЕРЕХВАТ БРОНЕКОНВОЯ CITRUS DEFENSE';
        descEl.innerText = 'Уничтожьте 3 бронетранспортёра APC Цитрус Дефенс!';
        showComicCutsceneBanner(
          'АРМИЯ НА МАРШЕ', '🚜', '#ff9f1a',
          '<b>Orange Captain:</b> «Банан-Индастриз — это вчера! Цитрус Дефенс — это завтра!»'
        );
        [[-45, 70], [0, 85], [45, 70]].forEach(([x, z]) => {
          const pt = getSafeOpenGroundPos(x, z, 6);
          spawnCitrusAPC(pt.x, pt.z);
          StoryCampaign.objectives.push(enemies[enemies.length - 1]);
        });
        break;

      case 4:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 4/18: НОВАЯ УГРОЗА — КИСЛОТНЫЙ ДРЕДНОУТ';
        descEl.innerText = 'Сбейте летающий Кислотный Апельсин-Дредноут над площадью!';
        showComicCutsceneBanner(
          'ЧАСТЬ 6: КИСЛОТНЫЙ ТРИУМФ', '🍇', '#6a1b9a',
          '<b>Грейпстасик:</b> «Банан-Индастриз... весь этот сладкий, мягкий мир... он будет стёрт!»'
        );
        StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(0, 14, 40, 'acid_dreadnought'));
        break;

      case 5:
        StoryCampaign.mode = 'shrekich_servers';
        titleEl.innerText = '📖 ГЛАВА 5/18: ОЧИСТКА СЕРВЕРОВ ШРЕКИЧА ИИ';
        descEl.innerText = 'Разбейте вирусные ядра на 3 серверах Шрекича (атакой или подойдите к ним)!';
        showComicCutsceneBanner(
          'ШРЕКИЧ ИИ ВЗЛОМАН!', '💻', '#00aa44',
          '<b>Шрекич ИИ:</b> «Вирус Грейпстасика заразил 3 моих серверных узла на площади! Сбей вирусные наросты ударом или подойди к ним!»'
        );
        [[0, 32], [-42, 10], [42, 10]].forEach(([x, z]) => {
          StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'shrekich_server'));
        });
        break;

      case 6:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 6/18: ЧАСТЬ XI — ПРОРЫВ СИМБИОТА';
        descEl.innerText = 'Уничтожьте 3 Улья Симбиота Грейпстасика!';
        showComicCutsceneBanner(
          'ПРОРЫВ ИЗ ПРОШЛОГО — КРАШШШШШ!', '🍋', '#f9ca24',
          '<b>Димон Лимон:</b> «Энергетический фон зашкаливает! Из ульев прорывается сам Био-Грейпстасик!»'
        );
        [[0, -40], [-48, -20], [48, -20]].forEach(([x, z]) => {
          StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'symbiote_hive'));
        });
        break;

      case 7:
        StoryCampaign.mode = 'boss';
        titleEl.innerText = '🔥 ГЛАВА 7/18 (СОЛО-БОСС 1/4): БИО-ТИТАН ГРЕЙПСТАСИК';
        descEl.innerText = 'СОЛО-ДУЭЛЬ 1 НА 1: Победите Био-Титана Грейпстасика (разбивайте пилоны на 66% и 33% HP)!';
        showComicCutsceneBanner(
          'СОЛО-ДУЭЛЬ: РОЖДЕНИЕ ГРЕЙПСТАСИКА!', '👾', '#3a1058',
          '<b>Био-Грейпстасик:</b> «Выходим один на один! Ваша "Симбиоз" — это гниль! Я перепрограммирую этот мир на ИСТИННУЮ ГОРЕЧЬ!»',
          9500
        );
        StoryCampaign.bossEntity = window.spawnSoloFinalGrapestasik(0, -25);
        break;

      case 8:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 8/18: ЧАСТЬ XII — ЛИПКОЕ ВТОРЖЕНИЕ';
        descEl.innerText = 'Разрушьте 3 Золотых Гейзера био-полимера Жиригоря!';
        showComicCutsceneBanner(
          'НОВОЕ СОСТОЯНИЕ ВЕЩЕСТВА — *ШЛЮЮ-ЮП*', '💛', '#d4a017',
          '<b>Димон Лимон:</b> «Это не кислота Грейпстасика! Она слишком густая... ВНИМАНИЕ: Обнаружен жировой био-полимер Жиригоря!»'
        );
        [[0, 45], [-45, 25], [45, 25]].forEach(([x, z]) => {
          StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'fat_geyser'));
        });
        break;

      case 9:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 9/18: КАТАЛИЗАТОРЫ ЖИРНОЙ РЕКРИСТАЛЛИЗАЦИИ';
        descEl.innerText = 'Разбейте 3 Арктических Пилона до начала Жирного Армагеддона!';
        showComicCutsceneBanner(
          'ХРУСТЬ-ХРУСТЬ... ОН ИСПОЛЬЗУЕТ ХОЛОД!', '❄️', '#00f2fe',
          '<b>Егорбанан:</b> «Шрекич! Он использует арктический холод как катализатор для жирной рекристаллизации! Уничтожь ледяные пилоны!»'
        );
        [[-45, -35], [45, -35], [0, -65]].forEach(([x, z]) => {
          StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'arctic_pylon'));
        });
        break;

      case 10:
        StoryCampaign.mode = 'boss';
        titleEl.innerText = '🔥 ГЛАВА 10/18 (СОЛО-БОСС 2/4): АБСОЛЮТНЫЙ ЖИРИГОРЬ';
        descEl.innerText = 'СОЛО-ДУЭЛЬ 1 НА 1: Победите Абсолютного Жиригоря (прыгайте через цунами и пробивайте панцирь)!';
        showComicCutsceneBanner(
          'СОЛО-ДУЭЛЬ: СТОЛКНОВЕНИЕ ВЕКА!', '💛', '#e8b828',
          '<b>Абсолютный Жиригорь:</b> «Приветствую, мои сочные! Я Жиригорь, и я выхожу против тебя ОДИН НА ОДИН за своим "Золотым Стандартом"!»',
          9500
        );
        StoryCampaign.bossEntity = window.spawnSoloFinalJirigory(0, 30);
        break;

      case 11:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 11/18: ЧАСТЬ XV — КОСМИЧЕСКАЯ ИНКВИЗИЦИЯ ГОРЕЦКИ';
        descEl.innerText = 'Уничтожьте 3 Космических Буряка-Инквизитора, сброшенных с орбиты!';
        showComicCutsceneBanner(
          'ПРИГОВОР ГАЛАКТИКИ: АЛЬЯНС КОРНЕЙ', '🟣', '#8a1442',
          '<b>Инквизитор Горецка:</b> «Жители этого... *смешанного* мира! Я Горецка, Галактический Инквизитор Элитного Альянса Корней. Вы создали Мультифрукт. Приговор: Тотальное Сегментирование!»',
          9500
        );
        [[0, -35], [-52, 20], [52, 20]].forEach(([x, z]) => {
          StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'cosmic_beet_ship'));
        });
        break;

      case 12:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 12/18: ЧАСТЬ XX — ВТОРЖЕНИЕ В ЦИТАДЕЛЬ ЧИСТОТЫ';
        descEl.innerText = 'Вырвитесь из Кристаллической Сегментации [ЛКМ/Q] и разбейте 3 Ядра Чистоты!';
        showComicCutsceneBanner(
          'КОД «ПРОБОЙНИК» И СЕГМЕНТАЦИЯ БАЛАНСА', '💎', '#ff00ff',
          '<b>Горецка:</b> «Ваше упорство достойно лучшего применения. Вы — системная ошибка!»<br><b>Егорбанан:</b> «Он хочет нас разделить! Кисляк-Резонанс: МАКСИМУМ! Разбиваем кристаллы изнутри!»',
          9000
        );
        trapPlayerInSegmentationCrystal(4);
        [[-40, 50], [40, 50], [0, 80]].forEach(([x, z]) => {
          StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'cosmic_beet_ship'));
        });
        break;

      case 13:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 13/18: ЧАСТЬ XXII — ПЕСТИЦИД «ОМНИОБЕЗЗАРАЖИВАТЕЛЬ»';
        descEl.innerText = 'Уничтожьте 3 Распылителя секретного пестицида Горецки!';
        showComicCutsceneBanner(
          'ОПЕРАЦИЯ «ЧИСТЫЕ СЕГМЕНТЫ»', '☁️', '#6a1b9a',
          '<b>Горецка:</b> «Это СЕКРЕТНЫЙ ПЕСТИЦИД "ОМНИОБЕЗЗАРАЖИВАТЕЛЬ"! Он не просто убивает растения, он *упорядочивает* их ДНК в мёртвые сегменты!»<br><b>Хохлорковь:</b> «Джунгли не погибли! Я чувствую пульс ядра!»',
          9500
        );
        [[0, -45], [-48, -15], [48, -15]].forEach(([x, z]) => {
          StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'pesticide_sprayer'));
        });
        break;

      case 14:
        StoryCampaign.mode = 'boss';
        titleEl.innerText = '🔥 ГЛАВА 14/18 (СОЛО-БОСС 3/4): СВЕКОЛЬНЫЙ ТИТАН ГОРЕЦКА';
        descEl.innerText = 'СОЛО-ДУЭЛЬ 1 НА 1: Вскрывайте Алмаз в груди Титана Горецки и сокрушите его!';
        showComicCutsceneBanner(
          'ГНЕВ СВЕКОЛЬНОГО ТИТАНА — ХРУСТ-Л-ХРУСТ!', '🟣', '#7a1238',
          '<b>Титан Горецка:</b> «Нет! Моя ДНК... она... ВКУСНЕЕТ?! Ваш баланс — это хаос! Я перепишу код этой реальности! Стерильность или смерть!»<br><b>Капитан Перец:</b> «Попробуй-ка на вкус *Острый Цитрон*, Инквизитор! *ФЬЮ-У-УТЬ!*»',
          10000
        );
        StoryCampaign.bossEntity = window.spawnSoloBeetrootTitanGoretzka(0, 25);
        break;

      case 15:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 15/18: НАЧАЛО ДИСТИЛЛЯЦИИ — РОЖДЕНИЕ МОНОЛИТА';
        descEl.innerText = 'Разрушьте 4 Белых Обелиска Первичной Очистки и Геометризации!';
        showComicCutsceneBanner(
          'ЗАБЫТЫЙ ОСТАТОК — УЛЬТИМАТУМ СТЕРИЛЬНОСТИ', '⚪', '#3a4a5a',
          '<b>Монолит Стерильности:</b> «Ты думал, ты победил, Банан? Твой "Синтез" лишь сжал меня... сделал меня чище. Я пришел, чтобы выключить звук. Я подарю вам покой Дистилляции!»',
          9500
        );
        [[-45, 45], [45, 45], [-45, -45], [45, -45]].forEach(([x, z]) => {
          StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'sterility_obelisk'));
        });
        break;

      case 16:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 16/18: ПРОБУЖДЕНИЕ НАНОЯГОД 2.0 И РЫЦАРЯ ОСТРОТЫ';
        descEl.innerText = 'Активирован Наноягодный Костюм 2.0! Разбейте 3 Ядра Доминиона Стерильности!';
        showComicCutsceneBanner(
          'ОШИБКА 101: СИСТЕМА ЭВОЛЮЦИОНИРУЕТ!', '🌈', '#ff0055',
          '<b>Капитан Перец:</b> «Моё сердце полно жара! *БЗАМС!* *ЗБОУМ!* Пустота тает!»<br><b>Егорбанан:</b> «Горецкий не понимает... Система не сбоит. Она ЭВОЛЮЦИОНИРУЕТ! Наноягодный Костюм 2.0 — Режим: «СИНТЕЗ!!!»',
          10000
        );
        activateNanoberry2DivineSynthesis();
        [[0, 55], [-42, 20], [42, 20]].forEach(([x, z]) => {
          StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'sterility_obelisk'));
        });
        break;

      case 17:
        StoryCampaign.mode = 'boss';
        titleEl.innerText = '🔥 ГРАНД-ФИНАЛ САГИ (СОЛО-БОСС 4/4): МОНОЛИТ СТЕРИЛЬНОСТИ';
        descEl.innerText = 'СОЛО-ДУЭЛЬ 1 НА 1: Сокрушите Монолит Стерильности Волной Ионизации и спасите Вкус!';
        showComicCutsceneBanner(
          'ДОМИНИОН СТЕРИЛЬНОСТИ ПРОТИВ ТОРЖЕСТВА СИНТЕЗА!', '⚪', '#1a2a3a',
          '<b>Монолит Стерильности:</b> «Здесь больше нет хаоса. Совершенный порядок: ДОМИНИОН СТЕРИЛЬНОСТИ!»<br><b>Егорбанан (Наноягода 2.0):</b> «Я поглотил Остроту, Жизнь и Вкус! И я возвращаю их вам, Горецкий! ВОЛНА ИОНИЗАЦИИ!»',
          10500
        );
        activateNanoberry2DivineSynthesis();
        StoryCampaign.bossEntity = window.spawnSoloMonolithOfSterility(0, -25);
        break;

      default:
        StoryCampaign.completed = true;
        _soloBossLock = false;
        buildEpilogueMultifruitGarden();
        titleEl.innerText = '🏆 ГРАНД-ФИНАЛ САГИ: «СТАТУС: БАЛАНС. ЖИЗНЬ ПРОРОСЛА.»';
        descEl.innerText = 'Упорядоченность мертва, но Вкус вечен! Все 18 глав и 4 Соло-Босса пройдены! (+30 000 EP)';
        document.getElementById('story-ch-dist').innerText = '🌳 Древо Мультифрукта «M» расцвело в центре города! [Нажмите N для новой игры+]';
        if (StoryCampaign.waypointBeam) StoryCampaign.waypointBeam.visible = false;
        if (StoryCampaign.waypointRing) StoryCampaign.waypointRing.visible = false;
        player.ep += 30000;
        player.score += 300000;
        updateHUD();
        updateScoreDisplay();
        showComicCutsceneBanner(
          'ФИНАЛ МИРА ПОСЛЕ ПОБЕДЫ (THE END OF THE SAGA)', '🌳', '#2ecc71',
          '<b>Егорбанан, Димон Лимон, Капитан Перец и Хохлорковь:</b> «Наш Единый Баланс — это начало нашей Мультифрукт-Галактики. Упорядоченность мертва. Но Вкус... он вечен!»<br><b>Шрекич ИИ:</b> «СТАТУС: БАЛАНС. ЖИЗНЬ ПРОРОСЛА.»',
          14000
        );
        break;
    }
  }

  setTimeout(() => {
    startStoryChapter(1);
  }, 900);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyN' && gameStarted && !player.isDead) {
      if (StoryCampaign.completed) startStoryChapter(1);
      else startStoryChapter(StoryCampaign.chapter + 1);
    }
  });

  // Радужная Волна Ионизации при атаке в режиме Наноягодного Костюма 2.0 / Протокола Титана
  const _origPPATitan = window.performPrimaryAttack;
  window.performPrimaryAttack = function () {
    if (registerPlayerBreakoutAttempt()) return;
    if (_origPPATitan) _origPPATitan.apply(this, arguments);
    if (player._multifruitTitanActive) {
      const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
      const chest = player.pos.clone().add(new THREE.Vector3(0, 2.3, 0));
      spawnSlashArc(chest.clone().add(fwd.clone().multiplyScalar(3)), player.facingYaw, 0, 0x7cfc00, 9.0, 0.25);
      spawnSlashArc(chest.clone().add(fwd.clone().multiplyScalar(4.2)), player.facingYaw, 0.3, 0xff00ff, 10.0, 0.28);
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.group.position.distanceTo(player.pos) <= 16) {
          damageEnemy(e, 340, fwd.clone().multiplyScalar(6), '*🌈 ВОЛНА ИОНИЗАЦИИ!*');
        }
      }
    }
  };

  const _origDevBreakout = window.performDevastator;
  window.performDevastator = function () {
    registerPlayerBreakoutAttempt();
    if (_origDevBreakout) return _origDevBreakout.apply(this, arguments);
  };

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
        player.ep += 450;
        player.score += 7000;
        updateHUD();
        updateScoreDisplay();
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
        if (flatDist < 15.0) {
          damageEnemy(srv, 95, new THREE.Vector3(), '*💻 ОЧИСТКА ВИРУСА!*');
        }
      }
      StoryCampaign.objectives = StoryCampaign.objectives.filter((obj) => obj && obj.hp > 0 && enemies.indexOf(obj) !== -1);
      if (StoryCampaign.objectives.length === 0) {
        SoundFX.devastator();
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 4, 0)), '💻 СЕРВЕРЫ ШРЕКИЧА ОЧИЩЕНЫ!', '#00ff66');
        player.ep += 500;
        startStoryChapter(ch + 1);
        return;
      }
      StoryCampaign.targetPos.copy(StoryCampaign.objectives[0].group.position);
      if (descEl) descEl.innerText = `Очистите серверы Шрекича ударом или подойдите к ним (Осталось: ${StoryCampaign.objectives.length})`;
    } else if (StoryCampaign.mode === 'defend') {
      StoryCampaign.defendTimer -= 0.1;
      if (StoryCampaign.defendCore) StoryCampaign.defendCore.rotation.y += 0.08;
      if (enemies.length < 4) {
        const a = Math.random() * Math.PI * 2;
        spawnCitrusSoldier(Math.cos(a) * 24, -15 + Math.sin(a) * 24, 'mandarin');
      }
      if (descEl) descEl.innerText = `Обороняйте Ядро Синтеза BI! Осталось: ${Math.max(0, StoryCampaign.defendTimer).toFixed(1)} сек`;
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
        player.ep += 2000;
        player.score += 35000;
        updateHUD();
        updateScoreDisplay();
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
      if (distEl) distEl.innerText = `📍 ДО ЦЕЛИ МИССИИ: ${distMeters} М | [N] — СЛЕДУЮЩАЯ ГЛАВА`;
    }
  }, 100);

  if (typeof drawMinimap === 'function') {
    const _origDrawMinimap = window.drawMinimap;
    window.drawMinimap = function () {
      _origDrawMinimap.apply(this, arguments);
      if (StoryCampaign.completed || !StoryCampaign.targetPos) return;
      const c = document.getElementById('minimap-canvas');
      if (!c) return;
      const ctx = c.getContext('2d');
      const wideView = player.momentum > 0.5 || player.isFlying || player.isBulletdropping;
      const sc = wideView ? 0.10 : 0.16;
      const cx = 70, cy = 70;
      let tx = cx + (StoryCampaign.targetPos.x - player.pos.x) * sc;
      let tz = cy + (StoryCampaign.targetPos.z - player.pos.z) * sc;
      const dx = tx - cx, dz = tz - cy;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 58) {
        tx = cx + (dx / dist) * 58;
        tz = cy + (dz / dist) * 58;
      }
      ctx.save();
      ctx.fillStyle = '#fff200';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tx, tz, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 7. 100% СОХРАНЕНИЕ ВСЕХ СИСТЕМ v53 (ДЕНЬ/НОЧЬ, ЩИТ, ШРЕКИЧ, КАРТОШКА)
  // ═══════════════════════════════════════════════════════════════════════════
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

  const origDamageToHero = window.applyDamageToHero;
  window.applyDamageToHero = function (dmg) {
    if (window.__POTATO_MODE && window.__POTATO_FORM === 1 && player._potatoArmor > 0) {
      dmg = Math.floor(dmg * 0.5);
    }
    if (player._multifruitTitanActive) {
      dmg = Math.floor(dmg * 0.55);
    }
    if (player.activeModeF && player.suitIdx === 3 && player.character === 'banana' && !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE) {
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
  }

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
            damageEnemy(enemies[i], 3000, new THREE.Vector3(0, 15, 0), '*СИНТЕЗ!*');
          }
        }
        if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'nano_ult', radius: 50 });
        if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 5, 0)), '⚡ БОЖЕСТВЕННЫЙ СИНТЕЗ! ⚡', '#00f2fe');
        if (typeof SoundFX !== 'undefined') { SoundFX.devastator(); SoundFX.boom(); }
      }
    }
  }, 100);

  player._suitCdMap = player._suitCdMap || [0, 0, 0, 0, 0];
  const origTriggerF = window.triggerUniqueAbilityF;
  window.triggerUniqueAbilityF = function () {
    registerPlayerBreakoutAttempt();
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

  // ─── 5-Й ПЕРСОНАЖ: МОРГЕНКАРТОШКА & ГРОМТОМАТ + TOAST И ФРАЗЫ ───
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
    var pelvis = new THREE.Group(); pelvis.position.y = 1.65; g.add(pelvis);
    var spine = new THREE.Group(); pelvis.add(spine);
    var neck = new THREE.Group(); neck.position.y = 1.95; spine.add(neck);
    var headGroup = new THREE.Group(); headGroup.position.y = 0.4; neck.add(headGroup);
    var armL = new THREE.Group(); armL.position.set(-1.0, 1.55, 0); spine.add(armL);
    var armR = new THREE.Group(); armR.position.set(1.0, 1.55, 0); spine.add(armR);
    var legL = new THREE.Group(); legL.position.set(-0.35, 0, 0); pelvis.add(legL);
    var legR = new THREE.Group(); legR.position.set(0.35, 0, 0); pelvis.add(legR);

    var isMorg = (form === 1);
    var bodyMat = isMorg ? new THREE.MeshStandardMaterial({ color: 0x8B0000 }) : new THREE.MeshStandardMaterial({ color: 0x4A0010 });
    var bellyMat = isMorg ? new THREE.MeshStandardMaterial({ color: 0xD2B48C }) : new THREE.MeshStandardMaterial({ color: 0xFF2200 });
    var headMat = isMorg ? new THREE.MeshStandardMaterial({ color: 0xE8C4A0 }) : new THREE.MeshStandardMaterial({ color: 0xFF0000 });
    var hairMat = new THREE.MeshStandardMaterial({ color: isMorg ? 0x2A1A0F : 0x0A0A0A });
    var armMat = bodyMat;
    var legMat = new THREE.MeshStandardMaterial({ color: isMorg ? 0x2A2A2A : 0x1A1A1A });
    var accentMat = isMorg ? new THREE.MeshBasicMaterial({ color: 0x3E2723 }) : new THREE.MeshStandardMaterial({ color: 0x00FF00 });

    var torso = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 1.5, 10), bodyMat);
    torso.position.y = 1.1; spine.add(torso);

    if (isMorg) {
      for (var s = 0; s < 4; s++) {
        var stripeH = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: 0x000000 }));
        stripeH.position.set(0, 0.55 + s * 0.35, 0.86); spine.add(stripeH);
      }
      for (var sv = 0; sv < 3; sv++) {
        var stripeV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.06), new THREE.MeshBasicMaterial({ color: 0x000000 }));
        stripeV.position.set(-0.6 + sv * 0.6, 1.15, 0.86); spine.add(stripeV);
      }
      var belly = new THREE.Mesh(new THREE.SphereGeometry(0.78, 12, 10), bellyMat);
      belly.position.set(0, 0.7, 0.55); belly.scale.set(1.05, 0.95, 0.55); spine.add(belly);
      var beard = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.85, 8), hairMat);
      beard.position.set(0, 0.05, 0.48); beard.rotation.x = Math.PI; headGroup.add(beard);
      var eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.05), new THREE.MeshBasicMaterial({ color: 0x000000 }));
      eyeL.position.set(-0.18, 0.45, 0.48); headGroup.add(eyeL);
      var eyeR = eyeL.clone(); eyeR.position.x = 0.18; headGroup.add(eyeR);
    } else {
      var belly2 = new THREE.Mesh(new THREE.SphereGeometry(0.82, 14, 12), bellyMat);
      belly2.position.set(0, 0.65, 0.5); belly2.scale.set(1.1, 1.0, 0.6); spine.add(belly2);
      var eyeL2 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), new THREE.MeshBasicMaterial({ color: 0xFFFFFF }));
      eyeL2.position.set(-0.2, 0.45, 0.52); headGroup.add(eyeL2);
      var pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), new THREE.MeshBasicMaterial({ color: 0x000000 }));
      pupilL.position.set(-0.2, 0.45, 0.62); headGroup.add(pupilL);
      var eyeR2 = eyeL2.clone(); eyeR2.position.x = 0.2; headGroup.add(eyeR2);
      var pupilR = pupilL.clone(); pupilR.position.x = 0.2; headGroup.add(pupilR);
    }

    var head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 12), headMat);
    head.position.y = 0.4; head.scale.set(1, 1.05, 1); headGroup.add(head);

    if (isMorg) {
      var hairLong = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.75, 12), hairMat);
      hairLong.position.set(0, 0.68, -0.05); headGroup.add(hairLong);
    } else {
      var hairShort = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
      hairShort.position.set(0, 0.65, -0.02); headGroup.add(hairShort);
    }

    function buildArm(side) {
      var upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.7, 8), armMat);
      upperArm.position.y = -0.35; side.add(upperArm);
      var elbow = new THREE.Group(); elbow.position.y = -0.7; side.add(elbow);
      var foreArm = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.65, 8), armMat);
      foreArm.position.y = -0.32; elbow.add(foreArm);
      var wrist = new THREE.Group(); wrist.position.y = -0.65; elbow.add(wrist);
      if (isMorg) {
        if (side === armR) {
          var handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 6), new THREE.MeshStandardMaterial({ color: 0x5D4037 }));
          handle.position.y = -0.9; wrist.add(handle);
          var hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.75), new THREE.MeshStandardMaterial({ color: 0x8E8E8E }));
          hammerHead.position.y = -1.75; wrist.add(hammerHead);
        }
        var fist = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 8), headMat);
        fist.position.y = -0.08; wrist.add(fist);
      } else {
        var glove = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), accentMat);
        glove.position.y = -0.08; wrist.add(glove);
      }
      return { shoulder: side, elbow: elbow, wrist: wrist };
    }
    var armLData = buildArm(armL), armRData = buildArm(armR);

    function buildLeg(side) {
      var thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.85, 8), legMat);
      thigh.position.y = -0.42; side.add(thigh);
      var knee = new THREE.Group(); knee.position.y = -0.85; side.add(knee);
      var shin = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.85, 8), legMat);
      shin.position.y = -0.42; knee.add(shin);
      return { hip: side, knee: knee };
    }
    var legLData = buildLeg(legL), legRData = buildLeg(legR);

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
        fireBall.position.copy(chest); scene.add(fireBall);
        projectiles.push({ mesh: fireBall, vel: new THREE.Vector3(fwd.x * 45, 0, fwd.z * 45), life: 1.5, fromPlayer: true, dmg: baseDmg * 2.5, radius: 3.0 });
        spawnParticles(chest, 0xFF2200, 12);
        triggerHitstopAndChroma(0.05, 0.6, 1.1);
      }
    }
    SoundFX.swing(200 + potatoCombo * 50);

    var hr = isMorg ? 6.0 : 5.0;
    if (isFinisher) hr = isMorg ? 10 : 6.5;
    var hx = player.pos.x + fwd.x * 3.4, hz = player.pos.z + fwd.z * 3.4;

    for (var i = enemies.length - 1; i >= 0; i--) {
      var e = enemies[i];
      var dx = e.group.position.x - hx, dz = e.group.position.z - hz;
      if (dx * dx + dz * dz <= (hr + e.radius) * (hr + e.radius)) {
        var finalDmg = baseDmg * dmgMult;
        if (isFinisher && isMorg) e.vel.y = 18;
        damageEnemy(e, finalDmg, new THREE.Vector3(fwd.x * 3, 0, fwd.z * 3), isFinisher ? (isMorg ? '*ТЯЖЁЛЫЙ!*' : '*ОГНЕННЫЙ ШАР!*') : '');
      }
    }
    if (typeof checkCarDestruction === 'function') checkCarDestruction(new THREE.Vector3(hx, 0, hz), hr);
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
          SoundFX.boom(); SoundFX.devastator();
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
        }, 300);
      }, 400);
    } else {
      if (player._potatoNovaCd > 0) return;
      player._potatoNovaCd = 5.0;
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '🔥 СВЕРХНОВА! 🔥', '#FF2200');
      SoundFX.devastator(); SoundFX.boom();
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
      player.vel.x += fwd.x * 95;
      player.vel.z += fwd.z * 95;
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
    }
  };

  window.addEventListener('keydown', function (e) {
    if (e.code !== 'KeyC' || !window.__POTATO_MODE) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
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
    } else {
      if (player._potatoRageCd > 0) return;
      player._potatoRageCd = 12.0;
      player._tomatoRage = 6.0;
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '🔥 ИСПЫТАНИЕ ПЛАМЕНЕМ', '#FF4400');
      spawnParticles(player.pos.clone().add(new THREE.Vector3(0, 2, 0)), 0xFF4400, 25);
      SoundFX.devastator();
    }
  }, true);

  window.addEventListener('keydown', function (e) {
    if (e.code !== 'KeyT' || !window.__POTATO_MODE) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if (player.isDead || window.__POTATO_FORM !== 2) return;
    if (player._potatoPortalCd > 0) return;
    player._potatoPortalCd = 30.0;
    let bestE = null, bestD = 9999;
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
    } else {
      player._potatoPortalCd = 0;
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), 'НЕТ ЦЕЛЕЙ', '#888888');
    }
  }, true);

  window.addEventListener('keydown', function (e) {
    if (e.code !== 'KeyR' || !window.__POTATO_MODE) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if (player.isDead) return;
    switchPotatoForm(window.__POTATO_FORM === 1 ? 2 : 1);
  }, true);

  window.addEventListener('keydown', function (e) {
    if (!window.__POTATO_MODE) return;
    if (e.code === 'Digit1' || e.code === 'Numpad1') {
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      if (window.__POTATO_FORM !== 1) switchPotatoForm(1);
    }
    if (e.code === 'Digit2' || e.code === 'Numpad2') {
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      if (window.__POTATO_FORM !== 2) switchPotatoForm(2);
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
    PEPPER_MODE = false; CARROT_MODE = false; LEMON_MODE = false; CARROT_FORM = 1;
    playerGroup.scale.set(1, 1, 1);
    player.maxHp = 800; player.hp = 800; player.maxEn = 300; player.en = 300;
    if (typeof rebuildHeroMesh === 'function') rebuildHeroMesh();
    const badge = document.querySelector('.suit-badge');
    if (badge) badge.innerText = '🥔 МОРГЕНКАРТОШКА';
    const rageLbl = document.querySelector('.rage-wrap .bar-label span');
    if (rageLbl) rageLbl.innerText = '🛡️ БРОНЯ / ЯРОСТЬ';
    const powers = document.getElementById('ui-powers-desc');
    if (powers) powers.innerHTML = '<b>ЛКМ:</b> 3-Hit (3-й AoE) | <b>Q:</b> Прыжок-молот | <b>C:</b> Лечение+броня | <b>F:</b> Таран | <b>R:</b> Форма';
    if (typeof Companion !== 'undefined' && Companion.group) Companion.group.visible = false;
    const hotbar = document.getElementById('suit-hotbar');
    if (hotbar) hotbar.style.display = 'none';
    heroAuraLight.color.setHex(0x8B4513);
    if (typeof window.updateHUD === 'function') window.updateHUD();
    if (typeof window.updateScoreDisplay === 'function') window.updateScoreDisplay();
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
      return;
    }
    if (origStartGameSession) return origStartGameSession.apply(this, arguments);
  };

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
  }, 100);

  console.log("🍌 [PATCH v110] Готово: Гарпун 240м (x1.5), 18 Глав Саги и 4 Хардкорных Соло-Босса с Фазовыми Вратами активны.");
})();
