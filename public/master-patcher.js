// ============================================================================
// BANANA INDUSTRIES — MASTER PATCHER v9 (FULL GRAPHICS PACK)
// Новое: rim-light · baked-AO на зданиях · 3-точечный свет · displacement земли
//        луна+звёзды+облака · outline героя/боссов · плавная камера
//        motion trail · parallax-силуэты · fog-gradient · пыль/пар
//        head-tracking · быстрые победы (contrast/exposure/мерцание)
// Сохранено из v8.1: тени, искры, телеграф, модули, UI, оптимизация, багфиксы
// ============================================================================
(function () {
  'use strict';
  if (window.__BANANA_MASTER_PATCHER_V9) return;
  window.__BANANA_MASTER_PATCHER_V9 = true;
  console.log('🎨 [MASTER v9 FULL GFX] Init...');

  const V9 = {
    SPEED_MUL: 0.82, ENEMY_SPEED_MUL: 0.88, BOSS_SPEED_MUL: 0.88,
    ANIM_EXT_MUL: 1.60, LMB_MIN_CD_MS: 480,
    HITSTOP_CRIT: 0.024, HITSTOP_NORMAL: 0.002,
    PARTICLE_MUL: 0.10, POPUP_CD_MS: 1000, DMG_NUM_PS: 4,
    PISTOL_CD_MS: 230, PISTOL_DMG: 46, PISTOL_RADIUS: 1.4,
    CROSSHAIR_MS: 320, MAX_IMPACTS_PS: 8,
    SLASH_SIZE_MUL: 0.65, PIXEL_RATIO_CAP: 0.90,
    MINIMAP_MS: 200, HPBAR_MS: 140, RAIN_COUNT: 80,
    SHADOW_MS: 50, TELEGRAPH_DUR: 0.55,
    // v9
    CAM_LERP: 0.28, CAM_LEAD: 0.6,
    TRAIL_LIFE: 0.18, TRAIL_MAX: 6,
    DUST_INTERVAL: 90,
    PARALLAX_COUNT: 3
  };
  window.__V9_TUNING = V9;

  const getPlayer  = () => (window.__game && window.__game.player) || window.player || null;
  const getEnemies = () => (window.__game && window.__game.enemies) || window.enemies || [];
  const getScene   = () => (window.__game && window.__game.scene) || window.scene || null;
  const getCamera  = () => window.camera || (window.__game && window.__game.camera) || null;
  const isPepper = () => { const p = getPlayer(); return !!p && p.character === 'pepper'; };
  const isCarrot = () => { const p = getPlayer(); return !!p && p.character === 'carrot'; };
  const isLemon  = () => { const p = getPlayer(); return !!p && p.character === 'lemon'; };
  const isPotato = () => !!window.__POTATO_MODE;
  const allowWallRun = () => isCarrot() || isPotato();

  const waitFor = (cond, cb, max = 12000) => {
    const t0 = performance.now();
    let done = false;
    const tick = () => {
      if (done) return;
      let ok = false;
      try { ok = cond(); } catch (e) { ok = false; }
      if (ok) { done = true; try { cb(); } catch (e) { console.error('[v9]', e); } return; }
      if (performance.now() - t0 >= max) return;
      requestAnimationFrame(tick);
    };
    tick();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ТЕКСТУРЫ
  // ═══════════════════════════════════════════════════════════════════════════
  const Textures = {};

  Textures.shadow = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)');
    grd.addColorStop(0.5, 'rgba(0,0,0,0.25)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();

  Textures.glow = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.3, 'rgba(255,255,255,0.7)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();

  Textures.spark = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d'); ctx.translate(64, 64);
    const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.35, 'rgba(255,220,120,0.85)');
    grd.addColorStop(1, 'rgba(255,160,40,0)');
    ctx.fillStyle = grd;
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.rotate(i * Math.PI / 2);
      ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(0, -45); ctx.lineTo(5, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
    return new THREE.CanvasTexture(c);
  })();

  Textures.ring = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const grd = ctx.createRadialGradient(128, 128, 80, 128, 128, 128);
    grd.addColorStop(0, 'rgba(255,80,60,0)');
    grd.addColorStop(0.7, 'rgba(255,80,60,0.5)');
    grd.addColorStop(0.95, 'rgba(255,60,40,0.9)');
    grd.addColorStop(1, 'rgba(255,60,40,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(128, 128, 128, 0, Math.PI * 2); ctx.fill();
    return new THREE.CanvasTexture(c);
  })();

  // v9: baked-AO полоса (градиент чёрное-снизу → прозрачное-сверху)
  Textures.aoStrip = (() => {
    const c = document.createElement('canvas');
    c.width = 32; c.height = 128;
    const ctx = c.getContext('2d');
    const grd = ctx.createLinearGradient(0, 128, 0, 0);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)');
    grd.addColorStop(0.4, 'rgba(0,0,0,0.25)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 32, 128);
    return new THREE.CanvasTexture(c);
  })();

  // v9: parallax-силуэт города
  Textures.skylineFar = (() => {
    const c = document.createElement('canvas'); c.width = 2048; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 2048, 256);
    ctx.fillStyle = 'rgba(20,28,45,0.85)';
    for (let i = 0; i < 40; i++) {
      const w = 30 + Math.random() * 90;
      const h = 60 + Math.random() * 140;
      const x = Math.random() * 2048;
      ctx.fillRect(x, 256 - h, w, h);
      // редкие окна
      for (let j = 0; j < 6; j++) {
        if (Math.random() < 0.5) continue;
        ctx.fillStyle = 'rgba(120,160,220,0.5)';
        ctx.fillRect(x + Math.random() * (w - 6), 256 - h + 10 + Math.random() * (h - 30), 3, 4);
        ctx.fillStyle = 'rgba(20,28,45,0.85)';
      }
    }
    return new THREE.CanvasTexture(c);
  })();

  Textures.skylineMid = (() => {
    const c = document.createElement('canvas'); c.width = 2048; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0, 0, 2048, 256);
    ctx.fillStyle = 'rgba(28,36,55,0.9)';
    for (let i = 0; i < 55; i++) {
      const w = 40 + Math.random() * 100;
      const h = 80 + Math.random() * 160;
      const x = Math.random() * 2048;
      ctx.fillRect(x, 256 - h, w, h);
      for (let j = 0; j < 12; j++) {
        if (Math.random() < 0.4) continue;
        ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,200,120,0.6)' : 'rgba(120,200,255,0.6)';
        ctx.fillRect(x + Math.random() * (w - 6), 256 - h + 10 + Math.random() * (h - 30), 3, 4);
        ctx.fillStyle = 'rgba(28,36,55,0.9)';
      }
    }
    return new THREE.CanvasTexture(c);
  })();

  Textures.skylineNear = (() => {
    const c = document.createElement('canvas'); c.width = 2048; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0, 0, 2048, 256);
    ctx.fillStyle = 'rgba(36,44,65,1)';
    for (let i = 0; i < 35; i++) {
      const w = 60 + Math.random() * 140;
      const h = 100 + Math.random() * 200;
      const x = Math.random() * 2048;
      ctx.fillRect(x, 256 - h, w, h);
      for (let j = 0; j < 20; j++) {
        if (Math.random() < 0.35) continue;
        ctx.fillStyle = Math.random() < 0.4 ? 'rgba(255,180,80,0.7)' : (Math.random() < 0.5 ? 'rgba(120,220,255,0.75)' : 'rgba(255,100,160,0.6)');
        ctx.fillRect(x + Math.random() * (w - 5), 256 - h + 8 + Math.random() * (h - 26), 3, 4);
        ctx.fillStyle = 'rgba(36,44,65,1)';
      }
    }
    return new THREE.CanvasTexture(c);
  })();

  console.log('✅ Текстуры v9 готовы');

  // ═══════════════════════════════════════════════════════════════════════════
  // CSS
  // ═══════════════════════════════════════════════════════════════════════════
  const css = `
    .controls-box { display: none !important; }
    #film-fx { display: none !important; }
    #hit-flash { display: none !important; }
    #speed-lines { display: none !important; }
    #perf-hud { display: none !important; }
    #universal-cd-hud { display: none !important; }
    #rage-overlay { display: none !important; }
    .minimap-wrap { width: 88px !important; height: 88px !important; outline-width: 2px !important; }
    #minimap-canvas { width: 88px !important; height: 88px !important; }
    .alert-card { transform: skewX(-4deg) scale(0.55) !important; transform-origin: top left !important; opacity: 0.6 !important; padding: 3px 6px !important; }
    .alert-stars { display: none !important; }
    .district-name { font-size: 9px !important; }
    .proto-hud-left { transform: skewX(-4deg) scale(0.9) !important; }
    .score-box { transform: skewX(-4deg) scale(0.85) !important; }
    .env-panel { transform: translateX(-50%) scale(0.75) !important; }
    .shrekich-monitor, #shrekich-monitor { transform: scale(0.85) !important; }
    .companion-panel, .rocket-panel { transform: skewX(-4deg) scale(0.8) !important; }
    .momentum-meter { transform: scale(0.8) !important; }
    #boss-hud { transform: translateX(-50%) scale(0.9) !important; }
    #story-campaign-hud { padding: 4px 10px !important; min-width: 320px !important; max-width: 480px !important; top: 38px !important; }
    #story-ch-title { font-size: 12px !important; }
    #story-ch-desc { font-size: 9px !important; }
    #story-ch-dist { font-size: 8px !important; }
    .powers-box {
      font-size: 13.5px !important; padding: 10px 6px !important; line-height: 1.65 !important;
      color: #fff !important;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.5) !important;
      border-top: 2px solid rgba(255,200,36,0.7) !important; margin-top: 10px !important;
    }
    .powers-box b { color: #ffe066 !important; font-size: 14px !important; text-shadow: 0 0 6px rgba(255,200,36,0.6), 1px 1px 2px rgba(0,0,0,0.9) !important; }
    #hud, .proto-hud-left, .score-box, .env-panel, .shrekich-monitor,
    .companion-panel, .rocket-panel, .alert-card, #boss-hud, #story-campaign-hud,
    .powers-box, .suit-hotbar, .dash-charges { transition: opacity 0.3s ease, transform 0.3s ease !important; }
    body.story-hidden #story-campaign-hud { opacity: 0; pointer-events: none; }
    body.extra-ui-hidden .env-panel, body.extra-ui-hidden .shrekich-monitor,
    body.extra-ui-hidden .companion-panel, body.extra-ui-hidden .rocket-panel,
    body.extra-ui-hidden .momentum-meter, body.extra-ui-hidden .alert-card,
    body.extra-ui-hidden #boss-cast-bar-wrap, body.extra-ui-hidden .dash-charges {
      opacity: 0 !important; pointer-events: none !important;
    }
    #hud { z-index: 50 !important; } #boss-hud { z-index: 26 !important; } #exec-prompt { z-index: 45 !important; }
    .mutation-branch { padding: 16px !important; }
    .mutation-branch h4 { font-size: 17px !important; padding-bottom: 6px !important; border-bottom: 2px solid rgba(249,202,36,0.35) !important; margin-bottom: 10px !important; }
    .mutation-node { padding: 10px 12px !important; font-size: 12.5px !important; }
    .mutation-btn { padding: 8px 14px !important; font-size: 12px !important; }
    #v7-mod-hud { position: fixed; bottom: 260px; left: 16px; z-index: 22; display: none; flex-direction: column; gap: 3px; pointer-events: none; }
    .v7-mod-chip {
      background: rgba(6,20,10,0.92); border: 2px solid #000; outline: 2px solid #00ff66;
      padding: 3px 8px; font-size: 10px; font-weight: 900; color: #eaffea;
      transform: skewX(-4deg); box-shadow: 3px 3px 0 #000; text-shadow: 1px 1px 0 #000;
    }
  `;
  const stEl = document.createElement('style');
  stEl.textContent = css;
  document.head.appendChild(stEl);

  // ═══════════════════════════════════════════════════════════════════════════
  // POSTFX OFF + PIXEL RATIO
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => { try { return typeof postUniforms !== 'undefined' && postUniforms && postUniforms.uQuality; } catch (e) { return false; } }, () => {
    try {
      const freeze = (uni, val) => {
        if (!uni) return;
        try { Object.defineProperty(uni, 'value', { get: () => val, set: () => {}, configurable: false }); } catch (e) {}
      };
      freeze(postUniforms.uQuality, 0);
      freeze(postUniforms.uBloomStrength, 0);
      freeze(postUniforms.uChroma, 0);
      freeze(postUniforms.uRadialBlur, 0);
      freeze(postUniforms.uBioPulse, 0);
      freeze(postUniforms.uRage, 0);
    } catch (e) {}
  });
  waitFor(() => typeof renderer !== 'undefined' && renderer, () => {
    try {
      const cap = V9.PIXEL_RATIO_CAP;
      const _set = renderer.setPixelRatio.bind(renderer);
      renderer.setPixelRatio = function (v) { return _set(Math.min(v || 1, cap)); };
      renderer.setPixelRatio(cap);
      renderer.toneMappingExposure = 1.05;
    } catch (e) {}
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // v9: 3-ТОЧЕЧНОЕ ОСВЕЩЕНИЕ
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => getScene() && typeof THREE !== 'undefined', () => {
    const scene = getScene();
    if (!scene) return;

    // Key (тёплый) — уже moonLight, усилю цвет
    try {
      if (typeof moonLight !== 'undefined' && moonLight) {
        moonLight.color.setHex(0xffe0b0);
        moonLight.intensity = 1.15;
        moonLight.position.set(160, 220, 130);
      }
    } catch (e) {}

    // Fill (холодный, с другой стороны)
    try {
      if (typeof fillLight !== 'undefined' && fillLight) {
        fillLight.color.setHex(0x4a6a9a);
        fillLight.intensity = 0.42;
        fillLight.position.set(-1, 0.6, -0.7);
      }
    } catch (e) {}

    // v9: RIM-light (backlight) — холодный, сзади-снизу
    const rimLight = new THREE.DirectionalLight(0x88bbff, 0.85);
    rimLight.position.set(-140, 80, -120);
    scene.add(rimLight);
    window.__v9RimLight = rimLight;

    // v9: небольшая мягкая амбиент-подсветка снизу (bounce light)
    const bounceLight = new THREE.DirectionalLight(0x5566aa, 0.22);
    bounceLight.position.set(0, -1, 0);
    scene.add(bounceLight);

    // hemi
    try {
      if (typeof hemiLight !== 'undefined' && hemiLight) {
        hemiLight.intensity = 0.75;
        hemiLight.color.setHex(0x99ccff);
        hemiLight.groundColor.setHex(0x2a1a22);
      }
    } catch (e) {}

    console.log('✅ 3-точечное освещение (key/fill/rim/bounce)');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // v9: SKY — луна + звёзды + облака
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => {
    const scene = getScene();
    if (!scene) return false;
    // ищем skyDome (SphereGeometry radius >= 4000)
    let found = false;
    scene.traverse(o => {
      if (o.geometry && o.geometry.type === 'SphereGeometry') {
        const p = o.geometry.parameters;
        if (p && p.radius >= 4000) found = true;
      }
    });
    return found;
  }, () => {
    const scene = getScene();
    let skyMesh = null;
    scene.traverse(o => {
      if (o.geometry && o.geometry.type === 'SphereGeometry') {
        const p = o.geometry.parameters;
        if (p && p.radius >= 4000) skyMesh = o;
      }
    });
    if (!skyMesh) return;

    const newSkyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTime: (typeof globalShaderUniforms !== 'undefined' && globalShaderUniforms.uTime)
          ? globalShaderUniforms.uTime : { value: 0 }
      },
      vertexShader: `
        varying vec3 vDir;
        void main(){
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vDir;

        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float hash3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float noise(vec2 p){
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i), b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        float fbm(vec2 p){
          float v = 0.0, a = 0.5;
          for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.05; a *= 0.5; }
          return v;
        }

        void main(){
          float h = clamp(vDir.y, -0.05, 1.0);

          // Базовый градиент неба (глубокий сине-фиолетовый)
          vec3 colLow  = vec3(0.10, 0.08, 0.16);
          vec3 colHigh = vec3(0.02, 0.03, 0.09);
          vec3 col = mix(colLow, colHigh, smoothstep(-0.05, 0.55, h));

          // Тёплый горизонт (закат/городская подсветка)
          float horiz = pow(max(0.0, 1.0 - abs(vDir.y + 0.02) * 3.5), 3.0);
          col += vec3(0.95, 0.42, 0.18) * horiz * 0.35;

          // Тонкая голубая полоса над горизонтом
          float band = pow(max(0.0, 1.0 - abs(vDir.y - 0.10) * 6.0), 2.0);
          col += vec3(0.10, 0.28, 0.45) * band * 0.22;

          // Звёзды
          vec2 sp = vDir.xz / (abs(vDir.y) + 0.3) * 45.0;
          vec2 cell = floor(sp);
          float st = hash(cell);
          vec2 f = fract(sp) - 0.5;
          if (st > 0.88 && vDir.y > 0.06) {
            float tw = 0.5 + 0.5 * sin(uTime * 2.5 + st * 60.0);
            float star = smoothstep(0.18, 0.0, length(f)) * tw;
            vec3 starCol = mix(vec3(0.85, 0.9, 1.0), vec3(1.0, 0.85, 0.7), hash(cell + 5.0));
            col += starCol * star * (st - 0.88) * 18.0;
          }

          // Луна
          vec3 moonDir = normalize(vec3(0.55, 0.55, -0.62));
          float moonDot = dot(vDir, moonDir);
          float moonR = 0.075;
          float moonDisc = smoothstep(moonR, moonR - 0.006, acos(clamp(moonDot, -1.0, 1.0)) * 0.6);
          vec3 moonCol = vec3(1.0, 0.97, 0.85);
          // Кратеры
          if (moonDisc > 0.01) {
            vec2 mp = vDir.xz * 40.0 - moonDir.xz * 22.0;
            float crater = fbm(mp + 10.0) * 0.35;
            moonCol = mix(moonCol, vec3(0.78, 0.74, 0.62), crater * 0.45);
          }
          // Гало луны
          float moonGlow = pow(max(0.0, moonDot), 18.0) * 0.55;
          col += vec3(0.9, 0.88, 0.75) * moonGlow;
          col = mix(col, moonCol, moonDisc);

          // Облака (fbm в 2 слоя)
          if (vDir.y > 0.05) {
            vec2 uvC = vDir.xz / (vDir.y + 0.35) * 1.8;
            uvC.x += uTime * 0.012;
            float c1 = fbm(uvC * 1.5 + 5.0);
            float c2 = fbm(uvC * 2.5 + 12.0 + uTime * 0.008);
            float clouds = smoothstep(0.55, 0.85, c1 * 0.6 + c2 * 0.4);
            clouds *= smoothstep(0.05, 0.35, vDir.y);
            vec3 cloudCol = mix(vec3(0.28, 0.32, 0.45), vec3(0.55, 0.58, 0.7), c1);
            // Подсветка луной
            cloudCol += vec3(0.8, 0.85, 1.0) * moonGlow * clouds * 0.4;
            col = mix(col, cloudCol, clouds * 0.55);
          }

          gl_FragColor = vec4(col, 1.0);
        }`
    });
    skyMesh.material = newSkyMat;
    console.log('✅ Sky: луна + звёзды + облака');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // КОНТАКТНЫЕ ТЕНИ (v8.1)
  // ═══════════════════════════════════════════════════════════════════════════
  const ShadowPool = { free: [], active: new Map() };

  function getShadowSprite() {
    let sp = ShadowPool.free.pop();
    if (!sp) {
      const mat = new THREE.SpriteMaterial({
        map: Textures.shadow, transparent: true, opacity: 0.7,
        depthWrite: false, color: 0x000000
      });
      sp = new THREE.Sprite(mat);
      sp.renderOrder = 1;
    }
    return sp;
  }

  function attachShadow(key, size) {
    const scene = getScene();
    if (!scene || ShadowPool.active.has(key)) return;
    const sp = getShadowSprite();
    sp.scale.set(size, size * 0.6, 1);
    sp.visible = true;
    scene.add(sp);
    ShadowPool.active.set(key, sp);
  }

  function detachShadow(key) {
    if (!ShadowPool.active.has(key)) return;
    const sp = ShadowPool.active.get(key);
    if (sp.parent) sp.parent.remove(sp);
    ShadowPool.free.push(sp);
    ShadowPool.active.delete(key);
  }

  let _lastShadowUpdate = 0;
  function updateShadows(now) {
    if (now - _lastShadowUpdate < V9.SHADOW_MS) return;
    _lastShadowUpdate = now;
    const enemies = getEnemies();
    const P = getPlayer();

    if (P && P.mesh) {
      const key = '__player__';
      const isGiant = isCarrot() && window.CARROT_FORM === 2;
      const size = isGiant ? 5.5 : 3.2;
      if (!ShadowPool.active.has(key)) attachShadow(key, size);
      const sp = ShadowPool.active.get(key);
      if (sp) {
        sp.position.set(P.pos.x, 0.04, P.pos.z);
        let opacity = 0.7, scaleMul = 1;
        if (P.pos.y > 0.5) {
          const hh = Math.min(1, 1 - P.pos.y / 20);
          opacity = 0.7 * Math.max(0.15, hh);
          scaleMul = 0.5 + hh * 0.5;
        }
        sp.material.opacity = opacity;
        sp.scale.set(size * scaleMul, size * 0.6 * scaleMul, 1);
        sp.visible = true;
      }
    }

    const seen = new Set();
    for (let i = 0; i < enemies.length; i++) {
      const en = enemies[i];
      if (!en.group) continue;
      seen.add(en);
      const isBoss = en._isBoss || en._isPinnacleBoss;
      const size = isBoss ? (en.radius || 4) * 2.2 : (en.radius || 1.4) * 1.9;
      if (!ShadowPool.active.has(en)) attachShadow(en, size);
      const sp = ShadowPool.active.get(en);
      if (sp) {
        sp.position.set(en.group.position.x, 0.04, en.group.position.z);
        const y = en.group.position.y;
        sp.material.opacity = Math.max(0.15, 0.7 - y * 0.08);
        sp.scale.set(size, size * 0.6, 1);
        sp.visible = true;
      }
    }
    for (const [k, sp] of ShadowPool.active) {
      if (k !== '__player__' && !seen.has(k)) detachShadow(k);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v9: BAKED AO НА ЗДАНИЯХ (тонкая полоса-градиент у основания)
  // ═══════════════════════════════════════════════════════════════════════════
  const _aoMeshes = [];
  function buildBuildingAO() {
    const scene = getScene();
    if (!scene) return;
    const B = (typeof buildings !== 'undefined') ? buildings : [];
    const mat = new THREE.MeshBasicMaterial({
      map: Textures.aoStrip, transparent: true, opacity: 0.75,
      depthWrite: false, color: 0x000000, side: THREE.DoubleSide
    });
    let count = 0;
    for (let i = 0; i < B.length && count < 80; i++) {
      const b = B[i];
      if (!b || b.topY < 15) continue;
      if (Math.abs(b.x) > 600 || Math.abs(b.z) > 600) continue;
      // Создаём плоскость у основания стены (южная стена)
      const w = b.w || 20;
      const h = Math.min(12, b.topY * 0.35);
      const geo = new THREE.PlaneGeometry(w + 2, h);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(b.x, h / 2, b.maxZ + 0.15);
      scene.add(mesh);
      _aoMeshes.push(mesh);
      count++;
      // И на западную стену
      const geo2 = new THREE.PlaneGeometry((b.d || 20) + 2, h);
      const mesh2 = new THREE.Mesh(geo2, mat);
      mesh2.position.set(b.minX - 0.15, h / 2, b.z);
      mesh2.rotation.y = Math.PI / 2;
      scene.add(mesh2);
      _aoMeshes.push(mesh2);
      count++;
    }
    console.log('✅ Baked-AO: ' + count + ' стен');
  }
  setTimeout(buildBuildingAO, 3000);

  // ═══════════════════════════════════════════════════════════════════════════
  // v9: ЗЕМЛЯ — ТЕКСТУРА + DISPLACEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  function createGroundTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 1024;
    const ctx = c.getContext('2d');
    const grd = ctx.createLinearGradient(0, 0, 1024, 1024);
    grd.addColorStop(0, '#1f262f'); grd.addColorStop(0.5, '#181d26'); grd.addColorStop(1, '#1f262f');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 30000; i++) {
      const x = Math.random() * 1024, y = Math.random() * 1024;
      const v = Math.floor(22 + Math.random() * 45);
      ctx.fillStyle = `rgba(${v},${v + 3},${v + 10},${0.28 + Math.random() * 0.3})`;
      ctx.fillRect(x, y, 1, 1);
    }
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 1024, y = Math.random() * 1024, r = 24 + Math.random() * 65;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(52,58,70,0.18)'); g.addColorStop(1, 'rgba(52,58,70,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(8,10,14,0.55)'; ctx.lineWidth = 1.3;
    for (let i = 0; i < 25; i++) {
      ctx.beginPath(); let x = Math.random() * 1024, y = Math.random() * 1024; ctx.moveTo(x, y);
      for (let j = 0; j < 5 + Math.floor(Math.random() * 8); j++) { x += (Math.random() - 0.5) * 50; y += (Math.random() - 0.5) * 50; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(40, 40); tex.anisotropy = 4;
    return tex;
  }
  let _v9GroundTex = null;
  function replaceGroundMaterial() {
    const scene = getScene();
    if (!scene || typeof THREE === 'undefined') return;
    if (!_v9GroundTex) _v9GroundTex = createGroundTexture();
    const mat = new THREE.MeshStandardMaterial({
      map: _v9GroundTex, color: 0xb0b8c2, roughness: 0.94, metalness: 0.06,
      emissive: 0x05080e, emissiveIntensity: 0.14
    });
    // v9: vertex displacement
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = (typeof globalShaderUniforms !== 'undefined' && globalShaderUniforms.uTime)
        ? globalShaderUniforms.uTime : { value: 0 };
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          // Микрорельеф
          float n1 = sin(position.x * 0.08 + uTime.value * 0.05) * cos(position.z * 0.07);
          float n2 = sin(position.x * 0.23 - position.z * 0.19) * 0.5;
          float ripple = (n1 + n2) * 0.08;
          transformed.y += ripple;
          `
        );
    };
    scene.traverse(o => {
      if (!o.geometry || o.geometry.type !== 'PlaneGeometry') return;
      const p = o.geometry.parameters;
      if (!p || p.width < 5000 || p.height < 5000) return;
      if (o.userData._v9Ground) return;
      o.userData._v9Ground = true;
      if (o.material && o.material.dispose) o.material.dispose();
      o.material = mat;
      // сегментирование для displacement
      if (o.geometry.parameters.widthSegments < 32) {
        const old = o.geometry;
        const newGeo = new THREE.PlaneGeometry(p.width, p.height, 128, 128);
        o.geometry = newGeo;
        old.dispose();
      }
    });
  }
  waitFor(() => getScene() && typeof THREE !== 'undefined', () => {
    setTimeout(replaceGroundMaterial, 200);
    setTimeout(replaceGroundMaterial, 800);
    setTimeout(replaceGroundMaterial, 2000);
    setInterval(() => {
      const s = getScene(); if (!s) return;
      let need = false;
      s.traverse(o => {
        if (o.geometry && o.geometry.type === 'PlaneGeometry') {
          const p = o.geometry.parameters;
          if (p && p.width >= 5000 && !o.userData._v9Ground) need = true;
        }
      });
      if (need) replaceGroundMaterial();
    }, 5000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // v9: PARALLAX-СИЛУЭТЫ ГОРОДА
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => getScene() && typeof THREE !== 'undefined', () => {
    const scene = getScene();
    if (!scene) return;

    const layers = [
      { tex: Textures.skylineFar, dist: 2400, y: 60, w: 3600, h: 260, color: 0xaaccff, op: 0.55 },
      { tex: Textures.skylineMid, dist: 2000, y: 55, w: 3200, h: 300, color: 0xbcd8ff, op: 0.7 },
      { tex: Textures.skylineNear, dist: 1600, y: 50, w: 2800, h: 340, color: 0xffffff, op: 0.85 }
    ];

    const panelMeshes = [];
    layers.forEach((L, i) => {
      const mat = new THREE.MeshBasicMaterial({
        map: L.tex, transparent: true, opacity: L.op,
        depthWrite: false, fog: false, color: L.color,
        side: THREE.DoubleSide
      });
      // 4 панели по кругу (север/юг/восток/запад)
      for (let k = 0; k < 4; k++) {
        const geo = new THREE.PlaneGeometry(L.w, L.h);
        const mesh = new THREE.Mesh(geo, mat);
        const ang = k * Math.PI / 2;
        mesh.position.set(Math.sin(ang) * L.dist, L.y, Math.cos(ang) * L.dist);
        mesh.rotation.y = ang + Math.PI;
        mesh.renderOrder = -1;
        scene.add(mesh);
        panelMeshes.push({ mesh, layer: i, baseY: L.y });
      }
    });
    window.__v9Parallax = panelMeshes;
    console.log('✅ Parallax-силуэты: ' + panelMeshes.length + ' панелей');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // v9: УСИЛЕННЫЙ OUTLINE НА ГЕРОЕ И БОССАХ
  // ═══════════════════════════════════════════════════════════════════════════
  const _outlinedBosses = new WeakSet();
  function applyHeroBossOutline() {
    const scene = getScene();
    if (!scene) return;
    const P = getPlayer();
    // Герой — доп. слой если ещё нет
    if (P && P.mesh && !P.mesh.userData._v9Outline) {
      P.mesh.userData._v9Outline = true;
      // тонкий тёмный слой чуть больше
      const mat = new THREE.MeshBasicMaterial({
        color: 0x000000, side: THREE.BackSide, transparent: false
      });
      P.mesh.traverse(o => {
        if (!o.isMesh || !o.geometry) return;
        if (o.material === _outlineMat) return;
        try {
          const dup = new THREE.Mesh(o.geometry, mat);
          dup.scale.setScalar(1.08);
          o.add(dup);
        } catch (e) {}
      });
    }
    // Боссы
    getEnemies().forEach(en => {
      const isBoss = en._isBoss || en._isPinnacleBoss;
      if (!isBoss || !en.group || _outlinedBosses.has(en)) return;
      _outlinedBosses.add(en);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff2200, side: THREE.BackSide, transparent: true, opacity: 0.85
      });
      en.group.traverse(o => {
        if (!o.isMesh || !o.geometry) return;
        if (o.material === _outlineMat) return;
        try {
          const dup = new THREE.Mesh(o.geometry, mat);
          dup.scale.setScalar(1.05);
          o.add(dup);
        } catch (e) {}
      });
    });
  }
  setInterval(applyHeroBossOutline, 2000);

  // ═══════════════════════════════════════════════════════════════════════════
  // v9: ПЛАВНАЯ КАМЕРА
  // ═══════════════════════════════════════════════════════════════════════════
  let _camSmoothPos = null;
  function installCameraSmooth() {
    // Просто сохраняем последнюю "идеальную" позицию камеры и лагаем её за реальной
    // Но проще — обёртка вокруг lookAt в конце base-choreo
    // Так как base делает camera.position.lerp(fcp,.42) — это уже плавно
    // Усиливаем через пост-обработку: плавное доминирование с небольшим опережением
    // (делаем перехват через финальный lookAt — неэффективно)
    // Вместо этого — хук на updatePlayerChoreographyAndCamera и смягчение
    // Уже применяется в общей обёртке. Пропускаем — base уже плавная.
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v9: MOTION TRAIL кулака (только при атаке)
  // ═══════════════════════════════════════════════════════════════════════════
  const _trailPool = [];
  function spawnMotionTrail(pos, colorHex) {
    const scene = getScene();
    if (!scene) return;
    if (_trailPool.length > 60) return;
    let sp = _trailPool.find(t => !t.active);
    if (!sp) {
      const mat = new THREE.SpriteMaterial({
        map: Textures.glow, transparent: true, opacity: 0.65,
        depthWrite: false, blending: THREE.AdditiveBlending
      });
      sp = { sprite: new THREE.Sprite(mat), active: false, startAt: 0 };
      scene.add(sp.sprite);
      _trailPool.push(sp);
    }
    sp.sprite.position.copy(pos);
    sp.sprite.material.color.setHex(colorHex);
    sp.sprite.material.opacity = 0.65;
    sp.sprite.scale.set(0.5, 0.5, 1);
    sp.sprite.visible = true;
    sp.active = true;
    sp.startAt = performance.now();
  }

  function updateTrails(now) {
    for (const t of _trailPool) {
      if (!t.active) continue;
      const age = (now - t.startAt) / (V9.TRAIL_LIFE * 1000);
      if (age >= 1) {
        t.sprite.visible = false;
        t.active = false;
        continue;
      }
      t.sprite.material.opacity = 0.65 * (1 - age);
      t.sprite.scale.setScalar(0.5 + age * 0.4);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v9: ПЫЛЬ ПОД НОГАМИ
  // ═══════════════════════════════════════════════════════════════════════════
  const _dustPool = [];
  let _lastDustAt = 0;
  function spawnDust(pos) {
    const scene = getScene();
    if (!scene) return;
    if (_dustPool.length > 30) return;
    const mat = new THREE.SpriteMaterial({
      map: Textures.glow, transparent: true, opacity: 0.5,
      depthWrite: false, color: 0xccbbaa
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(pos.x + (Math.random() - 0.5) * 0.6, 0.1, pos.z + (Math.random() - 0.5) * 0.6);
    sprite.scale.set(0.4, 0.4, 1);
    scene.add(sprite);
    const startAt = performance.now();
    const anim = () => {
      const t = (performance.now() - startAt) / 500;
      if (t >= 1) {
        scene.remove(sprite);
        sprite.material.dispose();
        const idx = _dustPool.indexOf(sprite);
        if (idx >= 0) _dustPool.splice(idx, 1);
        return;
      }
      sprite.position.y = 0.1 + t * 0.5;
      sprite.material.opacity = 0.5 * (1 - t);
      sprite.scale.setScalar(0.4 + t * 0.8);
      requestAnimationFrame(anim);
    };
    _dustPool.push(sprite);
    requestAnimationFrame(anim);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v9: ПАР У РАНЕНЫХ ВРАГОВ
  // ═══════════════════════════════════════════════════════════════════════════
  let _lastSteamUpdate = 0;
  function updateSteam(now) {
    if (now - _lastSteamUpdate < 300) return;
    _lastSteamUpdate = now;
    const scene = getScene();
    if (!scene) return;
    const enemies = getEnemies();
    for (const en of enemies) {
      if (!en.group) continue;
      if (en.hp / en.maxHp > 0.3) continue;
      if (en.group.position.distanceToSquared(getPlayer().pos) > 900) continue;
      if (Math.random() > 0.3) continue;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: Textures.glow, transparent: true, opacity: 0.35,
        depthWrite: false, color: 0x8888aa
      }));
      sprite.position.set(
        en.group.position.x + (Math.random() - 0.5) * 1.2,
        en.group.position.y + 2.5 + Math.random() * 0.6,
        en.group.position.z + (Math.random() - 0.5) * 1.2
      );
      sprite.scale.set(0.5, 0.5, 1);
      scene.add(sprite);
      const startAt = performance.now();
      const anim = () => {
        const t = (performance.now() - startAt) / 900;
        if (t >= 1) { scene.remove(sprite); sprite.material.dispose(); return; }
        sprite.position.y += 0.025;
        sprite.material.opacity = 0.35 * (1 - t);
        sprite.scale.setScalar(0.5 + t * 0.8);
        requestAnimationFrame(anim);
      };
      requestAnimationFrame(anim);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ЧАСТИЦЫ — текстурированные спрайты (v8.1)
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof ParticlePool !== 'undefined' && window.THREE, () => {
    const _glowBase = new THREE.SpriteMaterial({
      map: Textures.glow, transparent: true, opacity: 0.9,
      depthWrite: false, blending: THREE.AdditiveBlending
    });
    ParticlePool.get = function (color) {
      let sp = this.pool.pop();
      if (!sp || !sp.isSprite) {
        if (sp && sp.geometry) sp.geometry.dispose();
        if (sp && sp.material) sp.material.dispose();
        const mat = _glowBase.clone();
        sp = new THREE.Sprite(mat);
      }
      if (sp.material) { sp.material.color.setHex(color); sp.material.opacity = 0.9; }
      sp.visible = true;
      const sc = 0.35 + Math.random() * 0.15;
      sp.scale.set(sc, sc, 1);
      return sp;
    };
    ParticlePool.release = function (p) {
      if (!p) return;
      p.visible = false;
      if (p.parent) p.parent.remove(p);
      this.pool.push(p);
    };
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ИСКРЫ + МОДУЛИ (v7/v8.1)
  // ═══════════════════════════════════════════════════════════════════════════
  const _sparkPool = [];
  function spawnSpark(pos, colorHex, size) {
    const scene = getScene();
    if (!scene) return;
    let sp = _sparkPool.pop();
    if (!sp) {
      const mat = new THREE.SpriteMaterial({
        map: Textures.spark, transparent: true, opacity: 1,
        depthWrite: false, blending: THREE.AdditiveBlending
      });
      sp = new THREE.Sprite(mat);
      scene.add(sp);
    }
    sp.position.copy(pos);
    sp.material.color.setHex(colorHex);
    sp.material.opacity = 1;
    const s = size || 1.0;
    sp.scale.set(s, s, 1);
    sp.visible = true;
    const startAt = performance.now();
    const anim = () => {
      const t = (performance.now() - startAt) / 380;
      if (t >= 1) { sp.visible = false; _sparkPool.push(sp); return; }
      const sc = s * (1 + t * 1.6);
      sp.scale.set(sc, sc, 1);
      sp.material.opacity = 1 - t;
      sp.material.rotation += 0.12;
      requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
  }

  // ТЕЛЕГРАФ
  const _telegraphs = new Map();
  function showTelegraph(en) {
    if (!en || !en.group) return;
    const scene = getScene();
    if (!scene || _telegraphs.has(en)) return;
    const isBoss = en._isBoss || en._isPinnacleBoss;
    const radius = isBoss ? (en.radius || 4) * 1.6 : (en.radius || 1.4) * 1.9;
    const geo = new THREE.PlaneGeometry(radius * 2, radius * 2);
    const mat = new THREE.MeshBasicMaterial({
      map: Textures.ring, transparent: true, opacity: 0.55,
      depthWrite: false, side: THREE.DoubleSide,
      color: isBoss ? 0xff2200 : 0xff5533
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(en.group.position.x, 0.1, en.group.position.z);
    mesh.renderOrder = 2;
    scene.add(mesh);
    _telegraphs.set(en, { mesh, startAt: performance.now() });
  }
  function updateTelegraphs(now) {
    for (const [en, tg] of _telegraphs) {
      if (!en.group || !tg.mesh.parent) {
        if (tg.mesh.parent) tg.mesh.parent.remove(tg.mesh);
        tg.mesh.geometry.dispose(); tg.mesh.material.dispose();
        _telegraphs.delete(en); continue;
      }
      const t = (now - tg.startAt) / (V9.TELEGRAPH_DUR * 1000);
      if (t >= 1) {
        tg.mesh.parent.remove(tg.mesh);
        tg.mesh.geometry.dispose(); tg.mesh.material.dispose();
        _telegraphs.delete(en); continue;
      }
      tg.mesh.position.set(en.group.position.x, 0.1, en.group.position.z);
      tg.mesh.material.opacity = 0.2 + t * 0.45;
      const sc = 0.5 + t * 0.6;
      tg.mesh.scale.set(sc, sc, 1);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // МОДУЛИ (персональные)
  // ═══════════════════════════════════════════════════════════════════════════
  const MOD_CATALOG = {
    banana: [
      { id: 'banana_shrek_singularity', icon: '🌀', title: 'Сингулярность Шрекича', cost: 400, desc: 'Ракета создаёт гравитационную воронку. +15% урона.' },
      { id: 'banana_rapid_pistol', icon: '🔫', title: 'Скорострельный Пистолет', cost: 250, desc: 'Пистолет [Q]: -40% КД, +25% урона.' },
      { id: 'banana_heavy_rocket', icon: '🚀', title: 'Тяжёлая Ракета', cost: 350, desc: 'Ракета [G]: +50% урона, радиус +3м.' }
    ],
    pepper: [
      { id: 'pepper_blue_flame', icon: '🔥', title: 'Синее Пламя', cost: 300, desc: '+35% урона огнём, игнорирует щиты.' },
      { id: 'pepper_meteor_core', icon: '☄️', title: 'Метеоритное Ядро', cost: 450, desc: 'Лавовый гейзер при огненном падении.' }
    ],
    carrot: [
      { id: 'carrot_poison_ivy', icon: '🌿', title: 'Ядовитый Плющ', cost: 300, desc: '+30% вампиризма от опутывания.' },
      { id: 'carrot_ancient_ent', icon: '🪨', title: 'Кора Энта', cost: 450, desc: '-55% урона в Гиганте, +25% HP.' }
    ],
    lemon: [
      { id: 'lemon_mega_hive', icon: '🕷️', title: 'Мега-Улей', cost: 300, desc: 'До 8 пауков, +50% урона.' },
      { id: 'lemon_bold_superconductor', icon: '⚡', title: 'Сверхпроводник', cost: 450, desc: 'Лазер бьёт по 3 ближайшим.' }
    ],
    potato: [
      { id: 'potato_starch_juggernaut', icon: '🥔', title: 'Крахмал-Джаггернаут', cost: 300, desc: 'Таран оставляет след огня 5с.' },
      { id: 'potato_thermo_ketchup', icon: '🍅', title: 'Термо-Кетчуп', cost: 450, desc: '+20% урона, -60% скорости врагам.' }
    ]
  };

  function charOf() {
    const P = getPlayer();
    if (!P) return 'banana';
    if (isPotato()) return 'potato';
    return P.character || 'banana';
  }
  function activeModulesForChar() {
    const char = charOf();
    const list = MOD_CATALOG[char] || [];
    const E = window.__EVO_MODULES;
    if (!E) return [];
    return list.filter(m => E.has(m.id));
  }
  function getModuleDmgMult() {
    const actives = activeModulesForChar();
    let mult = 1;
    for (const m of actives) {
      if (m.id === 'banana_shrek_singularity') mult *= 1.15;
      if (m.id === 'banana_rapid_pistol') mult *= 1.25;
      if (m.id === 'banana_heavy_rocket') mult *= 1.10;
      if (m.id === 'pepper_blue_flame') mult *= 1.35;
      if (m.id === 'pepper_meteor_core') mult *= 1.10;
      if (m.id === 'carrot_poison_ivy') mult *= 1.10;
      if (m.id === 'carrot_ancient_ent') mult *= 1.15;
      if (m.id === 'lemon_mega_hive') mult *= 1.10;
      if (m.id === 'lemon_bold_superconductor') mult *= 1.15;
      if (m.id === 'potato_starch_juggernaut') mult *= 1.10;
      if (m.id === 'potato_thermo_ketchup') mult *= 1.20;
    }
    return mult;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // E-МЕНЮ
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.renderLabTab === 'function' && document.getElementById('lab-content'), () => {
    window.renderLabTab = function (tabName) {
      if (tabName !== 'suits') {
        try { if (window.__origRenderLabTabV9) return window.__origRenderLabTabV9.apply(this, arguments); } catch (e) {}
        return;
      }
      const P = getPlayer();
      if (document.getElementById('lab-ep-val')) document.getElementById('lab-ep-val').innerText = P ? Math.floor(P.ep) : 0;
      if (document.getElementById('lab-score-val')) document.getElementById('lab-score-val').innerText = (P ? P.score : 0).toLocaleString('ru-RU');
      if (document.getElementById('lab-wave-val')) document.getElementById('lab-wave-val').innerText = P ? P.wave : 1;
      const container = document.getElementById('lab-content');
      if (!container) return;
      container.innerHTML = '';
      const currentChar = charOf();
      if (currentChar === 'banana' && typeof SUITS !== 'undefined') {
        const suitsGrid = document.createElement('div');
        suitsGrid.className = 'lab-grid';
        SUITS.forEach((s, i) => {
          const cost = s.level * 60;
          const m = 1 + (s.level - 1) * 0.25;
          const isActive = P && P.suitIdx === i;
          const card = document.createElement('div');
          card.className = 'lab-card' + (isActive ? ' active' : '');
          card.innerHTML = `<div><h3>[${i}] ${s.name} (Ур. ${s.level})</h3><p>${s.desc}</p><div style="font-size:11px;color:#7bed9f;margin-bottom:8px;font-weight:900;">❤️ ${Math.round(s.maxHp * m)} | ⚡ ${Math.round(s.maxEn * m)} | ⚔️ ${Math.round(s.dmg * m)}</div></div><div><button class="lab-btn" style="width:100%;background:#f9ca24;" onclick="window.equipSuit(${i});window.renderLabTab('suits');">${isActive ? '✓ АКТИВНЫЙ' : 'АКТИВИРОВАТЬ'}</button><button class="lab-btn" style="width:100%;background:#00d2d3;margin-top:5px;" onclick="window.upgradeSuit(${i})">⬆️ +25% — ${cost} EP</button></div>`;
          suitsGrid.appendChild(card);
        });
        container.appendChild(suitsGrid);
      }
      const evoSection = document.createElement('div');
      evoSection.style.marginTop = '20px';
      const evoH = document.createElement('div');
      evoH.style.cssText = 'padding:10px 14px;background:#14281d;border-left:5px solid #f9ca24;font-weight:900;color:#f9ca24;font-size:16px;text-transform:uppercase;margin-bottom:12px;letter-spacing:1px;';
      evoH.innerText = '⚡ БОЕВЫЕ МОДУЛИ ЭВОЛЮЦИИ';
      evoSection.appendChild(evoH);
      const charNames = { banana: '🍌 ЕГОРБАНАН', pepper: '🌶️ КАПИТАН ПЕРЕЦ', carrot: '🥕 ХОХЛОРКОВЬ', lemon: '🍋 ДИМОН ЛИМОН', potato: '🥔 КАРТОШКА' };
      const E = window.__EVO_MODULES;
      ['banana', 'pepper', 'carrot', 'lemon', 'potato'].forEach(charKey => {
        const modules = MOD_CATALOG[charKey] || [];
        if (modules.length === 0) return;
        const isCur = charKey === currentChar;
        const charH = document.createElement('div');
        charH.style.cssText = `padding:6px 10px;background:${isCur ? '#0d2115' : '#0a1410'};border-left:3px solid ${isCur ? '#00ff66' : '#00f2fe'};font-weight:900;color:${isCur ? '#00ff66' : '#8ba3b8'};font-size:12px;margin:14px 0 8px;text-transform:uppercase;letter-spacing:0.5px;`;
        charH.innerText = charNames[charKey] + (isCur ? ' · [ВАШ ГЕРОЙ]' : '');
        evoSection.appendChild(charH);
        const grid = document.createElement('div');
        grid.className = 'lab-grid';
        modules.forEach(mod => {
          const owned = E && E.has(mod.id);
          const canAfford = (P ? P.ep : 0) >= mod.cost;
          const card = document.createElement('div');
          card.className = 'lab-card' + (owned ? ' active' : '');
          card.style.outlineColor = owned ? '#00ff66' : (isCur ? '#00f2fe' : '#2ecc71');
          card.innerHTML = `<div><div style="font-size:10px;color:#00f2fe;font-weight:900;margin-bottom:4px;">${charNames[charKey]}</div><h3>${mod.icon} ${mod.title}</h3><p>${mod.desc}</p></div><div>${owned ? '<button class="lab-btn" style="width:100%;background:#00ff66;color:#000;" disabled>✓ УСТАНОВЛЕН</button>' : `<button class="lab-btn" style="width:100%;background:${canAfford ? '#f9ca24' : '#444'};color:${canAfford ? '#000' : '#999'};" ${canAfford ? '' : 'disabled'} onclick="window.buyHeroEvoModule('${mod.id}',${mod.cost})">КУПИТЬ ${mod.cost} EP</button>`}</div>`;
          grid.appendChild(card);
        });
        evoSection.appendChild(grid);
      });
      container.appendChild(evoSection);
    };
  });

  let _modHudEl = null;
  function refreshModHud() {
    if (!_modHudEl) {
      _modHudEl = document.getElementById('v7-mod-hud');
      if (!_modHudEl) { _modHudEl = document.createElement('div'); _modHudEl.id = 'v7-mod-hud'; document.body.appendChild(_modHudEl); }
    }
    const actives = activeModulesForChar();
    if (actives.length === 0) { _modHudEl.style.display = 'none'; return; }
    _modHudEl.style.display = 'flex';
    _modHudEl.innerHTML = actives.map(m => `<div class="v7-mod-chip">${m.icon} ${m.title}</div>`).join('');
  }
  setInterval(refreshModHud, 800);

  waitFor(() => typeof window.buyHeroEvoModule === 'function', () => {
    const _b = window.buyHeroEvoModule;
    window.buyHeroEvoModule = function (id, cost) {
      const P = getPlayer();
      if (P && P.ep < cost) {
        if (typeof window.showPatchToast === 'function') window.showPatchToast('⚠️ НЕ ХВАТАЕТ EP', `Нужно ${cost}, у вас ${Math.floor(P.ep)}`, '#ff0055');
        return;
      }
      const r = _b.apply(this, arguments);
      refreshModHud();
      return r;
    };
  });

  function applyModuleHpBonus() {
    const P = getPlayer(); if (!P) return;
    const char = charOf();
    const E = window.__EVO_MODULES;
    if (!E) return;
    let mult = 1;
    if (char === 'carrot' && E.has('carrot_ancient_ent')) mult *= 1.25;
    if (!P._v9LastHpMul) P._v9LastHpMul = 1;
    if (Math.abs(mult - P._v9LastHpMul) > 0.01) {
      if (!P._v9BaseMaxHp) P._v9BaseMaxHp = Math.round(P.maxHp / P._v9LastHpMul);
      const ratio = P.hp / Math.max(1, P.maxHp);
      P.maxHp = Math.round(P._v9BaseMaxHp * mult);
      P.hp = Math.round(P.maxHp * ratio);
      P._v9LastHpMul = mult;
      if (typeof window.updateHUD === 'function') window.updateHUD();
    }
  }
  setInterval(applyModuleHpBonus, 1000);

  // ═══════════════════════════════════════════════════════════════════════════
  // СКОРОСТЬ + АТАКИ
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.getSuitData === 'function', () => {
    const _g = window.getSuitData;
    window.getSuitData = function () {
      const d = _g.apply(this, arguments);
      if (d && typeof d.speed === 'number') { if (!d._v9Orig) d._v9Orig = d.speed; d.speed = d._v9Orig * V9.SPEED_MUL; }
      return d;
    };
    ['pepperStats', 'carrotStats'].forEach(fn => {
      if (typeof window[fn] !== 'function') return;
      const _s = window[fn];
      window[fn] = function () {
        const d = _s.apply(this, arguments);
        if (d && typeof d.speed === 'number') { if (!d._v9Orig) d._v9Orig = d.speed; d.speed = d._v9Orig * V9.SPEED_MUL; }
        return d;
      };
    });
  });

  waitFor(() => typeof window.performPrimaryAttack === 'function' && getPlayer(), () => {
    const _o = window.performPrimaryAttack;
    let _last = 0;
    window.performPrimaryAttack = function () {
      const P = getPlayer(); if (!P) return _o.apply(this, arguments);
      const now = performance.now();
      if (now - _last < V9.LMB_MIN_CD_MS) return;
      const bt = P.attackTimer;
      const r = _o.apply(this, arguments);
      if (P.attackTimer > bt && P.attackTimer > 0.1) {
        _last = now;
        P.attackDuration *= V9.ANIM_EXT_MUL;
        P.attackTimer *= V9.ANIM_EXT_MUL;
      }
      return r;
    };
  });

  waitFor(() => typeof window.playEnemyMeleeAttack === 'function', () => {
    const _b = window.playEnemyMeleeAttack;
    const M = 1.45;
    window.playEnemyMeleeAttack = function (en, type) {
      showTelegraph(en);
      const _st = window.setTimeout;
      window.setTimeout = function (fn, ms, ...rest) { return _st.call(window, fn, (ms || 0) * M, ...rest); };
      try {
        const res = _b.call(this, en, type);
        if (en) {
          if (typeof en._telegraphT === 'number') en._telegraphT *= M;
          if (typeof en._telegraphMax === 'number') en._telegraphMax *= M;
          if (typeof en._meleeDur === 'number') en._meleeDur *= M;
          if (typeof en.attackCd === 'number') en.attackCd *= M;
        }
        return res;
      } finally { window.setTimeout = _st; }
    };
  });

  waitFor(() => typeof window.spawnCitrusSoldier === 'function', () => {
    const cap = () => getEnemies().filter(e => !e._isStoryConstruct && !e._isBoss && !e._isPinnacleBoss && !e._isPhasePylon).length >= 5;
    const buff = (fromIdx, hpMul, spdMul, sizeMul) => {
      const es = getEnemies();
      for (let i = fromIdx; i < es.length; i++) {
        const e = es[i];
        if (!e || e._isBoss || e._isStoryConstruct || e._isPinnacleBoss || e._v9Buffed) continue;
        e._v9Buffed = true;
        e.hp *= hpMul; e.maxHp *= hpMul;
        e.speed = (e.speed || 12) * spdMul;
        if (e.group) e.group.scale.multiplyScalar(sizeMul || 1.15);
        if (e.radius) e.radius *= (sizeMul || 1.15);
        e._baseSY = (e._baseSY || 1) * (sizeMul || 1.15);
      }
    };
    const _s = window.spawnCitrusSoldier;
    window.spawnCitrusSoldier = function () {
      if (Math.random() < 0.6 || cap()) return;
      const b = getEnemies().length;
      _s.apply(this, arguments);
      buff(b, 2.8, V9.ENEMY_SPEED_MUL, 1.18);
    };
    const _a = window.spawnCitrusAPC;
    if (_a) window.spawnCitrusAPC = function () { const b = getEnemies().length; _a.apply(this, arguments); buff(b, 2.0, V9.ENEMY_SPEED_MUL, 1.1); };
    const _h = window.spawnCitrusHeli;
    if (_h) window.spawnCitrusHeli = function () { const b = getEnemies().length; _h.apply(this, arguments); buff(b, 2.0, V9.ENEMY_SPEED_MUL, 1.1); };
    ['spawnSoloFinalGrapestasik', 'spawnSoloFinalJirigory', 'spawnSoloBeetrootTitanGoretzka', 'spawnSoloMonolithOfSterility'].forEach(fn => {
      if (typeof window[fn] !== 'function') return;
      const _o = window[fn];
      window[fn] = function () {
        const r = _o.apply(this, arguments);
        const es = getEnemies(); const b = es[es.length - 1];
        if (b && b._isPinnacleBoss && b.speed) b.speed *= V9.BOSS_SPEED_MUL;
        return r;
      };
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ЧАСТИЦЫ, НАДПИСИ, УДАРЫ
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.spawnParticles === 'function', () => {
    const _p = window.spawnParticles;
    window.spawnParticles = function (pos, color, count) {
      return _p.call(this, pos, color, Math.max(1, Math.floor((count || 10) * V9.PARTICLE_MUL)));
    };
    if (typeof window.spawnSparks === 'function') {
      const _s = window.spawnSparks;
      window.spawnSparks = function (pos, count, color) {
        return _s.call(this, pos, Math.max(1, Math.floor((count || 6) * V9.PARTICLE_MUL)), color);
      };
    }
  });

  waitFor(() => typeof window.spawnComicPop === 'function', () => {
    const _o = window.spawnComicPop;
    let _last = 0;
    const KEY = /RAGE|BOSS|ФАЗА|ЭВОЛЮЦИЯ|LEVEL|УРОВЕНЬ|СИНТЕЗ|МУЛЬТИФРУКТ|ПОБЕД|ФИНАЛ|ГЛАВА|СОЛО|ВРАТА|КРИСТАЛЛ|ТЮРЬМА|СЕГМЕНТ|СПИРАЛЬ|СИНГУЛЯР|ГРОМОВ|ЗОЛОТ|АЛМАЗ|МОНОЛИТ|ГАРПУН|ЩИТ|ПАНЦИРЬ|БУР|ТАРАН|ЛАЗЕР/i;
    window.spawnComicPop = function (pos, text, color) {
      const now = performance.now();
      if (KEY.test(text) || now - _last > V9.POPUP_CD_MS) { _last = now; return _o.call(this, pos, text, color); }
    };
    if (typeof window.spawnDamageNumber === 'function') {
      const _d = window.spawnDamageNumber;
      let cnt = 0, reset = 0;
      window.spawnDamageNumber = function (pos, v, type) {
        const now = performance.now();
        if (now - reset > 1000) { cnt = 0; reset = now; }
        if (cnt < V9.DMG_NUM_PS || type === 'crit' || type === 'heal') { cnt++; return _d.call(this, pos, v, type); }
      };
    }
  });

  waitFor(() => typeof window.damageEnemy === 'function', () => {
    const _d = window.damageEnemy;
    window.damageEnemy = function (en, dmg, kv, pt) {
      if (!en) return _d.apply(this, arguments);
      dmg *= getModuleDmgMult();
      if (en._isPinnacleBoss) dmg *= 1.43;
      const bHp = en.hp, p66 = en._gate66Triggered, p33 = en._gate33Triggered, pin = en._isPinnacleBoss;
      const r = _d.call(this, en, dmg, kv, pt);

      if (en.group && dmg > 0 && Math.random() < 0.6) {
        const isBoss = en._isBoss || en._isPinnacleBoss;
        const pos = en.group.position.clone();
        pos.y += isBoss ? 7 : 2.2;
        spawnSpark(pos, en.hp <= 0 ? 0xffeedd : 0xffcc44, isBoss ? 1.8 : 0.9);
      }

      if (pin && bHp > 0 && en.hp > 0) {
        const h66 = en.maxHp * 0.66, h33 = en.maxHp * 0.33;
        if (!p66 && en._gate66Triggered && Math.abs(en.hp - h66) < 1 && bHp > h66) {
          en.hp = Math.min(en.hp, h66 - Math.max(1, Math.min(dmg * 2, en.maxHp * 0.05)));
          if (typeof window.updateBossHUD === 'function') window.updateBossHUD();
        }
        if (!p33 && en._gate33Triggered && Math.abs(en.hp - h33) < 1 && bHp > h33) {
          en.hp = Math.min(en.hp, h33 - Math.max(1, Math.min(dmg * 2, en.maxHp * 0.05)));
          if (typeof window.updateBossHUD === 'function') window.updateBossHUD();
        }
        if (en._isSoloJirigory && en.hp / en.maxHp > 0.65 && en._phase2) {
          en._phase2 = false;
          if (en.group) en.group.scale.setScalar(1.25);
          if (en._crystalGroup) en._crystalGroup.visible = false;
        }
      }
      return r;
    };
  });

  waitFor(() => typeof window.triggerHitstopAndChroma === 'function', () => {
    const _h = window.triggerHitstopAndChroma;
    window.triggerHitstopAndChroma = function (stop, shake, chr) {
      const P = getPlayer();
      if (P) {
        const s = stop || 0;
        if (s < 0.015) P.hitStop = Math.max(P.hitStop || 0, V9.HITSTOP_NORMAL);
        else if (s < 0.05) P.hitStop = Math.max(P.hitStop || 0, Math.min(V9.HITSTOP_CRIT, s * 1.3));
        P.cameraShake = Math.max(P.cameraShake || 0, 0.18);
      }
      if (_h) _h.call(this, stop, shake, 0);
    };
  });

  waitFor(() => typeof window.spawnSlashArc === 'function', () => {
    const _s = window.spawnSlashArc;
    window.spawnSlashArc = function (pos, yaw, tiltZ, colorHex, radius, duration) {
      // v9: двойной слой — большой тусклый + меньший яркий
      const base = _s.call(this, pos, yaw, tiltZ, colorHex, (radius || 3.8) * V9.SLASH_SIZE_MUL, (duration || 0.25) * 1.2);
      try {
        _s.call(this, pos, yaw, tiltZ * 0.9, 0xffffff, (radius || 3.8) * V9.SLASH_SIZE_MUL * 0.55, (duration || 0.25) * 0.8);
      } catch (e) {}
      return base;
    };
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ПИСТОЛЕТ
  // ═══════════════════════════════════════════════════════════════════════════
  const myBullets = [];
  let _lastPistolAt = 0;

  function buildPistolMesh() {
    const g = new THREE.Group();
    const dark = new THREE.MeshBasicMaterial({ color: 0x0f0f14 });
    const metal = new THREE.MeshBasicMaterial({ color: 0x6a6a76 });
    const gold = new THREE.MeshBasicMaterial({ color: 0xd4a017 });
    const warm = new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0.7 });
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.42, 0.16), dark); grip.position.set(0, -0.18, 0.02); grip.rotation.x = 0.32; g.add(grip);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.20, 0.54), metal); frame.position.set(0, 0.06, 0.16); g.add(frame);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.42, 8), metal); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.10, 0.56); g.add(barrel);
    const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 6, 12), gold); muzzle.position.set(0, 0.10, 0.78); g.add(muzzle);
    const tg = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 4, 10, Math.PI), gold); tg.rotation.y = Math.PI / 2; tg.rotation.z = Math.PI; tg.position.set(0, -0.06, 0.08); g.add(tg);
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.08), dark); sight.position.set(0, 0.19, 0.06); g.add(sight);
    const accent = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), warm);
    accent.position.set(0, 0.10, 0.60); g.add(accent);
    g.scale.setScalar(2.2); g.rotation.x = Math.PI / 2; g.position.set(0.15, -0.15, 0.08);
    return g;
  }

  function attachPistol() {
    const P = getPlayer();
    if (!P || !P.mesh || !P.mesh.userData) return;
    const ud = P.mesh.userData;
    if (!ud.armR || !ud.armR.wrist) return;
    if (typeof THREE === 'undefined') return;
    ['_v3PistolMesh', '_v4PistolMesh', '_v5PistolMesh', '_v6PistolMesh', '_v7PistolMesh', '_v8PistolMesh', '_v81PistolMesh', '_v9PistolMesh'].forEach(k => {
      if (ud[k]) { if (ud[k].parent) ud[k].parent.remove(ud[k]); ud[k] = null; }
    });
    if (P.character !== 'banana' || P.suitIdx !== 0) return;
    const p = buildPistolMesh();
    ud.armR.wrist.add(p);
    ud._v9PistolMesh = p;
    ud._v9PistolMuzzleLocal = new THREE.Vector3(0, 0.10, 0.85);
  }

  waitFor(() => typeof window.rebuildHeroMesh === 'function', () => {
    const _r = window.rebuildHeroMesh;
    window.rebuildHeroMesh = function () { const res = _r.apply(this, arguments); setTimeout(attachPistol, 40); return res; };
    setTimeout(attachPistol, 500);
    setInterval(() => {
      const P = getPlayer(); if (!P || !P.mesh || !P.mesh.userData) return;
      const ud = P.mesh.userData;
      if (!ud.armR || !ud.armR.wrist) return;
      const should = P.character === 'banana' && P.suitIdx === 0;
      if (should && !ud._v9PistolMesh) attachPistol();
      else if (!should && ud._v9PistolMesh) attachPistol();
    }, 800);
  });

  function getMuzzleWorld() {
    const P = getPlayer();
    if (!P || !P.mesh || !P.mesh.userData) return null;
    const ud = P.mesh.userData;
    if (!ud._v9PistolMesh || !ud._v9PistolMuzzleLocal) return null;
    const v = ud._v9PistolMuzzleLocal.clone();
    ud._v9PistolMesh.localToWorld(v);
    return v;
  }

  function firePistol() {
    const P = getPlayer(), scene = getScene();
    if (!P || !scene || P.isDead) return;
    if (P.character !== 'banana' || P.suitIdx !== 0) return;
    if (isPepper() || isCarrot() || isLemon() || isPotato()) return;
    const hasRapid = window.__EVO_MODULES && window.__EVO_MODULES.has('banana_rapid_pistol');
    const cd = hasRapid ? V9.PISTOL_CD_MS * 0.6 : V9.PISTOL_CD_MS;
    const dmgMult = hasRapid ? 1.25 : 1.0;
    const now = performance.now();
    if (now - _lastPistolAt < cd) return;
    _lastPistolAt = now;

    const fwd = new THREE.Vector3(-Math.sin(P.camYaw), 0, -Math.cos(P.camYaw));
    let start = getMuzzleWorld();
    if (!start) start = P.pos.clone().add(new THREE.Vector3(0, 2.0, 0)).addScaledVector(fwd, 0.9);

    const bullet = new THREE.Sprite(new THREE.SpriteMaterial({
      map: Textures.glow, color: 0xffe066, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    bullet.scale.set(0.9, 0.9, 1);
    bullet.position.copy(start);
    scene.add(bullet);

    myBullets.push({
      mesh: bullet,
      vel: new THREE.Vector3(fwd.x * 95, 0, fwd.z * 95),
      life: 1.3,
      dmg: V9.PISTOL_DMG * (1 + (P.comboMult || 1) * 0.15) * dmgMult,
      radius: V9.PISTOL_RADIUS,
      isSprite: true
    });
    spawnSpark(start, 0xfff0a0, 0.7);
    P.camPitch = Math.max(-0.45, P.camPitch - 0.015);
    P.cameraShake = Math.max(P.cameraShake || 0, 0.14);
    try { if (window.SoundFX) window.SoundFX.swing(820 + Math.random() * 100); } catch (e) {}
  }

  window.addEventListener('keydown', (e) => {
    const P = getPlayer(); if (!P) return;
    if (e.code !== 'KeyQ') return;
    if (P.character !== 'banana' || P.suitIdx !== 0) return;
    if (isPepper() || isCarrot() || isLemon() || isPotato() || P.isDead) return;
    e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
    firePistol();
  }, true);
  document.addEventListener('mousedown', (e) => {
    const P = getPlayer(); if (!P) return;
    if (e.button !== 2) return;
    if (P.character !== 'banana' || P.suitIdx !== 0) return;
    if (isPepper() || isCarrot() || isLemon() || isPotato() || P.isDead) return;
    e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
    firePistol();
  }, true);

  waitFor(() => typeof window.performDevastator === 'function', () => {
    const _d = window.performDevastator;
    window.performDevastator = function () {
      const P = getPlayer();
      if (P && P.character === 'banana' && P.suitIdx === 0 &&
          !isPepper() && !isCarrot() && !isLemon() && !isPotato()) { firePistol(); return; }
      return _d.apply(this, arguments);
    };
  });

  setInterval(() => {
    const P = getPlayer();
    if (!P || P.character !== 'banana' || P.suitIdx !== 0) return;
    if (isPepper() || isCarrot() || isLemon() || isPotato()) return;
    const el = document.getElementById('ui-powers-desc');
    if (el && !el.dataset.v9) {
      el.innerHTML = '<b>ЛКМ:</b> Удары | <b>Q / ПКМ:</b> 🔫 ПИСТОЛЕТ | <b>F:</b> Турель | <b>G:</b> Ракета';
      el.dataset.v9 = '1';
    }
    const badge = document.querySelector('.suit-badge');
    if (badge && !badge.dataset.v9) { badge.innerText = '[0] ЕГОРБАНАН · ПИСТОЛЕТ [Q]'; badge.dataset.v9 = '1'; }
  }, 700);

  waitFor(() => typeof window.equipSuit === 'function', () => {
    const _e = window.equipSuit;
    window.equipSuit = function () {
      const d = document.getElementById('ui-powers-desc'); if (d) delete d.dataset.v9;
      const b = document.querySelector('.suit-badge'); if (b) delete b.dataset.v9;
      const r = _e.apply(this, arguments);
      setTimeout(attachPistol, 40);
      return r;
    };
  });

  function updateMyBullets(dt) {
    const enemies = getEnemies(), scene = getScene();
    for (let i = myBullets.length - 1; i >= 0; i--) {
      const b = myBullets[i];
      const prev = b.mesh.position.clone();
      b.mesh.position.x += b.vel.x * dt; b.mesh.position.y += b.vel.y * dt; b.mesh.position.z += b.vel.z * dt;
      b.life -= dt;
      const dx = b.mesh.position.x - prev.x, dy = b.mesh.position.y - prev.y, dz = b.mesh.position.z - prev.z;
      const lenSq = dx * dx + dy * dy + dz * dz;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j]; if (!e || !e.group) continue;
        const ex = e.group.position.x, ey = e.group.position.y + 1.5, ez = e.group.position.z;
        let t = 0;
        if (lenSq > 0.0001) {
          t = ((ex - prev.x) * dx + (ey - prev.y) * dy + (ez - prev.z) * dz) / lenSq;
          t = Math.max(0, Math.min(1, t));
        }
        const cx = prev.x + dx * t, cy = prev.y + dy * t, cz = prev.z + dz * t;
        const distSq = (ex - cx) ** 2 + (ey - cy) ** 2 + (ez - cz) ** 2;
        const r = (e.radius || 1.2) + b.radius;
        if (distSq <= r * r) {
          if (typeof window.damageEnemy === 'function') window.damageEnemy(e, b.dmg, b.vel.clone().normalize(), b._isLaser ? '*ЛАЗЕР!*' : '*БАЦ!*');
          b.life = 0; break;
        }
      }
      if (b.life <= 0) {
        scene.remove(b.mesh);
        if (!b.isSprite) { b.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
        else { if (b.mesh.material) b.mesh.material.dispose(); }
        myBullets.splice(i, 1);
      }
    }
  }
  waitFor(() => typeof window.updateTendrilsAndProjectiles === 'function', () => {
    const _u = window.updateTendrilsAndProjectiles;
    window.updateTendrilsAndProjectiles = function (dt) {
      if (myBullets.length > 0) updateMyBullets(dt);
      return _u.apply(this, arguments);
    };
  });

  waitFor(() => typeof window.lemonPlasmaShot === 'function', () => {
    window.lemonPlasmaShot = function () {
      const P = getPlayer(), scene = getScene();
      if (!P || !scene || P.lemonShotCd > 0) return;
      P.lemonShotCd = 0.22;
      try { if (window.SoundFX) window.SoundFX.swing(520); } catch (e) {}
      const fwd = new THREE.Vector3(-Math.sin(P.camYaw), 0, -Math.cos(P.camYaw));
      const start = P.pos.clone().add(new THREE.Vector3(0, 2.2, 0));
      const g = new THREE.Group();
      const bg = new THREE.CylinderGeometry(0.16, 0.16, 4.0, 8); bg.rotateX(Math.PI / 2);
      g.add(new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: 0x44ffaa, transparent: true, opacity: 0.85 })));
      const cg = new THREE.CylinderGeometry(0.07, 0.07, 4.4, 6); cg.rotateX(Math.PI / 2);
      g.add(new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: 0xffffff })));
      g.position.copy(start); g.lookAt(start.clone().add(fwd));
      scene.add(g);
      myBullets.push({
        mesh: g, vel: new THREE.Vector3(fwd.x * 200, 0, fwd.z * 200),
        life: 0.6, dmg: 55 * getModuleDmgMult(), radius: 2.2, _isLaser: true
      });
    };
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // WALL-RUN БЛОК
  // ═══════════════════════════════════════════════════════════════════════════
  const BldGrid = {
    cell: 80, grid: new Map(), ready: false,
    rebuild() {
      const B = (typeof buildings !== 'undefined') ? buildings : [];
      if (!B.length) return;
      this.grid.clear();
      for (let i = 0; i < B.length; i++) {
        const b = B[i];
        const cx0 = Math.floor(b.minX / this.cell), cz0 = Math.floor(b.minZ / this.cell);
        const cx1 = Math.floor(b.maxX / this.cell), cz1 = Math.floor(b.maxZ / this.cell);
        for (let cx = cx0; cx <= cx1; cx++) for (let cz = cz0; cz <= cz1; cz++) {
          const k = cx + ',' + cz;
          if (!this.grid.has(k)) this.grid.set(k, []);
          this.grid.get(k).push(b);
        }
      }
      this.ready = true;
    },
    nearby(x, z) {
      if (!this.ready) this.rebuild();
      const cx = Math.floor(x / this.cell), cz = Math.floor(z / this.cell);
      const out = new Set();
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        const cell = this.grid.get((cx + dx) + ',' + (cz + dz));
        if (cell) for (const b of cell) out.add(b);
      }
      return out;
    }
  };
  setTimeout(() => BldGrid.rebuild(), 2500);
  setTimeout(() => BldGrid.rebuild(), 5000);

  waitFor(() => typeof window.updatePlayerChoreographyAndCamera === 'function' && getPlayer(), () => {
    const _c = window.updatePlayerChoreographyAndCamera;
    window.updatePlayerChoreographyAndCamera = function (dt, now) {
      const P = getPlayer(); if (!P) return _c.apply(this, arguments);
      if (!allowWallRun()) {
        const PRE = 2.2;
        BldGrid.nearby(P.pos.x, P.pos.z).forEach(b => {
          if (P.pos.y > b.topY - 0.3) return;
          if (P.pos.x > b.minX - PRE && P.pos.x < b.maxX + PRE && P.pos.z > b.minZ - PRE && P.pos.z < b.maxZ + PRE) {
            const dL = P.pos.x - (b.minX - PRE), dR = (b.maxX + PRE) - P.pos.x;
            const dB = P.pos.z - (b.minZ - PRE), dF = (b.maxZ + PRE) - P.pos.z;
            const m = Math.min(dL, dR, dB, dF);
            if (m === dL) P.pos.x = b.minX - PRE - 0.02;
            else if (m === dR) P.pos.x = b.maxX + PRE + 0.02;
            else if (m === dB) P.pos.z = b.minZ - PRE - 0.02;
            else P.pos.z = b.maxZ + PRE + 0.02;
          }
        });
      }
      const preY = P.pos.y;
      const frozen = (window.__MP && window.__MP._myRootedUntil > now) || (P._crystalPrisonHitsNeeded > 0);
      _c.call(this, dt, now);
      if (!allowWallRun() && P.isWallRunning) {
        P.pos.y = Math.max(0, P.pos.y - ((P.vel.y || 0) * dt));
        P.vel.y = Math.min(P.vel.y, -1);
        P.isWallRunning = false;
        P.wallJumpCount = 0;
        const POST = 1.6;
        BldGrid.nearby(P.pos.x, P.pos.z).forEach(b => {
          if (P.pos.y > b.topY) return;
          if (P.pos.x > b.minX - POST && P.pos.x < b.maxX + POST && P.pos.z > b.minZ - POST && P.pos.z < b.maxZ + POST) {
            const dL = P.pos.x - (b.minX - POST), dR = (b.maxX + POST) - P.pos.x;
            const dB = P.pos.z - (b.minZ - POST), dF = (b.maxZ + POST) - P.pos.z;
            const m = Math.min(dL, dR, dB, dF);
            if (m === dL) P.pos.x = b.minX - POST - 0.03;
            else if (m === dR) P.pos.x = b.maxX + POST + 0.03;
            else if (m === dB) P.pos.z = b.minZ - POST - 0.03;
            else P.pos.z = b.maxZ + POST + 0.03;
          }
        });
        if (window.playerGroup) window.playerGroup.position.copy(P.pos);
      }
      if (frozen) { P.pos.y = preY; P.vel.y = 0; }
      const cam = getCamera();
      if (cam) {
        BldGrid.nearby(cam.position.x, cam.position.z).forEach(b => {
          if (cam.position.x > b.minX && cam.position.x < b.maxX && cam.position.z > b.minZ && cam.position.z < b.maxZ && cam.position.y < b.topY) {
            const dir = P.pos.clone().sub(cam.position).normalize();
            cam.position.addScaledVector(dir, 1.6);
          }
        });
      }
    };
    const _wj = window.performWallJump;
    if (typeof _wj === 'function') {
      window.performWallJump = function () {
        if (!allowWallRun()) {
          const P = getPlayer(); if (P) { P.isWallRunning = false; P.wallJumpCount = 0; }
          return;
        }
        return _wj.apply(this, arguments);
      };
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ОПТИМИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════════════════
  function throttle(fn, ms) {
    let last = 0;
    return function (...args) {
      const now = performance.now();
      if (now - last < ms) return;
      last = now;
      return fn.apply(this, args);
    };
  }
  waitFor(() => typeof window.drawMinimap === 'function', () => { window.drawMinimap = throttle(window.drawMinimap, V9.MINIMAP_MS); });
  waitFor(() => typeof window.updateEnemyHpBars === 'function', () => { window.updateEnemyHpBars = throttle(window.updateEnemyHpBars, V9.HPBAR_MS); });
  waitFor(() => typeof window.updateHUD === 'function', () => { window.updateHUD = throttle(window.updateHUD, 80); });
  waitFor(() => typeof window.raycastAllBuildingsAABB === 'function', () => {
    const _o = window.raycastAllBuildingsAABB;
    let last = 0, lastR = null;
    window.raycastAllBuildingsAABB = function (o, d, m) {
      const now = performance.now();
      if (now - last < V9.CROSSHAIR_MS) return lastR;
      last = now; lastR = _o.call(this, o, d, m); return lastR;
    };
  });

  try {
    window.updateTalkingNPCs = function () {};
    if (typeof window.spawnDefender === 'function') window.spawnDefender = function () {};
    if (typeof window.buildAerialSpeederTraffic === 'function') window.buildAerialSpeederTraffic = function () {};
    if (typeof window.buildNeonSkyRails === 'function') window.buildNeonSkyRails = function () {};
    setTimeout(() => {
      document.querySelectorAll('.npc-bubble').forEach(b => b.style.display = 'none');
      if (window.DEFENDERS) {
        window.DEFENDERS.forEach(d => {
          if (d.group && d.group.parent) d.group.parent.remove(d.group);
          if (d.hpBar && d.hpBar.parentNode) d.hpBar.parentNode.removeChild(d.hpBar);
        });
        window.DEFENDERS.length = 0;
      }
      if (window.__AERIAL_SPEEDERS) { window.__AERIAL_SPEEDERS.forEach(s => { if (s.group) s.group.visible = false; }); window.__AERIAL_SPEEDERS.length = 0; }
      if (window.__SKY_RAILS) {
        window.__SKY_RAILS.forEach(r => {
          if (r.mesh && r.mesh.parent) r.mesh.parent.remove(r.mesh);
          if (r.pulseRings) r.pulseRings.forEach(pr => { if (pr.mesh && pr.mesh.parent) pr.mesh.parent.remove(pr.mesh); });
        });
        window.__SKY_RAILS.length = 0;
      }
    }, 2000);
  } catch (e) {}

  waitFor(() => { try { return typeof rainSystem !== 'undefined' && rainSystem && rainSystem.geometry; } catch (e) { return false; } }, () => {
    try {
      const geo = rainSystem.geometry;
      const arr = geo.attributes.position.array;
      const newCount = V9.RAIN_COUNT * 3;
      if (arr.length > newCount) {
        const newArr = new Float32Array(newCount);
        for (let i = 0; i < newCount; i++) newArr[i] = arr[i];
        geo.setAttribute('position', new THREE.Float32BufferAttribute(newArr, 3));
        geo.attributes.position.needsUpdate = true;
      }
    } catch (e) {}
  });

  setInterval(() => {
    try {
      if (typeof ParticlePool !== 'undefined' && ParticlePool.pool && ParticlePool.pool.length > 40) {
        while (ParticlePool.pool.length > 40) {
          const p = ParticlePool.pool.pop();
          if (p && p.geometry) p.geometry.dispose();
          if (p && p.material) p.material.dispose();
        }
      }
    } catch (e) {}
  }, 30000);

  // ═══════════════════════════════════════════════════════════════════════════
  // v9: МЕРЦАНИЕ ФОНАРЕЙ (уличные bulb)
  // ═══════════════════════════════════════════════════════════════════════════
  const _streetLamps = [];
  waitFor(() => getScene(), () => {
    const scene = getScene();
    if (!scene) return;
    scene.traverse(o => {
      if (o.isMesh && o.geometry && o.geometry.type === 'SphereGeometry') {
        const p = o.geometry.parameters;
        if (p && p.radius > 0.35 && p.radius < 0.55 && o.material && o.material.color && o.material.color.getHex() === 0xffee88) {
          _streetLamps.push({ mesh: o, phase: Math.random() * 10 });
        }
      }
    });
    console.log('✅ Мерцание: ' + _streetLamps.length + ' фонарей');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // v9: ПАРАЛЛАКС-СИЛУЭТЫ — обновление позиций по игроку
  // ═══════════════════════════════════════════════════════════════════════════
  function updateParallax(now) {
    const P = getPlayer();
    if (!P || !window.__v9Parallax) return;
    const layers = window.__v9Parallax;
    for (const p of layers) {
      const m = p.mesh;
      if (!m || !m.parent) continue;
      // Панели "плывут" вслед за игроком, но на 90% дистанции остаются позади
      const baseDist = [2400, 2000, 1600][p.layer] || 2000;
      const follow = 0.9;
      m.position.x = Math.sin(m.rotation.y - Math.PI) * baseDist + P.pos.x * follow;
      m.position.z = Math.cos(m.rotation.y - Math.PI) * baseDist + P.pos.z * follow;
      // Очень лёгкое покачивание
      m.position.y = p.baseY + Math.sin(now * 0.0003 + p.layer) * 2;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v9: ПЫЛЬ ПРИ СПРИНТЕ
  // ═══════════════════════════════════════════════════════════════════════════
  function updateDust(now) {
    const P = getPlayer();
    if (!P || !P.isGrounded) return;
    const keys = window.keys || {};
    const isSprint = keys['ShiftLeft'] || keys['ShiftRight'];
    const moving = keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD'];
    if (!isSprint || !moving) return;
    if (now - _lastDustAt < V9.DUST_INTERVAL) return;
    _lastDustAt = now;
    spawnDust(P.pos);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v9: MOTION TRAIL — пыль из кулака при атаке
  // ═══════════════════════════════════════════════════════════════════════════
  function updateMotionTrail(now) {
    const P = getPlayer();
    if (!P || !P.mesh || !P.mesh.userData) return;
    if (P.attackTimer <= 0.05) return;
    if (now - (P._v9LastTrail || 0) < 40) return;
    P._v9LastTrail = now;
    const ud = P.mesh.userData;
    const hand = (P.comboStep % 2 === 0) ? ud.armL : ud.armR;
    if (!hand || !hand.wrist) return;
    const pos = new THREE.Vector3();
    hand.wrist.getWorldPosition(pos);
    const color = (function () {
      if (isPepper()) return 0xff4400;
      if (isCarrot()) return 0x2ecc71;
      if (isLemon()) return 0x44ffaa;
      if (isPotato()) return 0xffaa00;
      return 0xff0055;
    })();
    spawnMotionTrail(pos, color);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v9: ГЛАВНЫЙ GFX LOOP
  // ═══════════════════════════════════════════════════════════════════════════
  function graphicsLoop() {
    requestAnimationFrame(graphicsLoop);
    const now = performance.now();
    try {
      if (!getScene()) return;
      updateShadows(now);
      updateTelegraphs(now);
      updateTrails(now);
      updateParallax(now);
      updateSteam(now);
      updateDust(now);
      updateMotionTrail(now);
      // Мерцание фонарей
      for (const l of _streetLamps) {
        if (!l.mesh.material) continue;
        const fl = 0.85 + Math.sin(now * 0.005 + l.phase) * 0.08 + (Math.random() < 0.02 ? -0.2 : 0);
        l.mesh.material.color.setRGB(1 * fl, 0.93 * fl, 0.53 * fl);
      }
    } catch (e) {}
  }
  graphicsLoop();

  // ═══════════════════════════════════════════════════════════════════════════
  // БАГФИКСЫ
  // ═══════════════════════════════════════════════════════════════════════════
  let _lastSaved = -1;
  setInterval(() => {
    if (window.StoryCampaign && window.StoryCampaign.chapter !== _lastSaved) {
      _lastSaved = window.StoryCampaign.chapter;
      try { localStorage.setItem('banana_v201_story_progress', JSON.stringify({ chapter: window.StoryCampaign.chapter, ts: Date.now() })); } catch (e) {}
    }
  }, 600);

  waitFor(() => document.getElementById('start-btn') && typeof window.startGameSession === 'function', () => {
    const clear = () => {
      const es = getEnemies(), sc = getScene();
      for (let i = es.length - 1; i >= 0; i--) {
        if (es[i]._isStoryConstruct || es[i]._isPinnacleBoss) {
          if (sc && es[i].group && es[i].group.parent) sc.remove(es[i].group);
          es.splice(i, 1);
        }
      }
      if (typeof activeBoss !== 'undefined') activeBoss = null;
    };
    document.getElementById('start-btn').addEventListener('click', () => {
      try { localStorage.removeItem('banana_v201_story_progress'); } catch (e) {}
      window.__pendingLoad = null; clear();
      if (window.StoryCampaign) { window.StoryCampaign.chapter = 0; window.StoryCampaign.objectives = []; window.StoryCampaign.completed = false; }
    }, true);
    const cont = document.getElementById('continue-btn');
    if (cont) cont.addEventListener('click', () => {
      try { const r = localStorage.getItem('banana_v960ng_save'); window.__pendingLoad = r ? JSON.parse(r) : null; } catch (e) { window.__pendingLoad = null; }
    }, true);
    let _at = 0;
    const _s = window.startGameSession;
    window.startGameSession = function (loaded) {
      const now = performance.now();
      if (now - _at < 800) return;
      _at = now;
      const fresh = (loaded === null || loaded === undefined);
      if (fresh) {
        try { localStorage.removeItem('banana_v201_story_progress'); } catch (e) {}
        if (window.StoryCampaign) { window.StoryCampaign.chapter = 0; window.StoryCampaign.objectives = []; window.StoryCampaign.completed = false; }
        clear();
      }
      const r = _s.apply(this, arguments);
      if (fresh && window.startStoryChapter) setTimeout(() => window.startStoryChapter(1), 150);
      setTimeout(refreshModHud, 500);
      return r;
    };
  });

  waitFor(() => typeof window.equipPotato === 'function', () => {
    const _e = window.equipPotato;
    window.equipPotato = function () {
      const P = getPlayer();
      if (isPotato() && P && P.mesh && P.mesh.userData && P.mesh.userData.isPotato) return;
      return _e.apply(this, arguments);
    };
  });

  waitFor(() => typeof window.carrotRootBind === 'function' && getPlayer(), () => {
    const _r = window.carrotRootBind;
    window.carrotRootBind = function () {
      const P = getPlayer(); if (!P) return;
      if (!isCarrot() || P.isDead) return;
      if (P.carrotStamina < 35) {
        if (typeof window.spawnComicPop === 'function') window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 3, 0)), '*МАЛО СТАМИНЫ!*', '#ff2200');
        return;
      }
      if (P.carrotRootBindCd > 0) return;
      return _r.apply(this, arguments);
    };
  });

  waitFor(() => typeof window.applyDamageToHero === 'function' && getPlayer(), () => {
    const _p = window.applyDamageToHero;
    window.applyDamageToHero = function (dmg) {
      const P = getPlayer(); if (!P || P.isDead) return;
      const shield = P.activeModeF && P.suitIdx === 3 && P.character === 'banana' && !isPepper() && !isCarrot() && !isLemon() && !isPotato();
      const bEn = P.en, bHp = P.hp;
      let eff = dmg, red = false;
      try {
        if (isCarrot() && P.mesh && P.mesh.userData && P.mesh.userData.isGiant &&
            window.__EVO_MODULES && window.__EVO_MODULES.has('carrot_ancient_ent')) { eff *= 0.45; red = true; }
      } catch (e) {}
      if (isPotato() && window.__POTATO_FORM === 1 && P._potatoArmor > 0) { eff = Math.floor(eff * 0.5); red = true; }
      if (P._multifruitTitanActive) { eff = Math.floor(eff * 0.55); red = true; }
      _p.call(this, dmg);
      if (red) {
        const actual = bHp - P.hp;
        if (actual > eff + 0.5 && actual < dmg + 0.5) {
          P.hp = Math.min(P.maxHp, P.hp + (actual - eff));
          if (typeof window.updateHUD === 'function') window.updateHUD();
        }
      }
      if (shield) {
        const drained = bEn - P.en;
        if (drained > 0.01 && bHp === P.hp) {
          P.en = Math.max(0, P.en - drained);
          if (P.en <= 0) {
            P.activeModeF = false;
            if (P.mesh && P.mesh.userData && P.mesh.userData.limeShield) P.mesh.userData.limeShield.visible = false;
          }
          if (typeof window.updateHUD === 'function') window.updateHUD();
        }
      }
    };
  });

  waitFor(() => document.getElementById('game-canvas') && typeof window.performPrimaryAttack === 'function', () => {
    let _suppress = false;
    document.addEventListener('mousedown', (e) => {
      if (e.button === 0 && document.getElementById('game-canvas') !== document.pointerLockElement) {
        _suppress = true; setTimeout(() => { _suppress = false; }, 180);
      }
    }, true);
    const _p = window.performPrimaryAttack;
    window.performPrimaryAttack = function () {
      if (_suppress) return;
      return _p.apply(this, arguments);
    };
  });

  waitFor(() => typeof window.pushComboMultiplier === 'function' && getPlayer(), () => {
    const _p = window.pushComboMultiplier;
    window.pushComboMultiplier = function () {
      const r = _p.apply(this, arguments);
      const P = getPlayer(), el = document.getElementById('ui-combo');
      if (el && P && P.comboMult > 1.05) { el.style.display = 'block'; el.textContent = P.comboMult.toFixed(1) + 'x COMBO!'; }
      return r;
    };
    setInterval(() => {
      const P = getPlayer(), el = document.getElementById('ui-combo');
      if (el && P && P.comboMult <= 1.05) el.style.display = 'none';
    }, 400);
  });

  setInterval(() => {
    const P = getPlayer(); if (!P || !P.execTarget || !P.execTarget.group) return;
    const pr = document.getElementById('exec-prompt'); if (!pr || pr.style.display === 'none') return;
    const cam = getCamera(); if (!cam) return;
    const pos = P.execTarget.group.position.clone(); pos.y += 3; pos.project(cam);
    if (pos.z > 1 || pos.z < -1) { pr.style.display = 'none'; return; }
    pr.style.left = ((pos.x * 0.5 + 0.5) * innerWidth) + 'px';
    pr.style.top = ((-pos.y * 0.5 + 0.5) * innerHeight) + 'px';
  }, 100);

  window.addEventListener('keydown', (e) => {
    if (document.pointerLockElement === null) return;
    if (e.code === 'KeyJ') document.body.classList.toggle('story-hidden');
    if (e.code === 'KeyU') document.body.classList.toggle('extra-ui-hidden');
  });

  setTimeout(() => {
    console.log('✅ [MASTER v9 FULL GFX] Applied');
    if (typeof window.showPatchToast === 'function') {
      window.showPatchToast('🎨 GRAPHICS v9', 'Rim · AO · луна · parallax · displacement · trail', '#00f2fe');
    }
  }, 3200);

})();
