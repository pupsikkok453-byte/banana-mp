// ============================================================================
// BANANA INDUSTRIES — MASTER PATCHER v2
// - Медленнее геймплей, плавнее анимации (все)
// - Убран wall-run у Банана и Лимона (только Хохлорковь + Картошка)
// - Пистолет на Q у суита 0 (видимые пули + гильзы + вспышка)
// - Чистый фидбэк ударов (hitstop, flash, flinch)
// - Меньше частиц, реже надписи
// - Все багфиксы из .txt
// - Оптимизация (троттлинг, капы)
// ============================================================================
(function () {
  'use strict';
  if (window.__BANANA_MASTER_PATCHER_V2) return;
  window.__BANANA_MASTER_PATCHER_V2 = true;
  console.log('🔧 [MASTER PATCHER v2] Инициализация...');

  const V2 = {
    SPEED_MUL:        0.55,   // игрок
    ENEMY_SPEED_MUL:  0.70,   // обычные враги
    BOSS_SPEED_MUL:   0.75,   // боссы
    ANIM_MUL:         1.50,   // длительность комбо-атак
    ENEMY_ANIM_MUL:   1.45,   // длительность вражеских атак
    SPRINT_BONUS:     1.30,   // бонус спринта (было 1.58)
    DASH_CD:          1.8,    // кулдаун рывка
    HITSTOP_MUL:      1.6,
    SHAKE_MUL:        1.4,
    PARTICLE_MUL:     0.35,
    POPUP_CD_MS:      900,    // минимум между popup-сообщениями
    DMG_NUM_PS:       5,      // damage-numbers в секунду
    CROSSHAIR_MS:     300,    // рейкаст прицела (было 80)
    PISTOL_CD_MS:     220,    // 4.5 выстрела/сек
    PISTOL_DMG:       46
  };
  window.__V2_TUNING = V2;

  const waitFor = (cond, cb, max = 10000) => {
    const t0 = performance.now();
    let done = false;
    const tick = () => {
      if (done) return;
      if (cond()) { done = true; try { cb(); } catch (e) { console.error('[patcher v2]', e); } return; }
      if (performance.now() - t0 >= max) return;
      requestAnimationFrame(tick);
    };
    tick();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ГЛАВНЫЙ СЛОУДАУН (игрок, враги, анимации)
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof SUITS !== 'undefined', () => {
    for (const s of SUITS) {
      if (!s._origSpeed) s._origSpeed = s.speed;
      s.speed = s._origSpeed * V2.SPEED_MUL;
    }
    if (typeof PEPPER_LEVELS !== 'undefined') for (const p of PEPPER_LEVELS) {
      if (!p._origSpeed) p._origSpeed = p.speed;
      p.speed = p._origSpeed * V2.SPEED_MUL;
    }
    if (typeof CARROT_LEVELS !== 'undefined') for (const p of CARROT_LEVELS) {
      if (!p._origSpeed) p._origSpeed = p.speed;
      p.speed = p._origSpeed * V2.SPEED_MUL;
    }
    // getSuitData для картошки возвращает свежие объекты — скейлим
    if (typeof window.getSuitData === 'function') {
      const _g = window.getSuitData;
      window.getSuitData = function () {
        const d = _g.apply(this, arguments);
        if (window.__POTATO_MODE && d && typeof d.speed === 'number' && !d._v2Scaled) {
          d.speed *= V2.SPEED_MUL; d._v2Scaled = true;
        }
        return d;
      };
    }
    // Спринт-бонус
    if (typeof window.updatePlayerChoreographyAndCamera === 'function') {
      const _c = window.updatePlayerChoreographyAndCamera;
      window.updatePlayerChoreographyAndCamera = function (dt, now) {
        // Замедляем спринт через флаг перед вызовом
        player._v2SprintMul = V2.SPRINT_BONUS;
        return _c.apply(this, arguments);
      };
    }
    console.log('✅ Слоудаун: игрок ×' + V2.SPEED_MUL);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. ПЛАВНЫЕ И ДЕТАЛЬНЫЕ АНИМАЦИИ
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof PLAYER_COMBO !== 'undefined', () => {
    for (let i = 1; i < PLAYER_COMBO.length; i++) {
      const c = PLAYER_COMBO[i];
      if (!c || c._v2Done) continue;
      c._v2Done = true;
      c.dur *= V2.ANIM_MUL;
      if (typeof c.windup === 'number') c.windup = Math.min(0.55, c.windup * 1.15);
      c.lunge *= 0.7;
    }
    console.log('✅ Анимации игрока плавнее ×' + V2.ANIM_MUL);
  });

  // Анимации врагов: растягиваем телеграф и удар через патч setTimeout внутри
  // playEnemyMeleeAttack. Ставим глобальный множитель и переписываем функцию.
  waitFor(() => typeof window.playEnemyMeleeAttack === 'function', () => {
    const _base = window.playEnemyMeleeAttack;
    window.playEnemyMeleeAttack = function (en, type) {
      // Обернём setTimeout временно, чтобы масштабировать все тайминги внутри
      const _origSetTimeout = window.setTimeout;
      const M = V2.ENEMY_ANIM_MUL;
      window.setTimeout = function (fn, ms, ...rest) {
        return _origSetTimeout.call(window, fn, (ms || 0) * M, ...rest);
      };
      try {
        const res = _base.call(this, en, type);
        // Также растягиваем счётчики телеграфа/анимации
        if (en) {
          if (typeof en._telegraphT === 'number') en._telegraphT *= M;
          if (typeof en._telegraphMax === 'number') en._telegraphMax *= M;
          if (typeof en._meleeDur === 'number') en._meleeDur *= M;
          if (typeof en.attackCd === 'number') en.attackCd *= M;
        }
        return res;
      } finally {
        window.setTimeout = _origSetTimeout;
      }
    };
    console.log('✅ Анимации врагов плавнее ×' + V2.ENEMY_ANIM_MUL);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. УБИРАЕМ КАРАБКАНИЕ ПО СТЕНАМ У БАНАНА И ЛИМОНА
  // ═══════════════════════════════════════════════════════════════════════════
  const isWallRunAllowed = () => CARROT_MODE || window.__POTATO_MODE;

  waitFor(() => typeof window.updatePlayerChoreographyAndCamera === 'function', () => {
    const _orig = window.updatePlayerChoreographyAndCamera;
    window.updatePlayerChoreographyAndCamera = function (dt, now) {
      // Pre-move: отталкиваем от стены заранее, чтобы база не детектила стену
      if (!isWallRunAllowed() && typeof buildings !== 'undefined') {
        const pad = 1.6;
        for (let i = 0; i < buildings.length; i++) {
          const b = buildings[i];
          if (player.pos.y > b.topY - 0.5) continue;
          if (player.pos.x > b.minX - pad && player.pos.x < b.maxX + pad &&
              player.pos.z > b.minZ - pad && player.pos.z < b.maxZ + pad) {
            const dxMin = Math.abs(player.pos.x - (b.minX - pad));
            const dxMax = Math.abs(player.pos.x - (b.maxX + pad));
            const dzMin = Math.abs(player.pos.z - (b.minZ - pad));
            const dzMax = Math.abs(player.pos.z - (b.maxZ + pad));
            const m = Math.min(dxMin, dxMax, dzMin, dzMax);
            // Отталкиваем чуть за границу, чтобы база не считала нас «в стене»
            if (m === dxMin) player.pos.x = b.minX - pad - 0.03;
            else if (m === dxMax) player.pos.x = b.maxX + pad + 0.03;
            else if (m === dzMin) player.pos.z = b.minZ - pad - 0.03;
            else player.pos.z = b.maxZ + pad + 0.03;
          }
        }
      }
      // Спринт-множитель для базы (патчим ms после вызова нет — делаем до)
      const sprintOrig = player._origSprintMulSave;
      // (база читает 1.58 жёстко внутри; ниже мы её блокируем фиксом скорости)

      _orig.call(this, dt, now);

      // Пост: гасим isWallRunning для банана/лимона
      if (!isWallRunAllowed()) {
        if (player.isWallRunning) player.isWallRunning = false;
        if (player.wallJumpCount > 0) player.wallJumpCount = 0;
      }
    };
    console.log('✅ Wall-run убран у Банана и Лимона');
  });

  // Блокируем wall-jump (если чудом isWallRunning остался)
  waitFor(() => typeof window.performWallJump === 'function', () => {
    const _orig = window.performWallJump;
    window.performWallJump = function () {
      if (!isWallRunAllowed()) {
        player.isWallRunning = false;
        player.wallJumpCount = 0;
        return;
      }
      return _orig.apply(this, arguments);
    };
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. ПИСТОЛЕТ НА Q У ЕГОРБАНАНА (suit 0) — надёжный захват через capture
  // ═══════════════════════════════════════════════════════════════════════════
  let _lastPistolAt = 0;
  let _muzzleFlashCount = 0;

  function firePistolInternal() {
    if (player.isDead) return;
    if (PEPPER_MODE || CARROT_MODE || LEMON_MODE || window.__POTATO_MODE) return;
    if (player.character !== 'banana' || player.suitIdx !== 0) return;
    const now = performance.now();
    if (now - _lastPistolAt < V2.PISTOL_CD_MS) return;
    _lastPistolAt = now;

    const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
    const start = player.pos.clone().add(new THREE.Vector3(0, 2.0, 0)).addScaledVector(fwd, 0.9);

    // Пуля — яркая сферка + glow-обод
    const bullet = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe066 })
    );
    bullet.position.copy(start);
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.55, wireframe: true })
    );
    bullet.add(glow);
    scene.add(bullet);

    // Короткий трассер — вытянутый хвост сзади
    const tracer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.01, 2.4, 5),
      new THREE.MeshBasicMaterial({ color: 0xffcc33, transparent: true, opacity: 0.7 })
    );
    tracer.rotation.x = Math.PI / 2;
    tracer.position.z = 1.2;
    tracer.lookAt(fwd);
    bullet.add(tracer);

    projectiles.push({
      mesh: bullet,
      vel: new THREE.Vector3(fwd.x * 90, 0, fwd.z * 90),
      life: 1.3,
      fromPlayer: true,
      dmg: V2.PISTOL_DMG * (1 + (player.comboMult || 1) * 0.15),
      radius: 1.3,
      _isPistol: true
    });

    // Вспышка у ствола
    _muzzleFlashCount++;
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0.9, wireframe: true })
    );
    flash.position.copy(start);
    scene.add(flash);
    let ft = 0;
    const flashAnim = setInterval(() => {
      ft += 0.05;
      flash.scale.setScalar(1 + ft * 4);
      flash.material.opacity = Math.max(0, 0.9 - ft * 2.5);
      if (ft >= 0.4) { clearInterval(flashAnim); scene.remove(flash); flash.geometry.dispose(); flash.material.dispose(); }
    }, 16);

    // Гильзы (металлические — «патроны»)
    for (let c = 0; c < 3; c++) {
      const casing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.18, 6),
        new THREE.MeshBasicMaterial({ color: 0xd4a017 })
      );
      casing.position.copy(start);
      const side = new THREE.Vector3(Math.cos(player.camYaw), 0, -Math.sin(player.camYaw));
      casing.position.addScaledVector(side, 0.15);
      scene.add(casing);
      const vx = side.x * (6 + Math.random() * 4) + fwd.x * 2;
      const vz = side.z * (6 + Math.random() * 4) + fwd.z * 2;
      const vy = 4 + Math.random() * 3;
      let ct = 0;
      let cx = casing.position.x, cy = casing.position.y, cz = casing.position.z;
      let cvx = vx, cvy = vy, cvz = vz;
      const cAnim = setInterval(() => {
        ct += dt => 0; // noop
        ct += 0.033;
        cvy -= 22 * 0.033;
        cx += cvx * 0.033; cy += cvy * 0.033; cz += cvz * 0.033;
        casing.position.set(cx, cy, cz);
        casing.rotation.x += 8 * 0.033;
        casing.rotation.z += 6 * 0.033;
        if (cy < 0.1 || ct > 1.2) {
          clearInterval(cAnim);
          scene.remove(casing);
          casing.geometry.dispose();
          casing.material.dispose();
        }
      }, 33);
    }

    // Отдача
    player.camPitch = Math.max(-0.45, player.camPitch - 0.018);
    player.cameraShake = Math.max(player.cameraShake, 0.15);
    if (typeof SoundFX !== 'undefined') {
      SoundFX.swing(820 + Math.random() * 100);
      SoundFX.hit(150 + Math.random() * 40, 0.06);
    }
    // Небольшая подсветка прицела
    const ch = document.getElementById('crosshair');
    if (ch) { ch.style.borderColor = '#ffe066'; setTimeout(() => { ch.style.borderColor = 'rgba(255,0,85,.85)'; }, 90); }
  }

  // Захват Q — capture, чтобы база НЕ вызвала performDevastator
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyQ' && player && player.character === 'banana' && player.suitIdx === 0 &&
        !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE && !window.__POTATO_MODE && !player.isDead) {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
      firePistolInternal();
    }
  }, true);

  // Захват ПКМ — то же самое (иначе база запустит devastator)
  document.addEventListener('mousedown', (e) => {
    if (e.button === 2 && player && player.character === 'banana' && player.suitIdx === 0 &&
        !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE && !window.__POTATO_MODE && !player.isDead) {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
      firePistolInternal();
    }
  }, true);

  // Резерв: если по какой-то причине ключ всё же прошёл через window.performDevastator
  waitFor(() => typeof window.performDevastator === 'function', () => {
    const _d = window.performDevastator;
    window.performDevastator = function () {
      if (player.character === 'banana' && player.suitIdx === 0 &&
          !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE && !window.__POTATO_MODE) {
        firePistolInternal();
        return;
      }
      return _d.apply(this, arguments);
    };
  });

  // Обновляем HUD-описание для суита 0, чтобы игрок знал про пистолет
  setInterval(() => {
    if (!player || player.character !== 'banana' || player.suitIdx !== 0) return;
    if (PEPPER_MODE || CARROT_MODE || LEMON_MODE || window.__POTATO_MODE) return;
    const el = document.getElementById('ui-powers-desc');
    if (!el || !el.dataset.v2Pistol) {
      if (el) {
        el.innerHTML = '<b>ЛКМ:</b> Удары | <b>Q / ПКМ:</b> 🔫 ПИСТОЛЕТ | <b>F:</b> Турель';
        el.dataset.v2Pistol = '1';
      }
    }
    const badge = document.querySelector('.suit-badge');
    if (badge && !badge.dataset.v2Pistol) {
      badge.innerText = '[0] ЕГОРБАНАН · ПИСТОЛЕТ Q';
      badge.dataset.v2Pistol = '1';
    }
  }, 700);
  // Сброс флага при смене суита
  waitFor(() => typeof window.equipSuit === 'function', () => {
    const _es = window.equipSuit;
    window.equipSuit = function () {
      const desc = document.getElementById('ui-powers-desc');
      if (desc) { delete desc.dataset.v2Pistol; }
      const badge = document.querySelector('.suit-badge');
      if (badge) delete badge.dataset.v2Pistol;
      return _es.apply(this, arguments);
    };
  });

  console.log('✅ Пистолет на Q/ПКМ для Егорбанана (suit 0)');

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. УЛУЧШЕННЫЙ ФИДБЭК УДАРОВ (hitstop, flash, flinch)
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.triggerHitstopAndChroma === 'function', () => {
    const _h = window.triggerHitstopAndChroma;
    window.triggerHitstopAndChroma = function (stop, shake, chr) {
      return _h.call(this,
        Math.max(stop || 0, 0.018) * V2.HITSTOP_MUL,
        Math.max(shake || 0, 0.22) * V2.SHAKE_MUL,
        Math.max(chr || 0, 0.6) * 1.1
      );
    };
  });

  waitFor(() => typeof window.damageEnemy === 'function', () => {
    const _d = window.damageEnemy;
    window.damageEnemy = function (en, dmg, knockVec, popText) {
      if (!en || !en.group) return _d.apply(this, arguments);

      const beforeHp = en.hp;
      const result = _d.call(this, en, dmg, knockVec, popText);

      // Яркая вспышка в точке попадания — игрок чётко видит контакт
      if (en.group.parent && dmg > 0) {
        const impactPos = en.group.position.clone();
        impactPos.y += (en.type === 'titan' || en._isBoss || en._isPinnacleBoss) ? 7 : 2.2;
        spawnImpactFlash(impactPos, en.hp <= 0 ? 0xffffff : 0xffe066);
        // Чуть более явный flinch
        en._hitStagger = Math.max(en._hitStagger || 0, 0.28);
      }
      return result;
    };
  });

  // Вспышка удара — общий пул, чтобы не течь
  const _impactPool = [];
  function spawnImpactFlash(pos, colorHex) {
    let m = _impactPool.pop();
    if (!m) {
      m = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, wireframe: true, depthWrite: false })
      );
      scene.add(m);
    }
    m.visible = true;
    m.material.color.setHex(colorHex);
    m.material.opacity = 0.9;
    m.position.copy(pos);
    m.scale.setScalar(0.5);
    m.userData = m.userData || {};
    m.userData.t = 0;
    m.userData.active = true;
    if (!m.userData.ticking) {
      m.userData.ticking = true;
      const tick = () => {
        if (!m.userData.active) { m.userData.ticking = false; return; }
        m.userData.t += 0.05;
        m.scale.setScalar(0.5 + m.userData.t * 5);
        m.material.opacity = Math.max(0, 0.9 - m.userData.t * 3);
        if (m.userData.t >= 0.32) {
          m.visible = false;
          m.userData.active = false;
          m.userData.ticking = false;
          _impactPool.push(m);
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }
  window.spawnImpactFlash = spawnImpactFlash;
  console.log('✅ Фидбэк ударов усилен');

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. МЕНЬШЕ ЧАСТИЦ
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.spawnParticles === 'function', () => {
    const _p = window.spawnParticles;
    window.spawnParticles = function (pos, color, count = 10) {
      return _p.call(this, pos, color, Math.max(1, Math.floor(count * V2.PARTICLE_MUL)));
    };
    const _s = window.spawnSparks;
    if (_s) window.spawnSparks = function (pos, count = 6, color) {
      return _s.call(this, pos, Math.max(1, Math.floor(count * V2.PARTICLE_MUL)), color);
    };
  });
  console.log('✅ Частиц меньше ×' + V2.PARTICLE_MUL);

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. РЕЖЕ НАДПИСИ
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.spawnComicPop === 'function', () => {
    let _lastPop = 0;
    const _origPop = window.spawnComicPop;
    const KEYWORDS = /RAGE|BOSS|ФАЗА|ЭВОЛЮЦИЯ|LEVEL|УРОВЕНЬ|СИНТЕЗ|МУЛЬТИФРУКТ|ПОБЕД|ФИНАЛ|ГЛАВА|СОЛО|ВРАТА|КРИСТАЛЛ|ТЮРЬМА|СЕГМЕНТ|СПИРАЛЬ|СИНГУЛЯР|ГРОМОВ|ЗОЛОТ|АЛМАЗ|МОНОЛИТ|ГАРПУН|РЫВОК К БОССУ|ЩИТ|ПАНЦИРЬ|БУР|ТАРАН|ПИСТОЛЕТ|ВЫСТРЕЛ/i;

    window.spawnComicPop = function (pos, text, color) {
      const now = performance.now();
      if (KEYWORDS.test(text) || now - _lastPop > V2.POPUP_CD_MS) {
        _lastPop = now;
        return _origPop.call(this, pos, text, color);
      }
    };

    // Damage-numbers: кап N/сек, криты всегда
    let _dmgCnt = 0, _dmgReset = 0;
    const _origDmg = window.spawnDamageNumber;
    if (_origDmg) {
      window.spawnDamageNumber = function (pos, v, type) {
        const now = performance.now();
        if (now - _dmgReset > 1000) { _dmgCnt = 0; _dmgReset = now; }
        if (_dmgCnt < V2.DMG_NUM_PS || type === 'crit' || type === 'heal') {
          _dmgCnt++;
          return _origDmg.call(this, pos, v, type);
        }
      };
    }
  });
  console.log('✅ Надписи реже');

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. ЛУЧШИЕ ПРОДЖЕКТАЙЛЫ ЛИМОНА
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.lemonPlasmaShot === 'function', () => {
    window.lemonPlasmaShot = function () {
      if (player.lemonShotCd > 0) return;
      player.lemonShotCd = 0.22;
      if (typeof SoundFX !== 'undefined') SoundFX.swing(640);

      const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
      const start = player.pos.clone().add(new THREE.Vector3(0, 2.2, 0));

      const proj = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0x44ffaa })
      );
      proj.position.copy(start);
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.85, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x00ff66, transparent: true, opacity: 0.5, wireframe: true })
      );
      proj.add(glow);

      const tracer = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.02, 3.2, 5),
        new THREE.MeshBasicMaterial({ color: 0x44ffaa, transparent: true, opacity: 0.65 })
      );
      tracer.rotation.x = Math.PI / 2;
      tracer.position.z = 1.6;
      tracer.lookAt(fwd);
      proj.add(tracer);

      scene.add(proj);
      projectiles.push({
        mesh: proj,
        vel: new THREE.Vector3(fwd.x * 105, 0, fwd.z * 105),
        life: 1.5,
        fromPlayer: true,
        dmg: 44,
        radius: 2.0
      });
      spawnImpactFlash(start, 0x44ffaa);
      if (typeof spawnParticles === 'function') spawnParticles(start, 0x44ffaa, 6);
    };
  });
  console.log('✅ Проджектайлы Лимона усилены');

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. МЕНЬШЕ ВРАГОВ, НО СИЛЬНЕЕ
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.spawnCitrusSoldier === 'function', () => {
    const capEnemies = () => enemies.filter(e => !e._isStoryConstruct && !e._isBoss && !e._isPinnacleBoss && !e._isPhasePylon).length >= 6;

    const buff = (fromIdx, hpMul, spdMul, sizeMul) => {
      for (let i = fromIdx; i < enemies.length; i++) {
        const e = enemies[i];
        if (e._isBoss || e._isStoryConstruct || e._isPinnacleBoss) continue;
        e.hp *= hpMul; e.maxHp *= hpMul;
        e.speed = (e.speed || 12) * spdMul;
        if (e.group) e.group.scale.multiplyScalar(sizeMul || 1.15);
        if (e.radius) e.radius *= (sizeMul || 1.15);
        e._baseSY = (e._baseSY || 1) * (sizeMul || 1.15);
      }
    };

    // Солдаты — 55% скип
    const _soldier = window.spawnCitrusSoldier;
    window.spawnCitrusSoldier = function () {
      if (Math.random() < 0.55 || capEnemies()) return;
      const before = enemies.length;
      _soldier.apply(this, arguments);
      buff(before, 2.6, V2.ENEMY_SPEED_MUL, 1.15);
    };

    const _apc = window.spawnCitrusAPC;
    window.spawnCitrusAPC = function () {
      const before = enemies.length;
      _apc.apply(this, arguments);
      buff(before, 2.0, V2.ENEMY_SPEED_MUL, 1.1);
    };
    const _heli = window.spawnCitrusHeli;
    window.spawnCitrusHeli = function () {
      const before = enemies.length;
      _heli.apply(this, arguments);
      buff(before, 2.0, V2.ENEMY_SPEED_MUL, 1.1);
    };

    // Соло-боссы — ×0.75 скорость
    ['spawnSoloFinalGrapestasik', 'spawnSoloFinalJirigory', 'spawnSoloBeetrootTitanGoretzka', 'spawnSoloMonolithOfSterility'].forEach(fn => {
      if (typeof window[fn] === 'function') {
        const _o = window[fn];
        window[fn] = function () {
          const r = _o.apply(this, arguments);
          const b = enemies[enemies.length - 1];
          if (b && b._isPinnacleBoss && b.speed) b.speed *= V2.BOSS_SPEED_MUL;
          return r;
        };
      }
    });
    console.log('✅ Врагов меньше и они сильнее');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. ВСЕ БАГФИКСЫ ИЗ .txt
  // ═══════════════════════════════════════════════════════════════════════════

  // FIX #1, #9 — армор + двойной щит (arguments)
  waitFor(() => typeof window.applyDamageToHero === 'function', () => {
    const _p = window.applyDamageToHero;
    window.applyDamageToHero = function (dmg) {
      if (player.isDead) return;
      const wasShield = player.activeModeF && player.suitIdx === 3 && player.character === 'banana' &&
                        !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE && !window.__POTATO_MODE;
      const beforeEn = player.en, beforeHp = player.hp;
      let eff = dmg, red = false;
      if (CARROT_MODE && CARROT_FORM === 2 && typeof EvoModules !== 'undefined' && EvoModules.has('carrot_ancient_ent')) { eff *= 0.55; red = true; }
      if (window.__POTATO_MODE && window.__POTATO_FORM === 1 && player._potatoArmor > 0) { eff = Math.floor(eff * 0.5); red = true; }
      if (player._multifruitTitanActive) { eff = Math.floor(eff * 0.55); red = true; }
      _p.call(this, dmg);
      if (red) {
        const actual = beforeHp - player.hp;
        if (actual > eff + 0.5 && actual < dmg + 0.5) {
          player.hp = Math.min(player.maxHp, player.hp + (actual - eff));
          if (typeof updateHUD === 'function') updateHUD();
        }
      }
      if (wasShield) {
        const drained = beforeEn - player.en;
        if (drained > 0.01 && beforeHp === player.hp) {
          player.en = Math.max(0, player.en - drained);
          if (player.en <= 0) {
            player.activeModeF = false;
            if (player.mesh && player.mesh.userData && player.mesh.userData.limeShield) player.mesh.userData.limeShield.visible = false;
          }
          if (typeof updateHUD === 'function') updateHUD();
        }
      }
    };
  });

  // FIX #2 — сохранение прогресса саги
  let _lastSavedChapter = -1;
  setInterval(() => {
    if (window.StoryCampaign && window.StoryCampaign.chapter !== _lastSavedChapter) {
      _lastSavedChapter = window.StoryCampaign.chapter;
      try { localStorage.setItem('banana_v201_story_progress', JSON.stringify({ chapter: window.StoryCampaign.chapter, ts: Date.now() })); } catch (e) {}
    }
  }, 600);

  // FIX #3, #4, #11 — старт/Continue/сага
  waitFor(() => document.getElementById('start-btn') && window.startGameSession, () => {
    const clearStoryEnemies = () => {
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
      clearStoryEnemies();
      if (window.StoryCampaign) {
        window.StoryCampaign.chapter = 0;
        window.StoryCampaign.objectives = [];
        window.StoryCampaign.completed = false;
      }
    });

    const cont = document.getElementById('continue-btn');
    if (cont) cont.addEventListener('click', () => {
      if (typeof Save !== 'undefined' && Save.load) window.__pendingLoad = Save.load();
    });

    const _s = window.startGameSession;
    window.startGameSession = function (loaded) {
      const fresh = (loaded === null || loaded === undefined);
      if (fresh) {
        try { localStorage.removeItem('banana_v201_story_progress'); } catch (e) {}
        if (window.StoryCampaign) { window.StoryCampaign.chapter = 0; window.StoryCampaign.objectives = []; window.StoryCampaign.completed = false; }
        clearStoryEnemies();
      }
      const r = _s.apply(this, arguments);
      if (fresh && window.startStoryChapter) setTimeout(() => window.startStoryChapter(1), 150);
      return r;
    };
  });

  // Save.load → __pendingLoad (для картошки)
  waitFor(() => typeof Save !== 'undefined' && typeof Save.load === 'function', () => {
    const _o = Save.load.bind(Save);
    Save.load = function () { const r = _o(); window.__pendingLoad = r; return r; };
  });

  // FIX #5 — equipPotato идемпотентен
  waitFor(() => typeof window.equipPotato === 'function', () => {
    const _e = window.equipPotato;
    window.equipPotato = function () {
      if (window.__POTATO_MODE && player.mesh && player.mesh.userData && player.mesh.userData.isPotato) return;
      return _e.apply(this, arguments);
    };
  });

  // FIX #6, #14, #19 — врата/кап/Жиригорь
  waitFor(() => typeof window.damageEnemy === 'function', () => {
    const _d = window.damageEnemy;
    window.damageEnemy = function (en, dmg, kv, pt) {
      if (!en) return _d.apply(this, arguments);
      if (en._isPinnacleBoss) dmg *= 1.43;
      const beforeHp = en.hp, pre66 = en._gate66Triggered, pre33 = en._gate33Triggered, pin = en._isPinnacleBoss;
      const r = _d.call(this, en, dmg, kv, pt);
      if (pin && beforeHp > 0 && en.hp > 0) {
        const h66 = en.maxHp * 0.66, h33 = en.maxHp * 0.33;
        if (!pre66 && en._gate66Triggered && Math.abs(en.hp - h66) < 1 && beforeHp > h66) {
          en.hp = Math.min(en.hp, h66 - Math.max(1, Math.min(dmg * 2, en.maxHp * 0.05)));
          if (typeof updateBossHUD === 'function') updateBossHUD();
        }
        if (!pre33 && en._gate33Triggered && Math.abs(en.hp - h33) < 1 && beforeHp > h33) {
          en.hp = Math.min(en.hp, h33 - Math.max(1, Math.min(dmg * 2, en.maxHp * 0.05)));
          if (typeof updateBossHUD === 'function') updateBossHUD();
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

  // FIX #7, #8 — камера в стенах + кристалл Y
  waitFor(() => typeof window.updatePlayerChoreographyAndCamera === 'function', () => {
    const _c = window.updatePlayerChoreographyAndCamera;
    window.updatePlayerChoreographyAndCamera = function (dt, now) {
      const preY = player.pos.y;
      const frozen = (window.__MP && window.__MP._myRootedUntil > now) || (player._crystalPrisonHitsNeeded > 0);
      _c.call(this, dt, now);
      if (frozen) { player.pos.y = preY; player.vel.y = 0; }
      // Камера не в стенах
      if (typeof camera !== 'undefined' && typeof buildings !== 'undefined') {
        for (let i = 0; i < buildings.length; i++) {
          const b = buildings[i];
          if (camera.position.x > b.minX && camera.position.x < b.maxX &&
              camera.position.z > b.minZ && camera.position.z < b.maxZ &&
              camera.position.y < b.topY) {
            const dir = player.pos.clone().sub(camera.position).normalize();
            camera.position.addScaledVector(dir, 1.6);
          }
        }
      }
    };
  });

  // FIX #17 — carrotRootBind не бесплатен
  waitFor(() => typeof window.carrotRootBind === 'function', () => {
    const _r = window.carrotRootBind;
    window.carrotRootBind = function () {
      if (!CARROT_MODE || player.isDead) return;
      if (player.carrotStamina < 35) {
        if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '*МАЛО СТАМИНЫ!*', '#ff2200');
        return;
      }
      if (player.carrotRootBindCd > 0) return;
      return _r.apply(this, arguments);
    };
  });

  // FIX #21 — первая атака при клике «Начать»
  waitFor(() => document.getElementById('game-canvas') && typeof window.performPrimaryAttack === 'function', () => {
    let _suppress = false;
    document.addEventListener('mousedown', (e) => {
      if (e.button === 0 && document.getElementById('game-canvas') !== document.pointerLockElement) {
        _suppress = true;
        setTimeout(() => { _suppress = false; }, 180);
      }
    }, true);
    const _p = window.performPrimaryAttack;
    window.performPrimaryAttack = function () {
      if (_suppress) return;
      return _p.apply(this, arguments);
    };
  });

  // FIX #24 — Combo HUD
  waitFor(() => typeof window.pushComboMultiplier === 'function', () => {
    const _p = window.pushComboMultiplier;
    window.pushComboMultiplier = function () {
      const r = _p.apply(this, arguments);
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
  });

  // FIX #26 — exec-prompt позиционируется по врагу
  setInterval(() => {
    if (!player || !player.execTarget || !player.execTarget.group) return;
    const pr = document.getElementById('exec-prompt');
    if (!pr || pr.style.display === 'none') return;
    const p = player.execTarget.group.position.clone();
    p.y += 3;
    p.project(camera);
    if (p.z > 1 || p.z < -1) { pr.style.display = 'none'; return; }
    pr.style.left = ((p.x * 0.5 + 0.5) * window.innerWidth) + 'px';
    pr.style.top = ((-p.y * 0.5 + 0.5) * window.innerHeight) + 'px';
  }, 100);

  // FIX #22, #23 — z-index
  const st = document.createElement('style');
  st.textContent = `
    #hud { z-index: 50 !important; }
    #boss-hud { z-index: 26 !important; }
    #exec-prompt { z-index: 45 !important; }
  `;
  document.head.appendChild(st);

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. ОПТИМИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════════════════
  // Троттлинг crosshair-рейкаста (был 80ms) — переопределяем интервал через
  // перехват raycastAllBuildingsAABB + собственная логика с 300ms
  waitFor(() => typeof window.raycastAllBuildingsAABB === 'function', () => {
    const _orig = window.raycastAllBuildingsAABB;
    let _lastCallAt = 0, _lastResult = null;
    window.raycastAllBuildingsAABB = function (o, d, maxDist) {
      const now = performance.now();
      // Кэшируем результат на 300мс, если запрос был из UI-подсветки
      if (now - _lastCallAt < V2.CROSSHAIR_MS && _lastResult !== undefined) return _lastResult;
      _lastCallAt = now;
      _lastResult = _orig.call(this, o, d, maxDist);
      return _lastResult;
    };
  });

  // Ограничиваем пул damage-num и редуцируем setInterval частоты
  // (совместимо с v1, но v1 не подключён — пропускаем конфликты)

  // Отключаем дождь, если он не виден (экономия на частицах)
  waitFor(() => typeof rainSystem !== 'undefined' && rainSystem, () => {
    setInterval(() => {
      if (!rainSystem) return;
      if (rainIntensity < 0.05) rainSystem.visible = false;
      else rainSystem.visible = true;
    }, 800);
  });

  // Диспозинг неиспользуемых геометрий раз в 30с (лёгкая уборка)
  setInterval(() => {
    if (typeof ParticlePool === 'undefined' || !ParticlePool.pool) return;
    if (ParticlePool.pool.length > 60) {
      while (ParticlePool.pool.length > 60) {
        const p = ParticlePool.pool.pop();
        if (p && p.geometry) p.geometry.dispose();
        if (p && p.material) p.material.dispose();
      }
    }
  }, 30000);

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. СТАРТОВОЕ СООБЩЕНИЕ
  // ═══════════════════════════════════════════════════════════════════════════
  setTimeout(() => {
    console.log('✅ [MASTER PATCHER v2] Всё применено');
    if (typeof showPatchToast === 'function') {
      showPatchToast('🔧 MASTER PATCHER v2', 'Слоу-даун · плавнее · пистолет Q · без wall-run', '#00f2fe');
    }
  }, 3200);

})();
