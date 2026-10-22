// ============================================================================
// BANANA INDUSTRIES — GLOBAL PATCH v80 (TRUE GRAPPLE & 10-CHAPTER COMIC STORY)
// • ИСПРАВЛЕН ЛИАНОВЫЙ ГАРПУН [ПКМ]: скоростной 3D-привод притягивания (320 м/с)
//   прямо к фасадам и крышам зданий на дистанции до 2250 м (без подкидывания вверх!)
// • ПОЛНАЯ СЮЖЕТНАЯ КАМПАНИЯ ИЗ 10 ГЛАВ по Частям 5, 6, 11 и 12 комикса:
//   - Акт I (Гл. 1–5): Апельсиновая Орда, Кислотный Дредноут, Меха-Грейпстасик
//   - Акт II (Гл. 6–7): Прорыв Био-Грейпстасика, КРА-КА-БУМ Возвращение Хохлоркови
//     с корневыми дубинами и треугольник дронов «Код Родотенанц-Восстановление»
//   - Акт III (Гл. 8–10): Липкое Вторжение Жиригоря («Золотой Стандарт»),
//     Кислотная Коррозия, Жирная Рекристаллизация и Протокол «Титан Мультифрукта»
// • Настоящий 3D Ледяной Монолит на [C] + Раскол льда (x2.0 урона) + Маскировка
// • 100% сохранение всех 5 персонажей, костюмов, форм, фраз и фиксов v53/v60/v70
// ============================================================================
(function () {
  'use strict';
  console.log("🍌 [PATCH v80] Загружен: Векторный Гарпун 2250м, 10 глав сюжета (Грейпстасик + Жиригорь + Титан Мультифрукта), 3D Крио-Куб.");

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
        if (!cached._protoV80Upgraded) {
          cached.vertexShader = PROTO_VERTEX_SHADER;
          cached.fragmentShader = PROTO_FRAGMENT_SHADER;
          cached._protoV80Upgraded = true;
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
    mat._protoV80Upgraded = true;
    if (typeof _shaderCache !== 'undefined') _shaderCache.set(k, mat);
    if (typeof _cachedShaderSet !== 'undefined') _cachedShaderSet.add(mat);
    return mat;
  };

  function upgradeGraphicsPipeline() {
    if (typeof _shaderCache !== 'undefined') {
      _shaderCache.forEach((mat) => {
        if (mat && mat.isShaderMaterial && !mat._protoV80Upgraded) {
          mat.vertexShader = PROTO_VERTEX_SHADER;
          mat.fragmentShader = PROTO_FRAGMENT_SHADER;
          mat._protoV80Upgraded = true;
          mat.needsUpdate = true;
        }
      });
    }
    if (typeof scene !== 'undefined') {
      scene.traverse((obj) => {
        if (obj.material && obj.material.isShaderMaterial && obj.material.uniforms && obj.material.uniforms.uCol1) {
          if (!obj.material._protoV80Upgraded) {
            obj.material.vertexShader = PROTO_VERTEX_SHADER;
            obj.material.fragmentShader = PROTO_FRAGMENT_SHADER;
            obj.material._protoV80Upgraded = true;
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
    if (typeof rebuildHeroMesh === 'function' && typeof player !== 'undefined' && player.mesh) {
      rebuildHeroMesh();
    }
  }
  setTimeout(upgradeGraphicsPipeline, 80);

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 1. БАЗОВЫЕ ФИКСЫ + СКОРОСТНОЙ ВЕКТОРНЫЙ ГАРПУН ХОХЛОРКОВИ (2250 М!)
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

  // Увеличенная дальность всех ударов Хохлоркови (ЛКМ)
  window.carrotPrimaryAttack = function () {
    if (player.attackTimer > 0.08) return;
    if (!player.isGrounded && !player.isWallRunning && !player.isFlying && player.pos.y > 4 && CARROT_FORM === 1 && !player._activeGrapple) {
      if (!player.isBulletdropping) {
        player.isBulletdropping = true;
        player.vel.y = -72;
        const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
        player.vel.x = fwd.x * 28;
        player.vel.z = fwd.z * 28;
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
      player.vel.x += fwd.x * 14;
      player.vel.z += fwd.z * 14;
      const st = carrotStats();
      const dmg = st.dmg * 2.8;
      const chest = new THREE.Vector3(player.pos.x, player.pos.y + 4, player.pos.z);
      spawnSlashArc(chest.clone().add(fwd.clone().multiplyScalar(5)), player.facingYaw, player.comboStep % 2 ? 0.4 : -0.4, 0xff5500, 14, 0.42);
      SoundFX.swing(120);
      SoundFX.devastator();
      spawnGroundCrackRing(new THREE.Vector3(player.pos.x + fwd.x * 7, 0, player.pos.z + fwd.z * 7), 0xff5500, 20);
      const hr = 22;
      const hx = player.pos.x + fwd.x * 8, hz = player.pos.z + fwd.z * 8;
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
      { dur: 0.21, tilt: -0.2, r: 12.5, lunge: 18, dmg: 1.15, label: '*ХЛЫСТ ЛОЗОЙ!*' },
      { dur: 0.21, tilt: 0.2,  r: 12.5, lunge: 18, dmg: 1.15, label: '*ХЛЫСТ ЛОЗОЙ!*' },
      { dur: 0.30, tilt: 0,    r: 15.5, lunge: 20, dmg: 1.35, label: '*360° БОТВА!*', spin: true },
      { dur: 0.34, tilt: -0.5, r: 13.5, lunge: 18, dmg: 1.55, label: '*КОРНЕВОЙ АППЕРКОТ!*', launch: true },
      { dur: 0.46, tilt: -1.0, r: 17.0, lunge: 32, dmg: 2.25, label: '*КОРНЕВОЙ ШКВАЛ!*', finisher: true }
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
    spawnSlashArc(chest.clone().add(fwd.clone().multiplyScalar(2.4)), player.facingYaw, C.tilt * 0.8, 0xadff2f, C.r * 0.55, 0.18);

    if (activeTendrils.length < 10) {
      const whipEnd = chest.clone().add(fwd.clone().multiplyScalar(C.r + 3));
      activeTendrils.push(new OrganicTendril3D(scene, chest.clone(), whipEnd, 0x2ecc71, 0.35, 0.25));
    }

    if (C.spin) {
      spawnGroundCrackRing(new THREE.Vector3(player.pos.x, 0, player.pos.z), 0x2ecc71, C.r);
      spawnSlashArc(chest.clone(), player.facingYaw + 0.8, 0, 0xadff2f, C.r * 0.9, 0.25);
    }
    if (C.finisher) {
      SoundFX.devastator();
      spawnGroundCrackRing(new THREE.Vector3(player.pos.x + fwd.x * 6, 0, player.pos.z + fwd.z * 6), 0x2ecc71, C.r);
    }
    SoundFX.swing(200 + player.comboStep * 50);

    const hx = player.pos.x + fwd.x * (C.spin ? 3 : 6.5);
    const hz = player.pos.z + fwd.z * (C.spin ? 3 : 6.5);
    const hr = C.r;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const dx = e.group.position.x - hx, dz = e.group.position.z - hz;
      if (dx * dx + dz * dz <= (hr + e.radius) * (hr + e.radius)) {
        if (C.launch && e.type !== 'titan') e.vel.y = 18;
        if (C.finisher) {
          e.vel.y = Math.max(e.vel.y, 14);
          const kx = e.group.position.x - player.pos.x;
          const kz = e.group.position.z - player.pos.z;
          const kl = Math.sqrt(kx * kx + kz * kz) || 1;
          e.vel.x += (kx / kl) * 20;
          e.vel.z += (kz / kl) * 20;
        }
        if (activeTendrils.length < 10) {
          activeTendrils.push(new OrganicTendril3D(scene, chest.clone(), e.group.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 0x2ecc71, 0.32, 0.28));
        }
        damageEnemy(e, dmg, new THREE.Vector3(fwd.x * (C.finisher ? 7 : 3.5), 0, fwd.z * (C.finisher ? 7 : 3.5)), C.label);
      }
    }
    if (C.finisher) triggerHitstopAndChroma(0.03, 0.5, 1.0);
    checkCarDestruction(new THREE.Vector3(hx, 0, hz), hr);
  };

  // ─── НОВЫЙ ВЕКТОРНЫЙ ГАРПУН [ПКМ]: ИСТИННОЕ ПРИТЯГИВАНИЕ К ЗДАНИЯМ И ЦЕЛЯМ (2250М!) ───
  let _newVineCd = 0;
  const VINE_CD = 0.45;
  const HARPOON_MAX_RANGE = 2250; // в 5 раз больше базовых 450м
  player._activeGrapple = null;

  // Умный поиск точки на здании по лучу прицела (с авто-захватом ближайшей грани/крыши здания в конусе взгляда)
  function findBestBuildingGrapplePoint(origin, fwd3D, fwdFlat) {
    const rc = new THREE.Raycaster();
    // 1. Точный 3D луч по направлению камеры (кроме плоской земли y <= 0.6)
    rc.set(origin, fwd3D);
    rc.far = HARPOON_MAX_RANGE;
    const hits3D = rc.intersectObjects(buildingMeshes, false).filter((h) => h.point.y > 0.8);
    if (hits3D.length > 0) {
      return { point: hits3D[0].point, distance: hits3D[0].distance };
    }

    // 2. Если игрок смотрит чуть ниже или выше, проверяем веер вертикальных углов в направлении взгляда
    const pitchOffsets = [0.08, -0.06, 0.16, 0.25, 0.35];
    for (let i = 0; i < pitchOffsets.length; i++) {
      const testPitch = (player.camPitch || 0) - pitchOffsets[i];
      const cosP = Math.cos(testPitch);
      const testDir = new THREE.Vector3(
        -Math.sin(player.camYaw) * cosP,
        -Math.sin(testPitch),
        -Math.cos(player.camYaw) * cosP
      ).normalize();
      rc.set(origin, testDir);
      rc.far = HARPOON_MAX_RANGE;
      const fanHits = rc.intersectObjects(buildingMeshes, false).filter((h) => h.point.y > 1.0);
      if (fanHits.length > 0) {
        return { point: fanHits[0].point, distance: fanHits[0].distance };
      }
    }

    // 3. Авто-наведение на ближайший небоскреб из массива buildings в конусе взгляда (до 2250м)
    let bestB = null;
    let bestScore = Infinity;
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      if (!b || b.topY < 8) continue;
      const targetY = Math.min(b.topY - 1.0, Math.max(player.pos.y + 8, b.topY * 0.78));
      const bPos = new THREE.Vector3(b.x, targetY, b.z);
      const toB = bPos.clone().sub(origin);
      const dist = toB.length();
      if (dist < 6 || dist > HARPOON_MAX_RANGE) continue;
      const dotFlat = new THREE.Vector3(toB.x, 0, toB.z).normalize().dot(fwdFlat);
      if (dotFlat < 0.68) continue;
      const score = dist * (1.25 - dotFlat);
      if (score < bestScore) {
        bestScore = score;
        // Точка на ближайшей к игроку внешней грани здания
        const clampX = Math.max(b.minX - 1.2, Math.min(b.maxX + 1.2, player.pos.x));
        const clampZ = Math.max(b.minZ - 1.2, Math.min(b.maxZ + 1.2, player.pos.z));
        bestB = {
          point: new THREE.Vector3(clampX, targetY, clampZ),
          distance: dist,
          building: b
        };
      }
    }
    return bestB;
  }

  // Запуск непрерывного притягивания (Zipline Pull) к 3D-точке
  function startContinuousGrapplePull(targetPoint, options = {}) {
    const origin = player.pos.clone().add(new THREE.Vector3(0, 2.0, 0));
    const dist = origin.distanceTo(targetPoint);
    const pullSpeed = options.speed || Math.min(380, Math.max(220, dist * 1.8));
    const maxDuration = Math.min(2.2, Math.max(0.18, dist / pullSpeed + 0.15));

    // Создаем прочную визуальную 3D-лиану на все время притягивания
    let vineTendril = null;
    if (typeof OrganicTendril3D === 'function') {
      vineTendril = new OrganicTendril3D(scene, origin.clone(), targetPoint.clone(), 0x2ecc71, 0.45, maxDuration + 0.15);
      activeTendrils.push(vineTendril);
    }

    player._activeGrapple = {
      targetPos: targetPoint.clone(),
      speed: pullSpeed,
      timer: 0,
      maxDuration: maxDuration,
      enemyRef: options.enemyRef || null,
      tendril: vineTendril
    };

    player.isGrounded = false;
    player.isWallRunning = false;
    player.isBulletdropping = false;
    player.dodgeIframes = Math.max(player.dodgeIframes, maxDuration + 0.25);
    player.facingYaw = Math.atan2(-(targetPoint.x - player.pos.x), -(targetPoint.z - player.pos.z));
    if (typeof postUniforms !== 'undefined') postUniforms.uRadialBlur.value = 1.35;
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
    const cosP = Math.cos(player.camPitch || 0);
    // В камере игры положительный camPitch поднимает камеру выше игрока (взгляд направлен вниз: y = -sin(camPitch))
    const fwd3D = new THREE.Vector3(
      -Math.sin(player.camYaw) * cosP,
      -Math.sin(player.camPitch || 0),
      -Math.cos(player.camYaw) * cosP
    ).normalize();
    const fwdFlat = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw)).normalize();

    const buildHit = findBestBuildingGrapplePoint(origin, fwd3D, fwdFlat);
    const buildingDist = buildHit ? buildHit.distance : Infinity;

    // Поиск врага в прицеле
    let bestEnemy = null;
    let bestEnemyScore = Infinity;
    let bestEnemyDist = HARPOON_MAX_RANGE;
    for (let i = 0; i < enemies.length; i++) {
      const en = enemies[i];
      if (!en || !en.group) continue;
      const eCenter = en.group.position.clone().add(new THREE.Vector3(0, 2.0, 0));
      const toE = eCenter.sub(origin);
      const dist = toE.length();
      if (dist > HARPOON_MAX_RANGE) continue;
      const dot3D = toE.clone().normalize().dot(fwd3D);
      const dotFlat = new THREE.Vector3(toE.x, 0, toE.z).normalize().dot(fwdFlat);
      if (dot3D < 0.72 && dotFlat < 0.78) continue;
      const score = dist * (1.2 - Math.max(dot3D, dotFlat));
      if (score < bestEnemyScore) {
        bestEnemyScore = score;
        bestEnemyDist = dist;
        bestEnemy = en;
      }
    }

    // Приоритет: если игрок целится прямо во врага и враг ближе стены (или стена далеко)
    if (bestEnemy && bestEnemyDist <= buildingDist + 8) {
      _newVineCd = VINE_CD;
      const isElite = (
        bestEnemy._isBoss || bestEnemy._isStoryConstruct ||
        bestEnemy.type === 'titan' || bestEnemy.type === 'tank' ||
        bestEnemy.type === 'lemon' || bestEnemy.type === 'valkyrie' ||
        bestEnemy.type === 'necromancer' || bestEnemy.type === 'heli' ||
        bestEnemy.type === 'shield' || bestEnemy.type === 'sniper'
      );
      const tp = bestEnemy.group.position.clone().add(new THREE.Vector3(0, 2.0, 0));
      SoundFX.whip();
      triggerHitstopAndChroma(0.05, 0.4, 0.9);

      if (isElite || bestEnemyDist > 42) {
        // Прямой скоростной полет на тросе прямо во врага/босса!
        spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), `*🌿 ГАРПУН-ТАРАН (${Math.round(bestEnemyDist)}М)!*`, '#ff2200');
        startContinuousGrapplePull(tp, { speed: 340, enemyRef: bestEnemy });
      } else {
        // Легкий пехотинец вблизи — мгновенно притягиваем врага прямо перед лицом игрока и бьем вертушкой!
        if (activeTendrils.length < 10) {
          activeTendrils.push(new OrganicTendril3D(scene, origin.clone(), tp.clone(), 0x2ecc71, 0.44, 0.45));
        }
        spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), '*ИДИ СЮДА!*', '#2ecc71');
        const capE = bestEnemy;
        capE._rooted = 0.9;
        // Покадровое притягивание самого врага к игроку
        const pullTarget = player.pos.clone().add(fwdFlat.clone().multiplyScalar(2.6));
        let pullStep = 0;
        const pullEnemyInterval = setInterval(() => {
          pullStep++;
          if (!capE || !capE.group || !capE.group.parent || pullStep >= 10) {
            clearInterval(pullEnemyInterval);
            if (capE && capE.group && capE.group.parent) {
              const st = carrotStats();
              spawnSlashArc(player.pos.clone().add(new THREE.Vector3(0, 2, 0)), player.facingYaw, 0, 0x2ecc71, 9.5, 0.35);
              damageEnemy(capE, st.dmg * 3.6, fwdFlat.clone().multiplyScalar(12), '*УДАР С РАЗВОРОТА!*');
              spawnParticles(capE.group.position.clone().add(new THREE.Vector3(0, 2, 0)), 0xadff2f, 16);
              triggerHitstopAndChroma(0.07, 0.6, 1.1);
            }
            return;
          }
          capE.group.position.lerp(pullTarget, 0.38);
        }, 25);
      }
      return;
    }

    // Притягивание к ЗДАНИЮ / КРЫШЕ / ФАСАДУ (быстро и точно по прямой линии!)
    if (buildHit) {
      _newVineCd = VINE_CD;
      const hp = buildHit.point.clone();
      const distB = Math.round(buildHit.distance);
      SoundFX.swing(540);
      SoundFX.whip();
      spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), `*🌿 ТРОС К ЗДАНИЮ (${distB}М)!*`, '#2ecc71');
      startContinuousGrapplePull(hp, { speed: Math.min(400, Math.max(250, distB * 2.0)) });
      return;
    }

    // Если игрок выстрелил в чистое небо без зданий — быстрый горизонтально-диагональный рывок вперед на лозе
    _newVineCd = VINE_CD;
    const dashTarget = origin.clone().add(fwd3D.clone().multiplyScalar(95));
    dashTarget.y = Math.max(2.0, Math.min(origin.y + 35, dashTarget.y));
    SoundFX.swing(480);
    spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), '*🌿 ЛОЗОВОЙ РЫВОК!*', '#2ecc71');
    startContinuousGrapplePull(dashTarget, { speed: 290 });
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

  // Расширенное Опутывание корнями [F]
  const _origRootBind = window.carrotRootBind;
  window.carrotRootBind = function () {
    if (!CARROT_MODE || player.isDead) return;
    player.carrotStamina = Math.max(40, player.carrotStamina);
    player.carrotRootBindCd = 0;
    if (_origRootBind) _origRootBind.apply(this, arguments);
    const bindRadius = CARROT_FORM === 2 ? 52 : 45;
    const st = carrotStats();
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const d = e.group.position.distanceTo(player.pos);
      if (d < bindRadius) {
        e._rooted = 4.5;
        if (e.flying) {
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
  // ═══ 2. ПОКАДРОВЫЙ ПРИВОД ГАРПУНА И ПАРКУРА В updatePlayerChoreographyAndCamera
  // ═══════════════════════════════════════════════════════════════════════════
  if (typeof updatePlayerChoreographyAndCamera === 'function') {
    const _origChoreo = window.updatePlayerChoreographyAndCamera;
    window.updatePlayerChoreographyAndCamera = function (dt, now) {
      const isFrozen = window.__MP && window.__MP._myRootedUntil > now;
      const savedX = player.pos.x;
      const savedZ = player.pos.z;
      const preY = player.pos.y;

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

      // ─── АКТИВНЫЙ ПРИВОД ЛИАНОВОГО ГАРПУНА (ПРЯМОЕ ПРИТЯГИВАНИЕ К ЗДАНИЮ/ВРАГУ) ───
      if (player._activeGrapple) {
        const g = player._activeGrapple;
        g.timer += dt;

        // Если цель — живой враг/босс, обновляем координаты точки притягивания
        if (g.enemyRef && g.enemyRef.group && g.enemyRef.group.parent) {
          g.targetPos.copy(g.enemyRef.group.position).add(new THREE.Vector3(0, 1.5, 0));
        }

        // Обновляем 3D-лозу гарпуна
        if (g.tendril) {
          g.tendril.targetEnd.copy(g.targetPos);
        }

        const toTarget = g.targetPos.clone().sub(player.pos);
        const dist = toTarget.length();
        const dir = dist > 0.001 ? toTarget.clone().divideScalar(dist) : new THREE.Vector3(0, 0, -1);

        // Отмена/прыжок с троса при нажатии Пробела после старта
        if (keys['Space'] && g.timer > 0.12) {
          player._activeGrapple = null;
          player.vel.set(dir.x * 55, Math.max(22, dir.y * 35 + 16), dir.z * 55);
          player.airFlipTimer = 0.42;
          SoundFX.swing(420);
        } else if (dist <= 4.2 || g.timer >= g.maxDuration) {
          // Прибытие в точку захвата!
          player._activeGrapple = null;
          if (g.enemyRef && g.enemyRef.group && g.enemyRef.group.parent) {
            const st = carrotStats();
            player.pos.copy(g.targetPos);
            player.vel.set(0, 12, 0);
            damageEnemy(g.enemyRef, st.dmg * 5.2, dir.clone().multiplyScalar(14), '*СОКРУШИТЕЛЬНЫЙ ТАРАН!*');
            spawnParticles(g.targetPos.clone(), 0x2ecc71, 26);
            spawnGroundCrackRing(g.enemyRef.group.position, 0x2ecc71, 15);
            triggerHitstopAndChroma(0.10, 0.8, 1.3);
          } else {
            // Проверяем, попали ли мы к вершине/крыше здания — если да, закидываем прямо на крышу!
            let vaultedToRoof = false;
            const pad = 2.6;
            for (let i = 0; i < buildings.length; i++) {
              const b = buildings[i];
              if (
                g.targetPos.x >= b.minX - pad && g.targetPos.x <= b.maxX + pad &&
                g.targetPos.z >= b.minZ - pad && g.targetPos.z <= b.maxZ + pad
              ) {
                if (g.targetPos.y >= b.topY - 6.5) {
                  // Мягкий заскок прямо на крышу здания!
                  const inwardX = Math.max(b.minX + 2, Math.min(b.maxX - 2, g.targetPos.x));
                  const inwardZ = Math.max(b.minZ + 2, Math.min(b.maxZ - 2, g.targetPos.z));
                  player.pos.set(inwardX, b.topY + 0.35, inwardZ);
                  player.vel.set(dir.x * 16, 4, dir.z * 16);
                  player.isGrounded = true;
                  vaultedToRoof = true;
                  spawnGroundCrackRing(player.pos, 0x2ecc71, 6);
                  break;
                } else {
                  // Притяжение к стене здания: выравниваем у фасада и даем плавный импульс для бега по стене
                  player.pos.copy(g.targetPos);
                  player.vel.set(dir.x * 12, 18, dir.z * 12);
                  player.isWallRunning = true;
                  vaultedToRoof = true;
                  break;
                }
              }
            }
            if (!vaultedToRoof) {
              player.pos.copy(g.targetPos);
              player.vel.set(dir.x * 32, Math.max(10, dir.y * 24), dir.z * 32);
            }
            SoundFX.hit(160, 0.15);
          }
        } else {
          // Двигаем игрока напрямую вдоль вектора троса со скоростью 250–400 м/с!
          const step = Math.min(dist, g.speed * dt);
          player.pos.addScaledVector(dir, step);
          // Гасим гравитацию и задаем умеренный вектор скорости, чтобы базовый код не подбрасывал вверх
          player.vel.set(dir.x * 15, dir.y * 15 + 38 * dt, dir.z * 15);
          player.facingYaw = Math.atan2(-dir.x, -dir.z);
          if (Math.random() < 0.65 && typeof ParticlePool !== 'undefined') {
            const p = ParticlePool.get(0x2ecc71);
            p.position.copy(player.pos).add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 1.2, (Math.random() - 0.5) * 1.2));
            p.scale.setScalar(0.55);
            scene.add(p);
            ParticlePool.active.push({ mesh: p, vel: new THREE.Vector3(0, 2, 0), life: 0.35 });
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
  // ═══ 3. НАСТОЯЩИЙ 3D ЛЕДЯНОЙ КУБ НА [C] + РАСКОЛ ЛЬДА X2 (100% СОХРАНЕНИЕ)
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

      // Если это Жиригорь в Главе 8 — крио-заморозка снимает его жировую неуязвимость!
      if (en._isJirigory) {
        en._fatShieldBroken = true;
      }

      if (!en._mpId && typeof damageEnemy === 'function') {
        en._suppressShatterOnFreezeInit = true;
        damageEnemy(en, CRYO_BASE_DMG, new THREE.Vector3(), '*❄ ВМЕРЗ В ЛЁД!*');
        en._suppressShatterOnFreezeInit = false;
      }
    }

    for (let i = 0; i < 32; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.random() * CRYO_FREEZE_RADIUS;
      const p = ParticlePool.get(0x88ffff);
      p.position.set(player.pos.x + Math.cos(ang) * rad, 0.5 + Math.random() * 4, player.pos.z + Math.sin(ang) * rad);
      p.scale.setScalar(0.95);
      scene.add(p);
      ParticlePool.active.push({ mesh: p, vel: new THREE.Vector3((Math.random() - 0.5) * 6, 4 + Math.random() * 5, (Math.random() - 0.5) * 6), life: 1.3 });
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

  const _origDamageEnemyForCryo = window.damageEnemy;
  window.damageEnemy = function (en, dmg, knockVec, popText) {
    // Жиригорь в Главе 8 поглощает урон своим жиром, пока его не заморозят или не обольют кислотой/радужным ударом!
    if (en && en._isJirigory && !en._fatShieldBroken && en.frozen <= 0 && !LEMON_MODE && !player._multifruitTitanActive) {
      dmg *= 0.25;
      popText = '*ЖИР ПОГЛОТИЛ УДАР! (НУЖЕН ЛЁД [C] ИЛИ КИСЛОТА)*';
    }
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
    const res = _origDamageEnemyForCryo.call(this, en, dmg, knockVec, popText);
    if (en && en.hp <= 0 && en._iceCubePrison) {
      clearTimeout(en._iceCubePrison.timerId);
      en._iceCubePrison.cleanup();
      en._iceCubePrison = null;
    }
    return res;
  };

  if (typeof updateEnemiesAndVehicles === 'function') {
    const _origUpdateEnemiesV80 = window.updateEnemiesAndVehicles;
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
      _origUpdateEnemiesV80.apply(this, arguments);
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 4. ВРАГИ И БОССЫ ИЗ КОМИКСА (ЧАСТИ 5, 6, 11 и 12)
  // ═══════════════════════════════════════════════════════════════════════════
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

  // ─── БОСС ГЛАВЫ 5: МЕХА-ГРЕЙПСТАСИК НА ТАНКОВЫХ ГУСЕНИЦАХ (Части 5–6) ───
  window.spawnGrapestasikBoss = function (x, z) {
    if (activeBoss) {
      activeBoss.hp = 0;
      damageEnemy(activeBoss, 999999, new THREE.Vector3(), '');
    }
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const suitMat = createPrototypeShader(0x5b1e82, 0x26083c, 1, 0xbb44ff);
    const headMat = createPrototypeShader(0xe05a6c, 0x8a2434, 4, 0xffaa88);
    const treadMat = createPrototypeShader(0x282c34, 0x101216, 7, 0x00f2fe);
    const thunderMat = new THREE.MeshBasicMaterial({ color: 0xd252ff });

    const chassis = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.2, 5.2), treadMat), 1.04);
    chassis.position.y = 1.6;
    g.add(chassis);
    for (let side of [-1, 1]) {
      const track = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.4, 6.8), treadMat), 1.04);
      track.position.set(side * 2.8, 1.3, 0);
      g.add(track);
    }

    const torso = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.2, 5.2, 12), suitMat), 1.04);
    torso.position.y = 5.4;
    g.add(torso);

    const neck = new THREE.Group();
    neck.position.set(0, 8.2, 0);
    g.add(neck);
    const head = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(2.15, 14, 14), headMat), 1.04);
    head.position.y = 1.8;
    neck.add(head);
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.2), new THREE.MeshBasicMaterial({ color: 0xfff200 }));
    eyeL.position.set(-0.7, 2.0, 1.98);
    neck.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.7;
    neck.add(eyeR);

    const armLPivot = new THREE.Group(); armLPivot.position.set(-3.1, 7.2, 0); g.add(armLPivot);
    const armLMesh = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.55, 4.2, 8), suitMat), 1.04);
    armLMesh.position.y = -2.0; armLPivot.add(armLMesh);
    const thunderL = new THREE.Mesh(new THREE.SphereGeometry(1.25, 10, 10), thunderMat);
    thunderL.position.y = -4.2; armLPivot.add(thunderL);

    const armRPivot = new THREE.Group(); armRPivot.position.set(3.1, 7.2, 0); g.add(armRPivot);
    const armRMesh = armLMesh.clone(); armRPivot.add(armRMesh);
    const thunderR = thunderL.clone(); armRPivot.add(thunderR);

    const legLPivot = new THREE.Group(), legRPivot = new THREE.Group();
    g.add(legLPivot, legRPivot);
    scene.add(g);

    activeBoss = {
      type: 'lemon',
      _isBoss: true,
      _isGrapestasik: true,
      name: 'ГРЕЙПСТАСИК (ГУСЕНИЧНЫЙ ШТУРМОВИК)',
      group: g,
      armL: armLPivot, armR: armRPivot, legL: legLPivot, legR: legRPivot,
      neck: neck, spark: thunderL, ankle: chassis,
      hp: 20000, maxHp: 20000,
      vel: new THREE.Vector3(), speed: 11, radius: 4.8,
      attackCd: 1.8, windup: 0, dodgeCd: 99, flying: false,
      phase: 1, chargeCd: 3.5, lightningCd: 2.4, _phase2: false, _rooted: 0
    };
    enemies.push(activeBoss);
    showBossHUD('🍇 ГРЕЙПСТАСИК — ШТУРМ CITRUS DEFENSE 🍇', 'ПРОБЕЙТЕ ГУСЕНИЧНОЕ ШАССИ!');
    SoundFX.bossRoar();
    return activeBoss;
  };

  // ─── БОСС ГЛАВЫ 6–7: БИО-МОНСТР ГРЕЙПСТАСИК («ИСТИННАЯ ГОРЕЧЬ», ЧАСТЬ 11) ───
  window.spawnBioMonsterGrapestasik = function (x, z) {
    if (activeBoss) {
      activeBoss.hp = 0;
      damageEnemy(activeBoss, 999999, new THREE.Vector3(), '');
    }
    const g = new THREE.Group();
    g.position.set(x, 0, z);

    const bioMat = createPrototypeShader(0x3a1058, 0x160028, 1, 0xd252ff);
    const berryMat = createPrototypeShader(0x52187a, 0x220438, 4, 0xff00ff);
    const vineMat = createPrototypeShader(0x1f3a18, 0x0a1806, 8, 0x2ecc71);
    const glowViolet = new THREE.MeshBasicMaterial({ color: 0xe066ff });

    // Могучий мускулистый торс со спиральным фиолетовым ядром на прессе (из Части 11!)
    const torso = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(3.2, 2.3, 6.4, 12), bioMat), 1.04);
    torso.position.y = 6.8;
    g.add(torso);

    const spiralCore = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.22, 8, 24), glowViolet);
    spiralCore.position.set(0, 6.2, 2.45);
    g.add(spiralCore);

    // Виноградные гроздья на плечах и голове (точно как в комиксе Часть 11!)
    for (let side of [-1, 1]) {
      for (let b = 0; b < 7; b++) {
        const berry = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(0.75, 8, 8), berryMat), 1.04);
        berry.position.set(
          side * (3.2 + (b % 2) * 0.6),
          8.8 + Math.floor(b / 3) * 0.65,
          ((b % 3) - 1) * 0.65
        );
        g.add(berry);
      }
    }

    // Хищная голова с большими светящимися фиолетовыми глазами-линзами и виноградным листком
    const neck = new THREE.Group();
    neck.position.set(0, 10.2, 0);
    g.add(neck);
    const head = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(2.0, 12, 12), bioMat), 1.04);
    head.position.y = 1.6;
    neck.add(head);

    for (let side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), glowViolet);
      eye.scale.set(1.2, 0.75, 0.6);
      eye.position.set(side * 0.75, 1.85, 1.75);
      eye.rotation.z = -side * 0.35;
      neck.add(eye);
    }

    const leafCrown = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.2, 5), vineMat);
    leafCrown.position.set(-0.6, 3.8, 0);
    leafCrown.rotation.z = 0.4;
    neck.add(leafCrown);

    // Когтистые лапы с лозами и фиолетовой энергией
    const armLPivot = new THREE.Group(); armLPivot.position.set(-3.6, 9.2, 0); g.add(armLPivot);
    const armL = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.65, 5.0, 8), bioMat), 1.04);
    armL.position.y = -2.4; armLPivot.add(armL);
    const clawOrbL = new THREE.Mesh(new THREE.SphereGeometry(1.3, 10, 10), new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true }));
    clawOrbL.position.y = -5.0; armLPivot.add(clawOrbL);

    const armRPivot = new THREE.Group(); armRPivot.position.set(3.6, 9.2, 0); g.add(armRPivot);
    const armR = armL.clone(); armRPivot.add(armR);
    const clawOrbR = clawOrbL.clone(); armRPivot.add(clawOrbR);

    const legLPivot = new THREE.Group(); legLPivot.position.set(-1.5, 3.6, 0); g.add(legLPivot);
    const legL = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.9, 3.8, 8), bioMat), 1.04);
    legL.position.y = -1.9; legLPivot.add(legL);

    const legRPivot = new THREE.Group(); legRPivot.position.set(1.5, 3.6, 0); g.add(legRPivot);
    const legR = legL.clone(); legRPivot.add(legR);

    scene.add(g);
    activeBoss = {
      type: 'lemon',
      _isBoss: true,
      _isBioGrapestasik: true,
      name: 'БИО-МОНСТР ГРЕЙПСТАСИК («ИСТИННАЯ ГОРЕЧЬ»)',
      group: g,
      armL: armLPivot, armR: armRPivot, legL: legLPivot, legR: legRPivot,
      neck: neck, spark: spiralCore, ankle: spiralCore,
      hp: 32000, maxHp: 32000,
      vel: new THREE.Vector3(), speed: 12.5, radius: 5.2,
      attackCd: 1.5, windup: 0, dodgeCd: 99, flying: false,
      phase: 1, chargeCd: 3.0, lightningCd: 2.0, _phase2: false, _rooted: 0
    };
    enemies.push(activeBoss);
    showBossHUD('🍇 БИО-ГРЕЙПСТАСИК — ЭССЕНЦИЯ ИСТИННОЙ ГОРЕЧИ 🍇', 'СПИРАЛЬНОЕ ЯДРО НА ЖИВОТЕ — УЯЗВИМАЯ ТОЧКА!');
    SoundFX.bossRoar();
    return activeBoss;
  };

  // ─── БОСС ГЛАВЫ 8–10: ЖИРИГОРЬ («ЗОЛОТОЙ СТАНДАРТ / ИСТИННЫЙ ЖИР», ЧАСТЬ 12) ───
  window.spawnJirigoryBoss = function (x, z, isRecrystallized = false) {
    if (activeBoss) {
      activeBoss.hp = 0;
      damageEnemy(activeBoss, 999999, new THREE.Vector3(), '');
    }
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const scaleMult = isRecrystallized ? 1.45 : 1.0;
    g.scale.setScalar(scaleMult);

    const fatMat = createPrototypeShader(0xe8b828, 0x9c6e08, 4, 0xfff200);
    const hairMat = createPrototypeShader(0xf5d76e, 0xb8860b, 0, 0xffffff);

    // Растекающееся жировое основание-лужа и массивное пузо
    const puddle = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6.8, 1.4, 16), fatMat);
    puddle.position.y = 0.7;
    g.add(puddle);

    const belly = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(4.2, 16, 14), fatMat), 1.04);
    belly.scale.set(1.18, 1.05, 1.1);
    belly.position.y = 4.6;
    g.add(belly);

    const chest = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(3.4, 14, 12), fatMat), 1.04);
    chest.scale.set(1.25, 0.9, 1.0);
    chest.position.y = 7.8;
    g.add(chest);

    // Ухмыляющаяся голова Жиригоря с длинными светлыми волосами
    const neck = new THREE.Group();
    neck.position.set(0, 9.8, 0);
    g.add(neck);
    const head = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(1.9, 14, 14), fatMat), 1.04);
    head.position.y = 1.4;
    neck.add(head);

    const mane = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 2.3, 2.8, 12), hairMat);
    mane.position.set(0, 1.6, -0.35);
    neck.add(mane);

    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.2), new THREE.MeshBasicMaterial({ color: 0xfff200 }));
    eyeL.position.set(-0.6, 1.6, 1.78);
    neck.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.6;
    neck.add(eyeR);

    // Массивные стекающие руки + фирменный браслет из бусин на левом запястье (из Части 12!)
    const armLPivot = new THREE.Group(); armLPivot.position.set(-4.2, 8.2, 0); g.add(armLPivot);
    const armL = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.9, 4.6, 10), fatMat), 1.04);
    armL.position.y = -2.2; armLPivot.add(armL);
    const bracelet = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.22, 8, 12), new THREE.MeshStandardMaterial({ color: 0x8b5a2b }));
    bracelet.rotation.x = Math.PI / 2;
    bracelet.position.y = -4.0;
    armLPivot.add(bracelet);

    const armRPivot = new THREE.Group(); armRPivot.position.set(4.2, 8.2, 0); g.add(armRPivot);
    const armR = armL.clone(); armRPivot.add(armR);

    // Если это Глава 10 («Жирная Рекристаллизация») — добавляем гигантские ледяные кристаллы катализатора!
    if (isRecrystallized) {
      const iceCrystalMat = new THREE.MeshPhongMaterial({
        color: 0x66f2ff,
        emissive: 0x0a4868,
        transparent: true,
        opacity: 0.72,
        shininess: 110
      });
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const shard = new THREE.Mesh(new THREE.ConeGeometry(1.1, 6.5, 5), iceCrystalMat);
        shard.position.set(Math.cos(ang) * 4.2, 7.5 + (i % 2) * 1.5, Math.sin(ang) * 4.2);
        shard.rotation.z = -Math.cos(ang) * 0.55;
        shard.rotation.x = Math.sin(ang) * 0.55;
        g.add(shard);
      }
    }

    const legLPivot = new THREE.Group(), legRPivot = new THREE.Group();
    g.add(legLPivot, legRPivot);
    scene.add(g);

    const maxHp = isRecrystallized ? 42000 : 25000;
    activeBoss = {
      type: 'brawler',
      _isBoss: true,
      _isJirigory: true,
      _fatShieldBroken: isRecrystallized, // В 10 главе уязвим для Протокола Титана Мультифрукта
      name: isRecrystallized ? 'МЕГА-ЖИРИГОРЬ (ЖИРНАЯ РЕКРИСТАЛЛИЗАЦИЯ)' : 'ЖИРИГОРЬ — ЗОЛОТОЙ СТАНДАРТ',
      group: g,
      armL: armLPivot, armR: armRPivot, legL: legLPivot, legR: legRPivot,
      neck: neck, ankle: belly,
      hp: maxHp, maxHp: maxHp,
      vel: new THREE.Vector3(), speed: isRecrystallized ? 10 : 8, radius: 5.5 * scaleMult,
      attackCd: 1.7, meleeCd: 0, meleeAnim: 0, _meleeDur: 0.5,
      dodgeCd: 99, flying: false, phase: 1, _phase2: isRecrystallized, _rooted: 0
    };
    enemies.push(activeBoss);
    showBossHUD(
      isRecrystallized ? '❄️💛 МЕГА-ЖИРИГОРЬ: ЖИРНЫЙ АРМАГЕДДОН 💛❄️' : '💛 ЖИРИГОРЬ — «ИСТИННЫЙ ЖИР» («ЗОЛОТОЙ СТАНДАРТ») 💛',
      isRecrystallized ? 'ИСПОЛЬЗУЙТЕ КОМБИНИРОВАННЫЙ УДАР БАЛАНСА (ПРОТОКОЛ ТИТАНА)!' : 'ЗАМОРОЗЬТЕ ЕГО НА [C] ИЛИ ИСПОЛЬЗУЙТЕ КИСЛОТУ ЛИМОНА!'
    );
    SoundFX.bossRoar();
    return activeBoss;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 5. ПОЛНАЯ СЮЖЕТНАЯ КАМПАНИЯ ИЗ 10 ГЛАВ (ЧАСТИ 5, 6, 11 и 12 КОМИКСА)
  // ═══════════════════════════════════════════════════════════════════════════
  const StoryCampaign = {
    chapter: 1,
    completed: false,
    objectives: [],
    waypointBeam: null,
    waypointRing: null,
    skyVortex: null,
    rainbowBeam: null,
    rodotenancDrones: null,
    targetPos: new THREE.Vector3(0, 0, -65),
    bossEntity: null
  };
  window.StoryCampaign = StoryCampaign;

  const storyHudEl = document.createElement('div');
  storyHudEl.id = 'story-campaign-hud';
  storyHudEl.style.cssText =
    'position:fixed;top:54px;left:50%;transform:translateX(-50%) skewX(-4deg);z-index:25;' +
    'min-width:460px;max-width:680px;background:linear-gradient(135deg,rgba(18,6,28,.95),rgba(40,10,18,.92));' +
    'border:3px solid #000;outline:3px solid #f9ca24;padding:8px 18px;text-align:center;' +
    'box-shadow:0 8px 25px rgba(0,0,0,.85),6px 6px 0 #000;pointer-events:auto;';
  storyHudEl.innerHTML =
    '<div id="story-ch-title" style="font-family:Bangers,Impact,sans-serif;font-size:19px;color:#f9ca24;letter-spacing:1.5px;text-shadow:2px 2px 0 #000;">📖 ГЛАВА 1/10: ПРОБУЖДЕНИЕ ОРАНЖ</div>' +
    '<div id="story-ch-desc" style="font-size:12px;font-weight:900;color:#fff;margin-top:2px;">Уничтожьте 3 Якоря Цитрус Дефенс (0/3)</div>' +
    '<div id="story-ch-dist" style="font-size:11px;font-weight:900;color:#00f2fe;margin-top:3px;">📍 ДО ЦЕЛИ: 0 М</div>';
  document.body.appendChild(storyHudEl);

  const comicDialogEl = document.createElement('div');
  comicDialogEl.id = 'comic-dialog-panel';
  comicDialogEl.style.cssText =
    'position:fixed;bottom:108px;right:18px;width:445px;z-index:60;background:#fff8e7;' +
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
    const g = new THREE.Group();
    g.position.set(x, y, z);

    if (kind === 'anchor') {
      const pylonMat = createPrototypeShader(0xff7f00, 0x5a2000, 2, 0xfff200);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 4.2, 10, 8), pylonMat);
      base.position.y = 5;
      g.add(base);
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(2.4, 1), new THREE.MeshBasicMaterial({ color: 0xfff200 }));
      core.position.y = 12.5;
      g.add(core);
      const shieldDome = new THREE.Mesh(
        new THREE.SphereGeometry(6.5, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xff8f20, transparent: true, opacity: 0.25, wireframe: true })
      );
      shieldDome.position.y = 7;
      g.add(shieldDome);
    } else if (kind === 'acid_dreadnought') {
      const orbMat = createPrototypeShader(0xff7f00, 0x9a3800, 4, 0x00ff66);
      const sphere = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(5.5, 16, 16), orbMat), 1.04);
      g.add(sphere);
      const acidVat = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.4, 3.2, 12), new THREE.MeshBasicMaterial({ color: 0x44ffaa }));
      acidVat.position.set(0, -4.5, 0);
      g.add(acidVat);
    } else if (kind === 'tandem_terminal') {
      const termMat = createPrototypeShader(0x6a1b9a, 0x220038, 1, 0xff00ff);
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(4.2, 9, 4.2), termMat);
      pillar.position.y = 4.5;
      g.add(pillar);
      const holoOrb = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 10), new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true }));
      holoOrb.position.y = 11.2;
      g.add(holoOrb);
    }

    scene.add(g);
    const hpVal = kind === 'acid_dreadnought' ? 8500 : 3200;
    const constructEnemy = {
      type: kind === 'acid_dreadnought' ? 'heli' : 'tank',
      _isStoryConstruct: true,
      _constructKind: kind,
      group: g,
      hp: hpVal,
      maxHp: hpVal,
      vel: new THREE.Vector3(),
      speed: kind === 'acid_dreadnought' ? 7 : 0,
      radius: kind === 'acid_dreadnought' ? 5.8 : 4.2,
      attackCd: 2.2,
      dodgeCd: 99,
      flying: kind === 'acid_dreadnought',
      _rooted: 0
    };
    enemies.push(constructEnemy);
    return constructEnemy;
  }

  // Эффект «КРА-КА-БУМ! Возвращение Хохлоркови + Треугольник дронов Код Родотенанц-Восстановление» (Глава 7)
  function triggerKhokhlorkovReturnAndRodotenanc(centerPos) {
    // 1. Радужно-зеленый небесный столб света КРА-КА-БУМ!
    if (StoryCampaign.rainbowBeam && StoryCampaign.rainbowBeam.parent) {
      scene.remove(StoryCampaign.rainbowBeam);
    }
    const beamGroup = new THREE.Group();
    beamGroup.position.set(centerPos.x, 0, centerPos.z);
    const rainbowCols = [0x2ecc71, 0xfff200, 0xff5500, 0x00f2fe];
    rainbowCols.forEach((col, i) => {
      const cyl = new THREE.Mesh(
        new THREE.CylinderGeometry(2.5 + i * 1.4, 2.5 + i * 1.4, 180, 16, 1, true),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35 - i * 0.06, side: THREE.DoubleSide, depthWrite: false })
      );
      cyl.position.y = 90;
      beamGroup.add(cyl);
    });
    scene.add(beamGroup);
    StoryCampaign.rainbowBeam = beamGroup;
    setTimeout(() => {
      if (beamGroup.parent) scene.remove(beamGroup);
    }, 9000);

    // 2. Треугольник из 3 золотых дронов Димона Лимона с лазерной сетью («Код Родотенанц-Восстановление»)
    if (StoryCampaign.rodotenancDrones && StoryCampaign.rodotenancDrones.parent) {
      scene.remove(StoryCampaign.rodotenancDrones);
    }
    const droneTriGroup = new THREE.Group();
    droneTriGroup.position.set(centerPos.x, 3.2, centerPos.z);
    const pts = [];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const dx = Math.cos(a) * 14, dz = Math.sin(a) * 14;
      pts.push(new THREE.Vector3(dx, 0, dz));
      const dMesh = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 10), new THREE.MeshBasicMaterial({ color: 0xfff200 }));
      dMesh.position.set(dx, 0, dz);
      droneTriGroup.add(dMesh);
    }
    pts.push(pts[0].clone());
    const laserGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const laserLine = new THREE.Line(laserGeo, new THREE.LineBasicMaterial({ color: 0xfff200 }));
    droneTriGroup.add(laserLine);
    scene.add(droneTriGroup);
    StoryCampaign.rodotenancDrones = droneTriGroup;

    // 3. Союзный гигант Хохлорковь с двумя корневыми дубинами на поле боя!
    const allyCarrot = createCarrotGiantMesh();
    allyCarrot.position.set(centerPos.x + 6, 0, centerPos.z + 6);
    const clubMat = createPrototypeShader(0x8b5a2b, 0x3e1a04, 7, 0x2ecc71);
    if (allyCarrot.userData && allyCarrot.userData.armL && allyCarrot.userData.armR) {
      for (let arm of [allyCarrot.userData.armL, allyCarrot.userData.armR]) {
        const club = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.25, 3.8, 7), clubMat), 1.05);
        club.position.set(0, -2.2, 1.2);
        club.rotation.x = Math.PI / 2.3;
        arm.elbow.add(club);
      }
    }
    droneTriGroup.add(allyCarrot);
    allyCarrot.position.set(0, -3.2, 0);

    spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 6, 0)), '🌈 КРА-КА-БУМ! ХОХЛОРКОВЬ ВЕРНУЛСЯ!', '#2ecc71');
    SoundFX.devastator();
    SoundFX.boom();
  }

  // Активация «Протокола: Титан Мультифрукта» в Финальной 10-й главе (Часть 12, стр. 3)
  function activateMultifruitTitanProtocol() {
    player._multifruitTitanActive = true;
    player.maxHp = Math.max(player.maxHp, 1500);
    player.hp = player.maxHp;
    player.maxEn = Math.max(player.maxEn, 800);
    player.en = player.maxEn;

    if (!player._titanAuraMesh) {
      const auraGroup = new THREE.Group();
      const greenShell = new THREE.Mesh(
        new THREE.SphereGeometry(2.3, 14, 14),
        new THREE.MeshBasicMaterial({ color: 0x7cfc00, transparent: true, opacity: 0.28, wireframe: true })
      );
      greenShell.position.y = 1.8;
      const berryShell = new THREE.Mesh(
        new THREE.SphereGeometry(2.6, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xff0055, transparent: true, opacity: 0.22, wireframe: true })
      );
      berryShell.position.y = 1.8;
      auraGroup.add(greenShell, berryShell);
      playerGroup.add(auraGroup);
      player._titanAuraMesh = auraGroup;
    }

    spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 5.5, 0)), '🧬 ПРОТОКОЛ: ТИТАН МУЛЬТИФРУКТА АКТИВИРОВАН!', '#7cfc00');
    SoundFX.devastator();
    triggerHitstopAndChroma(0.18, 1.2, 1.6);
    updateHUD();
  }

  function startStoryChapter(ch) {
    StoryCampaign.chapter = ch;
    StoryCampaign.objectives = [];
    StoryCampaign.bossEntity = null;
    ensureStoryWaypointMesh();

    const titleEl = document.getElementById('story-ch-title');
    const descEl = document.getElementById('story-ch-desc');

    if (ch === 1) {
      titleEl.innerText = '📖 ГЛАВА 1/10: ПРОБУЖДЕНИЕ ОРАНЖ';
      descEl.innerText = 'Уничтожьте 3 Якоря Цитрус Дефенс вокруг Штаба BI (0/3)';
      showComicCutsceneBanner(
        'ЧАСТЬ 5: АПЕЛЬСИНОВАЯ ОРДА',
        '🍊',
        '#ff7f00',
        '<b>Грейпстасик:</b> «Мои воины! Моя гордость! Якоря Цитрус Дефенс... их единственная цель — уничтожение!»'
      );
      [[0, -45], [-68, 22], [68, 22]].forEach(([x, z]) => {
        StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'anchor'));
        spawnCitrusSoldier(x + 6, z + 6, 'leader');
      });
    } else if (ch === 2) {
      titleEl.innerText = '📖 ГЛАВА 2/10: АРМИЯ НА МАРШЕ';
      descEl.innerText = 'Разгромите легион Orange Sentinels и командира Orange Captain!';
      showComicCutsceneBanner(
        'АРМИЯ НА МАРШЕ',
        '🤖',
        '#eb2f06',
        '<b>Orange Captain:</b> «Банан-Индастриз — это вчера! Цитрус Дефенс — это завтра! Мои апельсиновые воины идут!»'
      );
      const basePt = new THREE.Vector3(0, 0, 95);
      StoryCampaign.targetPos.copy(basePt);
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2;
        const s = spawnCitrusSoldier(basePt.x + Math.cos(ang) * 16, basePt.z + Math.sin(ang) * 16, i % 2 === 0 ? 'leader' : 'shield');
        StoryCampaign.objectives.push(enemies[enemies.length - 1]);
      }
    } else if (ch === 3) {
      titleEl.innerText = '📖 ГЛАВА 3/10: НОВАЯ УГРОЗА — КИСЛОТНЫЙ ДРЕДНОУТ';
      descEl.innerText = 'Сбейте Кислотный Апельсин-Дредноут и рой Виноградных Пауков!';
      showComicCutsceneBanner(
        'ЧАСТЬ 6: КИСЛОТНЫЙ ТРИУМФ',
        '🍇',
        '#6a1b9a',
        '<b>Грейпстасик:</b> «Банан-Индастриз... весь этот сладкий, мягкий мир... он будет стёрт!»'
      );
      StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(-85, 18, -75, 'acid_dreadnought'));
      for (let i = 0; i < 3; i++) {
        StoryCampaign.objectives.push(window.spawnGrapeSpiderDrone(-85 + (i - 1) * 10, -75));
      }
    } else if (ch === 4) {
      titleEl.innerText = '📖 ГЛАВА 4/10: ОГНЕННЫЙ УДАР... ПРОВАЛ?';
      descEl.innerText = 'Пробейте броню Кислотного Центуриона Грейпстасика!';
      showComicCutsceneBanner(
        'БОЙ МУЛЬТИФРУКТОВ',
        '🛡️',
        '#8e44ad',
        '<b>Кислотный Центурион:</b> «Слишком мягкие! Мой перец — это АБСОЛЮТНОЕ ПИТАНИЕ! Тандем Ягода-Чили — в атаку!»'
      );
      spawnGrapeWarlord(85, 95);
      if (activeBoss) {
        activeBoss.name = 'КИСЛОТНЫЙ ЦЕНТУРИОН («АБСОЛЮТНОЕ ПИТАНИЕ»)';
        StoryCampaign.bossEntity = activeBoss;
      }
    } else if (ch === 5) {
      titleEl.innerText = '📖 ГЛАВА 5/10: ПРОЕКТ «КИСЛОТНЫЙ ТАНДЕМ»';
      descEl.innerText = 'Победите Меха-Грейпстасика на гусеничном шасси!';
      showComicCutsceneBanner(
        'ГРООО-ОО-ОМ! ВУ!',
        '🍇',
        '#5b1e82',
        '<b>Грейпстасик:</b> «Я Грейпстасик! Я — твой ад! Проект "Кислотный Тандем" активирован — статус: ТРИУМФ!»'
      );
      StoryCampaign.bossEntity = window.spawnGrapestasikBoss(0, -110);
    } else if (ch === 6) {
      titleEl.innerText = '📖 ГЛАВА 6/10: ЧАСТЬ XI — ПОЯВЛЕНИЕ БИО-ГРЕЙПСТАСИКА';
      descEl.innerText = 'Сразитесь с Био-Монстром Грейпстасиком («Истинная Горечь»)!';
      showComicCutsceneBanner(
        'ЧАСТЬ 11: ПРОРЫВ ИЗ ПРОШЛОГО — КРАШШШШШ!',
        '👾',
        '#3a1058',
        '<b>Димон Лимон:</b> «Я сканирую код Хохлоркова... Энергетический фон зашкаливает! Что-то *КИСЛОЕ*... *ГОРЬКОЕ*!»<br><b>Био-Грейпстасик:</b> «Я ГРЕЙПСТАСИК! Ваша "Симбиоз" — это гниль! Я перепрограммирую этот мир на ИСТИННУЮ ГОРЕЧЬ!»',
        9500
      );
      // Фиолетовый вихрь в небе над ареной (из Части 11!)
      if (!StoryCampaign.skyVortex) {
        const vortex = new THREE.Mesh(
          new THREE.RingGeometry(8, 65, 32),
          new THREE.MeshBasicMaterial({ color: 0xb833ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, wireframe: true })
        );
        vortex.rotation.x = Math.PI / 2;
        vortex.position.set(0, 95, -65);
        scene.add(vortex);
        StoryCampaign.skyVortex = vortex;
      }
      StoryCampaign.bossEntity = window.spawnBioMonsterGrapestasik(0, -65);
    } else if (ch === 7) {
      titleEl.innerText = '📖 ГЛАВА 7/10: ВОЗВРАЩЕНИЕ ХОХЛОРКОВИ И КОД «РОДОТЕНАНЦ»';
      descEl.innerText = 'Добивайте Био-Грейпстасика вместе с Хохлорковью и дронами Родотенанц!';
      showComicCutsceneBanner(
        'НЕОЖИДАННАЯ НАДЕЖДА — КРА-КА-БУМ!',
        '🥕',
        '#2ecc71',
        '<b>Хохлорковь:</b> «Вы забыли обо Мне, Грейпстасик! Я помню Каждый Грамм Горечи. И я Поглотил её!»<br><b>Димон Лимон:</b> «*КОД "РОДОТЕНАНЦ-ВОССТАНОВЛЕНИЕ"*! Вместе мы — МУЛЬТИФРУКТ-ПОБЕДИТЕЛЬ!»',
        9500
      );
      const b = window.spawnBioMonsterGrapestasik(0, -65);
      b.hp = Math.round(b.maxHp * 0.65);
      StoryCampaign.bossEntity = b;
      triggerKhokhlorkovReturnAndRodotenanc(new THREE.Vector3(0, 0, -55));
    } else if (ch === 8) {
      titleEl.innerText = '📖 ГЛАВА 8/10: ЧАСТЬ XII — ЛИПКОЕ ВТОРЖЕНИЕ ЖИРИГОРЯ';
      descEl.innerText = 'Протокол «Морозильная Установка»: заморозьте Жиригоря на [C] и атакуйте!';
      showComicCutsceneBanner(
        'ЧАСТЬ 12: ВОСХОЖДЕНИЕ ЖИРИГОРЯ',
        '💛',
        '#d4a017',
        '<b>Жиригорь (Jirigory):</b> «Приветствую, мои сочные! Я Жиригорь, и я пришёл за своим "Золотым Стандартом"! Истинный Жир не горит, не растворяется... он просто ПОГЛОЩАЕТ!»<br><b>Егорбанан:</b> «Шрекич! Экстренный Протокол: "ЖИРОВАЯ УГРОЗА"! Включаем морозильную установку [C]!»',
        9500
      );
      StoryCampaign.bossEntity = window.spawnJirigoryBoss(45, -45, false);
    } else if (ch === 9) {
      titleEl.innerText = '📖 ГЛАВА 9/10: ТРИУМФ НАНОЯГОД И ЛИМОННОЙ ТАКТИКИ';
      descEl.innerText = 'Растворите броню Жиригоря Кислотной Коррозией и комбо Тандема!';
      showComicCutsceneBanner(
        'ДИМОН ЛИМОН: КИСЛЫЙ ДОЖДЬ И КОРРОЗИЯ!',
        '🍋',
        '#88ff00',
        '<b>Димон Лимон:</b> «Морозилка была лишь временным решением! Но Жиригорь не любит кислоту! Попробуй это, Жир — настоящая лимонная КОРРОЗИЯ!»',
        8500
      );
      const jBoss = window.spawnJirigoryBoss(45, -45, false);
      jBoss._fatShieldBroken = true;
      jBoss.hp = Math.round(jBoss.maxHp * 0.7);
      StoryCampaign.bossEntity = jBoss;
    } else if (ch === 10) {
      titleEl.innerText = '🔥 ФИНАЛ (10/10): ТИТАНЫ БАЛАНСА ПРОТИВ ЖИРНОГО АРМАГЕДДОНА';
      descEl.innerText = 'Активирован Протокол «Титан Мультифрукта»! Испарите Мега-Жиригоря!';
      showComicCutsceneBanner(
        'ПРОТОКОЛ: ТИТАН МУЛЬТИФРУКТА — КОМБИНИРОВАННЫЙ УДАР!',
        '🌈',
        '#ff0055',
        '<b>Егорбанан и Димон Лимон:</b> «Он использует холод для жирной рекристаллизации! Активация: Мультифрукт-Ядро! Код Родотенанц-Восстановление: *ТАНДЕМ БАЛАНСА*!»<br><b>Жиригорь:</b> «Аргх! Мой... Жир! Он... *испаряется*!»',
        10500
      );
      activateMultifruitTitanProtocol();
      StoryCampaign.bossEntity = window.spawnJirigoryBoss(0, -75, true);
    } else {
      StoryCampaign.completed = true;
      titleEl.innerText = '🏆 КАМПАНИЯ ПРОЙДЕНА: ЭРА МУЛЬТИФРУКТ-ПОБЕДИТЕЛЕЙ!';
      descEl.innerText = 'Грейпстасик и Жиригорь повержены! Награда: +10 000 EP [Нажмите N для новой кампании]';
      document.getElementById('story-ch-dist').innerText = '⭐ Тандем Наноягода-Лимон-Перец-Хохлорковь победил! *ЗУМ... СИНТЕЗ ПОЛНЫЙ!*';
      if (StoryCampaign.waypointBeam) StoryCampaign.waypointBeam.visible = false;
      if (StoryCampaign.waypointRing) StoryCampaign.waypointRing.visible = false;
      if (StoryCampaign.skyVortex && StoryCampaign.skyVortex.parent) scene.remove(StoryCampaign.skyVortex);
      if (StoryCampaign.rodotenancDrones && StoryCampaign.rodotenancDrones.parent) scene.remove(StoryCampaign.rodotenancDrones);
      player.ep += 10000;
      player.score += 100000;
      updateHUD();
      updateScoreDisplay();
      showComicCutsceneBanner(
        'ТРИУМФ МУЛЬТИФРУКТА!',
        '🏆',
        '#2ecc71',
        '<b>Егорбанан, Димон Лимон, Капитан Перец и Хохлорковь:</b> «Мы сделали это! Жир застыл, Горечь повержена! Это начало новой мультифруктовой эры!»',
        12000
      );
    }
  }

  setTimeout(() => {
    startStoryChapter(1);
  }, 900);

  // Клавиша [N] — перезапуск кампании или пропуск к следующей главе для тестирования
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyN' && gameStarted && !player.isDead) {
      if (StoryCampaign.completed) startStoryChapter(1);
      else startStoryChapter(StoryCampaign.chapter + 1);
    }
  });

  // ─── РАДУЖНЫЙ УДАР БАЛАНСА В 10-Й ГЛАВЕ ПРИ АТАКЕ ТИТАНА МУЛЬТИФРУКТА ───
  const _origPPATitan = window.performPrimaryAttack;
  window.performPrimaryAttack = function () {
    if (_origPPATitan) _origPPATitan.apply(this, arguments);
    if (player._multifruitTitanActive && StoryCampaign.chapter === 10) {
      const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
      const chest = player.pos.clone().add(new THREE.Vector3(0, 2.3, 0));
      spawnSlashArc(chest.clone().add(fwd.clone().multiplyScalar(3)), player.facingYaw, 0, 0x7cfc00, 8.5, 0.25);
      spawnSlashArc(chest.clone().add(fwd.clone().multiplyScalar(4)), player.facingYaw, 0.3, 0xff00ff, 9.5, 0.28);
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.group.position.distanceTo(player.pos) <= 18) {
          damageEnemy(e, 450, fwd.clone().multiplyScalar(8), '*🌈 ТАНДЕМ БАЛАНСА!*');
        }
      }
    }
  };

  // Цикл обновления Сюжетной Кампании
  setInterval(() => {
    if (!gameStarted || player.isDead || StoryCampaign.completed) return;

    const ch = StoryCampaign.chapter;
    const descEl = document.getElementById('story-ch-desc');
    const distEl = document.getElementById('story-ch-dist');
    const nowSec = performance.now() * 0.001;

    if (StoryCampaign.skyVortex) {
      StoryCampaign.skyVortex.rotation.z += 0.08;
    }
    if (StoryCampaign.rodotenancDrones) {
      StoryCampaign.rodotenancDrones.rotation.y += 0.04;
      // Лазерный треугольник дронов Родотенанц жжет Био-Грейпстасика!
      if (StoryCampaign.bossEntity && StoryCampaign.bossEntity.hp > 0) {
        damageEnemy(StoryCampaign.bossEntity, 120, new THREE.Vector3(), '');
      }
    }

    if (ch === 1 || ch === 2 || ch === 3) {
      StoryCampaign.objectives = StoryCampaign.objectives.filter((obj) => obj && obj.hp > 0 && enemies.indexOf(obj) !== -1);
      if (StoryCampaign.objectives.length === 0) {
        SoundFX.devastator();
        player.ep += 300;
        player.score += 5000;
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
      if (descEl) descEl.innerText = `Целей текущей главы осталось: ${StoryCampaign.objectives.length} (Нажмите [N] для пропуска главы)`;
    } else if (ch >= 4 && ch <= 10) {
      const b = StoryCampaign.bossEntity;
      if (!b || b.hp <= 0 || enemies.indexOf(b) === -1) {
        SoundFX.devastator();
        player.ep += 600;
        player.score += 10000;
        updateHUD();
        updateScoreDisplay();
        startStoryChapter(ch + 1);
        return;
      }
      // В Главе 6, когда HP Био-Грейпстасика падает ниже 65%, автоматически начинается Глава 7 (Возвращение Хохлоркови КРА-КА-БУМ!)
      if (ch === 6 && b.hp / b.maxHp <= 0.65) {
        startStoryChapter(7);
        return;
      }
      // В Главе 8, когда Жиригоря заморозили и сняли ему 30% HP, переходим к Главе 9 (Кислотная Коррозия Димона Лимона)
      if (ch === 8 && b.hp / b.maxHp <= 0.72) {
        startStoryChapter(9);
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
      const distMeters = Math.round(player.pos.distanceTo(StoryCampaign.targetPos));
      if (distEl) distEl.innerText = `📍 ДО СЮЖЕТНОЙ ЦЕЛИ: ${distMeters} М | [N] — СЛЕДУЮЩАЯ ГЛАВА СЮЖЕТА`;
    }
  }, 100);

  // Отрисовка золотого маркера сюжетной цели на мини-карте
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
  // ═══ 6. ВСЕ СИСТЕМЫ v53: ДЕНЬ/НОЧЬ, ЩИТ, ШРЕКИЧ [B], T-СИНТЕЗ, КАРТОШКА/ТОМАТ
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
      dmg = Math.floor(dmg * 0.45);
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
            damageEnemy(enemies[i], 3000, new THREE.Vector3(0, 15, 0), '*СИНТЕЗ!*');
          }
        }
        if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'nano_ult', radius: 50 });
        if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 5, 0)), '⚡ БОЖЕСТВЕННЫЙ СИНТЕЗ! ⚡', '#00f2fe');
        if (typeof SoundFX !== 'undefined') { SoundFX.devastator(); SoundFX.boom(); }
      }
    }
  }, 100);

  // F-способности
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

  // ─── 5-Й ПЕРСОНАЖ: МОРГЕНКАРТОШКА & ГРОМТОМАТ + TOAST И ФРАЗЫ (100% СОХРАНЕНИЕ) ───
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

  console.log("🍌 [PATCH v80] Готово: Гарпун Хохлоркови тянет напрямую к зданиям (320 м/с), 10 глав сюжета (Грейпстасик + Жиригорь + Титан Мультифрукта) и 3D Крио-Куб активны.");
})();
