// =======================================================
// BANANA INDUSTRIES — GLOBAL PATCH (v65.1 — ULTIMATE NEXT-GEN)
// Собран из 9 частей. Все 17 фиксов v53 сохранены.
// Части: 0 (фиксы v53), 1 (диспетчер), 2 (Моргенкартошка),
// 3 (Battle Damage), 4 (EVO), 5 (Sky Rails), 6 (Kinematics),
// 7 (Ragdoll), 8 (Traffic + VFX).
// =======================================================
(function () {
  "use strict";
  console.log("🍌 [PATCH] v65.1 ULTIMATE — старт.");

  // Ожидание готовности сцены / игрока / врагов
  function whenReady(fn, tries) {
    tries = tries || 0;
    if (typeof window.player !== "undefined" &&
        window.player && window.player.pos &&
        typeof window.enemies !== "undefined" &&
        typeof window.scene !== "undefined") {
      return fn();
    }
    if (tries > 200) { console.warn("[PATCH v65.1] whenReady timeout"); return; }
    setTimeout(function () { whenReady(fn, tries + 1); }, 50);
  }

  // ================================================================
  // ═══ ЧАСТЬ 0 — ВСЕ 17 ФИКСОВ v53 ═══
  // ================================================================
  whenReady(function () {
    try {
      const P = window.player;
      const S = window.scene;

      // ── 1. Кусты не спавнятся ──
      if (typeof window.addProp === "function") {
        const _origAddProp = window.addProp;
        window.addProp = function (x, z, type) {
          if (type === "bush") return;
          return _origAddProp.apply(this, arguments);
        };
      }

      // ── 2. Фикс ног моркови ──
      function fixCarrotMeshGround() {
        if (!P || !P.mesh || !P.mesh.userData || !P.mesh.userData.isCarrot) return;
        try {
          P.mesh.position.y = 0;
          P.mesh.updateMatrixWorld(true);
          const bbox = new THREE.Box3().setFromObject(P.mesh);
          const scaleY = (window.playerGroup && window.playerGroup.scale.y) || 1;
          if (bbox.min.y < 0.1) P.mesh.position.y += (0.1 - bbox.min.y) / scaleY;
        } catch (e) {}
      }
      window.__v65_fixCarrot = fixCarrotMeshGround;

      const _origRebuildMesh = window.rebuildHeroMesh;
      window.rebuildHeroMesh = function () {
        if (_origRebuildMesh) _origRebuildMesh.apply(this, arguments);
        setTimeout(fixCarrotMeshGround, 10);
      };
      const _origToggleCarrot = window.toggleCarrotForm;
      window.toggleCarrotForm = function () {
        if (_origToggleCarrot) _origToggleCarrot.apply(this, arguments);
        if (P.character === "carrot") {
          P.maxHp = (window.CARROT_FORM === 2) ? 800 : 480;
          P.hp = P.maxHp;
          if (typeof window.updateHUD === "function") window.updateHUD();
        }
        setTimeout(fixCarrotMeshGround, 50);
      };

      // ── 3. День/Ночь ──
      setTimeout(function () {
        S.traverse(function (o) {
          if (o.geometry && o.geometry.type === "SphereGeometry") {
            const p = o.geometry.parameters;
            if (p && p.radius >= 4000) o.visible = false;
          }
        });
        const sunMoon = new THREE.Mesh(
          new THREE.SphereGeometry(100, 16, 16),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        S.add(sunMoon);
        window.__SUN_MOON = sunMoon;
      }, 800);
      if (typeof window.TimeOfDay !== "undefined") window.TimeOfDay.speed = 1 / 90;

      // ── 4. Холмы вокруг города ──
      setTimeout(function () {
        if (typeof window.createPrototypeShader !== "function") return;
        const hillMat = window.createPrototypeShader(0x3a5a2a, 0x1a2a0a, 8, 0x88cc44);
        for (let i = 0; i < 20; i++) {
          const x = (Math.random() - 0.5) * 1600;
          const z = (Math.random() - 0.5) * 1600;
          if (Math.abs(x) < 120 && Math.abs(z) < 120) continue;
          const r = 25 + Math.random() * 35;
          const h = 8 + Math.random() * 15;
          const hill = new THREE.Mesh(
            new THREE.SphereGeometry(r, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
            hillMat
          );
          hill.position.set(x, 0, z);
          hill.scale.y = h / r;
          S.add(hill);
        }
      }, 1200);

      // ── 6. Усиленный щит Реактора MK-I ──
      const _origDamageToHero = window.applyDamageToHero;
      window.applyDamageToHero = function (dmg) {
        if (window.__POTATO_MODE && window.__POTATO_FORM === 1 && P._potatoArmor > 0) {
          dmg = Math.floor(dmg * 0.5);
        }
        if (P.activeModeF && P.suitIdx === 3 && P.character === "banana" &&
            !window.PEPPER_MODE && !window.CARROT_MODE && !window.LEMON_MODE) {
          const drain = dmg * 1.5;
          if (P.en >= drain) {
            P.en -= drain;
            if (typeof window.spawnComicPop === "function")
              window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 3.2, 0)), "*ЩИТ БЛОК*", "#00f2fe");
            return;
          }
          P.activeModeF = false;
          if (P.mesh && P.mesh.userData && P.mesh.userData.limeShield) P.mesh.userData.limeShield.visible = false;
        }
        if (_origDamageToHero) return _origDamageToHero.apply(this, arguments);
      };

      // ── 7. Меню + Дрон (Esc/B) ──
      window.addEventListener("keydown", function (e) {
        if (e.code === "Escape" && typeof window.gameStarted !== "undefined" && window.gameStarted) {
          const scr = document.getElementById("start-screen");
          if (scr) scr.style.display = "flex";
          try { document.exitPointerLock(); } catch (err) {}
        }
        if (e.code === "KeyB" && P.character === "banana" &&
            !window.PEPPER_MODE && !window.CARROT_MODE && !window.LEMON_MODE && !window.__POTATO_MODE) {
          if (typeof window.Companion !== "undefined") {
            const C = window.Companion;
            C._disabled = !C._disabled;
            if (C._disabled) {
              if (C.group) C.group.visible = false;
              C.shootCd = 99999; C.buffCd = 99999;
              P.companionShield = 0; P.companionRegen = 0; P.companionDmg = 0;
              if (typeof window.spawnComicPop === "function")
                window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 3, 0)), "ДРОН ОТКЛЮЧЕН", "#ff0000");
            } else {
              if (C.group) C.group.visible = true;
              C.shootCd = 0; C.buffCd = 15;
              if (typeof window.spawnComicPop === "function")
                window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 3, 0)), "ДРОН ВКЛЮЧЕН", "#00ff66");
            }
          }
        }
      });

      if (typeof window.Companion !== "undefined") {
        const C = window.Companion;
        const _origCompUpdate = C.update;
        C.update = function (dt, now) {
          _origCompUpdate.call(this, dt, now);
          if ((this._disabled || window.__POTATO_MODE) && this.group) {
            this.group.visible = false;
            this.shootCd = 99999;
            this.buffCd = 99999;
          }
        };
        const _origCompFind = C.findNearestEnemy;
        C.findNearestEnemy = function (maxD) {
          let best = null, bd = maxD;
          if (window.__MP_MODE && window.__MP && window.__MP.remotes) {
            window.__MP.remotes.forEach(function (r, id) {
              const d = r.group.position.distanceTo(this.group.position);
              if (d < bd) { bd = d; best = { isPlayer: true, id: id, group: r.group }; }
            }, this);
          }
          if (_origCompFind) {
            const enemy = _origCompFind.call(this, maxD);
            if (enemy) {
              const d = enemy.group.position.distanceTo(this.group.position);
              if (d < bd) { bd = d; best = enemy; }
            }
          }
          return best;
        };
        const _origCompShoot = C.shootAt;
        C.shootAt = function (enemy) {
          if (window.__POTATO_MODE) return;
          if (enemy && enemy.isPlayer) {
            if (window.__MP && window.__MP.room)
              window.__MP.room.send("pvp", { targetId: enemy.id, damage: 5 });
            if (typeof window.SoundFX !== "undefined") window.SoundFX.whip();
            const pp = window.ParticlePool.get(0xadff2f);
            pp.position.copy(this.group.position);
            pp.scale.setScalar(1.2);
            S.add(pp);
            window.ParticlePool.active.push({ mesh: pp, vel: new THREE.Vector3(0, 0, 0), life: 0.2 });
            return;
          }
          if (_origCompShoot) return _origCompShoot.apply(this, arguments);
        };
      }

      // ── 8. Гарпун (ПКМ, КД 0.6с) ──
      let _vineCd = 0;
      const VINE_CD = 0.6;
      window.__v65_vineCd = function (dt) { if (_vineCd > 0) _vineCd = Math.max(0, _vineCd - dt); };

      window.addEventListener("mousedown", function (e) {
        if (e.button !== 2) return;
        if (!P || P.isDead) return;
        if (!window.CARROT_MODE || window.CARROT_FORM !== 1) return;
        if (typeof window.gameStarted !== "undefined" && !window.gameStarted) return;
        if (typeof window.isLabOpen !== "undefined" && window.isLabOpen) return;
        if (window.__POTATO_MODE) return;
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        if (_vineCd > 0) {
          if (typeof window.spawnComicPop === "function")
            window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 3, 0)),
              "*ГАРПУН КД " + _vineCd.toFixed(1) + "с*", "#2ecc71");
          return;
        }
        const origin = P.pos.clone().add(new THREE.Vector3(0, 2, 0));
        const fwd = new THREE.Vector3(-Math.sin(P.camYaw), 0, -Math.cos(P.camYaw));
        const rc = new THREE.Raycaster();
        rc.set(origin, fwd); rc.far = 450;
        const rawHits = rc.intersectObjects(window.buildingMeshes, false);
        const buildHits = rawHits.filter(function (h) { return h.point.y > P.pos.y + 1; });
        const buildingDist = buildHits.length > 0 ? buildHits[0].distance : Infinity;
        let bestEnemy = null, bestDist = 450;
        for (let i = 0; i < window.enemies.length; i++) {
          const en = window.enemies[i];
          const toE = en.group.position.clone().sub(P.pos);
          const dist = toE.length();
          if (dist > 450) continue;
          const dot = toE.clone().normalize().dot(fwd);
          if (dot < 0.5) continue;
          if (dist < bestDist) { bestDist = dist; bestEnemy = en; }
        }
        if (bestEnemy && bestDist <= buildingDist) {
          _vineCd = VINE_CD;
          const isElite = (bestEnemy.type === "titan" || bestEnemy.type === "tank" ||
            bestEnemy.type === "lemon" || bestEnemy.type === "valkyrie" ||
            bestEnemy.type === "necromancer" || bestEnemy.type === "heli" ||
            bestEnemy.type === "shield" || bestEnemy.type === "sniper");
          const tp = bestEnemy.group.position.clone().add(new THREE.Vector3(0, 2, 0));
          if (window.activeTendrils.length < 8 && typeof window.OrganicTendril3D === "function")
            window.activeTendrils.push(new window.OrganicTendril3D(S, origin.clone(), tp.clone(), 0x2ecc71, 0.4, 0.5));
          if (typeof window.SoundFX !== "undefined") window.SoundFX.whip();
          if (typeof window.triggerHitstopAndChroma === "function")
            window.triggerHitstopAndChroma(0.06, 0.4, 0.9);
          const travelMs = Math.max(250, Math.min(2000, (bestDist / 250) * 1000));
          if (isElite) {
            if (typeof window.spawnComicPop === "function")
              window.spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), "*К БОССУ!*", "#ff2200");
            const dir = tp.clone().sub(P.pos).normalize();
            P.vel.x = dir.x * 250; P.vel.z = dir.z * 250;
            P.vel.y = Math.max(20, dir.y * 50);
            P.dodgeIframes = 0.7;
            if (window.postUniforms) window.postUniforms.uRadialBlur.value = 1.3;
            const capE = bestEnemy;
            setTimeout(function () {
              if (capE && capE.group.parent) {
                const st = window.carrotStats();
                window.damageEnemy(capE, st.dmg * 4.5, new THREE.Vector3(0, 0, 0), "*СОКРУШИТЕЛЬНЫЙ УДАР!*");
                if (typeof window.spawnParticles === "function") window.spawnParticles(tp.clone(), 0x2ecc71, 24);
                if (typeof window.spawnGroundCrackRing === "function") window.spawnGroundCrackRing(capE.group.position, 0x2ecc71, 14);
                if (typeof window.triggerHitstopAndChroma === "function")
                  window.triggerHitstopAndChroma(0.12, 0.8, 1.3);
              }
            }, travelMs);
          } else {
            if (typeof window.spawnComicPop === "function")
              window.spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), "*ИДИ СЮДА!*", "#2ecc71");
            const capE = bestEnemy;
            capE.vel.x = (P.pos.x - capE.group.position.x) * 8;
            capE.vel.z = (P.pos.z - capE.group.position.z) * 8;
            capE._rooted = 0.6;
            setTimeout(function () {
              if (capE && capE.group.parent) {
                const st = window.carrotStats();
                const fwd2 = new THREE.Vector3(-Math.sin(P.facingYaw), 0, -Math.cos(P.facingYaw));
                if (typeof window.spawnSlashArc === "function")
                  window.spawnSlashArc(P.pos.clone().add(new THREE.Vector3(0, 2, 0)), P.facingYaw, 0, 0x2ecc71, 6.5, 0.4);
                window.damageEnemy(capE, st.dmg * 3.0, fwd2.clone().multiplyScalar(10), "*УДАР С РАЗВОРОТА!*");
                if (typeof window.spawnParticles === "function")
                  window.spawnParticles(capE.group.position.clone().add(new THREE.Vector3(0, 2, 0)), 0xadff2f, 14);
                if (typeof window.triggerHitstopAndChroma === "function")
                  window.triggerHitstopAndChroma(0.08, 0.6, 1.1);
              }
            }, 450);
          }
        } else if (buildHits.length > 0) {
          _vineCd = VINE_CD;
          const hp = buildHits[0].point;
          if (window.activeTendrils.length < 8 && typeof window.OrganicTendril3D === "function")
            window.activeTendrils.push(new window.OrganicTendril3D(S, origin.clone(), hp.clone(), 0x2ecc71, 0.35, 0.4));
          if (typeof window.SoundFX !== "undefined") window.SoundFX.swing(500);
          if (typeof window.spawnComicPop === "function")
            window.spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), "*ЦЕПКИЙ КОРЕНЬ!*", "#2ecc71");
          const dir = hp.clone().sub(P.pos).normalize();
          P.vel.x = dir.x * 220; P.vel.z = dir.z * 220;
          P.vel.y = Math.max(40, Math.abs(dir.y) * 80 + 20);
          P.isGrounded = false; P.isBulletdropping = false;
          P.dodgeIframes = 0.5;
          if (window.postUniforms) window.postUniforms.uRadialBlur.value = 1.1;
        } else {
          if (typeof window.spawnComicPop === "function")
            window.spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), "*НЕТ ЦЕЛИ*", "#888888");
          if (typeof window.SoundFX !== "undefined") window.SoundFX.swing(300);
        }
      }, true);

      // ── 9. Заморозка (C) для Нано ──
      const FREEZE_RADIUS = 15, FREEZE_DMG = 20;
      window.addEventListener("keydown", function (e) {
        if (e.code !== "KeyC") return;
        if (!P || P.isDead) return;
        if (P.character !== "banana" || P.suitIdx !== 4) return;
        if (window.CARROT_MODE || window.PEPPER_MODE || window.LEMON_MODE || window.__POTATO_MODE) return;
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        if (P.consumeCd > 0) {
          if (typeof window.spawnComicPop === "function")
            window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 3, 0)),
              "*C КД " + P.consumeCd.toFixed(1) + "с*", "#00ff66");
          return;
        }
        P.consumeCd = 8.0;
        const targets = [];
        for (let i = 0; i < window.enemies.length; i++) {
          const en = window.enemies[i];
          if (en.group.position.distanceTo(P.pos) < FREEZE_RADIUS) targets.push(en);
        }
        const groundRing = new THREE.Mesh(
          new THREE.RingGeometry(1, FREEZE_RADIUS, 40),
          new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false })
        );
        groundRing.rotation.x = -Math.PI / 2;
        groundRing.position.set(P.pos.x, 0.15, P.pos.z);
        S.add(groundRing);
        let rt = 0;
        (function animRing() {
          rt += 0.03;
          groundRing.material.opacity = Math.max(0, 0.65 * (1 - rt));
          groundRing.scale.setScalar(1 + rt * 0.2);
          if (rt < 1) requestAnimationFrame(animRing);
          else { S.remove(groundRing); groundRing.geometry.dispose(); groundRing.material.dispose(); }
        })();
        for (let i = 0; i < 3; i++) {
          const iceMe = new THREE.Mesh(
            new THREE.BoxGeometry(3.5 - i * 0.8, 4.5 - i * 0.8, 3.5 - i * 0.8),
            new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.35 + i * 0.15, wireframe: true })
          );
          iceMe.position.set(P.pos.x, P.pos.y + 2, P.pos.z);
          S.add(iceMe);
          setTimeout((function (m) { return function () { S.remove(m); m.geometry.dispose(); m.material.dispose(); }; })(iceMe), 3000);
        }
        for (let ti = 0; ti < targets.length; ti++) {
          const t = targets[ti];
          const pos = t.group.position;
          for (let i = 0; i < 3; i++) {
            const cube = new THREE.Mesh(
              new THREE.BoxGeometry(3 - i * 0.8, 4 - i * 0.8, 3 - i * 0.8),
              new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.55 + i * 0.15, wireframe: true })
            );
            cube.position.copy(pos).add(new THREE.Vector3(0, 2, 0));
            S.add(cube);
            setTimeout((function (m) { return function () { S.remove(m); m.geometry.dispose(); m.material.dispose(); }; })(cube), 3000);
          }
          if (typeof window.spawnParticles === "function")
            window.spawnParticles(pos.clone().add(new THREE.Vector3(0, 1, 0)), 0x00f2fe, 12);
          t.frozen = 3.0; t._mpMoving = false;
          t.vel.x = 0; t.vel.z = 0;
          if (!t._mpId && typeof window.damageEnemy === "function")
            window.damageEnemy(t, FREEZE_DMG, new THREE.Vector3(), "*ЗАМОРОЖЕН!*");
        }
        for (let i = 0; i < 25; i++) {
          const ang = Math.random() * Math.PI * 2;
          const rad = Math.random() * FREEZE_RADIUS;
          const pp = window.ParticlePool.get(0x88ffff);
          pp.position.set(P.pos.x + Math.cos(ang) * rad, 0.5 + Math.random() * 3, P.pos.z + Math.sin(ang) * rad);
          pp.scale.setScalar(0.8);
          S.add(pp);
          window.ParticlePool.active.push({ mesh: pp, vel: new THREE.Vector3(0, 3 + Math.random() * 4, 0), life: 1.2 });
        }
        if (window.__MP && window.__MP.room) window.__MP.room.send("pvp_ability", { type: "freeze", radius: FREEZE_RADIUS });
        if (typeof window.spawnComicPop === "function")
          window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 5, 0)), "❄ ЗАМОРОЗКА (" + targets.length + ")", "#00f2fe");
        if (typeof window.SoundFX !== "undefined") { window.SoundFX.devastator(); window.SoundFX.boom(); }
      }, true);

      // ── 10. T-Божественный Синтез (Нано) ──
      let _tHold = 0, _tCharging = false, _nanoUltCd = 0;
      window.__v65_tick_nano = function (dt) {
        if (_nanoUltCd > 0) _nanoUltCd -= dt;
        if (!_tCharging) return;
        _tHold += dt;
        const bar = document.getElementById("t-bar");
        if (bar) bar.style.width = Math.min(100, (_tHold / 5) * 100) + "%";
        if (_tHold >= 5) {
          _tCharging = false;
          const panel = document.getElementById("__v65_t_panel");
          if (panel) panel.style.display = "none";
          _nanoUltCd = 102.5;
          const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(2, 15, 40, 16),
            new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.7, wireframe: true })
          );
          beam.rotation.x = Math.PI / 2;
          const fwd = new THREE.Vector3(-Math.sin(P.camYaw), 0, -Math.cos(P.camYaw));
          beam.position.copy(P.pos).add(fwd.clone().multiplyScalar(20));
          beam.lookAt(P.pos.clone().add(fwd.clone().multiplyScalar(40)));
          S.add(beam);
          setTimeout(function () { S.remove(beam); beam.geometry.dispose(); beam.material.dispose(); }, 1500);
          const ring = new THREE.Mesh(new THREE.RingGeometry(1, 50, 32), new THREE.MeshBasicMaterial({ color: 0x00f2fe, side: THREE.DoubleSide }));
          ring.rotation.x = -Math.PI / 2; ring.position.copy(P.pos); S.add(ring);
          let rt = 0;
          (function animRing() {
            rt += 0.05; ring.scale.setScalar(1 + rt * 3);
            ring.material.opacity = Math.max(0, 1 - rt);
            if (rt < 1) requestAnimationFrame(animRing);
            else { S.remove(ring); ring.geometry.dispose(); ring.material.dispose(); }
          })();
          if (window.__MP && window.__MP.room) window.__MP.room.send("pvp_ability", { type: "nano_ult", radius: 50 });
          if (typeof window.spawnComicPop === "function")
            window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 5, 0)), "⚡ БОЖЕСТВЕННЫЙ СИНТЕЗ! ⚡", "#00f2fe");
          if (typeof window.SoundFX !== "undefined") { window.SoundFX.devastator(); window.SoundFX.boom(); }
        }
      };
      const _tPanel = document.createElement("div");
      _tPanel.id = "__v65_t_panel";
      _tPanel.style.cssText = "position:fixed;bottom:180px;left:50%;transform:translateX(-50%);width:340px;background:rgba(0,20,40,.95);border:3px solid #00f2fe;border-radius:8px;padding:12px;text-align:center;z-index:50;display:none;box-shadow:0 0 30px rgba(0,242,254,.7),5px 5px 0 #000";
      _tPanel.innerHTML = '<div style="font-family:Bangers,Impact,sans-serif;font-size:20px;color:#00f2fe;-webkit-text-stroke:1px #000;margin-bottom:6px;letter-spacing:2px">⚡ БОЖЕСТВЕННЫЙ СИНТЕЗ ⚡</div><div style="height:22px;background:#001a1a;border:2px solid #000;overflow:hidden"><div id="t-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#00f2fe,#ff0055);box-shadow:0 0 15px #00f2fe;transition:width .05s"></div></div>';
      document.body.appendChild(_tPanel);
      window.addEventListener("keydown", function (e) {
        if (e.code !== "KeyT") return;
        if (P.character !== "banana" || P.suitIdx !== 4) return;
        if (window.PEPPER_MODE || window.CARROT_MODE || window.LEMON_MODE || window.__POTATO_MODE) return;
        if (_nanoUltCd > 0) {
          if (typeof window.spawnComicPop === "function")
            window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 3, 0)), "*T КД " + Math.ceil(_nanoUltCd) + "с*", "#ff4400");
          return;
        }
        if (!_tCharging) { _tCharging = true; _tHold = 0; _tPanel.style.display = "block"; }
      });
      window.addEventListener("keyup", function (e) {
        if (e.code === "KeyT" && _tCharging) { _tCharging = false; _tPanel.style.display = "none"; }
      });

      // ── 11. Фикс позиции замороженных ──
      if (typeof window.updateEnemiesAndVehicles === "function") {
        const _origUpdEnemies = window.updateEnemiesAndVehicles;
        window.updateEnemiesAndVehicles = function (dt, now) {
          const frozen = new Map();
          for (let i = 0; i < window.enemies.length; i++) {
            const en = window.enemies[i];
            if (en.frozen > 0) {
              en.frozen -= dt; en.vel.x = 0; en.vel.z = 0; en._mpMoving = false;
              frozen.set(en, en.group.position.clone());
            }
          }
          _origUpdEnemies.apply(this, arguments);
          frozen.forEach(function (pos, en) { en.group.position.copy(pos); });
        };
      }

      // ── 12. F-Способности ──
      P._suitCdMap = P._suitCdMap || [0, 0, 0, 0, 0];
      const _origF = window.triggerUniqueAbilityF;
      window.triggerUniqueAbilityF = function () {
        if (window.__POTATO_MODE) return;
        const idx = P.suitIdx;
        if (window.CARROT_MODE) {
          if (window.CARROT_FORM === 2) {
            if (P._suitCdMap[4] > 0) { if (window.spawnComicPop) window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 5, 0)), "*F КД " + P._suitCdMap[4].toFixed(1) + "с*", "#f9ca24"); return; }
            if (P.carrotStamina < 60) { if (window.spawnComicPop) window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 4, 0)), "*МАЛО СТАМИНЫ!*", "#ff2200"); return; }
            P._suitCdMap[4] = 8;
            if (typeof window.carrotEarthquake === "function") window.carrotEarthquake();
            if (window.__MP && window.__MP.room) window.__MP.room.send("pvp_ability", { type: "earthquake", radius: 40 });
          } else {
            if (P._suitCdMap[3] > 0) { if (window.spawnComicPop) window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 3, 0)), "*F КД " + P._suitCdMap[3].toFixed(1) + "с*", "#f9ca24"); return; }
            P._suitCdMap[3] = 8;
            if (typeof window.carrotRootBind === "function") window.carrotRootBind();
            if (window.__MP && window.__MP.room) window.__MP.room.send("pvp_ability", { type: "root_bind", radius: 22 });
          }
          return;
        }
        if (P.character === "banana") {
          if (P._suitCdMap[idx] > 0) { if (window.spawnComicPop) window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 3, 0)), "*F КД " + P._suitCdMap[idx].toFixed(1) + "с*", "#f9ca24"); return; }
          if (idx === 0) {
            P._suitCdMap[0] = 5;
            if (window.alliedTurrets) {
              for (let i = 0; i < 2; i++) {
                const g = new THREE.Group();
                g.position.copy(P.pos).add(new THREE.Vector3((i - 0.5) * 4, 0, 0));
                const b = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 2, 6),
                  window.createPrototypeShader(0x3f4650, 0x111111, 0));
                b.position.y = 1; g.add(b); S.add(g);
                window.alliedTurrets.push({ group: g, life: 15, cd: 0 });
              }
            }
            return;
          }
          if (idx === 1) {
            P._suitCdMap[1] = 4;
            if (window.SoundFX) window.SoundFX.whip();
            for (let k = -4; k <= 4; k++) {
              const a = P.camYaw + k * 0.15;
              const d = new THREE.Vector3(-Math.sin(a), 0, -Math.cos(a));
              const pj = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 6), new THREE.MeshBasicMaterial({ color: 0xf9ca24 }));
              pj.position.copy(P.pos).add(new THREE.Vector3(0, 2, 0));
              S.add(pj);
              window.projectiles.push({ mesh: pj, vel: new THREE.Vector3(d.x * 50, 0, d.z * 50), life: 1.5, fromPlayer: true, dmg: 60, radius: 2 });
            }
            return;
          }
          if (idx === 2) {
            P._suitCdMap[2] = 8;
            if (window.SoundFX) window.SoundFX.devastator();
            P.facingYaw = P.camYaw;
            const f = new THREE.Vector3(-Math.sin(P.facingYaw), 0, -Math.cos(P.facingYaw));
            P.durianRam = { timer: 0, speed: 60, dir: f, hitSet: new Set(), maxDur: 5.0 };
            if (window.spawnComicPop) window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 3, 0)), "ТАРАН!", "#78bd37");
            return;
          }
          if (idx === 3) {
            P._suitCdMap[3] = 1;
            P.activeModeF = !P.activeModeF;
            if (P.mesh && P.mesh.userData && P.mesh.userData.limeShield)
              P.mesh.userData.limeShield.visible = P.activeModeF;
            if (window.spawnComicPop) window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 3, 0)),
              P.activeModeF ? "ЩИТ ВКЛ" : "ЩИТ ВЫКЛ", "#00f2fe");
            return;
          }
          return;
        }
        if (window.PEPPER_MODE && P.pepperTBeamCd <= 0) {
          if (typeof window.releasePepperTBeam === "function") window.releasePepperTBeam();
          if (window.__MP && window.__MP.room) window.__MP.room.send("pvp_ability", { type: "hell_explosion", radius: 40 });
          return;
        }
        if (window.LEMON_MODE && P.lemonUltCd <= 0) {
          if (typeof window.lemonUltimate === "function") window.lemonUltimate();
          if (window.__MP && window.__MP.room) window.__MP.room.send("pvp_ability", { type: "ult_lemon", radius: 40 });
          return;
        }
        if (_origF) _origF.apply(this, arguments);
      };

      // ── 13. Танки ──
      if (typeof window.spawnCitrusAPC === "function") {
        const _origAPC = window.spawnCitrusAPC;
        window.spawnCitrusAPC = function (x, z) {
          _origAPC(x, z);
          const t = window.enemies[window.enemies.length - 1];
          if (t && t.type === "tank") {
            t.group.scale.set(1.8, 1.8, 1.8);
            t.radius = 6.8;
          }
        };
      }

      // ── 14. Опутывание сбивает летающих ──
      const _origRootBind = window.carrotRootBind;
      if (typeof _origRootBind === "function") {
        window.carrotRootBind = function () {
          _origRootBind.apply(this, arguments);
          for (let i = 0; i < window.enemies.length; i++) {
            const e = window.enemies[i];
            if (e.flying && e.group.position.distanceTo(P.pos) < 25) {
              e.flying = false; e.group.position.y = 0; e.vel.y = 0;
              if (window.spawnComicPop) window.spawnComicPop(e.group.position.clone().add(new THREE.Vector3(0, 2, 0)), "СБИТ!", "#2ecc71");
            }
          }
        };
      }

      // ── 15. Ярость Перца ──
      if (typeof window.addRage === "function") {
        const _origAddRage = window.addRage;
        window.addRage = function (amount) {
          if (window.PEPPER_MODE) { if (typeof window.addSpiciness === "function") window.addSpiciness(amount); return; }
          if (_origAddRage) _origAddRage.apply(this, arguments);
        };
      }

      // ── 16-17. Реестр тиков (картошка заполнит ниже) ──
      P._potatoArmor = 0; P._potatoHealCd = 0; P._potatoRageCd = 0;
      P._potatoRamCd = 0; P._potatoSauceCd = 0; P._potatoPortalCd = 0;
      P._potatoSlamCd = 0; P._potatoNovaCd = 0;
      if (P._tomatoRage === undefined) P._tomatoRage = 0;

      window.__V65_TICKS = window.__V65_TICKS || [];
      window.__V65_TICKS.push(function (dt) {
        if (P._potatoArmor > 0) P._potatoArmor -= dt;
        if (P._potatoHealCd > 0) P._potatoHealCd -= dt;
        if (P._potatoRageCd > 0) P._potatoRageCd -= dt;
        if (P._potatoRamCd > 0) P._potatoRamCd -= dt;
        if (P._potatoSauceCd > 0) P._potatoSauceCd -= dt;
        if (P._potatoPortalCd > 0) P._potatoPortalCd -= dt;
        if (P._potatoSlamCd > 0) P._potatoSlamCd -= dt;
        if (P._potatoNovaCd > 0) P._potatoNovaCd -= dt;
      });
      window.__V65_TICKS.push(window.__v65_tick_nano);
      window.__V65_TICKS.push(function (dt) { window.__v65_vineCd(dt); });
      window.__V65_TICKS.push(function (dt) {
        if (P._suitCdMap) {
          for (let i = 0; i < 5; i++) if (P._suitCdMap[i] > 0) P._suitCdMap[i] -= dt;
        }
      });
      window.__V65_TICKS.push(function () { window.__v65_fixCarrot(); });

      console.log("🍌 [v65.1] Часть 0 установлена — 17 фиксов v53.");
    } catch (e) {
      console.error("[v65.1] Часть 0 упала:", e);
    }
  });

  // ================================================================
  // ═══ ЧАСТЬ 1 — ЕДИНЫЙ ДИСПЕТЧЕР ═══
  // ================================================================
  whenReady(function () {
    const _origUpdate = window.updatePlayerChoreographyAndCamera;
    let _dispatcherAccumulator = 0;
    const _dispatcherInterval = 1 / 20;
    window.updatePlayerChoreographyAndCamera = function (dt, now) {
      if (_origUpdate) _origUpdate.apply(this, arguments);
      _dispatcherAccumulator += dt;
      if (_dispatcherAccumulator >= _dispatcherInterval) {
        const tickDt = _dispatcherAccumulator;
        _dispatcherAccumulator = 0;
        const ticks = window.__V65_TICKS || [];
        for (let i = 0; i < ticks.length; i++) {
          try { ticks[i](tickDt); } catch (e) {}
        }
      }
    };
    console.log("🍌 [v65.1] Часть 1 — единый диспетчер (20 Гц).");
  });

  // ================================================================
  // ═══ ЧАСТЬ 2 — МОРГЕНКАРТОШКА (Lathe + Extrude) ═══
  // ================================================================
  whenReady(function () {
    const P = window.player;
    const S = window.scene;

    // Утилиты
    window.__v65_utils = window.__v65_utils || {};
    window.__v65_utils.lathe = function (points, segs) {
      const v2 = points.map(function (p) { return new THREE.Vector2(p[0], p[1]); });
      return new THREE.LatheGeometry(v2, segs || 14);
    };
    window.__v65_utils.extrude = function (shape, depth, bevel) {
      depth = (depth === undefined) ? 0.5 : depth;
      bevel = (bevel === undefined) ? true : bevel;
      return new THREE.ExtrudeGeometry(shape, {
        depth: depth, bevelEnabled: bevel,
        bevelSegments: 2, bevelSize: 0.06, bevelThickness: 0.08,
        curveSegments: 6
      });
    };
    window.__v65_utils.outline = function (mesh, th) {
      if (typeof window.addInkOutline === "function") return window.addInkOutline(mesh, th || 1.045);
      return mesh;
    };

    // §16.1 — createPotatoMesh (полная, на Lathe + Extrude)
    window.__POTATO_MODE = false;
    window.__POTATO_FORM = 1;
    let potatoCombo = 0;
    let potatoComboTimer = 0;

    window.createPotatoMesh = function (form) {
      form = (form === 2) ? 2 : 1;
      const g = new THREE.Group();
      const pelvis = new THREE.Group(); pelvis.position.y = 1.65; g.add(pelvis);
      const spine = new THREE.Group(); pelvis.add(spine);
      const neck = new THREE.Group(); neck.position.y = 1.95; spine.add(neck);
      const headGroup = new THREE.Group(); headGroup.position.y = 0.4; neck.add(headGroup);
      const armL = new THREE.Group(); armL.position.set(-1.0, 1.55, 0); spine.add(armL);
      const armR = new THREE.Group(); armR.position.set(1.0, 1.55, 0); spine.add(armR);
      const legL = new THREE.Group(); legL.position.set(-0.35, 0, 0); pelvis.add(legL);
      const legR = new THREE.Group(); legR.position.set(0.35, 0, 0); pelvis.add(legR);

      let bodyMat, bellyMat, headMat, hairMat, armMat, legMat, accentMat, armorMat;
      const isMorg = (form === 1);
      if (isMorg) {
        bodyMat   = window.createPrototypeShader(0x8B0000, 0x3a0000, 7, 0xff5500);
        bellyMat  = window.createPrototypeShader(0xD2B48C, 0x8B7040, 4, 0xf9ca24);
        headMat   = window.createPrototypeShader(0xE8C4A0, 0xB88B5C, 4, 0xffdd99);
        hairMat   = window.createPrototypeShader(0x2A1A0F, 0x100800, 0);
        armMat    = window.createPrototypeShader(0x8B0000, 0x3a0000, 7, 0xff5500);
        legMat    = window.createPrototypeShader(0x2A2A2A, 0x0a0a0a, 9, 0x555555);
        accentMat = new THREE.MeshBasicMaterial({ color: 0xf9ca24 });
        armorMat  = window.createPrototypeShader(0x5a3a1a, 0x2a1a05, 7, 0xf9ca24);
      } else {
        bodyMat   = window.createPrototypeShader(0x4A0010, 0xff2200, 10, 0xff4400);
        bellyMat  = window.createPrototypeShader(0xFF2200, 0x8a0000, 10, 0xffaa00);
        headMat   = window.createPrototypeShader(0xFF0000, 0x8a0000, 10, 0xff4400);
        hairMat   = window.createPrototypeShader(0x0A0A0A, 0x000000, 0);
        armMat    = window.createPrototypeShader(0x4A0010, 0x8a0000, 10, 0xff4400);
        legMat    = window.createPrototypeShader(0x1A1A1A, 0x000000, 9, 0x555555);
        accentMat = new THREE.MeshBasicMaterial({ color: 0x00FF00 });
        armorMat  = window.createPrototypeShader(0x2a1a05, 0x110800, 7, 0x00ff66);
      }

      // Торс — Lathe (V-рельеф)
      const torsoPts = isMorg
        ? [[0.98, 0], [0.95, 0.20], [0.88, 0.50], [0.85, 0.85], [0.90, 1.15], [0.82, 1.40], [0.72, 1.55]]
        : [[0.92, 0], [0.90, 0.20], [0.85, 0.60], [0.88, 1.00], [0.82, 1.30], [0.70, 1.50]];
      const torso = new THREE.Mesh(window.__v65_utils.lathe(torsoPts, 16), bodyMat);
      window.__v65_utils.outline(torso, 1.04);
      torso.position.y = 0.35;
      spine.add(torso);

      // Клетчатая рубашка (Морген)
      if (isMorg) {
        for (let s = 0; s < 4; s++) {
          const stripeH = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: 0x000000 }));
          stripeH.position.set(0, 0.55 + s * 0.35, 0.86);
          spine.add(stripeH);
        }
        for (let sv = 0; sv < 3; sv++) {
          const stripeV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.06), new THREE.MeshBasicMaterial({ color: 0x000000 }));
          stripeV.position.set(-0.6 + sv * 0.6, 1.15, 0.86);
          spine.add(stripeV);
        }
        const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.98, 0.22, 16), armorMat);
        belt.position.y = 0.50;
        window.__v65_utils.outline(belt, 1.02);
        spine.add(belt);
        const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.30, 0.10), accentMat);
        buckle.position.set(0, 0.50, 0.95);
        spine.add(buckle);
      }

      // Живот
      const belly = new THREE.Mesh(new THREE.SphereGeometry(isMorg ? 0.85 : 0.90, 14, 12), bellyMat);
      belly.position.set(0, isMorg ? 1.20 : 1.10, 0.55);
      belly.scale.set(1.05, 0.95, 0.60);
      window.__v65_utils.outline(belly, 1.03);
      spine.add(belly);

      // Наплечники (Lathe)
      const pauldronPts = [[0.20, 0], [0.45, 0.10], [0.55, 0.35], [0.50, 0.55], [0.35, 0.60]];
      for (let s = -1; s <= 1; s += 2) {
        const pauld = new THREE.Mesh(window.__v65_utils.lathe(pauldronPts, 10), armorMat);
        pauld.position.set(s * 0.95, 1.55, 0);
        pauld.rotation.z = s * 0.40;
        window.__v65_utils.outline(pauld, 1.05);
        spine.add(pauld);
      }

      // Магматические жилы (Громтомат)
      if (!isMorg) {
        for (let i = 0; i < 6; i++) {
          const vein = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.25 + Math.random() * 0.25, 0.04),
            new THREE.MeshBasicMaterial({ color: 0xff8800 })
          );
          vein.position.set((Math.random() - 0.5) * 1.4, 0.6 + Math.random() * 0.7, 0.75);
          spine.add(vein);
        }
      }

      // Голова
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 14), headMat);
      head.position.y = 0.40;
      head.scale.set(1, 1.05, 1);
      window.__v65_utils.outline(head, 1.04);
      headGroup.add(head);

      if (isMorg) {
        for (let layer = 0; layer < 3; layer++) {
          const beard = new THREE.Mesh(
            new THREE.ConeGeometry(0.50 - layer * 0.10, 0.65 - layer * 0.10, 10),
            hairMat
          );
          beard.position.set(0, 0.05 - layer * 0.08, 0.48);
          beard.rotation.x = Math.PI;
          window.__v65_utils.outline(beard, 1.03);
          headGroup.add(beard);
        }
        const hairLong = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.85, 14), hairMat);
        hairLong.position.set(0, 0.68, -0.05);
        window.__v65_utils.outline(hairLong, 1.03);
        headGroup.add(hairLong);
        for (let s = -1; s <= 1; s += 2) {
          const eye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.06), new THREE.MeshBasicMaterial({ color: 0x000000 }));
          eye.position.set(s * 0.18, 0.45, 0.48);
          headGroup.add(eye);
        }
      } else {
        const hairShort = new THREE.Mesh(
          new THREE.SphereGeometry(0.60, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.60),
          hairMat
        );
        hairShort.position.set(0, 0.65, -0.02);
        headGroup.add(hairShort);
        const crest = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.55, 6), new THREE.MeshBasicMaterial({ color: 0xff4400 }));
        crest.position.set(0, 1.05, 0);
        crest.rotation.x = -0.15;
        headGroup.add(crest);
        for (let i = 0; i < 4; i++) {
          const vein = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.15 + Math.random() * 0.20, 0.03), new THREE.MeshBasicMaterial({ color: 0xff8800 }));
          vein.position.set((Math.random() - 0.5) * 0.40, 0.70 + Math.random() * 0.15, 0.40);
          headGroup.add(vein);
        }
        for (let s = -1; s <= 1; s += 2) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
          eye.position.set(s * 0.20, 0.45, 0.52);
          headGroup.add(eye);
          const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), new THREE.MeshBasicMaterial({ color: 0x000000 }));
          pupil.position.set(s * 0.20, 0.45, 0.62);
          headGroup.add(pupil);
        }
      }

      // Руки
      function buildArm(side, isRight) {
        const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.70, 10), armMat);
        upperArm.position.y = -0.35;
        window.__v65_utils.outline(upperArm, 1.04);
        side.add(upperArm);
        const elbow = new THREE.Group(); elbow.position.y = -0.70; side.add(elbow);
        const elbowBall = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), armorMat);
        window.__v65_utils.outline(elbowBall, 1.05);
        elbow.add(elbowBall);
        const foreArm = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.65, 10), armMat);
        foreArm.position.y = -0.32;
        window.__v65_utils.outline(foreArm, 1.04);
        elbow.add(foreArm);
        const wrist = new THREE.Group(); wrist.position.y = -0.65; elbow.add(wrist);

        if (isMorg) {
          if (isRight) {
            const handle = new THREE.Mesh(
              new THREE.CylinderGeometry(0.06, 0.06, 1.80, 8),
              new THREE.MeshStandardMaterial({ color: 0x5D4037 })
            );
            handle.position.y = -0.90;
            wrist.add(handle);
            const hammerShape = new THREE.Shape();
            hammerShape.moveTo(-0.40, -0.35);
            hammerShape.lineTo(0.40, -0.35);
            hammerShape.lineTo(0.55, 0.00);
            hammerShape.lineTo(0.40, 0.35);
            hammerShape.lineTo(-0.40, 0.35);
            hammerShape.lineTo(-0.55, 0.00);
            hammerShape.lineTo(-0.40, -0.35);
            const hammerGeo = window.__v65_utils.extrude(hammerShape, 0.85, true);
            const hammerHead = new THREE.Mesh(hammerGeo, armorMat);
            hammerHead.rotation.y = Math.PI / 2;
            hammerHead.position.y = -1.75;
            window.__v65_utils.outline(hammerHead, 1.05);
            wrist.add(hammerHead);
            for (let r = 0; r < 3; r++) {
              const rune = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.90), accentMat);
              rune.position.set(0, -1.75, -0.30 + r * 0.30);
              wrist.add(rune);
            }
            const runeGlow = new THREE.PointLight(0xf9ca24, 0.60, 4);
            runeGlow.position.y = -1.75;
            wrist.add(runeGlow);
          }
          const fist = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), headMat);
          fist.position.y = -0.08;
          window.__v65_utils.outline(fist, 1.04);
          wrist.add(fist);
        } else {
          const glove = new THREE.Mesh(
            new THREE.SphereGeometry(0.22, 10, 10),
            new THREE.MeshStandardMaterial({ color: 0x00aa00, emissive: 0x004400 })
          );
          glove.position.y = -0.08;
          window.__v65_utils.outline(glove, 1.05);
          wrist.add(glove);
          for (let sp = 0; sp < 4; sp++) {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 4), new THREE.MeshBasicMaterial({ color: 0x00ff66 }));
            spike.position.set((sp - 1.5) * 0.10, -0.05, 0.18);
            spike.rotation.x = -Math.PI / 2;
            wrist.add(spike);
          }
          const arc = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.015, 4, 8), new THREE.MeshBasicMaterial({ color: 0x00ffff }));
          arc.rotation.x = Math.PI / 2;
          wrist.add(arc);
        }
        return { shoulder: side, elbow: elbow, wrist: wrist };
      }
      const armLData = buildArm(armL, false);
      const armRData = buildArm(armR, true);

      // Ноги
      function buildLeg(side) {
        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.20, 0.85, 10), legMat);
        thigh.position.y = -0.42;
        window.__v65_utils.outline(thigh, 1.04);
        side.add(thigh);
        const knee = new THREE.Group(); knee.position.y = -0.85; side.add(knee);
        const kneeBall = new THREE.Mesh(new THREE.SphereGeometry(0.20, 8, 8), armorMat);
        window.__v65_utils.outline(kneeBall, 1.05);
        knee.add(kneeBall);
        const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.18, 0.85, 10), legMat);
        shin.position.y = -0.42;
        window.__v65_utils.outline(shin, 1.04);
        knee.add(shin);
        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.55), armorMat);
        boot.position.set(0, -0.90, 0.10);
        window.__v65_utils.outline(boot, 1.05);
        knee.add(boot);
        return { hip: side, knee: knee };
      }
      const legLData = buildLeg(legL);
      const legRData = buildLeg(legR);

      g.userData = {
        pelvis: pelvis, spine: spine, neck: neck, headGroup: headGroup,
        armL: armLData, armR: armRData, legL: legLData, legR: legRData,
        limeShield: null, backTentacles: null, isPotato: true,
        _leftWrist: armLData.wrist, _rightWrist: armRData.wrist
      };
      return g;
    };

    // §16.2 — getSuitData
    const _origGetSuitData = window.getSuitData;
    window.getSuitData = function () {
      if (window.__POTATO_MODE) {
        if (window.__POTATO_FORM === 1) {
          return { id: 'potato1', name: 'МОРГЕНКАРТОШКА', desc: 'Танк.',
            maxHp: 800, maxEn: 300, speed: 22, dmg: 90, canFly: false,
            level: 1, slashColor: 0x8B4513, quote: '' };
        }
        return { id: 'potato2', name: 'ГРОМТОМАТ', desc: 'Дамагер.',
          maxHp: 600, maxEn: 400, speed: 30, dmg: 70, canFly: false,
          level: 1, slashColor: 0xFF2200, quote: '' };
      }
      return _origGetSuitData ? _origGetSuitData.apply(this, arguments) : window.SUITS[P.suitIdx];
    };

    // §16.3 — PPA
    const _origPPA = window.performPrimaryAttack;
    window.performPrimaryAttack = function () {
      if (!window.__POTATO_MODE) { if (_origPPA) return _origPPA.apply(this, arguments); return; }
      if (P.isDead || P.consumeState || P.attackTimer > 0.08) return;
      if (potatoComboTimer <= 0) potatoCombo = 0;
      potatoComboTimer = 1.5;
      const fwd = new THREE.Vector3(-Math.sin(P.camYaw), 0, -Math.cos(P.camYaw));
      const isMorg = (window.__POTATO_FORM === 1);
      const maxCombo = isMorg ? 3 : 5;
      potatoCombo = (potatoCombo % maxCombo) + 1;
      const comboStep = (isMorg && potatoCombo === 3) ? 5 : potatoCombo;
      P.comboStep = comboStep;
      P.attackDuration = window.PLAYER_COMBO[comboStep].dur;
      P.attackTimer = P.attackDuration;
      P.comboResetTimer = 1.5;
      P.facingYaw = P.camYaw;
      P.vel.x += fwd.x * window.PLAYER_COMBO[comboStep].lunge;
      P.vel.z += fwd.z * window.PLAYER_COMBO[comboStep].lunge;
      const baseDmg = (window.__POTATO_FORM === 1) ? 90 : 70;
      const dmgMult = (potatoCombo === maxCombo) ? 2.5 : 1.0;
      const isFinisher = (potatoCombo === maxCombo);
      const chest = new THREE.Vector3(P.pos.x, P.pos.y + 2.3, P.pos.z);
      const slashColor = (window.__POTATO_FORM === 1) ? 0x8B4513 : 0xFF2200;
      if (typeof window.spawnSlashArc === "function") {
        window.spawnSlashArc(chest.clone().add(fwd.clone().multiplyScalar(1.7)),
          P.facingYaw, window.PLAYER_COMBO[comboStep].tilt,
          slashColor, isMorg ? 4.8 : 4.0, 0.2);
      }
      if (isFinisher) {
        if (isMorg) {
          if (typeof window.spawnGroundCrackRing === "function")
            window.spawnGroundCrackRing(new THREE.Vector3(P.pos.x + fwd.x * 3.5, 0, P.pos.z + fwd.z * 3.5), 0x8B4513, 10);
          window.SoundFX.devastator();
          window.triggerHitstopAndChroma(0.05, 0.6, 1.1);
        } else {
          const fireBall = new THREE.Mesh(new THREE.SphereGeometry(0.70, 10, 10), new THREE.MeshBasicMaterial({ color: 0xFF2200 }));
          fireBall.position.copy(chest);
          S.add(fireBall);
          window.projectiles.push({ mesh: fireBall, vel: new THREE.Vector3(fwd.x * 45, 0, fwd.z * 45), life: 1.5, fromPlayer: true, dmg: baseDmg * 2.5, radius: 3.0 });
          if (typeof window.spawnParticles === "function") window.spawnParticles(chest, 0xFF2200, 12);
          window.triggerHitstopAndChroma(0.05, 0.6, 1.1);
        }
      }
      window.SoundFX.swing(200 + potatoCombo * 50);
      let hr = isMorg ? 6.0 : 5.0;
      if (isFinisher) hr = isMorg ? 10 : 6.5;
      const hx = P.pos.x + fwd.x * 3.4, hz = P.pos.z + fwd.z * 3.4;
      for (let i = window.enemies.length - 1; i >= 0; i--) {
        const e = window.enemies[i];
        const dx = e.group.position.x - hx, dz = e.group.position.z - hz;
        if (dx * dx + dz * dz <= (hr + e.radius) * (hr + e.radius)) {
          const finalDmg = baseDmg * dmgMult;
          if (isFinisher && isMorg) e.vel.y = 18;
          window.damageEnemy(e, finalDmg, new THREE.Vector3(fwd.x * 3, 0, fwd.z * 3),
            isFinisher ? (isMorg ? '*ТЯЖЁЛЫЙ!' : '*ОГНЕННЫЙ ШАР!*') : '');
        }
      }
      if (window.__MP && window.__MP.room && window.__MP.remotes) {
        window.__MP.remotes.forEach(function (r, id) {
          const ddx = r.group.position.x - hx, ddz = r.group.position.z - hz;
          if (ddx * ddx + ddz * ddz <= (hr + 1) * (hr + 1)) {
            window.__MP.room.send('pvp', { targetId: id, damage: Math.round(baseDmg * dmgMult) });
          }
        });
      }
      if (typeof window.isLabOpen === "undefined" || !window.isLabOpen) {
        if (typeof window.checkCarDestruction === "function")
          window.checkCarDestruction(new THREE.Vector3(hx, 0, hz), hr);
      }
    };

    // §16.4 — performDevastator
    const _origDev = window.performDevastator;
    window.performDevastator = function () {
      if (!window.__POTATO_MODE) { if (_origDev) return _origDev.apply(this, arguments); return; }
      if (P.isDead || P.consumeState) return;
      if (window.__POTATO_FORM === 1) {
        if (P._potatoSlamCd > 0) return;
        P._potatoSlamCd = 4.0;
        P.vel.y = 22;
        window.SoundFX.whip();
        window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 3, 0)), '⚡ ГРОМОВОЙ МОЛОТ! ⚡', '#8B4513');
        setTimeout(function () {
          P.vel.y = -85;
          setTimeout(function () {
            window.spawnGroundCrackRing(P.pos, 0x8B4513, 18);
            window.spawnParticles(P.pos.clone().add(new THREE.Vector3(0, 1, 0)), 0x8B4513, 30);
            window.SoundFX.boom(); window.SoundFX.devastator();
            window.triggerHitstopAndChroma(0.12, 0.9, 1.4);
            if (typeof window.spawnLandingCrater === "function") window.spawnLandingCrater(P.pos, 5);
            for (let i = window.enemies.length - 1; i >= 0; i--) {
              const e = window.enemies[i];
              const d = e.group.position.distanceTo(P.pos);
              if (d < 14) {
                e.vel.y = Math.max(e.vel.y, 15);
                window.damageEnemy(e, 250 * (1 - d / 16), new THREE.Vector3(), '*ЗЕМЛЕТРЯСЕНИЕ!*');
              }
            }
            if (window.__MP && window.__MP.room)
              window.__MP.room.send('pvp_ability', { type: 'potato_slam', radius: 14, damage: 250 });
          }, 300);
        }, 400);
      } else {
        if (P._potatoNovaCd > 0) return;
        P._potatoNovaCd = 5.0;
        window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 3, 0)), '🔥 СВЕРХНОВА! 🔥', '#FF2200');
        window.SoundFX.devastator(); window.SoundFX.boom();
        window.triggerHitstopAndChroma(0.10, 0.8, 1.3);
        window.spawnGroundCrackRing(P.pos, 0xFF2200, 14);
        window.spawnParticles(P.pos.clone().add(new THREE.Vector3(0, 2, 0)), 0xFF2200, 40);
        const hasKetchup = window.__EVO && window.__EVO.potato_ketchup;
        for (let j = window.enemies.length - 1; j >= 0; j--) {
          const en = window.enemies[j];
          const dist = en.group.position.distanceTo(P.pos);
          if (dist < 14) {
            en.vel.y = Math.max(en.vel.y, 12);
            window.damageEnemy(en, 300 * (1 - dist / 16), new THREE.Vector3(), '*ВЗРЫВ!*');
            if (hasKetchup) {
              en._ketchupSlow = 2.5;
              en._ketchupDetonate = performance.now() + 2000;
              en._ketchupPos = en.group.position.clone();
            }
          }
        }
        if (window.__MP && window.__MP.room)
          window.__MP.room.send('pvp_ability', { type: 'tomato_nova', radius: 14, damage: 300 });
      }
    };

    // §16.5 — triggerUniqueAbilityF
    const _origF = window.triggerUniqueAbilityF;
    window.triggerUniqueAbilityF = function () {
      if (!window.__POTATO_MODE) { if (_origF) return _origF.apply(this, arguments); return; }
      if (P.isDead) return;
      if (window.__POTATO_FORM === 1) {
        if (P._potatoRamCd > 0) return;
        P._potatoRamCd = 6.0;
        const fwd = new THREE.Vector3(-Math.sin(P.camYaw), 0, -Math.cos(P.camYaw));
        P.vel.x += fwd.x * 180;
        P.vel.z += fwd.z * 180;
        P.dodgeIframes = 0.6;
        window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 3, 0)), '💥 ТАРАН! 💥', '#8B4513');
        window.SoundFX.devastator();
        const hasJugg = window.__EVO && window.__EVO.potato_juggernaut;
        if (hasJugg) {
          for (let tr = 0; tr < 6; tr++) {
            (function (delay) {
              setTimeout(function () {
                if (!P.mesh) return;
                const tp = P.pos.clone();
                const trail = new THREE.Mesh(
                  new THREE.CylinderGeometry(1.5, 1.5, 0.20, 8),
                  new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.70 })
                );
                trail.position.set(tp.x, 0.10, tp.z);
                S.add(trail);
                for (let e = window.enemies.length - 1; e >= 0; e--) {
                  const en = window.enemies[e];
                  if (en.group.position.distanceTo(tp) < 2.5)
                    window.damageEnemy(en, 40, new THREE.Vector3(), '*ОГНЕННЫЙ СЛЕД*');
                }
                setTimeout(function () { S.remove(trail); trail.geometry.dispose(); trail.material.dispose(); }, 5000);
              }, delay);
            })(tr * 120);
          }
        }
        setTimeout(function () {
          for (let i = window.enemies.length - 1; i >= 0; i--) {
            const e = window.enemies[i];
            if (e.group.position.distanceTo(P.pos) < 8) {
              e.vel.y = Math.max(e.vel.y, 18);
              window.damageEnemy(e, 180, fwd.clone().multiplyScalar(8), '*ТАРАН!*');
            }
          }
        }, 200);
        if (window.__MP && window.__MP.room)
          window.__MP.room.send('pvp_ability', { type: 'potato_ram', radius: 8, damage: 180 });
      } else {
        if (P._potatoSauceCd > 0) return;
        P._potatoSauceCd = 3.0;
        const fwd2 = new THREE.Vector3(-Math.sin(P.camYaw), 0, -Math.cos(P.camYaw));
        window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 3, 0)), '🍅 СТРУЯ СОУСА! 🍅', '#FF2200');
        const hasKetchup = window.__EVO && window.__EVO.potato_ketchup;
        for (let step = 1; step < 16; step++) {
          (function (s) {
            setTimeout(function () {
              const pp = P.pos.clone().add(fwd2.clone().multiplyScalar(s));
              window.spawnParticles(pp, 0xCC0000, 4);
              for (let i = window.enemies.length - 1; i >= 0; i--) {
                const e = window.enemies[i];
                if (e.group.position.distanceTo(pp) < 3) {
                  window.damageEnemy(e, 25, fwd2.clone(), '');
                  if (hasKetchup) {
                    e._ketchupSlow = 2.5;
                    e._ketchupDetonate = performance.now() + 2000;
                    e._ketchupPos = e.group.position.clone();
                  }
                }
              }
            }, s * 30);
          })(step);
        }
        if (window.__MP && window.__MP.room)
          window.__MP.room.send('pvp_ability', { type: 'tomato_sauce', radius: 15, damage: 100 });
      }
    };

    // §16.6 — C
    window.addEventListener('keydown', function (e) {
      if (e.code !== 'KeyC' || !window.__POTATO_MODE) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      if (P.isDead) return;
      if (window.__POTATO_FORM === 1) {
        if (P._potatoHealCd > 0) return;
        P._potatoHealCd = 10.0;
        P.hp = Math.min(P.maxHp, P.hp + 250);
        P._potatoArmor = 4.0;
        P.rooted = 1.0;
        window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 3, 0)), '🌱 ПИТАНИЕ КОРНЕЙ (+250 HP)', '#2ecc71');
        window.spawnGroundCrackRing(P.pos, 0x2ecc71, 8);
        window.spawnParticles(P.pos.clone().add(new THREE.Vector3(0, 1, 0)), 0x2ecc71, 20);
        window.SoundFX.hit(150, 0.3);
        if (window.__MP && window.__MP.room)
          window.__MP.room.send('pvp_ability', { type: 'potato_heal' });
      } else {
        if (P._potatoRageCd > 0) return;
        P._potatoRageCd = 12.0;
        P._tomatoRage = 6.0;
        window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 3, 0)), '🔥 ИСПЫТАНИЕ ПЛАМЕНЕМ', '#FF4400');
        window.spawnParticles(P.pos.clone().add(new THREE.Vector3(0, 2, 0)), 0xFF4400, 25);
        window.SoundFX.devastator();
        if (window.__MP && window.__MP.room)
          window.__MP.room.send('pvp_ability', { type: 'tomato_rage' });
      }
    }, true);

    // §16.7 — T (портал)
    window.addEventListener('keydown', function (e) {
      if (e.code !== 'KeyT' || !window.__POTATO_MODE) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      if (P.isDead || window.__POTATO_FORM !== 2) return;
      if (P._potatoPortalCd > 0) return;
      P._potatoPortalCd = 30.0;
      let bestE = null, bestD = 9999;
      for (let i = 0; i < window.enemies.length; i++) {
        const d = P.pos.distanceTo(window.enemies[i].group.position);
        if (d < bestD) { bestD = d; bestE = window.enemies[i]; }
      }
      if (bestE) {
        P.pos.copy(bestE.group.position).add(new THREE.Vector3(0, 0, 4));
        P.vel.set(0, 0, 0);
        window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 3, 0)), '🍅 ТОМАТНЫЙ ПОРТАЛ!', '#FF2200');
        window.spawnParticles(P.pos.clone(), 0xFF2200, 20);
        window.SoundFX.whip();
        if (window.__MP && window.__MP.room) {
          window.__MP.room.send('mv', { x: P.pos.x, y: P.pos.y, z: P.pos.z, ry: P.facingYaw || 0, anim: 0 });
        }
      } else {
        P._potatoPortalCd = 0;
        window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 3, 0)), 'НЕТ ЦЕЛЕЙ', '#888888');
      }
    }, true);

    // §16.8 — R
    window.addEventListener('keydown', function (e) {
      if (e.code !== 'KeyR' || !window.__POTATO_MODE) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      if (P.isDead) return;
      window.switchPotatoForm(window.__POTATO_FORM === 1 ? 2 : 1);
    }, true);

    // §16.9 — 1 / 2
    window.addEventListener('keydown', function (e) {
      if (!window.__POTATO_MODE) return;
      if (e.code === 'Digit1' || e.code === 'Numpad1') {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        if (window.__POTATO_FORM !== 1) window.switchPotatoForm(1);
      }
      if (e.code === 'Digit2' || e.code === 'Numpad2') {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        if (window.__POTATO_FORM !== 2) window.switchPotatoForm(2);
      }
    }, true);

    // §16.10 — switchPotatoForm
    function switchPotatoForm(form) {
      window.__POTATO_FORM = form;
      P.maxHp = (form === 1) ? 800 : 600;
      P.hp = Math.min(P.hp, P.maxHp);
      if (typeof window.rebuildHeroMesh === "function") window.rebuildHeroMesh();
      window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 3, 0)),
        form === 1 ? '🥔 МОРГЕН' : '🍅 ГРОМТОМАТ',
        form === 1 ? '#8B4513' : '#FF2200');
      window.SoundFX.devastator();
      window.triggerHitstopAndChroma(0.08, 0.5, 1.1);
      if (window.__EVO && window.__EVO.potato_juggernaut) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(1, 12, 24),
          new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.80, side: THREE.DoubleSide })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.copy(P.pos);
        S.add(ring);
        let rt = 0;
        (function anim() {
          rt += 0.05;
          ring.scale.setScalar(1 + rt * 3);
          ring.material.opacity = Math.max(0, 0.80 * (1 - rt));
          if (rt < 1) requestAnimationFrame(anim);
          else { S.remove(ring); ring.geometry.dispose(); ring.material.dispose(); }
        })();
        for (let i = window.enemies.length - 1; i >= 0; i--) {
          const e = window.enemies[i];
          if (e.group.position.distanceTo(P.pos) < 12) {
            e.vel.y = Math.max(e.vel.y, 14);
            window.damageEnemy(e, 100, new THREE.Vector3(0, 8, 0), '*УДАРНАЯ ВОЛНА*');
          }
        }
      }
      if (window.__MP && window.__MP.room)
        window.__MP.room.send('charState', { char: 'potato', potatoForm: form });
    }
    window.switchPotatoForm = switchPotatoForm;

    // §16.11 — rebuildHeroMesh
    const _origRebuild = window.rebuildHeroMesh;
    window.rebuildHeroMesh = function () {
      if (window.__POTATO_MODE) {
        if (P.mesh && window.playerGroup.children.indexOf(P.mesh) >= 0)
          window.playerGroup.remove(P.mesh);
        P.mesh = window.createPotatoMesh(window.__POTATO_FORM);
        window.playerGroup.add(P.mesh);
        const hotbar = document.getElementById('suit-hotbar');
        if (hotbar) hotbar.style.display = 'none';
        const evo = document.getElementById('pepper-evo-panel');
        if (evo) evo.classList.remove('active');
        if (typeof window.Companion !== 'undefined' && window.Companion.group)
          window.Companion.group.visible = false;
        return;
      }
      if (_origRebuild) return _origRebuild.apply(this, arguments);
    };

    // §16.12 — equipPotato
    window.equipPotato = function () {
      window.__POTATO_MODE = true;
      window.__POTATO_FORM = 1;
      P.character = 'potato';
      P.suitIdx = 4;
      window.PEPPER_MODE = false;
      window.CARROT_MODE = false;
      window.LEMON_MODE = false;
      window.CARROT_FORM = 1;
      window.playerGroup.scale.set(1, 1, 1);
      P.maxHp = 800; P.hp = 800;
      P.maxEn = 300; P.en = 300;
      P._potatoArmor = 0;
      P._potatoHealCd = 0; P._potatoRageCd = 0; P._potatoRamCd = 0;
      P._potatoSauceCd = 0; P._potatoPortalCd = 0;
      P._potatoSlamCd = 0; P._potatoNovaCd = 0;
      if (typeof window.rebuildHeroMesh === "function") window.rebuildHeroMesh();
      const badge = document.querySelector('.suit-badge');
      if (badge) badge.innerText = '🥔 МОРГЕНКАРТОШКА';
      const rageLbl = document.querySelector('.rage-wrap .bar-label span');
      if (rageLbl) rageLbl.innerText = '🛡️ БРОНЯ / ЯРОСТЬ';
      const powers = document.getElementById('ui-powers-desc');
      if (powers) powers.innerHTML = '<b>ЛКМ:</b> 3-Hit (3-й AoE) | <b>Q:</b> Прыжок-молот | <b>C:</b> Лечение+броня | <b>F:</b> Таран | <b>R:</b> Форма';
      if (typeof window.Companion !== 'undefined' && window.Companion.group)
        window.Companion.group.visible = false;
      const hotbar = document.getElementById('suit-hotbar');
      if (hotbar) hotbar.style.display = 'none';
      const evo = document.getElementById('pepper-evo-panel');
      if (evo) evo.classList.remove('active');
      if (window.heroAuraLight) window.heroAuraLight.color.setHex(0x8B4513);
      if (typeof window.updateHUD === "function") window.updateHUD();
      if (typeof window.updateScoreDisplay === "function") window.updateScoreDisplay();
      if (window.__MP && window.__MP.room)
        window.__MP.room.send('charState', { char: 'potato', potatoForm: 1 });
      window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 3, 0)), '🥔 МОРГЕНКАРТОШКА', '#8B4513');
      window.SoundFX.devastator();
      window.triggerHitstopAndChroma(0.08, 0.5, 1.1);
    };

    // §16.13 — startGameSession
    const _origStartGameSession = window.startGameSession;
    window.startGameSession = function (loaded) {
      if (P.character === 'potato') {
        window.SoundFX.init();
        window.gameStarted = true;
        P.runStartTime = performance.now();
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('char-select').style.display = 'none';
        window.ignoreNextMouseFrames = 2;
        try { if (window.canvas && window.canvas.requestPointerLock) window.canvas.requestPointerLock(); } catch (e) {}
        if (typeof window.Mutations !== 'undefined' && window.Mutations.applyAll) window.Mutations.applyAll();
        if (loaded) {
          P.score = loaded.score || 0;
          P.wave = loaded.wave || 1;
          P.ep = loaded.ep || 350;
          if (loaded.mutations && typeof window.Mutations !== 'undefined')
            window.Mutations.owned = loaded.mutations;
        }
        window.equipPotato();
        if (typeof window.updateScoreDisplay === "function") window.updateScoreDisplay();
        if (typeof window.updateCompanionHUD === "function") window.updateCompanionHUD();
        if (typeof window.updateRageHUD === "function") window.updateRageHUD();
        if (typeof window.updateDashHUD === "function") window.updateDashHUD();
        setTimeout(function () {
          const el = document.getElementById('ui-shrek-msg');
          if (el) el.innerText = 'Моргенкартошка: «Молот земли!»';
        }, 300);
        return;
      }
      if (_origStartGameSession) return _origStartGameSession.apply(this, arguments);
    };

    // §16.14 — кнопка в меню
    const _btnSetup = function () {
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
        P.character = 'potato';
        document.getElementById('char-select').style.display = 'none';
        window.startGameSession(window.__pendingLoad || null);
      });
      grid.appendChild(card);
    };
    let _btnCheckAccum = 0;
    window.__V65_TICKS.push(function (dt) {
      _btnCheckAccum += dt;
      if (_btnCheckAccum >= 0.30) { _btnCheckAccum = 0; _btnSetup(); }
    });

    // §16.15 — updateExecPrompt
    const _origExecPrompt = window.updateExecPrompt;
    if (typeof _origExecPrompt === 'function') {
      window.updateExecPrompt = function () {
        if (window.__POTATO_MODE) {
          const el = document.getElementById('exec-prompt');
          if (el) el.style.display = 'none';
          return;
        }
        return _origExecPrompt.apply(this, arguments);
      };
    }

    // §16.16 — блокировка HUD
    let _hudBlockAccum = 0;
    window.__V65_TICKS.push(function (dt) {
      if (!window.__POTATO_MODE) return;
      _hudBlockAccum += dt;
      if (_hudBlockAccum < 0.50) return;
      _hudBlockAccum = 0;
      const sh = document.getElementById('shrekich-monitor'); if (sh) sh.style.display = 'none';
      const comp = document.getElementById('companion-panel'); if (comp) comp.style.display = 'none';
      const rp = document.getElementById('rocket-panel'); if (rp) rp.style.display = 'none';
      const hb = document.getElementById('suit-hotbar'); if (hb) hb.style.display = 'none';
    });

    // §17 — Фразы / Toast / голос
    const POTATO_IDLE_PHRASES = {
      morg: ['«Молот земли — тяжесть моя.»', '«Ты не сдвинешь гору с места.»', '«Картофельный корень — крепче стали.»', '«Готов растоптать всех.»', '«Пузо — щит, борода — молот.»', '«Сырая земля — моя броня.»'],
      tomato: ['«Огонь в крови, молнии в венах.»', '«Томатный сок — лучшее топливо.»', '«Готов сжечь этот город.»', '«Солнечный заряд — к бою!»', '«Халапеньо — мой брат по духу.»', '«Перчатки зелёные — стиль бойца.»']
    };
    const POTATO_ABILITY_LABELS = {
      morg: {
        combo3: { text: '🔨 ТЯЖЁЛЫЙ УДАР!', color: '#8B4513' },
        slam: { text: '⚡ ГРОМОВОЙ МОЛОТ!', color: '#8B4513' },
        heal: { text: '🌱 ПИТАНИЕ КОРНЕЙ (+250 HP)', color: '#2ecc71' },
        ram: { text: '💥 КАРТОФЕЛЬНЫЙ ТАРАН!', color: '#8B4513' },
        form2: { text: '🍅 ФОРМА: ГРОМТОМАТ', color: '#FF2200' }
      },
      tomato: {
        combo5: { text: '🔥 ОГНЕННЫЙ ШАР!', color: '#FF2200' },
        nova: { text: '💥 СВЕРХНОВА!', color: '#FF2200' },
        rage: { text: '🌶️ ИСПЫТАНИЕ ПЛАМЕНЕМ (ЯРОСТЬ 6с)', color: '#FF4400' },
        sauce: { text: '🍅 СТРУЯ СОУСА!', color: '#CC0000' },
        portal: { text: '🌀 ТОМАТНЫЙ ПОРТАЛ!', color: '#FF2200' },
        form1: { text: '🥔 ФОРМА: МОРГЕН', color: '#8B4513' }
      }
    };
    let _potatoToastEl = null, _potatoToastTimer = null, _potatoToastActive = false;
    function ensurePotatoToast() {
      if (_potatoToastEl) return _potatoToastEl;
      _potatoToastEl = document.createElement('div');
      _potatoToastEl.id = 'potato-toast';
      _potatoToastEl.style.cssText = 'position:fixed;top:110px;right:16px;z-index:147;min-width:220px;max-width:380px;padding:10px 14px;background:rgba(20,10,4,.97);border:3px solid #000;outline:3px solid #8B4513;color:#fff;font:900 14px Rubik,sans-serif;letter-spacing:1px;text-align:right;border-radius:4px;box-shadow:0 0 24px rgba(139,69,19,.6),5px 5px 0 #000;transform:translateX(430px);opacity:0;transition:all .32s cubic-bezier(.2,1.4,.4,1);pointer-events:none;text-shadow:2px 2px 0 #000;';
      document.body.appendChild(_potatoToastEl);
      return _potatoToastEl;
    }
    function flashPotatoAbility(text, color) {
      if (!window.__POTATO_MODE) return;
      const el = ensurePotatoToast();
      el.textContent = text;
      el.style.outlineColor = color || '#8B4513';
      el.style.borderColor = color || '#000';
      el.style.transform = 'translateX(0)';
      el.style.opacity = '1';
      _potatoToastActive = true;
      clearTimeout(_potatoToastTimer);
      _potatoToastTimer = setTimeout(function () {
        el.style.transform = 'translateX(430px)';
        el.style.opacity = '0';
        _potatoToastActive = false;
      }, 2200);
    }
    function setPotatoIdlePhrase() {
      if (!window.__POTATO_MODE) return;
      if (_potatoToastActive) return;
      const el = document.getElementById('ui-shrek-msg');
      if (!el) return;
      const form = window.__POTATO_FORM;
      const pool = (form === 1) ? POTATO_IDLE_PHRASES.morg : POTATO_IDLE_PHRASES.tomato;
      const prefix = (form === 1) ? 'Морген' : 'Громтомат';
      el.innerText = prefix + ': ' + pool[Math.floor(Math.random() * pool.length)];
    }
    function updatePotatoHUDHeader() {
      if (!window.__POTATO_MODE) return;
      const headerSpan = document.querySelector('.shrek-header span:first-child');
      if (headerSpan) headerSpan.innerText = '🥔 ДУХ КАРТОФЕЛЯ';
      const voiceToggle = document.getElementById('voice-toggle');
      if (voiceToggle) voiceToggle.style.display = 'none';
    }
    const _origSay = window.sayShrekich;
    window.sayShrekich = function (text, silent) {
      if (window.__POTATO_MODE) {
        const el = document.getElementById('ui-shrek-msg');
        if (el) el.innerText = text;
        return;
      }
      if (_origSay) return _origSay.apply(this, arguments);
    };
    if (typeof window.ShrekichVoice !== 'undefined' && window.ShrekichVoice.speak) {
      const _origSpeak = window.ShrekichVoice.speak;
      window.ShrekichVoice.speak = function (text) {
        if (window.__POTATO_MODE) return;
        return _origSpeak.apply(this, arguments);
      };
    }
    const _origEquipPotatoV2 = window.equipPotato;
    window.equipPotato = function () {
      const r = _origEquipPotatoV2.apply(this, arguments);
      setTimeout(function () { updatePotatoHUDHeader(); setPotatoIdlePhrase(); }, 60);
      return r;
    };
    let _idleAccum = 0;
    window.__V65_TICKS.push(function (dt) {
      if (!window.__POTATO_MODE) return;
      _idleAccum += dt;
      if (_idleAccum < 9.0) return;
      _idleAccum = 0;
      updatePotatoHUDHeader();
      setPotatoIdlePhrase();
    });
    const _origSwitchV2 = window.switchPotatoForm;
    if (typeof _origSwitchV2 === 'function') {
      window.switchPotatoForm = function (form) {
        _origSwitchV2.apply(this, arguments);
        setTimeout(function () {
          if (form === 1) {
            flashPotatoAbility(POTATO_ABILITY_LABELS.morg.form1.text, POTATO_ABILITY_LABELS.morg.form1.color);
            const el = document.getElementById('ui-shrek-msg');
            if (el) el.innerText = 'Морген: «Пора сокрушить.»';
          } else {
            flashPotatoAbility(POTATO_ABILITY_LABELS.tomato.form1.text, POTATO_ABILITY_LABELS.tomato.form1.color);
            const el = document.getElementById('ui-shrek-msg');
            if (el) el.innerText = 'Громтомат: «Огонь в крови!»';
          }
        }, 30);
      };
    }
    const _origPPAV2 = window.performPrimaryAttack;
    window.performPrimaryAttack = function () {
      if (!window.__POTATO_MODE) { if (_origPPAV2) return _origPPAV2.apply(this, arguments); return; }
      const beforeCombo = (typeof potatoCombo === 'number') ? potatoCombo : 0;
      const maxCombo = (window.__POTATO_FORM === 1) ? 3 : 5;
      const nextCombo = (beforeCombo % maxCombo) + 1;
      if (_origPPAV2) _origPPAV2.apply(this, arguments);
      if (nextCombo === maxCombo) {
        if (window.__POTATO_FORM === 1) flashPotatoAbility(POTATO_ABILITY_LABELS.morg.combo3.text, POTATO_ABILITY_LABELS.morg.combo3.color);
        else flashPotatoAbility(POTATO_ABILITY_LABELS.tomato.combo5.text, POTATO_ABILITY_LABELS.tomato.combo5.color);
      }
    };
    const _origDevV2 = window.performDevastator;
    window.performDevastator = function () {
      if (!window.__POTATO_MODE) { if (_origDevV2) return _origDevV2.apply(this, arguments); return; }
      if (window.__POTATO_FORM === 1) flashPotatoAbility(POTATO_ABILITY_LABELS.morg.slam.text, POTATO_ABILITY_LABELS.morg.slam.color);
      else flashPotatoAbility(POTATO_ABILITY_LABELS.tomato.nova.text, POTATO_ABILITY_LABELS.tomato.nova.color);
      if (_origDevV2) return _origDevV2.apply(this, arguments);
    };
    const _origFV2 = window.triggerUniqueAbilityF;
    window.triggerUniqueAbilityF = function () {
      if (!window.__POTATO_MODE) { if (_origFV2) return _origFV2.apply(this, arguments); return; }
      if (window.__POTATO_FORM === 1) flashPotatoAbility(POTATO_ABILITY_LABELS.morg.ram.text, POTATO_ABILITY_LABELS.morg.ram.color);
      else flashPotatoAbility(POTATO_ABILITY_LABELS.tomato.sauce.text, POTATO_ABILITY_LABELS.tomato.sauce.color);
      if (_origFV2) return _origFV2.apply(this, arguments);
    };
    window.addEventListener('keydown', function (e) {
      if (e.code !== 'KeyC' || !window.__POTATO_MODE) return;
      if (P.isDead) return;
      if (window.__POTATO_FORM === 1) flashPotatoAbility(POTATO_ABILITY_LABELS.morg.heal.text, POTATO_ABILITY_LABELS.morg.heal.color);
      else flashPotatoAbility(POTATO_ABILITY_LABELS.tomato.rage.text, POTATO_ABILITY_LABELS.tomato.rage.color);
    }, true);
    window.addEventListener('keydown', function (e) {
      if (e.code !== 'KeyT' || !window.__POTATO_MODE) return;
      if (window.__POTATO_FORM !== 2) return;
      if (P.isDead || P._potatoPortalCd > 0) return;
      flashPotatoAbility(POTATO_ABILITY_LABELS.tomato.portal.text, POTATO_ABILITY_LABELS.tomato.portal.color);
    }, true);
    const _origDamageV2 = window.applyDamageToHero;
    window.applyDamageToHero = function (dmg) {
      if (window.__POTATO_MODE && P.isDead) {
        if (_potatoToastEl) {
          _potatoToastEl.style.opacity = '0';
          _potatoToastEl.style.transform = 'translateX(430px)';
        }
      }
      return _origDamageV2.apply(this, arguments);
    };
    window.__V65_TICKS.push(function (dt) {
      if (potatoComboTimer > 0) {
        potatoComboTimer -= dt;
        if (potatoComboTimer <= 0) potatoCombo = 0;
      }
      if (window.__POTATO_MODE && window.__POTATO_FORM === 2 && P._tomatoRage > 0) {
        P._tomatoRage -= dt;
        if (Math.random() < dt * 4) {
          window.spawnParticles(
            P.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 1, (Math.random() - 0.5) * 2)),
            0xFF2200, 1
          );
        }
      }
    });

    console.log("🍌 [v65.1] Часть 2 установлена — Lathe/Extrude Моргенкартошка.");
  });

  // ═══ КОНЕЦ ЧАСТИ 2 — ПРОДОЛЖЕНИЕ В ОТВЕТЕ B ═══
  // Сюда вставляется ОТВЕТ B: Части 3, 4, 5.
  // Затем ОТВЕТ C: Части 6, 7, 8 и закрывающий })();
   // ================================================================
  // ═══ ЧАСТЬ 3 — BATTLE DAMAGE + АНАТОМИЯ ВРАГОВ ═══
  // ================================================================
  whenReady(function () {
    const P = window.player;
    const S = window.scene;
    const U = window.__v65_utils;

    // Реестр обломков
    window.__V65_DEBRIS = window.__V65_DEBRIS || [];

    // §3.1 — HOOK spawnCitrusSoldier: детали снайпера/щитовика/медика/камикадзе
    const _origSpawnCitrusSoldier = window.spawnCitrusSoldier;
    if (typeof _origSpawnCitrusSoldier === "function") {
      window.spawnCitrusSoldier = function (x, z, role) {
        _origSpawnCitrusSoldier.apply(this, arguments);
        const en = window.enemies[window.enemies.length - 1];
        if (!en || !en.group) return;

        // Снайпер — красный лазерный прицел
        if (en._sniper) {
          const positions = new Float32Array([0, 3.6, 0, 0, 3.6, 60]);
          const laserGeo = new THREE.BufferGeometry();
          laserGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
          const laserMat = new THREE.LineBasicMaterial({
            color: 0xff0000, transparent: true, opacity: 0.55, depthWrite: false
          });
          const laser = new THREE.Line(laserGeo, laserMat);
          en.group.add(laser);
          en._sniperLaser = laser;
        }

        // Щитовик — энергетический гексагональный барьер
        if (en._shield) {
          const hexBarrier = new THREE.Mesh(
            new THREE.CylinderGeometry(1.60, 1.60, 3.0, 6, 1, true),
            new THREE.MeshBasicMaterial({
              color: 0x00f2fe, transparent: true, opacity: 0.35,
              wireframe: true, side: THREE.DoubleSide, depthWrite: false
            })
          );
          hexBarrier.position.set(-1.20, 2.20, 0.50);
          en.group.add(hexBarrier);
          en._hexBarrier = hexBarrier;
          const coreGlow = new THREE.Mesh(
            new THREE.SphereGeometry(0.30, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.60 })
          );
          coreGlow.position.copy(hexBarrier.position);
          en.group.add(coreGlow);
          en._hexCore = coreGlow;
        }

        // Медик — парящий мед-дрон
        if (en._medic) {
          const drone = new THREE.Group();
          const droneBody = new THREE.Mesh(
            new THREE.SphereGeometry(0.30, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0x00ff66 })
          );
          drone.add(droneBody);
          for (let rot = 0; rot < 4; rot++) {
            const rotor = new THREE.Mesh(
              new THREE.BoxGeometry(0.35, 0.02, 0.06),
              new THREE.MeshBasicMaterial({ color: 0x00ff66, transparent: true, opacity: 0.70 })
            );
            const a = (rot / 4) * Math.PI * 2;
            rotor.position.set(Math.cos(a) * 0.28, 0.10, Math.sin(a) * 0.28);
            rotor.rotation.y = a;
            drone.add(rotor);
          }
          drone.position.set(0, 4.0, 0);
          en.group.add(drone);
          en._medDrone = drone;
        }

        // Камикадзе — мигающие бочки на спине
        if (en._kamikaze) {
          const barrelPack = new THREE.Group();
          for (let b = 0; b < 4; b++) {
            const barrel = new THREE.Mesh(
              new THREE.CylinderGeometry(0.18, 0.18, 0.55, 8),
              new THREE.MeshBasicMaterial({ color: 0xeb2f06 })
            );
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(
              (b % 2 === 0 ? -1 : 1) * 0.30,
              1.8 + Math.floor(b / 2) * 0.42,
              -0.55
            );
            barrelPack.add(barrel);
            const light = new THREE.Mesh(
              new THREE.SphereGeometry(0.06, 4, 4),
              new THREE.MeshBasicMaterial({ color: 0xff2200 })
            );
            light.position.copy(barrel.position);
            light.position.y += 0.25;
            barrelPack.add(light);
            if (b === 0) en._blinkLight = light;
          }
          en.group.add(barrelPack);
          en._barrelPack = barrelPack;
        }
      };
    }

    // §3.2 — HOOK spawnCitrusAPC: колёса + отдача ствола
    const _origSpawnAPC = window.spawnCitrusAPC;
    if (typeof _origSpawnAPC === "function") {
      window.spawnCitrusAPC = function (x, z) {
        _origSpawnAPC.apply(this, arguments);
        const en = window.enemies[window.enemies.length - 1];
        if (!en || en.type !== "tank" || !en.group) return;
        const wheels = [];
        en.group.traverse(function (o) {
          if (o.geometry && o.geometry.type === "CylinderGeometry" &&
              o.rotation && Math.abs(o.rotation.z - Math.PI / 2) < 0.01) {
            wheels.push(o);
          }
        });
        en._wheels = wheels;
        en._turretKickback = 0;
        en.group.traverse(function (o) {
          if (o.geometry && o.geometry.type === "CylinderGeometry" &&
              o.rotation && Math.abs(o.rotation.x - Math.PI / 2) < 0.01) {
            en._barrel = o;
          }
        });
      };
    }

    // §3.3 — HOOK spawnCitrusHeli: хвостовой винт + неон днища
    const _origSpawnHeli = window.spawnCitrusHeli;
    if (typeof _origSpawnHeli === "function") {
      window.spawnCitrusHeli = function (x, z) {
        _origSpawnHeli.apply(this, arguments);
        const en = window.enemies[window.enemies.length - 1];
        if (!en || en.type !== "heli" || !en.group) return;
        const tailRotor = new THREE.Mesh(
          new THREE.BoxGeometry(0.10, 2.20, 0.10),
          new THREE.MeshBasicMaterial({ color: 0x222222 })
        );
        tailRotor.position.set(0, 0.60, -5.20);
        en.group.add(tailRotor);
        en._tailRotor = tailRotor;
        const bottomGlow = new THREE.Mesh(
          new THREE.CircleGeometry(1.20, 8),
          new THREE.MeshBasicMaterial({
            color: 0xff4400, transparent: true, opacity: 0.50,
            side: THREE.DoubleSide, depthWrite: false
          })
        );
        bottomGlow.rotation.x = -Math.PI / 2;
        bottomGlow.position.set(0, -2.20, 0.50);
        en.group.add(bottomGlow);
        en._bottomGlow = bottomGlow;
      };
    }

    // §3.4 — HOOK updateEnemyAnimation: анимации деталей
    const _origUpdateEnemyAnim = window.updateEnemyAnimation;
    if (typeof _origUpdateEnemyAnim === "function") {
      window.updateEnemyAnimation = function (en, dt, now) {
        _origUpdateEnemyAnim.apply(this, arguments);
        if (!en || !en.group) return;

        // Снайпер: лазер в игрока
        if (en._sniperLaser) {
          try {
            const head = en.group.position.clone().add(new THREE.Vector3(0, 3.6, 0));
            const targetWorld = P.pos.clone().add(new THREE.Vector3(0, 2, 0));
            const dirWorld = targetWorld.clone().sub(head).normalize();
            const endWorld = head.clone().addScaledVector(dirWorld, 60);
            const localStart = new THREE.Vector3(0, 3.6, 0);
            const localEnd = en.group.worldToLocal(endWorld.clone());
            const posAttr = en._sniperLaser.geometry.attributes.position;
            if (posAttr) {
              posAttr.setXYZ(0, localStart.x, localStart.y, localStart.z);
              posAttr.setXYZ(1, localEnd.x, localEnd.y, localEnd.z);
              posAttr.needsUpdate = true;
            }
            en._sniperLaser.material.opacity = 0.35 + Math.sin(now * 0.010) * 0.20;
          } catch (e) {}
        }

        // Щитовик: вращение барьера + пульс ядра
        if (en._hexBarrier) {
          en._hexBarrier.rotation.y += dt * 0.80;
          if (en._hexCore) {
            const pulse = 1 + Math.sin(now * 0.006) * 0.20;
            en._hexCore.scale.setScalar(pulse);
            en._hexCore.material.opacity = 0.5 + Math.sin(now * 0.008) * 0.20;
          }
        }

        // Медик: дрон парит
        if (en._medDrone) {
          en._medDrone.position.y = 4.0 + Math.sin(now * 0.003) * 0.50;
          en._medDrone.rotation.y += dt * 3.0;
        }

        // Камикадзе: мигание
        if (en._blinkLight) {
          en._blinkLight.material.color.setHex(
            (Math.sin(now * 0.015) > 0) ? 0xff2200 : 0x220000
          );
        }

        // Танк: колёса + отдача
        if (en.type === "tank") {
          if (en._wheels && en._wheels.length) {
            for (let i = 0; i < en._wheels.length; i++) {
              en._wheels[i].rotation.x += dt * (en._moving ? 8 : 2);
            }
          }
          if (en._turretKickback > 0) {
            en._turretKickback -= dt * 4.0;
            if (en._turretKickback < 0) en._turretKickback = 0;
            if (en._barrel) en._barrel.position.z = 2 + en._turretKickback * 0.5;
          }
        }

        // Вертолёт: хвостовой винт + наклон по скорости
        if (en.type === "heli") {
          if (en._tailRotor) en._tailRotor.rotation.z += dt * 25.0;
          if (en._bottomGlow) en._bottomGlow.material.opacity = 0.35 + Math.sin(now * 0.005) * 0.15;
          try {
            const vx = en.vel.x || 0;
            const vz = en.vel.z || 0;
            const vlen = Math.sqrt(vx * vx + vz * vz);
            const targetTilt = Math.min(vlen / 30, 0.45);
            const targetRoll = Math.min(vlen / 30, 0.35) * Math.sign(vx || 1);
            en.group.rotation.x = THREE.MathUtils.lerp(en.group.rotation.x, -targetTilt, Math.min(1, dt * 4));
            en.group.rotation.z = THREE.MathUtils.lerp(en.group.rotation.z, targetRoll, Math.min(1, dt * 4));
          } catch (e) {}
        }
      };
    }

    // §3.5 — Отдача ствола при выстреле танка
    const _origFireRanged = window._fireEnemyRanged;
    if (typeof _origFireRanged === "function") {
      window._fireEnemyRanged = function (en, type) {
        if (en && en.type === "tank") {
          en._turretKickback = 1.0;
          if (en._barrel) {
            const origZ = en._barrel.position.z;
            en._barrel.position.z = origZ - 0.30;
            setTimeout(function () {
              if (en._barrel) en._barrel.position.z = 2;
            }, 120);
          }
        }
        return _origFireRanged.apply(this, arguments);
      };
    }

    // §3.6 — Battle Damage при HP < 50%
    function applyBattleDamage(en) {
      if (!en || en._battleDamageApplied) return;
      if (!en.group || !en.group.parent) return;
      const isBig = (en.type === "titan" || en.type === "tank" || en.type === "heli" ||
                     en.type === "lemon" || en.type === "valkyrie" ||
                     en.type === "necromancer" || en._isBoss);
      if (!isBig) return;
      if (en.hp / en.maxHp >= 0.50) return;
      en._battleDamageApplied = true;

      for (let i = 0; i < 3; i++) {
        const debris = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.30 + Math.random() * 0.40, 0),
          window.createPrototypeShader(0x4a4a4a, 0x222222, 7, 0xff4400)
        );
        debris.position.copy(en.group.position).add(new THREE.Vector3(
          (Math.random() - 0.5) * 2.0,
          1.0 + Math.random() * 2.0,
          (Math.random() - 0.5) * 2.0
        ));
        S.add(debris);
        window.__V65_DEBRIS.push({
          mesh: debris,
          vel: new THREE.Vector3(
            (Math.random() - 0.5) * 12,
            8 + Math.random() * 8,
            (Math.random() - 0.5) * 12
          ),
          rotVel: new THREE.Vector3(
            (Math.random() - 0.5) * 12,
            (Math.random() - 0.5) * 12,
            (Math.random() - 0.5) * 12
          ),
          life: 2.5
        });
      }

      if (!en._exposedCore) {
        const core = new THREE.Mesh(
          new THREE.SphereGeometry(0.55, 10, 10),
          new THREE.MeshBasicMaterial({ color: 0xff4400 })
        );
        core.position.y = 2.40;
        en.group.add(core);
        en._exposedCore = core;
      }
      en._smoking = true;

      if (typeof window.spawnComicPop === "function") {
        window.spawnComicPop(
          en.group.position.clone().add(new THREE.Vector3(0, 4, 0)),
          "*БРОНЯ ПРОБИТА!*",
          "#ff4400"
        );
      }
    }

    // §3.7 — Тик Battle Damage + дым
    let _bdAccum = 0;
    window.__V65_TICKS.push(function (dt) {
      _bdAccum += dt;
      if (_bdAccum < 0.20) return;
      _bdAccum = 0;
      for (let i = 0; i < window.enemies.length; i++) {
        const en = window.enemies[i];
        if (!en) continue;
        if (en.hp > 0 && en.hp / en.maxHp < 0.50) applyBattleDamage(en);
        if (en._smoking && Math.random() < 0.4) {
          if (typeof window.spawnParticles === "function") {
            window.spawnParticles(
              en.group.position.clone().add(new THREE.Vector3(
                (Math.random() - 0.5) * 1.5,
                2.0 + Math.random() * 1.0,
                (Math.random() - 0.5) * 1.5
              )),
              0x222222, 1
            );
          }
          if (Math.random() < 0.30 && typeof window.spawnParticles === "function") {
            window.spawnParticles(
              en.group.position.clone().add(new THREE.Vector3(0, 2.0, 0)),
              0xff4400, 1
            );
          }
        }
      }
    });

    // §3.8 — Тик обломков Battle Damage
    let _debrisAccum = 0;
    window.__V65_TICKS.push(function (dt) {
      _debrisAccum += dt;
      if (_debrisAccum < 0.033) return;
      const stepDt = _debrisAccum;
      _debrisAccum = 0;
      const arr = window.__V65_DEBRIS;
      for (let i = arr.length - 1; i >= 0; i--) {
        const d = arr[i];
        d.life -= stepDt;
        d.vel.y -= 28 * stepDt;
        d.mesh.position.addScaledVector(d.vel, stepDt);
        d.mesh.rotation.x += d.rotVel.x * stepDt;
        d.mesh.rotation.y += d.rotVel.y * stepDt;
        d.mesh.rotation.z += d.rotVel.z * stepDt;
        if (d.mesh.position.y <= 0.30 && d.vel.y < 0) {
          d.mesh.position.y = 0.30;
          d.vel.y *= -0.35;
          d.vel.x *= 0.70;
          d.vel.z *= 0.70;
          d.rotVel.multiplyScalar(0.70);
        }
        if (d.life <= 0) {
          S.remove(d.mesh);
          if (d.mesh.geometry) d.mesh.geometry.dispose();
          if (d.mesh.material) {
            if (Array.isArray(d.mesh.material)) d.mesh.material.forEach(function (m) { m.dispose(); });
            else d.mesh.material.dispose();
          }
          arr.splice(i, 1);
        }
      }
    });

    console.log("🍌 [v65.1] Часть 3 установлена — Battle Damage + анатомия врагов.");
  });

  // ================================================================
  // ═══ ЧАСТЬ 4 — EVOLUTION MODULES (5 ГЕРОЕВ) ═══
  // ================================================================
  whenReady(function () {
    const P = window.player;
    const S = window.scene;

    // §4.1 — Хранилище эволюций
    window.__EVO = window.__EVO || {};
    try {
      const stored = localStorage.getItem("banana_v65_evo");
      if (stored) {
        const parsed = JSON.parse(stored) || {};
        const KNOWN_IDS = [
          "pepper_blue_flame", "pepper_meteor",
          "carrot_poison", "carrot_ent",
          "lemon_hive", "lemon_superconductor",
          "potato_juggernaut", "potato_ketchup",
          "banana_singularity"
        ];
        KNOWN_IDS.forEach(function (id) {
          if (parsed[id] === true) window.__EVO[id] = true;
        });
      }
    } catch (e) {}

    function saveEvo() {
      try { localStorage.setItem("banana_v65_evo", JSON.stringify(window.__EVO)); } catch (e) {}
    }
    window.__saveEvo = saveEvo;

    // §4.2 — Описание модулей
    const EVO_MODULES = {
      pepper: [
        { id: "pepper_blue_flame", name: "🔥 Синее Пламя Сковилля", cost: 300,
          desc: "Огонь Перца, ауры кулаков, огненные волны и луч меняют цвет на неоново-синий (0x00e5ff). Урон +35%, атаки игнорируют щиты." },
        { id: "pepper_meteor", name: "☄️ Метеоритное Ядро", cost: 450,
          desc: "Огненное падение создаёт лавовый гейзер на 6 секунд: подбрасывает и сжигает врагов." }
      ],
      carrot: [
        { id: "carrot_poison", name: "🌿 Ядовитый Плющ", cost: 300,
          desc: "Опутывание корнями (F) наносит периодический урон ядом и высасывает HP из всех связанных врагов, исцеляя Хохлорковь." },
        { id: "carrot_ent", name: "🪨 Кора Древнего Энта", cost: 450,
          desc: "В Форме Гиганта вокруг героя вращаются 3 каменные глыбы, блокирующие урон и сбивающие врагов с ног." }
      ],
      lemon: [
        { id: "lemon_hive", name: "🕷️ Мега-Улей", cost: 300,
          desc: "Лимит пауков-ботов увеличен с 4 до 8, их стрельба ускорена на 50%, каждому выдаётся энергетический мини-щит, взрывающийся при таране." },
        { id: "lemon_superconductor", name: "⚡ Сверхпроводник BOLD", cost: 450,
          desc: "Плазменный луч бьёт цепной дугой ещё по 3 ближайшим врагам в конусе." }
      ],
      potato: [
        { id: "potato_juggernaut", name: "🥔 Крахмальный Джаггернаут", cost: 300,
          desc: "Таран (F) оставляет пылающий огненно-земляной след на 5 секунд. Переключение форм (R) вызывает гравитационную ударную волну." },
        { id: "potato_ketchup", name: "🍅 Термоядерный Кетчуп", cost: 450,
          desc: "Струя соуса (F) и Сверхнова (Q) замедляют врагов на 60% и детонируют повторным взрывом через 2 секунды." }
      ],
      banana: [
        { id: "banana_singularity", name: "🌀 Сингулярность Шрекича", cost: 500,
          desc: "Ракета (G) при взрыве создаёт гравитационную воронку на 4 секунды, стягивающую всех врагов в радиусе 18 метров." }
      ]
    };
    window.__EVO_MODULES = EVO_MODULES;

    function getActiveCharacterKey() {
      if (window.__POTATO_MODE) return "potato";
      if (window.PEPPER_MODE) return "pepper";
      if (window.CARROT_MODE) return "carrot";
      if (window.LEMON_MODE) return "lemon";
      return "banana";
    }
    const CHARACTER_NAMES = {
      banana: "🍌 ЕГОРБАНАН",
      pepper: "🌶️ КАПИТАН ПЕРЕЦ",
      carrot: "🥕 ХОХЛОРКОВЬ",
      lemon: "🍋 ДИМОН ЛИМОН",
      potato: "🥔 МОРГЕНКАРТОШКА"
    };

    // §4.4 — Полная замена renderLabTab
    const _origRenderLabTab = window.renderLabTab;
    window.renderLabTab = function (tab) {
      const epEl = document.getElementById("lab-ep-val");
      if (epEl) epEl.innerText = Math.round(P.ep);
      const scEl = document.getElementById("lab-score-val");
      if (scEl) scEl.innerText = P.score.toLocaleString("ru-RU");
      const wvEl = document.getElementById("lab-wave-val");
      if (wvEl) wvEl.innerText = P.wave;

      const c = document.getElementById("lab-content");
      if (!c) return;
      c.innerHTML = "";

      if (tab === "suits") {
        const key = getActiveCharacterKey();
        const mods = EVO_MODULES[key];
        const header = document.createElement("div");
        header.style.cssText = "margin-bottom:14px;font-size:15px;color:#f9ca24;font-weight:900;letter-spacing:1px;border-bottom:2px solid #f9ca24;padding-bottom:6px;";
        header.innerText = (CHARACTER_NAMES[key] || "") + " — Боевые Модули Эволюции";
        c.appendChild(header);

        if (mods && mods.length) {
          const grid = document.createElement("div");
          grid.className = "lab-grid";
          mods.forEach(function (m) {
            const owned = window.__EVO[m.id] === true;
            const canAfford = P.ep >= m.cost;
            const card = document.createElement("div");
            card.className = "lab-card" + (owned ? " active" : "");
            card.innerHTML =
              "<div>" +
                "<h3>" + m.name + "</h3>" +
                "<p>" + m.desc + "</p>" +
              "</div>" +
              '<button class="lab-btn" style="width:100%;background:' + (owned ? "#00ff66" : (canAfford ? "#f9ca24" : "#666")) + ';color:#000;font-weight:900;" ' +
                (owned || !canAfford ? "disabled" : "") +
                ' onclick="window.__buyEvo(\'' + m.id + '\',' + m.cost + ')">' +
                (owned ? "✓ УСТАНОВЛЕНО" : (canAfford ? "КУПИТЬ — " + m.cost + " EP" : "НУЖНО " + m.cost + " EP")) +
              "</button>";
            grid.appendChild(card);
          });
          c.appendChild(grid);
        } else {
          const empty = document.createElement("p");
          empty.style.cssText = "color:#ff9f1f;font-weight:900;";
          empty.innerText = "У этого персонажа нет модулей эволюции.";
          c.appendChild(empty);
        }

        // Костюмы банана
        if (key === "banana") {
          const suitHeader = document.createElement("div");
          suitHeader.style.cssText = "margin:24px 0 12px;font-size:15px;color:#f9ca24;font-weight:900;letter-spacing:1px;border-bottom:2px solid #f9ca24;padding-bottom:6px;";
          suitHeader.innerText = "🧥 Костюмы Банана";
          c.appendChild(suitHeader);

          const suitGrid = document.createElement("div");
          suitGrid.className = "lab-grid";
          window.SUITS.forEach(function (s, i) {
            const upgradeCost = s.level * 60;
            const m = 1 + (s.level - 1) * 0.25;
            const isActive = (P.suitIdx === i);
            const canUpgrade = P.ep >= upgradeCost;
            const card = document.createElement("div");
            card.className = "lab-card" + (isActive ? " active" : "");
            card.innerHTML =
              "<div>" +
                "<h3>[" + i + "] " + s.name + " (Ур. " + s.level + ")</h3>" +
                "<p>" + s.desc + "</p>" +
                '<div style="font-size:11px;color:#7bed9f;margin-bottom:8px;font-weight:900;">' +
                  "❤️ " + Math.round(s.maxHp * m) + " | ⚡ " + Math.round(s.maxEn * m) + " | ⚔️ " + Math.round(s.dmg * m) +
                "</div>" +
              "</div>" +
              "<div>" +
                '<button class="lab-btn" style="width:100%;background:#f9ca24;color:#000;" ' +
                  'onclick="window.equipSuit(' + i + ');window.renderLabTab(\'suits\');">' +
                  (isActive ? "✓ АКТИВНЫЙ" : "АКТИВИРОВАТЬ") +
                "</button>" +
                '<button class="lab-btn" style="width:100%;background:' + (canUpgrade ? "#00d2d3" : "#666") + ';color:#000;margin-top:5px;" ' +
                  (canUpgrade ? "" : "disabled") +
                  ' onclick="window.upgradeSuit(' + i + ')">⬆️ +25% — ' + upgradeCost + " EP</button>" +
              "</div>";
            suitGrid.appendChild(card);
          });
          c.appendChild(suitGrid);
        }
        return;
      }

      if (tab === "mutations" || tab === "leaders" || tab === "settings") {
        if (_origRenderLabTab) return _origRenderLabTab.apply(this, arguments);
        const fnName = tab === "mutations" ? "renderMutationsTab" : (tab === "leaders" ? "renderLeadersTab" : "renderSettingsTab");
        if (typeof window[fnName] === "function") window[fnName](c);
        return;
      }
      if (_origRenderLabTab) return _origRenderLabTab.apply(this, arguments);
    };

    // §4.5 — Покупка
    window.__buyEvo = function (id, cost) {
      if (window.__EVO[id] === true) return;
      if (P.ep < cost) {
        if (typeof window.sayShrekich === "function") window.sayShrekich("Шрекич: «Мало EP!»", true);
        return;
      }
      P.ep -= cost;
      window.__EVO[id] = true;
      saveEvo();
      if (typeof window.spawnComicPop === "function")
        window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 3, 0)), "🧬 ЭВОЛЮЦИЯ УСТАНОВЛЕНА!", "#00ff66");
      if (window.SoundFX && window.SoundFX.devastator) window.SoundFX.devastator();
      if (typeof window.triggerHitstopAndChroma === "function") window.triggerHitstopAndChroma(0.08, 0.6, 1.2);
      applyEvoEffects();
      window.renderLabTab("suits");
    };

    // §4.6 — Применение эффектов
    function applyEvoEffects() {
      if (window.LEMON_MODE) P._spiderLimit = window.__EVO.lemon_hive ? 8 : 4;
      if (window.CARROT_MODE && window.CARROT_FORM === 2 && window.__EVO.carrot_ent && !P._entRocks) {
        P._entRocks = [];
        for (let r = 0; r < 3; r++) {
          const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.90, 0),
            window.createPrototypeShader(0x5a4a3a, 0x2a1a0a, 8, 0x88cc44)
          );
          if (typeof window.addInkOutline === "function") window.addInkOutline(rock, 1.05);
          S.add(rock);
          P._entRocks.push({ mesh: rock, angle: (r / 3) * Math.PI * 2 });
        }
      }
      if (window.PEPPER_MODE && P.mesh && P.mesh.userData) {
        const ud = P.mesh.userData;
        if (window.__EVO.pepper_blue_flame && ud.fireAura) ud.fireAura.material.color.setHex(0x00e5ff);
      }
    }
    window.__applyEvoEffects = applyEvoEffects;

    // §4.7 — Хук damageEnemy для blue_flame (только множитель + игнор)
    // Экспортируем множитель для Части 7 (ragdoll willDie)
    window.__v65_calcBlueFlameMult = function () {
      if (window.__EVO && window.__EVO.pepper_blue_flame && window.PEPPER_MODE) return 1.35;
      return 1.0;
    };
    const _origDamageEnemyEvo = window.damageEnemy;
    window.damageEnemy = function (en, dmg, knockVec, popText) {
      const mult = window.__v65_calcBlueFlameMult();
      const finalDmg = dmg * mult;
      return _origDamageEnemyEvo.call(this, en, finalDmg, knockVec, popText);
    };

    // §4.7.1 — pepperExplosion: синий цвет
    const _origPepperExplosion = window.pepperExplosion;
    if (typeof _origPepperExplosion === "function") {
      window.pepperExplosion = function () {
        if (window.__EVO && window.__EVO.pepper_blue_flame && window.PEPPER_MODE) {
          _origPepperExplosion.apply(this, arguments);
          try {
            const now = performance.now();
            for (let i = window.slashRibbons.length - 1; i >= 0; i--) {
              const sr = window.slashRibbons[i];
              if (sr.mesh && sr.mesh.material && sr.maxLife && (now - (sr._t || 0)) < 200) {
                sr.mesh.material.color.setHex(0x00e5ff);
              }
            }
          } catch (e) {}
          return;
        }
        return _origPepperExplosion.apply(this, arguments);
      };
    }

    // §4.7.2 — pepperDiveAttack: метеоритное ядро
    const _origDiveAttack = window.pepperDiveAttack;
    if (typeof _origDiveAttack === "function") {
      window.pepperDiveAttack = function () {
        _origDiveAttack.apply(this, arguments);
        if (!window.__EVO || !window.__EVO.pepper_meteor) return;
        if (!window.PEPPER_MODE) return;
        const dropPos = P.pos.clone();
        setTimeout(function () {
          const geyserLife = 6.0;
          let gTimer = 0;
          const geyserInt = setInterval(function () {
            gTimer += 0.5;
            if (gTimer >= geyserLife) { clearInterval(geyserInt); return; }
            if (Math.random() < 0.5) {
              const lava = new THREE.Mesh(
                new THREE.CylinderGeometry(0.6, 1.2, 4 + Math.random() * 3, 8),
                new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.8 })
              );
              lava.position.set(
                dropPos.x + (Math.random() - 0.5) * 6, 2.0,
                dropPos.z + (Math.random() - 0.5) * 6
              );
              S.add(lava);
              setTimeout(function () { S.remove(lava); lava.geometry.dispose(); lava.material.dispose(); }, 450);
              for (let e = window.enemies.length - 1; e >= 0; e--) {
                const en = window.enemies[e];
                if (en.group.position.distanceTo(dropPos) < 6) {
                  en.vel.y = Math.max(en.vel.y, 10);
                  window.damageEnemy(en, 30, new THREE.Vector3(0, 8, 0), "*ЛАВОВЫЙ ГЕЙЗЕР!*");
                }
              }
            }
          }, 500);
          if (typeof window.spawnComicPop === "function")
            window.spawnComicPop(dropPos.clone().add(new THREE.Vector3(0, 3, 0)), "☄️ МЕТЕОРИТНОЕ ЯДРО!", "#ff4400");
        }, 500);
      };
    }

    // §4.8.1 — carrotRootBind: яд + лечение
    const _origRootBindEvo = window.carrotRootBind;
    if (typeof _origRootBindEvo === "function") {
      window.carrotRootBind = function () {
        _origRootBindEvo.apply(this, arguments);
        if (!window.__EVO || !window.__EVO.carrot_poison) return;
        if (!window.CARROT_MODE) return;
        for (let i = 0; i < window.enemies.length; i++) {
          const en = window.enemies[i];
          if (en._rooted > 0) {
            en._poisoned = 5.0;
            if (typeof window.spawnParticles === "function")
              window.spawnParticles(en.group.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 0x00ff88, 6);
          }
        }
        try {
          for (let t = 0; t < window.activeTendrils.length; t++) {
            const tr = window.activeTendrils[t];
            if (tr.meshes) {
              for (let m = 0; m < tr.meshes.length; m++) {
                if (tr.meshes[m].material) tr.meshes[m].material.color.setHex(0x00ff88);
              }
            }
          }
        } catch (e) {}
      };
    }

    // §4.8.1b — Тик яда
    window.__V65_TICKS.push(function (dt) {
      if (!window.__EVO || !window.__EVO.carrot_poison) return;
      if (!window.CARROT_MODE) return;
      for (let i = window.enemies.length - 1; i >= 0; i--) {
        const en = window.enemies[i];
        if (en._poisoned > 0) {
          en._poisoned -= dt;
          if (Math.random() < dt * 3) {
            window.damageEnemy(en, 15, new THREE.Vector3(), "");
            P.hp = Math.min(P.maxHp, P.hp + 4);
            if (Math.random() < 0.3 && typeof window.spawnParticles === "function")
              window.spawnParticles(en.group.position.clone().add(new THREE.Vector3(0, 1, 0)), 0x00ff00, 2);
          }
        }
      }
    });

    // §4.8.2 — carrot_ent: 30% блок
    const _origApplyDamageEvo = window.applyDamageToHero;
    window.applyDamageToHero = function (dmg) {
      if (window.__EVO && window.__EVO.carrot_ent && window.CARROT_MODE &&
          window.CARROT_FORM === 2 && P._entRocks && P._entRocks.length > 0) {
        if (Math.random() < 0.30) {
          if (typeof window.spawnComicPop === "function")
            window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 3, 0)), "*КАМЕННЫЙ БЛОК*", "#88cc44");
          if (typeof window.spawnParticles === "function")
            window.spawnParticles(P.pos.clone().add(new THREE.Vector3(0, 2, 0)), 0x88cc44, 8);
          return;
        }
      }
      return _origApplyDamageEvo.apply(this, arguments);
    };

    // §4.8.2b — Тик камней
    window.__V65_TICKS.push(function (dt) {
      if (!window.__EVO || !window.__EVO.carrot_ent) return;
      if (!window.CARROT_MODE || window.CARROT_FORM !== 2) {
        if (P._entRocks) {
          for (let i = 0; i < P._entRocks.length; i++) {
            if (P._entRocks[i].mesh.parent) S.remove(P._entRocks[i].mesh);
            if (P._entRocks[i].mesh.geometry) P._entRocks[i].mesh.geometry.dispose();
            if (P._entRocks[i].mesh.material) P._entRocks[i].mesh.material.dispose();
          }
          P._entRocks = null;
        }
        return;
      }
      if (!P._entRocks) applyEvoEffects();
      if (!P._entRocks) return;
      for (let i = 0; i < P._entRocks.length; i++) {
        const r = P._entRocks[i];
        r.angle += dt * 1.5;
        r.mesh.position.set(
          P.pos.x + Math.cos(r.angle) * 3.5,
          P.pos.y + 2.5 + Math.sin(r.angle * 2) * 0.4,
          P.pos.z + Math.sin(r.angle) * 3.5
        );
        r.mesh.rotation.x += dt * 2;
        r.mesh.rotation.y += dt * 1.5;
        for (let e = window.enemies.length - 1; e >= 0; e--) {
          if (window.enemies[e].group.position.distanceTo(r.mesh.position) < 2)
            window.enemies[e].vel.y = Math.max(window.enemies[e].vel.y, 8);
        }
      }
    });

    // §4.9.1 — lemon_hive
    const _origSpawnSpider = window.spawnLemonSpiderBot;
    if (typeof _origSpawnSpider === "function") {
      window.spawnLemonSpiderBot = function () {
        const hasHive = window.__EVO && window.__EVO.lemon_hive;
        const limit = hasHive ? 8 : 4;
        const current = (window.LEMON_BOTS || []).filter(function (b) { return b.alive; }).length;
        if (current >= limit) return;
        _origSpawnSpider.apply(this, arguments);
        if (!hasHive) return;
        const bots = window.LEMON_BOTS || [];
        const bot = bots[bots.length - 1];
        if (!bot || !bot.group) return;
        const shield = new THREE.Mesh(
          new THREE.SphereGeometry(0.55, 10, 10),
          new THREE.MeshBasicMaterial({ color: 0x44ffaa, transparent: true, opacity: 0.4, wireframe: true })
        );
        bot.group.add(shield);
        bot._shield = shield;
        bot._shieldHp = 60;
        bot.cd = 0;
        bot._kamikazeShield = true;
      };
    }

    // §4.9.2 — lemon_superconductor
    const _origPlasmaBeamTick = window.lemonPlasmaBeamTick;
    if (typeof _origPlasmaBeamTick === "function") {
      window.lemonPlasmaBeamTick = function (dt) {
        _origPlasmaBeamTick.apply(this, arguments);
        if (!window.__EVO || !window.__EVO.lemon_superconductor) return;
        if (!window.LEMON_MODE || !P.lemonLaserActive) return;
        const fwd = new THREE.Vector3(-Math.sin(P.camYaw), 0, -Math.cos(P.camYaw));
        const start = P.pos.clone().add(new THREE.Vector3(0, 2.2, 0));
        const hits = [];
        for (let e = 0; e < window.enemies.length; e++) {
          const en = window.enemies[e];
          const toE = en.group.position.clone().sub(start);
          const dist = toE.length();
          if (dist > 35) continue;
          if (toE.normalize().dot(fwd) < 0.85) continue;
          hits.push({ en: en, d: dist });
        }
        hits.sort(function (a, b) { return a.d - b.d; });
        for (let i = 0; i < Math.min(3, hits.length); i++) {
          window.damageEnemy(hits[i].en, 40 * dt, new THREE.Vector3(), "");
          if (Math.random() < 0.15) {
            const arcGeo = new THREE.BufferGeometry().setFromPoints([
              start, hits[i].en.group.position.clone().add(new THREE.Vector3(0, 1.5, 0))
            ]);
            const arc = new THREE.Line(arcGeo,
              new THREE.LineBasicMaterial({ color: 0x44ffaa, transparent: true, opacity: 0.9 }));
            S.add(arc);
            setTimeout(function () { S.remove(arc); arc.geometry.dispose(); arc.material.dispose(); }, 80);
          }
        }
      };
    }

    // §4.10 — potato_ketchup: тик замедления + детонации
    window.__V65_TICKS.push(function (dt) {
      if (!window.__EVO || !window.__EVO.potato_ketchup) return;
      const nowMs = performance.now();
      for (let i = window.enemies.length - 1; i >= 0; i--) {
        const en = window.enemies[i];
        if (en._ketchupSlow > 0) {
          en._ketchupSlow -= dt;
          en.speed = (en.speed || 8) * 0.4;
          if (Math.random() < 0.2 && typeof window.spawnParticles === "function") {
            window.spawnParticles(
              en.group.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 0.5, (Math.random() - 0.5) * 1.5)),
              0xff2200, 1
            );
          }
        }
        if (en._ketchupDetonate && nowMs >= en._ketchupDetonate) {
          en._ketchupDetonate = null;
          if (typeof window.spawnComicPop === "function")
            window.spawnComicPop(en.group.position.clone().add(new THREE.Vector3(0, 2, 0)), "*КЕТЧУП-ДЕТОНАЦИЯ*", "#ff2200");
          if (typeof window.spawnGroundCrackRing === "function")
            window.spawnGroundCrackRing(en.group.position, 0xff2200, 6);
          for (let j = window.enemies.length - 1; j >= 0; j--) {
            const e2 = window.enemies[j];
            if (e2.group && e2.group.position.distanceTo(en.group.position) < 5) {
              window.damageEnemy(e2, 80, new THREE.Vector3(), "*ТЕРМОЯДЕРНЫЙ КЕТЧУП!*");
            }
          }
        }
      }
    });

    // §4.11 — banana_singularity
    function createGravitySingularity(pos) {
      const tornado = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 5, 8, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xaa44ff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, wireframe: true })
      );
      tornado.position.copy(pos).add(new THREE.Vector3(0, 4, 0));
      S.add(tornado);
      let life = 4.0;
      const interval = setInterval(function () {
        life -= 0.1;
        tornado.rotation.y += 0.3;
        for (let e = window.enemies.length - 1; e >= 0; e--) {
          const en = window.enemies[e];
          if (en.group.position.distanceTo(pos) < 18) {
            const dir = pos.clone().sub(en.group.position).normalize();
            en.vel.x += dir.x * 15;
            en.vel.z += dir.z * 15;
            if (Math.random() < 0.1) window.damageEnemy(en, 20, new THREE.Vector3(), "");
          }
        }
        if (life <= 0) {
          clearInterval(interval);
          S.remove(tornado); tornado.geometry.dispose(); tornado.material.dispose();
          for (let e = window.enemies.length - 1; e >= 0; e--) {
            const en = window.enemies[e];
            if (en.group.position.distanceTo(pos) < 18)
              window.damageEnemy(en, 400, new THREE.Vector3(0, 15, 0), "*СИНГУЛЯРНОСТЬ!*");
          }
          if (typeof window.spawnGroundCrackRing === "function")
            window.spawnGroundCrackRing(pos, 0xaa44ff, 18);
          if (window.SoundFX && window.SoundFX.boom) window.SoundFX.boom();
        }
      }, 100);
    }

    const _origFireRocketEvo = window.fireRocket;
    if (typeof _origFireRocketEvo === "function") {
      window.fireRocket = function () {
        _origFireRocketEvo.apply(this, arguments);
        if (!window.__EVO || !window.__EVO.banana_singularity) return;
        if (window.Rocket && window.Rocket.active && window.Rocket.active.length > 0) {
          const rk = window.Rocket.active[window.Rocket.active.length - 1];
          rk._isSingularity = true;
        }
      };
    }
    const _origExplodeRocketEvo = window.explodeRocket;
    if (typeof _origExplodeRocketEvo === "function") {
      window.explodeRocket = function (r) {
        const isSing = r && r._isSingularity;
        const singPos = r && r.mesh ? r.mesh.position.clone() : null;
        _origExplodeRocketEvo.apply(this, arguments);
        if (isSing && singPos && window.__EVO && window.__EVO.banana_singularity) {
          createGravitySingularity(singPos);
          if (typeof window.spawnComicPop === "function")
            window.spawnComicPop(singPos.clone().add(new THREE.Vector3(0, 4, 0)), "🌀 СИНГУЛЯРНОСТЬ ШРЕКИЧА! 🌀", "#aa44ff");
        }
      };
    }

    // §4.12 — Применение при смене персонажа
    ["equipSuit", "equipPepper", "equipCarrot", "equipLemon", "equipPotato"].forEach(function (name) {
      const _orig = window[name];
      if (typeof _orig === "function") {
        window[name] = function () {
          const r = _orig.apply(this, arguments);
          setTimeout(applyEvoEffects, 100);
          return r;
        };
      }
    });
    setTimeout(function () { applyEvoEffects(); }, 500);

    console.log("🍌 [v65.1] Часть 4 установлена — EVO-модули 5 героев.");
  });

  // ================================================================
  // ═══ ЧАСТЬ 5 — NEON SKY-RAIL GRINDING ═══
  // ================================================================
  whenReady(function () {
    const P = window.player;
    const S = window.scene;

    if (P.isGrinding === undefined) P.isGrinding = false;
    if (P._grindRail === undefined) P._grindRail = null;
    if (P._grindT === undefined) P._grindT = 0;
    if (P._grindDir === undefined) P._grindDir = 1;
    if (P._grindSpeed === undefined) P._grindSpeed = 75;

    window.__SKY_RAILS = window.__SKY_RAILS || [];

    // §5.2 — Построение кабелей
    function buildSkyRails() {
      if (window.__SKY_RAILS.length > 0) return;
      if (!Array.isArray(window.buildings) || window.buildings.length < 5) return;
      const tall = window.buildings.filter(function (b) { return b.topY > 35; });
      if (tall.length < 4) return;

      const used = new Set();
      let railCount = 0;
      const MAX_RAILS = 40;
      const railColors = [0x00f2fe, 0xff0055, 0xf9ca24, 0x00ff66, 0xaa44ff];

      for (let i = 0; i < tall.length && railCount < MAX_RAILS; i++) {
        const a = tall[i];
        if (used.has(a)) continue;
        for (let j = i + 1; j < tall.length && railCount < MAX_RAILS; j++) {
          const b = tall[j];
          if (used.has(b)) continue;
          const dist = Math.hypot(a.x - b.x, a.z - b.z);
          if (dist < 45 || dist > 165) continue;

          const ax = a.x, az = a.z, bx = b.x, bz = b.z;
          const ay = a.topY + 3 + Math.random() * 3;
          const by = b.topY + 3 + Math.random() * 3;
          const midX = (ax + bx) / 2, midZ = (az + bz) / 2;
          const sag = 3 + Math.random() * 4;
          const midY = Math.min(ay, by) - sag;

          const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(ax, ay, az),
            new THREE.Vector3((ax + midX) / 2, (ay + midY) / 2, (az + midZ) / 2),
            new THREE.Vector3(midX, midY, midZ),
            new THREE.Vector3((bx + midX) / 2, (by + midY) / 2, (bz + midZ) / 2),
            new THREE.Vector3(bx, by, bz)
          ]);

          const color = railColors[Math.floor(Math.random() * railColors.length)];
          const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.28, 6, false);
          const tubeMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.9 });
          const tube = new THREE.Mesh(tubeGeo, tubeMat);
          S.add(tube);

          const coreGeo = new THREE.TubeGeometry(curve, 24, 0.10, 4, false);
          const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
          const core = new THREE.Mesh(coreGeo, coreMat);
          S.add(core);

          const ringCount = 6;
          const rings = [];
          for (let r = 0; r < ringCount; r++) {
            const ring = new THREE.Mesh(
              new THREE.TorusGeometry(0.45, 0.08, 4, 8),
              new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
            );
            S.add(ring);
            rings.push({ mesh: ring, t: r / ringCount });
          }

          const bbox = new THREE.Box3().setFromPoints(curve.getPoints(20));

          window.__SKY_RAILS.push({
            curve: curve, mesh: tube, core: core, rings: rings,
            color: color, bbox: bbox, speed: 0,
            fromBuilding: a, toBuilding: b
          });

          used.add(a); used.add(b); railCount++;
          break;
        }
      }
      console.log("[SKY RAILS] Построено " + window.__SKY_RAILS.length + " кабелей.");
    }

    // §5.3 — Кольца
    let _railRingAccum = 0;
    window.__V65_TICKS.push(function (dt) {
      _railRingAccum += dt;
      if (_railRingAccum < 1 / 30) return;
      const stepDt = _railRingAccum;
      _railRingAccum = 0;
      const rails = window.__SKY_RAILS;
      const nowMs = performance.now();
      for (let i = 0; i < rails.length; i++) {
        const rail = rails[i];
        if (P.pos.distanceToSquared(rail.bbox.getCenter(new THREE.Vector3())) > 250 * 250) continue;
        for (let r = 0; r < rail.rings.length; r++) {
          const ring = rail.rings[r];
          ring.t += stepDt * 0.6;
          if (ring.t > 1) ring.t -= 1;
          try {
            const pt = rail.curve.getPoint(ring.t);
            const tangent = rail.curve.getTangent(ring.t);
            ring.mesh.position.copy(pt);
            ring.mesh.lookAt(pt.clone().add(tangent));
            ring.mesh.material.opacity = 0.5 + Math.sin(nowMs * 0.005 + ring.t * 10) * 0.3;
          } catch (e) {}
        }
      }
    });

    // §5.4 — Поиск ближайшего рельса
    function findNearestRail(pos, maxDist) {
      maxDist = maxDist || 4.5;
      const rails = window.__SKY_RAILS;
      if (!rails || !rails.length) return null;
      let best = null, bestDist = maxDist;
      const posVec = new THREE.Vector3(pos.x, pos.y, pos.z);
      for (let i = 0; i < rails.length; i++) {
        const rail = rails[i];
        const expanded = rail.bbox.clone().expandByScalar(5);
        if (!expanded.containsPoint(posVec)) continue;
        for (let s = 0; s <= 20; s++) {
          const t = s / 20;
          let pt;
          try { pt = rail.curve.getPoint(t); } catch (e) { continue; }
          const d = pt.distanceTo(posVec);
          if (d < bestDist) { bestDist = d; best = { rail: rail, t: t, point: pt }; }
        }
      }
      return best;
    }
    window.__findNearestRail = findNearestRail;

    // §5.5 — Старт гриндинга
    function startGrind(near) {
      if (!near || !near.rail || P.isGrinding || P.isDead) return false;
      P.isGrinding = true;
      P._grindRail = near.rail;
      P._grindT = near.t;
      let tangent;
      try { tangent = near.rail.curve.getTangent(near.t); } catch (e) { tangent = new THREE.Vector3(0, 0, 1); }
      const velDot = (P.vel.x || 0) * tangent.x + (P.vel.z || 0) * tangent.z;
      P._grindDir = (velDot >= 0) ? 1 : -1;
      P._grindSpeed = 75;
      P.momentum = 1.0;
      P.momentumMult = 1.8;
      try {
        const sl = document.getElementById("speed-lines");
        if (sl) sl.classList.add("hot");
      } catch (e) {}
      if (window.postUniforms) window.postUniforms.uRadialBlur.value = 0.85;
      P.score += 200;
      if (typeof window.updateScoreDisplay === "function") window.updateScoreDisplay();
      if (typeof window.spawnSparks === "function") window.spawnSparks(P.pos.clone(), 8, 0xfff200);
      if (typeof window.spawnComicPop === "function") {
        const cColor = near.rail.color === 0x00f2fe ? "#00f2fe" :
                       near.rail.color === 0xff0055 ? "#ff0055" :
                       near.rail.color === 0xf9ca24 ? "#f9ca24" :
                       near.rail.color === 0x00ff66 ? "#00ff66" : "#aa44ff";
        window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 2, 0)), "🛹 GRIND!", cColor);
      }
      if (window.SoundFX && window.SoundFX.whip) window.SoundFX.whip();
      if (typeof window.triggerHitstopAndChroma === "function") window.triggerHitstopAndChroma(0.03, 0.3, 0.8);
      return true;
    }

    // §5.6 — Стоп
    function stopGrind(reason) {
      if (!P.isGrinding) return;
      P.isGrinding = false;
      P._grindRail = null;
      P._grindT = 0;
      P._grindSpeed = 75;
      try {
        const sl = document.getElementById("speed-lines");
        if (sl) sl.classList.remove("hot");
      } catch (e) {}
      if (window.postUniforms) window.postUniforms.uRadialBlur.value = 0.4;
      if (reason === "jump" && typeof window.spawnComicPop === "function")
        window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 3, 0)), "*САЛЬТО!*", "#fff200");
    }
    window.__v65_stopGrind = stopGrind;

    // §5.7 — Space capture
    window.addEventListener("keydown", function (e) {
      if (e.code !== "Space") return;
      if (!P || P.isDead) return;
      if (window.isLabOpen || window.screenshotMode) return;

      if (P.isGrinding) {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        const rail = P._grindRail;
        let tangent = new THREE.Vector3(0, 0, 1);
        try { if (rail) tangent = rail.curve.getTangent(P._grindT); } catch (err) {}
        const sign = P._grindDir || 1;
        stopGrind("jump");
        P.vel.x = tangent.x * 75 * sign;
        P.vel.z = tangent.z * 75 * sign;
        P.vel.y = 22;
        P.airFlipTimer = 0.55;
        P.isGrounded = false;
        P.momentum = 1.0;
        P.momentumMult = 1.8;
        if (typeof window.spawnSparks === "function") window.spawnSparks(P.pos.clone(), 12, 0xfff200);
        if (window.SoundFX && window.SoundFX.swing) window.SoundFX.swing(420);
        return;
      }

      if (!P.isGrounded && !P.isWallRunning && !P.isFlying) {
        const near = findNearestRail(P.pos, 4.5);
        if (near && startGrind(near)) {
          e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        }
      }
    }, true);

    // §5.8 — Физика
    window.__V65_TICKS.push(function (dt) {
      if (!P.isGrinding || !P._grindRail) return;
      if (P.isDead) { stopGrind("death"); return; }
      const rail = P._grindRail;
      P._grindT += (P._grindDir * P._grindSpeed * dt) / 100;
      if (P._grindT < 0 || P._grindT > 1) {
        stopGrind("end");
        P.vel.y = Math.max(P.vel.y || 0, 5);
        return;
      }
      let pt, tangent;
      try {
        pt = rail.curve.getPoint(P._grindT);
        tangent = rail.curve.getTangent(P._grindT);
      } catch (e) { stopGrind("error"); return; }
      P.pos.copy(pt);
      P.pos.y += 1.8;
      P.vel.x = tangent.x * P._grindSpeed * P._grindDir;
      P.vel.z = tangent.z * P._grindSpeed * P._grindDir;
      P.vel.y = 0;
      P.momentum = 1.0;
      P.momentumMult = 1.8;
      P.facingYaw = Math.atan2(tangent.x * P._grindDir, tangent.z * P._grindDir);
      try {
        const nextTan = rail.curve.getTangent(Math.min(1, P._grindT + 0.05 * P._grindDir));
        const turn = (nextTan.x * tangent.z - nextTan.z * tangent.x);
        const targetRoll = Math.max(-0.35, Math.min(0.35, -turn * 4));
        P.camRoll = (P.camRoll || 0) * 0.9 + targetRoll * 0.1;
      } catch (e) {}
      if (Math.random() < 0.6 && typeof window.spawnSparks === "function") {
        window.spawnSparks(
          P.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, -1.7, (Math.random() - 0.5) * 0.6)),
          2, 0xfff200
        );
      }
      if (P.attackTimer > 0.08 && P.attackTimer < P.attackDuration) {
        for (let e = window.enemies.length - 1; e >= 0; e--) {
          const en = window.enemies[e];
          if (en.group.position.distanceTo(P.pos) < 15) {
            const origCombo = P.comboMult;
            P.comboMult *= 1.8;
            window.damageEnemy(en, 40, new THREE.Vector3(), "*RAIL SLAM*");
            P.comboMult = origCombo;
            break;
          }
        }
      }
      if (Math.random() < 0.05 && window.SoundFX && window.SoundFX.swing)
        window.SoundFX.swing(300 + Math.random() * 100);
    });

    // §5.9 — camRoll затухание
    window.__V65_TICKS.push(function (dt) {
      if (P.isGrinding) return;
      if (Math.abs(P.camRoll || 0) > 0.001) {
        P.camRoll = (P.camRoll || 0) * Math.exp(-dt * 6);
        if (Math.abs(P.camRoll) < 0.001) P.camRoll = 0;
      }
    });

    // §5.10 — Сброс
    const _origApplyDmgGrind = window.applyDamageToHero;
    window.applyDamageToHero = function (dmg) {
      if (P.isDead && P.isGrinding) stopGrind("death");
      return _origApplyDmgGrind.apply(this, arguments);
    };
    ["equipSuit", "equipPepper", "equipCarrot", "equipLemon", "equipPotato"].forEach(function (name) {
      const _orig = window[name];
      if (typeof _orig === "function") {
        window[name] = function () {
          if (P.isGrinding) stopGrind("char_change");
          return _orig.apply(this, arguments);
        };
      }
    });
    const _origToggleLab = window.toggleLab;
    if (typeof _origToggleLab === "function") {
      window.toggleLab = function (open) {
        if (open && P.isGrinding) stopGrind("lab");
        return _origToggleLab.apply(this, arguments);
      };
    }

    // §5.11 — Построение с задержкой
    let _railBuildAttempts = 0;
    function tryBuildRails() {
      _railBuildAttempts++;
      if (window.__SKY_RAILS.length > 0) return;
      const tallCount = (window.buildings || []).filter(function (b) { return b.topY > 35; }).length;
      if (tallCount >= 4) buildSkyRails();
      else if (_railBuildAttempts < 60) setTimeout(tryBuildRails, 100);
    }
    setTimeout(tryBuildRails, 1500);

    console.log("🍌 [v65.1] Часть 5 установлена — Sky Rails + гриндинг.");
  });

  // ═══ КОНЕЦ ЧАСТИ 5 — ПРОДОЛЖЕНИЕ В ОТВЕТЕ C ═══
  // Сюда вставляется ОТВЕТ C: Части 6, 7, 8 + закрывающий })();
   // ================================================================
  // ═══ ЧАСТЬ 6 — 2-СУСТАВНАЯ КИНЕМАТИКА + SMEAR FRAMES ═══
  // ================================================================
  whenReady(function () {
    const P = window.player;
    const S = window.scene;

    // Безопасная проверка клавиши (keys может быть в замыкании основного скрипта)
    function isKeyDown(code) {
      try { if (window.keys && window.keys[code]) return true; } catch (e) {}
      try {
        // eslint-disable-next-line no-undef
        if (typeof keys !== "undefined" && keys && keys[code]) return true;
      } catch (e) {}
      return false;
    }
    window.__v65_isKeyDown = isKeyDown;

    if (P._v65_prevFacingYaw === undefined) P._v65_prevFacingYaw = 0;
    if (P._v65_idleTime === undefined) P._v65_idleTime = 0;

    // ── Пул плоскостей для Smear Ribbon ──
    const SMEAR_POOL_SIZE = 24;
    const SMEAR_MAX_POINTS = 6;
    const smearPool = [];

    for (let i = 0; i < SMEAR_POOL_SIZE; i++) {
      const geo = new THREE.PlaneGeometry(1, 1);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xfff200, transparent: true, opacity: 0,
        side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      S.add(mesh);
      smearPool.push({ mesh: mesh, inUse: false, life: 0, maxLife: 0 });
    }

    const smearTrail = { points: [], color: 0xfff200, active: false };
    window.__V65_SMEAR_TRAIL = smearTrail;

    function acquireSmearMesh() {
      for (let i = 0; i < smearPool.length; i++) {
        if (!smearPool[i].inUse) {
          smearPool[i].inUse = true;
          smearPool[i].mesh.visible = true;
          return smearPool[i];
        }
      }
      return null;
    }
    function releaseSmearMesh(sm) {
      sm.inUse = false;
      sm.mesh.visible = false;
      sm.life = 0;
      sm.mesh.material.opacity = 0;
    }

    // §6.2 — Пост-пас
    const _origUpdateChoreo = window.updatePlayerChoreographyAndCamera;
    window.updatePlayerChoreographyAndCamera = function (dt, now) {
      if (_origUpdateChoreo) _origUpdateChoreo.apply(this, arguments);
      if (!P.mesh || !P.mesh.userData) return;
      const ud = P.mesh.userData;

      const hasAttack = P.attackTimer > 0.02 && P.attackTimer < P.attackDuration;
      const hasMoveInput = isKeyDown("KeyW") || isKeyDown("KeyA") || isKeyDown("KeyS") || isKeyDown("KeyD");
      const isMoving = hasMoveInput || P.isWallRunning || P.isGrinding ||
                       P.isDodging || P.isSliding || P.isBulletdropping ||
                       (Math.abs(P.vel.x) > 1 || Math.abs(P.vel.z) > 1);
      const isIdle = !hasAttack && !isMoving && !P.consumeState && P.isGrounded;
      const isCarrot = !!(ud.isCarrot);

      // Combat Idle
      if (isIdle && !isCarrot && ud.spine && ud.neck) {
        P._v65_idleTime += dt;
        const breathe = Math.sin(P._v65_idleTime * 2.0) * 0.025;
        ud.spine.rotation.x = THREE.MathUtils.lerp(ud.spine.rotation.x, breathe, Math.min(1, dt * 8));
        if (ud.armL && ud.armL.shoulder) {
          const swayL = Math.sin(P._v65_idleTime * 1.8) * 0.02;
          ud.armL.shoulder.rotation.z = THREE.MathUtils.lerp(ud.armL.shoulder.rotation.z || 0, swayL, Math.min(1, dt * 6));
        }
        if (ud.armR && ud.armR.shoulder) {
          const swayR = -Math.sin(P._v65_idleTime * 1.8) * 0.02;
          ud.armR.shoulder.rotation.z = THREE.MathUtils.lerp(ud.armR.shoulder.rotation.z || 0, swayR, Math.min(1, dt * 6));
        }
        let dyaw = P.camYaw - P.facingYaw;
        while (dyaw > Math.PI) dyaw -= Math.PI * 2;
        while (dyaw < -Math.PI) dyaw += Math.PI * 2;
        const targetNeckYaw = Math.max(-0.55, Math.min(0.55, dyaw));
        ud.neck.rotation.y = THREE.MathUtils.lerp(ud.neck.rotation.y || 0, targetNeckYaw, Math.min(1, dt * 8));
        if (ud.armL && ud.armL.elbow) ud.armL.elbow.rotation.x = THREE.MathUtils.lerp(ud.armL.elbow.rotation.x || 0, -0.35, Math.min(1, dt * 10));
        if (ud.armR && ud.armR.elbow) ud.armR.elbow.rotation.x = THREE.MathUtils.lerp(ud.armR.elbow.rotation.x || 0, -0.35, Math.min(1, dt * 10));
      } else {
        if (ud.neck) ud.neck.rotation.y = THREE.MathUtils.lerp(ud.neck.rotation.y || 0, 0, Math.min(1, dt * 8));
      }

      // Скручивание торса при беге
      if (!isCarrot && ud.spine && isMoving && !hasAttack) {
        const turnRate = P.camYaw - P.facingYaw;
        let n = turnRate;
        while (n > Math.PI) n -= Math.PI * 2;
        while (n < -Math.PI) n += Math.PI * 2;
        const targetSpineY = Math.max(-0.35, Math.min(0.35, -n * 0.4));
        ud.spine.rotation.y = THREE.MathUtils.lerp(ud.spine.rotation.y || 0, targetSpineY, Math.min(1, dt * 10));
      } else if (!isCarrot && ud.spine) {
        ud.spine.rotation.y = THREE.MathUtils.lerp(ud.spine.rotation.y || 0, 0, Math.min(1, dt * 10));
      }

      // Banking (наклон таза)
      if (ud.pelvis) {
        const yawDelta = P.facingYaw - P._v65_prevFacingYaw;
        P._v65_prevFacingYaw = P.facingYaw;
        let nd = yawDelta;
        while (nd > Math.PI) nd -= Math.PI * 2;
        while (nd < -Math.PI) nd += Math.PI * 2;
        const turnSpeed = Math.abs(nd) / Math.max(dt, 0.016);
        let targetBank = 0;
        if (isMoving && !hasAttack && turnSpeed > 1.5) {
          const dirSign = nd > 0 ? 1 : -1;
          targetBank = -dirSign * Math.min(0.25, turnSpeed * 0.02);
        }
        ud.pelvis.rotation.z = THREE.MathUtils.lerp(ud.pelvis.rotation.z || 0, targetBank, Math.min(1, dt * 6));
      }

      // §6.3 — Финишер Моргена (двуручный молот)
      if (window.__POTATO_MODE && window.__POTATO_FORM === 1 && hasAttack && !isCarrot) {
        const p = 1 - (P.attackTimer / P.attackDuration);
        const isFinisher = (P.comboStep === 5);
        if (isFinisher && ud.armL && ud.armR) {
          const WINDUP_END = 0.30, STRIKE_END = 0.55, FOLLOW_END = 0.72;
          let shoulderX = 0, shoulderZ_L = 0, shoulderZ_R = 0, spineX = 0;
          if (p < WINDUP_END) {
            const t = p / WINDUP_END;
            const e = t * t * (3 - 2 * t);
            shoulderX = e * (-Math.PI * 0.75);
            shoulderZ_L = e * 0.25; shoulderZ_R = e * -0.25;
            spineX = e * -0.20;
          } else if (p < STRIKE_END) {
            const t = (p - WINDUP_END) / (STRIKE_END - WINDUP_END);
            const e = 1 - Math.pow(1 - t, 3);
            shoulderX = -Math.PI * 0.75 + Math.PI * 1.55 * e;
            shoulderZ_L = 0.25 - 0.15 * e; shoulderZ_R = -0.25 + 0.15 * e;
            spineX = -0.20 + 0.55 * e;
          } else if (p < FOLLOW_END) {
            shoulderX = Math.PI * 0.80;
            spineX = 0.35 + 0.10 * ((p - STRIKE_END) / (FOLLOW_END - STRIKE_END));
          } else {
            const t = (p - FOLLOW_END) / (1 - FOLLOW_END);
            const e = 1 - Math.pow(1 - t, 2);
            shoulderX = Math.PI * 0.80 * (1 - e);
            shoulderZ_L = 0.10 * (1 - e); shoulderZ_R = -0.10 * (1 - e);
            spineX = 0.45 * (1 - e);
          }
          if (ud.armL.shoulder) {
            ud.armL.shoulder.rotation.x = THREE.MathUtils.lerp(ud.armL.shoulder.rotation.x || 0, shoulderX, Math.min(1, dt * 22));
            ud.armL.shoulder.rotation.z = THREE.MathUtils.lerp(ud.armL.shoulder.rotation.z || 0, shoulderZ_L, Math.min(1, dt * 22));
          }
          if (ud.armR.shoulder) {
            ud.armR.shoulder.rotation.x = THREE.MathUtils.lerp(ud.armR.shoulder.rotation.x || 0, shoulderX, Math.min(1, dt * 22));
            ud.armR.shoulder.rotation.z = THREE.MathUtils.lerp(ud.armR.shoulder.rotation.z || 0, shoulderZ_R, Math.min(1, dt * 22));
          }
          if (ud.spine) ud.spine.rotation.x = THREE.MathUtils.lerp(ud.spine.rotation.x || 0, spineX, Math.min(1, dt * 18));
        }
      }

      // §6.4 — Громтомат (хук / апперкот / финишер)
      if (window.__POTATO_MODE && window.__POTATO_FORM === 2 && hasAttack && !isCarrot) {
        const p = 1 - (P.attackTimer / P.attackDuration);
        const step = P.comboStep;
        if (ud.armL && ud.armR) {
          if (step === 1 || step === 3) {
            const lead = step === 1 ? ud.armL : ud.armR;
            const leadOther = step === 1 ? ud.armR : ud.armL;
            const sign = step === 1 ? 1 : -1;
            let shoulderX = 0, shoulderZ = 0;
            if (p < 0.30) {
              const t = p / 0.30;
              shoulderX = -0.6 * t; shoulderZ = sign * 0.4 * t;
            } else if (p < 0.55) {
              const t = (p - 0.30) / 0.25;
              const e = 1 - Math.pow(1 - t, 3);
              shoulderX = -0.6 + 1.5 * e; shoulderZ = sign * (0.4 - 0.6 * e);
            } else {
              const t = (p - 0.55) / 0.45;
              const e = 1 - t;
              shoulderX = 0.9 * e; shoulderZ = sign * (-0.2) * e;
            }
            if (lead.shoulder) {
              lead.shoulder.rotation.x = THREE.MathUtils.lerp(lead.shoulder.rotation.x || 0, shoulderX, Math.min(1, dt * 22));
              lead.shoulder.rotation.z = THREE.MathUtils.lerp(lead.shoulder.rotation.z || 0, shoulderZ, Math.min(1, dt * 22));
            }
            if (leadOther.shoulder) leadOther.shoulder.rotation.x = THREE.MathUtils.lerp(leadOther.shoulder.rotation.x || 0, -shoulderX * 0.4, Math.min(1, dt * 18));
            if (ud.spine) ud.spine.rotation.y = THREE.MathUtils.lerp(ud.spine.rotation.y || 0, -sign * 0.5 * Math.sin(p * Math.PI), Math.min(1, dt * 20));
          } else if (step === 4) {
            let shoulderX = 0;
            if (p < 0.25) shoulderX = 0.4 * (p / 0.25);
            else if (p < 0.55) { const t = (p - 0.25) / 0.30; shoulderX = 0.4 - 3.2 * (1 - Math.pow(1 - t, 3)); }
            else { const t = (p - 0.55) / 0.45; shoulderX = -2.8 * (1 - t); }
            if (ud.armL.shoulder) ud.armL.shoulder.rotation.x = THREE.MathUtils.lerp(ud.armL.shoulder.rotation.x || 0, shoulderX, Math.min(1, dt * 24));
            if (ud.armR.shoulder) ud.armR.shoulder.rotation.x = THREE.MathUtils.lerp(ud.armR.shoulder.rotation.x || 0, shoulderX, Math.min(1, dt * 24));
            if (ud.spine) ud.spine.rotation.x = THREE.MathUtils.lerp(ud.spine.rotation.x || 0, -0.3 * Math.sin(p * Math.PI), Math.min(1, dt * 20));
          } else if (step === 5) {
            let shoulderX = 0;
            if (p < 0.35) shoulderX = 0.5 * (p / 0.35);
            else if (p < 0.60) { const t = (p - 0.35) / 0.25; shoulderX = 0.5 - 2.0 * (1 - Math.pow(1 - t, 3)); }
            else { const t = (p - 0.60) / 0.40; shoulderX = -1.5 * (1 - t); }
            if (ud.armL.shoulder) ud.armL.shoulder.rotation.x = THREE.MathUtils.lerp(ud.armL.shoulder.rotation.x || 0, shoulderX, Math.min(1, dt * 22));
            if (ud.armR.shoulder) ud.armR.shoulder.rotation.x = THREE.MathUtils.lerp(ud.armR.shoulder.rotation.x || 0, shoulderX, Math.min(1, dt * 22));
            if (ud.spine) ud.spine.rotation.x = THREE.MathUtils.lerp(ud.spine.rotation.x || 0, -0.4 * Math.sin(p * Math.PI), Math.min(1, dt * 18));
          }
        }
      }

      // §6.5 — SMEAR FRAMES
      let activeWrist = null;
      let smearColor = 0xfff200;
      if (hasAttack && !isCarrot) {
        const p = 1 - (P.attackTimer / P.attackDuration);
        const STRIKE_START = 0.30, STRIKE_END = 0.60;
        const inStrike = (p >= STRIKE_START && p <= STRIKE_END);
        if (window.__POTATO_MODE && window.__POTATO_FORM === 2 && (P.comboStep === 1 || P.comboStep === 3)) {
          activeWrist = (P.comboStep === 1 && ud.armL) ? ud.armL.wrist : (ud.armR ? ud.armR.wrist : null);
        } else {
          activeWrist = ud.armR && ud.armR.wrist ? ud.armR.wrist : (ud.armL ? ud.armL.wrist : null);
        }
        if (window.__POTATO_MODE) smearColor = (window.__POTATO_FORM === 1) ? 0xffaa00 : 0xff4400;
        else if (window.PEPPER_MODE) smearColor = (window.__EVO && window.__EVO.pepper_blue_flame) ? 0x00e5ff : 0xff4400;
        else if (window.LEMON_MODE) smearColor = 0xffee00;
        else { try { smearColor = (window.SUITS[P.suitIdx].slashColor) || 0xfff200; } catch (e) {} }

        if (inStrike && ud.fistR) {
          const k = (p - STRIKE_START) / (STRIKE_END - STRIKE_START);
          const boost = Math.sin(k * Math.PI);
          ud.fistR.scale.set(1 + boost * 0.20, 1 + boost * 0.45, 1 + boost * 0.20);
        } else if (ud.fistR) {
          ud.fistR.scale.x = THREE.MathUtils.lerp(ud.fistR.scale.x, 1, Math.min(1, dt * 12));
          ud.fistR.scale.y = THREE.MathUtils.lerp(ud.fistR.scale.y, 1, Math.min(1, dt * 12));
          ud.fistR.scale.z = THREE.MathUtils.lerp(ud.fistR.scale.z, 1, Math.min(1, dt * 12));
        }
        if (inStrike && activeWrist) {
          const wp = new THREE.Vector3();
          try { activeWrist.getWorldPosition(wp); } catch (e) {}
          smearTrail.points.push({ pos: wp.clone(), life: 0.18 });
          if (smearTrail.points.length > SMEAR_MAX_POINTS) smearTrail.points.shift();
          smearTrail.color = smearColor;
          smearTrail.active = true;
        }
      }

      for (let i = smearTrail.points.length - 1; i >= 0; i--) {
        smearTrail.points[i].life -= dt;
        if (smearTrail.points[i].life <= 0) smearTrail.points.splice(i, 1);
      }
      if (smearTrail.points.length >= 2) {
        for (let s = 0; s < smearPool.length; s++) {
          if (smearPool[s].inUse) {
            smearPool[s].life -= dt;
            if (smearPool[s].life <= 0) releaseSmearMesh(smearPool[s]);
            else smearPool[s].mesh.material.opacity = Math.max(0, smearPool[s].life / smearPool[s].maxLife) * 0.9;
          }
        }
        for (let i = 0; i < smearTrail.points.length - 1; i++) {
          const a = smearTrail.points[i].pos;
          const b = smearTrail.points[i + 1].pos;
          const dist = a.distanceTo(b);
          if (dist < 0.15) continue;
          const sm = acquireSmearMesh();
          if (!sm) break;
          sm.mesh.position.copy(a).add(b).multiplyScalar(0.5);
          sm.mesh.scale.set(dist, 0.25, 1);
          const dir = b.clone().sub(a).normalize();
          const camDir = window.camera ? window.camera.position.clone().sub(sm.mesh.position).normalize() : new THREE.Vector3(0, 0, 1);
          const side = dir.clone().cross(camDir).normalize();
          const up = side.clone().cross(dir).normalize();
          const m4 = new THREE.Matrix4();
          m4.makeBasis(dir, up, side);
          sm.mesh.quaternion.setFromRotationMatrix(m4);
          sm.mesh.material.color.setHex(smearTrail.color);
          const idxFade = (i + 1) / smearTrail.points.length;
          sm.mesh.material.opacity = 0.9 * idxFade;
          sm.life = 0.18;
          sm.maxLife = 0.18;
        }
      }
    };

    // Тик очистки smear
    window.__V65_TICKS.push(function (dt) {
      for (let i = 0; i < smearPool.length; i++) {
        if (smearPool[i].inUse) {
          smearPool[i].life -= dt * 0.5;
          if (smearPool[i].life <= 0) releaseSmearMesh(smearPool[i]);
        }
      }
    });

    console.log("🍌 [v65.1] Часть 6 установлена — кинематика + Smear.");
  });

  // ================================================================
  // ═══ ЧАСТЬ 7 — RAGDOLL + HIT-STAGGER ═══
  // ================================================================
  whenReady(function () {
    const P = window.player;
    const S = window.scene;

    window.__RAGDOLLS = window.__RAGDOLLS || [];
    window.__RAGDOLLS_MAX = 30;

    // §7.2 — Безопасный клон
    function safeCloneGroup(src) {
      if (!src) return null;
      const clone = src.clone(true);
      const materialMap = new Map();
      clone.traverse(function (o) {
        if (!o.isMesh) return;
        if (Array.isArray(o.material)) {
          o.material = o.material.map(function (m) {
            if (!m) return m;
            if (materialMap.has(m)) return materialMap.get(m);
            let nm;
            try { nm = m.clone ? m.clone() : m; } catch (e) { nm = m; }
            materialMap.set(m, nm);
            return nm;
          });
        } else if (o.material) {
          if (materialMap.has(o.material)) o.material = materialMap.get(o.material);
          else {
            let nm;
            try { nm = o.material.clone ? o.material.clone() : o.material; } catch (e) { nm = o.material; }
            materialMap.set(o.material, nm);
            o.material = nm;
          }
        }
      });
      return clone;
    }

    // §7.3 — Старт рэгдолла
    function startRagdoll(clone, origEn, knockVec) {
      if (!clone || !origEn) return;
      clone.position.copy(origEn.group.position);
      clone.rotation.copy(origEn.group.rotation);
      clone.scale.copy(origEn.group.scale);
      S.add(clone);

      const vel = new THREE.Vector3();
      if (knockVec && (Math.abs(knockVec.x) > 0.01 || Math.abs(knockVec.z) > 0.01)) {
        const len = Math.hypot(knockVec.x, knockVec.z) || 1;
        vel.x = (knockVec.x / len) * (10 + Math.random() * 6);
        vel.z = (knockVec.z / len) * (10 + Math.random() * 6);
      } else {
        vel.x = (Math.random() - 0.5) * 14;
        vel.z = (Math.random() - 0.5) * 14;
      }
      vel.y = 14 + Math.random() * 8;

      const rotVel = { x: 11 + (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 8, z: 7 + (Math.random() - 0.5) * 3 };

      const limbs = [];
      clone.traverse(function (o) {
        if (o.isGroup && o !== clone) {
          let hasCylinder = false;
          o.traverse(function (child) {
            if (child.isMesh && child.geometry && child.geometry.type === "CylinderGeometry") hasCylinder = true;
          });
          if (hasCylinder && o.parent && o.parent !== clone) {
            limbs.push({
              obj: o, baseRotX: o.rotation.x, baseRotZ: o.rotation.z,
              phase: Math.random() * Math.PI * 2, speed: 4 + Math.random() * 6
            });
          }
        }
      });

      let juiceColor = 0xff9f1a;
      const t = origEn.type || "";
      if (t === "lemon") juiceColor = 0xfff200;
      else if (t === "mandarin" || t === "brawler" || t === "leader") juiceColor = 0xff9f1a;
      else if (t === "tank") juiceColor = 0xff7f00;
      else if (t === "heli") juiceColor = 0xff4400;
      else if (t === "necromancer") juiceColor = 0xaa44ff;
      else if (t === "valkyrie") juiceColor = 0x00f2fe;
      else if (t === "shield") juiceColor = 0x00ff66;
      else if (t === "sniper") juiceColor = 0xff0000;
      else if (t === "medic") juiceColor = 0x00ff88;
      else if (t === "kamikaze") juiceColor = 0xff4400;
      else if (t === "titan") juiceColor = 0xff0055;

      const isBoss = !!(origEn._isBoss || t === "titan" || t === "lemon" || t === "valkyrie" || t === "necromancer" || t === "brawler");

      window.__RAGDOLLS.push({
        group: clone, origEn: origEn, vel: vel, rotVel: rotVel,
        life: 0.75, maxLife: 0.75, juiceColor: juiceColor, isBoss: isBoss,
        limbs: limbs, hasBounced: false, hasHitBuilding: false
      });

      while (window.__RAGDOLLS.length > window.__RAGDOLLS_MAX) {
        const old = window.__RAGDOLLS.shift();
        if (old && old.group) {
          try {
            S.remove(old.group);
            if (typeof window.safeDisposeGroup === "function") window.safeDisposeGroup(old.group);
          } catch (e) {}
        }
      }

      if (typeof window.spawnParticles === "function")
        window.spawnParticles(clone.position.clone().add(new THREE.Vector3(0, 2, 0)), juiceColor, isBoss ? 16 : 8);
      if (isBoss && typeof window.spawnGroundCrackRing === "function")
        window.spawnGroundCrackRing(clone.position, 0xff0055, 12);
      if (window.SoundFX) {
        if (isBoss && window.SoundFX.devastator) window.SoundFX.devastator();
        else if (window.SoundFX.boom) window.SoundFX.boom();
      }
    }
    window.__startRagdoll = startRagdoll;

    // §7.4 — Обёртка damageEnemy
    const _origDamageEnemyPart7 = window.damageEnemy;
    window.damageEnemy = function (en, dmg, knockVec, popText) {
      if (!en || en.isRagdoll) return;

      // Hit-stagger
      if (en.hp > 0) {
        en._hitStagger = 0.2;
        if (en.group && en._hitStaggerBaseX === undefined) en._hitStaggerBaseX = en.group.rotation.x || 0;
      }

      // Расчёт willDie с учётом blue_flame множителя (Часть 4)
      const mult = window.__v65_calcBlueFlameMult ? window.__v65_calcBlueFlameMult() : 1.0;
      const effectiveDmg = dmg * mult;
      const willDie = (en.hp - effectiveDmg <= 0);
      let ragdollClone = null;
      if (willDie && en.group && en.group.parent) {
        try { ragdollClone = safeCloneGroup(en.group); } catch (e) {}
      }

      _origDamageEnemyPart7.call(this, en, dmg, knockVec, popText);

      if (willDie && ragdollClone) {
        try { startRagdoll(ragdollClone, en, knockVec); }
        catch (e) {
          if (ragdollClone && ragdollClone.parent) S.remove(ragdollClone);
        }
      }
    };

    // §7.5 — Hit-stagger тик
    window.__V65_TICKS.push(function (dt) {
      for (let i = 0; i < window.enemies.length; i++) {
        const en = window.enemies[i];
        if (!en || !en.group) continue;
        if (en.type === "heli") continue;
        if (en._hitStagger > 0) {
          en._hitStagger -= dt;
          const baseX = en._hitStaggerBaseX || 0;
          const staggerAmt = 0.30 * (en._hitStagger / 0.2);
          en.group.rotation.x = baseX - staggerAmt;
          const wobble = Math.sin(performance.now() * 0.020) * 0.05;
          if (en.armL) en.armL.rotation.z = (en.armL.rotation.z || 0) + wobble * 0.3;
          if (en.armR) en.armR.rotation.z = (en.armR.rotation.z || 0) - wobble * 0.3;
        } else if (en._hitStaggerBaseX !== undefined) {
          en.group.rotation.x = THREE.MathUtils.lerp(en.group.rotation.x, en._hitStaggerBaseX, Math.min(1, dt * 8));
          if (Math.abs(en.group.rotation.x - en._hitStaggerBaseX) < 0.005) {
            en.group.rotation.x = en._hitStaggerBaseX;
            en._hitStaggerBaseX = undefined;
          }
        }
      }
    });

    // §7.6 — Рэгдолл-физика
    function explodeJuice(r, position) {
      const color = r.juiceColor || 0xff9f1a;
      if (typeof window.spawnParticles === "function")
        window.spawnParticles(position.clone().add(new THREE.Vector3(0, 0.5, 0)), color, r.isBoss ? 30 : 14);
      if (typeof window.spawnGroundCrackRing === "function")
        window.spawnGroundCrackRing(position, color, r.isBoss ? 8 : 4.5);
      if (window.SoundFX && window.SoundFX.boom) window.SoundFX.boom();
    }

    window.__V65_TICKS.push(function (dt) {
      const arr = window.__RAGDOLLS;
      if (!arr || !arr.length) return;
      for (let i = arr.length - 1; i >= 0; i--) {
        const r = arr[i];
        r.life -= dt;
        r.vel.y -= 32 * dt;
        r.group.position.x += r.vel.x * dt;
        r.group.position.y += r.vel.y * dt;
        r.group.position.z += r.vel.z * dt;
        const rotDamp = Math.max(0.3, r.life / r.maxLife);
        r.group.rotation.x += r.rotVel.x * dt * rotDamp;
        r.group.rotation.y += r.rotVel.y * dt * rotDamp;
        r.group.rotation.z += r.rotVel.z * dt * rotDamp;
        for (let l = 0; l < r.limbs.length; l++) {
          const limb = r.limbs[l];
          limb.phase += dt * limb.speed;
          limb.obj.rotation.x = limb.baseRotX + Math.sin(limb.phase) * 0.6;
          limb.obj.rotation.z = limb.baseRotZ + Math.cos(limb.phase * 0.7) * 0.4;
        }
        if (r.group.position.y <= 0.30 && r.vel.y < 0) {
          r.group.position.y = 0.30;
          if (!r.hasBounced) {
            r.hasBounced = true;
            explodeJuice(r, r.group.position.clone());
            r.vel.y = 4 + Math.random() * 4;
            r.vel.x *= 0.5; r.vel.z *= 0.5;
            r.rotVel.x *= 0.6; r.rotVel.z *= 0.6;
          } else {
            r.vel.y = -r.vel.y * 0.35;
            r.vel.x *= 0.7; r.vel.z *= 0.7;
            r.rotVel.multiplyScalar(0.7);
          }
        }
        if (!r.hasHitBuilding && window.buildings && window.buildings.length) {
          const rx = r.group.position.x;
          const rz = r.group.position.z;
          const ry = r.group.position.y;
          for (let b = 0; b < window.buildings.length; b++) {
            const bd = window.buildings[b];
            if (rx > bd.minX && rx < bd.maxX && rz > bd.minZ && rz < bd.maxZ && ry < bd.topY) {
              r.hasHitBuilding = true;
              explodeJuice(r, r.group.position.clone());
              r.vel.x = -r.vel.x * 0.4;
              r.vel.z = -r.vel.z * 0.4;
              r.vel.y = Math.max(r.vel.y, 3);
              break;
            }
          }
        }
        if (r.life <= 0) {
          if (!r.hasBounced) explodeJuice(r, r.group.position.clone());
          try {
            S.remove(r.group);
            if (typeof window.safeDisposeGroup === "function") window.safeDisposeGroup(r.group);
          } catch (e) {}
          arr.splice(i, 1);
        }
      }
    });

    // §7.7 — Вспышка материала при hit-stagger
    window.__V65_TICKS.push(function (dt) {
      for (let i = 0; i < window.enemies.length; i++) {
        const en = window.enemies[i];
        if (!en || !en.group) continue;
        if (en._hitStagger > 0) {
          en.group.traverse(function (o) {
            if (o.isMesh && o.material && o.material.emissive) {
              const intensity = Math.sin(en._hitStagger / 0.2 * Math.PI);
              if (o._origEmissiveIntensity === undefined) o._origEmissiveIntensity = o.material.emissiveIntensity || 1.0;
              o.material.emissiveIntensity = o._origEmissiveIntensity + intensity * 1.5;
            }
          });
        } else {
          en.group.traverse(function (o) {
            if (o.isMesh && o.material && o.material.emissive && o._origEmissiveIntensity !== undefined) {
              o.material.emissiveIntensity = THREE.MathUtils.lerp(
                o.material.emissiveIntensity || 1.0, o._origEmissiveIntensity, Math.min(1, dt * 12));
              if (Math.abs(o.material.emissiveIntensity - o._origEmissiveIntensity) < 0.01) {
                o.material.emissiveIntensity = o._origEmissiveIntensity;
                o._origEmissiveIntensity = undefined;
              }
            }
          });
        }
      }
    });

    // §7.8 — Очистка при смерти
    const _origApplyDmgRag = window.applyDamageToHero;
    window.applyDamageToHero = function (dmg) {
      if (P.isDead) {
        for (let i = window.__RAGDOLLS.length - 1; i >= 0; i--) {
          const r = window.__RAGDOLLS[i];
          try {
            if (r.group && r.group.parent) S.remove(r.group);
            if (r.group && typeof window.safeDisposeGroup === "function") window.safeDisposeGroup(r.group);
          } catch (e) {}
          window.__RAGDOLLS.splice(i, 1);
        }
      }
      return _origApplyDmgRag.apply(this, arguments);
    };

    console.log("🍌 [v65.1] Часть 7 установлена — Ragdoll + Hit-stagger.");
  });

  // ================================================================
  // ═══ ЧАСТЬ 8 — AERIAL TRAFFIC + LIGHTS + DEBRIS + SHOULDER OFFSET ═══
  // ================================================================
  whenReady(function () {
    const P = window.player;
    const S = window.scene;
    const isKeyDown = window.__v65_isKeyDown || function () { return false; };

    // §8.1 — Aerial Traffic
    window.__V65_SPEEDERS = window.__V65_SPEEDERS || [];

    function buildAerialTraffic() {
      if (window.__V65_SPEEDERS.length > 0) return;
      const ROUTES = [
        { radius: 260, height: 42, speed: 0.25, color: 0x00f2fe },
        { radius: 400, height: 54, speed: 0.20, color: 0xff0055 },
        { radius: 540, height: 68, speed: 0.15, color: 0xf9ca24 },
        { radius: 680, height: 82, speed: 0.12, color: 0x00ff66 }
      ];
      let totalBuilt = 0;
      const TARGET_TOTAL = 25;
      for (let r = 0; r < ROUTES.length && totalBuilt < TARGET_TOTAL; r++) {
        const route = ROUTES[r];
        const count = (r < 1) ? 7 : 6;
        for (let i = 0; i < count && totalBuilt < TARGET_TOTAL; i++) {
          const g = new THREE.Group();
          const bodyMat = window.createPrototypeShader(0x1a1a2a, 0x0a0a12, 9, route.color);
          const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.50, 0.50, 3.20, 10),
            bodyMat
          );
          body.rotation.z = Math.PI / 2;
          if (typeof window.addInkOutline === "function") window.addInkOutline(body, 1.03);
          g.add(body);

          const cockpit = new THREE.Mesh(
            new THREE.SphereGeometry(0.55, 10, 10),
            new THREE.MeshBasicMaterial({ color: route.color, transparent: true, opacity: 0.65 })
          );
          cockpit.scale.set(1.0, 0.8, 1.6);
          cockpit.position.set(0.3, 0.15, 0);
          g.add(cockpit);

          const headlight = new THREE.Mesh(
            new THREE.SphereGeometry(0.22, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0xffee00 })
          );
          headlight.position.set(1.55, 0, 0);
          g.add(headlight);

          for (let s = -1; s <= 1; s += 2) {
            const strip = new THREE.Mesh(
              new THREE.BoxGeometry(2.0, 0.06, 0.06),
              new THREE.MeshBasicMaterial({ color: route.color })
            );
            strip.position.set(0, 0.35 * s, 0);
            g.add(strip);
          }
          for (let s = -1; s <= 1; s += 2) {
            const flame = new THREE.Mesh(
              new THREE.ConeGeometry(0.22, 1.50, 6),
              new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.75 })
            );
            flame.rotation.z = -Math.PI / 2;
            flame.position.set(-1.80, 0.10 * s, 0);
            g.add(flame);
            if (s === 1) g.userData.flame = flame;
          }
          S.add(g);
          const initialAngle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
          window.__V65_SPEEDERS.push({
            group: g, radius: route.radius, height: route.height,
            speed: route.speed, angle: initialAngle, color: route.color,
            id: "speeder_" + r + "_" + i, bobPhase: Math.random() * Math.PI * 2,
            isDestroyed: false, collideRadius: 2.5
          });
          totalBuilt++;
        }
      }
      console.log("[SPEEDERS] Построено " + window.__V65_SPEEDERS.length + " спидеров.");
    }

    // §8.2 — Projectile Lights
    const projLights = [];
    function initProjLights() {
      if (projLights.length > 0) return;
      for (let i = 0; i < 4; i++) {
        const light = new THREE.PointLight(0xffffff, 0, 22);
        S.add(light);
        projLights.push(light);
      }
    }
    function updateProjLights() {
      if (!projLights.length) return;
      const candidates = [];
      if (window.projectiles) {
        for (let i = 0; i < window.projectiles.length; i++) {
          const pr = window.projectiles[i];
          if (!pr.fromPlayer || !pr.mesh || !pr.mesh.material) continue;
          let col = 0xffffff;
          try { col = pr.mesh.material.color ? pr.mesh.material.color.getHex() : 0xffffff; } catch (e) {}
          candidates.push({ pos: pr.mesh.position, color: col, intensity: 3.5, priority: 5 });
        }
      }
      if (window.PEPPER_MODE && P.pepperFistAuraTimer > 0) {
        const c = (window.__EVO && window.__EVO.pepper_blue_flame) ? 0x00e5ff : 0xff4400;
        candidates.push({ pos: P.pos.clone().add(new THREE.Vector3(0, 2.2, 0)), color: c, intensity: 3.0, priority: 4 });
      }
      if (window.PEPPER_MODE && P.tCharging) {
        candidates.push({ pos: P.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), color: 0xff2200, intensity: 4.0, priority: 6 });
      }
      if (window.LEMON_MODE && P.lemonLaserActive) {
        const fwd = new THREE.Vector3(-Math.sin(P.camYaw), 0, -Math.cos(P.camYaw));
        candidates.push({
          pos: P.pos.clone().add(new THREE.Vector3(0, 2.2, 0)).add(fwd.multiplyScalar(8)),
          color: 0x44ffaa, intensity: 3.5, priority: 5
        });
      }
      if (window.Rocket && window.Rocket.active && window.Rocket.active.length > 0) {
        for (let i = 0; i < window.Rocket.active.length; i++) {
          const rk = window.Rocket.active[i];
          if (!rk.mesh) continue;
          candidates.push({ pos: rk.mesh.position, color: 0x00f2fe, intensity: 4.0, priority: 6 });
        }
      }
      if (window.enemies) {
        for (let i = 0; i < window.enemies.length; i++) {
          const en = window.enemies[i];
          if (en._ketchupDetonate) candidates.push({
            pos: en.group.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
            color: 0xff2200, intensity: 2.5, priority: 3
          });
        }
      }
      if (window.__POTATO_MODE && P._potatoRamCd > 5.5 && window.__EVO && window.__EVO.potato_juggernaut) {
        candidates.push({ pos: P.pos.clone().add(new THREE.Vector3(0, 1.0, 0)), color: 0xff6600, intensity: 3.0, priority: 4 });
      }
      candidates.sort(function (a, b) { return b.priority - a.priority; });
      for (let i = 0; i < projLights.length; i++) {
        if (i < candidates.length) {
          projLights[i].position.copy(candidates[i].pos);
          projLights[i].color.setHex(candidates[i].color);
          projLights[i].intensity = candidates[i].intensity;
        } else {
          projLights[i].intensity = 0;
        }
      }
    }

    // §8.3 — 3D Ground Debris
    const debrisPool = [];
    const DEBRIS_POOL_SIZE = 60;
    const DEBRIS_MAX_ACTIVE = 120;
    let debrisActiveCount = 0;

    function initDebrisPool() {
      if (debrisPool.length > 0) return;
      for (let i = 0; i < DEBRIS_POOL_SIZE; i++) {
        const geo = new THREE.DodecahedronGeometry(0.35 + Math.random() * 0.35, 0);
        const mat = window.createPrototypeShader(0x3a2a1a, 0x1a0e05, 7, 0xff4400);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.visible = false;
        S.add(mesh);
        debrisPool.push({
          mesh: mesh, inUse: false,
          vel: new THREE.Vector3(), rotVel: new THREE.Vector3(), life: 0
        });
      }
    }

    function acquireDebris() {
      if (debrisActiveCount >= DEBRIS_MAX_ACTIVE) return null;
      for (let i = 0; i < debrisPool.length; i++) {
        if (!debrisPool[i].inUse) {
          debrisPool[i].inUse = true;
          debrisPool[i].mesh.visible = true;
          debrisActiveCount++;
          return debrisPool[i];
        }
      }
      // Пул кончился — временный
      const geo = new THREE.DodecahedronGeometry(0.35 + Math.random() * 0.35, 0);
      const mat = window.createPrototypeShader(0x3a2a1a, 0x1a0e05, 7, 0xff4400);
      const mesh = new THREE.Mesh(geo, mat);
      S.add(mesh);
      debrisActiveCount++;
      return { mesh: mesh, inUse: true, vel: new THREE.Vector3(), rotVel: new THREE.Vector3(), life: 0, _temp: true };
    }

    function releaseDebris(d) {
      if (!d) return;
      if (d._temp) {
        if (d.mesh.parent) S.remove(d.mesh);
        if (d.mesh.geometry) d.mesh.geometry.dispose();
      } else {
        d.mesh.visible = false;
        d.inUse = false;
      }
      debrisActiveCount = Math.max(0, debrisActiveCount - 1);
    }

    // Перехват spawnGroundCrackRing (цепочка: база → Часть 4 → Часть 8)
    const _origSpawnCrackP8 = window.spawnGroundCrackRing;
    window.spawnGroundCrackRing = function (pos, colorHex, maxR) {
      if (_origSpawnCrackP8) _origSpawnCrackP8.apply(this, arguments);
      if (!pos || !debrisPool.length) return;
      const count = 8 + Math.floor(Math.random() * 5);
      const baseRadius = maxR || 11;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.25;
        const dist = baseRadius * (0.30 + Math.random() * 0.55);
        const d = acquireDebris();
        if (!d) break;
        d.mesh.position.set(pos.x + Math.cos(angle) * dist, 0.20, pos.z + Math.sin(angle) * dist);
        d.mesh.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
        d.mesh.scale.setScalar(0.7 + Math.random() * 0.7);
        try {
          if (d.mesh.material && colorHex !== undefined)
            d.mesh.material = window.createPrototypeShader(0x3a2a1a, 0x1a0e05, 7, colorHex);
        } catch (e) {}
        d.vel.set(
          Math.cos(angle) * (2 + Math.random() * 5),
          6 + Math.random() * 10,
          Math.sin(angle) * (2 + Math.random() * 5)
        );
        d.rotVel.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
        d.life = 1.2;
      }
    };

    // §8.4 — Shoulder Offset + Soft-Lock
    const _origUpdateChoreoP8 = window.updatePlayerChoreographyAndCamera;
    window.updatePlayerChoreographyAndCamera = function (dt, now) {
      if (_origUpdateChoreoP8) _origUpdateChoreoP8.apply(this, arguments);
      if (window.camera && P && !P.isDead) {
        try {
          const rgt = new THREE.Vector3(Math.cos(P.camYaw), 0, -Math.sin(P.camYaw));
          window.camera.position.addScaledVector(rgt, 0.80);
          const lookAt = new THREE.Vector3(
            P.pos.x,
            P.pos.y + (window.CARROT_FORM === 2 ? 5.0 : 2.8),
            P.pos.z
          );
          lookAt.addScaledVector(rgt, 0.40);
          window.camera.lookAt(lookAt);
        } catch (e) {}
      }
    };

    // Soft-Lock
    const _origPPA_P8 = window.performPrimaryAttack;
    window.performPrimaryAttack = function () {
      try {
        if (P && !P.isDead) {
          const camFwd = new THREE.Vector3(-Math.sin(P.camYaw), 0, -Math.cos(P.camYaw));
          let bestTarget = null, bestScore = -1;
          const MAX_DIST = 6.0;
          for (let i = 0; i < window.enemies.length; i++) {
            const en = window.enemies[i];
            const toE = en.group.position.clone().sub(P.pos);
            const dist = toE.length();
            if (dist > MAX_DIST) continue;
            const dir = toE.clone().normalize();
            const dot = dir.dot(camFwd);
            if (dot < 0.70) continue;
            const score = dot * (1 - dist / MAX_DIST) * 2;
            if (score > bestScore) { bestScore = score; bestTarget = en; }
          }
          if (bestTarget && bestScore > 0.15) {
            const dx = bestTarget.group.position.x - P.pos.x;
            const dz = bestTarget.group.position.z - P.pos.z;
            P.facingYaw = Math.atan2(-dx, -dz);
            const dir = new THREE.Vector3(dx, 0, dz).normalize();
            P.vel.x += dir.x * 3.0;
            P.vel.z += dir.z * 3.0;
          }
        }
      } catch (e) {}
      if (_origPPA_P8) return _origPPA_P8.apply(this, arguments);
    };

    // §8.5 — Speeders update
    function updateSpeeders(dt, now) {
      const arr = window.__V65_SPEEDERS;
      if (!arr || !arr.length) return;
      for (let i = 0; i < arr.length; i++) {
        const s = arr[i];
        if (!s.group || s.isDestroyed) continue;
        s.angle += s.speed * dt;
        if (s.angle > Math.PI * 2) s.angle -= Math.PI * 2;
        const x = Math.cos(s.angle) * s.radius;
        const z = Math.sin(s.angle) * s.radius;
        const y = s.height + Math.sin(now * 0.0015 + s.bobPhase) * 2.0;
        s.group.position.set(x, y, z);
        s.group.rotation.y = -s.angle + Math.PI;
        if (s.group.userData.flame) s.group.userData.flame.material.opacity = 0.5 + Math.sin(now * 0.01 + s.bobPhase) * 0.25;

        if (!P || P.isDead) continue;
        const distToPlayer = P.pos.distanceTo(s.group.position);

        // Приземление
        if (!P.isGrounded && !P._v65_onSpeeder && distToPlayer < 3.2 &&
            P.pos.y > s.group.position.y - 1.5 && P.pos.y < s.group.position.y + 4 &&
            (P.vel.y || 0) <= 0) {
          P._v65_onSpeeder = s;
          P.vel.set(0, 0, 0);
          P.pos.copy(s.group.position);
          P.pos.y += 1.5;
          P.isGrounded = true;
          P.isFlying = false;
          if (typeof window.spawnComicPop === "function")
            window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 2, 0)), "🛹 СПИДЕР!", "#00f2fe");
          if (window.SoundFX && window.SoundFX.whip) window.SoundFX.whip();
        }

        if (P._v65_onSpeeder === s) {
          P.pos.copy(s.group.position);
          P.pos.y += 1.5;
          P.vel.set(0, 0, 0);
          P.isGrounded = true;
          P.facingYaw = -s.angle + Math.PI;

          // Прыжок
          if (isKeyDown("Space")) {
            P._v65_onSpeeder = null;
            P.vel.x = Math.cos(s.angle) * 22;
            P.vel.z = Math.sin(s.angle) * 22;
            P.vel.y = 22;
            P.isGrounded = false;
            P.airFlipTimer = 0.55;
            if (typeof window.spawnComicPop === "function")
              window.spawnComicPop(P.pos.clone().add(new THREE.Vector3(0, 2, 0)), "*СПРЫГНУЛ!*", "#fff200");
          }

          // Атака → взрыв
          if (P.attackTimer > 0.04 && P.attackTimer < P.attackDuration * 0.9 && !s._exploding) {
            s._exploding = true;
            const explPos = s.group.position.clone();
            if (typeof window.spawnParticles === "function") {
              window.spawnParticles(explPos, 0xff7f00, 20);
              window.spawnParticles(explPos, 0x00f2fe, 12);
            }
            if (typeof window.spawnGroundCrackRing === "function")
              window.spawnGroundCrackRing(explPos, 0xff7f00, 8);
            if (window.SoundFX && window.SoundFX.boom) window.SoundFX.boom();
            P.ep += 25;
            P.score += 500;
            if (typeof window.updateScoreDisplay === "function") window.updateScoreDisplay();
            if (typeof window.updateHUD === "function") window.updateHUD();
            P._v65_onSpeeder = null;
            P.vel.y = 8;
            P.isGrounded = false;
            s.isDestroyed = true;
            s.group.visible = false;
            if (typeof window.spawnComicPop === "function")
              window.spawnComicPop(explPos.clone().add(new THREE.Vector3(0, 3, 0)), "*СПИДЕР ВЗОРВАН! +25 EP*", "#ff7f00");
            setTimeout(function () {
              if (s.group) {
                s.group.visible = true;
                s.isDestroyed = false;
                s._exploding = false;
                s.angle = Math.random() * Math.PI * 2;
              }
            }, 15000);
          }
        }
      }
    }

    // §8.6 — Debris update
    function updateDebrisPool(dt) {
      for (let i = 0; i < debrisPool.length; i++) {
        const d = debrisPool[i];
        if (!d.inUse) continue;
        d.life -= dt;
        d.vel.y -= 28 * dt;
        d.mesh.position.addScaledVector(d.vel, dt);
        d.mesh.rotation.x += d.rotVel.x * dt;
        d.mesh.rotation.y += d.rotVel.y * dt;
        d.mesh.rotation.z += d.rotVel.z * dt;
        if (d.mesh.position.y <= 0.30 && d.vel.y < 0) {
          d.mesh.position.y = 0.30;
          d.vel.y *= -0.35;
          d.vel.x *= 0.70;
          d.vel.z *= 0.70;
          d.rotVel.multiplyScalar(0.70);
        }
        if (d.life < 0.3) d.mesh.position.y -= 1.5 * dt;
        if (d.life <= 0 || d.mesh.position.y < -1.5) releaseDebris(d);
      }
    }

    // §8.7 — Единый тик
    window.__V65_TICKS.push(function (dt) {
      updateSpeeders(dt, performance.now());
      updateDebrisPool(dt);
      updateProjLights();
    });

    // §8.8 — Сброс onSpeeder
    const _origApplyDmgP8 = window.applyDamageToHero;
    window.applyDamageToHero = function (dmg) {
      if (P.isDead) P._v65_onSpeeder = null;
      return _origApplyDmgP8.apply(this, arguments);
    };
    ["equipSuit", "equipPepper", "equipCarrot", "equipLemon", "equipPotato"].forEach(function (name) {
      const _orig = window[name];
      if (typeof _orig === "function") {
        window[name] = function () {
          P._v65_onSpeeder = null;
          return _orig.apply(this, arguments);
        };
      }
    });

    // §8.9 — Init
    setTimeout(function () {
      try {
        initDebrisPool();
        initProjLights();
        buildAerialTraffic();
      } catch (e) { console.error("[v65.1 Part 8] init error:", e); }
    }, 2500);

    console.log("🍌 [v65.1] Часть 8 установлена — Traffic + Lights + Debris + Shoulder.");
  });

  // ================================================================
  // ═══ ФИНАЛ ═══
  // ================================================================
  console.log("🍌 [PATCH v65.1 ULTIMATE] Все 9 частей загружены. Total OK.");
})();
