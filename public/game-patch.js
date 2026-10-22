// ============================================================================
// BANANA INDUSTRIES — GLOBAL PATCH v70 (STORY CAMPAIGN & COMIC OVERHAUL)
// • Гарпун Хохлоркови: дальность x5 (2250 м) + увеличенный радиус всех корневых атак
// • Заморозка Егорбанана [C]: настоящий 3D ледяной монолит, 100% паралич и Раскол (x2)
// • Сюжетная кампания из 6 глав по комиксу «Апельсиновая Орда» и «Кислотный Триумф»
// • Враги из комикса: Orange Sentinel, Orange Captain, Виноградные Дроны, Грейпстасик
// • Живой мегаполис, 3D-маркеры целей, улучшенный PBR/SSS шейдер и пост-процессинг
// • 100% сохранение всех 5 персонажей, костюмов, форм, фраз и способностей
// ============================================================================
(function () {
  'use strict';
  console.log("🍌 [PATCH v70] Загружен: Сюжетная кампания Грейпстасика, 3D-Заморозка, Гарпун 2250м и HD-мир.");

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

      // Комиксная ступенчатая подтяжка теней (Cel-Shaded Comic Pop + PBR)
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
        if (!cached._protoV70Upgraded) {
          cached.vertexShader = PROTO_VERTEX_SHADER;
          cached.fragmentShader = PROTO_FRAGMENT_SHADER;
          cached._protoV70Upgraded = true;
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
    mat._protoV70Upgraded = true;
    if (typeof _shaderCache !== 'undefined') _shaderCache.set(k, mat);
    if (typeof _cachedShaderSet !== 'undefined') _cachedShaderSet.add(mat);
    return mat;
  };

  function upgradeGraphicsPipeline() {
    if (typeof _shaderCache !== 'undefined') {
      _shaderCache.forEach((mat) => {
        if (mat && mat.isShaderMaterial && !mat._protoV70Upgraded) {
          mat.vertexShader = PROTO_VERTEX_SHADER;
          mat.fragmentShader = PROTO_FRAGMENT_SHADER;
          mat._protoV70Upgraded = true;
          mat.needsUpdate = true;
        }
      });
    }
    if (typeof scene !== 'undefined') {
      scene.traverse((obj) => {
        if (obj.material && obj.material.isShaderMaterial && obj.material.uniforms && obj.material.uniforms.uCol1) {
          if (!obj.material._protoV70Upgraded) {
            obj.material.vertexShader = PROTO_VERTEX_SHADER;
            obj.material.fragmentShader = PROTO_FRAGMENT_SHADER;
            obj.material._protoV70Upgraded = true;
            obj.material.needsUpdate = true;
          }
        }
      });
    }
    // Сочная кинематографичная экспозиция и освещение в духе комикса
    if (typeof renderer !== 'undefined') {
      renderer.toneMappingExposure = 1.38;
    }
    if (typeof hemiLight !== 'undefined') {
      hemiLight.intensity = 1.15;
      hemiLight.color.setHex(0x99ddff);
      hemiLight.groundColor.setHex(0x281822);
    }
    if (typeof moonLight !== 'undefined') {
      moonLight.intensity = 1.55;
    }
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
          // Повышение насыщенности и контраста в стиле комикса
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
  setTimeout(upgradeGraphicsPipeline, 80);

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 1. БАЗОВЫЕ ФИКСЫ + УВЕЛИЧЕНИЕ ДАЛЬНОСТИ ХОХЛОРКОВИ (ГАРПУН X5 = 2250М!)
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

  // ─── ПОВЫШЕНИЕ ДАЛЬНОСТИ ВСЕХ АТАК ХОХЛОРКОВИ (ЛКМ, ОПУТЫВАНИЕ, БУР) ───
  window.carrotPrimaryAttack = function () {
    if (player.attackTimer > 0.08) return;
    if (!player.isGrounded && !player.isWallRunning && !player.isFlying && player.pos.y > 4 && CARROT_FORM === 1) {
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
      // Гигантская форма — колоссальный размах на 22 метра
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

    // Форма 1 (Корневой ниндзя) — дальнобойные хлысты-корни (до 16 метров!)
    if (player.comboResetTimer <= 0) player.comboStep = 0;
    player.comboStep = (player.comboStep % 5) + 1;
    player.comboResetTimer = 1.6;
    const combos = [
      null,
      { dur: 0.21, tilt: -0.2, r: 12.0, lunge: 18, dmg: 1.15, label: '*ХЛЫСТ ЛОЗОЙ!*' },
      { dur: 0.21, tilt: 0.2,  r: 12.0, lunge: 18, dmg: 1.15, label: '*ХЛЫСТ ЛОЗОЙ!*' },
      { dur: 0.30, tilt: 0,    r: 15.0, lunge: 20, dmg: 1.35, label: '*360° БОТВА!*', spin: true },
      { dur: 0.34, tilt: -0.5, r: 13.0, lunge: 18, dmg: 1.55, label: '*КОРНЕВОЙ АППЕРКОТ!*', launch: true },
      { dur: 0.46, tilt: -1.0, r: 16.5, lunge: 32, dmg: 2.25, label: '*КОРНЕВОЙ ШКВАЛ!*', finisher: true }
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

    // Визуальный выброс 3D-лозы вперед при каждом ударе
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

  // ─── ЛИАНОВЫЙ ГАРПУН [ПКМ]: ДАЛЬНОСТЬ УВЕЛИЧЕНА В 5 РАЗ (450 -> 2250 МЕТРОВ!) ───
  let _newVineCd = 0;
  const VINE_CD = 0.5;
  const HARPOON_MAX_RANGE = 2250; // x5 от исходных 450!

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

    const rc = new THREE.Raycaster();
    rc.set(origin, fwd3D);
    rc.far = HARPOON_MAX_RANGE;
    const rawHits = rc.intersectObjects(buildingMeshes, false);
    const buildHits = rawHits.filter(function (h) { return h.point.y > 0.8; });

    // Если луч смотрел чуть выше/ниже, пробуем также горизонтальный луч на 2250м
    if (buildHits.length === 0) {
      rc.set(origin, fwdFlat);
      rc.far = HARPOON_MAX_RANGE;
      const flatHits = rc.intersectObjects(buildingMeshes, false).filter(function (h) { return h.point.y > 0.8; });
      if (flatHits.length > 0) buildHits.push(flatHits[0]);
    }

    const buildingDist = buildHits.length > 0 ? buildHits[0].distance : Infinity;
    let bestEnemy = null;
    let bestDist = HARPOON_MAX_RANGE;
    for (let i = 0; i < enemies.length; i++) {
      const en = enemies[i];
      const toE = en.group.position.clone().sub(player.pos);
      const dist = toE.length();
      if (dist > HARPOON_MAX_RANGE) continue;
      const dot = toE.clone().normalize().dot(fwdFlat);
      if (dot < 0.42) continue;
      if (dist < bestDist) {
        bestDist = dist;
        bestEnemy = en;
      }
    }

    if (bestEnemy && bestDist <= buildingDist + 15) {
      _newVineCd = VINE_CD;
      const isElite = (
        bestEnemy._isBoss || bestEnemy.type === 'titan' || bestEnemy.type === 'tank' ||
        bestEnemy.type === 'lemon' || bestEnemy.type === 'valkyrie' ||
        bestEnemy.type === 'necromancer' || bestEnemy.type === 'heli' ||
        bestEnemy.type === 'shield' || bestEnemy.type === 'sniper'
      );
      const tp = bestEnemy.group.position.clone().add(new THREE.Vector3(0, 2, 0));
      if (activeTendrils.length < 10) {
        activeTendrils.push(new OrganicTendril3D(scene, origin.clone(), tp.clone(), 0x2ecc71, 0.48, 0.65));
      }
      SoundFX.whip();
      triggerHitstopAndChroma(0.06, 0.4, 0.9);
      const travelMs = Math.max(220, Math.min(1100, (bestDist / 450) * 600));

      if (isElite || bestDist > 65) {
        spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), `*ГАРПУН ${Math.round(bestDist)}М — НА ТАРАН!*`, '#ff2200');
        const dir = tp.clone().sub(player.pos).normalize();
        const launchSpd = Math.min(420, Math.max(260, bestDist * 1.6));
        player.vel.x = dir.x * launchSpd;
        player.vel.z = dir.z * launchSpd;
        player.vel.y = Math.max(26, dir.y * 85 + 18);
        player.isGrounded = false;
        player.dodgeIframes = 0.85;
        postUniforms.uRadialBlur.value = 1.4;
        const capE = bestEnemy;
        setTimeout(function () {
          if (capE && capE.group.parent) {
            const st = carrotStats();
            player.pos.lerp(capE.group.position.clone().add(new THREE.Vector3(0, 1, 0)), 0.65);
            damageEnemy(capE, st.dmg * 5.0, new THREE.Vector3(0, 0, 0), '*СОКРУШИТЕЛЬНЫЙ ТАРАН!*');
            spawnParticles(tp.clone(), 0x2ecc71, 28);
            spawnGroundCrackRing(capE.group.position, 0x2ecc71, 16);
            triggerHitstopAndChroma(0.12, 0.8, 1.3);
          }
        }, travelMs);
      } else {
        spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), '*ИДИ СЮДА!*', '#2ecc71');
        const capE = bestEnemy;
        capE.vel.x = (player.pos.x - capE.group.position.x) * 10;
        capE.vel.z = (player.pos.z - capE.group.position.z) * 10;
        capE._rooted = 0.8;
        setTimeout(function () {
          if (capE && capE.group.parent) {
            const st = carrotStats();
            const fwd2 = new THREE.Vector3(-Math.sin(player.facingYaw), 0, -Math.cos(player.facingYaw));
            spawnSlashArc(player.pos.clone().add(new THREE.Vector3(0, 2, 0)), player.facingYaw, 0, 0x2ecc71, 9.5, 0.4);
            damageEnemy(capE, st.dmg * 3.5, fwd2.clone().multiplyScalar(12), '*УДАР С РАЗВОРОТА!*');
            spawnParticles(capE.group.position.clone().add(new THREE.Vector3(0, 2, 0)), 0xadff2f, 16);
            triggerHitstopAndChroma(0.08, 0.6, 1.1);
          }
        }, 420);
      }
    } else if (buildHits.length > 0) {
      _newVineCd = VINE_CD;
      const hp = buildHits[0].point;
      const distB = buildHits[0].distance;
      if (activeTendrils.length < 10) {
        activeTendrils.push(new OrganicTendril3D(scene, origin.clone(), hp.clone(), 0x2ecc71, 0.42, 0.55));
      }
      SoundFX.swing(520);
      spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), `*ЦЕПКИЙ КОРЕНЬ (${Math.round(distB)}М)!*`, '#2ecc71');
      const dir = hp.clone().sub(player.pos).normalize();
      const zipSpeed = Math.min(440, Math.max(240, distB * 1.4));
      player.vel.x = dir.x * zipSpeed;
      player.vel.z = dir.z * zipSpeed;
      player.vel.y = Math.max(44, dir.y * zipSpeed * 0.65 + 24);
      player.isGrounded = false;
      player.isBulletdropping = false;
      player.dodgeIframes = 0.65;
      postUniforms.uRadialBlur.value = 1.25;
    } else {
      // Даже если впереди открытое небо (до 2250м), выбрасываем лозу на 180м вперед для скоростного рывка!
      _newVineCd = VINE_CD;
      const skyAnchor = origin.clone().add(fwdFlat.clone().multiplyScalar(180)).add(new THREE.Vector3(0, 35, 0));
      if (activeTendrils.length < 10) {
        activeTendrils.push(new OrganicTendril3D(scene, origin.clone(), skyAnchor, 0x2ecc71, 0.38, 0.45));
      }
      SoundFX.swing(480);
      spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), '*КОРНЕВОЙ КАТАПУЛЬТ!*', '#2ecc71');
      player.vel.x = fwdFlat.x * 230;
      player.vel.z = fwdFlat.z * 230;
      player.vel.y = 38;
      player.isGrounded = false;
      player.dodgeIframes = 0.5;
      postUniforms.uRadialBlur.value = 1.1;
    }
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
  setInterval(() => { if (_newVineCd > 0) _newVineCd = Math.max(0, _newVineCd - 0.1); }, 100);

  // Расширенное Опутывание корнями [F] (радиус 45м + сбивание всех вертолетов)
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
  // ═══ 2. НОВАЯ ЗАМОРОЗКА ЕГОРБАНАНА [C]: НАСТОЯЩИЙ 3D ЛЕДЯНОЙ КУБ + РАСКОЛ X2
  // ═══════════════════════════════════════════════════════════════════════════
  const CRYO_FREEZE_RADIUS = 24;
  const CRYO_FREEZE_DURATION = 5.5;
  const CRYO_BASE_DMG = 95;

  // Создает настоящий объемный полупрозрачный 3D ледяной монолит с гранями и сосульками
  function createSolidIceCubePrison(targetPos, targetRadius, durationSec) {
    const group = new THREE.Group();
    const w = Math.max(2.6, targetRadius * 2.1);
    const h = Math.max(4.4, targetRadius * 3.1);

    // Внешний монолитный ледяной куб с глянцевыми бликами
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

    // Внутренний преломляющий кристалл
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

    // Четкие ледяные грани по ребрам куба
    const edgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(w * 1.01, h * 1.01, w * 1.01));
    const edgesLine = new THREE.LineSegments(
      edgesGeo,
      new THREE.LineBasicMaterial({ color: 0xe0ffff, transparent: true, opacity: 0.95 })
    );
    edgesLine.position.y = h * 0.5;
    group.add(edgesLine);

    // Острые ледяные наросты-кристаллы вокруг основания и вершины куба
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const spikeH = h * (0.45 + (i % 2) * 0.2);
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(w * 0.18, spikeH, 5),
        iceOuterMat
      );
      spike.position.set(Math.cos(ang) * (w * 0.48), spikeH * 0.45, Math.sin(ang) * (w * 0.48));
      spike.rotation.z = -Math.cos(ang) * 0.28;
      spike.rotation.x = Math.sin(ang) * 0.28;
      group.add(spike);
    }

    // Морозное кольцо у подножия куба
    const baseFrost = new THREE.Mesh(
      new THREE.RingGeometry(w * 0.3, w * 0.95, 20),
      new THREE.MeshBasicMaterial({ color: 0x88f6ff, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false })
    );
    baseFrost.rotation.x = -Math.PI / 2;
    baseFrost.position.y = 0.08;
    group.add(baseFrost);

    group.position.copy(targetPos);
    scene.add(group);

    // Плавная анимация вырастания ледяной глыбы из земли
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
      // Взрыв куба на ледяные осколки при разрушении/окончании
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

  // Перехват нажатия [C] для Егорбанана (работает на ВСЕХ костюмах 0-4!)
  window.addEventListener('keydown', function (e) {
    if (e.code !== 'KeyC') return;
    if (typeof player === 'undefined' || player.isDead) return;
    if (player.character !== 'banana') return;
    if (CARROT_MODE || PEPPER_MODE || LEMON_MODE || window.__POTATO_MODE) return;
    if (player.isFlying) return; // В полете C снижает высоту

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

    // 1. Защитный крио-куб вокруг самого Егорбанана на 1.8 сек + восстановление энергии и HP
    createSolidIceCubePrison(player.pos.clone(), 1.5, 1.8);
    player.dodgeIframes = Math.max(player.dodgeIframes, 1.2);
    player.en = player.maxEn;
    player.hp = Math.min(player.maxHp, player.hp + 90);

    // 2. Ударная волна абсолютного нуля на земле
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

    // 3. Заковываем каждого врага в радиусе 24м в персональный монолитный 3D Ледяной Куб
    const frozenTargets = [];
    for (let i = 0; i < enemies.length; i++) {
      const en = enemies[i];
      if (en.group.position.distanceTo(player.pos) <= CRYO_FREEZE_RADIUS) {
        frozenTargets.push(en);
      }
    }

    for (const en of frozenTargets) {
      // Если на враге уже был старый ледяной куб — убираем
      if (en._iceCubePrison) {
        clearTimeout(en._iceCubePrison.timerId);
        en._iceCubePrison.cleanup();
      }
      // Если враг летал (вертолет/Валькирия) — ледяная глыба обрушивает его на землю!
      if (en.flying && en.type !== 'valkyrie') {
        en.flying = false;
        en.group.position.y = 0;
      }

      const prison = createSolidIceCubePrison(en.group.position.clone(), en.radius || 1.4, CRYO_FREEZE_DURATION);
      en._iceCubePrison = prison;

      // ПОЛНЫЙ ПАРАЛИЧ ВРАГА: блокируем и движение, и корневой таймер AI в index.html, и таймеры ударов!
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

    // Снежный вихрь вокруг игрока
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
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 5.2, 0)), `❄️ АБСОЛЮТНЫЙ НОЛЬ: ЗАМОРОЖЕНО (${frozenTargets.length})!`, '#00f2fe');
    }
    if (typeof SoundFX !== 'undefined') { SoundFX.devastator(); SoundFX.boom(); }
    if (typeof triggerHitstopAndChroma === 'function') triggerHitstopAndChroma(0.08, 0.65, 1.25);
    updateHUD();
  }, true);

  setInterval(() => {
    if (player._cryoCd > 0) player._cryoCd = Math.max(0, player._cryoCd - 0.1);
  }, 100);

  // Механика «РАСКОЛ ЛЬДА! (x2.0 урона)» при ударе по замороженному врагу
  const _origDamageEnemyForCryo = window.damageEnemy;
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
    const res = _origDamageEnemyForCryo.call(this, en, dmg, knockVec, popText);
    if (en && en.hp <= 0 && en._iceCubePrison) {
      clearTimeout(en._iceCubePrison.timerId);
      en._iceCubePrison.cleanup();
      en._iceCubePrison = null;
    }
    return res;
  };

  // Жесткая фиксация замороженных врагов и кубов льда в кадре
  if (typeof updateEnemiesAndVehicles === 'function') {
    const _origUpdateEnemiesV70 = window.updateEnemiesAndVehicles;
    window.updateEnemiesAndVehicles = function (dt, now) {
      for (let i = 0; i < enemies.length; i++) {
        const en = enemies[i];
        if (en.frozen > 0) {
          en.frozen -= dt;
          en._rooted = Math.max(en._rooted || 0, en.frozen);
          en.vel.set(0, 0, 0);
          en._telegraphT = 0;
          en.meleeAnim = 0;
          if (en._frozenLockedPos) {
            en.group.position.copy(en._frozenLockedPos);
          }
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
      _origUpdateEnemiesV70.apply(this, arguments);
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 3. МОДЕРНИЗАЦИЯ ВРАГОВ ПОД КАНОН КОМИКСА (ORANGE SENTINEL, ПАУКИ, ЦЕНТУРИОН)
  // ═══════════════════════════════════════════════════════════════════════════
  function upgradeEnemyToComicSpec(en) {
    if (!en || !en.group || en._comicUpgraded) return;
    en._comicUpgraded = true;

    const g = en.group;
    // Паттерн брони Orange Sentinel / Orange Captain / Кислотного Центуриона по комиксу
    const isCenturion = en.type === 'brawler' || en.type === 'shield';
    const isCaptain = en.type === 'leader' || en.type === 'sniper';

    // Дуговой реактор в груди как у Orange Sentinel на страницах комикса
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

    // Массивные наплечники Orange Sentinel и энергетические клинки на предплечьях
    const pauldronMat = isCenturion
      ? createPrototypeShader(0x6a1b9a, 0x2a0040, 2, 0xff00ff)
      : createPrototypeShader(0xff7f00, 0x903000, 9, 0xfff200);

    for (let side of [-1, 1]) {
      const pauldron = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 0.75), pauldronMat), 1.05);
      pauldron.position.set(side * 1.05, 2.72, 0);
      pauldron.rotation.z = -side * 0.25;
      g.add(pauldron);
    }

    if (isCaptain) {
      // Корона/гребень Orange Captain
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.04, 6, 12, Math.PI),
        new THREE.MeshBasicMaterial({ color: 0xfff200 })
      );
      halo.position.set(0, 3.6, 0);
      g.add(halo);
    }
  }

  // Спавн Виноградного Паука-Дрона из комикса (гроздь фиолетовых сфер на механических лапах)
  window.spawnGrapeSpiderDrone = function (x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const grapeMat = createPrototypeShader(0x6a1b9a, 0x2a0040, 1, 0xff00ff);
    const legMat = createPrototypeShader(0x2a2a35, 0x101015, 9, 0xaa44ff);

    // Гроздь винограда из 9 глянцевых био-сфер
    const clusterOffsets = [
      [0, 1.4, 0], [0.55, 1.3, 0.3], [-0.55, 1.3, 0.3], [0, 1.3, -0.55],
      [0.4, 1.85, 0], [-0.4, 1.85, 0], [0, 1.9, 0.4], [0, 0.95, 0.4], [0, 2.25, 0]
    ];
    clusterOffsets.forEach(([ox, oy, oz]) => {
      const berry = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(0.46, 10, 10), grapeMat), 1.05);
      berry.position.set(ox, oy, oz);
      g.add(berry);
    });

    // Красный био-окуляр спереди
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff0055 }));
    eye.position.set(0, 1.45, 0.78);
    g.add(eye);

    // 6 суставчатых механических паучьих лап
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

  // Хук на спавн солдат, чтобы все получали комикс-броню Orange Sentinel + периодически спавнились Виноградные Дроны
  if (typeof spawnCitrusSoldier === 'function') {
    const _origSpawnSoldier = window.spawnCitrusSoldier;
    window.spawnCitrusSoldier = function (x, z, role = 'mandarin') {
      _origSpawnSoldier.call(this, x, z, role);
      const newest = enemies[enemies.length - 1];
      if (newest) upgradeEnemyToComicSpec(newest);
    };
    // Обновляем уже созданных на старте солдат
    setTimeout(() => {
      for (let i = 0; i < enemies.length; i++) upgradeEnemyToComicSpec(enemies[i]);
    }, 200);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 4. НАПОЛНЕНИЕ МИРА И КАРТЫ (ЦИТАДЕЛЬ CITRUS DEFENSE, ГОЛОГРАММЫ, ТРАМПЛИНЫ)
  // ═══════════════════════════════════════════════════════════════════════════
  const worldJumpPads = [];
  const holoScreens = [];

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

    // Силуэт головы Грейпстасика слева
    ctx.fillStyle = '#d86072';
    ctx.beginPath();
    ctx.arc(88, 128, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.stroke();
    // Глаза и ухмылка Грейпстасика
    ctx.fillStyle = '#fff200';
    ctx.fillRect(62, 108, 16, 8);
    ctx.fillRect(96, 108, 16, 8);
    ctx.beginPath();
    ctx.arc(88, 144, 24, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = accentHex;
    ctx.font = '900 30px Rubik, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, 164, 78);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Rubik, Arial, sans-serif';
    ctx.fillText(sub1, 164, 134);
    ctx.fillStyle = '#adff2f';
    ctx.fillText(sub2, 164, 178);
    return new THREE.CanvasTexture(c);
  }

  function buildComicWorldEnhancements() {
    if (typeof scene === 'undefined') return;

    // 1. Гигантские голографические экраны Грейпстасика в небе над районами
    const slogans = [
      ['GRAPE STASIK TV', 'БАНАН-ИНДАСТРИЗ — ВЧЕРА!', 'ЦИТРУС ДЕФЕНС — ЗАВТРА!', '#ff9f1a'],
      ['ПРИЗЫВ К ОРУЖИЮ', 'МОИ АПЕЛЬСИНОВЫЕ ВОИНЫ!', 'Я — ВАШ КИСЛОТНЫЙ АД!', '#ff0055'],
      ['ПРОЕКТ: ТАНДЕМ', 'ЯГОДА + ПЕРЕЦ = ПРОВАЛ!', 'СДАВАЙТЕСЬ ГРЕЙПСТАСИКУ!', '#bb44ff'],
      ['CITRUS DEFENSE', 'ЯКОРЯ АКТИВИРОВАНЫ!', 'СЛАДКИЙ МИР БУДЕТ СТЁРТ!', '#00f2fe']
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

    // 2. Прыжковые био-трамплины (Jump Pads) по городу для мгновенного взлета на небоскребы
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
  }
  setTimeout(buildComicWorldEnhancements, 400);

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 5. СЮЖЕТНЫЙ РЕЖИМ ПО КОМИКСУ (6 ГЛАВ + БОСС ГРЕЙПСТАСИК + 3D WAYPOINTS)
  // ═══════════════════════════════════════════════════════════════════════════
  const StoryCampaign = {
    chapter: 1,
    completed: false,
    objectives: [],
    waypointBeam: null,
    waypointRing: null,
    targetPos: new THREE.Vector3(0, 0, -65),
    killsNeeded: 0,
    killsDone: 0,
    bossEntity: null
  };
  window.StoryCampaign = StoryCampaign;

  // UI: Верхний баннер текущей миссии + Комикс-окно переговоров Грейпстасика
  const storyHudEl = document.createElement('div');
  storyHudEl.id = 'story-campaign-hud';
  storyHudEl.style.cssText =
    'position:fixed;top:54px;left:50%;transform:translateX(-50%) skewX(-4deg);z-index:25;' +
    'min-width:440px;max-width:640px;background:linear-gradient(135deg,rgba(18,6,28,.95),rgba(40,10,18,.92));' +
    'border:3px solid #000;outline:3px solid #f9ca24;padding:8px 18px;text-align:center;' +
    'box-shadow:0 8px 25px rgba(0,0,0,.85),6px 6px 0 #000;pointer-events:auto;';
  storyHudEl.innerHTML =
    '<div id="story-ch-title" style="font-family:Bangers,Impact,sans-serif;font-size:19px;color:#f9ca24;letter-spacing:1.5px;text-shadow:2px 2px 0 #000;">📖 ГЛАВА 1: ПРОБУЖДЕНИЕ ОРАНЖ</div>' +
    '<div id="story-ch-desc" style="font-size:12px;font-weight:900;color:#fff;margin-top:2px;">Уничтожьте 3 Якоря Цитрус Дефенс (0/3)</div>' +
    '<div id="story-ch-dist" style="font-size:11px;font-weight:900;color:#00f2fe;margin-top:3px;">📍 ДО ЦЕЛИ: 0 М</div>';
  document.body.appendChild(storyHudEl);

  // Комикс-панель диалогов (в стиле кадров из image_73ec74.jpg / image_73ecee.jpg)
  const comicDialogEl = document.createElement('div');
  comicDialogEl.id = 'comic-dialog-panel';
  comicDialogEl.style.cssText =
    'position:fixed;bottom:108px;right:18px;width:430px;z-index:60;background:#fff8e7;' +
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
  function showComicCutsceneBanner(header, speakerIcon, bgHex, text, durationMs = 6500) {
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

  // 3D Световая колонна-маркер цели (Waypoint) в мире
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

  // Создание 3D-объекта «Якорь Цитрус Дефенс» / «Кислотный Дредноут» / «Терминал Тандема» как разрушаемой цели
  function spawnStoryObjectiveConstruct(x, y, z, kind) {
    const g = new THREE.Group();
    g.position.set(x, y, z);

    if (kind === 'anchor') {
      // Якорь Цитрус Дефенс (башня-генератор с оранжевым ядром и лучом в небо)
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
      const skyRay = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.6, 140, 8),
        new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.55 })
      );
      skyRay.position.y = 75;
      g.add(skyRay);
    } else if (kind === 'acid_dreadnought') {
      // Гигантский летающий Кислотный Апельсин-Дредноут (из Части 6 комикса, панель 2!)
      const orbMat = createPrototypeShader(0xff7f00, 0x9a3800, 4, 0x00ff66);
      const sphere = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(5.5, 16, 16), orbMat), 1.04);
      g.add(sphere);
      const acidVat = new THREE.Mesh(
        new THREE.CylinderGeometry(2.8, 2.4, 3.2, 12),
        new THREE.MeshBasicMaterial({ color: 0x44ffaa })
      );
      acidVat.position.set(0, -4.5, 0);
      g.add(acidVat);
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3.5, 5), createPrototypeShader(0x2ecc71, 0x145a32, 8));
      leaf.position.set(0, 6.2, 0);
      leaf.rotation.z = 0.35;
      g.add(leaf);
    } else if (kind === 'tandem_terminal') {
      // Терминал проекта «Кислотный Тандем»
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

  // ─── СПАВН ФИНАЛЬНОГО БОССА КОМИКСА: ГРЕЙПСТАСИК НА ТАНКОВЫХ ГУСЕНИЦАХ ───
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

    // Гусеничная танковая платформа вместо ног (точно как на кадрах 1 из Части 5 и Части 6!)
    const chassis = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.2, 5.2), treadMat), 1.04);
    chassis.position.y = 1.6;
    g.add(chassis);
    for (let side of [-1, 1]) {
      const track = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.4, 6.8), treadMat), 1.04);
      track.position.set(side * 2.8, 1.3, 0);
      g.add(track);
      for (let w = -2; w <= 2; w += 2) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.6, 10), new THREE.MeshBasicMaterial({ color: 0x111111 }));
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * 2.85, 1.0, w * 1.1);
        g.add(wheel);
      }
    }

    // Фиолетовая спортивная олимпийка с белыми полосами и эмблемой винограда
    const torso = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.2, 5.2, 12), suitMat), 1.04);
    torso.position.y = 5.4;
    g.add(torso);
    const zipper = new THREE.Mesh(new THREE.BoxGeometry(0.18, 5.0, 0.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    zipper.position.set(0, 5.4, 2.42);
    g.add(zipper);
    // Эмблема винограда на груди
    for (let b = 0; b < 4; b++) {
      const gb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 6), thunderMat);
      gb.position.set((b % 2) * 0.35 - 0.17, 6.4 - Math.floor(b / 2) * 0.35, 2.5);
      g.add(gb);
    }

    // Огромная лысая голова-грейпфрут Грейпстасика со светящимися глазами
    const neck = new THREE.Group();
    neck.position.set(0, 8.2, 0);
    g.add(neck);
    const head = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(2.15, 14, 14), headMat), 1.04);
    head.scale.set(1.08, 0.98, 1.04);
    head.position.y = 1.8;
    neck.add(head);
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.2), new THREE.MeshBasicMaterial({ color: 0xfff200 }));
    eyeL.position.set(-0.7, 2.0, 1.98);
    eyeL.rotation.z = -0.22;
    neck.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.7;
    eyeR.rotation.z = 0.22;
    neck.add(eyeR);

    // Руки с фиолетовыми громовыми разрядами («ГРООО-ОО-ОМ! ВУ!»)
    const armLPivot = new THREE.Group();
    armLPivot.position.set(-3.1, 7.2, 0);
    g.add(armLPivot);
    const armLMesh = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.55, 4.2, 8), suitMat), 1.04);
    armLMesh.position.y = -2.0;
    armLPivot.add(armLMesh);
    const thunderL = new THREE.Mesh(new THREE.SphereGeometry(1.25, 10, 10), new THREE.MeshBasicMaterial({ color: 0xd252ff, wireframe: true }));
    thunderL.position.y = -4.2;
    armLPivot.add(thunderL);

    const armRPivot = new THREE.Group();
    armRPivot.position.set(3.1, 7.2, 0);
    g.add(armRPivot);
    const armRMesh = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.55, 4.2, 8), suitMat), 1.04);
    armRMesh.position.y = -2.0;
    armRPivot.add(armRMesh);
    const thunderR = thunderL.clone();
    armRPivot.add(thunderR);

    const legLPivot = new THREE.Group();
    const legRPivot = new THREE.Group();
    g.add(legLPivot, legRPivot);

    scene.add(g);
    activeBoss = {
      type: 'lemon',
      _isBoss: true,
      _isGrapestasik: true,
      name: 'ГРЕЙПСТАСИК — ИСТИННАЯ ГОРЕЧЬ',
      group: g,
      armL: armLPivot,
      armR: armRPivot,
      legL: legLPivot,
      legR: legRPivot,
      neck: neck,
      spark: thunderL,
      ankle: chassis,
      hp: 26000,
      maxHp: 26000,
      vel: new THREE.Vector3(),
      speed: 11,
      radius: 4.8,
      attackCd: 1.8,
      windup: 0,
      dodgeCd: 99,
      flying: false,
      phase: 1,
      chargeCd: 3.5,
      lightningCd: 2.4,
      _phase2: false,
      _rooted: 0
    };
    enemies.push(activeBoss);
    showBossHUD('🍇 ГРЕЙПСТАСИК — КОМАНДУЮЩИЙ CITRUS DEFENSE 🍇', 'ПРОБЕЙТЕ ГУСЕНИЧНОЕ ШАССИ И КИСЛОТНЫЙ ЩИТ!');
    SoundFX.bossRoar();
    return activeBoss;
  };

  // Инициализация конкретной главы Сюжетного Режима
  function startStoryChapter(ch) {
    StoryCampaign.chapter = ch;
    StoryCampaign.objectives = [];
    StoryCampaign.killsDone = 0;
    StoryCampaign.killsNeeded = 0;
    StoryCampaign.bossEntity = null;
    ensureStoryWaypointMesh();

    const titleEl = document.getElementById('story-ch-title');
    const descEl = document.getElementById('story-ch-desc');

    if (ch === 1) {
      titleEl.innerText = '📖 ГЛАВА 1/6: ПРОБУЖДЕНИЕ ОРАНЖ';
      descEl.innerText = 'Уничтожьте 3 Якоря Цитрус Дефенс вокруг Штаба BI (0/3)';
      showComicCutsceneBanner(
        'ЧАСТЬ 5: АПЕЛЬСИНОВАЯ ОРДА',
        '🍊',
        '#ff7f00',
        '<b>Грейпстасик:</b> «Я, Грейпстасик, призываю вас! Вы — моя цитрусовая армия! Якоря Цитрус Дефенс... их единственная цель — уничтожение!»'
      );
      const pts = [[0, -45], [-68, 22], [68, 22]];
      pts.forEach(([x, z]) => {
        StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'anchor'));
        spawnCitrusSoldier(x + 6, z + 6, 'leader');
        spawnCitrusSoldier(x - 6, z + 6, 'mandarin');
      });
    } else if (ch === 2) {
      titleEl.innerText = '📖 ГЛАВА 2/6: АРМИЯ НА МАРШЕ';
      descEl.innerText = 'Разгромите марширующий легион Orange Sentinels и Orange Captain!';
      showComicCutsceneBanner(
        'АРМИЯ НА МАРШЕ',
        '🤖',
        '#eb2f06',
        '<b>Orange Captain:</b> «Банан-Индастриз — это вчера! Цитрус Дефенс — это завтра! Капитан Перец, Егорбанан... Приготовьтесь!»'
      );
      const basePt = new THREE.Vector3(0, 0, 95);
      StoryCampaign.targetPos.copy(basePt);
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const s = spawnCitrusSoldier(basePt.x + Math.cos(ang) * 18, basePt.z + Math.sin(ang) * 18, i % 2 === 0 ? 'leader' : 'shield');
      }
      spawnCitrusAPC(basePt.x, basePt.z + 10);
      StoryCampaign.killsNeeded = 7;
    } else if (ch === 3) {
      titleEl.innerText = '📖 ГЛАВА 3/6: НОВАЯ УГРОЗА — КИСЛОТНЫЙ ШТОРМ';
      descEl.innerText = 'Сбейте Кислотный Апельсин-Дредноут и уничтожьте Виноградных Пауков!';
      showComicCutsceneBanner(
        'ЧАСТЬ 6: КИСЛОТНЫЙ ТРИУМФ',
        '🍇',
        '#6a1b9a',
        '<b>Грейпстасик:</b> «Мир Банан-Индастриз... весь этот сладкий, мягкий мир... он будет стёрт! Вперёд, Кислотный Дредноут и рой пауков!»'
      );
      const dread = spawnStoryObjectiveConstruct(-85, 22, -75, 'acid_dreadnought');
      StoryCampaign.objectives.push(dread);
      for (let i = 0; i < 4; i++) {
        StoryCampaign.objectives.push(window.spawnGrapeSpiderDrone(-85 + (i - 1.5) * 10, -75 + (i % 2) * 10));
      }
    } else if (ch === 4) {
      titleEl.innerText = '📖 ГЛАВА 4/6: ИСПЫТАНИЕ АБСОЛЮТНОЙ БРОНИ';
      descEl.innerText = 'Победите Кислотного Центуриона Грейпстасика («Абсолютное Питание»)!';
      showComicCutsceneBanner(
        'ОГНЕННЫЙ УДАР... ПРОВАЛ?',
        '🛡️',
        '#8e44ad',
        '<b>Кислотный Центурион:</b> «Слишком мягкие! Мой перец — это АБСОЛЮТНОЕ ПИТАНИЕ! Обычный удар не пробьёт мою кислотную броню!»'
      );
      spawnGrapeWarlord(95, 110);
      if (activeBoss) {
        activeBoss.name = 'КИСЛОТНЫЙ ЦЕНТУРИОН ГРЕЙПСТАСИКА';
        showBossHUD('🛡️ КИСЛОТНЫЙ ЦЕНТУРИОН («АБСОЛЮТНОЕ ПИТАНИЕ») 🛡️', 'ИСПОЛЬЗУЙТЕ КОМБО И СПОСОБНОСТИ ДЛЯ ПРОБИТИЯ!');
        StoryCampaign.bossEntity = activeBoss;
      }
    } else if (ch === 5) {
      titleEl.innerText = '📖 ГЛАВА 5/6: ПРОЕКТ «КИСЛОТНЫЙ ТАНДЕМ»';
      descEl.innerText = 'Разрушьте 3 терминала «Кислотного Тандема» на базе Citrus Defense (0/3)';
      showComicCutsceneBanner(
        'ШРЕКИЧ ИИ ВЗЛОМАН!',
        '💻',
        '#00aa44',
        '<b>Шрекич ИИ:</b> «АНАЛИЗ: ПЕРЕГРУЗКА ДАННЫХ... Проект "Кислотный Тандем" активирован! Срочно уничтожьте их терминалы на северной базе!»'
      );
      const tCoords = [[95, -145], [145, -145], [120, -185]];
      tCoords.forEach(([x, z]) => {
        StoryCampaign.objectives.push(spawnStoryObjectiveConstruct(x, 0, z, 'tandem_terminal'));
        window.spawnGrapeSpiderDrone(x + 5, z + 5);
      });
    } else if (ch === 6) {
      titleEl.innerText = '🔥 ФИНАЛ (6/6): ГРЕЙПСТАСИК — ИСТИННАЯ ГОРЕЧЬ';
      descEl.innerText = 'Сокрушите ГРЕЙПСТАСИКА и спасите Нью-Тропик Сити!';
      showComicCutsceneBanner(
        'ФИНАЛЬНАЯ БИТВА: ГРЕЙПСТАСИК!',
        '🍇',
        '#ff0055',
        '<b>Грейпстасик:</b> «Я ГРЕЙПСТАСИК! Я — твой ад! Пришло время для истинной горечи! ГРООО-ОО-ОМ! ВУ! Я уничтожу вашу "Команду"!»',
        9000
      );
      StoryCampaign.bossEntity = window.spawnGrapestasikBoss(0, -110);
      for (let i = 0; i < 3; i++) {
        window.spawnGrapeSpiderDrone((i - 1) * 14, -100);
      }
    } else {
      StoryCampaign.completed = true;
      titleEl.innerText = '🏆 КАМПАНИЯ ПРОЙДЕНА: ТРИУМФ BANANA INDUSTRIES!';
      descEl.innerText = 'Армия Грейпстасика разбита! Свободный режим выживания (+5000 EP)';
      document.getElementById('story-ch-dist').innerText = '⭐ И этот штаб... он всё ещё пахнет как свобода! [Нажмите N для перезапуска сюжета]';
      if (StoryCampaign.waypointBeam) StoryCampaign.waypointBeam.visible = false;
      if (StoryCampaign.waypointRing) StoryCampaign.waypointRing.visible = false;
      player.ep += 5000;
      player.score += 50000;
      updateHUD();
      updateScoreDisplay();
      showComicCutsceneBanner(
        'ПОБЕДА МУЛЬТИФРУКТОВ!',
        '🍌',
        '#2ecc71',
        '<b>Егорбанан и Капитан Перец:</b> «Мы сделали это! "Ягодный Перец" и "Дуриановый Щит" победили! Этот штаб всё ещё пахнет как свобода!»',
        10000
      );
    }
  }

  // Запуск сюжета при старте сессии и клавиша [N] для ручного переключения/перезапуска главы
  setTimeout(() => {
    startStoryChapter(1);
  }, 900);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyN' && gameStarted && !player.isDead) {
      if (StoryCampaign.completed) startStoryChapter(1);
    }
  });

  // Обновление логики Сюжетного Режима, 3D-маркеров, трамплинов и голограмм
  setInterval(() => {
    if (!gameStarted || player.isDead) return;

    // 1. Трамплины (Jump Pads)
    for (let i = 0; i < worldJumpPads.length; i++) {
      const jp = worldJumpPads[i];
      if (jp.cd > 0) jp.cd -= 0.1;
      if (jp.ring) jp.ring.rotation.z += 0.15;
      if (jp.cd <= 0 && player.pos.distanceTo(jp.pos) < 4.0) {
        jp.cd = 1.2;
        player.vel.y = 62;
        player.isGrounded = false;
        player.airFlipTimer = 0.5;
        SoundFX.whip();
        spawnGroundCrackRing(jp.pos, 0x00ff66, 9);
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '*🚀 МЕГА-ТРАМПЛИН!*', '#00ff66');
      }
    }

    // 2. Анимация парящих голограмм Грейпстасика
    const nowSec = performance.now() * 0.001;
    for (let i = 0; i < holoScreens.length; i++) {
      const h = holoScreens[i];
      h.mesh.position.y = h.baseY + Math.sin(nowSec * 1.5 + h.phase) * 1.2;
    }

    // 3. Проверка прогресса текущей главы Сюжетного Режима
    if (StoryCampaign.completed) return;

    const ch = StoryCampaign.chapter;
    const descEl = document.getElementById('story-ch-desc');
    const distEl = document.getElementById('story-ch-dist');

    if (ch === 1 || ch === 3 || ch === 5) {
      // Главы с конкретными объектами-целями (Якоря, Кислотный Дредноут, Терминалы)
      StoryCampaign.objectives = StoryCampaign.objectives.filter((obj) => obj && obj.hp > 0 && enemies.indexOf(obj) !== -1);
      // Вращение ядер объектов
      StoryCampaign.objectives.forEach((obj) => {
        if (obj.group) obj.group.rotation.y += 0.06;
      });

      if (StoryCampaign.objectives.length === 0) {
        SoundFX.devastator();
        player.ep += 250;
        player.score += 5000;
        updateHUD();
        updateScoreDisplay();
        startStoryChapter(ch + 1);
        return;
      }

      // Находим ближайший живой объект миссии для 3D-маркера Waypoint
      let nearest = StoryCampaign.objectives[0];
      let minD = player.pos.distanceTo(nearest.group.position);
      for (let i = 1; i < StoryCampaign.objectives.length; i++) {
        const d = player.pos.distanceTo(StoryCampaign.objectives[i].group.position);
        if (d < minD) { minD = d; nearest = StoryCampaign.objectives[i]; }
      }
      StoryCampaign.targetPos.copy(nearest.group.position);
      if (ch === 1 && descEl) descEl.innerText = `Уничтожьте Якоря Цитрус Дефенс (Осталось: ${StoryCampaign.objectives.length})`;
      if (ch === 3 && descEl) descEl.innerText = `Уничтожьте Кислотный Дредноут и Пауков (Осталось: ${StoryCampaign.objectives.length})`;
      if (ch === 5 && descEl) descEl.innerText = `Разрушьте терминалы «Кислотного Тандема» (Осталось: ${StoryCampaign.objectives.length})`;
    } else if (ch === 2) {
      // Глава 2: зачистка марширующего отряда
      const aliveNear = enemies.filter((e) => !e._isStoryConstruct);
      if (aliveNear.length > 0) {
        StoryCampaign.targetPos.copy(aliveNear[0].group.position);
      }
      if (player.enemiesKilledThisWave >= 6 || aliveNear.length <= 1) {
        SoundFX.devastator();
        player.ep += 300;
        startStoryChapter(3);
        return;
      }
    } else if (ch === 4 || ch === 6) {
      // Главы с сюжетными боссами (Кислотный Центурион / Грейпстасик)
      const b = StoryCampaign.bossEntity;
      if (!b || b.hp <= 0 || enemies.indexOf(b) === -1) {
        SoundFX.devastator();
        player.ep += 600;
        startStoryChapter(ch + 1);
        return;
      }
      StoryCampaign.targetPos.copy(b.group.position);
      // Спец-атаки Грейпстасика в Главе 6
      if (ch === 6 && b._isGrapestasik && Math.random() < 0.12) {
        spawnGroundCrackRing(b.group.position, 0xd252ff, 18);
        if (enemies.filter((e) => e._isGrapeDrone).length < 4) {
          window.spawnGrapeSpiderDrone(b.group.position.x + (Math.random() - 0.5) * 16, b.group.position.z + (Math.random() - 0.5) * 16);
        }
      }
    }

    // Обновляем позицию 3D-луча Waypoint и дистанцию
    if (StoryCampaign.waypointBeam && StoryCampaign.waypointRing) {
      StoryCampaign.waypointBeam.visible = true;
      StoryCampaign.waypointRing.visible = true;
      StoryCampaign.waypointBeam.position.x = StoryCampaign.targetPos.x;
      StoryCampaign.waypointBeam.position.z = StoryCampaign.targetPos.z;
      StoryCampaign.waypointRing.position.set(StoryCampaign.targetPos.x, 0.3, StoryCampaign.targetPos.z);
      StoryCampaign.waypointRing.scale.setScalar(1 + Math.sin(nowSec * 5) * 0.2);
      const distMeters = Math.round(player.pos.distanceTo(StoryCampaign.targetPos));
      if (distEl) distEl.innerText = `📍 НАПРАВЛЕНИЕ К ЦЕЛИ СЮЖЕТА: ${distMeters} М (ЗОЛОТОЙ ЛУЧ НА КАРТЕ)`;
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
      // Ограничиваем радиусом радара, чтобы игрок всегда видел направление к цели!
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
  // ═══ 6. СОХРАНЕНИЕ ВСЕХ ОСТАЛЬНЫХ СИСТЕМ ПАТЧА v53 (КАРТОШКА/ТОМАТ, ШРЕКИЧ, T-ЛУЧ)
  // ═══════════════════════════════════════════════════════════════════════════
  // Цикл Дня/Ночи с видимым Солнцем и Луной
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

  // Главный хук хореографии и энергощита Реактора МК-I
  if (typeof updatePlayerChoreographyAndCamera === 'function') {
    const _origChoreo = window.updatePlayerChoreographyAndCamera;
    window.updatePlayerChoreographyAndCamera = function (dt, now) {
      const isFrozen = window.__MP && window.__MP._myRootedUntil > now;
      const savedX = player.pos.x;
      const savedZ = player.pos.z;
      const preY = player.pos.y;

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

  // Щит Реактора и Броня Картошки
  const origDamageToHero = window.applyDamageToHero;
  window.applyDamageToHero = function (dmg) {
    if (window.__POTATO_MODE && window.__POTATO_FORM === 1 && player._potatoArmor > 0) {
      dmg = Math.floor(dmg * 0.5);
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

  // Меню Esc + Дрон Шрекич [B]
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
            damageEnemy(enemies[i], 2500, new THREE.Vector3(0, 15, 0), '*СИНТЕЗ!*');
          }
        }
        if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'nano_ult', radius: 50 });
        if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 5, 0)), '⚡ БОЖЕСТВЕННЫЙ СИНТЕЗ! ⚡', '#00f2fe');
        if (typeof SoundFX !== 'undefined') { SoundFX.devastator(); SoundFX.boom(); }
      }
    }
  }, 100);

  // F-способности костюмов 0-3 и Хохлоркови
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

  console.log("🍌 [PATCH v70] Готово: Гарпун Хохлоркови 2250м (x5), 3D Крио-Куб [C], Сюжетная Кампания Грейпстасика и новые враги активны.");
})();
