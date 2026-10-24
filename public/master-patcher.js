// ============================================================================
// BANANA INDUSTRIES — MASTER PATCHER v7
// - ПЕРСОНАЛЬНЫЕ модули для каждого персонажа, с ясным индикатором
// - ОПТИМИЗАЦИЯ: bloom полностью выключен (getter-хак), NPC/защитники/спидеры/рельсы off
// - Пиксель-рацио ≤0.85, film-fx/hit-flash/controls-box скрыты
// - Миникарта 88×88, alert-card 0.55× (тревога скрыта)
// - Характер-специфичные баффы: пассивные бонусы к урону/HP/статам
// ============================================================================
(function () {
  'use strict';
  if (window.__BANANA_MASTER_PATCHER_V7) return;
  window.__BANANA_MASTER_PATCHER_V7 = true;
  console.log('🔧 [MASTER PATCHER v7] Инициализация...');

  const V7 = {
    SPEED_MUL:        0.82,
    ENEMY_SPEED_MUL:  0.88,
    BOSS_SPEED_MUL:   0.88,
    ANIM_EXT_MUL:     1.60,
    LMB_MIN_CD_MS:    480,
    HITSTOP_CRIT:     0.024,
    HITSTOP_NORMAL:   0.002,
    PARTICLE_MUL:     0.08,
    POPUP_CD_MS:      1000,
    DMG_NUM_PS:       4,
    PISTOL_CD_MS:     230,
    PISTOL_DMG:       46,
    PISTOL_RADIUS:    1.4,
    CROSSHAIR_MS:     320,
    MAX_IMPACTS_PS:   6,
    SLASH_SIZE_MUL:   0.55,
    PIXEL_RATIO_CAP:  0.85,
    MINIMAP_MS:       200,
    HPBAR_MS:         140,
    RAIN_COUNT:       80
  };
  window.__V7_TUNING = V7;

  const getPlayer    = () => (window.__game && window.__game.player) || window.player || null;
  const getEnemies   = () => (window.__game && window.__game.enemies) || window.enemies || [];
  const getScene     = () => (window.__game && window.__game.scene) || window.scene || null;
  const getCamera    = () => window.camera || (window.__game && window.__game.camera) || null;
  const getBuildings = () => { try { return (typeof buildings !== 'undefined') ? buildings : (window.buildings || []); } catch (e) { return []; } };
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
      if (ok) { done = true; try { cb(); } catch (e) { console.error('[v7]', e); } return; }
      if (performance.now() - t0 >= max) return;
      requestAnimationFrame(tick);
    };
    tick();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. CSS — UI МИНИМАЛИЗМ
  // ═══════════════════════════════════════════════════════════════════════════
  const css = `
    /* СКРЫТЬ ЛИШНЕЕ */
    .controls-box { display: none !important; }
    #film-fx { display: none !important; }
    #hit-flash { display: none !important; }
    #speed-lines { display: none !important; }
    #perf-hud { display: none !important; }
    #universal-cd-hud { display: none !important; }
    #rage-overlay { display: none !important; }

    /* МИНИКАРТА МЕНЬШЕ */
    .minimap-wrap {
      width: 88px !important;
      height: 88px !important;
      outline-width: 2px !important;
    }
    #minimap-canvas {
      width: 88px !important;
      height: 88px !important;
    }

    /* ALERT-CARD МИНИМАЛИЗИРОВАН */
    .alert-card {
      transform: skewX(-4deg) scale(0.55) !important;
      transform-origin: top left !important;
      opacity: 0.6 !important;
      padding: 3px 6px !important;
    }
    .alert-stars { display: none !important; }
    .district-name { font-size: 9px !important; }
    .alert-card div[style*="font-size:11px"] { font-size: 9px !important; }

    /* ПАНЕЛИ МЕНЬШЕ */
    .proto-hud-left { transform: skewX(-4deg) scale(0.9) !important; }
    .score-box { transform: skewX(-4deg) scale(0.85) !important; }
    .env-panel { transform: translateX(-50%) scale(0.75) !important; }
    .shrekich-monitor, #shrekich-monitor { transform: scale(0.85) !important; }
    .companion-panel, .rocket-panel { transform: skewX(-4deg) scale(0.8) !important; }
    .momentum-meter { transform: scale(0.8) !important; }
    #boss-hud { transform: translateX(-50%) scale(0.9) !important; }
    #story-campaign-hud { padding: 4px 10px !important; min-width: 320px !important; max-width: 480px !important; top: 38px !important; }
    #story-ch-title { font-size: 12px !important; }
    #story-ch-desc  { font-size: 9px !important; }
    #story-ch-dist  { font-size: 8px !important; }

    /* ПЛАШКА СПОСОБНОСТЕЙ — КРУПНЕЕ, ЯРЧЕ */
    .powers-box {
      font-size: 13.5px !important;
      padding: 10px 6px !important;
      line-height: 1.65 !important;
      color: #fff !important;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.5) !important;
      border-top: 2px solid rgba(255,200,36,0.7) !important;
      margin-top: 10px !important;
    }
    .powers-box b {
      color: #ffe066 !important;
      font-size: 14px !important;
      text-shadow: 0 0 6px rgba(255,200,36,0.6), 1px 1px 2px rgba(0,0,0,0.9) !important;
    }

    /* ПЕРЕХОДЫ — ПЛАВНЕЕ */
    #hud, .proto-hud-left, .score-box, .env-panel, .shrekich-monitor,
    .companion-panel, .rocket-panel, .alert-card, #boss-hud, #story-campaign-hud,
    .powers-box, .suit-hotbar, .dash-charges {
      transition: opacity 0.3s ease, transform 0.3s ease !important;
    }

    /* СКРЫТИЕ */
    body.story-hidden #story-campaign-hud { opacity: 0; pointer-events: none; }
    body.extra-ui-hidden .env-panel,
    body.extra-ui-hidden .shrekich-monitor,
    body.extra-ui-hidden .companion-panel,
    body.extra-ui-hidden .rocket-panel,
    body.extra-ui-hidden .momentum-meter,
    body.extra-ui-hidden .alert-card,
    body.extra-ui-hidden #boss-cast-bar-wrap,
    body.extra-ui-hidden .dash-charges { opacity: 0 !important; pointer-events: none !important; }

    /* z-index */
    #hud { z-index: 50 !important; }
    #boss-hud { z-index: 26 !important; }
    #exec-prompt { z-index: 45 !important; }

    /* E-меню — крупнее */
    .mutation-branch { padding: 16px !important; }
    .mutation-branch h4 { font-size: 17px !important; padding-bottom: 6px !important; border-bottom: 2px solid rgba(249,202,36,0.35) !important; margin-bottom: 10px !important; }
    .mutation-node { padding: 10px 12px !important; font-size: 12.5px !important; }
    .mutation-btn  { padding: 8px 14px !important; font-size: 12px !important; }

    /* Индикатор активных модулей */
    #v7-mod-hud {
      position: fixed; bottom: 260px; left: 16px; z-index: 22;
      display: none; flex-direction: column; gap: 3px;
      pointer-events: none;
    }
    .v7-mod-chip {
      background: rgba(6,20,10,0.92);
      border: 2px solid #000; outline: 2px solid #00ff66;
      padding: 3px 8px; font-size: 10px; font-weight: 900;
      color: #eaffea; transform: skewX(-4deg);
      box-shadow: 3px 3px 0 #000;
      text-shadow: 1px 1px 0 #000;
    }
  `;
  const stEl = document.createElement('style');
  stEl.textContent = css;
  document.head.appendChild(stEl);
  console.log('✅ CSS применён (компактный UI)');

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. BLOOM OFF — GETTER-ХАК (главный оптимизатор)
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => {
    try { return typeof postUniforms !== 'undefined' && postUniforms && postUniforms.uQuality; }
    catch (e) { return false; }
  }, () => {
    try {
      const freeze = (uni, val) => {
        if (!uni) return;
        try {
          Object.defineProperty(uni, 'value', {
            get: () => val,
            set: () => {},
            configurable: false
          });
        } catch (e) {}
      };
      freeze(postUniforms.uQuality, 0);          // bloom OFF
      freeze(postUniforms.uBloomStrength, 0);    // bloom OFF
      freeze(postUniforms.uChroma, 0);           // no chroma
      freeze(postUniforms.uRadialBlur, 0);       // no sprint blur
      freeze(postUniforms.uBioPulse, 0);         // no bio pulse
      freeze(postUniforms.uRage, 0);             // no red overlay
      console.log('✅ Bloom/post эффекты выключены (getter-freeze)');
    } catch (e) { console.warn('uniform freeze failed:', e); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. PIXEL RATIO CAP 0.85
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof renderer !== 'undefined' && renderer, () => {
    try {
      const cap = V7.PIXEL_RATIO_CAP;
      const _set = renderer.setPixelRatio.bind(renderer);
      renderer.setPixelRatio = function (v) {
        const ratio = Math.min(v || 1, cap);
        return _set(ratio);
      };
      renderer.setPixelRatio(cap);
      try { renderer.toneMappingExposure = 0.95; } catch (e) {}
    } catch (e) {}
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. СВЕТ — МЯГЧЕ
  // ═══════════════════════════════════════════════════════════════════════════
  setTimeout(() => {
    try { if (typeof hemiLight !== 'undefined' && hemiLight) hemiLight.intensity = 0.72; } catch (e) {}
    try { if (typeof moonLight !== 'undefined' && moonLight) moonLight.intensity = 0.95; } catch (e) {}
    try { if (typeof sunLight !== 'undefined' && sunLight) sunLight.intensity = 0.30; } catch (e) {}
    try { if (typeof fillLight !== 'undefined' && fillLight) fillLight.intensity = 0.25; } catch (e) {}
    try { if (typeof scene !== 'undefined' && scene.fog) scene.fog.density = 0.00055; } catch (e) {}
  }, 500);

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. СКРЫТИЕ (J = сюжет, U = доп UI)
  // ═══════════════════════════════════════════════════════════════════════════
  window.addEventListener('keydown', (e) => {
    if (document.pointerLockElement === null) return;
    if (e.code === 'KeyJ') document.body.classList.toggle('story-hidden');
    if (e.code === 'KeyU') document.body.classList.toggle('extra-ui-hidden');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. УБИВАЕМ NPC / ЗАЩИТНИКОВ / СПИДЕРЫ / РЕЛЬСЫ
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => true, () => {
    // NPC
    try { window.updateTalkingNPCs = function () {}; } catch (e) {}
    setTimeout(() => {
      document.querySelectorAll('.npc-bubble').forEach(b => b.style.display = 'none');
    }, 1000);

    // Защитники
    try {
      if (typeof window.spawnDefender === 'function') window.spawnDefender = function () {};
      const clear = () => {
        if (window.DEFENDERS) {
          window.DEFENDERS.forEach(d => {
            if (d.group && d.group.parent) d.group.parent.remove(d.group);
            if (d.hpBar && d.hpBar.parentNode) d.hpBar.parentNode.removeChild(d.hpBar);
          });
          window.DEFENDERS.length = 0;
        }
      };
      clear();
      setTimeout(clear, 2000);
    } catch (e) {}

    // Спидеры + рельсы + гидранты
    try {
      if (typeof window.buildAerialSpeederTraffic === 'function') window.buildAerialSpeederTraffic = function () {};
      if (typeof window.buildNeonSkyRails === 'function') window.buildNeonSkyRails = function () {};
      const clearAerial = () => {
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
        if (window.__STREET_HYDRANTS) {
          window.__STREET_HYDRANTS.forEach(h => { if (h.group) h.group.visible = false; });
          window.__STREET_HYDRANTS.length = 0;
        }
      };
      clearAerial();
      setTimeout(clearAerial, 1500);
      setTimeout(clearAerial, 5000);
    } catch (e) {}

    console.log('✅ NPC/защитники/спидеры/рельсы отключены');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. ХАРАКТЕР-СПЕЦИФИЧНЫЕ МОДУЛИ — КАТАЛОГ
  // ═══════════════════════════════════════════════════════════════════════════
  const MOD_CATALOG = {
    banana: [
      { id: 'banana_shrek_singularity', icon: '🌀', title: 'Сингулярность Шрекича', cost: 400,
        desc: 'Ракета создаёт гравитационную воронку. +15% урона.' },
      { id: 'banana_rapid_pistol', icon: '🔫', title: 'Скорострельный Пистолет', cost: 250,
        desc: 'Пистолет [Q]: -40% КД, +25% урона.' },
      { id: 'banana_heavy_rocket', icon: '🚀', title: 'Тяжёлая Ракета', cost: 350,
        desc: 'Ракета [G]: +50% урона, радиус +3м.' }
    ],
    pepper: [
      { id: 'pepper_blue_flame', icon: '🔥', title: 'Синее Пламя', cost: 300,
        desc: '+35% урона огнём, игнорирует щиты.' },
      { id: 'pepper_meteor_core', icon: '☄️', title: 'Метеоритное Ядро', cost: 450,
        desc: 'Лавовый гейзер при огненном падении.' }
    ],
    carrot: [
      { id: 'carrot_poison_ivy', icon: '🌿', title: 'Ядовитый Плющ', cost: 300,
        desc: '+30% вампиризма от урона опутывания.' },
      { id: 'carrot_ancient_ent', icon: '🪨', title: 'Кора Энта', cost: 450,
        desc: '-55% урона в Гиганте, +25% HP.' }
    ],
    lemon: [
      { id: 'lemon_mega_hive', icon: '🕷️', title: 'Мега-Улей', cost: 300,
        desc: 'До 8 пауков, +50% урона.' },
      { id: 'lemon_bold_superconductor', icon: '⚡', title: 'Сверхпроводник', cost: 450,
        desc: 'Лазер бьёт по 3 ближайшим.' }
    ],
    potato: [
      { id: 'potato_starch_juggernaut', icon: '🥔', title: 'Крахмал-Джаггернаут', cost: 300,
        desc: 'Таран оставляет след огня 5с.' },
      { id: 'potato_thermo_ketchup', icon: '🍅', title: 'Термо-Кетчуп', cost: 450,
        desc: '+20% урона, -60% скорости врагам.' }
    ]
  };
  window.__V7_MOD_CATALOG = MOD_CATALOG;

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

  // Пассивный множитель урона от модулей (только для текущего персонажа)
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
  // 8. ПЕРЕ-РЕНДЕР E-МЕНЮ (гарантируем видимость модулей)
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.renderLabTab === 'function' && document.getElementById('lab-content'), () => {
    window.renderLabTab = function (tabName) {
      if (tabName !== 'suits') {
        // Fallback для остальных вкладок
        try {
          if (typeof window.__origRenderLabTab === 'function') return window.__origRenderLabTab.apply(this, arguments);
        } catch (e) {}
        return;
      }

      const P = getPlayer();
      const epVal = document.getElementById('lab-ep-val');
      const scoreVal = document.getElementById('lab-score-val');
      const waveVal = document.getElementById('lab-wave-val');
      if (epVal) epVal.innerText = P ? Math.floor(P.ep) : 0;
      if (scoreVal) scoreVal.innerText = (P ? P.score : 0).toLocaleString('ru-RU');
      if (waveVal) waveVal.innerText = P ? P.wave : 1;

      const container = document.getElementById('lab-content');
      if (!container) return;
      container.innerHTML = '';

      // === КОСТЮМЫ (только для Banana) ===
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

      // === БОЕВЫЕ МОДУЛИ (все персонажи) ===
      const evoSection = document.createElement('div');
      evoSection.style.cssText = 'margin-top:20px;';
      const evoH = document.createElement('div');
      evoH.style.cssText = 'padding:10px 14px;background:#14281d;border-left:5px solid #f9ca24;font-weight:900;color:#f9ca24;font-size:16px;text-transform:uppercase;margin-bottom:12px;letter-spacing:1px;';
      evoH.innerText = '⚡ БОЕВЫЕ МОДУЛИ ЭВОЛЮЦИИ';
      evoSection.appendChild(evoH);

      const charNames = { banana: '🍌 ЕГОРБАНАН', pepper: '🌶️ КАПИТАН ПЕРЕЦ', carrot: '🥕 ХОХЛОРКОВЬ', lemon: '🍋 ДИМОН ЛИМОН', potato: '🥔 КАРТОШКА' };
      const E = window.__EVO_MODULES;

      ['banana', 'pepper', 'carrot', 'lemon', 'potato'].forEach(charKey => {
        const modules = MOD_CATALOG[charKey] || [];
        if (modules.length === 0) return;
        const charH = document.createElement('div');
        const isCur = charKey === currentChar;
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
          card.style.cssText = `outline-color:${owned ? '#00ff66' : (isCur ? '#00f2fe' : '#2ecc71')};`;
          card.innerHTML = `<div><div style="font-size:10px;color:#00f2fe;font-weight:900;margin-bottom:4px;">${charNames[charKey]}</div><h3>${mod.icon} ${mod.title}</h3><p>${mod.desc}</p></div><div>${owned ? '<button class="lab-btn" style="width:100%;background:#00ff66;color:#000;" disabled>✓ УСТАНОВЛЕН</button>' : `<button class="lab-btn" style="width:100%;background:${canAfford ? '#f9ca24' : '#444'};color:${canAfford ? '#000' : '#999'};" ${canAfford ? '' : 'disabled'} onclick="window.buyHeroEvoModule('${mod.id}',${mod.cost})">КУПИТЬ ${mod.cost} EP</button>`}</div>`;
          grid.appendChild(card);
        });
        evoSection.appendChild(grid);
      });

      container.appendChild(evoSection);
    };
    console.log('✅ E-меню пере-рендерится (персональные модули)');
  });

  // Валидация покупки — фидбэк при нехватке EP
  waitFor(() => typeof window.buyHeroEvoModule === 'function', () => {
    const _b = window.buyHeroEvoModule;
    window.buyHeroEvoModule = function (id, cost) {
      const P = getPlayer();
      if (P && P.ep < cost) {
        if (typeof window.showPatchToast === 'function') {
          window.showPatchToast('⚠️ НЕ ХВАТАЕТ EP', `Нужно ${cost}, у вас ${Math.floor(P.ep)}`, '#ff0055');
        }
        return;
      }
      const r = _b.apply(this, arguments);
      // Обновляем HUD-индикатор
      refreshModHud();
      return r;
    };
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. HUD-ИНДИКАТОР АКТИВНЫХ МОДУЛЕЙ
  // ═══════════════════════════════════════════════════════════════════════════
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
    _modHudEl.innerHTML = actives.map(m =>
      `<div class="v7-mod-chip">${m.icon} ${m.title}</div>`
    ).join('');
  }
  setInterval(refreshModHud, 800);

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. DAMAGEENEMY: пассивный бонус урона от модулей + phase-gate fix
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.damageEnemy === 'function', () => {
    const _d = window.damageEnemy;
    window.damageEnemy = function (en, dmg, kv, pt) {
      if (!en) return _d.apply(this, arguments);

      // Модульный пассивный буст (только для текущего персонажа)
      dmg *= getModuleDmgMult();

      // Phase-gate boss fix (из .txt)
      if (en._isPinnacleBoss) dmg *= 1.43;
      const bHp = en.hp, p66 = en._gate66Triggered, p33 = en._gate33Triggered, pin = en._isPinnacleBoss;
      const r = _d.call(this, en, dmg, kv, pt);

      // Impact pulse (визуальный фидбэк)
      if (en.group && dmg > 0) {
        const pos = en.group.position.clone();
        pos.y += (en._isBoss || en._isPinnacleBoss) ? 7 : 2.2;
        spawnImpactPulse(pos, en.hp <= 0 ? 0xffffff : 0xffe066);
        en._hitStagger = Math.max(en._hitStagger || 0, 0.28);
      }

      // Phase-gate не должен хилит
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

  // Impact pulses — единый RAF
  const _impPool = [], _impActive = [];
  let _lastImp = 0;
  function getImpMesh(scene) {
    let m = _impPool.pop();
    if (!m) {
      m = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, wireframe: true, depthWrite: false }));
      scene.add(m);
    }
    return m;
  }
  function spawnImpactPulse(pos, colorHex) {
    const now = performance.now();
    if (now - _lastImp < 1000 / V7.MAX_IMPACTS_PS) return;
    _lastImp = now;
    const scene = getScene();
    if (!scene) return;
    const m = getImpMesh(scene);
    m.visible = true; m.material.color.setHex(colorHex); m.material.opacity = 0.9;
    m.position.copy(pos); m.scale.setScalar(0.4);
    _impActive.push({ mesh: m, t0: now });
  }
  (function tickImp() {
    requestAnimationFrame(tickImp);
    const now = performance.now();
    for (let i = _impActive.length - 1; i >= 0; i--) {
      const im = _impActive[i]; const t = (now - im.t0) / 320;
      if (t >= 1) { im.mesh.visible = false; _impPool.push(im.mesh); _impActive.splice(i, 1); continue; }
      im.mesh.scale.setScalar(0.4 + t * 4.5); im.mesh.material.opacity = 0.9 * (1 - t);
    }
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. APPLYDAMAGETOHERO: армор fix + carrot_ancient_ent
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.applyDamageToHero === 'function' && getPlayer(), () => {
    const _p = window.applyDamageToHero;
    window.applyDamageToHero = function (dmg) {
      const P = getPlayer();
      if (!P || P.isDead) return;
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
    console.log('✅ Арморы модулей работают');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. HP-БОНУС МОДУЛЕЙ (carrot_ancient_ent → +25% HP)
  // ═══════════════════════════════════════════════════════════════════════════
  function applyModuleHpBonus() {
    const P = getPlayer();
    if (!P) return;
    const char = charOf();
    const E = window.__EVO_MODULES;
    if (!E) return;
    let hpMult = 1;
    if (char === 'carrot' && E.has('carrot_ancient_ent')) hpMult *= 1.25;
    // Recalc maxHp только если изменился
    if (!P._v7LastHpMult) P._v7LastHpMult = 1;
    if (Math.abs(hpMult - P._v7LastHpMult) > 0.01) {
      if (!P._v7BaseMaxHp) P._v7BaseMaxHp = Math.round(P.maxHp / P._v7LastHpMult);
      const ratio = P.hp / Math.max(1, P.maxHp);
      P.maxHp = Math.round(P._v7BaseMaxHp * hpMult);
      P.hp = Math.round(P.maxHp * ratio);
      P._v7LastHpMult = hpMult;
      if (typeof window.updateHUD === 'function') window.updateHUD();
    }
  }
  setInterval(applyModuleHpBonus, 1000);

  // ═══════════════════════════════════════════════════════════════════════════
  // 13. СКОРОСТЬ + LMB + враги
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.getSuitData === 'function', () => {
    const _g = window.getSuitData;
    window.getSuitData = function () {
      const d = _g.apply(this, arguments);
      if (d && typeof d.speed === 'number') {
        if (!d._v7Orig) d._v7Orig = d.speed;
        d.speed = d._v7Orig * V7.SPEED_MUL;
      }
      return d;
    };
    ['pepperStats', 'carrotStats'].forEach(fn => {
      if (typeof window[fn] !== 'function') return;
      const _s = window[fn];
      window[fn] = function () {
        const d = _s.apply(this, arguments);
        if (d && typeof d.speed === 'number') {
          if (!d._v7Orig) d._v7Orig = d.speed;
          d.speed = d._v7Orig * V7.SPEED_MUL;
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
      if (now - _last < V7.LMB_MIN_CD_MS) return;
      const bt = P.attackTimer;
      const r = _o.apply(this, arguments);
      if (P.attackTimer > bt && P.attackTimer > 0.1) {
        _last = now;
        P.attackDuration *= V7.ANIM_EXT_MUL;
        P.attackTimer *= V7.ANIM_EXT_MUL;
      }
      return r;
    };
  });

  waitFor(() => typeof window.playEnemyMeleeAttack === 'function', () => {
    const _b = window.playEnemyMeleeAttack;
    const M = 1.45;
    window.playEnemyMeleeAttack = function (en, type) {
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

  // Враги реже и сильнее
  waitFor(() => typeof window.spawnCitrusSoldier === 'function', () => {
    const cap = () => getEnemies().filter(e => !e._isStoryConstruct && !e._isBoss && !e._isPinnacleBoss && !e._isPhasePylon).length >= 5;
    const buff = (fromIdx, hpMul, spdMul, sizeMul) => {
      const es = getEnemies();
      for (let i = fromIdx; i < es.length; i++) {
        const e = es[i];
        if (!e || e._isBoss || e._isStoryConstruct || e._isPinnacleBoss || e._v7Buffed) continue;
        e._v7Buffed = true;
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
      buff(b, 2.8, V7.ENEMY_SPEED_MUL, 1.18);
    };
    const _a = window.spawnCitrusAPC;
    if (_a) window.spawnCitrusAPC = function () { const b = getEnemies().length; _a.apply(this, arguments); buff(b, 2.0, V7.ENEMY_SPEED_MUL, 1.1); };
    const _h = window.spawnCitrusHeli;
    if (_h) window.spawnCitrusHeli = function () { const b = getEnemies().length; _h.apply(this, arguments); buff(b, 2.0, V7.ENEMY_SPEED_MUL, 1.1); };
    ['spawnSoloFinalGrapestasik', 'spawnSoloFinalJirigory', 'spawnSoloBeetrootTitanGoretzka', 'spawnSoloMonolithOfSterility'].forEach(fn => {
      if (typeof window[fn] !== 'function') return;
      const _o = window[fn];
      window[fn] = function () {
        const r = _o.apply(this, arguments);
        const es = getEnemies(); const b = es[es.length - 1];
        if (b && b._isPinnacleBoss && b.speed) b.speed *= V7.BOSS_SPEED_MUL;
        return r;
      };
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 14. HITSTOP (2/24 мс) + СЛЭШИ + ЧАСТИЦЫ + ПОПАПЫ
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.triggerHitstopAndChroma === 'function', () => {
    const _h = window.triggerHitstopAndChroma;
    window.triggerHitstopAndChroma = function (stop, shake, chr) {
      const P = getPlayer();
      if (P) {
        const s = stop || 0;
        if (s < 0.015) P.hitStop = Math.max(P.hitStop || 0, V7.HITSTOP_NORMAL);
        else if (s < 0.05) P.hitStop = Math.max(P.hitStop || 0, Math.min(V7.HITSTOP_CRIT, s * 1.3));
        P.cameraShake = Math.max(P.cameraShake || 0, 0.18);
      }
      if (_h) _h.call(this, stop, shake, (chr || 0.85) * 0.15);
    };
  });
  waitFor(() => typeof window.spawnSlashArc === 'function', () => {
    const _s = window.spawnSlashArc;
    window.spawnSlashArc = function (pos, yaw, tiltZ, colorHex, radius, duration) {
      return _s.call(this, pos, yaw, tiltZ, colorHex, (radius || 3.8) * V7.SLASH_SIZE_MUL, duration || 0.25);
    };
  });
  waitFor(() => typeof window.spawnGroundCrackRing === 'function', () => {
    const _r = window.spawnGroundCrackRing;
    window.spawnGroundCrackRing = function (pos, colorHex, maxR) {
      return _r.call(this, pos, colorHex, (maxR || 11) * 0.7);
    };
  });
  waitFor(() => typeof window.spawnParticles === 'function', () => {
    const _p = window.spawnParticles;
    window.spawnParticles = function (pos, color, count) {
      return _p.call(this, pos, color, Math.max(1, Math.floor((count || 10) * V7.PARTICLE_MUL)));
    };
    if (typeof window.spawnSparks === 'function') {
      const _s = window.spawnSparks;
      window.spawnSparks = function (pos, count, color) {
        return _s.call(this, pos, Math.max(1, Math.floor((count || 6) * V7.PARTICLE_MUL)), color);
      };
    }
  });
  waitFor(() => typeof window.spawnComicPop === 'function', () => {
    const _o = window.spawnComicPop;
    let _last = 0;
    const KEY = /RAGE|BOSS|ФАЗА|ЭВОЛЮЦИЯ|LEVEL|УРОВЕНЬ|СИНТЕЗ|МУЛЬТИФРУКТ|ПОБЕД|ФИНАЛ|ГЛАВА|СОЛО|ВРАТА|КРИСТАЛЛ|ТЮРЬМА|СЕГМЕНТ|СПИРАЛЬ|СИНГУЛЯР|ГРОМОВ|ЗОЛОТ|АЛМАЗ|МОНОЛИТ|ГАРПУН|ЩИТ|ПАНЦИРЬ|БУР|ТАРАН|ЛАЗЕР/i;
    window.spawnComicPop = function (pos, text, color) {
      const now = performance.now();
      if (KEY.test(text) || now - _last > V7.POPUP_CD_MS) { _last = now; return _o.call(this, pos, text, color); }
    };
    if (typeof window.spawnDamageNumber === 'function') {
      const _d = window.spawnDamageNumber;
      let cnt = 0, reset = 0;
      window.spawnDamageNumber = function (pos, v, type) {
        const now = performance.now();
        if (now - reset > 1000) { cnt = 0; reset = now; }
        if (cnt < V7.DMG_NUM_PS || type === 'crit' || type === 'heal') { cnt++; return _d.call(this, pos, v, type); }
      };
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 15. ПИСТОЛЕТ БАНАНА + МОДУЛИ-ПИСТОЛЕТЫ
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
    const glowBody = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.62), neon); glowBody.position.set(0, 0.06, 0.16); g.add(glowBody);
    g.scale.setScalar(2.2); g.rotation.x = Math.PI / 2; g.position.set(0.15, -0.15, 0.08);
    return g;
  }

  function attachPistol() {
    const P = getPlayer();
    if (!P || !P.mesh || !P.mesh.userData) return;
    const ud = P.mesh.userData;
    if (!ud.armR || !ud.armR.wrist) return;
    if (typeof THREE === 'undefined') return;
    ['_v3PistolMesh', '_v4PistolMesh', '_v5PistolMesh', '_v6PistolMesh', '_v7PistolMesh'].forEach(k => {
      if (ud[k]) { if (ud[k].parent) ud[k].parent.remove(ud[k]); ud[k] = null; }
    });
    if (P.character !== 'banana' || P.suitIdx !== 0) return;
    const p = buildPistolMesh();
    ud.armR.wrist.add(p);
    ud._v7PistolMesh = p;
    ud._v7PistolMuzzleLocal = new THREE.Vector3(0, 0.10, 0.85);
    console.log('🔫 Пистолет прикреплён');
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
      if (should && !ud._v7PistolMesh) attachPistol();
      else if (!should && ud._v7PistolMesh) attachPistol();
    }, 800);
  });

  function getMuzzleWorld() {
    const P = getPlayer();
    if (!P || !P.mesh || !P.mesh.userData) return null;
    const ud = P.mesh.userData;
    if (!ud._v7PistolMesh || !ud._v7PistolMuzzleLocal) return null;
    const v = ud._v7PistolMuzzleLocal.clone();
    ud._v7PistolMesh.localToWorld(v);
    return v;
  }

  function firePistol() {
    const P = getPlayer(), scene = getScene();
    if (!P || !scene || P.isDead) return;
    if (P.character !== 'banana' || P.suitIdx !== 0) return;
    if (isPepper() || isCarrot() || isLemon() || isPotato()) return;

    // Модуль Скорострельный Пистолет: -40% КД, +25% урона
    const hasRapid = window.__EVO_MODULES && window.__EVO_MODULES.has('banana_rapid_pistol');
    const cd = hasRapid ? V7.PISTOL_CD_MS * 0.6 : V7.PISTOL_CD_MS;
    const dmgMult = hasRapid ? 1.25 : 1.0;

    const now = performance.now();
    if (now - _lastPistolAt < cd) return;
    _lastPistolAt = now;

    const fwd = new THREE.Vector3(-Math.sin(P.camYaw), 0, -Math.cos(P.camYaw));
    let start = getMuzzleWorld();
    if (!start) start = P.pos.clone().add(new THREE.Vector3(0, 2.0, 0)).addScaledVector(fwd, 0.9);

    const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe066 }));
    bullet.position.copy(start);
    bullet.add(new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.5, wireframe: true })));
    const tracer = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.01, 2.2, 5), new THREE.MeshBasicMaterial({ color: 0xffcc33, transparent: true, opacity: 0.75 }));
    tracer.rotation.x = Math.PI / 2; tracer.position.z = 1.1; bullet.add(tracer);
    scene.add(bullet);

    myBullets.push({
      mesh: bullet,
      vel: new THREE.Vector3(fwd.x * 95, 0, fwd.z * 95),
      life: 1.3,
      dmg: V7.PISTOL_DMG * (1 + (P.comboMult || 1) * 0.15) * dmgMult,
      radius: V7.PISTOL_RADIUS
    });

    const flash = new THREE.Mesh(new THREE.SphereGeometry(0.65, 6, 6), new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0.85, wireframe: true }));
    flash.position.copy(start); scene.add(flash);
    let ft = 0;
    const fa = setInterval(() => {
      ft += 0.05; flash.scale.setScalar(1 + ft * 4); flash.material.opacity = Math.max(0, 0.85 - ft * 2.6);
      if (ft >= 0.35) { clearInterval(fa); scene.remove(flash); flash.geometry.dispose(); flash.material.dispose(); }
    }, 16);

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
    if (el && !el.dataset.v7) {
      el.innerHTML = '<b>ЛКМ:</b> Удары | <b>Q / ПКМ:</b> 🔫 ПИСТОЛЕТ | <b>F:</b> Турель | <b>G:</b> Ракета';
      el.dataset.v7 = '1';
    }
    const badge = document.querySelector('.suit-badge');
    if (badge && !badge.dataset.v7) { badge.innerText = '[0] ЕГОРБАНАН · ПИСТОЛЕТ [Q]'; badge.dataset.v7 = '1'; }
  }, 700);

  waitFor(() => typeof window.equipSuit === 'function', () => {
    const _e = window.equipSuit;
    window.equipSuit = function () {
      const d = document.getElementById('ui-powers-desc'); if (d) delete d.dataset.v7;
      const b = document.querySelector('.suit-badge'); if (b) delete b.dataset.v7;
      const r = _e.apply(this, arguments);
      setTimeout(attachPistol, 40);
      return r;
    };
  });

  // Тикер пуль
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
          if (typeof window.damageEnemy === 'function') window.damageEnemy(e, b.dmg, b.vel.clone().normalize(), '*БАЦ!*');
          b.life = 0; break;
        }
      }
      if (b.life <= 0) {
        scene.remove(b.mesh);
        b.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
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

  // ═══════════════════════════════════════════════════════════════════════════
  // 16. ЛАЗЕРЫ ЛИМОНА
  // ═══════════════════════════════════════════════════════════════════════════
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
        radius: 2.2
      });
    };
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 17. WALL-RUN БЛОК (Банан + Лимон)
  // ═══════════════════════════════════════════════════════════════════════════
  const BldGrid = {
    cell: 80, grid: new Map(), ready: false,
    rebuild() {
      const B = getBuildings(); if (!B.length) return;
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
  // 18. ОПТИМИЗАЦИЯ — ТРОТТЛИНГ
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
  waitFor(() => typeof window.drawMinimap === 'function', () => {
    window.drawMinimap = throttle(window.drawMinimap, V7.MINIMAP_MS);
  });
  waitFor(() => typeof window.updateEnemyHpBars === 'function', () => {
    window.updateEnemyHpBars = throttle(window.updateEnemyHpBars, V7.HPBAR_MS);
  });
  waitFor(() => typeof window.updateHUD === 'function', () => {
    window.updateHUD = throttle(window.updateHUD, 80);
  });
  waitFor(() => typeof window.raycastAllBuildingsAABB === 'function', () => {
    const _o = window.raycastAllBuildingsAABB;
    let last = 0, lastR = null;
    window.raycastAllBuildingsAABB = function (o, d, m) {
      const now = performance.now();
      if (now - last < V7.CROSSHAIR_MS) return lastR;
      last = now;
      lastR = _o.call(this, o, d, m);
      return lastR;
    };
  });

  // Дождь
  waitFor(() => { try { return typeof rainSystem !== 'undefined' && rainSystem && rainSystem.geometry; } catch (e) { return false; } }, () => {
    try {
      const geo = rainSystem.geometry;
      const arr = geo.attributes.position.array;
      const newCount = V7.RAIN_COUNT * 3;
      if (arr.length > newCount) {
        const newArr = new Float32Array(newCount);
        for (let i = 0; i < newCount; i++) newArr[i] = arr[i];
        geo.setAttribute('position', new THREE.Float32BufferAttribute(newArr, 3));
        geo.attributes.position.needsUpdate = true;
      }
    } catch (e) {}
  });

  // Пул частиц
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
  // 19. БАГФИКСЫ .txt
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

  // ═══════════════════════════════════════════════════════════════════════════
  // 20. СТАРТ
  // ═══════════════════════════════════════════════════════════════════════════
  setTimeout(() => {
    console.log('✅ [MASTER PATCHER v7] Всё применено');
    if (typeof window.showPatchToast === 'function') {
      window.showPatchToast('🔧 MASTER PATCHER v7', 'Модули персональные · bloom off · UI минимализм', '#00f2fe');
    }
  }, 3200);

})();
