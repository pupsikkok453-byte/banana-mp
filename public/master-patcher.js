// ============================================================================
// BANANA INDUSTRIES — MASTER PATCHER v3
// - Работает через window.__game (base-переменные const НЕ видны из patch-скоупа)
// - Wall-run убит у Банана и Лимона (pre-push + post-undo + блок walljump)
// - Пистолет на Q/ПКМ суита 0: стрельба + МОДЕЛЬ в руке
// - LMB-атаки замедлены через внешний cooldown + удлинение анимации
// - Плавность: hitstop ≥60мс, длительность анимации ×1.6
// - Меньше частиц, реже надписи
// - Все багфиксы из .txt
// ============================================================================
(function () {
  'use strict';
  if (window.__BANANA_MASTER_PATCHER_V3) return;
  window.__BANANA_MASTER_PATCHER_V3 = true;
  console.log('🔧 [MASTER PATCHER v3] Инициализация...');

  const V3 = {
    SPEED_MUL:        0.55,
    ENEMY_SPEED_MUL:  0.70,
    BOSS_SPEED_MUL:   0.75,
    ANIM_EXT_MUL:     1.60,
    LMB_MIN_CD_MS:    480,
    HITSTOP_MIN:      0.065,
    PARTICLE_MUL:     0.35,
    POPUP_CD_MS:      1000,
    DMG_NUM_PS:       5,
    PISTOL_CD_MS:     230,
    PISTOL_DMG:       46,
    PISTOL_RADIUS:    1.4,
    CROSSHAIR_MS:     320,
    WALL_PUSH_PAD:    2.0
  };
  window.__V3_TUNING = V3;

  // ─── Безопасные геттеры (base const НЕ на window) ─────────────────────────
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
      if (ok) { done = true; try { cb(); } catch (e) { console.error('[patcher v3]', e); } return; }
      if (performance.now() - t0 >= max) return;
      requestAnimationFrame(tick);
    };
    tick();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. СЛОУДАУН ИГРОКА (через getSuitData + pepperStats/carrotStats — они на window)
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.getSuitData === 'function', () => {
    const _g = window.getSuitData;
    window.getSuitData = function () {
      const d = _g.apply(this, arguments);
      if (d && typeof d.speed === 'number' && !d._v3Scaled) {
        d._v3OrigSpeed = d.speed;
        d.speed = d._v3OrigSpeed * V3.SPEED_MUL;
        d._v3Scaled = true;
      }
      return d;
    };

    // pepperStats/carrotStats возвращают объекты, которые идут в кэш getSuitData
    ['pepperStats', 'carrotStats'].forEach(fn => {
      if (typeof window[fn] !== 'function') return;
      const _s = window[fn];
      window[fn] = function () {
        const d = _s.apply(this, arguments);
        if (d && typeof d.speed === 'number' && !d._v3Scaled) {
          d._v3OrigSpeed = d.speed;
          d.speed = d._v3OrigSpeed * V3.SPEED_MUL;
          d._v3Scaled = true;
        }
        return d;
      };
    });
    console.log('✅ Слоудаун игрока ×' + V3.SPEED_MUL);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. ПЛАВНЫЕ LMB-АТАКИ (внешний cooldown + удлинение attackDuration)
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.performPrimaryAttack === 'function' && getPlayer(), () => {
    const _orig = window.performPrimaryAttack;
    let _lastLMB = 0;

    window.performPrimaryAttack = function () {
      const P = getPlayer();
      if (!P) return _orig.apply(this, arguments);

      const now = performance.now();
      if (now - _lastLMB < V3.LMB_MIN_CD_MS) return;

      const beforeTimer = P.attackTimer;
      const result = _orig.apply(this, arguments);

      // Если base реально начал атаку (сбросил attackTimer), продлеваем анимацию
      if (P.attackTimer > beforeTimer && P.attackTimer > 0.1) {
        _lastLMB = now;
        P.attackDuration *= V3.ANIM_EXT_MUL;
        P.attackTimer *= V3.ANIM_EXT_MUL;
      }
      return result;
    };
    console.log('✅ LMB-атаки замедлены (min ' + V3.LMB_MIN_CD_MS + 'мс) + анимация ×' + V3.ANIM_EXT_MUL);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. ПЛАВНЫЕ АТАКИ ВРАГОВ
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.playEnemyMeleeAttack === 'function', () => {
    const _base = window.playEnemyMeleeAttack;
    const M = 1.45;

    window.playEnemyMeleeAttack = function (en, type) {
      const _origSt = window.setTimeout;
      window.setTimeout = function (fn, ms, ...rest) {
        return _origSt.call(window, fn, (ms || 0) * M, ...rest);
      };
      try {
        const res = _base.call(this, en, type);
        if (en) {
          if (typeof en._telegraphT === 'number')   en._telegraphT *= M;
          if (typeof en._telegraphMax === 'number') en._telegraphMax *= M;
          if (typeof en._meleeDur === 'number')     en._meleeDur *= M;
          if (typeof en.attackCd === 'number')      en.attackCd *= M;
        }
        return res;
      } finally {
        window.setTimeout = _origSt;
      }
    };
    console.log('✅ Атаки врагов плавнее ×' + M);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. УБИРАЕМ КАРАБКАНИЕ (pre-push + post-undo + блок walljump)
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.updatePlayerChoreographyAndCamera === 'function' && getPlayer(), () => {
    const _orig = window.updatePlayerChoreographyAndCamera;
    const B = () => (typeof buildings !== 'undefined' && buildings) || window.buildings || [];

    window.updatePlayerChoreographyAndCamera = function (dt, now) {
      const P = getPlayer();
      if (!P) return _orig.apply(this, arguments);

      // PRE: вытолкнуть из стены с запасом, чтобы base-паддинг не видел стену
      if (!allowWallRun()) {
        const blds = B();
        const PRE_PAD = 2.2;
        for (let i = 0; i < blds.length; i++) {
          const b = blds[i];
          if (P.pos.y > b.topY - 0.3) continue;
          if (P.pos.x > b.minX - PRE_PAD && P.pos.x < b.maxX + PRE_PAD &&
              P.pos.z > b.minZ - PRE_PAD && P.pos.z < b.maxZ + PRE_PAD) {
            const dL = P.pos.x - (b.minX - PRE_PAD);
            const dR = (b.maxX + PRE_PAD) - P.pos.x;
            const dB = P.pos.z - (b.minZ - PRE_PAD);
            const dF = (b.maxZ + PRE_PAD) - P.pos.z;
            const m = Math.min(dL, dR, dB, dF);
            if (m === dL) P.pos.x = b.minX - PRE_PAD - 0.02;
            else if (m === dR) P.pos.x = b.maxX + PRE_PAD + 0.02;
            else if (m === dB) P.pos.z = b.minZ - PRE_PAD - 0.02;
            else P.pos.z = b.maxZ + PRE_PAD + 0.02;
          }
        }
      }

      _orig.call(this, dt, now);

      // POST: base мог успеть триггернуть wall-run → откатываем Y-подъём
      if (!allowWallRun() && P.isWallRunning) {
        const climb = (P.vel.y || 0) * dt;
        P.pos.y = Math.max(0, P.pos.y - climb);
        P.vel.y = Math.min(P.vel.y, -1);
        P.isWallRunning = false;
        P.wallJumpCount = 0;

        // Дополнительно выталкиваем из паддинга base (1.2)
        const blds = B();
        const POST_PAD = 1.6;
        for (let i = 0; i < blds.length; i++) {
          const b = blds[i];
          if (P.pos.y > b.topY) continue;
          if (P.pos.x > b.minX - POST_PAD && P.pos.x < b.maxX + POST_PAD &&
              P.pos.z > b.minZ - POST_PAD && P.pos.z < b.maxZ + POST_PAD) {
            const dL = P.pos.x - (b.minX - POST_PAD);
            const dR = (b.maxX + POST_PAD) - P.pos.x;
            const dB = P.pos.z - (b.minZ - POST_PAD);
            const dF = (b.maxZ + POST_PAD) - P.pos.z;
            const m = Math.min(dL, dR, dB, dF);
            if (m === dL) P.pos.x = b.minX - POST_PAD - 0.03;
            else if (m === dR) P.pos.x = b.maxX + POST_PAD + 0.03;
            else if (m === dB) P.pos.z = b.minZ - POST_PAD - 0.03;
            else P.pos.z = b.maxZ + POST_PAD + 0.03;
          }
        }
        if (typeof window.playerGroup !== 'undefined' && window.playerGroup) {
          window.playerGroup.position.copy(P.pos);
        }
      }
    };

    const _origWallJump = window.performWallJump;
    if (typeof _origWallJump === 'function') {
      window.performWallJump = function () {
        if (!allowWallRun()) {
          const P = getPlayer();
          if (P) { P.isWallRunning = false; P.wallJumpCount = 0; }
          return;
        }
        return _origWallJump.apply(this, arguments);
      };
    }
    console.log('✅ Wall-run убран у Банана и Лимона');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. ПИСТОЛЕТ + МОДЕЛЬ (Q / ПКМ суита 0)
  // ═══════════════════════════════════════════════════════════════════════════
  const myBullets = [];
  let _lastPistolAt = 0;

  // Собственная модель пистолета
  function buildPistolMesh(THREE) {
    const g = new THREE.Group();
    const darkMat  = new THREE.MeshBasicMaterial({ color: 0x15151a });
    const metalMat = new THREE.MeshBasicMaterial({ color: 0x5a5a66 });
    const goldMat  = new THREE.MeshBasicMaterial({ color: 0xd4a017 });

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.40, 0.14), darkMat);
    grip.position.set(0, -0.16, 0.02);
    grip.rotation.x = 0.32;
    g.add(grip);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.48), metalMat);
    frame.position.set(0, 0.06, 0.14);
    g.add(frame);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.34, 8), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.08, 0.48);
    g.add(barrel);

    const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.014, 6, 10), goldMat);
    muzzle.position.set(0, 0.08, 0.66);
    g.add(muzzle);

    const tg = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.016, 4, 8, Math.PI), goldMat);
    tg.rotation.y = Math.PI / 2;
    tg.rotation.z = Math.PI;
    tg.position.set(0, -0.05, 0.07);
    g.add(tg);

    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.06), darkMat);
    sight.position.set(0, 0.17, 0.05);
    g.add(sight);

    // Ориентируем ствол вдоль -Y wrist-локали (при вытянутой руке = forward)
    g.rotation.x = Math.PI / 2;
    g.position.set(0, -0.14, 0.02);
    return g;
  }

  function attachPistol() {
    const P = getPlayer();
    if (!P || !P.mesh || !P.mesh.userData) return;
    const ud = P.mesh.userData;
    if (!ud.armR || !ud.armR.wrist) return;

    if (ud._v3PistolMesh) {
      if (ud._v3PistolMesh.parent) ud._v3PistolMesh.parent.remove(ud._v3PistolMesh);
      ud._v3PistolMesh = null;
    }
    if (P.character !== 'banana' || P.suitIdx !== 0) return;
    if (typeof THREE === 'undefined') return;

    const pistol = buildPistolMesh(THREE);
    ud.armR.wrist.add(pistol);
    ud._v3PistolMesh = pistol;
    ud._v3PistolMuzzleLocal = new THREE.Vector3(0, 0.08, 0.70); // в локале пистолета
  }

  waitFor(() => typeof window.rebuildHeroMesh === 'function', () => {
    const _r = window.rebuildHeroMesh;
    window.rebuildHeroMesh = function () {
      const res = _r.apply(this, arguments);
      setTimeout(attachPistol, 40);
      return res;
    };
    setTimeout(attachPistol, 500);
    // Страховка
    setInterval(() => {
      const P = getPlayer();
      if (!P || !P.mesh || !P.mesh.userData) return;
      const ud = P.mesh.userData;
      if (!ud.armR || !ud.armR.wrist) return;
      const shouldHave = P.character === 'banana' && P.suitIdx === 0;
      if (shouldHave && !ud._v3PistolMesh) attachPistol();
      else if (!shouldHave && ud._v3PistolMesh) attachPistol();
    }, 800);
  });

  function getPistolMuzzleWorldPos() {
    const P = getPlayer();
    if (!P || !P.mesh || !P.mesh.userData) return null;
    const ud = P.mesh.userData;
    if (!ud._v3PistolMesh || !ud._v3PistolMuzzleLocal) return null;
    const v = ud._v3PistolMuzzleLocal.clone();
    ud._v3PistolMesh.localToWorld(v);
    return v;
  }

  function firePistolInternal() {
    const P = getPlayer();
    const scene = getScene();
    if (!P || !scene) return;
    if (P.isDead) return;
    if (P.character !== 'banana' || P.suitIdx !== 0) return;
    if (isPepper() || isCarrot() || isLemon() || isPotato()) return;

    const now = performance.now();
    if (now - _lastPistolAt < V3.PISTOL_CD_MS) return;
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
      dmg: V3.PISTOL_DMG * (1 + (P.comboMult || 1) * 0.15),
      radius: V3.PISTOL_RADIUS
    });

    // Вспышка
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

    // Гильзы (патроны) — вылетают в сторону
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

    // Звук (безопасно)
    try {
      if (window.SoundFX && typeof window.SoundFX.swing === 'function') {
        window.SoundFX.swing(820 + Math.random() * 100);
      }
    } catch (e) {}

    const ch = document.getElementById('crosshair');
    if (ch) {
      ch.style.borderColor = '#ffe066';
      setTimeout(() => { if (ch) ch.style.borderColor = 'rgba(255,0,85,.85)'; }, 90);
    }
  }

  // Захват Q — capture
  window.addEventListener('keydown', (e) => {
    const P = getPlayer();
    if (!P) return;
    if (e.code !== 'KeyQ') return;
    if (P.character !== 'banana' || P.suitIdx !== 0) return;
    if (isPepper() || isCarrot() || isLemon() || isPotato()) return;
    if (P.isDead) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    firePistolInternal();
  }, true);

  // Захват ПКМ — capture
  document.addEventListener('mousedown', (e) => {
    const P = getPlayer();
    if (!P) return;
    if (e.button !== 2) return;
    if (P.character !== 'banana' || P.suitIdx !== 0) return;
    if (isPepper() || isCarrot() || isLemon() || isPotato()) return;
    if (P.isDead) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    firePistolInternal();
  }, true);

  // Резерв — если Q всё же дойдёт до performDevastator
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

  // Обновление HUD и слота 0
  setInterval(() => {
    const P = getPlayer();
    if (!P || P.character !== 'banana' || P.suitIdx !== 0) return;
    if (isPepper() || isCarrot() || isLemon() || isPotato()) return;

    const el = document.getElementById('ui-powers-desc');
    if (el && !el.dataset.v3Pistol) {
      el.innerHTML = '<b>ЛКМ:</b> Удары | <b>Q / ПКМ:</b> 🔫 ПИСТОЛЕТ | <b>F:</b> Турель | <b>G:</b> Ракета';
      el.dataset.v3Pistol = '1';
    }
    const badge = document.querySelector('.suit-badge');
    if (badge && !badge.dataset.v3Pistol) {
      badge.innerText = '[0] ЕГОРБАНАН · ПИСТОЛЕТ [Q]';
      badge.dataset.v3Pistol = '1';
    }
    const slot = document.getElementById('slot-0');
    if (slot) {
      const sub = slot.querySelector('.slot-sub');
      if (sub && sub.textContent !== '[Q] ПИСТОЛЕТ · [F] ТУРЕЛЬ') {
        sub.textContent = '[Q] ПИСТОЛЕТ · [F] ТУРЕЛЬ';
      }
    }
  }, 700);

  // Сброс флагов при смене суита
  waitFor(() => typeof window.equipSuit === 'function', () => {
    const _e = window.equipSuit;
    window.equipSuit = function () {
      const desc = document.getElementById('ui-powers-desc');
      if (desc) delete desc.dataset.v3Pistol;
      const badge = document.querySelector('.suit-badge');
      if (badge) delete badge.dataset.v3Pistol;
      const res = _e.apply(this, arguments);
      setTimeout(attachPistol, 40);
      return res;
    };
  });

  // Обновление своих пуль (инжект в base-цикл)
  function updateMyBullets(dt) {
    const enemies = getEnemies();
    const scene = getScene();
    for (let i = myBullets.length - 1; i >= 0; i--) {
      const b = myBullets[i];
      b.mesh.position.x += b.vel.x * dt;
      b.mesh.position.y += b.vel.y * dt;
      b.mesh.position.z += b.vel.z * dt;
      b.life -= dt;

      // Враги
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (!e || !e.group) continue;
        const dx = b.mesh.position.x - e.group.position.x;
        const dy = b.mesh.position.y - (e.group.position.y + 1.5);
        const dz = b.mesh.position.z - e.group.position.z;
        const r = (e.radius || 1.2) + b.radius;
        if (dx * dx + dy * dy + dz * dz <= r * r) {
          if (typeof window.damageEnemy === 'function') {
            window.damageEnemy(e, b.dmg, b.vel.clone().normalize(), '*БАЦ!*');
          }
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
      updateMyBullets(dt);
      return _u.apply(this, arguments);
    };
  });
  // Fallback на случай, если updateTendrilsAndProjectiles недоступен
  let _lastBulletTick = performance.now();
  setInterval(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - _lastBulletTick) / 1000);
    _lastBulletTick = now;
    if (myBullets.length > 0) updateMyBullets(dt);
  }, 16);

  console.log('✅ Пистолет + модель для суита 0');

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. ФИДБЭК УДАРОВ (min hitstop 65мс)
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.triggerHitstopAndChroma === 'function' && getPlayer(), () => {
    const _h = window.triggerHitstopAndChroma;
    window.triggerHitstopAndChroma = function (stop, shake, chr) {
      const P = getPlayer();
      if (P) {
        P.hitStop = Math.max(P.hitStop || 0, V3.HITSTOP_MIN);
        P.cameraShake = Math.max(P.cameraShake || 0, 0.30);
      }
      try {
        if (typeof postUniforms !== 'undefined' && postUniforms.uChroma) {
          postUniforms.uChroma.value = Math.max(postUniforms.uChroma.value || 0, 0.7);
        }
      } catch (e) {}
      if (_h) _h.call(this, stop, shake, chr);
    };
    console.log('✅ Hitstop ≥' + V3.HITSTOP_MIN + 'с');
  });

  waitFor(() => typeof window.damageEnemy === 'function' && getScene(), () => {
    const _d = window.damageEnemy;
    const scene = getScene();
    const impactPool = [];
    let _pulseOffset = 0;

    function spawnImpactPulse(pos, colorHex) {
      let m = impactPool.pop();
      if (!m) {
        m = new THREE.Mesh(
          new THREE.SphereGeometry(0.55, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, wireframe: true, depthWrite: false })
        );
        scene.add(m);
      }
      m.visible = true;
      m.material.color.setHex(colorHex);
      m.material.opacity = 0.9;
      m.position.copy(pos);
      m.scale.setScalar(0.4);
      const t0 = performance.now();
      const tick = () => {
        const t = (performance.now() - t0) / 320;
        if (t >= 1) { m.visible = false; impactPool.push(m); return; }
        m.scale.setScalar(0.4 + t * 4.5);
        m.material.opacity = 0.9 * (1 - t);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    window.damageEnemy = function (en, dmg, knockVec, popText) {
      const beforeHp = en && en.hp;
      const result = _d.call(this, en, dmg, knockVec, popText);
      if (en && en.group && dmg > 0) {
        const pos = en.group.position.clone();
        pos.y += (en.type === 'titan' || en._isBoss || en._isPinnacleBoss) ? 7 : 2.2;
        spawnImpactPulse(pos, (en.hp <= 0) ? 0xffffff : 0xffe066);
        en._hitStagger = Math.max(en._hitStagger || 0, 0.28);
      }
      return result;
    };
    console.log('✅ Вспышки попадания + flinch');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. ЧАСТИЦЫ ×0.35
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.spawnParticles === 'function', () => {
    const _p = window.spawnParticles;
    window.spawnParticles = function (pos, color, count) {
      return _p.call(this, pos, color, Math.max(1, Math.floor((count || 10) * V3.PARTICLE_MUL)));
    };
    if (typeof window.spawnSparks === 'function') {
      const _s = window.spawnSparks;
      window.spawnSparks = function (pos, count, color) {
        return _s.call(this, pos, Math.max(1, Math.floor((count || 6) * V3.PARTICLE_MUL)), color);
      };
    }
  });
  console.log('✅ Частиц ×' + V3.PARTICLE_MUL);

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. РЕЖЕ НАДПИСИ
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.spawnComicPop === 'function', () => {
    const _orig = window.spawnComicPop;
    let _last = 0;
    const KEY = /RAGE|BOSS|ФАЗА|ЭВОЛЮЦИЯ|LEVEL|УРОВЕНЬ|СИНТЕЗ|МУЛЬТИФРУКТ|ПОБЕД|ФИНАЛ|ГЛАВА|СОЛО|ВРАТА|КРИСТАЛЛ|ТЮРЬМА|СЕГМЕНТ|СПИРАЛЬ|СИНГУЛЯР|ГРОМОВ|ЗОЛОТ|АЛМАЗ|МОНОЛИТ|ГАРПУН|РЫВОК К БОССУ|ЩИТ|ПАНЦИРЬ|БУР|ТАРАН/i;
    window.spawnComicPop = function (pos, text, color) {
      const now = performance.now();
      if (KEY.test(text) || now - _last > V3.POPUP_CD_MS) {
        _last = now;
        return _orig.call(this, pos, text, color);
      }
    };

    if (typeof window.spawnDamageNumber === 'function') {
      const _d = window.spawnDamageNumber;
      let cnt = 0, reset = 0;
      window.spawnDamageNumber = function (pos, v, type) {
        const now = performance.now();
        if (now - reset > 1000) { cnt = 0; reset = now; }
        if (cnt < V3.DMG_NUM_PS || type === 'crit' || type === 'heal') {
          cnt++;
          return _d.call(this, pos, v, type);
        }
      };
    }
  });
  console.log('✅ Надписи реже');

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. МЕНЬШЕ ВРАГОВ, НО СИЛЬНЕЕ
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.spawnCitrusSoldier === 'function', () => {
    const cap = () => getEnemies().filter(e => !e._isStoryConstruct && !e._isBoss && !e._isPinnacleBoss && !e._isPhasePylon).length >= 6;

    const buffNew = (beforeIdx, hpMul, spdMul, sizeMul) => {
      const es = getEnemies();
      for (let i = beforeIdx; i < es.length; i++) {
        const e = es[i];
        if (!e || e._isBoss || e._isStoryConstruct || e._isPinnacleBoss) continue;
        e.hp *= hpMul; e.maxHp *= hpMul;
        e.speed = (e.speed || 12) * spdMul;
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
      buffNew(before, 2.6, V3.ENEMY_SPEED_MUL, 1.15);
    };

    const _a = window.spawnCitrusAPC;
    if (_a) window.spawnCitrusAPC = function () {
      const before = getEnemies().length;
      _a.apply(this, arguments);
      buffNew(before, 2.0, V3.ENEMY_SPEED_MUL, 1.10);
    };
    const _h = window.spawnCitrusHeli;
    if (_h) window.spawnCitrusHeli = function () {
      const before = getEnemies().length;
      _h.apply(this, arguments);
      buffNew(before, 2.0, V3.ENEMY_SPEED_MUL, 1.10);
    };

    ['spawnSoloFinalGrapestasik', 'spawnSoloFinalJirigory', 'spawnSoloBeetrootTitanGoretzka', 'spawnSoloMonolithOfSterility'].forEach(fn => {
      if (typeof window[fn] !== 'function') return;
      const _o = window[fn];
      window[fn] = function () {
        const r = _o.apply(this, arguments);
        const es = getEnemies();
        const b = es[es.length - 1];
        if (b && b._isPinnacleBoss && b.speed) b.speed *= V3.BOSS_SPEED_MUL;
        return r;
      };
    });
    console.log('✅ Враги: реже, сильнее, медленнее');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. ПРОДЖЕКТАЙЛЫ ЛИМОНА (крупнее, с glow)
  // ═══════════════════════════════════════════════════════════════════════════
  waitFor(() => typeof window.lemonPlasmaShot === 'function' && getPlayer() && getScene(), () => {
    window.lemonPlasmaShot = function () {
      const P = getPlayer();
      const scene = getScene();
      if (!P || !scene) return;
      if (P.lemonShotCd > 0) return;
      P.lemonShotCd = 0.22;
      try { if (window.SoundFX) window.SoundFX.swing(640); } catch (e) {}

      const fwd = new THREE.Vector3(-Math.sin(P.camYaw), 0, -Math.cos(P.camYaw));
      const start = P.pos.clone().add(new THREE.Vector3(0, 2.2, 0));

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
        new THREE.CylinderGeometry(0.14, 0.02, 3.0, 5),
        new THREE.MeshBasicMaterial({ color: 0x44ffaa, transparent: true, opacity: 0.65 })
      );
      tracer.rotation.x = Math.PI / 2;
      tracer.position.z = 1.5;
      proj.add(tracer);
      scene.add(proj);

      myBullets.push({
        mesh: proj,
        vel: new THREE.Vector3(fwd.x * 105, 0, fwd.z * 105),
        life: 1.5,
        dmg: 44,
        radius: 2.0
      });
      if (typeof window.spawnParticles === 'function') window.spawnParticles(start, 0x44ffaa, 5);
    };
  });
  console.log('✅ Проджектайлы Лимона');

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. БАГФИКСЫ ИЗ .txt
  // ═══════════════════════════════════════════════════════════════════════════

  // FIX #1, #9 — арморы + двойной щит
  waitFor(() => typeof window.applyDamageToHero === 'function' && getPlayer(), () => {
    const _p = window.applyDamageToHero;
    window.applyDamageToHero = function (dmg) {
      const P = getPlayer();
      if (!P || P.isDead) return;
      const shieldOn = P.activeModeF && P.suitIdx === 3 && P.character === 'banana' &&
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
      if (shieldOn) {
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
    console.log('✅ Fix #1, #9: Арморы + щит');
  });

  // FIX #2 — сохранение прогресса саги
  let _lastSaved = -1;
  setInterval(() => {
    if (window.StoryCampaign && window.StoryCampaign.chapter !== _lastSaved) {
      _lastSaved = window.StoryCampaign.chapter;
      try {
        localStorage.setItem('banana_v201_story_progress', JSON.stringify({
          chapter: window.StoryCampaign.chapter, ts: Date.now()
        }));
      } catch (e) {}
    }
  }, 600);
  console.log('✅ Fix #2: Сохранение саги');

  // FIX #3, #4, #11 — Старт/Continue/Сага + картошка double-init
  waitFor(() => document.getElementById('start-btn') && typeof window.startGameSession === 'function', () => {
    const clearStory = () => {
      const es = getEnemies();
      const scene = getScene();
      for (let i = es.length - 1; i >= 0; i--) {
        if (es[i]._isStoryConstruct || es[i]._isPinnacleBoss) {
          if (scene && es[i].group && es[i].group.parent) scene.remove(es[i].group);
          es.splice(i, 1);
        }
      }
      if (typeof activeBoss !== 'undefined') activeBoss = null;
    };

    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.addEventListener('click', () => {
      try { localStorage.removeItem('banana_v201_story_progress'); } catch (e) {}
      window.__pendingLoad = null;
      clearStory();
      if (window.StoryCampaign) {
        window.StoryCampaign.chapter = 0;
        window.StoryCampaign.objectives = [];
        window.StoryCampaign.completed = false;
      }
    }, true);

    const contBtn = document.getElementById('continue-btn');
    if (contBtn) contBtn.addEventListener('click', () => {
      try {
        const raw = localStorage.getItem('banana_v960ng_save');
        window.__pendingLoad = raw ? JSON.parse(raw) : null;
      } catch (e) { window.__pendingLoad = null; }
    }, true);

    let _gsAt = 0;
    const _s = window.startGameSession;
    window.startGameSession = function (loaded) {
      const now = performance.now();
      if (now - _gsAt < 800) return;
      _gsAt = now;

      const fresh = (loaded === null || loaded === undefined);
      if (fresh) {
        try { localStorage.removeItem('banana_v201_story_progress'); } catch (e) {}
        if (window.StoryCampaign) {
          window.StoryCampaign.chapter = 0;
          window.StoryCampaign.objectives = [];
          window.StoryCampaign.completed = false;
        }
        clearStory();
      }
      const r = _s.apply(this, arguments);
      if (fresh && window.startStoryChapter) {
        setTimeout(() => window.startStoryChapter(1), 150);
      }
      return r;
    };
    console.log('✅ Fix #3, #4, #11');
  });

  // FIX #5 — equipPotato идемпотентен
  waitFor(() => typeof window.equipPotato === 'function', () => {
    const _e = window.equipPotato;
    window.equipPotato = function () {
      const P = getPlayer();
      if (isPotato() && P && P.mesh && P.mesh.userData && P.mesh.userData.isPotato) return;
      return _e.apply(this, arguments);
    };
  });

  // FIX #6, #14, #19 — врата не хилят, кап, Жиригорь
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
    console.log('✅ Fix #6, #14, #19');
  });

  // FIX #7, #8 — камера в стенах + кристалл Y (уже покрыто в wall-run wrapper — добавим камеру отдельно)
  waitFor(() => typeof window.updatePlayerChoreographyAndCamera === 'function' && getCamera() && getPlayer(), () => {
    const _c = window.updatePlayerChoreographyAndCamera;
    const B = () => (typeof buildings !== 'undefined' && buildings) || window.buildings || [];

    window.updatePlayerChoreographyAndCamera = function (dt, now) {
      const P = getPlayer();
      if (!P) return _c.apply(this, arguments);
      const preY = P.pos.y;
      const frozen = (window.__MP && window.__MP._myRootedUntil > now) || (P._crystalPrisonHitsNeeded > 0);

      _c.call(this, dt, now);

      if (frozen) {
        P.pos.y = preY;
        P.vel.y = 0;
      }

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
    console.log('✅ Fix #7, #8: Камера + кристалл Y');
  });

  // FIX #17 — carrotRootBind не бесплатен
  waitFor(() => typeof window.carrotRootBind === 'function' && getPlayer(), () => {
    const _r = window.carrotRootBind;
    window.carrotRootBind = function () {
      const P = getPlayer();
      if (!P) return;
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

  // FIX #21 — первая атака при pointerlock
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
  waitFor(() => typeof window.pushComboMultiplier === 'function' && getPlayer(), () => {
    const _p = window.pushComboMultiplier;
    window.pushComboMultiplier = function () {
      const r = _p.apply(this, arguments);
      const P = getPlayer();
      const el = document.getElementById('ui-combo');
      if (el && P && P.comboMult > 1.05) {
        el.style.display = 'block';
        el.textContent = P.comboMult.toFixed(1) + 'x COMBO!';
      }
      return r;
    };
    setInterval(() => {
      const P = getPlayer();
      const el = document.getElementById('ui-combo');
      if (el && P && P.comboMult <= 1.05) el.style.display = 'none';
    }, 400);
  });

  // FIX #26 — exec-prompt по врагу
  setInterval(() => {
    const P = getPlayer();
    if (!P || !P.execTarget || !P.execTarget.group) return;
    const pr = document.getElementById('exec-prompt');
    if (!pr || pr.style.display === 'none') return;
    const cam = getCamera();
    if (!cam) return;
    const pos = P.execTarget.group.position.clone();
    pos.y += 3;
    pos.project(cam);
    if (pos.z > 1 || pos.z < -1) { pr.style.display = 'none'; return; }
    pr.style.left = ((pos.x * 0.5 + 0.5) * window.innerWidth) + 'px';
    pr.style.top = ((-pos.y * 0.5 + 0.5) * window.innerHeight) + 'px';
  }, 100);

  // FIX #22, #23 — z-index
  const st = document.createElement('style');
  st.textContent = `
    #hud { z-index: 50 !important; }
    #boss-hud { z-index: 26 !important; }
    #exec-prompt { z-index: 45 !important; }
  `;
  document.head.appendChild(st);
  console.log('✅ Fix #22, #23: Z-index');

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. ОПТИМИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════════════════
  // Crosshair raycast — троттлинг через перехват
  waitFor(() => typeof window.raycastAllBuildingsAABB === 'function', () => {
    const _orig = window.raycastAllBuildingsAABB;
    let lastAt = 0, lastRes = null;
    window.raycastAllBuildingsAABB = function (o, d, maxD) {
      const now = performance.now();
      if (now - lastAt < V3.CROSSHAIR_MS) return lastRes;
      lastAt = now;
      lastRes = _orig.call(this, o, d, maxD);
      return lastRes;
    };
  });

  // Уборка пула частиц
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
    console.log('✅ [MASTER PATCHER v3] Все изменения применены');
    if (typeof window.showPatchToast === 'function') {
      window.showPatchToast('🔧 MASTER PATCHER v3', 'Пистолет+модель · без wall-run · плавнее · медленнее', '#00f2fe');
    }
  }, 3200);

})();
