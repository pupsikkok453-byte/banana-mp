// ============================================================================
// BANANA INDUSTRIES — MASTER PATCHER v1
// Фиксит все баги из game-patch v14 и добавляет новые фичи.
// Загружать ПОСЛЕ game-patch.js
// ============================================================================
(function () {
  'use strict';
  if (window.__BANANA_MASTER_PATCHER_V1) return;
  window.__BANANA_MASTER_PATCHER_V1 = true;
  console.log('🔧 [MASTER PATCHER v1] Инициализация...');

  const waitFor = (cond, cb, max = 8000) => {
    const t0 = performance.now();
    let done = false;
    const check = () => {
      if (done) return;
      if (cond()) { done = true; cb(); return; }
      if (performance.now() - t0 >= max) {
        console.warn('⚠️ Patch timeout: dependency not ready');
        return;
      }
      requestAnimationFrame(check);
    };
    check();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FIX #1, #9: АРМОР НЕ РАБОТАЕТ + ДВОЙНОЙ ЩИТ (баг arguments в strict mode)
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.applyDamageToHero === 'function', () => {
    const _patchedDamageToHero = window.applyDamageToHero;

    window.applyDamageToHero = function (dmg) {
      if (player.isDead) return;

      const wasShield = player.activeModeF && player.suitIdx === 3 && player.character === 'banana'
        && !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE && !window.__POTATO_MODE;
      const beforeEn = player.en;
      const beforeHp = player.hp;

      // Считаем ожидаемый эффективный урон (арморы)
      let effectiveDmg = dmg;
      let hadReduction = false;
      if (CARROT_MODE && CARROT_FORM === 2 && typeof EvoModules !== 'undefined' && EvoModules.has('carrot_ancient_ent')) {
        effectiveDmg *= 0.55; hadReduction = true;
      }
      if (window.__POTATO_MODE && window.__POTATO_FORM === 1 && player._potatoArmor > 0) {
        effectiveDmg = Math.floor(effectiveDmg * 0.5); hadReduction = true;
      }
      if (player._multifruitTitanActive) {
        effectiveDmg = Math.floor(effectiveDmg * 0.55); hadReduction = true;
      }

      // Вызываем багованную версию патча (она применит полный урон)
      _patchedDamageToHero.call(this, dmg);

      // Корректировка: если HP упало на полный dmg, возвращаем разницу
      if (hadReduction) {
        const actual = beforeHp - player.hp;
        if (actual > effectiveDmg + 0.5 && actual < dmg + 0.5) {
          player.hp = Math.min(player.maxHp, player.hp + (actual - effectiveDmg));
          if (typeof updateHUD === 'function') updateHUD();
        }
      }

      // Двойной щит: патч списал 1.5x, база должна была списать 3.0x
      if (wasShield) {
        const drained = beforeEn - player.en;
        if (drained > 0.01 && beforeHp === player.hp) {
          player.en = Math.max(0, player.en - drained);
          if (player.en <= 0) {
            player.activeModeF = false;
            if (player.mesh && player.mesh.userData && player.mesh.userData.limeShield) {
              player.mesh.userData.limeShield.visible = false;
            }
          }
          if (typeof updateHUD === 'function') updateHUD();
        }
      }
    };
    console.log('✅ Fix #1, #9: Армор + щит исправлены');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FIX #2: ПРОГРЕСС САГИ НЕ СОХРАНЯЕТСЯ
  // ═══════════════════════════════════════════════════════════════════════════
  let _lastSavedChapter = -1;
  setInterval(() => {
    if (window.StoryCampaign && window.StoryCampaign.chapter !== _lastSavedChapter) {
      _lastSavedChapter = window.StoryCampaign.chapter;
      try {
        localStorage.setItem('banana_v201_story_progress', JSON.stringify({
          chapter: window.StoryCampaign.chapter,
          ts: Date.now()
        }));
      } catch (e) {}
    }
  }, 500);
  console.log('✅ Fix #2: Сохранение саги');

  // ═══════════════════════════════════════════════════════════════════════════
  // FIX #3, #4, #11: КНОПКА СТАРТ + CONTINUE + СТАРТ САГИ
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => document.getElementById('start-btn') && window.startGameSession, () => {
    const cleanupStoryEnemies = () => {
      if (typeof enemies === 'undefined' || typeof scene === 'undefined') return;
      for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i]._isStoryConstruct || enemies[i]._isPinnacleBoss) {
          if (enemies[i].group && enemies[i].group.parent) scene.remove(enemies[i].group);
          enemies.splice(i, 1);
        }
      }
      if (typeof activeBoss !== 'undefined') activeBoss = null;
    };

    document.getElementById('start-btn').addEventListener('click', () => {
      try { localStorage.removeItem('banana_v201_story_progress'); } catch (e) {}
      window.__pendingLoad = null;
      cleanupStoryEnemies();
      if (window.StoryCampaign) {
        window.StoryCampaign.chapter = 0;
        window.StoryCampaign.objectives = [];
        window.StoryCampaign.completed = false;
      }
    });

    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        if (typeof Save !== 'undefined' && Save.load) window.__pendingLoad = Save.load();
      });
    }

    const _origStartGameSession = window.startGameSession;
    window.startGameSession = function (loaded) {
      const isFresh = (loaded === null || loaded === undefined);
      if (isFresh) {
        try { localStorage.removeItem('banana_v201_story_progress'); } catch (e) {}
        if (window.StoryCampaign) {
          window.StoryCampaign.chapter = 0;
          window.StoryCampaign.objectives = [];
          window.StoryCampaign.completed = false;
        }
        cleanupStoryEnemies();
      }
      const result = _origStartGameSession.apply(this, arguments);
      if (isFresh && window.startStoryChapter) {
        setTimeout(() => window.startStoryChapter(1), 100);
      }
      return result;
    };
    console.log('✅ Fix #3, #4, #11: Старт/Continue/Сага');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FIX #4 (доп.): Save.load выставляет __pendingLoad (картошка грузит сейв)
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof Save !== 'undefined' && typeof Save.load === 'function', () => {
    const _origLoad = Save.load.bind(Save);
    Save.load = function () {
      const r = _origLoad();
      window.__pendingLoad = r;
      return r;
    };
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FIX #5: ДВОЙНАЯ ИНИЦИАЛИЗАЦИЯ КАРТОШКИ
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.equipPotato === 'function', () => {
    const _origEquipPotato = window.equipPotato;
    window.equipPotato = function () {
      if (window.__POTATO_MODE && player.mesh && player.mesh.userData && player.mesh.userData.isPotato) {
        return;
      }
      return _origEquipPotato.apply(this, arguments);
    };
    console.log('✅ Fix #5: equipPotato идемпотентен');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FIX #6, #14, #19: ФАЗОВЫЕ ВРАТА ХИЛЯТ БОССА + КАП УРОНА + ЖИРИГОРЬ
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.damageEnemy === 'function', () => {
    const _origDmg = window.damageEnemy;

    window.damageEnemy = function (en, dmg, knockVec, popText) {
      if (!en) return _origDmg.apply(this, arguments);

      // Fix #14: поднимаем кап с 4.2% до 6% (буст на входе, патч сам закапает)
      if (en._isPinnacleBoss) dmg *= 1.43;

      const beforeHp = en.hp;
      const preGate66 = en._gate66Triggered;
      const preGate33 = en._gate33Triggered;
      const wasPinnacle = en._isPinnacleBoss;

      const result = _origDmg.call(this, en, dmg, knockVec, popText);

      // Fix #6: патч снапит HP ВВЕРХ на 66%/33%. Возвращаем нормальный урон.
      if (wasPinnacle && beforeHp > 0 && en.hp > 0) {
        const hp66 = en.maxHp * 0.66;
        const hp33 = en.maxHp * 0.33;
        if (!preGate66 && en._gate66Triggered && Math.abs(en.hp - hp66) < 1 && beforeHp > hp66) {
          const credit = Math.max(1, Math.min(dmg * 2, en.maxHp * 0.05));
          en.hp = Math.min(en.hp, hp66 - credit);
          if (typeof updateBossHUD === 'function') updateBossHUD();
        }
        if (!preGate33 && en._gate33Triggered && Math.abs(en.hp - hp33) < 1 && beforeHp > hp33) {
          const credit = Math.max(1, Math.min(dmg * 2, en.maxHp * 0.05));
          en.hp = Math.min(en.hp, hp33 - credit);
          if (typeof updateBossHUD === 'function') updateBossHUD();
        }
        // Fix #19: Жиригорь фаза 2 не откатывается
        if (en._isSoloJirigory && en.hp / en.maxHp > 0.65 && en._phase2) {
          en._phase2 = false;
          if (en.group) en.group.scale.setScalar(1.25);
          if (en._crystalGroup) en._crystalGroup.visible = false;
        }
      }
      return result;
    };
    console.log('✅ Fix #6, #14, #19: Врата/кап/фазы боссов');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FIX #7, #8 + FEATURE B: КАМЕРА В СТЕНАХ + КРИСТАЛЛ Y + БЕЗ ЛАЗАНЬЯ
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.updatePlayerChoreographyAndCamera === 'function', () => {
    const _origChoreo = window.updatePlayerChoreographyAndCamera;

    window.updatePlayerChoreographyAndCamera = function (dt, now) {
      const preY = player.pos.y;
      const preFrozen = (window.__MP && window.__MP._myRootedUntil > now) || (player._crystalPrisonHitsNeeded > 0);

      // FEATURE B: отталкиваем от стен всех, кроме Хохлоркови и Картошки
      const allowWallRun = CARROT_MODE || window.__POTATO_MODE;
      if (!allowWallRun && typeof buildings !== 'undefined') {
        for (let i = 0; i < buildings.length; i++) {
          const b = buildings[i];
          const pad = 1.5;
          if (player.pos.x > b.minX - pad && player.pos.x < b.maxX + pad &&
              player.pos.z > b.minZ - pad && player.pos.z < b.maxZ + pad &&
              player.pos.y < b.topY) {
            const dxMin = Math.abs(player.pos.x - (b.minX - pad));
            const dxMax = Math.abs(player.pos.x - (b.maxX + pad));
            const dzMin = Math.abs(player.pos.z - (b.minZ - pad));
            const dzMax = Math.abs(player.pos.z - (b.maxZ + pad));
            const m = Math.min(dxMin, dxMax, dzMin, dzMax);
            if (m === dxMin) player.pos.x = b.minX - pad - 0.02;
            else if (m === dxMax) player.pos.x = b.maxX + pad + 0.02;
            else if (m === dzMin) player.pos.z = b.minZ - pad - 0.02;
            else player.pos.z = b.maxZ + pad + 0.02;
          }
        }
      }

      _origChoreo.call(this, dt, now);

      // FEATURE B: гасим isWallRunning
      if (!allowWallRun && player.isWallRunning) {
        player.isWallRunning = false;
        if (player.wallJumpCount > 0) player.wallJumpCount = 0;
      }

      // Fix #8: Кристаллическая тюрьма — фиксим и Y
      if (preFrozen) {
        player.pos.y = preY;
        player.vel.y = 0;
      }

      // Fix #7: Камера проваливается в стены после shoulder-offset
      if (typeof camera !== 'undefined' && typeof buildings !== 'undefined') {
        for (let i = 0; i < buildings.length; i++) {
          const b = buildings[i];
          if (camera.position.x > b.minX && camera.position.x < b.maxX &&
              camera.position.z > b.minZ && camera.position.z < b.maxZ &&
              camera.position.y < b.topY) {
            const dir = player.pos.clone().sub(camera.position).normalize();
            camera.position.addScaledVector(dir, 1.5);
          }
        }
      }
    };
    console.log('✅ Fix #7, #8 + Feature B: Камера/кристалл/лазанье');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FIX #17: carrotRootBind — бесплатные способности
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.carrotRootBind === 'function', () => {
    const _origRootBind = window.carrotRootBind;
    window.carrotRootBind = function () {
      if (!CARROT_MODE || player.isDead) return _origRootBind.apply(this, arguments);
      // Проверяем ДО вызова патча (он сбрасывает стамину и КД)
      if (player.carrotStamina < 35) {
        if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '*МАЛО СТАМИНЫ!*', '#ff2200');
        return;
      }
      if (player.carrotRootBindCd > 0) {
        if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '*КД*', '#ff2200');
        return;
      }
      return _origRootBind.apply(this, arguments);
    };
    console.log('✅ Fix #17: carrotRootBind');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FIX #21: ПЕРВАЯ АТАКА ПРИ КЛИКЕ НА "НАЧАТЬ"
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.performPrimaryAttack === 'function' && document.getElementById('game-canvas'), () => {
    let _suppress = false;
    document.addEventListener('mousedown', (e) => {
      if (e.button === 0 && document.getElementById('game-canvas') !== document.pointerLockElement) {
        _suppress = true;
        setTimeout(() => { _suppress = false; }, 150);
      }
    }, true);
    const _origPrimary = window.performPrimaryAttack;
    window.performPrimaryAttack = function () {
      if (_suppress) return;
      return _origPrimary.apply(this, arguments);
    };
    console.log('✅ Fix #21: Грейс-период первой атаки');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FIX #24: СЧЁТЧИК КОМБО НЕ ПОКАЗЫВАЕТСЯ
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.pushComboMultiplier === 'function', () => {
    const _origPushCombo = window.pushComboMultiplier;
    window.pushComboMultiplier = function () {
      const r = _origPushCombo.apply(this, arguments);
      const el = document.getElementById('ui-combo');
      if (el && player.comboMult > 1.05) {
        el.style.display = 'block';
        el.textContent = player.comboMult.toFixed(1) + 'x COMBO!';
      }
      return r;
    };
    setInterval(() => {
      const el = document.getElementById('ui-combo');
      if (el && player.comboMult <= 1.05) el.style.display = 'none';
    }, 400);
    console.log('✅ Fix #24: Combo counter');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FIX #26: EXEC PROMPT — позиционирование по врагу
  // ═══════════════════════════════════════════════════════════════════════════
  setInterval(() => {
    if (!player || !player.execTarget || !player.execTarget.group) return;
    const prompt = document.getElementById('exec-prompt');
    if (!prompt || prompt.style.display === 'none') return;
    if (typeof camera === 'undefined') return;
    const pos = player.execTarget.group.position.clone();
    pos.y += 3;
    pos.project(camera);
    if (pos.z > 1 || pos.z < -1) { prompt.style.display = 'none'; return; }
    prompt.style.left = ((pos.x * 0.5 + 0.5) * window.innerWidth) + 'px';
    prompt.style.top = ((-pos.y * 0.5 + 0.5) * window.innerHeight) + 'px';
  }, 100);
  console.log('✅ Fix #26: Exec prompt');

  // ═══════════════════════════════════════════════════════════════════════════
  // FIX #22, #23: Z-INDEX HUD
  // ═══════════════════════════════════════════════════════════════════════════
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    #hud { z-index: 50 !important; }
    #boss-hud { z-index: 26 !important; }
    #exec-prompt { z-index: 45 !important; }
  `;
  document.head.appendChild(styleEl);
  console.log('✅ Fix #22, #23: Z-index');

  // ═══════════════════════════════════════════════════════════════════════════
  // FEATURE A: Q = ПИСТОЛЕТНЫЕ ВЫСТРЕЛЫ ДЛЯ ЕГОРБАНАНА (suit 0)
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.performDevastator === 'function', () => {
    const _origDev = window.performDevastator;
    window.performDevastator = function () {
      if (player.character === 'banana' && player.suitIdx === 0
          && !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE && !window.__POTATO_MODE) {
        if (player.devastatorCd > 0) {
          if (typeof spawnComicPop === 'function')
            spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '*КД ' + player.devastatorCd.toFixed(1) + 'с*', '#ff9f1a');
          return;
        }
        player.devastatorCd = 0.55;
        const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
        const start = player.pos.clone().add(new THREE.Vector3(0, 2.2, 0));
        start.addScaledVector(fwd, 0.8);

        const bullet = new THREE.Mesh(
          new THREE.SphereGeometry(0.16, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xffee88 })
        );
        bullet.position.copy(start);
        const glow = new THREE.Mesh(
          new THREE.SphereGeometry(0.32, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.5, wireframe: true })
        );
        bullet.add(glow);
        scene.add(bullet);

        projectiles.push({
          mesh: bullet,
          vel: new THREE.Vector3(fwd.x * 130, 0, fwd.z * 130),
          life: 1.5, fromPlayer: true, dmg: 38, radius: 1.2
        });

        if (typeof SoundFX !== 'undefined') SoundFX.swing(800);
        if (typeof spawnParticles === 'function') spawnParticles(start, 0xffaa00, 4);
        player.camPitch = Math.max(-0.45, player.camPitch - 0.015);
        return;
      }
      return _origDev.apply(this, arguments);
    };
    console.log('✅ Feature A: Q = пистолет для Егорбанана');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FEATURE C, D: СКОРОСТЬ НИЖЕ + МЕНЬШЕ, НО СИЛЬНЕЕ ВРАГОВ
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof SUITS !== 'undefined', () => {
    for (let s of SUITS) {
      if (!s._origSpeed) s._origSpeed = s.speed;
      s.speed = s._origSpeed * 0.78;
    }
    if (typeof PEPPER_LEVELS !== 'undefined') {
      for (let p of PEPPER_LEVELS) {
        if (!p._origSpeed) p._origSpeed = p.speed;
        p.speed = p._origSpeed * 0.78;
      }
    }
    if (typeof CARROT_LEVELS !== 'undefined') {
      for (let p of CARROT_LEVELS) {
        if (!p._origSpeed) p._origSpeed = p.speed;
        p.speed = p._origSpeed * 0.78;
      }
    }

    // Картошка в getSuitData возвращает свежие объекты — скейлим при возврате
    if (typeof window.getSuitData === 'function') {
      const _origGetSuit = window.getSuitData;
      window.getSuitData = function () {
        const data = _origGetSuit.apply(this, arguments);
        if (window.__POTATO_MODE && data && typeof data.speed === 'number') {
          data.speed *= 0.78;
        }
        return data;
      };
    }

    const capRegular = () => {
      const cnt = enemies.filter(e => !e._isStoryConstruct && !e._isBoss && !e._isPinnacleBoss).length;
      return cnt >= 7;
    };

    const buffNew = (beforeCount, hpMul, speedMul) => {
      for (let i = beforeCount; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e._isBoss && !e._isStoryConstruct && !e._isPinnacleBoss) {
          e.hp *= hpMul; e.maxHp *= hpMul;
          e.speed = (e.speed || 12) * (speedMul || 0.85);
          if (e._baseSY) e._baseSY *= 1.2;
          if (e.group) e.group.scale.multiplyScalar(1.2);
        }
      }
    };

    // Солдаты: скипаем 50% и бафаем вдвое-втрое
    if (typeof window.spawnCitrusSoldier === 'function') {
      const _orig = window.spawnCitrusSoldier;
      window.spawnCitrusSoldier = function () {
        if (Math.random() < 0.5 || capRegular()) return;
        const before = enemies.length;
        _orig.apply(this, arguments);
        buffNew(before, 2.5, 0.85);
      };
    }

    // APC и Heli: не скипаем (нужны для сюжета), но бафаем
    if (typeof window.spawnCitrusAPC === 'function') {
      const _orig = window.spawnCitrusAPC;
      window.spawnCitrusAPC = function () {
        const before = enemies.length;
        _orig.apply(this, arguments);
        buffNew(before, 2.0, 0.85);
      };
    }
    if (typeof window.spawnCitrusHeli === 'function') {
      const _orig = window.spawnCitrusHeli;
      window.spawnCitrusHeli = function () {
        const before = enemies.length;
        _orig.apply(this, arguments);
        buffNew(before, 2.0, 0.85);
      };
    }

    // Соло-боссы — чуть медленнее
    ['spawnSoloFinalGrapestasik', 'spawnSoloFinalJirigory', 'spawnSoloBeetrootTitanGoretzka', 'spawnSoloMonolithOfSterility'].forEach(fnName => {
      if (typeof window[fnName] === 'function') {
        const _orig = window[fnName];
        window[fnName] = function () {
          const r = _orig.apply(this, arguments);
          const newest = enemies[enemies.length - 1];
          if (newest && newest._isPinnacleBoss && newest.speed) newest.speed *= 0.85;
          return r;
        };
      }
    });
    console.log('✅ Feature C, D: Скорость снижена, врагов меньше и они сильнее');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FEATURE E: ЧАСТОТА НАДПИСЕЙ ДО МИНИМУМА
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.spawnComicPop === 'function', () => {
    let _lastPop = 0;
    const _origPop = window.spawnComicPop;
    window.spawnComicPop = function (pos, text, color) {
      const now = performance.now();
      const important = /RAGE|BOSS|ФАЗА|ЭВОЛЮЦИЯ|LEVEL|УРОВЕНЬ|СИНТЕЗ|МУЛЬТИФРУКТ|ПОБЕД|ФИНАЛ|ГЛАВА|СОЛО|ВРАТА|КРИСТАЛЛ|ТЮРЬМА|СЕГМЕНТ|СПИРАЛЬ|СИНГУЛЯР|ГРОМОВ|ЗОЛОТ|АЛМАЗ|МОНОЛИТ|ГАРПУН|РЫВОК К БОССУ|ЩИТ|ПАНЦИРЬ|БУР|ТАРАН/i.test(text);
      if (important || now - _lastPop > 600) {
        _lastPop = now;
        return _origPop.call(this, pos, text, color);
      }
    };

    let _cnt = 0, _reset = 0;
    const _origDmgNum = window.spawnDamageNumber;
    window.spawnDamageNumber = function (pos, v, type) {
      const now = performance.now();
      if (now - _reset > 1000) { _cnt = 0; _reset = now; }
      if (_cnt < 6 || type === 'crit' || type === 'heal') {
        _cnt++;
        return _origDmgNum.call(this, pos, v, type);
      }
    };
    console.log('✅ Feature E: Надписи реже');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FEATURE F: ЛУЧШИЕ ПРОДЖЕКТАЙЛЫ ДЛЯ ЛИМОНА
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.lemonPlasmaShot === 'function', () => {
    window.lemonPlasmaShot = function () {
      if (player.lemonShotCd > 0) return;
      player.lemonShotCd = 0.18;
      if (typeof SoundFX !== 'undefined') SoundFX.swing(600);

      const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
      const start = player.pos.clone().add(new THREE.Vector3(0, 2.2, 0));

      const proj = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x44ffaa })
      );
      proj.position.copy(start);
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x00ff66, transparent: true, opacity: 0.5, wireframe: true })
      );
      proj.add(glow);
      scene.add(proj);

      projectiles.push({
        mesh: proj,
        vel: new THREE.Vector3(fwd.x * 110, 0, fwd.z * 110),
        life: 1.4, fromPlayer: true, dmg: 42, radius: 1.8
      });
      if (typeof spawnParticles === 'function') spawnParticles(start, 0x44ffaa, 4);
    };
    console.log('✅ Feature F: Проджектайлы Лимона');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FEATURE G: МЕНЬШЕ ЧАСТИЦ
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.spawnParticles === 'function', () => {
    const _origP = window.spawnParticles;
    window.spawnParticles = function (pos, color, count = 10) {
      return _origP.call(this, pos, color, Math.max(1, Math.floor(count * 0.4)));
    };
    const _origS = window.spawnSparks;
    if (_origS) {
      window.spawnSparks = function (pos, count = 6, color) {
        return _origS.call(this, pos, Math.max(1, Math.floor(count * 0.4)), color);
      };
    }
    console.log('✅ Feature G: Частиц меньше на 60%');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FEATURE: ПЛАВНЫЕ АНИМАЦИИ
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof PLAYER_COMBO !== 'undefined', () => {
    for (let i = 1; i < PLAYER_COMBO.length; i++) {
      if (PLAYER_COMBO[i] && PLAYER_COMBO[i].dur) {
        PLAYER_COMBO[i].dur *= 1.15;
      }
    }
    console.log('✅ Feature: Анимации плавнее (длительность +15%)');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  setTimeout(() => {
    console.log('✅ [MASTER PATCHER v1] ВСЁ ПРИМЕНЕНО');
    if (typeof showPatchToast === 'function') {
      showPatchToast('🔧 MASTER PATCHER v1', 'Все фиксы и фичи применены', '#00f2fe');
    }
  }, 3000);

})();
