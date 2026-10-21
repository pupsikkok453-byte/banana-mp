// =======================================================
// BANANA INDUSTRIES - GLOBAL PATCH (v29 — Full)
// =======================================================
(function() {
  console.log("🍌 [PATCH] v29 — Полный патч игры.");

  // 1. Убираем кусты
  if (typeof addProp === 'function') {
    const _origAddProp = window.addProp;
    window.addProp = function(x, z, type) {
      if (type === 'bush') return;
      _origAddProp.apply(this, arguments);
    };
  }

  // 2. День и Ночь
  if (typeof TimeOfDay !== 'undefined') TimeOfDay.speed = 1 / 90;
  setTimeout(() => {
    scene.traverse((o) => {
      if (o.geometry && o.geometry.type === 'SphereGeometry') {
        const p = o.geometry.parameters;
        if (p && p.radius >= 4000) o.visible = false;
      }
    });
    const sunMoon = new THREE.Mesh(new THREE.SphereGeometry(100, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    scene.add(sunMoon);
    setInterval(() => {
      if (typeof TimeOfDay !== 'undefined') {
        const p = TimeOfDay.progress;
        const angle = p * Math.PI * 2 - Math.PI / 2;
        sunMoon.position.set(Math.cos(angle) * 3500, Math.sin(angle) * 3500, -1000);
        if (p < 0.2 || p > 0.8) { sunMoon.material.color.setHex(0xc0c0ff); sunMoon.scale.setScalar(0.6); }
        else { sunMoon.material.color.setHex(0xffee88); sunMoon.scale.setScalar(1.0); }
      }
    }, 100);
  }, 1000);

  // 3. Ландшафт
  setTimeout(() => {
    if (typeof scene !== 'undefined' && typeof createPrototypeShader === 'function') {
      const hillMat = createPrototypeShader(0x3a5a2a, 0x1a2a0a, 8, 0x88cc44);
      for (let i = 0; i < 20; i++) {
        const x = (Math.random() - 0.5) * 1600;
        const z = (Math.random() - 0.5) * 1600;
        if (Math.abs(x) < 120 && Math.abs(z) < 120) continue;
        const r = 25 + Math.random() * 35;
        const h = 8 + Math.random() * 15;
        const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6, 0, Math.PI*2, 0, Math.PI/2), hillMat);
        hill.position.set(x, 0, z); hill.scale.y = h / r; scene.add(hill);
      }
    }
  }, 1500);

  // 4. Хук обновления игрока (Морковь, Idle, Щит)
  if (typeof updatePlayerChoreographyAndCamera === 'function') {
    const _origChoreo = updatePlayerChoreographyAndCamera;
    window.updatePlayerChoreographyAndCamera = function(dt, now) {
      const isFrozen = window.__MP && window.__MP._myRootedUntil > now;
      const savedX = player.pos.x, savedZ = player.pos.z;
      _origChoreo.apply(this, arguments);
      
      if (isFrozen) { player.pos.x = savedX; player.pos.z = savedZ; player.vel.x = 0; player.vel.z = 0; playerGroup.position.copy(player.pos); }
      if (player.pos.y < 0) player.pos.y = 0;

      if (player.activeModeF && player.suitIdx === 3 && player.character === 'banana' && !PEPPER_MODE && !CARROT_MODE) {
        player.en -= 15 * dt;
        if (player.en <= 0) { player.en = 0; player.activeModeF = false; if (player.mesh && player.mesh.userData.limeShield) player.mesh.userData.limeShield.visible = false; }
      }

      if (!player.isDead && player.attackTimer <= 0 && !player.isFlying && !player.isDodging && !player.isSliding && !player.isWallRunning && !isFrozen) {
        const ud = player.mesh ? player.mesh.userData : null;
        if (ud && ud.spine) {
          ud.spine.rotation.x = Math.sin(now * 0.003) * 0.04;
          ud.spine.position.y = Math.sin(now * 0.003) * 0.02;
          if (ud.armL && ud.armL.shoulder) ud.armL.shoulder.rotation.x = Math.sin(now * 0.002) * 0.1;
          if (ud.armR && ud.armR.shoulder) ud.armR.shoulder.rotation.x = Math.sin(now * 0.002 + 1.5) * 0.1;
        }
      }
    };
  }

  // 5. Улучшенный щит (1.5x поглощение)
  const origDamageToHero = window.applyDamageToHero;
  window.applyDamageToHero = function(dmg) {
    if (player.activeModeF && player.suitIdx === 3 && player.character === 'banana' && !PEPPER_MODE && !CARROT_MODE) {
      const drain = dmg * 1.5;
      if (player.en >= drain) {
        player.en -= drain;
        if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3.2,0)), '*ЩИТ БЛОК*','#00f2fe');
        return;
      } else {
        player.activeModeF = false;
        if (player.mesh && player.mesh.userData.limeShield) player.mesh.userData.limeShield.visible = false;
      }
    }
    if (origDamageToHero) return origDamageToHero.apply(this, arguments);
  };

  // 6. Меню (Esc) + Дрон (B)
  window.addEventListener('keydown', e => {
    if (e.code === 'Escape' && typeof gameStarted !== 'undefined' && gameStarted) {
      document.getElementById('start-screen').style.display = 'flex';
      try { document.exitPointerLock(); } catch(err) {}
    }
    if (e.code === 'KeyB' && typeof player !== 'undefined' && player.character === 'banana') {
      if (typeof Companion !== 'undefined') {
        Companion._disabled = !Companion._disabled;
        if (Companion._disabled) {
          if (Companion.group) Companion.group.visible = false;
          Companion.shootCd = 99999; Companion.buffCd = 99999;
          player.companionShield = 0; player.companionRegen = 0; player.companionDmg = 0;
          if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), 'ДРОН ОТКЛЮЧЕН', '#ff0000');
        } else {
          if (Companion.group) Companion.group.visible = true;
          Companion.shootCd = 0; Companion.buffCd = 15;
          if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), 'ДРОН ВКЛЮЧЕН', '#00ff66');
        }
      }
    }
  });

  if (typeof Companion !== 'undefined') {
    const origUpdate = Companion.update;
    Companion.update = function(dt, now) {
      origUpdate.call(this, dt, now);
      if (this._disabled && this.group) { this.group.visible = false; this.shootCd = 99999; this.buffCd = 99999; }
    };
    const origFind = Companion.findNearestEnemy;
    Companion.findNearestEnemy = function(maxD) {
      let best = null, bd = maxD;
      if (window.__MP_MODE && window.__MP && window.__MP.remotes) {
        window.__MP.remotes.forEach((r, id) => {
          const d = r.group.position.distanceTo(this.group.position);
          if (d < bd) { bd = d; best = { isPlayer: true, id: id, group: r.group }; }
        });
      }
      if (origFind) {
        const enemy = origFind.call(this, maxD);
        if (enemy) {
          const d = enemy.group.position.distanceTo(this.group.position);
          if (d < bd) { bd = d; best = enemy; }
        }
      }
      return best;
    };
    const origShoot = Companion.shootAt;
    Companion.shootAt = function(e) {
      if (e.isPlayer) {
        if (window.__MP && window.__MP.room) window.__MP.room.send('pvp', { targetId: e.id, damage: 5 });
        if (typeof SoundFX !== 'undefined') SoundFX.whip();
        const p = ParticlePool.get(0xadff2f);
        p.position.copy(this.group.position); p.scale.setScalar(1.2); scene.add(p);
        ParticlePool.active.push({ mesh: p, vel: new THREE.Vector3(0,0,0), life: 0.2 });
        return;
      }
      if (origShoot) origShoot.apply(this, arguments);
    };
  }

  // 7. ЖЁСТКИЙ ПЕРЕХВАТ C (ЗАМОРОЗКА 3 СЕК)
  window.addEventListener('keydown', function(e) {
    if (e.code !== 'KeyC') return;
    if (typeof player === 'undefined' || player.isDead) return;
    if (player.character !== 'banana' || player.suitIdx !== 4) return;
    if (typeof CARROT_MODE !== 'undefined' && CARROT_MODE) return;

    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();

    if (player.consumeCd > 0) {
      if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), `*C КД ${player.consumeCd.toFixed(1)}с*`, '#00ff66');
      return;
    }
    player.consumeCd = 8.0;

    const targets = [];
    for (let i = 0; i < enemies.length; i++) if (enemies[i].group.position.distanceTo(player.pos) < 8) targets.push(enemies[i]);
    if (window.__MP && window.__MP.remotes) {
      window.__MP.remotes.forEach((r, id) => { if (r.group.position.distanceTo(player.pos) < 8) targets.push({ isRemote: true, id: id, group: r.group }); });
    }

    // Визуал на себе
    for (let i = 0; i < 3; i++) {
      const iceMe = new THREE.Mesh(new THREE.BoxGeometry(3.5 - i*0.8, 4.5 - i*0.8, 3.5 - i*0.8), new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.35 + i*0.15, wireframe: true }));
      iceMe.position.set(player.pos.x, player.pos.y + 2, player.pos.z); scene.add(iceMe);
      setTimeout(() => { scene.remove(iceMe); iceMe.geometry.dispose(); iceMe.material.dispose(); }, 3000);
    }
    if (typeof spawnParticles === 'function') spawnParticles(player.pos.clone().add(new THREE.Vector3(0,1,0)), 0x00f2fe, 20);

    for (const t of targets) {
      const pos = t.group ? t.group.position : t.position;
      for (let i = 0; i < 3; i++) {
        const cube = new THREE.Mesh(new THREE.BoxGeometry(3 - i*0.8, 4 - i*0.8, 3 - i*0.8), new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.5 + i*0.15, wireframe: true }));
        cube.position.copy(pos).add(new THREE.Vector3(0, 2, 0)); scene.add(cube);
        setTimeout(() => { scene.remove(cube); cube.geometry.dispose(); cube.material.dispose(); }, 3000);
      }
      if (typeof spawnParticles === 'function') spawnParticles(pos.clone().add(new THREE.Vector3(0,1,0)), 0x00f2fe, 10);

      if (!t.isRemote) { t.frozen = 3.0; t._mpMoving = false; t.vel.x = 0; t.vel.z = 0; }
    }

    if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'freeze', radius: 8 });
    if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,4,0)), `❄ ЗАМОРОЗКА (${targets.length})`, '#00f2fe');
    if (typeof SoundFX !== 'undefined') SoundFX.devastator();
  }, true);

  setInterval(() => { if (player.consumeCd > 0) player.consumeCd = Math.max(0, player.consumeCd - 0.1); }, 100);

  // 8. Т-УЛЬТА (БОЖЕСТВЕННЫЙ СИНТЕЗ)
  let tHoldTimer = 0, tCharging = false, nanoUltCd = 0;
  const tPanel = document.createElement('div');
  tPanel.style.cssText = 'position:fixed;bottom:180px;left:50%;transform:translateX(-50%);width:340px;background:rgba(0,20,40,.95);border:3px solid #00f2fe;border-radius:8px;padding:12px;text-align:center;z-index:50;display:none;box-shadow:0 0 30px rgba(0,242,254,.7),5px 5px 0 #000';
  tPanel.innerHTML = '<div style="font-family:Bangers,Impact,sans-serif;font-size:20px;color:#00f2fe;-webkit-text-stroke:1px #000;margin-bottom:6px;letter-spacing:2px">⚡ БОЖЕСТВЕННЫЙ СИНТЕЗ ⚡</div><div style="height:22px;background:#001a1a;border:2px solid #000;overflow:hidden"><div id="t-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#00f2fe,#ff0055);box-shadow:0 0 15px #00f2fe;transition:width .05s"></div></div>';
  document.body.appendChild(tPanel);

  window.addEventListener('keydown', e => {
    if (e.code === 'KeyT' && player.character === 'banana' && player.suitIdx === 4) {
      if (nanoUltCd > 0) {
        if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), `*T КД ${Math.ceil(nanoUltCd)}с*`, '#ff4400');
        return;
      }
      if (!tCharging) { tCharging = true; tHoldTimer = 0; tPanel.style.display = 'block'; }
    }
  });

  window.addEventListener('keyup', e => {
    if (e.code === 'KeyT' && tCharging) { tCharging = false; tPanel.style.display = 'none'; }
  });

  setInterval(() => {
    if (nanoUltCd > 0) nanoUltCd -= 0.1;
    if (tCharging) {
      tHoldTimer += 0.1;
      document.getElementById('t-bar').style.width = Math.min(100, (tHoldTimer / 5) * 100) + '%';
      if (tHoldTimer >= 5) {
        tCharging = false; tPanel.style.display = 'none'; nanoUltCd = 100;

        const beam = new THREE.Mesh(new THREE.CylinderGeometry(2, 15, 40, 16), new THREE.MeshBasicMaterial({color: 0x00f2fe, transparent: true, opacity: 0.7, wireframe: true}));
        beam.rotation.x = Math.PI / 2;
        const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
        beam.position.copy(player.pos).add(fwd.clone().multiplyScalar(20));
        beam.lookAt(player.pos.clone().add(fwd.clone().multiplyScalar(40)));
        scene.add(beam);
        setTimeout(() => { scene.remove(beam); beam.geometry.dispose(); beam.material.dispose(); }, 1500);

        const ring = new THREE.Mesh(new THREE.RingGeometry(1, 50, 32), new THREE.MeshBasicMaterial({color: 0x00f2fe, side: THREE.DoubleSide}));
        ring.rotation.x = -Math.PI / 2; ring.position.copy(player.pos); scene.add(ring);
        let rt = 0; (function animRing() { rt += 0.05; ring.scale.setScalar(1 + rt * 3); ring.material.opacity = Math.max(0, 1 - rt); if (rt < 1) requestAnimationFrame(animRing); else { scene.remove(ring); ring.geometry.dispose(); ring.material.dispose(); } })();

        if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'nano_ult', radius: 50 });
        if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,5,0)), '⚡ БОЖЕСТВЕННЫЙ СИНТЕЗ! ⚡', '#00f2fe');
        if (typeof SoundFX !== 'undefined') { SoundFX.devastator(); SoundFX.boom(); }
      }
    }
  }, 100);

  // 9. ОСТАНОВКА ЗАМОРОЖЕННЫХ
  if (typeof updateEnemiesAndVehicles === 'function') {
    const _origUpdateEnemies = window.updateEnemiesAndVehicles;
    window.updateEnemiesAndVehicles = function(dt, now) {
      const frozenPos = new Map();
      for (let i = 0; i < enemies.length; i++) {
        const en = enemies[i];
        if (en.frozen > 0) { en.frozen -= dt; en.vel.x = 0; en.vel.z = 0; en._mpMoving = false; frozenPos.set(en, en.group.position.clone()); }
      }
      _origUpdateEnemies.apply(this, arguments);
      for (let [en, pos] of frozenPos) en.group.position.copy(pos);
    };
  }

  // 10. F-СПОСОБНОСТИ (КД на каждый костюм)
  player._suitCdMap = player._suitCdMap || [0,0,0,0,0];
  const origTriggerF = window.triggerUniqueAbilityF;
  window.triggerUniqueAbilityF = function() {
    const idx = player.suitIdx;
    if (player.character === 'banana') {
      if (player._suitCdMap[idx] > 0) {
        if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), `*F КД ${player._suitCdMap[idx].toFixed(1)}с*`, '#f9ca24');
        return;
      }
      if (idx === 0) { player._suitCdMap[0] = 5; if (typeof alliedTurrets !== 'undefined') for(let i=0; i<2; i++) { const g=new THREE.Group(); g.position.copy(player.pos).add(new THREE.Vector3((i-0.5)*4, 0, 0)); const b=new THREE.Mesh(new THREE.CylinderGeometry(.9,1.1,2,6),createPrototypeShader(0x3f4650,0x111111,0)); b.position.y=1; g.add(b); scene.add(g); alliedTurrets.push({group:g,life:15,cd:0}); } return; }
      if (idx === 1) { player._suitCdMap[1] = 4; SoundFX.whip(); for(let k=-4;k<=4;k++){ const a=player.camYaw+k*.15; const d=new THREE.Vector3(-Math.sin(a),0,-Math.cos(a)); const p=new THREE.Mesh(new THREE.SphereGeometry(0.4,6,6), new THREE.MeshBasicMaterial({color:0xf9ca24})); p.position.copy(player.pos).add(new THREE.Vector3(0,2,0)); scene.add(p); projectiles.push({mesh:p,vel:new THREE.Vector3(d.x*50,0,d.z*50),life:1.5,fromPlayer:true,dmg:60,radius:2}); } return; }
      if (idx === 2) { player._suitCdMap[2] = 8; SoundFX.devastator(); player.facingYaw = player.camYaw; const f = new THREE.Vector3(-Math.sin(player.facingYaw),0,-Math.cos(player.facingYaw)); player.durianRam = { timer: 0, speed: 60, dir: f, hitSet: new Set(), maxDur: 5.0 }; if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), 'ТАРАН!', '#78bd37'); return; }
      if (idx === 3) { player._suitCdMap[3] = 1; player.activeModeF = !player.activeModeF; if (player.mesh && player.mesh.userData.limeShield) player.mesh.userData.limeShield.visible = player.activeModeF; if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), player.activeModeF ? 'ЩИТ ВКЛ' : 'ЩИТ ВЫКЛ', '#00f2fe'); return; }
    }
    if (PEPPER_MODE && player.pepperTBeamCd <= 0) { releasePepperTBeam(); if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'hell_explosion', radius: 40 }); return; }
    if (CARROT_MODE && CARROT_FORM === 2 && player.carrotStamina >= 60) { carrotEarthquake(); if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'earthquake', radius: 40 }); return; }
    if (LEMON_MODE && player.lemonUltCd <= 0) { lemonUltimate(); if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'ult_lemon', radius: 40 }); return; }
    if (origTriggerF) origTriggerF.apply(this, arguments);
  };
  setInterval(() => { if (player._suitCdMap) for (let i = 0; i < 5; i++) if (player._suitCdMap[i] > 0) player._suitCdMap[i] -= 0.1; }, 100);

  // 11. Танки больше
  if (typeof spawnCitrusAPC === 'function') {
    const _origAPC = spawnCitrusAPC;
    window.spawnCitrusAPC = function(x, z) {
      _origAPC(x, z);
      const t = enemies[enemies.length - 1];
      if (t && t.type === 'tank') { t.group.scale.set(1.8, 1.8, 1.8); t.radius = 6.8; }
    };
  }

  // 12. Опутывание сбивает летающих
  const origRootBind = window.carrotRootBind;
  window.carrotRootBind = function() {
    if (origRootBind) origRootBind.apply(this, arguments);
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.flying && e.group.position.distanceTo(player.pos) < 25) { e.flying = false; e.group.position.y = 0; e.vel.y = 0; if (typeof spawnComicPop === 'function') spawnComicPop(e.group.position.clone().add(new THREE.Vector3(0,2,0)), 'СБИТ!', '#2ecc71'); }
    }
  };

  // 13. HP форм Моркови
  const origToggleCarrot = window.toggleCarrotForm;
  window.toggleCarrotForm = function() {
    if (origToggleCarrot) origToggleCarrot.apply(this, arguments);
    if (player.character === 'carrot') { player.maxHp = (CARROT_FORM === 2) ? 800 : 480; player.hp = player.maxHp; if (typeof updateHUD === 'function') updateHUD(); }
  };

  // 14. Ярость Перца
  if (typeof addRage === 'function') {
    const origAddRage = window.addRage;
    window.addRage = function(amount) {
      if (PEPPER_MODE) { if (typeof addSpiciness === 'function') addSpiciness(amount); return; }
      if (origAddRage) origAddRage.apply(this, arguments);
    };
  }

  console.log("🍌 [PATCH v29] Готово: Ульта T, Заморозка 3с, Кусты убраны, Морковь починена, Таблица работает.");
})();
