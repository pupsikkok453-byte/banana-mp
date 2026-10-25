// ============================================================================
// BANANA INDUSTRIES — MASTER PATCHER v8 (GRAPHICS OVERHAUL)
// - Contact Shadows под каждым персонажем/врагом (вместо парящих)
// - Текстурированные частицы (soft glow sprite вместо сфер)
// - Улучшенные искры удара (звёздочка + градиент)
// - Emissive-accent на врагах по типу (стрелки/медики/танки)
// - Telegraph-кольца перед атакой врагов
// - Улучшенные slash-arcs (ярче, градиент, добавлена толщина)
// - Постоянная rim-aura вокруг игрока и боссов
// - Мягче туман (градиентная глубина)
// - Улучшенный оружейный glow (emissive, без point light для FPS)
// - Всё из v7 сохранено (оптимизация, модули, UI)
// ============================================================================
(function () {
  'use strict';
  if (window.__BANANA_MASTER_PATCHER_V8) return;
  window.__BANANA_MASTER_PATCHER_V8 = true;
  console.log('🎨 [MASTER PATCHER v8] Graphics upgrade init...');

  const V8 = {
    // v7 продолжаем
    SPEED_MUL:        0.82,
    ENEMY_SPEED_MUL:  0.88,
    BOSS_SPEED_MUL:   0.88,
    ANIM_EXT_MUL:     1.60,
    LMB_MIN_CD_MS:    480,
    HITSTOP_CRIT:     0.024,
    HITSTOP_NORMAL:   0.002,
    PARTICLE_MUL:     0.10,
    POPUP_CD_MS:      1000,
    DMG_NUM_PS:       4,
    PISTOL_CD_MS:     230,
    PISTOL_DMG:       46,
    PISTOL_RADIUS:    1.4,
    CROSSHAIR_MS:     320,
    MAX_IMPACTS_PS:   8,
    SLASH_SIZE_MUL:   0.65,
    PIXEL_RATIO_CAP:  0.90,
    MINIMAP_MS:       200,
    HPBAR_MS:         140,
    RAIN_COUNT:       80,
    // v8 — графика
    SHADOW_MS:        40,      // обновление теней
    TELEGRAPH_DUR:    0.7,
    AURA_OPACITY:     0.14,
    BOSS_AURA_OP     : 0.24,
    FOG_NEAR_COLOR:   0x1a2030,
    FOG_FAR_COLOR:    0x080c14
  };
  window.__V8_TUNING = V8;

  // ─── Геттеры ──────────────────────────────────────────────────────────────
  const getPlayer  = () => (window.__game && window.__game.player) || window.player || null;
  const getEnemies = () => (window.__game && window.__game.enemies) || window.enemies || [];
  const getScene   = () => (window.__game && window.__game.scene) || window.scene || null;
  const getCamera  = () => window.camera || (window.__game && window.__game.camera) || null;
  const isPepper = () => { const p = getPlayer(); return !!p && p.character === 'pepper'; };
  const isCarrot = () => { const p = getPlayer(); return !!p && p.character === 'carrot'; };
  const isLemon  = () => { const p = getPlayer(); return !!p && p.character === 'lemon'; };
  const isBanana = () => { const p = getPlayer(); return !!p && p.character === 'banana'; };
  const isPotato = () => !!window.__POTATO_MODE;
  const allowWallRun = () => isCarrot() || isPotato();

  const waitFor = (cond, cb, max = 12000) => {
    const t0 = performance.now();
    let done = false;
    const tick = () => {
      if (done) return;
      let ok = false;
      try { ok = cond(); } catch (e) { ok = false; }
      if (ok) { done = true; try { cb(); } catch (e) { console.error('[v8]', e); } return; }
      if (performance.now() - t0 >= max) return;
      requestAnimationFrame(tick);
    };
    tick();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ТЕКСТУРЫ (Canvas-generated)
  // ═══════════════════════════════════════════════════════════════════════════
  const Textures = {};

  Textures.shadow = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(0,0,0,0.65)');
    grd.addColorStop(0.4, 'rgba(0,0,0,0.35)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();

  Textures.glow = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.85)');
    grd.addColorStop(0.55, 'rgba(255,255,255,0.35)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();

  Textures.spark = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    // Звёздочка — 4 луча + центр
    ctx.translate(64, 64);
    const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.3, 'rgba(255,240,180,0.9)');
    grd.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = grd;
    // 4 луча
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate(i * Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(0, -50);
      ctx.lineTo(6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // центр
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(c);
  })();

  Textures.ring = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    ctx.strokeStyle = 'rgba(255,60,60,1)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(128, 128, 110, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,150,80,0.6)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(128, 128, 100, 0, Math.PI * 2);
    ctx.stroke();
    return new THREE.CanvasTexture(c);
  })();

  Textures.slash = (() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const ctx = c.getContext('2d');
    const grd = ctx.createLinearGradient(0, 0, 256, 0);
    grd.addColorStop(0, 'rgba(255,255,255,0)');
    grd.addColorStop(0.5, 'rgba(255,255,255,0.9)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 256, 64);
    return new THREE.CanvasTexture(c);
  })();

  console.log('✅ Текстуры сгенерированы');

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. CSS (из v7 + улучшения)
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
      border-top: 2px solid rgba(255,200,36,0.7) !important;
      margin-top: 10px !important;
    }
    .powers-box b { color: #ffe066 !important; font-size: 14px !important; text-shadow: 0 0 6px rgba(255,200,36,0.6), 1px 1px 2px rgba(0,0,0,0.9) !important; }

    #hud, .proto-hud-left, .score-box, .env-panel, .shrekich-monitor,
    .companion-panel, .rocket-panel, .alert-card, #boss-hud, #story-campaign-hud,
    .powers-box, .suit-hotbar, .dash-charges { transition: opacity 0.3s ease, transform 0.3s ease !important; }

    body.story-hidden #story-campaign-hud { opacity: 0; pointer-events: none; }
    body.extra-ui-hidden .env-panel,
    body.extra-ui-hidden .shrekich-monitor,
    body.extra-ui-hidden .companion-panel,
    body.extra-ui-hidden .rocket-panel,
    body.extra-ui-hidden .momentum-meter,
    body.extra-ui-hidden .alert-card,
    body.extra-ui-hidden #boss-cast-bar-wrap,
    body.extra-ui-hidden .dash-charges { opacity: 0 !important; pointer-events: none !important; }

    #hud { z-index: 50 !important; }
    #boss-hud { z-index: 26 !important; }
    #exec-prompt { z-index: 45 !important; }

    .mutation-branch { padding: 16px !important; }
    .mutation-branch h4 { font-size: 17px !important; padding-bottom: 6px !important; border-bottom: 2px solid rgba(249,202,36,0.35) !important; margin-bottom: 10px !important; }
    .mutation-node { padding: 10px 12px !important; font-size: 12.5px !important; }
    .mutation-btn { padding: 8px 14px !important; font-size: 12px !important; }

    #v7-mod-hud {
      position: fixed; bottom: 260px; left: 16px; z-index: 22;
      display: none; flex-direction: column; gap: 3px; pointer-events: none;
    }
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
  // 3. BLOOM OFF + PIXEL RATIO
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
      const cap = V8.PIXEL_RATIO_CAP;
      const _set = renderer.setPixelRatio.bind(renderer);
      renderer.setPixelRatio = function (v) { return _set(Math.min(v || 1, cap)); };
      renderer.setPixelRatio(cap);
      renderer.toneMappingExposure = 0.98;
    } catch (e) {}
  });

  // Свет
  setTimeout(() => {
    try { if (typeof hemiLight !== 'undefined' && hemiLight) hemiLight.intensity = 0.78; } catch (e) {}
    try { if (typeof moonLight !== 'undefined' && moonLight) moonLight.intensity = 1.0; } catch (e) {}
    try { if (typeof sunLight !== 'undefined' && sunLight) sunLight.intensity = 0.35; } catch (e) {}
    try { if (typeof fillLight !== 'undefined' && fillLight) fillLight.intensity = 0.28; } catch (e) {}
  }, 500);

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. FOG — градиентная глубина (мягче)
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => getScene(), () => {
    const scene = getScene();
    if (scene && scene.fog) {
      scene.fog.density = 0.00045;
      if (scene.fog.color) scene.fog.color.setHex(V8.FOG_NEAR_COLOR);
    }
    if (scene && scene.background && scene.background.setHex) {
      // не переопределяем фон — TimeOfDay управляет
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. КОНТАКТНАЯ ТЕНЬ (главный визуальный буст)
  // ═══════════════════════════════════════════════════════════════════════════
  const ShadowPool = { free: [], active: new Map() };

  function getShadowSprite() {
    let sp = ShadowPool.free.pop();
    if (!sp) {
      const mat = new THREE.SpriteMaterial({
        map: Textures.shadow,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        color: 0x000000
      });
      sp = new THREE.Sprite(mat);
      sp.renderOrder = 1;
    }
    return sp;
  }

  function attachShadowTo(obj, size) {
    if (!obj || !obj.group) return;
    const scene = getScene();
    if (!scene) return;
    if (ShadowPool.active.has(obj)) return;
    const sp = getShadowSprite();
    sp.scale.set(size, size * 0.6, 1);
    sp.position.set(obj.group.position.x, 0.04, obj.group.position.z);
    sp.visible = true;
    scene.add(sp);
    ShadowPool.active.set(obj, sp);
  }

  function detachShadow(obj) {
    if (!ShadowPool.active.has(obj)) return;
    const sp = ShadowPool.active.get(obj);
    if (sp.parent) sp.parent.remove(sp);
    ShadowPool.free.push(sp);
    ShadowPool.active.delete(obj);
  }

  // Обновление теней — каждый кадр (или троттлинг)
  let _lastShadowUpdate = 0;
  function updateShadows(now) {
    if (now - _lastShadowUpdate < V8.SHADOW_MS) return;
    _lastShadowUpdate = now;
    const enemies = getEnemies();
    const P = getPlayer();

    // Player shadow
    if (P && P.mesh && !ShadowPool.active.has(P)) {
      attachShadowTo({ group: { position: P.pos } }, isCarrot() && (window.CARROT_FORM === 2) ? 6 : 3.5);
      // Специальный случай — используем P напрямую
      ShadowPool.active.set(P, ShadowPool.active.get({ group: { position: P.pos } }));
      // Переделываем через прямой attach
      const sp = getShadowSprite();
      sp.scale.set(isCarrot() && window.CARROT_FORM === 2 ? 6 : 3.5, isCarrot() && window.CARROT_FORM === 2 ? 3.6 : 2.1, 1);
      sp.position.set(P.pos.x, 0.04, P.pos.z);
      sp.visible = true;
      getScene().add(sp);
      ShadowPool.active.set(P, sp);
    }
    if (P && ShadowPool.active.has(P)) {
      const sp = ShadowPool.active.get(P);
      sp.position.set(P.pos.x, 0.04, P.pos.z);
      // Размер в зависимости от формы
      const size = isCarrot() && window.CARROT_FORM === 2 ? 6 : 3.5;
      sp.scale.set(size, size * 0.6, 1);
      // Высота: если игрок высоко — тень меньше
      if (P.pos.y > 0.5) {
        const h = Math.min(1, 1 - P.pos.y / 15);
        sp.material.opacity = 0.75 * h;
        sp.scale.multiplyScalar(0.5 + h * 0.5);
      } else {
        sp.material.opacity = 0.75;
      }
      sp.visible = true;
    }

    // Enemy shadows
    const seen = new Set();
    for (let i = 0; i < enemies.length; i++) {
      const en = enemies[i];
      if (!en.group) continue;
      seen.add(en);
      if (!ShadowPool.active.has(en)) {
        const isBoss = en._isBoss || en._isPinnacleBoss;
        const size = isBoss ? (en.radius || 4) * 2.4 : (en.radius || 1.4) * 2.0;
        attachShadowTo(en, size);
      }
      if (ShadowPool.active.has(en)) {
        const sp = ShadowPool.active.get(en);
        sp.position.set(en.group.position.x, 0.04, en.group.position.z);
        const isBoss = en._isBoss || en._isPinnacleBoss;
        const size = isBoss ? (en.radius || 4) * 2.4 : (en.radius || 1.4) * 2.0;
        const y = en.group.position.y;
        const opacity = Math.max(0.2, 0.75 - y * 0.08);
        sp.material.opacity = opacity;
        sp.scale.set(size, size * 0.6, 1);
        sp.visible = true;
      }
    }
    // Убираем осиротевшие
    for (const [obj, sp] of ShadowPool.active) {
      if (obj !== P && !seen.has(obj)) {
        detachShadow(obj);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. ТЕКСТУРИРОВАННЫЕ ЧАСТИЦЫ (замена сфер на sprite)
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof ParticlePool !== 'undefined' && window.THREE, () => {
    const _origGet = ParticlePool.get.bind(ParticlePool);
    const _glowMat = new THREE.SpriteMaterial({
      map: Textures.glow,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    ParticlePool.get = function (color) {
      // Берём из пула или создаём sprite
      let sp = this.pool.pop();
      if (!sp || !sp.isSprite) {
        // Уничтожаем старые mesh
        if (sp && sp.geometry) sp.geometry.dispose();
        if (sp && sp.material) sp.material.dispose();
        const mat = _glowMat.clone();
        sp = new THREE.Sprite(mat);
      }
      if (sp.material) {
        sp.material.color.setHex(color);
        sp.material.opacity = 0.9;
      }
      sp.visible = true;
      const scale = 0.35 + Math.random() * 0.15;
      sp.scale.set(scale, scale, 1);
      return sp;
    };

    // Обновляем release (спрайты корректно)
    const _origRelease = ParticlePool.release.bind(ParticlePool);
    ParticlePool.release = function (p) {
      if (!p) return;
      p.visible = false;
      if (p.parent) p.parent.remove(p);
      this.pool.push(p);
    };
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. ИСКРЫ — звёздочки вместо wireframe-сфер
  // ═══════════════════════════════════════════════════════════════════════════
  const _sparkPool = [];
  function spawnSpark(pos, colorHex, size) {
    const scene = getScene();
    if (!scene) return;
    let sp = _sparkPool.pop();
    if (!sp) {
      const mat = new THREE.SpriteMaterial({
        map: Textures.spark,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      sp = new THREE.Sprite(mat);
      scene.add(sp);
    }
    sp.position.copy(pos);
    sp.material.color.setHex(colorHex);
    sp.material.opacity = 1;
    const s = size || 1.2;
    sp.scale.set(s, s, 1);
    sp.visible = true;
    const startAt = performance.now();
    const anim = () => {
      const t = (performance.now() - startAt) / 400;
      if (t >= 1) {
        sp.visible = false;
        _sparkPool.push(sp);
        return;
      }
      const sc = s * (1 + t * 2.2);
      sp.scale.set(sc, sc, 1);
      sp.material.opacity = 1 - t;
      sp.material.rotation += 0.15;
      requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
  }

  // Обёртка damageEnemy — заменяем impact wireframe на искры
  waitFor(() => typeof window.damageEnemy === 'function', () => {
    const _d = window.damageEnemy;
    window.damageEnemy = function (en, dmg, kv, pt) {
      if (!en) return _d.apply(this, arguments);
      dmg *= getModuleDmgMult();
      if (en._isPinnacleBoss) dmg *= 1.43;
      const bHp = en.hp, p66 = en._gate66Triggered, p33 = en._gate33Triggered, pin = en._isPinnacleBoss;
      const r = _d.call(this, en, dmg, kv, pt);

      // Звёздочка вместо сферы
      if (en.group && dmg > 0) {
        const isBoss = en._isBoss || en._isPinnacleBoss;
        const pos = en.group.position.clone();
        pos.y += isBoss ? 7 : 2.2;
        if (Math.random() < 0.65) {
          spawnSpark(pos, en.hp <= 0 ? 0xffeedd : 0xffcc44, isBoss ? 2.4 : 1.4);
        }
        en._hitStagger = Math.max(en._hitStagger || 0, 0.28);
      }

      // Phase-gate
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

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. EMISSIVE-ACCENT ВРАГАМ ПО ТИПУ
  // ═══════════════════════════════════════════════════════════════════════════
  const TYPE_ACCENTS = {
    sniper:   { color: 0xff00ff, intensity: 0.7 },
    medic:    { color: 0x00ff66, intensity: 0.6 },
    shield:   { color: 0x00f2fe, intensity: 0.55 },
    kamikaze: { color: 0xff2200, intensity: 0.85 },
    leader:   { color: 0xffaa00, intensity: 0.6 },
    brawler:  { color: 0xff4400, intensity: 0.7 }
  };

  function accentEnemy(en) {
    if (!en || !en.group || en._v8Accented) return;
    en._v8Accented = true;
    const accent = TYPE_ACCENTS[en.type];
    if (!accent) return;
    // Добавляем маленькие emissive-сферы на "плечах"
    const accentGeo = new THREE.SphereGeometry(0.14, 6, 6);
    const accentMat = new THREE.MeshBasicMaterial({
      color: accent.color,
      transparent: true,
      opacity: 0.9
    });
    for (const sign of [-1, 1]) {
      const dot = new THREE.Mesh(accentGeo, accentMat);
      dot.position.set(sign * 0.85, 2.6, 0);
      en.group.add(dot);
    }
    // Маленькая сфера в центре (core)
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      new THREE.MeshBasicMaterial({ color: accent.color, transparent: true, opacity: 0.7 })
    );
    core.position.set(0, 2.3, 0.35);
    en.group.add(core);
    en._v8AccentCore = core;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. TELEGRAPH-КОЛЬЦА ПЕРЕД АТАКОЙ
  // ═══════════════════════════════════════════════════════════════════════════
  const _telegraphs = new Map();

  function showTelegraph(en) {
    if (!en || !en.group) return;
    const scene = getScene();
    if (!scene) return;
    if (_telegraphs.has(en)) return;
    const isBoss = en._isBoss || en._isPinnacleBoss;
    const radius = isBoss ? (en.radius || 4) * 1.8 : (en.radius || 1.4) * 2.2;
    const geo = new THREE.PlaneGeometry(radius * 2, radius * 2);
    const mat = new THREE.MeshBasicMaterial({
      map: Textures.ring,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      side: THREE.DoubleSide,
      color: isBoss ? 0xff2200 : 0xff5533
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(en.group.position.x, 0.1, en.group.position.z);
    mesh.renderOrder = 2;
    scene.add(mesh);
    const startAt = performance.now();
    _telegraphs.set(en, { mesh, startAt });
  }

  function updateTelegraphs(now) {
    for (const [en, tg] of _telegraphs) {
      if (!en.group || !tg.mesh.parent) {
        if (tg.mesh.parent) tg.mesh.parent.remove(tg.mesh);
        tg.mesh.geometry.dispose();
        tg.mesh.material.dispose();
        _telegraphs.delete(en);
        continue;
      }
      const t = (now - tg.startAt) / (V8.TELEGRAPH_DUR * 1000);
      if (t >= 1) {
        tg.mesh.parent.remove(tg.mesh);
        tg.mesh.geometry.dispose();
        tg.mesh.material.dispose();
        _telegraphs.delete(en);
        continue;
      }
      tg.mesh.position.set(en.group.position.x, 0.1, en.group.position.z);
      tg.mesh.material.opacity = 0.3 + t * 0.6;
      const sc = 0.4 + t * 0.8;
      tg.mesh.scale.set(sc, sc, 1);
      tg.mesh.material.rotation += 0.02;
    }
  }

  // Хук на начало атаки врага
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
          if (typeof en._telegraphT === 'number')   en._telegraphT *= M;
          if (typeof en._telegraphMax === 'number') en._telegraphMax *= M;
          if (typeof en._meleeDur === 'number')     en._meleeDur *= M;
          if (typeof en.attackCd === 'number')      en.attackCd *= M;
        }
        return res;
      } finally { window.setTimeout = _st; }
    };
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. AURA ВОКРУГ ИГРОКА И БОССОВ
  // ═══════════════════════════════════════════════════════════════════════════
  let _playerAura = null;
  let _bossAuras = new Map();

  function getAuraColor() {
    const P = getPlayer();
    if (!P) return 0x00f2fe;
    if (isPepper()) return 0xff4400;
    if (isCarrot()) return 0x2ecc71;
    if (isLemon()) return 0x44ffaa;
    if (isPotato()) return 0xffaa00;
    return 0x00f2fe;
  }

  function updateAura(now) {
    const scene = getScene();
    const P = getPlayer();
    if (!scene || !P) return;

    // Player aura
    if (!_playerAura) {
      const geo = new THREE.SphereGeometry(1.8, 16, 12);
      const mat = new THREE.MeshBasicMaterial({
        color: getAuraColor(),
        transparent: true,
        opacity: V8.AURA_OPACITY,
        wireframe: true,
        depthWrite: false
      });
      _playerAura = new THREE.Mesh(geo, mat);
      _playerAura.renderOrder = 3;
      scene.add(_playerAura);
    }
    _playerAura.position.set(P.pos.x, P.pos.y + 1.5, P.pos.z);
    _playerAura.material.color.setHex(getAuraColor());
    const pulse = 1 + Math.sin(now * 0.004) * 0.08;
    _playerAura.scale.set(pulse, pulse, pulse);
    _playerAura.rotation.y += 0.01;
    _playerAura.rotation.x += 0.003;

    // Boss auras
    const enemies = getEnemies();
    const bossSet = new Set();
    for (const en of enemies) {
      const isBoss = en._isBoss || en._isPinnacleBoss;
      if (!isBoss) continue;
      bossSet.add(en);
      if (!_bossAuras.has(en)) {
        const size = (en.radius || 4) * 1.5;
        const geo = new THREE.SphereGeometry(size, 16, 12);
        const mat = new THREE.MeshBasicMaterial({
          color: 0xff2200,
          transparent: true,
          opacity: V8.BOSS_AURA_OP,
          wireframe: true,
          depthWrite: false
        });
        const aura = new THREE.Mesh(geo, mat);
        aura.renderOrder = 3;
        scene.add(aura);
        _bossAuras.set(en, aura);
      }
      const aura = _bossAuras.get(en);
      aura.position.set(en.group.position.x, en.group.position.y + 6, en.group.position.z);
      const pulse = 1 + Math.sin(now * 0.003 + en.group.position.x) * 0.12;
      aura.scale.set(pulse, pulse, pulse);
      aura.rotation.y += 0.015;
    }
    // Clean orphaned
    for (const [en, aura] of _bossAuras) {
      if (!bossSet.has(en)) {
        if (aura.parent) aura.parent.remove(aura);
        aura.geometry.dispose();
        aura.material.dispose();
        _bossAuras.delete(en);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. УЛУЧШЕННЫЕ SLASH-ARCS
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.spawnSlashArc === 'function', () => {
    const _orig = window.spawnSlashArc;
    window.spawnSlashArc = function (pos, yaw, tiltZ, colorHex, radius, duration) {
      // Используем увеличенную версию для чёткости
      return _orig.call(this, pos, yaw, tiltZ, colorHex,
        (radius || 3.8) * V8.SLASH_SIZE_MUL,
        (duration || 0.25) * 1.2); // дольше = плавнее
    };
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. МОДУЛИ (из v7 — персональные)
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
      { id: 'carrot_poison_ivy', icon: '🌿', title: 'Ядовитый Плющ', cost: 300, desc: '+30% вампиризма от урона опутывания.' },
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
  // 13. E-МЕНЮ (пере-рендер)
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.renderLabTab === 'function' && document.getElementById('lab-content'), () => {
    window.renderLabTab = function (tabName) {
      if (tabName !== 'suits') {
        try { if (typeof window.__origRenderLabTabV8 === 'function') return window.__origRenderLabTabV8.apply(this, arguments); } catch (e) {}
        return;
      }
      const P = getPlayer();
      const epEl = document.getElementById('lab-ep-val'), scoreEl = document.getElementById('lab-score-val'), waveEl = document.getElementById('lab-wave-val');
      if (epEl) epEl.innerText = P ? Math.floor(P.ep) : 0;
      if (scoreEl) scoreEl.innerText = (P ? P.score : 0).toLocaleString('ru-RU');
      if (waveEl) waveEl.innerText = P ? P.wave : 1;

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

  // HUD-индикатор модулей
  let _modHudEl = null;
  function refreshModHud() {
    if (!_modHudEl) {
      _modHudEl = document.getElementById('v7-mod-hud');
      if (!_modHudEl) {
        _modHudEl = document.createElement('div');
        _modHudEl.id = 'v7-mod-hud';
        document.body.appendChild(_modHudEl);
      }
    }
    const actives = activeModulesForChar();
    if (actives.length === 0) { _modHudEl.style.display = 'none'; return; }
    _modHudEl.style.display = 'flex';
    _modHudEl.innerHTML = actives.map(m => `<div class="v7-mod-chip">${m.icon} ${m.title}</div>`).join('');
  }
  setInterval(refreshModHud, 800);

  // Покупка модулей
  waitFor(() => typeof window.buyHeroEvoModule === 'function', () => {
    const _b = window.buyHeroEvoModule;
    window.buyHeroEvoModule = function (id, cost) {
      const P = getPlayer();
      if (P && P.ep < cost) {
        if (typeof window.showPatchToast === 'function')
          window.showPatchToast('⚠️ НЕ ХВАТАЕТ EP', `Нужно ${cost}, у вас ${Math.floor(P.ep)}`, '#ff0055');
        return;
      }
      const r = _b.apply(this, arguments);
      refreshModHud();
      return r;
    };
  });

  // HP-бонус carrot_ancient_ent
  function applyModuleHpBonus() {
    const P = getPlayer(); if (!P) return;
    const char = charOf();
    const E = window.__EVO_MODULES;
    if (!E) return;
    let mult = 1;
    if (char === 'carrot' && E.has('carrot_ancient_ent')) mult *= 1.25;
    if (!P._v8LastHpMul) P._v8LastHpMul = 1;
    if (Math.abs(mult - P._v8LastHpMul) > 0.01) {
      if (!P._v8BaseMaxHp) P._v8BaseMaxHp = Math.round(P.maxHp / P._v8LastHpMul);
      const ratio = P.hp / Math.max(1, P.maxHp);
      P.maxHp = Math.round(P._v8BaseMaxHp * mult);
      P.hp = Math.round(P.maxHp * ratio);
      P._v8LastHpMul = mult;
      if (typeof window.updateHUD === 'function') window.updateHUD();
    }
  }
  setInterval(applyModuleHpBonus, 1000);

  // ═══════════════════════════════════════════════════════════════════════════
  // 14. СКОРОСТЬ + HP-БОНУС + LMB
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.getSuitData === 'function', () => {
    const _g = window.getSuitData;
    window.getSuitData = function () {
      const d = _g.apply(this, arguments);
      if (d && typeof d.speed === 'number') {
        if (!d._v8Orig) d._v8Orig = d.speed;
        d.speed = d._v8Orig * V8.SPEED_MUL;
      }
      return d;
    };
    ['pepperStats', 'carrotStats'].forEach(fn => {
      if (typeof window[fn] !== 'function') return;
      const _s = window[fn];
      window[fn] = function () {
        const d = _s.apply(this, arguments);
        if (d && typeof d.speed === 'number') {
          if (!d._v8Orig) d._v8Orig = d.speed;
          d.speed = d._v8Orig * V8.SPEED_MUL;
        }
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
      if (now - _last < V8.LMB_MIN_CD_MS) return;
      const bt = P.attackTimer;
      const r = _o.apply(this, arguments);
      if (P.attackTimer > bt && P.attackTimer > 0.1) {
        _last = now;
        P.attackDuration *= V8.ANIM_EXT_MUL;
        P.attackTimer *= V8.ANIM_EXT_MUL;
      }
      return r;
    };
  });

  // Враги реже и сильнее
  waitFor(() => typeof window.spawnCitrusSoldier === 'function', () => {
    const cap = () => getEnemies().filter(e => !e._isStoryConstruct && !e._isBoss && !e._isPinnacleBoss && !e._isPhasePylon).length >= 5;
    const buff = (fromIdx, hpMul, spdMul, sizeMul) => {
      const es = getEnemies();
      for (let i = fromIdx; i < es.length; i++) {
        const e = es[i];
        if (!e || e._isBoss || e._isStoryConstruct || e._isPinnacleBoss || e._v8Buffed) continue;
        e._v8Buffed = true;
        e.hp *= hpMul; e.maxHp *= hpMul;
        e.speed = (e.speed || 12) * spdMul;
        if (e.group) e.group.scale.multiplyScalar(sizeMul || 1.15);
        if (e.radius) e.radius *= (sizeMul || 1.15);
        e._baseSY = (e._baseSY || 1) * (sizeMul || 1.15);
        // Accent
        setTimeout(() => accentEnemy(e), 20);
      }
    };
    const _s = window.spawnCitrusSoldier;
    window.spawnCitrusSoldier = function () {
      if (Math.random() < 0.6 || cap()) return;
      const b = getEnemies().length;
      _s.apply(this, arguments);
      buff(b, 2.8, V8.ENEMY_SPEED_MUL, 1.18);
    };
    const _a = window.spawnCitrusAPC;
    if (_a) window.spawnCitrusAPC = function () { const b = getEnemies().length; _a.apply(this, arguments); buff(b, 2.0, V8.ENEMY_SPEED_MUL, 1.1); };
    const _h = window.spawnCitrusHeli;
    if (_h) window.spawnCitrusHeli = function () { const b = getEnemies().length; _h.apply(this, arguments); buff(b, 2.0, V8.ENEMY_SPEED_MUL, 1.1); };
    ['spawnSoloFinalGrapestasik', 'spawnSoloFinalJirigory', 'spawnSoloBeetrootTitanGoretzka', 'spawnSoloMonolithOfSterility'].forEach(fn => {
      if (typeof window[fn] !== 'function') return;
      const _o = window[fn];
      window[fn] = function () {
        const r = _o.apply(this, arguments);
        const es = getEnemies(); const b = es[es.length - 1];
        if (b && b._isPinnacleBoss && b.speed) b.speed *= V8.BOSS_SPEED_MUL;
        return r;
      };
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 15. ЧАСТИЦЫ × 0.10 (но текстурированные — выглядят лучше)
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.spawnParticles === 'function', () => {
    const _p = window.spawnParticles;
    window.spawnParticles = function (pos, color, count) {
      return _p.call(this, pos, color, Math.max(1, Math.floor((count || 10) * V8.PARTICLE_MUL)));
    };
    if (typeof window.spawnSparks === 'function') {
      const _s = window.spawnSparks;
      window.spawnSparks = function (pos, count, color) {
        return _s.call(this, pos, Math.max(1, Math.floor((count || 6) * V8.PARTICLE_MUL)), color);
      };
    }
  });

  // Надписи реже
  waitFor(() => typeof window.spawnComicPop === 'function', () => {
    const _o = window.spawnComicPop;
    let _last = 0;
    const KEY = /RAGE|BOSS|ФАЗА|ЭВОЛЮЦИЯ|LEVEL|УРОВЕНЬ|СИНТЕЗ|МУЛЬТИФРУКТ|ПОБЕД|ФИНАЛ|ГЛАВА|СОЛО|ВРАТА|КРИСТАЛЛ|ТЮРЬМА|СЕГМЕНТ|СПИРАЛЬ|СИНГУЛЯР|ГРОМОВ|ЗОЛОТ|АЛМАЗ|МОНОЛИТ|ГАРПУН|ЩИТ|ПАНЦИРЬ|БУР|ТАРАН|ЛАЗЕР/i;
    window.spawnComicPop = function (pos, text, color) {
      const now = performance.now();
      if (KEY.test(text) || now - _last > V8.POPUP_CD_MS) { _last = now; return _o.call(this, pos, text, color); }
    };
    if (typeof window.spawnDamageNumber === 'function') {
      const _d = window.spawnDamageNumber;
      let cnt = 0, reset = 0;
      window.spawnDamageNumber = function (pos, v, type) {
        const now = performance.now();
        if (now - reset > 1000) { cnt = 0; reset = now; }
        if (cnt < V8.DMG_NUM_PS || type === 'crit' || type === 'heal') { cnt++; return _d.call(this, pos, v, type); }
      };
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 16. ПИСТОЛЕТ + LASER + HITSTOP
  // ═══════════════════════════════════════════════════════════════════════════
  const myBullets = [];
  let _lastPistolAt = 0;

  function buildPistolMesh() {
    const g = new THREE.Group();
    const dark = new THREE.MeshBasicMaterial({ color: 0x0f0f14 });
    const metal = new THREE.MeshBasicMaterial({ color: 0x6a6a76 });
    const gold = new THREE.MeshBasicMaterial({ color: 0xd4a017 });
    const neon = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.5, wireframe: true });
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.42, 0.16), dark); grip.position.set(0, -0.18, 0.02); grip.rotation.x = 0.32; g.add(grip);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.20, 0.54), metal); frame.position.set(0, 0.06, 0.16); g.add(frame);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.42, 8), metal); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.10, 0.56); g.add(barrel);
    const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 6, 12), gold); muzzle.position.set(0, 0.10, 0.78); g.add(muzzle);
    const tg = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 4, 10, Math.PI), gold); tg.rotation.y = Math.PI / 2; tg.rotation.z = Math.PI; tg.position.set(0, -0.06, 0.08); g.add(tg);
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.08), dark); sight.position.set(0, 0.19, 0.06); g.add(sight);
    const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.035, 6, 14), neon); glowRing.position.set(0, 0.10, 0.60); g.add(glowRing);
    g.scale.setScalar(2.2); g.rotation.x = Math.PI / 2; g.position.set(0.15, -0.15, 0.08);
    return g;
  }

  function attachPistol() {
    const P = getPlayer();
    if (!P || !P.mesh || !P.mesh.userData) return;
    const ud = P.mesh.userData;
    if (!ud.armR || !ud.armR.wrist) return;
    if (typeof THREE === 'undefined') return;
    ['_v3PistolMesh', '_v4PistolMesh', '_v5PistolMesh', '_v6PistolMesh', '_v7PistolMesh', '_v8PistolMesh'].forEach(k => {
      if (ud[k]) { if (ud[k].parent) ud[k].parent.remove(ud[k]); ud[k] = null; }
    });
    if (P.character !== 'banana' || P.suitIdx !== 0) return;
    const p = buildPistolMesh();
    ud.armR.wrist.add(p);
    ud._v8PistolMesh = p;
    ud._v8PistolMuzzleLocal = new THREE.Vector3(0, 0.10, 0.85);
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
      if (should && !ud._v8PistolMesh) attachPistol();
      else if (!should && ud._v8PistolMesh) attachPistol();
    }, 800);
  });

  function getMuzzleWorld() {
    const P = getPlayer();
    if (!P || !P.mesh || !P.mesh.userData) return null;
    const ud = P.mesh.userData;
    if (!ud._v8PistolMesh || !ud._v8PistolMuzzleLocal) return null;
    const v = ud._v8PistolMuzzleLocal.clone();
    ud._v8PistolMesh.localToWorld(v);
    return v;
  }

  function firePistol() {
    const P = getPlayer(), scene = getScene();
    if (!P || !scene || P.isDead) return;
    if (P.character !== 'banana' || P.suitIdx !== 0) return;
    if (isPepper() || isCarrot() || isLemon() || isPotato()) return;
    const hasRapid = window.__EVO_MODULES && window.__EVO_MODULES.has('banana_rapid_pistol');
    const cd = hasRapid ? V8.PISTOL_CD_MS * 0.6 : V8.PISTOL_CD_MS;
    const dmgMult = hasRapid ? 1.25 : 1.0;
    const now = performance.now();
    if (now - _lastPistolAt < cd) return;
    _lastPistolAt = now;

    const fwd = new THREE.Vector3(-Math.sin(P.camYaw), 0, -Math.cos(P.camYaw));
    let start = getMuzzleWorld();
    if (!start) start = P.pos.clone().add(new THREE.Vector3(0, 2.0, 0)).addScaledVector(fwd, 0.9);

    // Пуля — текстурированный sprite с glow
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
      dmg: V8.PISTOL_DMG * (1 + (P.comboMult || 1) * 0.15) * dmgMult,
      radius: V8.PISTOL_RADIUS,
      isSprite: true
    });

    spawnSpark(start, 0xfff0a0, 0.8);
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

  // HUD
  setInterval(() => {
    const P = getPlayer();
    if (!P || P.character !== 'banana' || P.suitIdx !== 0) return;
    if (isPepper() || isCarrot() || isLemon() || isPotato()) return;
    const el = document.getElementById('ui-powers-desc');
    if (el && !el.dataset.v8) {
      el.innerHTML = '<b>ЛКМ:</b> Удары | <b>Q / ПКМ:</b> 🔫 ПИСТОЛЕТ | <b>F:</b> Турель | <b>G:</b> Ракета';
      el.dataset.v8 = '1';
    }
    const badge = document.querySelector('.suit-badge');
    if (badge && !badge.dataset.v8) { badge.innerText = '[0] ЕГОРБАНАН · ПИСТОЛЕТ [Q]'; badge.dataset.v8 = '1'; }
  }, 700);

  waitFor(() => typeof window.equipSuit === 'function', () => {
    const _e = window.equipSuit;
    window.equipSuit = function () {
      const d = document.getElementById('ui-powers-desc'); if (d) delete d.dataset.v8;
      const b = document.querySelector('.suit-badge'); if (b) delete b.dataset.v8;
      const r = _e.apply(this, arguments);
      setTimeout(attachPistol, 40);
      return r;
    };
  });

  // Тикер пуль (swept-segment)
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
        if (!b.isSprite) {
          b.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
        } else {
          if (b.mesh.material) b.mesh.material.dispose();
        }
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

  // Лазеры Лимона
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
        mesh: g,
        vel: new THREE.Vector3(fwd.x * 200, 0, fwd.z * 200),
        life: 0.6,
        dmg: 55 * getModuleDmgMult(),
        radius: 2.2,
        _isLaser: true
      });
    };
  });

  // Hitstop
  waitFor(() => typeof window.triggerHitstopAndChroma === 'function', () => {
    const _h = window.triggerHitstopAndChroma;
    window.triggerHitstopAndChroma = function (stop, shake, chr) {
      const P = getPlayer();
      if (P) {
        const s = stop || 0;
        if (s < 0.015) P.hitStop = Math.max(P.hitStop || 0, V8.HITSTOP_NORMAL);
        else if (s < 0.05) P.hitStop = Math.max(P.hitStop || 0, Math.min(V8.HITSTOP_CRIT, s * 1.3));
        P.cameraShake = Math.max(P.cameraShake || 0, 0.18);
      }
      if (_h) _h.call(this, stop, shake, 0);
    };
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 17. WALL-RUN БЛОК
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
  // 18. ОПТИМИЗАЦИЯ
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
  waitFor(() => typeof window.drawMinimap === 'function', () => { window.drawMinimap = throttle(window.drawMinimap, V8.MINIMAP_MS); });
  waitFor(() => typeof window.updateEnemyHpBars === 'function', () => { window.updateEnemyHpBars = throttle(window.updateEnemyHpBars, V8.HPBAR_MS); });
  waitFor(() => typeof window.updateHUD === 'function', () => { window.updateHUD = throttle(window.updateHUD, 80); });
  waitFor(() => typeof window.raycastAllBuildingsAABB === 'function', () => {
    const _o = window.raycastAllBuildingsAABB;
    let last = 0, lastR = null;
    window.raycastAllBuildingsAABB = function (o, d, m) {
      const now = performance.now();
      if (now - last < V8.CROSSHAIR_MS) return lastR;
      last = now;
      lastR = _o.call(this, o, d, m);
      return lastR;
    };
  });

  // Отключаем NPC / защитников / спидеры
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
      if (window.__AERIAL_SPEEDERS) {
        window.__AERIAL_SPEEDERS.forEach(s => { if (s.group) s.group.visible = false; });
        window.__AERIAL_SPEEDERS.length = 0;
      }
      if (window.__SKY_RAILS) {
        window.__SKY_RAILS.forEach(r => {
          if (r.mesh && r.mesh.parent) r.mesh.parent.remove(r.mesh);
          if (r.pulseRings) r.pulseRings.forEach(pr => { if (pr.mesh && pr.mesh.parent) pr.mesh.parent.remove(pr.mesh); });
        });
        window.__SKY_RAILS.length = 0;
      }
    }, 2000);
  } catch (e) {}

  // Дождь
  waitFor(() => { try { return typeof rainSystem !== 'undefined' && rainSystem && rainSystem.geometry; } catch (e) { return false; } }, () => {
    try {
      const geo = rainSystem.geometry;
      const arr = geo.attributes.position.array;
      const newCount = V8.RAIN_COUNT * 3;
      if (arr.length > newCount) {
        const newArr = new Float32Array(newCount);
        for (let i = 0; i < newCount; i++) newArr[i] = arr[i];
        geo.setAttribute('position', new THREE.Float32BufferAttribute(newArr, 3));
        geo.attributes.position.needsUpdate = true;
      }
    } catch (e) {}
  });

  // Уборка
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
  // 19. ГЛАВНЫЙ UPDATE LOOP (тени + ауры + телеграфы)
  // ═══════════════════════════════════════════════════════════════════════════
  let _lastGfxUpdate = performance.now();
  function graphicsLoop() {
    requestAnimationFrame(graphicsLoop);
    const now = performance.now();
    try {
      if (!getScene()) return;
      updateShadows(now);
      updateAura(now);
      updateTelegraphs(now);
    } catch (e) {}
  }
  graphicsLoop();

  // ═══════════════════════════════════════════════════════════════════════════
  // 20. БАГФИКСЫ (короткие)
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
      window.__pendingLoad = null;
      clear();
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
        if (typeof window.spawnComicPop === 'function')
          window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 3, 0)), '*МАЛО СТАМИНЫ!*', '#ff2200');
        return;
      }
      if (P.carrotRootBindCd > 0) return;
      return _r.apply(this, arguments);
    };
  });

  // applyDamageToHero с армором
  waitFor(() => typeof window.applyDamageToHero === 'function' && getPlayer(), () => {
    const _p = window.applyDamageToHero;
    window.applyDamageToHero = function (dmg) {
      const P = getPlayer(); if (!P || P.isDead) return;
      const shield = P.activeModeF && P.suitIdx === 3 && P.character === 'banana' &&
                     !isPepper() && !isCarrot() && !isLemon() && !isPotato();
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

  // pointerlock первая атака
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

  // Combo
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

  // exec-prompt
  setInterval(() => {
    const P = getPlayer(); if (!P || !P.execTarget || !P.execTarget.group) return;
    const pr = document.getElementById('exec-prompt'); if (!pr || pr.style.display === 'none') return;
    const cam = getCamera(); if (!cam) return;
    const pos = P.execTarget.group.position.clone(); pos.y += 3; pos.project(cam);
    if (pos.z > 1 || pos.z < -1) { pr.style.display = 'none'; return; }
    pr.style.left = ((pos.x * 0.5 + 0.5) * innerWidth) + 'px';
    pr.style.top = ((-pos.y * 0.5 + 0.5) * innerHeight) + 'px';
  }, 100);

  // HIDE (J/U)
  window.addEventListener('keydown', (e) => {
    if (document.pointerLockElement === null) return;
    if (e.code === 'KeyJ') document.body.classList.toggle('story-hidden');
    if (e.code === 'KeyU') document.body.classList.toggle('extra-ui-hidden');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 21. ФИНАЛ
  // ═══════════════════════════════════════════════════════════════════════════
  setTimeout(() => {
    console.log('✅ [MASTER PATCHER v8] Graphics upgrade applied');
    if (typeof window.showPatchToast === 'function') {
      window.showPatchToast('🎨 GRAPHICS v8', 'Тени · искры · телеграфы · аура · текстуры', '#00f2fe');
    }
  }, 3200);

})();
