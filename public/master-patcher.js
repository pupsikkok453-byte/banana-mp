// ============================================================================
// BANANA INDUSTRIES — MASTER PATCHER v4
// Ключевые изменения от v3:
//  • Hitstop на обычных ударах ≈0, на критах ≈24мс (БОЛЬШЕ НЕТ ФРИЗА НА КИЛЛАХ)
//  • Скорость игрока ×0.82 (было ×0.55), врагов ×0.88 (было ×0.70)
//  • Пистолет ×2 размер + glow-outline, железная привязка
//  • Impact pulses: один RAF-цикл вместо N RAF'ов
//  • Пули: один тикер
// ============================================================================
(function () {
  'use strict';
  if (window.__BANANA_MASTER_PATCHER_V4) return;
  window.__BANANA_MASTER_PATCHER_V4 = true;
  console.log('🔧 [MASTER PATCHER v4] Инициализация...');

  const V4 = {
    SPEED_MUL:        0.82,   // ⬆ было 0.55 — теперь не ползём
    ENEMY_SPEED_MUL:  0.88,   // ⬆ было 0.70
    BOSS_SPEED_MUL:   0.88,   // ⬆ было 0.75
    ANIM_EXT_MUL:     1.60,   // оставляем (жалобы были только на движение)
    LMB_MIN_CD_MS:    480,    // оставляем
    HITSTOP_CRIT:     0.024,  // ⬇ было 0.065 — только криты получают стоп
    HITSTOP_NORMAL:   0.002,  // обычные удары — почти 0
    PARTICLE_MUL:     0.35,
    POPUP_CD_MS:      1000,
    DMG_NUM_PS:       5,
    PISTOL_CD_MS:     230,
    PISTOL_DMG:       46,
    PISTOL_RADIUS:    1.4,
    CROSSHAIR_MS:     320,
    MAX_IMPACTS_PS:   10
  };
  window.__V4_TUNING = V4;

  // ─── Безопасные геттеры ─────────────────────────────────────────────────
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
      if (ok) { done = true; try { cb(); } catch (e) { console.error('[patcher v4]', e); } return; }
      if (performance.now() - t0 >= max) return;
      requestAnimationFrame(tick);
    };
    tick();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. СКОРОСТЬ — ВОЗВРАЩАЕМ НОРМАЛЬНЫЙ ТЕМП
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.getSuitData === 'function', () => {
    const _g = window.getSuitData;
    window.getSuitData = function () {
      const d = _g.apply(this, arguments);
      if (d && typeof d.speed === 'number') {
        // Восстанавливаем оригинал, даже если v3 уже записал _v3OrigSpeed
        const orig = d._v3OrigSpeed || d._v4OrigSpeed || d.speed;
        d._v4OrigSpeed = orig;
        d.speed = orig * V4.SPEED_MUL;
      }
      return d;
    };
    ['pepperStats', 'carrotStats'].forEach(fn => {
      if (typeof window[fn] !== 'function') return;
      const _s = window[fn];
      window[fn] = function () {
        const d = _s.apply(this, arguments);
        if (d && typeof d.speed === 'number') {
          const orig = d._v3OrigSpeed || d._v4OrigSpeed || d.speed;
          d._v4OrigSpeed = orig;
          d.speed = orig * V4.SPEED_MUL;
        }
        return d;
      };
    });
    console.log('✅ Скорость игрока ×' + V4.SPEED_MUL);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. HITSTOP — ГЛАВНЫЙ ФИКС (больше не стопит кадр на киллах)
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.triggerHitstopAndChroma === 'function', () => {
    const _h = window.triggerHitstopAndChroma;
    window.triggerHitstopAndChroma = function (stop, shake, chr) {
      const P = getPlayer();
      if (P) {
        const s = stop || 0;
        if (s < 0.015) {
          // ОБЫЧНЫЙ УДАР / КИЛЛ — почти без стопа (2мс = доля кадра)
          P.hitStop = Math.max(P.hitStop || 0, V4.HITSTOP_NORMAL);
        } else if (s < 0.05) {
          // КРИТ — короткий отзывчивый стоп (~1.5 кадра)
          P.hitStop = Math.max(P.hitStop || 0, Math.min(V4.HITSTOP_CRIT, s * 1.3));
        }
        // s >= 0.05 (девастатор/способности) — база сама решит, не душим
        P.cameraShake = Math.max(P.cameraShake || 0, 0.18);
      }
      // Не форсим минимум! База сама выставит свою величину
      if (_h) _h.call(this, stop, shake, chr);
    };
    console.log('✅ Hitstop исправлен (криты 24мс, обычные 2мс)');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. IMPACT PULSES — ОДИН RAF-ЦИКЛ (было N RAF'ов = фризы на AOE)
  // ═══════════════════════════════════════════════════════════════════════════
  const _impactPool = [];
  const _activeImpacts = [];
  let _lastImpactMs = 0;

  function getImpactMesh(scene) {
    let m = _impactPool.pop();
    if (!m) {
      m = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, wireframe: true, depthWrite: false })
      );
      scene.add(m);
    }
    return m;
  }

  function spawnImpactPulse(pos, colorHex) {
    const now = performance.now();
    if (now - _lastImpactMs < 1000 / V4.MAX_IMPACTS_PS) return;
    _lastImpactMs = now;
    const scene = getScene();
    if (!scene) return;
    const m = getImpactMesh(scene);
    m.visible = true;
    m.material.color.setHex(colorHex);
    m.material.opacity = 0.9;
    m.position.copy(pos);
    m.scale.setScalar(0.4);
    _activeImpacts.push({ mesh: m, t0: now });
  }

  function tickImpacts() {
    requestAnimationFrame(tickImpacts);
    const now = performance.now();
    for (let i = _activeImpacts.length - 1; i >= 0; i--) {
      const imp = _activeImpacts[i];
      const t = (now - imp.t0) / 320;
      if (t >= 1) {
        imp.mesh.visible = false;
        _impactPool.push(imp.mesh);
        _activeImpacts.splice(i, 1);
        continue;
      }
      imp.mesh.scale.setScalar(0.4 + t * 4.5);
      imp.mesh.material.opacity = 0.9 * (1 - t);
    }
  }
  tickImpacts();

  waitFor(() => typeof window.damageEnemy === 'function', () => {
    const _d = window.damageEnemy;
    window.damageEnemy = function (en, dmg, kv, pt) {
      const bHp = en && en.hp;
      const r = _d.call(this, en, dmg, kv, pt);
      if (en && en.group && dmg > 0) {
        const pos = en.group.position.clone();
        pos.y += (en.type === 'titan' || en._isBoss || en._isPinnacleBoss) ? 7 : 2.2;
        spawnImpactPulse(pos, (en.hp <= 0) ? 0xffffff : 0xffe066);
        en._hitStagger = Math.max(en._hitStagger || 0, 0.28);
      }
      return r;
    };
    console.log('✅ Impact pulses (единый цикл)');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. ПИСТОЛЕТ + УЛУЧШЕННАЯ МОДЕЛЬ (крупнее, glow, железная привязка)
  // ═══════════════════════════════════════════════════════════════════════════
  const myBullets = [];
  let _lastPistolAt = 0;
  let _bulletTickerStarted = false;

  function buildPistolMesh() {
    const g = new THREE.Group();
    const darkMat  = new THREE.MeshBasicMaterial({ color: 0x15151a });
    const metalMat = new THREE.MeshBasicMaterial({ color: 0x6a6a76 });
    const goldMat  = new THREE.MeshBasicMaterial({ color: 0xd4a017 });
    const glowMat  = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.55, wireframe: true });

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.42, 0.16), darkMat);
    grip.position.set(0, -0.18, 0.02);
    grip.rotation.x = 0.32;
    g.add(grip);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.20, 0.54), metalMat);
    frame.position.set(0, 0.06, 0.16);
    g.add(frame);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.42, 8), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.10, 0.56);
    g.add(barrel);

    const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 6, 12), goldMat);
    muzzle.position.set(0, 0.10, 0.78);
    g.add(muzzle);

    const tg = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 4, 10, Math.PI), goldMat);
    tg.rotation.y = Math.PI / 2;
    tg.rotation.z = Math.PI;
    tg.position.set(0, -0.06, 0.08);
    g.add(tg);

    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.08), darkMat);
    sight.position.set(0, 0.19, 0.06);
    g.add(sight);

    // Свечение — гарантирует видимость в любых условиях
    const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 6, 14), glowMat);
    glowRing.position.set(0, 0.10, 0.60);
    g.add(glowRing);

    const glowBody = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.60), glowMat);
    glowBody.position.set(0, 0.06, 0.16);
    g.add(glowBody);

    // УВЕЛИЧЕН В ×2 ДЛЯ ВИДИМОСТИ
    g.scale.setScalar(2.0);
    g.rotation.x = Math.PI / 2;
    g.position.set(0, -0.15, 0.05);
    return g;
  }

  function attachPistol() {
    const P = getPlayer();
    if (!P || !P.mesh || !P.mesh.userData) return;
    const ud = P.mesh.userData;
    if (!ud.armR || !ud.armR.wrist) return;
    if (typeof THREE === 'undefined') return;

    if (ud._v4PistolMesh) {
      if (ud._v4PistolMesh.parent) ud._v4PistolMesh.parent.remove(ud._v4PistolMesh);
      ud._v4PistolMesh = null;
    }
    if (P.character !== 'banana' || P.suitIdx !== 0) return;

    const pistol = buildPistolMesh();
    ud.armR.wrist.add(pistol);
    ud._v4PistolMesh = pistol;
    ud._v4PistolMuzzleLocal = new THREE.Vector3(0, 0.10, 0.80);
    console.log('🔫 Пистолет прикреплён');
  }

  waitFor(() => typeof window.rebuildHeroMesh === 'function', () => {
    const _r = window.rebuildHeroMesh;
    window.rebuildHeroMesh = function () {
      const res = _r.apply(this, arguments);
      setTimeout(attachPistol, 40);
      return res;
    };
    setTimeout(attachPistol, 500);
    setInterval(() => {
      const P = getPlayer();
      if (!P || !P.mesh || !P.mesh.userData) return;
      const ud = P.mesh.userData;
      if (!ud.armR || !ud.armR.wrist) return;
      const shouldHave = P.character === 'banana' && P.suitIdx === 0;
      if (shouldHave && !ud._v4PistolMesh) attachPistol();
      else if (!shouldHave && ud._v4PistolMesh) attachPistol();
    }, 700);
  });

  function getPistolMuzzleWorldPos() {
    const P = getPlayer();
    if (!P || !P.mesh || !P.mesh.userData) return null;
    const ud = P.mesh.userData;
    if (!ud._v4PistolMesh || !ud._v4PistolMuzzleLocal) return null;
    const v = ud._v4PistolMuzzleLocal.clone();
    ud._v4PistolMesh.localToWorld(v);
    return v;
  }

  function firePistolInternal() {
    const P = getPlayer();
    const scene = getScene();
    if (!P || !scene || P.isDead) return;
    if (P.character !== 'banana' || P.suitIdx !== 0) return;
    if (isPepper() || isCarrot() || isLemon() || isPotato()) return;

    const now = performance.now();
    if (now - _lastPistolAt < V4.PISTOL_CD_MS) return;
    _lastPistolAt = now;

    const fwd = new THREE.Vector3(-Math.sin(P.camYaw), 0, -Math.cos(P.camYaw));
    let start = getPistolMuzzleWorldPos();
    if (!start) start = P.pos.clone().add(new THREE.Vector3(0, 2.0, 0)).addScaledVector(fwd, 0.9);

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

    const tracer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.01, 2.2, 5),
      new THREE.MeshBasicMaterial({ color: 0xffcc33, transparent: true, opacity: 0.75 })
    );
    tracer.rotation.x = Math.PI / 2;
    tracer.position.z = 1.1;
    bullet.add(tracer);
    scene.add(bullet);

    myBullets.push({
      mesh: bullet,
      vel: new THREE.Vector3(fwd.x * 95, 0, fwd.z * 95),
      life: 1.3,
      dmg: V4.PISTOL_DMG * (1 + (P.comboMult || 1) * 0.15),
      radius: V4.PISTOL_RADIUS
    });

    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0.9, wireframe: true })
    );
    flash.position.copy(start);
    scene.add(flash);
    let ft = 0;
    const fa = setInterval(() => {
      ft += 0.05;
      flash.scale.setScalar(1 + ft * 4);
      flash.material.opacity = Math.max(0, 0.9 - ft * 2.6);
      if (ft >= 0.35) { clearInterval(fa); scene.remove(flash); flash.geometry.dispose(); flash.material.dispose(); }
    }, 16);

    // Гильзы
    for (let c = 0; c < 3; c++) {
      const casing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.17, 6),
        new THREE.MeshBasicMaterial({ color: 0xd4a017 })
      );
      casing.position.copy(start);
      scene.add(casing);
      const side = new THREE.Vector3(Math.cos(P.camYaw), 0, -Math.sin(P.camYaw));
      const vx = side.x * (6 + Math.random() * 5) + fwd.x * 2;
      const vz = side.z * (6 + Math.random() * 5) + fwd.z * 2;
      let vy = 5 + Math.random() * 3;
      let cx = casing.position.x, cy = casing.position.y, cz = casing.position.z;
      let cvx = vx, cvy = vy, cvz = vz;
      let ct = 0;
      const ca = setInterval(() => {
        ct += 0.033;
        cvy -= 22 * 0.033;
        cx += cvx * 0.033; cy += cvy * 0.033; cz += cvz * 0.033;
        casing.position.set(cx, cy, cz);
        casing.rotation.x += 8 * 0.033;
        casing.rotation.z += 6 * 0.033;
        if (cy < 0.1 || ct > 1.2) {
          clearInterval(ca);
          scene.remove(casing);
          casing.geometry.dispose();
          casing.material.dispose();
        }
      }, 33);
    }

    P.camPitch = Math.max(-0.45, P.camPitch - 0.015);
    P.cameraShake = Math.max(P.cameraShake || 0, 0.16);

    try { if (window.SoundFX) window.SoundFX.swing(820 + Math.random() * 100); } catch (e) {}

    const ch = document.getElementById('crosshair');
    if (ch) {
      ch.style.borderColor = '#ffe066';
      setTimeout(() => { if (ch) ch.style.borderColor = 'rgba(255,0,85,.85)'; }, 90);
    }
  }

  window.addEventListener('keydown', (e) => {
    const P = getPlayer(); if (!P) return;
    if (e.code !== 'KeyQ') return;
    if (P.character !== 'banana' || P.suitIdx !== 0) return;
    if (isPepper() || isCarrot() || isLemon() || isPotato()) return;
    if (P.isDead) return;
    e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
    firePistolInternal();
  }, true);

  document.addEventListener('mousedown', (e) => {
    const P = getPlayer(); if (!P) return;
    if (e.button !== 2) return;
    if (P.character !== 'banana' || P.suitIdx !== 0) return;
    if (isPepper() || isCarrot() || isLemon() || isPotato()) return;
    if (P.isDead) return;
    e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
    firePistolInternal();
  }, true);

  waitFor(() => typeof window.performDevastator === 'function', () => {
    const _d = window.performDevastator;
    window.performDevastator = function () {
      const P = getPlayer();
      if (P && P.character === 'banana' && P.suitIdx === 0 &&
          !isPepper() && !isCarrot() && !isLemon() && !isPotato()) {
        firePistolInternal();
        return;
      }
      return _d.apply(this, arguments);
    };
  });

  // HUD-надписи
  setInterval(() => {
    const P = getPlayer();
    if (!P || P.character !== 'banana' || P.suitIdx !== 0) return;
    if (isPepper() || isCarrot() || isLemon() || isPotato()) return;
    const el = document.getElementById('ui-powers-desc');
    if (el && !el.dataset.v4Pistol) {
      el.innerHTML = '<b>ЛКМ:</b> Удары | <b>Q / ПКМ:</b> 🔫 ПИСТОЛЕТ | <b>F:</b> Турель | <b>G:</b> Ракета';
      el.dataset.v4Pistol = '1';
    }
    const badge = document.querySelector('.suit-badge');
    if (badge && !badge.dataset.v4Pistol) {
      badge.innerText = '[0] ЕГОРБАНАН · ПИСТОЛЕТ [Q]';
      badge.dataset.v4Pistol = '1';
    }
    const slot = document.getElementById('slot-0');
    if (slot) {
      const sub = slot.querySelector('.slot-sub');
      if (sub && sub.textContent !== '[Q] ПИСТОЛЕТ · [F] ТУРЕЛЬ') sub.textContent = '[Q] ПИСТОЛЕТ · [F] ТУРЕЛЬ';
    }
  }, 700);

  waitFor(() => typeof window.equipSuit === 'function', () => {
    const _e = window.equipSuit;
    window.equipSuit = function () {
      const desc = document.getElementById('ui-powers-desc');
      if (desc) delete desc.dataset.v4Pistol;
      const badge = document.querySelector('.suit-badge');
      if (badge) delete badge.dataset.v4Pistol;
      const r = _e.apply(this, arguments);
      setTimeout(attachPistol, 40);
      return r;
    };
  });

  // Обновление своих пуль — единый тикер
  function updateMyBullets(dt) {
    const enemies = getEnemies();
    const scene = getScene();
    for (let i = myBullets.length - 1; i >= 0; i--) {
      const b = myBullets[i];
      b.mesh.position.x += b.vel.x * dt;
      b.mesh.position.y += b.vel.y * dt;
      b.mesh.position.z += b.vel.z * dt;
      b.life -= dt;

      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (!e || !e.group) continue;
        const dx = b.mesh.position.x - e.group.position.x;
        const dy = b.mesh.position.y - (e.group.position.y + 1.5);
        const dz = b.mesh.position.z - e.group.position.z;
        const r = (e.radius || 1.2) + b.radius;
        if (dx * dx + dy * dy + dz * dz <= r * r) {
          if (typeof window.damageEnemy === 'function') window.damageEnemy(e, b.dmg, b.vel.clone().normalize(), '*БАЦ!*');
          b.life = 0;
          break;
        }
      }

      if (b.life <= 0) {
        scene.remove(b.mesh);
        b.mesh.traverse(o => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) o.material.dispose();
        });
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
    _bulletTickerStarted = true;
  });

  // Fallback — только если основной хук не установлен
  setTimeout(() => {
    if (_bulletTickerStarted) return;
    let _lt = performance.now();
    setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - _lt) / 1000);
      _lt = now;
      if (myBullets.length > 0) updateMyBullets(dt);
    }, 16);
  }, 1500);

  console.log('✅ Пистолет + модель + свой тикер пуль');

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. LMB-АТАКИ (замедлены — по прошлой жалобе, оставляем)
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.performPrimaryAttack === 'function' && getPlayer(), () => {
    const _orig = window.performPrimaryAttack;
    let _lastLMB = 0;
    window.performPrimaryAttack = function () {
      const P = getPlayer();
      if (!P) return _orig.apply(this, arguments);
      const now = performance.now();
      if (now - _lastLMB < V4.LMB_MIN_CD_MS) return;
      const bt = P.attackTimer;
      const r = _orig.apply(this, arguments);
      if (P.attackTimer > bt && P.attackTimer > 0.1) {
        _lastLMB = now;
        P.attackDuration *= V4.ANIM_EXT_MUL;
        P.attackTimer *= V4.ANIM_EXT_MUL;
      }
      return r;
    };
  });

  // Плавные вражеские атаки
  waitFor(() => typeof window.playEnemyMeleeAttack === 'function', () => {
    const _b = window.playEnemyMeleeAttack;
    const M = 1.45;
    window.playEnemyMeleeAttack = function (en, type) {
      const _st = window.setTimeout;
      window.setTimeout = function (fn, ms, ...rest) {
        return _st.call(window, fn, (ms || 0) * M, ...rest);
      };
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
  // 6. WALL-RUN ЗАПРЕТ (Банан + Лимон)
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.updatePlayerChoreographyAndCamera === 'function' && getPlayer(), () => {
    const _c = window.updatePlayerChoreographyAndCamera;
    const B = () => (typeof buildings !== 'undefined' && buildings) || window.buildings || [];

    window.updatePlayerChoreographyAndCamera = function (dt, now) {
      const P = getPlayer();
      if (!P) return _c.apply(this, arguments);

      // PRE-push
      if (!allowWallRun()) {
        const blds = B(), PRE = 2.2;
        for (let i = 0; i < blds.length; i++) {
          const b = blds[i];
          if (P.pos.y > b.topY - 0.3) continue;
          if (P.pos.x > b.minX - PRE && P.pos.x < b.maxX + PRE &&
              P.pos.z > b.minZ - PRE && P.pos.z < b.maxZ + PRE) {
            const dL = P.pos.x - (b.minX - PRE), dR = (b.maxX + PRE) - P.pos.x;
            const dB = P.pos.z - (b.minZ - PRE), dF = (b.maxZ + PRE) - P.pos.z;
            const m = Math.min(dL, dR, dB, dF);
            if (m === dL) P.pos.x = b.minX - PRE - 0.02;
            else if (m === dR) P.pos.x = b.maxX + PRE + 0.02;
            else if (m === dB) P.pos.z = b.minZ - PRE - 0.02;
            else P.pos.z = b.maxZ + PRE + 0.02;
          }
        }
      }

      const preY = P.pos.y;
      const frozen = (window.__MP && window.__MP._myRootedUntil > now) || (P._crystalPrisonHitsNeeded > 0);

      _c.call(this, dt, now);

      // POST: откат wall-run
      if (!allowWallRun() && P.isWallRunning) {
        P.pos.y = Math.max(0, P.pos.y - ((P.vel.y || 0) * dt));
        P.vel.y = Math.min(P.vel.y, -1);
        P.isWallRunning = false;
        P.wallJumpCount = 0;
        const blds = B(), POST = 1.6;
        for (let i = 0; i < blds.length; i++) {
          const b = blds[i];
          if (P.pos.y > b.topY) continue;
          if (P.pos.x > b.minX - POST && P.pos.x < b.maxX + POST &&
              P.pos.z > b.minZ - POST && P.pos.z < b.maxZ + POST) {
            const dL = P.pos.x - (b.minX - POST), dR = (b.maxX + POST) - P.pos.x;
            const dB = P.pos.z - (b.minZ - POST), dF = (b.maxZ + POST) - P.pos.z;
            const m = Math.min(dL, dR, dB, dF);
            if (m === dL) P.pos.x = b.minX - POST - 0.03;
            else if (m === dR) P.pos.x = b.maxX + POST + 0.03;
            else if (m === dB) P.pos.z = b.minZ - POST - 0.03;
            else P.pos.z = b.maxZ + POST + 0.03;
          }
        }
        if (typeof window.playerGroup !== 'undefined' && window.playerGroup) window.playerGroup.position.copy(P.pos);
      }

      // Fix #8: кристалл Y
      if (frozen) { P.pos.y = preY; P.vel.y = 0; }

      // Fix #7: камера в стенах
      const cam = getCamera();
      if (cam) {
        const blds = B();
        for (let i = 0; i < blds.length; i++) {
          const b = blds[i];
          if (cam.position.x > b.minX && cam.position.x < b.maxX &&
              cam.position.z > b.minZ && cam.position.z < b.maxZ &&
              cam.position.y < b.topY) {
            const dir = P.pos.clone().sub(cam.position).normalize();
            cam.position.addScaledVector(dir, 1.6);
          }
        }
      }
    };

    const _wj = window.performWallJump;
    if (typeof _wj === 'function') {
      window.performWallJump = function () {
        if (!allowWallRun()) {
          const P = getPlayer();
          if (P) { P.isWallRunning = false; P.wallJumpCount = 0; }
          return;
        }
        return _wj.apply(this, arguments);
      };
    }
    console.log('✅ Wall-run убран у Банана/Лимона');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. ЧАСТИЦЫ ×0.35 + НАДПИСИ РЕЖЕ
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.spawnParticles === 'function', () => {
    const _p = window.spawnParticles;
    window.spawnParticles = function (pos, color, count) {
      return _p.call(this, pos, color, Math.max(1, Math.floor((count || 10) * V4.PARTICLE_MUL)));
    };
    if (typeof window.spawnSparks === 'function') {
      const _s = window.spawnSparks;
      window.spawnSparks = function (pos, count, color) {
        return _s.call(this, pos, Math.max(1, Math.floor((count || 6) * V4.PARTICLE_MUL)), color);
      };
    }
  });

  waitFor(() => typeof window.spawnComicPop === 'function', () => {
    const _o = window.spawnComicPop;
    let _last = 0;
    const KEY = /RAGE|BOSS|ФАЗА|ЭВОЛЮЦИЯ|LEVEL|УРОВЕНЬ|СИНТЕЗ|МУЛЬТИФРУКТ|ПОБЕД|ФИНАЛ|ГЛАВА|СОЛО|ВРАТА|КРИСТАЛЛ|ТЮРЬМА|СЕГМЕНТ|СПИРАЛЬ|СИНГУЛЯР|ГРОМОВ|ЗОЛОТ|АЛМАЗ|МОНОЛИТ|ГАРПУН|РЫВОК К БОССУ|ЩИТ|ПАНЦИРЬ|БУР|ТАРАН/i;
    window.spawnComicPop = function (pos, text, color) {
      const now = performance.now();
      if (KEY.test(text) || now - _last > V4.POPUP_CD_MS) {
        _last = now;
        return _o.call(this, pos, text, color);
      }
    };
    if (typeof window.spawnDamageNumber === 'function') {
      const _d = window.spawnDamageNumber;
      let cnt = 0, reset = 0;
      window.spawnDamageNumber = function (pos, v, type) {
        const now = performance.now();
        if (now - reset > 1000) { cnt = 0; reset = now; }
        if (cnt < V4.DMG_NUM_PS || type === 'crit' || type === 'heal') {
          cnt++;
          return _d.call(this, pos, v, type);
        }
      };
    }
  });
  console.log('✅ Частицы ×' + V4.PARTICLE_MUL + ' · надписи реже');

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. ВРАГИ — МЕНЬШЕ, НО СИЛЬНЕЕ (скорость 0.88)
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.spawnCitrusSoldier === 'function', () => {
    const cap = () => getEnemies().filter(e => !e._isStoryConstruct && !e._isBoss && !e._isPinnacleBoss && !e._isPhasePylon).length >= 6;

    const buffNew = (fromIdx, hpMul, spdMul, sizeMul) => {
      const es = getEnemies();
      for (let i = fromIdx; i < es.length; i++) {
        const e = es[i];
        if (!e || e._isBoss || e._isStoryConstruct || e._isPinnacleBoss) continue;
        // Реставрируем базу, если v3 уже записал
        const baseHp = e._v4BaseHp || (e._v4BaseHp = e.maxHp);
        const baseSpd = e._v4BaseSpd || (e._v4BaseSpd = e.speed || 12);
        e.hp = baseHp * hpMul; e.maxHp = baseHp * hpMul;
        e.speed = baseSpd * spdMul;
        if (e.group) e.group.scale.multiplyScalar(sizeMul || 1.15);
        if (e.radius) e.radius *= (sizeMul || 1.15);
        e._baseSY = (e._baseSY || 1) * (sizeMul || 1.15);
      }
    };

    const _s = window.spawnCitrusSoldier;
    window.spawnCitrusSoldier = function () {
      if (Math.random() < 0.55 || cap()) return;
      const before = getEnemies().length;
      _s.apply(this, arguments);
      buffNew(before, 2.6, V4.ENEMY_SPEED_MUL, 1.15);
    };

    const _a = window.spawnCitrusAPC;
    if (_a) window.spawnCitrusAPC = function () {
      const before = getEnemies().length;
      _a.apply(this, arguments);
      buffNew(before, 2.0, V4.ENEMY_SPEED_MUL, 1.10);
    };
    const _h = window.spawnCitrusHeli;
    if (_h) window.spawnCitrusHeli = function () {
      const before = getEnemies().length;
      _h.apply(this, arguments);
      buffNew(before, 2.0, V4.ENEMY_SPEED_MUL, 1.10);
    };

    ['spawnSoloFinalGrapestasik', 'spawnSoloFinalJirigory', 'spawnSoloBeetrootTitanGoretzka', 'spawnSoloMonolithOfSterility'].forEach(fn => {
      if (typeof window[fn] !== 'function') return;
      const _o = window[fn];
      window[fn] = function () {
        const r = _o.apply(this, arguments);
        const es = getEnemies();
        const b = es[es.length - 1];
        if (b && b._isPinnacleBoss && b.speed) b.speed *= V4.BOSS_SPEED_MUL;
        return r;
      };
    });
    console.log('✅ Враги: скорость ×' + V4.ENEMY_SPEED_MUL);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. ПРОДЖЕКТАЙЛЫ ЛИМОНА
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.lemonPlasmaShot === 'function' && getPlayer() && getScene(), () => {
    window.lemonPlasmaShot = function () {
      const P = getPlayer(); const scene = getScene();
      if (!P || !scene || P.lemonShotCd > 0) return;
      P.lemonShotCd = 0.22;
      try { if (window.SoundFX) window.SoundFX.swing(640); } catch (e) {}
      const fwd = new THREE.Vector3(-Math.sin(P.camYaw), 0, -Math.cos(P.camYaw));
      const start = P.pos.clone().add(new THREE.Vector3(0, 2.2, 0));
      const proj = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0x44ffaa })
      );
      proj.position.copy(start);
      proj.add(new THREE.Mesh(
        new THREE.SphereGeometry(0.85, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x00ff66, transparent: true, opacity: 0.5, wireframe: true })
      ));
      const tracer = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.02, 3.0, 5),
        new THREE.MeshBasicMaterial({ color: 0x44ffaa, transparent: true, opacity: 0.65 })
      );
      tracer.rotation.x = Math.PI / 2; tracer.position.z = 1.5;
      proj.add(tracer);
      scene.add(proj);
      myBullets.push({
        mesh: proj,
        vel: new THREE.Vector3(fwd.x * 105, 0, fwd.z * 105),
        life: 1.5, dmg: 44, radius: 2.0
      });
    };
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. БАГФИКСЫ ИЗ .txt (все сохранены)
  // ═══════════════════════════════════════════════════════════════════════════

  // FIX #1, #9 — арморы + двойной щит
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
            typeof window.__EVO_MODULES !== 'undefined' && window.__EVO_MODULES.has('carrot_ancient_ent')) {
          eff *= 0.55; red = true;
        }
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

  // FIX #2 — сохранение саги
  let _lastSaved = -1;
  setInterval(() => {
    if (window.StoryCampaign && window.StoryCampaign.chapter !== _lastSaved) {
      _lastSaved = window.StoryCampaign.chapter;
      try { localStorage.setItem('banana_v201_story_progress', JSON.stringify({ chapter: window.StoryCampaign.chapter, ts: Date.now() })); } catch (e) {}
    }
  }, 600);

  // FIX #3, #4, #11
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
      return r;
    };
  });

  // FIX #5
  waitFor(() => typeof window.equipPotato === 'function', () => {
    const _e = window.equipPotato;
    window.equipPotato = function () {
      const P = getPlayer();
      if (isPotato() && P && P.mesh && P.mesh.userData && P.mesh.userData.isPotato) return;
      return _e.apply(this, arguments);
    };
  });

  // FIX #6, #14, #19
  waitFor(() => typeof window.damageEnemy === 'function', () => {
    const _d = window.damageEnemy;
    window.damageEnemy = function (en, dmg, kv, pt) {
      if (!en) return _d.apply(this, arguments);
      if (en._isPinnacleBoss) dmg *= 1.43;
      const bHp = en.hp, p66 = en._gate66Triggered, p33 = en._gate33Triggered, pin = en._isPinnacleBoss;
      const r = _d.call(this, en, dmg, kv, pt);
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

  // FIX #17
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

  // FIX #21
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

  // FIX #24
  waitFor(() => typeof window.pushComboMultiplier === 'function' && getPlayer(), () => {
    const _p = window.pushComboMultiplier;
    window.pushComboMultiplier = function () {
      const r = _p.apply(this, arguments);
      const P = getPlayer(), el = document.getElementById('ui-combo');
      if (el && P && P.comboMult > 1.05) {
        el.style.display = 'block';
        el.textContent = P.comboMult.toFixed(1) + 'x COMBO!';
      }
      return r;
    };
    setInterval(() => {
      const P = getPlayer(), el = document.getElementById('ui-combo');
      if (el && P && P.comboMult <= 1.05) el.style.display = 'none';
    }, 400);
  });

  // FIX #26
  setInterval(() => {
    const P = getPlayer(); if (!P || !P.execTarget || !P.execTarget.group) return;
    const pr = document.getElementById('exec-prompt'); if (!pr || pr.style.display === 'none') return;
    const cam = getCamera(); if (!cam) return;
    const pos = P.execTarget.group.position.clone(); pos.y += 3; pos.project(cam);
    if (pos.z > 1 || pos.z < -1) { pr.style.display = 'none'; return; }
    pr.style.left = ((pos.x * 0.5 + 0.5) * window.innerWidth) + 'px';
    pr.style.top = ((-pos.y * 0.5 + 0.5) * window.innerHeight) + 'px';
  }, 100);

  // FIX #22, #23
  const st = document.createElement('style');
  st.textContent = `#hud{z-index:50!important}#boss-hud{z-index:26!important}#exec-prompt{z-index:45!important}`;
  document.head.appendChild(st);

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. ОПТИМИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.raycastAllBuildingsAABB === 'function', () => {
    const _o = window.raycastAllBuildingsAABB;
    let lastAt = 0, lastRes = null;
    window.raycastAllBuildingsAABB = function (o, d, m) {
      const now = performance.now();
      if (now - lastAt < V4.CROSSHAIR_MS) return lastRes;
      lastAt = now;
      lastRes = _o.call(this, o, d, m);
      return lastRes;
    };
  });

  setInterval(() => {
    try {
      if (typeof ParticlePool !== 'undefined' && ParticlePool.pool && ParticlePool.pool.length > 60) {
        while (ParticlePool.pool.length > 60) {
          const p = ParticlePool.pool.pop();
          if (p && p.geometry) p.geometry.dispose();
          if (p && p.material) p.material.dispose();
        }
      }
    } catch (e) {}
  }, 30000);

  setTimeout(() => {
    console.log('✅ [MASTER PATCHER v4] Всё применено');
    if (typeof window.showPatchToast === 'function') {
      window.showPatchToast('🔧 MASTER PATCHER v4', 'Hitstop fixed · speed ×0.82 · pistol ×2', '#00f2fe');
    }
  }, 3200);

})();
