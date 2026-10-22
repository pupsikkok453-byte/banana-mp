// ============================================================================
// BANANA INDUSTRIES — GLOBAL PATCH v90 (ULTIMATE CAMPAIGN, BOSS & WORLD EDITION)
// • Гарпун Хохлоркови: дальность уменьшена в 3 раза (750м), плавная скорость (110 м/с)
// • Хардкорные Боссы с уникальными фазами, спец-атаками, гравитацией и цунами
// • 6 новых видов врагов (Sentinel, Juggernaut, Паук-Прыгун, Алхимик, Жировик, Крио-Оса)
// • Живая карта: Био-купола лечения, Ульи Симбиота, Золотые гейзеры, Блокпосты Citrus
// • 16 разнообразных глав сюжета (Оборона, Перехват конвоя, Взлом точек, Сбор, Боссы)
// • 100% сохранение всех 5 героев, 3D Крио-Куба [C], костюмов, фраз и правок v53–v80
// ============================================================================
(function () {
  'use strict';
  console.log("🍌 [PATCH v90] Загружен: Гарпун 750м, 16 глав кампании, усиленные боссы, новые враги и живая карта.");

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
    if (typeof renderer !== 'undefined') renderer.toneMappingExposure = 1.36;
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
  // ═══ 1. СБАЛАНСИРОВАННЫЙ ЛИАНОВЫЙ ГАРПУН ХОХЛОРКОВИ (750 М, ПЛАВНЫЙ ПОЛЁТ)
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

  // Увеличенная дальность комбо-ударов Хохлоркови (ЛКМ)
  window.carrotPrimaryAttack = function () {
    if (player.attackTimer > 0.08) return;
    if (!player.isGrounded && !player.isWallRunning && !player.isFlying && player.pos.y > 4 && CARROT_FORM === 1 && !player._activeGrapple) {
      if (!player.isBulletdropping) {
        player.isBulletdropping = true;
        player.vel.y = -72;
        const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
        player.vel.x = fwd.x * 26;
        player.vel.z = fwd.z * 26;
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
      player.vel.x += fwd.x * 12;
      player.vel.z += fwd.z * 12;
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
      { dur: 0.21, tilt: -0.2, r: 11.5, lunge: 15, dmg: 1.15, label: '*ХЛЫСТ ЛОЗОЙ!*' },
      { dur: 0.21, tilt: 0.2,  r: 11.5, lunge: 15, dmg: 1.15, label: '*ХЛЫСТ ЛОЗОЙ!*' },
      { dur: 0.30, tilt: 0,    r: 14.5, lunge: 16, dmg: 1.35, label: '*360° БОТВА!*', spin: true },
      { dur: 0.34, tilt: -0.5, r: 12.5, lunge: 15, dmg: 1.55, label: '*КОРНЕВОЙ АППЕРКОТ!*', launch: true },
      { dur: 0.46, tilt: -1.0, r: 15.5, lunge: 24, dmg: 2.25, label: '*КОРНЕВОЙ ШКВАЛ!*', finisher: true }
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

  // ─── ДАЛЬНОСТЬ ГАРПУНА УМЕНЬШЕНА В 3 РАЗА (750 М) + КОНТРОЛИРУЕМАЯ СКОРОСТЬ ───
  let _newVineCd = 0;
  const VINE_CD = 0.55;
  const HARPOON_MAX_RANGE = 750; // Уменьшено в 3 раза с 2250м!
  player._activeGrapple = null;

  function findBestBuildingGrapplePoint(origin, fwd3D, fwdFlat) {
    const rc = new THREE.Raycaster();
    rc.set(origin, fwd3D);
    rc.far = HARPOON_MAX_RANGE;
    const hits3D = rc.intersectObjects(buildingMeshes, false).filter((h) => h.point.y > 0.8);
    if (hits3D.length > 0) {
      return { point: hits3D[0].point, distance: hits3D[0].distance };
    }

    const pitchOffsets = [0.06, -0.05, 0.14, 0.22];
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

    let bestB = null;
    let bestScore = Infinity;
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      if (!b || b.topY < 8) continue;
      const targetY = Math.min(b.topY - 0.8, Math.max(player.pos.y + 6, b.topY * 0.72));
      const bPos = new THREE.Vector3(b.x, targetY, b.z);
      const toB = bPos.clone().sub(origin);
      const dist = toB.length();
      if (dist < 6 || dist > HARPOON_MAX_RANGE) continue;
      const dotFlat = new THREE.Vector3(toB.x, 0, toB.z).normalize().dot(fwdFlat);
      if (dotFlat < 0.72) continue;
      const score = dist * (1.25 - dotFlat);
      if (score < bestScore) {
        bestScore = score;
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

  function startContinuousGrapplePull(targetPoint, options = {}) {
    const origin = player.pos.clone().add(new THREE.Vector3(0, 2.0, 0));
    const dist = origin.distanceTo(targetPoint);
    // Сбалансированная скорость полёта (90–125 м/с вместо 320–400 м/с), чтобы не улетать за карту
    const pullSpeed = options.speed || Math.min(125, Math.max(85, dist * 0.9));
    const maxDuration = Math.min(2.4, Math.max(0.2, dist / pullSpeed + 0.12));

    let vineTendril = null;
    if (typeof OrganicTendril3D === 'function') {
      vineTendril = new OrganicTendril3D(scene, origin.clone(), targetPoint.clone(), 0x2ecc71, 0.42, maxDuration + 0.12);
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
    player.dodgeIframes = Math.max(player.dodgeIframes, maxDuration + 0.2);
    player.facingYaw = Math.atan2(-(targetPoint.x - player.pos.x), -(targetPoint.z - player.pos.z));
    if (typeof postUniforms !== 'undefined') postUniforms.uRadialBlur.value = 0.85;
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
    const fwd3D = new THREE.Vector3(
      -Math.sin(player.camYaw) * cosP,
      -Math.sin(player.camPitch || 0),
      -Math.cos(player.camYaw) * cosP
    ).normalize();
    const fwdFlat = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw)).normalize();

    const buildHit = findBestBuildingGrapplePoint(origin, fwd3D, fwdFlat);
    const buildingDist = buildHit ? buildHit.distance : Infinity;

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

      if (isElite || bestEnemyDist > 36) {
        spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), `*🌿 ГАРПУН-ТАРАН (${Math.round(bestEnemyDist)}М)!*`, '#ff2200');
        startContinuousGrapplePull(tp, { speed: 120, enemyRef: bestEnemy });
      } else {
        if (activeTendrils.length < 10) {
          activeTendrils.push(new OrganicTendril3D(scene, origin.clone(), tp.clone(), 0x2ecc71, 0.44, 0.45));
        }
        spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), '*ИДИ СЮДА!*', '#2ecc71');
        const capE = bestEnemy;
        capE._rooted = 0.9;
        const pullTarget = player.pos.clone().add(fwdFlat.clone().multiplyScalar(2.6));
        let pullStep = 0;
        const pullEnemyInterval = setInterval(() => {
          pullStep++;
          if (!capE || !capE.group || !capE.group.parent || pullStep >= 10) {
            clearInterval(pullEnemyInterval);
            if (capE && capE.group && capE.group.parent) {
              const st = carrotStats();
              spawnSlashArc(player.pos.clone().add(new THREE.Vector3(0, 2, 0)), player.facingYaw, 0, 0x2ecc71, 9.5, 0.35);
              damageEnemy(capE, st.dmg * 3.6, fwdFlat.clone().multiplyScalar(10), '*УДАР С РАЗВОРОТА!*');
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

    if (buildHit) {
      _newVineCd = VINE_CD;
      const hp = buildHit.point.clone();
      const distB = Math.round(buildHit.distance);
      SoundFX.swing(500);
      SoundFX.whip();
      spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), `*🌿 ТРОС К ЗДАНИЮ (${distB}М)!*`, '#2ecc71');
      startContinuousGrapplePull(hp, { speed: Math.min(125, Math.max(85, distB * 0.95)) });
      return;
    }

    // Короткий контролируемый рывок вперед (36м), если прицел направлен в пустое пространство
    _newVineCd = VINE_CD;
    const dashTarget = origin.clone().add(fwd3D.clone().multiplyScalar(36));
    dashTarget.y = Math.max(1.5, Math.min(origin.y + 14, dashTarget.y));
    SoundFX.swing(440);
    spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), '*🌿 ЛОЗОВОЙ РЫВОК!*', '#2ecc71');
    startContinuousGrapplePull(dashTarget, { speed: 95 });
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

  const _origRootBind = window.carrotRootBind;
  window.carrotRootBind = function () {
    if (!CARROT_MODE || player.isDead) return;
    player.carrotStamina = Math.max(40, player.carrotStamina);
    player.carrotRootBindCd = 0;
    if (_origRootBind) _origRootBind.apply(this, arguments);
    const bindRadius = CARROT_FORM === 2 ? 52 : 42;
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
  // ═══ 2. ПОКАДРОВЫЙ КОНТРОЛЛЕР ГАРПУНА С МЯГКИМ ТОРМОЖЕНИЕМ У ЗДАНИЙ
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

      if (player._activeGrapple) {
        const g = player._activeGrapple;
        g.timer += dt;

        if (g.enemyRef && g.enemyRef.group && g.enemyRef.group.parent) {
          g.targetPos.copy(g.enemyRef.group.position).add(new THREE.Vector3(0, 1.5, 0));
        }
        if (g.tendril) {
          g.tendril.targetEnd.copy(g.targetPos);
        }

        const toTarget = g.targetPos.clone().sub(player.pos);
        const dist = toTarget.length();
        const dir = dist > 0.001 ? toTarget.clone().divideScalar(dist) : new THREE.Vector3(0, 0, -1);

        // Отцепление по Пробелу с умеренным импульсом
        if (keys['Space'] && g.timer > 0.12) {
          player._activeGrapple = null;
          player.vel.set(dir.x * 26, Math.max(16, dir.y * 18 + 12), dir.z * 26);
          player.airFlipTimer = 0.38;
          SoundFX.swing(420);
        } else if (dist <= 3.5 || g.timer >= g.maxDuration) {
          player._activeGrapple = null;
          if (g.enemyRef && g.enemyRef.group && g.enemyRef.group.parent) {
            const st = carrotStats();
            player.pos.copy(g.targetPos);
            player.vel.set(0, 8, 0);
            damageEnemy(g.enemyRef, st.dmg * 5.2, dir.clone().multiplyScalar(10), '*СОКРУШИТЕЛЬНЫЙ ТАРАН!*');
            spawnParticles(g.targetPos.clone(), 0x2ecc71, 24);
            spawnGroundCrackRing(g.enemyRef.group.position, 0x2ecc71, 14);
            triggerHitstopAndChroma(0.10, 0.8, 1.3);
          } else {
            // Точная посадка на крышу или фасад здания без перелета!
            let vaultedToRoof = false;
            const pad = 2.6;
            for (let i = 0; i < buildings.length; i++) {
              const b = buildings[i];
              if (
                g.targetPos.x >= b.minX - pad && g.targetPos.x <= b.maxX + pad &&
                g.targetPos.z >= b.minZ - pad && g.targetPos.z <= b.maxZ + pad
              ) {
                if (g.targetPos.y >= b.topY - 6.0) {
                  const inwardX = Math.max(b.minX + 2, Math.min(b.maxX - 2, g.targetPos.x));
                  const inwardZ = Math.max(b.minZ + 2, Math.min(b.maxZ - 2, g.targetPos.z));
                  player.pos.set(inwardX, b.topY + 0.35, inwardZ);
                  player.vel.set(dir.x * 5, 2, dir.z * 5);
                  player.isGrounded = true;
                  vaultedToRoof = true;
                  spawnGroundCrackRing(player.pos, 0x2ecc71, 5);
                  break;
                } else {
                  player.pos.copy(g.targetPos);
                  player.vel.set(dir.x * 4, 14, dir.z * 4);
                  player.isWallRunning = true;
                  vaultedToRoof = true;
                  break;
                }
              }
            }
            if (!vaultedToRoof) {
              player.pos.copy(g.targetPos);
              player.vel.set(dir.x * 10, Math.max(4, dir.y * 8), dir.z * 10);
            }
            SoundFX.hit(160, 0.15);
          }
        } else {
          const step = Math.min(dist, g.speed * dt);
          player.pos.addScaledVector(dir, step);
          player.vel.set(dir.x * 8, dir.y * 8 + 38 * dt, dir.z * 8);
          player.facingYaw = Math.atan2(-dir.x, -dir.z);
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

      if (en._isJirigory) en._fatShieldBroken = true;

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
  // ═══ 4. НОВЫЕ РАЗНООБРАЗНЫЕ ВРАГИ И БОССЫ С АКТИВНЫМИ СПЕЦ-АТАКАМИ
  // ═══════════════════════════════════════════════════════════════════════════
  const worldHazards = []; // Лужи кислоты, золотого жира и гравитационные вихри

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

  // 1) Модернизация солдат в 4 разных подтипа: Sentinel, Juggernaut, Кислотный Алхимик, Крио-Оса
  function upgradeEnemyToComicSpec(en) {
    if (!en || !en.group || en._comicUpgraded) return;
    en._comicUpgraded = true;
    const g = en.group;

    // Назначаем случайный спец-архетип, если это обычный солдат
    const roll = Math.random();
    if (en.type === 'brawler' || en.type === 'shield') {
      en._archetype = 'juggernaut';
      en.hp *= 1.35;
      en.maxHp = en.hp;
    } else if (roll < 0.28) {
      en._archetype = 'alchemist'; // Кислотный Алхимик
    } else if (roll < 0.48) {
      en._archetype = 'wasp'; // Летающая Крио-Оса с джетпаком
      en.flying = true;
      en.group.position.y = 8 + Math.random() * 6;
      en.speed = 16;
    } else {
      en._archetype = 'sentinel'; // Orange Sentinel с нагрудным дуговым реактором
    }

    const reactorColor = en._archetype === 'juggernaut' ? 0xff00ff
      : (en._archetype === 'alchemist' ? 0x44ff00 : (en._archetype === 'wasp' ? 0x00f2fe : 0xfff200));

    const reactorCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.14, 12),
      new THREE.MeshBasicMaterial({ color: reactorColor })
    );
    reactorCore.rotation.x = Math.PI / 2;
    reactorCore.position.set(0, 2.42, 0.58);
    g.add(reactorCore);

    if (en._archetype === 'juggernaut') {
      // Двойные силовые щиты Джаггернаута
      const shMat = new THREE.MeshBasicMaterial({ color: 0xff5500, transparent: true, opacity: 0.45, wireframe: true });
      for (let s of [-1, 1]) {
        const sh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, 1.4), shMat);
        sh.position.set(s * 1.25, 2.0, 0.4);
        g.add(sh);
      }
    } else if (en._archetype === 'alchemist') {
      // Кислотные колбы за спиной Алхимика
      const tankMat = new THREE.MeshBasicMaterial({ color: 0x66ff00 });
      for (let s of [-0.35, 0.35]) {
        const vat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.1, 8), tankMat);
        vat.position.set(s, 2.4, -0.45);
        g.add(vat);
      }
    } else if (en._archetype === 'wasp') {
      // Крылья джетпака Осы
      const wingMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.65, side: THREE.DoubleSide });
      for (let s of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.08), wingMat);
        w.position.set(s * 1.1, 2.5, -0.3);
        w.rotation.z = s * 0.35;
        g.add(w);
      }
    }
  }

  // 2) Виноградный Паук-Прыгун (прыгает к игроку и ненадолго опутывает)
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
      type: 'brawler',
      _isGrapeDrone: true,
      _leapCd: 2.0 + Math.random() * 2.0,
      group: g,
      hp: 850,
      maxHp: 850,
      vel: new THREE.Vector3(),
      speed: 19,
      radius: 1.5,
      attackCd: 1.2,
      meleeCd: 0,
      meleeAnim: 0,
      _meleeDur: 0.35,
      dodgeCd: 99,
      flying: false,
      _rooted: 0
    };
    enemies.push(droneObj);
    return droneObj;
  };

  // 3) Золотой Жировик (Jiri-Spawn) — делится на 2 малых жировика при гибели!
  window.spawnGoldenFatBlob = function (x, z, isMini = false) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const sc = isMini ? 0.6 : 1.15;
    g.scale.setScalar(sc);
    const fatMat = createPrototypeShader(0xe8b828, 0x9c6e08, 4, 0xfff200);
    const body = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 10), fatMat), 1.04);
    body.scale.set(1.2, 0.85, 1.2);
    body.position.y = 1.1;
    g.add(body);
    const head = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 10), fatMat), 1.04);
    head.position.y = 2.2;
    g.add(head);
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    eyeL.position.set(-0.3, 2.35, 0.75);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.3;
    g.add(eyeL, eyeR);

    scene.add(g);
    const blob = {
      type: 'brawler',
      _isFatBlob: true,
      _isMiniBlob: isMini,
      group: g,
      hp: isMini ? 550 : 1250,
      maxHp: isMini ? 550 : 1250,
      vel: new THREE.Vector3(),
      speed: isMini ? 18 : 13,
      radius: 1.5 * sc,
      attackCd: 1.4,
      meleeCd: 0,
      meleeAnim: 0,
      _meleeDur: 0.4,
      dodgeCd: 99,
      flying: false,
      _rooted: 0
    };
    enemies.push(blob);
    return blob;
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

  // Перехват урона: Щит Центуриона, Жировая броня Жиригоря, Раскол льда x2 и Деление Жировиков
  const _origDamageEnemyV90 = window.damageEnemy;
  window.damageEnemy = function (en, dmg, knockVec, popText) {
    if (!en) return;

    // Адаптивный щит Кислотного Центуриона (требует мощного удара > 140 урона для пробития)
    if (en._isAcidCenturion && en._adaptiveShieldHp > 0) {
      if (dmg > 140) {
        en._adaptiveShieldHp -= dmg;
        popText = en._adaptiveShieldHp <= 0 ? '*💥 ЩИТ ЦЕНТУРИОНА ПРОБИТ!*' : '*⚡ ЩИТ ТРЕЩИТ!*';
        if (en._adaptiveShieldHp <= 0 && en._centurionShieldMesh) {
          en._centurionShieldMesh.visible = false;
        }
      } else {
        dmg *= 0.3;
        popText = '*🛡️ АБСОЛЮТНОЕ ПИТАНИЕ (НУЖЕН МОЩНЫЙ УДАР Q/F/КОМБО)!*';
      }
    }

    // Жировая защита Жиригоря в Главе 13 (пробивается заморозкой [C] или кислотой)
    if (en._isJirigory && !en._fatShieldBroken && en.frozen <= 0 && !LEMON_MODE && !player._multifruitTitanActive) {
      dmg *= 0.25;
      popText = '*💛 ЖИР ПОГЛОТИЛ УДАР! (ЗАМОРОЗЬТЕ НА [C] ИЛИ КИСЛОТОЙ)*';
    }

    // Двойной урон по замороженным целям
    if (en.frozen > 0 && !en._suppressShatterOnFreezeInit && dmg > 15) {
      dmg *= 2.0;
      popText = '*💎 РАСКОЛ ЛЬДА! x2*';
      if (en._iceCubePrison && en.hp - dmg <= 0) {
        clearTimeout(en._iceCubePrison.timerId);
        en._iceCubePrison.cleanup();
        en._iceCubePrison = null;
      }
    }

    const willDie = (en.hp - dmg * player.comboMult) <= 0;
    const deathPos = en.group ? en.group.position.clone() : null;
    const isBigFatBlob = en._isFatBlob && !en._isMiniBlob;

    const res = _origDamageEnemyV90.call(this, en, dmg, knockVec, popText);

    if (en.hp <= 0) {
      if (en._iceCubePrison) {
        clearTimeout(en._iceCubePrison.timerId);
        en._iceCubePrison.cleanup();
        en._iceCubePrison = null;
      }
      // Деление Золотого Жировика на 2 малых сгустка при смерти
      if (isBigFatBlob && deathPos && enemies.length < 30) {
        spawnHazardPool(deathPos, 4.5, 0xe8b828, 6.0, true);
        window.spawnGoldenFatBlob(deathPos.x + 2, deathPos.z, true);
        window.spawnGoldenFatBlob(deathPos.x - 2, deathPos.z, true);
      }
    }
    return res;
  };

  // ─── АКТИВНЫЙ ИИ БОССОВ И НОВЫХ ВРАГОВ (КАЖДЫЙ КАДР) ───
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
          continue;
        }

        // Спец-поведение новых архетипов врагов
        const distToP = en.group.position.distanceTo(player.pos);
        if (en._isGrapeDrone && distToP < 24 && distToP > 6) {
          en._leapCd = (en._leapCd || 2.5) - dt;
          if (en._leapCd <= 0) {
            en._leapCd = 3.2;
            const dir = player.pos.clone().sub(en.group.position).normalize();
            en.vel.set(dir.x * 38, 14, dir.z * 38);
            SoundFX.whip();
          }
        }
        if (en._archetype === 'alchemist' && distToP < 36) {
          en._acidThrowCd = (en._acidThrowCd || 3.5) - dt;
          if (en._acidThrowCd <= 0) {
            en._acidThrowCd = 4.5;
            const targetSpot = player.pos.clone();
            spawnHazardPool(targetSpot, 4.5, 0x55ff00, 5.0, false);
            spawnParticles(targetSpot.clone().add(new THREE.Vector3(0, 0.5, 0)), 0x55ff00, 10);
          }
        }
        if (en._archetype === 'wasp' && en.flying) {
          en.group.position.y = 9 + Math.sin(now * 0.004 + i) * 2.5;
        }
      }

      _origUpdateEnemiesV90.apply(this, arguments);

      // ─── УСИЛЕННЫЕ СПЕЦ-АТАКИ БОССОВ (КАЖДЫЕ НЕСКОЛЬКО СЕКУНД) ───
      if (activeBoss && activeBoss.hp > 0 && (!activeBoss.frozen || activeBoss.frozen <= 0)) {
        const b = activeBoss;
        b._specialTimer = (b._specialTimer || 3.0) - dt;
        const bPos = b.group.position;
        const dist = bPos.distanceTo(player.pos);

        if (b._specialTimer <= 0) {
          if (b._isAcidCenturion) {
            // Кислотный Центурион: Веер из 7 фиолетовых плазменных сфер + кислотное кольцо
            b._specialTimer = 3.2;
            spawnComicPop(bPos.clone().add(new THREE.Vector3(0, 9, 0)), '*🔮 КИСЛОТНЫЙ ШКВАЛ!*', '#ff00ff');
            SoundFX.devastator();
            const baseYaw = Math.atan2(player.pos.x - bPos.x, player.pos.z - bPos.z);
            for (let k = -3; k <= 3; k++) {
              const a = baseYaw + k * 0.18;
              const pr = new THREE.Mesh(new THREE.SphereGeometry(0.65, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff00ff }));
              pr.position.copy(bPos).add(new THREE.Vector3(0, 4.5, 0));
              scene.add(pr);
              projectiles.push({ mesh: pr, vel: new THREE.Vector3(Math.sin(a) * 42, 0, Math.cos(a) * 42), life: 2.5, fromPlayer: false, dmg: 26 });
            }
          } else if (b._isGrapestasik) {
            // Меха-Грейпстасик на гусеницах: Громовой рывок + залп молний «ГРООО-ОО-ОМ!»
            b._specialTimer = 2.8;
            spawnComicPop(bPos.clone().add(new THREE.Vector3(0, 10, 0)), '*⚡ ГРООО-ОО-ОМ! ВУ! ⚡*', '#d252ff');
            SoundFX.bossRoar();
            const dir = player.pos.clone().sub(bPos).normalize();
            b.vel.x = dir.x * 55;
            b.vel.z = dir.z * 55;
            spawnGroundCrackRing(bPos, 0xd252ff, 22);
            // Цепь молний по направлению к игроку
            for (let step = 1; step <= 4; step++) {
              setTimeout(() => {
                if (!b.group.parent) return;
                const strikePos = bPos.clone().addScaledVector(dir, step * 7);
                const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 24, 6), new THREE.MeshBasicMaterial({ color: 0xe066ff }));
                bolt.position.set(strikePos.x, 12, strikePos.z);
                scene.add(bolt);
                setTimeout(() => { scene.remove(bolt); bolt.geometry.dispose(); bolt.material.dispose(); }, 260);
                spawnGroundCrackRing(strikePos, 0xe066ff, 6);
                if (player.pos.distanceTo(strikePos) < 5.5) applyDamageToHero(28);
              }, step * 140);
            }
          } else if (b._isBioGrapestasik) {
            // Био-Монстр Грейпстасик: Гравитационный Вихрь Горечи (затягивает игрока) + Шипы Лоз!
            b._specialTimer = 3.0;
            spawnComicPop(bPos.clone().add(new THREE.Vector3(0, 11, 0)), '*🌀 ЧЁРНАЯ ДЫРА ИСТИННОЙ ГОРЕЧИ!*', '#b833ff');
            SoundFX.devastator();
            spawnGroundCrackRing(bPos, 0xb833ff, 28);
            // Гравитационное притяжение игрока к боссу, если он на земле или в воздухе в радиусе 32м
            if (dist < 32 && dist > 5) {
              const pull = bPos.clone().sub(player.pos).normalize().multiplyScalar(28);
              player.vel.x += pull.x;
              player.vel.z += pull.z;
            }
            // Взрывное кольцо через 0.7 сек после притяжения
            setTimeout(() => {
              if (!b.group.parent) return;
              spawnGroundCrackRing(bPos, 0xff0055, 18);
              spawnParticles(bPos.clone().add(new THREE.Vector3(0, 3, 0)), 0xb833ff, 25);
              if (player.pos.distanceTo(bPos) < 15 && player.pos.y < 6) {
                applyDamageToHero(38);
                player.vel.y = 18;
              }
            }, 700);
          } else if (b._isJirigory) {
            // Жиригорь / Мега-Жиригорь: Цунами Жира (Прыжок животом) + Разлив золотых луж
            b._specialTimer = 3.1;
            spawnComicPop(bPos.clone().add(new THREE.Vector3(0, 11, 0)), '*💛 ЦУНАМИ ЗОЛОТОГО СТАНДАРТА!*', '#fff200');
            SoundFX.boom();
            b.vel.y = 22;
            const dir = player.pos.clone().sub(bPos).normalize();
            b.vel.x = dir.x * 36;
            b.vel.z = dir.z * 36;
            setTimeout(() => {
              if (!b.group.parent) return;
              SoundFX.devastator();
              spawnGroundCrackRing(bPos, 0xe8b828, 26);
              spawnHazardPool(bPos, 10, 0xe8b828, 7.0, true);
              if (player.pos.distanceTo(bPos) < 20 && player.pos.y < 5) {
                applyDamageToHero(36);
                player.vel.y = 20;
              }
              if (enemies.filter((e) => e._isFatBlob).length < 4) {
                window.spawnGoldenFatBlob(bPos.x + (Math.random() - 0.5) * 14, bPos.z + (Math.random() - 0.5) * 14, false);
              }
            }, 650);
          }
        }
      }

      // Обработка опасных луж на земле (Кислота и Золотой Жир)
      for (let i = worldHazards.length - 1; i >= 0; i--) {
        const h = worldHazards[i];
        h.life -= dt;
        h.mesh.material.opacity = Math.max(0, 0.68 * (h.life / h.maxLife));
        if (player.pos.y < 1.5 && player.pos.distanceTo(h.pos) < h.radius) {
          if (h.isFatSlow) {
            player.vel.x *= 0.72;
            player.vel.z *= 0.72;
          }
          if (Math.random() < dt * 2.5) {
            applyDamageToHero(8);
          }
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

  // ─── СПАВН БОССОВ КАМПАНИИ С ПОВЫШЕННЫМ ЗДОРОВЬЕМ И ЩИТАМИ ───
  window.spawnAcidCenturionBoss = function (x, z) {
    spawnGrapeWarlord(x, z);
    if (activeBoss) {
      activeBoss._isAcidCenturion = true;
      activeBoss.name = 'КИСЛОТНЫЙ ЦЕНТУРИОН («АБСОЛЮТНОЕ ПИТАНИЕ»)';
      activeBoss.hp = 24000;
      activeBoss.maxHp = 24000;
      activeBoss._adaptiveShieldHp = 4500;
      const shMesh = new THREE.Mesh(
        new THREE.SphereGeometry(4.8, 14, 14),
        new THREE.MeshBasicMaterial({ color: 0xd252ff, transparent: true, opacity: 0.34, wireframe: true })
      );
      shMesh.position.y = 5.5;
      activeBoss.group.add(shMesh);
      activeBoss._centurionShieldMesh = shMesh;
      showBossHUD('🛡️ КИСЛОТНЫЙ ЦЕНТУРИОН («АБСОЛЮТНОЕ ПИТАНИЕ») 🛡️', 'ПРОБЕЙТЕ ФИОЛЕТОВЫЙ ЩИТ СПОСОБНОСТЯМИ [Q] / [F] / ФИНИШЕРОМ!');
    }
    return activeBoss;
  };

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
      hp: 34000, maxHp: 34000,
      vel: new THREE.Vector3(), speed: 12, radius: 4.8,
      attackCd: 1.5, windup: 0, dodgeCd: 99, flying: false,
      phase: 1, chargeCd: 3.0, lightningCd: 2.0, _phase2: false, _rooted: 0
    };
    enemies.push(activeBoss);
    showBossHUD('🍇 ГРЕЙПСТАСИК — ШТУРМ CITRUS DEFENSE 🍇', 'ОСТЕРЕГАЙТЕСЬ ГРОМОВОГО ТАРАНА И ЦЕПИ МОЛНИЙ!');
    SoundFX.bossRoar();
    return activeBoss;
  };

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

    const torso = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(3.2, 2.3, 6.4, 12), bioMat), 1.04);
    torso.position.y = 6.8;
    g.add(torso);

    const spiralCore = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.22, 8, 24), glowViolet);
    spiralCore.position.set(0, 6.2, 2.45);
    g.add(spiralCore);

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
      hp: 46000, maxHp: 46000,
      vel: new THREE.Vector3(), speed: 13.5, radius: 5.2,
      attackCd: 1.4, windup: 0, dodgeCd: 99, flying: false,
      phase: 1, chargeCd: 2.8, lightningCd: 1.8, _phase2: false, _rooted: 0
    };
    enemies.push(activeBoss);
    showBossHUD('🍇 БИО-ГРЕЙПСТАСИК — ЭССЕНЦИЯ ИСТИННОЙ ГОРЕЧИ 🍇', 'ОСТЕРЕГАЙТЕСЬ ЧЁРНЫХ ДЫР ГОРЕЧИ! СПИРАЛЬНОЕ ЯДРО — УЯЗВИМАЯ ТОЧКА!');
    SoundFX.bossRoar();
    return activeBoss;
  };

  window.spawnJirigoryBoss = function (x, z, isRecrystallized = false) {
    if (activeBoss) {
      activeBoss.hp = 0;
      damageEnemy(activeBoss, 999999, new THREE.Vector3(), '');
    }
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const scaleMult = isRecrystallized ? 1.48 : 1.05;
    g.scale.setScalar(scaleMult);

    const fatMat = createPrototypeShader(0xe8b828, 0x9c6e08, 4, 0xfff200);
    const hairMat = createPrototypeShader(0xf5d76e, 0xb8860b, 0, 0xffffff);

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

    const armLPivot = new THREE.Group(); armLPivot.position.set(-4.2, 8.2, 0); g.add(armLPivot);
    const armL = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.9, 4.6, 10), fatMat), 1.04);
    armL.position.y = -2.2; armLPivot.add(armL);
    const bracelet = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.22, 8, 12), new THREE.MeshStandardMaterial({ color: 0x8b5a2b }));
    bracelet.rotation.x = Math.PI / 2;
    bracelet.position.y = -4.0;
    armLPivot.add(bracelet);

    const armRPivot = new THREE.Group(); armRPivot.position.set(4.2, 8.2, 0); g.add(armRPivot);
    const armR = armL.clone(); armRPivot.add(armR);

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

    const maxHp = isRecrystallized ? 58000 : 36000;
    activeBoss = {
      type: 'brawler',
      _isBoss: true,
      _isJirigory: true,
      _fatShieldBroken: isRecrystallized,
      name: isRecrystallized ? 'МЕГА-ЖИРИГОРЬ (ЖИРНАЯ РЕКРИСТАЛЛИЗАЦИЯ)' : 'ЖИРИГОРЬ — ЗОЛОТОЙ СТАНДАРТ',
      group: g,
      armL: armLPivot, armR: armRPivot, legL: legLPivot, legR: legRPivot,
      neck: neck, ankle: belly,
      hp: maxHp, maxHp: maxHp,
      vel: new THREE.Vector3(), speed: isRecrystallized ? 11 : 9, radius: 5.5 * scaleMult,
      attackCd: 1.5, meleeCd: 0, meleeAnim: 0, _meleeDur: 0.5,
      dodgeCd: 99, flying: false, phase: 1, _phase2: isRecrystallized, _rooted: 0
    };
    enemies.push(activeBoss);
    showBossHUD(
      isRecrystallized ? '❄️💛 МЕГА-ЖИРИГОРЬ: ЖИРНЫЙ АРМАГЕДДОН 💛❄️' : '💛 ЖИРИГОРЬ — «ИСТИННЫЙ ЖИР» («ЗОЛОТОЙ СТАНДАРТ») 💛',
      isRecrystallized ? 'ИСПОЛЬЗУЙТЕ ПРОТОКОЛ ТИТАНА МУЛЬТИФРУКТА И УВЕРТЫВАЙТЕСЬ ОТ ЦУНАМИ!' : 'ЗАМОРОЗЬТЕ ЕГО НА [C] ИЛИ ИСПОЛЬЗУЙТЕ КИСЛОТУ ЛИМОНА!'
    );
    SoundFX.bossRoar();
    return activeBoss;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 5. ОБОГАЩЕНИЕ МИРА И КАРТЫ (БИО-КУПОЛА, БЛОКПОСТЫ, ТРАМПЛИНЫ, ГОЛОГРАММЫ)
  // ═══════════════════════════════════════════════════════════════════════════
  const worldJumpPads = [];
  const healingBioDomes = [];

  function buildRichWorldLandmarks() {
    if (typeof scene === 'undefined') return;

    // 1. Зеленые Купола Эко-Восстановления «Мультифрукта» (лечат игрока и восстанавливают энергию внутри)
    const domeCoords = [[220, -45], [-55, 115], [0, -15]];
    domeCoords.forEach(([dx, dz]) => {
      const g = new THREE.Group();
      g.position.set(dx, 0, dz);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(18, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, opacity: 0.18, wireframe: true })
      );
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(17.2, 18.5, 32),
        new THREE.MeshBasicMaterial({ color: 0x00ff66, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.12;
      const treeCore = new THREE.Mesh(
        new THREE.ConeGeometry(3.5, 12, 8),
        createPrototypeShader(0x2ecc71, 0x145a32, 8, 0xadff2f)
      );
      treeCore.position.y = 6;
      g.add(dome, ring, treeCore);
      scene.add(g);
      healingBioDomes.push({ pos: new THREE.Vector3(dx, 0, dz), radius: 18, mesh: dome });
    });

    // 2. Лазерные Ворота и Укрепрайоны CITRUS DEFENSE на главных улицах
    const gateCoords = [[0, 45, 0], [-90, 0, Math.PI / 2], [90, 0, Math.PI / 2], [0, -110, 0]];
    const gateMat = createPrototypeShader(0xff7f00, 0x4a1a00, 9, 0xfff200);
    gateCoords.forEach(([gx, gz, rotY]) => {
      const gate = new THREE.Group();
      gate.position.set(gx, 0, gz);
      gate.rotation.y = rotY;
      for (let s of [-12, 12]) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 18, 8), gateMat);
        pillar.position.set(s, 9, 0);
        gate.add(pillar);
      }
      const crossbar = new THREE.Mesh(new THREE.BoxGeometry(26, 2.2, 2.2), gateMat);
      crossbar.position.y = 18;
      gate.add(crossbar);
      const laserShield = new THREE.Mesh(
        new THREE.PlaneGeometry(22, 16),
        new THREE.MeshBasicMaterial({ color: 0xff5500, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
      );
      laserShield.position.y = 8.5;
      gate.add(laserShield);
      scene.add(gate);
    });

    // 3. Прыжковые платформы (Jump Pads) для быстрого подъема на высотки
    const padCoords = [
      [0, -24], [-48, -28], [48, -28], [0, 80],
      [-105, -75], [105, -75], [120, -110], [-140, 40]
    ];
    padCoords.forEach(([px, pz]) => {
      const padGroup = new THREE.Group();
      padGroup.position.set(px, 0.15, pz);
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(3.0, 3.6, 0.4, 16),
        createPrototypeShader(0x162868, 0x00f2fe, 2, 0x00f2fe)
      );
      const glowRing = new THREE.Mesh(
        new THREE.TorusGeometry(2.5, 0.18, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0x00ff66 })
      );
      glowRing.rotation.x = Math.PI / 2;
      glowRing.position.y = 0.28;
      padGroup.add(base, glowRing);
      scene.add(padGroup);
      worldJumpPads.push({ pos: new THREE.Vector3(px, 0, pz), ring: glowRing, cd: 0 });
    });
  }
  setTimeout(buildRichWorldLandmarks, 350);

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 6. БОЛЬШАЯ СЮЖЕТНАЯ КАМПАНИЯ ИЗ 16 РАЗНООБРАЗНЫХ ГЛАВ
  // ═══════════════════════════════════════════════════════════════════════════
  const StoryCampaign = {
    chapter: 1,
    totalChapters: 16,
    completed: false,
    mode: 'destroy', // 'destroy' | 'defend' | 'hack' | 'collect' | 'boss'
    objectives: [],
    collectibles: [],
    hackZones: [],
    defendTimer: 0,
    defendCore: null,
    waypointBeam: null,
    waypointRing: null,
    skyVortex: null,
    rodotenancDrones: null,
    targetPos: new THREE.Vector3(0, 0, -65),
    bossEntity: null
  };
  window.StoryCampaign = StoryCampaign;

  const storyHudEl = document.createElement('div');
  storyHudEl.id = 'story-campaign-hud';
  storyHudEl.style.cssText =
    'position:fixed;top:54px;left:50%;transform:translateX(-50%) skewX(-4deg);z-index:25;' +
    'min-width:480px;max-width:720px;background:linear-gradient(135deg,rgba(18,6,28,.95),rgba(40,10,18,.92));' +
    'border:3px solid #000;outline:3px solid #f9ca24;padding:8px 18px;text-align:center;' +
    'box-shadow:0 8px 25px rgba(0,0,0,.85),6px 6px 0 #000;pointer-events:auto;';
  storyHudEl.innerHTML =
    '<div id="story-ch-title" style="font-family:Bangers,Impact,sans-serif;font-size:19px;color:#f9ca24;letter-spacing:1.5px;text-shadow:2px 2px 0 #000;">📖 ГЛАВА 1/16: ПРОБУЖДЕНИЕ ОРАНЖ</div>' +
    '<div id="story-ch-desc" style="font-size:12px;font-weight:900;color:#fff;margin-top:2px;">Уничтожьте 3 Якоря Цитрус Дефенс</div>' +
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
    } else if (kind === 'symbiote_hive') {
      // Фиолетовый улей симбиота Грейпстасика (Глава 9)
      const hiveMat = createPrototypeShader(0x4a1268, 0x180028, 1, 0xff00ff);
      const mound = addInkOutline(new THREE.Mesh(new THREE.ConeGeometry(4.8, 11, 10), hiveMat), 1.04);
      mound.position.y = 5.5;
      g.add(mound);
      for (let i = 0; i < 6; i++) {
        const spore = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 8), new THREE.MeshBasicMaterial({ color: 0xd252ff }));
        const a = (i / 6) * Math.PI * 2;
        spore.position.set(Math.cos(a) * 3.5, 3 + (i % 2) * 2.5, Math.sin(a) * 3.5);
        g.add(spore);
      }
    } else if (kind === 'fat_geyser') {
      // Золотой гейзер био-полимера Жиригоря (Глава 12)
      const fatMat = createPrototypeShader(0xe8b828, 0x8a5800, 4, 0xfff200);
      const crater = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 5.0, 6, 12), fatMat);
      crater.position.y = 3;
      g.add(crater);
      const fountain = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.2, 14, 10), new THREE.MeshBasicMaterial({ color: 0xfff200, transparent: true, opacity: 0.75 }));
      fountain.position.y = 10;
      g.add(fountain);
    } else if (kind === 'arctic_pylon') {
      // Арктический пилон рекристаллизации (Глава 15)
      const iceMat = new THREE.MeshPhongMaterial({ color: 0x18c8ff, emissive: 0x053858, transparent: true, opacity: 0.8 });
      const shard = new THREE.Mesh(new THREE.ConeGeometry(3.8, 16, 6), iceMat);
      shard.position.y = 8;
      g.add(shard);
    }

    scene.add(g);
    const hpVal = kind === 'acid_dreadnought' ? 11000 : 4200;
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

  // Создание точки взлома (Hack Zone) для Главы 7
  function spawnHackZone(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const term = new THREE.Mesh(new THREE.BoxGeometry(2.2, 4.5, 2.2), createPrototypeShader(0x162868, 0x00f2fe, 2, 0x00ff66));
    term.position.y = 2.25;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(7.5, 8.5, 32),
      new THREE.MeshBasicMaterial({ color: 0x00f2fe, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.2;
    g.add(term, ring);
    scene.add(g);
    return { group: g, ring, pos: new THREE.Vector3(x, 0, z), progress: 0, hacked: false };
  }

  // Создание канистры Кислотного Катализатора на крышах для Главы 14
  function spawnAcidCanister(x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y + 1.8, z);
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.6, 12), new THREE.MeshBasicMaterial({ color: 0x66ff00 }));
    const halo = new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 10), new THREE.MeshBasicMaterial({ color: 0x44ffaa, wireframe: true }));
    g.add(cyl, halo);
    scene.add(g);
    return { group: g, pos: new THREE.Vector3(x, y + 1.8, z), collected: false };
  }

  function clearMissionProps() {
    StoryCampaign.hackZones.forEach((hz) => { if (hz.group.parent) scene.remove(hz.group); });
    StoryCampaign.hackZones = [];
    StoryCampaign.collectibles.forEach((c) => { if (c.group.parent) scene.remove(c.group); });
    StoryCampaign.collectibles = [];
    if (StoryCampaign.defendCore && StoryCampaign.defendCore.parent) {
      scene.remove(StoryCampaign.defendCore);
      StoryCampaign.defendCore = null;
    }
  }

  function triggerKhokhlorkovReturnAndRodotenanc(centerPos) {
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

    const allyCarrot = createCarrotGiantMesh();
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

  function activateMultifruitTitanProtocol() {
    player._multifruitTitanActive = true;
    player.maxHp = Math.max(player.maxHp, 1600);
    player.hp = player.maxHp;
    player.maxEn = Math.max(player.maxEn, 900);
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
    clearMissionProps();
    StoryCampaign.chapter = ch;
    StoryCampaign.objectives = [];
    StoryCampaign.bossEntity = null;
    ensureStoryWaypointMesh();

    const titleEl = document.getElementById('story-ch-title');
    const descEl = document.getElementById('story-ch-desc');

    switch (ch) {
      case 1:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 1/16: ПРОБУЖДЕНИЕ ОРАНЖ';
        descEl.innerText = 'Уничтожьте 3 Якоря Цитрус Дефенс вокруг Штаба BI';
        showComicCutsceneBanner(
          'ЧАСТЬ 5: АПЕЛЬСИНОВАЯ ОРДА', '🍊', '#ff7f00',
          '<b>Грейпстасик:</b> «Я, Грейпстасик, призываю вас! Вы — моя цитрусовая армия! Якоря Цитрус Дефенс... их единственная цель — уничтожение!»'
        );
        [[0, -45], [-68, 22], [68, 22]].forEach(([x, z]) => {
          StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'anchor'));
          spawnCitrusSoldier(x + 6, z + 6, 'leader');
        });
        break;

      case 2:
        StoryCampaign.mode = 'defend';
        StoryCampaign.defendTimer = 35.0;
        titleEl.innerText = '📖 ГЛАВА 2/16: ОБОРОНА ШТАБА BANANA INDUSTRIES';
        descEl.innerText = 'Защищайте Ядро Синтеза BI в течение 35 секунд от штурма Сентинелов!';
        showComicCutsceneBanner(
          'ОСАДА ШТАБА BI', '🛡️', '#00f2fe',
          '<b>Шрекич ИИ:</b> «Внимание! Апельсиновые легионеры прорвали периметр! Не дай им разрушить Центральное Ядро Синтеза в течение 35 секунд!»'
        );
        const coreGroup = new THREE.Mesh(
          new THREE.OctahedronGeometry(3.5, 1),
          new THREE.MeshBasicMaterial({ color: 0x00ff66, wireframe: true })
        );
        coreGroup.position.set(0, 4.5, -15);
        scene.add(coreGroup);
        StoryCampaign.defendCore = coreGroup;
        StoryCampaign.targetPos.set(0, 0, -15);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          spawnCitrusSoldier(Math.cos(a) * 26, -15 + Math.sin(a) * 26, i % 2 === 0 ? 'brawler' : 'mandarin');
        }
        break;

      case 3:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 3/16: ПЕРЕХВАТ БРОНЕКОНВОЯ CITRUS DEFENSE';
        descEl.innerText = 'Уничтожьте 3 бронетранспортёра APC Цитрус Дефенс до подхода подкреплений!';
        showComicCutsceneBanner(
          'КОНВОЙ НА МАРШЕ', '🚜', '#ff9f1a',
          '<b>Капитан Перец:</b> «Тяжёлая бронетехника Цитрус Дефенс движется к площади! Разнесём их бронеколонну в щепки!»'
        );
        [[-55, 75], [0, 95], [55, 75]].forEach(([x, z]) => {
          spawnCitrusAPC(x, z);
          StoryCampaign.objectives.push(enemies[enemies.length - 1]);
        });
        break;

      case 4:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 4/16: АРМИЯ НА МАРШЕ — ORANGE CAPTAIN';
        descEl.innerText = 'Разгромите элитную фалангу Orange Captain и его Джаггернаутов!';
        showComicCutsceneBanner(
          'АРМИЯ НА МАРШЕ', '🤖', '#eb2f06',
          '<b>Orange Captain:</b> «Банан-Индастриз — это вчера! Цитрус Дефенс — это завтра! Вперёд, Джаггернауты!»'
        );
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          spawnCitrusSoldier(Math.cos(a) * 20, 110 + Math.sin(a) * 20, i % 2 === 0 ? 'brawler' : 'leader');
          StoryCampaign.objectives.push(enemies[enemies.length - 1]);
        }
        break;

      case 5:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 5/16: НОВАЯ УГРОЗА — КИСЛОТНЫЙ ДРЕДНОУТ';
        descEl.innerText = 'Сбейте Кислотный Апельсин-Дредноут и рой Виноградных Пауков!';
        showComicCutsceneBanner(
          'ЧАСТЬ 6: КИСЛОТНЫЙ ТРИУМФ', '🍇', '#6a1b9a',
          '<b>Грейпстасик:</b> «Банан-Индастриз... весь этот сладкий, мягкий мир... он будет стёрт! Выпускайте Кислотный Дредноут и пауков!»'
        );
        StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(-85, 18, -75, 'acid_dreadnought'));
        for (let i = 0; i < 4; i++) {
          StoryCampaign.objectives.push(window.spawnGrapeSpiderDrone(-85 + (i - 1.5) * 10, -75));
        }
        break;

      case 6:
        StoryCampaign.mode = 'boss';
        titleEl.innerText = '📖 ГЛАВА 6/16: БОСС — КИСЛОТНЫЙ ЦЕНТУРИОН';
        descEl.innerText = 'Пробейте адаптивный щит Центуриона мощными атаками [Q]/[F] и победите его!';
        showComicCutsceneBanner(
          'ОГНЕННЫЙ УДАР ПЕРЦА... ПРОВАЛ?', '🛡️', '#8e44ad',
          '<b>Кислотный Центурион:</b> «Слишком мягкие! Мой перец — это АБСОЛЮТНОЕ ПИТАНИЕ! Обычные удары не пробьют мою броню!»'
        );
        StoryCampaign.bossEntity = window.spawnAcidCenturionBoss(85, 95);
        break;

      case 7:
        StoryCampaign.mode = 'hack';
        titleEl.innerText = '📖 ГЛАВА 7/16: ПЕРЕЗАГРУЗКА ШРЕКИЧА ИИ (ВЗЛОМ ТЕРМИНАЛОВ)';
        descEl.innerText = 'Удерживайте позиции внутри 3 синих колец связи, чтобы очистить код Шрекича!';
        showComicCutsceneBanner(
          'ШРЕКИЧ ИИ ВЗЛОМАН!', '💻', '#00aa44',
          '<b>Шрекич ИИ:</b> «АНАЛИЗ: ПЕРЕГРУЗКА ДАННЫХ... Вирус Грейпстасика блокирует мои протоколы! Зайди в кольца ретрансляторов, чтобы перезагрузить меня!»'
        );
        [[95, -135], [140, -135], [118, -175]].forEach(([x, z]) => {
          StoryCampaign.hackZones.push(spawnHackZone(x, z));
          spawnCitrusSoldier(x + 5, z, 'sniper');
        });
        break;

      case 8:
        StoryCampaign.mode = 'boss';
        titleEl.innerText = '📖 ГЛАВА 8/16: БОСС — ГРЕЙПСТАСИК НА ТАНКОВЫХ ГУСЕНИЦАХ';
        descEl.innerText = 'Сокрушите Гусеничный Штурмовик Грейпстасика на северной базе!';
        showComicCutsceneBanner(
          'ГРООО-ОО-ОМ! ВУ!', '🍇', '#5b1e82',
          '<b>Грейпстасик:</b> «Я Грейпстасик! Я — твой ад! Я уничтожу вашу "Команду"! Проект "Кислотный Тандем" — в бой!»'
        );
        StoryCampaign.bossEntity = window.spawnGrapestasikBoss(0, -110);
        break;

      case 9:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 9/16: ЧАСТЬ XI — АНОМАЛИЯ В ДЖУНГЛЯХ';
        descEl.innerText = 'Уничтожьте 4 Фиолетовых Улья Симбиота в парковом секторе!';
        showComicCutsceneBanner(
          'СКАНИРОВАНИЕ КОДА ХОХЛОРКОВА', '🍋', '#f9ca24',
          '<b>Димон Лимон:</b> «Штаб функционирует, но я вижу в Джунглях аномалию... *Клик-Клик* Энергетический фон зашкаливает! Что-то *КИСЛОЕ* и *ГОРЬКОЕ*!»'
        );
        [[195, -35], [235, -35], [215, -75], [215, 5]].forEach(([x, z]) => {
          StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'symbiote_hive'));
          window.spawnGrapeSpiderDrone(x + 4, z + 4);
        });
        break;

      case 10:
        StoryCampaign.mode = 'boss';
        titleEl.innerText = '📖 ГЛАВА 10/16: РОЖДЕНИЕ БИО-ГРЕЙПСТАСИКА («ИСТИННАЯ ГОРЕЧЬ»)';
        descEl.innerText = 'Выстойте против Био-Монстра Грейпстасика и сбейте ему 40% здоровья!';
        showComicCutsceneBanner(
          'ПРОРЫВ ИЗ ПРОШЛОГО — КРАШШШШШ!', '👾', '#3a1058',
          '<b>Био-Грейпстасик:</b> «"Ягодный Банан"! "Огненный Перец"! Вы думали, что баланс — это ваша игра? Ваша "Симбиоз" — это гниль! Я перепрограммирую этот мир на ИСТИННУЮ ГОРЕЧЬ!»',
          9500
        );
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
        break;

      case 11:
        StoryCampaign.mode = 'boss';
        titleEl.innerText = '📖 ГЛАВА 11/16: КРА-КА-БУМ! ВОЗВРАЩЕНИЕ ХОХЛОРКОВИ';
        descEl.innerText = 'Добивайте Био-Грейпстасика вместе с Хохлорковью и треугольником дронов «Родотенанц»!';
        showComicCutsceneBanner(
          'ПОСЛЕДНЯЯ ЛИНИЯ ОБОРОНЫ — КРА-КА-БУМ!', '🥕', '#2ecc71',
          '<b>Хохлорковь:</b> «Вы забыли обо Мне, Грейпстасик. Я помню Каждый Грамм Горечи. И я Поглотил её!»<br><b>Димон Лимон:</b> «*КОД "РОДОТЕНАНЦ-ВОССТАНОВЛЕНИЕ"*! Вместе мы — МУЛЬТИФРУКТ-ПОБЕДИТЕЛЬ!»',
          9500
        );
        const bioBoss = window.spawnBioMonsterGrapestasik(0, -65);
        bioBoss.hp = Math.round(bioBoss.maxHp * 0.6);
        StoryCampaign.bossEntity = bioBoss;
        triggerKhokhlorkovReturnAndRodotenanc(new THREE.Vector3(0, 0, -55));
        break;

      case 12:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 12/16: ЧАСТЬ XII — Т-МИНУС 20 МИНУТ (ЛИПКОЕ ВТОРЖЕНИЕ)';
        descEl.innerText = 'Разрушьте 4 Золотых Гейзера био-полимера и зачистите делящихся Жировиков!';
        showComicCutsceneBanner(
          'НОВОЕ СОСТОЯНИЕ ВЕЩЕСТВА — *ШЛЮЮ-ЮП*', '💛', '#d4a017',
          '<b>Димон Лимон:</b> «Это не кислота Грейпстасика! Она слишком густая... ВНИМАНИЕ: Обнаружен неустановленный жировой био-полимер!»'
        );
        [[-180, -80], [-220, -80], [-200, -120], [-200, -40]].forEach(([x, z]) => {
          StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'fat_geyser'));
          window.spawnGoldenFatBlob(x + 5, z, false);
        });
        break;

      case 13:
        StoryCampaign.mode = 'boss';
        titleEl.innerText = '📖 ГЛАВА 13/16: ВОСХОЖДЕНИЕ ЖИРИГОРЯ («ЗОЛОТОЙ СТАНДАРТ»)';
        descEl.innerText = 'Заморозьте Жиригоря на [C] («Морозильная Установка») и сбейте половину его HP!';
        showComicCutsceneBanner(
          'ЛАБОРАТОРИЯ ТОНЕТ В ЖИРУ!', '💛', '#e8b828',
          '<b>Жиригорь (Jirigory):</b> «Приветствую, мои сочные! Я Жиригорь, и я пришёл за своим "Золотым Стандартом"! Истинный Жир не горит, не растворяется... он просто ПОГЛОЩАЕТ!»<br><b>Егорбанан:</b> «Шрекич! Экстренный Протокол: морозильная установка [C]!»',
          9500
        );
        StoryCampaign.bossEntity = window.spawnJirigoryBoss(45, -45, false);
        break;

      case 14:
        StoryCampaign.mode = 'collect';
        titleEl.innerText = '📖 ГЛАВА 14/16: СИНТЕЗ КИСЛОТНОЙ КОРРОЗИИ НА КРЫШАХ';
        descEl.innerText = 'Соберите 4 Канистры Кислотного Катализатора на крышах небоскребов!';
        showComicCutsceneBanner(
          'ДИМОН ЛИМОН: КИСЛЫЕ РЕПУЛЬСОРЫ!', '🍋', '#88ff00',
          '<b>Димон Лимон:</b> «Морозилка была лишь временным решением! Собери 4 канистры концентрированного сока на высотках, чтобы мы залили Жиригоря КИСЛЫМ ДОЖДЁМ!»'
        );
        const roofSpots = [];
        for (let i = 0; i < buildings.length && roofSpots.length < 4; i++) {
          const b = buildings[i];
          if (b.topY >= 28 && b.topY <= 75 && Math.abs(b.x) < 220 && Math.abs(b.z) < 220) {
            roofSpots.push([b.x, b.topY, b.z]);
          }
        }
        while (roofSpots.length < 4) roofSpots.push([(roofSpots.length - 1.5) * 45, 18, -50]);
        roofSpots.forEach(([x, y, z]) => {
          StoryCampaign.collectibles.push(spawnAcidCanister(x, y, z));
        });
        break;

      case 15:
        StoryCampaign.mode = 'destroy';
        titleEl.innerText = '📖 ГЛАВА 15/16: ПРОРЫВ И ЖИРНАЯ РЕКРИСТАЛЛИЗАЦИЯ';
        descEl.innerText = 'Разбейте 3 Арктических Пилона, которые Жиригорь использует как катализатор!';
        showComicCutsceneBanner(
          'ХРУСТЬ-ХРУСТЬ... ОН ОГРОМНЫЙ!', '❄️', '#00f2fe',
          '<b>Егорбанан:</b> «Шрекич! Арктический Баланс не сдерживает его! Он использует холод как катализатор для... ЖИРНОЙ РЕКРИСТАЛЛИЗАЦИИ! Разбей ледяные пилоны!»'
        );
        [[-55, -85], [55, -85], [0, -135]].forEach(([x, z]) => {
          StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'arctic_pylon'));
          window.spawnGoldenFatBlob(x + 4, z + 4, false);
        });
        break;

      case 16:
        StoryCampaign.mode = 'boss';
        titleEl.innerText = '🔥 ФИНАЛ (16/16): ТИТАН МУЛЬТИФРУКТА ПРОТИВ МЕГА-ЖИРИГОРЯ';
        descEl.innerText = 'Протокол «Титан Мультифрукта» активен! Испарите Мега-Жиригоря Ударом Баланса!';
        showComicCutsceneBanner(
          'КОМБИНИРОВАННЫЙ УДАР БАЛАНСА — *ФШШШШШ!*', '🌈', '#ff0055',
          '<b>Егорбанан и Димон Лимон:</b> «Мультифрукт-Ядро: СТАТУС АКТИВЕН! Код Родотенанц-Восстановление: *ТАНДЕМ БАЛАНСА*!»<br><b>Мега-Жиригорь:</b> «Аргх! Мой... Жир! Он... *испаряется*!»',
          10500
        );
        activateMultifruitTitanProtocol();
        StoryCampaign.bossEntity = window.spawnJirigoryBoss(0, -75, true);
        break;

      default:
        StoryCampaign.completed = true;
        titleEl.innerText = '🏆 ВСЕ 16 ГЛАВ ПРОЙДЕНЫ: ТРИУМФ МУЛЬТИФРУКТА!';
        descEl.innerText = 'Грейпстасик и Жиригорь повержены! Награда: +15 000 EP [Нажмите N для новой кампании]';
        document.getElementById('story-ch-dist').innerText = '⭐ Жир застыл, Горечь повержена! *ЗУМ... СИНТЕЗ ПОЛНЫЙ!*';
        if (StoryCampaign.waypointBeam) StoryCampaign.waypointBeam.visible = false;
        if (StoryCampaign.waypointRing) StoryCampaign.waypointRing.visible = false;
        if (StoryCampaign.skyVortex && StoryCampaign.skyVortex.parent) scene.remove(StoryCampaign.skyVortex);
        if (StoryCampaign.rodotenancDrones && StoryCampaign.rodotenancDrones.parent) scene.remove(StoryCampaign.rodotenancDrones);
        player.ep += 15000;
        player.score += 150000;
        updateHUD();
        updateScoreDisplay();
        showComicCutsceneBanner(
          'ТРИУМФ ТАНДЕМА ПОБЕДЫ!', '🏆', '#2ecc71',
          '<b>Егорбанан, Димон Лимон, Перец и Хохлорковь:</b> «Мы сделали это! Тандем Наноягода-Лимон-Перец-Хохлорковь работает! Это начало новой мультифруктовой эры!»',
          12000
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

  // Радужный Удар Баланса в 16-й главе
  const _origPPATitan = window.performPrimaryAttack;
  window.performPrimaryAttack = function () {
    if (_origPPATitan) _origPPATitan.apply(this, arguments);
    if (player._multifruitTitanActive && StoryCampaign.chapter === 16) {
      const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
      const chest = player.pos.clone().add(new THREE.Vector3(0, 2.3, 0));
      spawnSlashArc(chest.clone().add(fwd.clone().multiplyScalar(3)), player.facingYaw, 0, 0x7cfc00, 8.5, 0.25);
      spawnSlashArc(chest.clone().add(fwd.clone().multiplyScalar(4)), player.facingYaw, 0.3, 0xff00ff, 9.5, 0.28);
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.group.position.distanceTo(player.pos) <= 18) {
          damageEnemy(e, 480, fwd.clone().multiplyScalar(8), '*🌈 ТАНДЕМ БАЛАНСА!*');
        }
      }
    }
  };

  // Главный цикл прогресса 16 глав кампании и интерактивных объектов карты
  setInterval(() => {
    if (!gameStarted || player.isDead) return;
    const nowSec = performance.now() * 0.001;

    // 1. Трамплины (Jump Pads)
    for (let i = 0; i < worldJumpPads.length; i++) {
      const jp = worldJumpPads[i];
      if (jp.cd > 0) jp.cd -= 0.1;
      if (jp.ring) jp.ring.rotation.z += 0.15;
      if (jp.cd <= 0 && player.pos.distanceTo(jp.pos) < 4.0) {
        jp.cd = 1.2;
        player.vel.y = 58;
        player.isGrounded = false;
        player.airFlipTimer = 0.5;
        SoundFX.whip();
        spawnGroundCrackRing(jp.pos, 0x00ff66, 9);
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '*🚀 МЕГА-ТРАМПЛИН!*', '#00ff66');
      }
    }

    // 2. Зеленые Био-Купола Восстановления (лечат HP и дают энергию внутри)
    for (let i = 0; i < healingBioDomes.length; i++) {
      const hd = healingBioDomes[i];
      hd.mesh.rotation.y += 0.01;
      if (player.pos.distanceTo(hd.pos) < hd.radius) {
        player.hp = Math.min(player.maxHp, player.hp + 2.5);
        player.en = Math.min(player.maxEn, player.en + 4.0);
        if (CARROT_MODE) player.carrotStamina = Math.min(player.carrotStaminaMax, player.carrotStamina + 3.0);
      }
    }

    if (StoryCampaign.completed) return;

    const ch = StoryCampaign.chapter;
    const descEl = document.getElementById('story-ch-desc');
    const distEl = document.getElementById('story-ch-dist');

    if (StoryCampaign.skyVortex) StoryCampaign.skyVortex.rotation.z += 0.08;
    if (StoryCampaign.rodotenancDrones) {
      StoryCampaign.rodotenancDrones.rotation.y += 0.04;
      if (StoryCampaign.bossEntity && StoryCampaign.bossEntity.hp > 0) {
        damageEnemy(StoryCampaign.bossEntity, 110, new THREE.Vector3(), '');
      }
    }

    // Логика по типам миссий
    if (StoryCampaign.mode === 'destroy') {
      StoryCampaign.objectives = StoryCampaign.objectives.filter((obj) => obj && obj.hp > 0 && enemies.indexOf(obj) !== -1);
      if (StoryCampaign.objectives.length === 0) {
        SoundFX.devastator();
        player.ep += 350;
        player.score += 6000;
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
      if (descEl) descEl.innerText = `Целей для уничтожения осталось: ${StoryCampaign.objectives.length} | [N] — пропуск главы`;
    } else if (StoryCampaign.mode === 'defend') {
      StoryCampaign.defendTimer -= 0.1;
      if (StoryCampaign.defendCore) {
        StoryCampaign.defendCore.rotation.y += 0.08;
        StoryCampaign.defendCore.rotation.x += 0.05;
      }
      if (enemies.length < 5) {
        const a = Math.random() * Math.PI * 2;
        spawnCitrusSoldier(Math.cos(a) * 28, -15 + Math.sin(a) * 28, 'mandarin');
      }
      if (descEl) descEl.innerText = `Обороняйте Ядро Синтеза BI! Осталось продержаться: ${Math.max(0, StoryCampaign.defendTimer).toFixed(1)} сек`;
      if (StoryCampaign.defendTimer <= 0) {
        SoundFX.devastator();
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 4, 0)), '🛡️ ШТАБ ОТСТОЯЛИ!', '#00ff66');
        player.ep += 400;
        startStoryChapter(ch + 1);
        return;
      }
    } else if (StoryCampaign.mode === 'hack') {
      const remainingHacks = StoryCampaign.hackZones.filter((hz) => !hz.hacked);
      if (remainingHacks.length === 0) {
        SoundFX.devastator();
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 4, 0)), '💻 ШРЕКИЧ ИИ ПЕРЕЗАГРУЖЕН!', '#00ff66');
        player.ep += 450;
        startStoryChapter(ch + 1);
        return;
      }
      let nearestHz = remainingHacks[0];
      for (let i = 0; i < remainingHacks.length; i++) {
        const hz = remainingHacks[i];
        if (player.pos.distanceTo(hz.pos) < 8.5) {
          hz.progress = Math.min(100, hz.progress + 3.5);
          hz.ring.material.color.setHex(0x00ff66);
          if (hz.progress >= 100) {
            hz.hacked = true;
            scene.remove(hz.group);
            spawnComicPop(hz.pos.clone().add(new THREE.Vector3(0, 4, 0)), '✓ ТЕРМИНАЛ ВЗЛОМАН!', '#00ff66');
            SoundFX.hit(240, 0.2);
          }
        } else {
          hz.ring.material.color.setHex(0x00f2fe);
        }
        if (player.pos.distanceTo(hz.pos) < player.pos.distanceTo(nearestHz.pos)) nearestHz = hz;
      }
      StoryCampaign.targetPos.copy(nearestHz.pos);
      if (descEl) descEl.innerText = `Взлом терминалов Шрекича: осталось ${remainingHacks.length} (Прогресс текущего: ${Math.round(nearestHz.progress)}%)`;
    } else if (StoryCampaign.mode === 'collect') {
      const remCol = StoryCampaign.collectibles.filter((c) => !c.collected);
      if (remCol.length === 0) {
        SoundFX.devastator();
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 4, 0)), '🍋 КИСЛОТНЫЙ КАТАЛИЗАТОР СОБРАН!', '#88ff00');
        player.ep += 500;
        startStoryChapter(ch + 1);
        return;
      }
      let nearestC = remCol[0];
      for (let i = 0; i < remCol.length; i++) {
        const c = remCol[i];
        c.group.rotation.y += 0.1;
        if (player.pos.distanceTo(c.pos) < 5.0) {
          c.collected = true;
          scene.remove(c.group);
          spawnComicPop(c.pos.clone(), '🧪 +1 КАТАЛИЗАТОР КОРРОЗИИ!', '#88ff00');
          SoundFX.whip();
        }
        if (player.pos.distanceTo(c.pos) < player.pos.distanceTo(nearestC.pos)) nearestC = c;
      }
      StoryCampaign.targetPos.copy(nearestC.pos);
      if (descEl) descEl.innerText = `Соберите канистры Кислотного Катализатора на крышах (Осталось: ${remCol.length})`;
    } else if (StoryCampaign.mode === 'boss') {
      const b = StoryCampaign.bossEntity;
      if (!b || b.hp <= 0 || enemies.indexOf(b) === -1) {
        SoundFX.devastator();
        player.ep += 750;
        player.score += 12000;
        updateHUD();
        updateScoreDisplay();
        startStoryChapter(ch + 1);
        return;
      }
      if (ch === 10 && b.hp / b.maxHp <= 0.60) {
        startStoryChapter(11);
        return;
      }
      if (ch === 13 && b.hp / b.maxHp <= 0.55) {
        startStoryChapter(14);
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
  // ═══ 7. ПОЛНОЕ СОХРАНЕНИЕ ВСЕХ СИСТЕМ v53 (ДЕНЬ/НОЧЬ, ЩИТ, ШРЕКИЧ, КАРТОШКА)
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

  console.log("🍌 [PATCH v90] Готово: Гарпун 750м (110 м/с), 16 глав сюжета, усиленные боссы, 6 типов врагов и живая карта активны.");
})();
