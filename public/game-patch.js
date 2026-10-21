// =======================================================
// BANANA INDUSTRIES - GLOBAL PATCH (v50)
// ФИКС: Кнопка клонируется от Банана + Горячая клавиша F10
// =======================================================
(function() {
  console.log("🍌 [PATCH] v50 — Загружен. Ищу кнопку Банана для клонирования...");

  // ═══ 1. Убираем кусты ═══
  if (typeof addProp === 'function') {
    const _orig = window.addProp;
    window.addProp = function(x, z, type) { if (type === 'bush') return; _orig.apply(this, arguments); };
  }

  // ═══ 2. УНИВЕРСАЛЬНЫЙ ФИКС НОГ МОРКОВИ ═══
  function fixCarrotMeshGround() {
    if (!player || !player.mesh || !player.mesh.userData || !player.mesh.userData.isCarrot) return;
    try {
      player.mesh.position.y = 0;
      player.mesh.updateMatrixWorld(true);
      const bbox = new THREE.Box3().setFromObject(player.mesh);
      const scaleY = (playerGroup && playerGroup.scale.y) || 1;
      if (bbox.min.y < 0.1) player.mesh.position.y += (0.1 - bbox.min.y) / scaleY;
    } catch(e){}
  }
  setInterval(fixCarrotMeshGround, 500);
  
  const _origRebuildHeroMesh = window.rebuildHeroMesh;
  window.rebuildHeroMesh = function() {
    if (_origRebuildHeroMesh) _origRebuildHeroMesh.apply(this, arguments);
    setTimeout(fixCarrotMeshGround, 10);
  };
  
  const _origToggleCarrot = window.toggleCarrotForm;
  window.toggleCarrotForm = function() {
    if (_origToggleCarrot) _origToggleCarrot.apply(this, arguments);
    if (player.character === 'carrot') {
      player.maxHp = (CARROT_FORM === 2) ? 800 : 480;
      player.hp = player.maxHp;
      if (typeof updateHUD === 'function') updateHUD();
    }
    setTimeout(fixCarrotMeshGround, 50);
  };

  // ═══ 3. День/Ночь ═══
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

  // ═══ 4. Ландшафт ═══
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

  // ═══ 5. ГЛАВНЫЙ ХУК: враги не толкают на здании + сброс гибкости + щит ═══
  if (typeof updatePlayerChoreographyAndCamera === 'function') {
    const _origChoreo = updatePlayerChoreographyAndCamera;
    window.updatePlayerChoreographyAndCamera = function(dt, now) {
      const isFrozen = window.__MP && window.__MP._myRootedUntil > now;
      const savedX = player.pos.x, savedZ = player.pos.z;
      const preY = player.pos.y;

      const hiddenEnemies = [];
      if (preY > 3) {
        for (let i = 0; i < enemies.length; i++) {
          const en = enemies[i];
          if (en.flying) continue;
          if (Math.abs(en.group.position.y - preY) > 3) {
            hiddenEnemies.push({ en: en, x: en.group.position.x, z: en.group.position.z });
            en.group.position.x = 99999; en.group.position.z = 99999;
          }
        }
      }

      _origChoreo.apply(this, arguments);

      for (let i = 0; i < hiddenEnemies.length; i++) {
        const h = hiddenEnemies[i];
        if (h.en.group && h.en.group.position) { h.en.group.position.x = h.x; h.en.group.position.z = h.z; }
      }

      if (player.pos.y < 0) player.pos.y = 0;
      if (isFrozen) { player.pos.x = savedX; player.pos.z = savedZ; player.vel.x = 0; player.vel.z = 0; playerGroup.position.copy(player.pos); }

      if (player.activeModeF && player.character !== 'banana') {
        player.activeModeF = false;
        if (player.mesh && player.mesh.userData && player.mesh.userData.limeShield) player.mesh.userData.limeShield.visible = false;
      }

      if (player.activeModeF && player.suitIdx === 3 && player.character === 'banana' && !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE) {
        player.en -= 15 * dt;
        if (player.en <= 0) { player.en = 0; player.activeModeF = false; if (player.mesh && player.mesh.userData.limeShield) player.mesh.userData.limeShield.visible = false; }
      }

      if (!player.isDead && player.attackTimer <= 0 && !player.isFlying && !player.isDodging && !player.isSliding && !player.isWallRunning && !isFrozen && !window.__POTATO_MODE) {
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

  // ═══ 6. Усиленный щит / Броня ═══
  const origDamageToHero = window.applyDamageToHero;
  window.applyDamageToHero = function(dmg) {
    if (window.__POTATO_MODE && window.__POTATO_FORM === 1 && player._potatoArmor > 0) dmg = Math.floor(dmg * 0.5); 
    if (player.activeModeF && player.suitIdx === 3 && player.character === 'banana' && !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE) {
      const drain = dmg * 1.5;
      if (player.en >= drain) { player.en -= drain; if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3.2,0)), '*ЩИТ БЛОК*', '#00f2fe'); return; }
      else { player.activeModeF = false; if (player.mesh && player.mesh.userData.limeShield) player.mesh.userData.limeShield.visible = false; }
    }
    if (origDamageToHero) return origDamageToHero.apply(this, arguments);
  };

  // ═══ 7. Меню + Дрон (Шрекич) ═══
  window.addEventListener('keydown', e => {
    if (e.code === 'Escape' && typeof gameStarted !== 'undefined' && gameStarted) {
      document.getElementById('start-screen').style.display = 'flex';
      try { document.exitPointerLock(); } catch(err) {}
    }
    if (e.code === 'KeyB' && typeof player !== 'undefined' && player.character === 'banana' && !window.__POTATO_MODE) {
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
      if ((this._disabled || window.__POTATO_MODE) && this.group) { this.group.visible = false; this.shootCd = 99999; this.buffCd = 99999; }
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
      if (origFind) { const enemy = origFind.call(this, maxD); if (enemy) { const d = enemy.group.position.distanceTo(this.group.position); if (d < bd) { bd = d; best = enemy; } } }
      return best;
    };
    const origShoot = Companion.shootAt;
    Companion.shootAt = function(e) {
      if (window.__POTATO_MODE) return;
      if (e.isPlayer) {
        if (window.__MP && window.__MP.room) window.__MP.room.send('pvp', { targetId: e.id, damage: 5 });
        if (typeof SoundFX !== 'undefined') SoundFX.whip();
        const p = ParticlePool.get(0xadff2f); p.position.copy(this.group.position); p.scale.setScalar(1.2); scene.add(p); ParticlePool.active.push({ mesh: p, vel: new THREE.Vector3(0,0,0), life: 0.2 });
        return;
      }
      if (origShoot) origShoot.apply(this, arguments);
    };
  }

  // ═══ 8. ГАРПУН ═══
  let _newVineCd = 0;
  const VINE_CD = 0.6;
  window.addEventListener('mousedown', function(e) {
    if (e.button !== 2 || !CARROT_MODE || CARROT_FORM !== 1) return;
    if (player.isDead || (typeof gameStarted !== 'undefined' && !gameStarted) || (typeof isLabOpen !== 'undefined' && isLabOpen)) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if (_newVineCd > 0) { if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), '*ГАРПУН КД ' + _newVineCd.toFixed(1) + 'с*', '#2ecc71'); return; }
    const origin = player.pos.clone().add(new THREE.Vector3(0, 2, 0));
    const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
    const rc = new THREE.Raycaster(); rc.set(origin, fwd); rc.far = 450;
    const buildHits = rc.intersectObjects(buildingMeshes, false).filter(h => h.point.y > player.pos.y + 1);
    const buildingDist = buildHits.length > 0 ? buildHits[0].distance : Infinity;
    let bestEnemy = null, bestDist = 450;
    for (let i = 0; i < enemies.length; i++) { const en = enemies[i]; const toE = en.group.position.clone().sub(player.pos); const dist = toE.length(); if (dist > 450) continue; const dot = toE.clone().normalize().dot(fwd); if (dot < 0.5) continue; if (dist < bestDist) { bestDist = dist; bestEnemy = en; } }
    if (bestEnemy && bestDist <= buildingDist) {
      _newVineCd = VINE_CD;
      const isElite = (bestEnemy.type === 'titan' || bestEnemy.type === 'tank' || bestEnemy.type === 'lemon' || bestEnemy.type === 'valkyrie' || bestEnemy.type === 'necromancer' || bestEnemy.type === 'heli' || bestEnemy.type === 'shield' || bestEnemy.type === 'sniper');
      const tp = bestEnemy.group.position.clone().add(new THREE.Vector3(0, 2, 0));
      if (activeTendrils.length < 8) activeTendrils.push(new OrganicTendril3D(scene, origin.clone(), tp.clone(), 0x2ecc71, 0.4, 0.5));
      SoundFX.whip(); triggerHitstopAndChroma(0.06, 0.4, 0.9);
      const travelMs = Math.max(250, Math.min(2000, (bestDist / 250) * 1000));
      if (isElite) {
        spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), '*К БОССУ!*', '#ff2200');
        const dir = tp.clone().sub(player.pos).normalize(); player.vel.x = dir.x * 250; player.vel.z = dir.z * 250; player.vel.y = Math.max(20, dir.y * 50); player.dodgeIframes = 0.7; postUniforms.uRadialBlur.value = 1.3;
        const capE = bestEnemy; setTimeout(function(){ if (capE && capE.group.parent) { const st = carrotStats(); damageEnemy(capE, st.dmg * 4.5, new THREE.Vector3(0,0,0), '*СОКРУШИТЕЛЬНЫЙ УДАР!*'); spawnParticles(tp.clone(), 0x2ecc71, 24); spawnGroundCrackRing(capE.group.position, 0x2ecc71, 14); triggerHitstopAndChroma(0.12, 0.8, 1.3); } }, travelMs);
      } else {
        spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), '*ИДИ СЮДА!*', '#2ecc71');
        const capE = bestEnemy; capE.vel.x = (player.pos.x - capE.group.position.x) * 8; capE.vel.z = (player.pos.z - capE.group.position.z) * 8; capE._rooted = 0.6;
        setTimeout(function(){ if (capE && capE.group.parent) { const st = carrotStats(); const fwd2 = new THREE.Vector3(-Math.sin(player.facingYaw), 0, -Math.cos(player.facingYaw)); spawnSlashArc(player.pos.clone().add(new THREE.Vector3(0, 2, 0)), player.facingYaw, 0, 0x2ecc71, 6.5, 0.4); damageEnemy(capE, st.dmg * 3.0, fwd2.clone().multiplyScalar(10), '*УДАР С РАЗВОРОТА!*'); spawnParticles(capE.group.position.clone().add(new THREE.Vector3(0, 2, 0)), 0xadff2f, 14); triggerHitstopAndChroma(0.08, 0.6, 1.1); } }, 450);
      }
    } else if (buildHits.length > 0) {
      _newVineCd = VINE_CD; const hp = buildHits[0].point; if (activeTendrils.length < 8) activeTendrils.push(new OrganicTendril3D(scene, origin.clone(), hp.clone(), 0x2ecc71, 0.35, 0.4));
      SoundFX.swing(500); spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), '*ЦЕПКИЙ КОРЕНЬ!*', '#2ecc71');
      const dir = hp.clone().sub(player.pos).normalize(); player.vel.x = dir.x * 220; player.vel.z = dir.z * 220; player.vel.y = Math.max(40, Math.abs(dir.y) * 80 + 20); player.isGrounded = false; player.isBulletdropping = false; player.dodgeIframes = 0.5; postUniforms.uRadialBlur.value = 1.1;
    } else { spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), '*НЕТ ЦЕЛИ*', '#888888'); SoundFX.swing(300); }
  }, true);
  setInterval(() => { if (_newVineCd > 0) _newVineCd = Math.max(0, _newVineCd - 0.1); }, 100);

  // ═══ 9. C — Заморозка ═══
  const FREEZE_RADIUS = 15; const FREEZE_DMG = 20;
  window.addEventListener('keydown', function(e) {
    if (e.code !== 'KeyC' || player.character !== 'banana' || player.suitIdx !== 4 || CARROT_MODE || PEPPER_MODE || LEMON_MODE || window.__POTATO_MODE) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if (player.consumeCd > 0) { if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), `*C КД ${player.consumeCd.toFixed(1)}с*`, '#00ff66'); return; }
    player.consumeCd = 8.0;
    const targets = []; for (let i = 0; i < enemies.length; i++) if (enemies[i].group.position.distanceTo(player.pos) < FREEZE_RADIUS) targets.push(enemies[i]);
    const groundRing = new THREE.Mesh(new THREE.RingGeometry(1, FREEZE_RADIUS, 40), new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false }));
    groundRing.rotation.x = -Math.PI / 2; groundRing.position.set(player.pos.x, 0.15, player.pos.z); scene.add(groundRing); let rt = 0;
    (function animRing() { rt += 0.03; groundRing.material.opacity = Math.max(0, 0.65 * (1 - rt)); groundRing.scale.setScalar(1 + rt * 0.2); if (rt < 1) requestAnimationFrame(animRing); else { scene.remove(groundRing); groundRing.geometry.dispose(); groundRing.material.dispose(); } })();
    for (let i = 0; i < 3; i++) { const iceMe = new THREE.Mesh(new THREE.BoxGeometry(3.5 - i*0.8, 4.5 - i*0.8, 3.5 - i*0.8), new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.35 + i*0.15, wireframe: true })); iceMe.position.set(player.pos.x, player.pos.y + 2, player.pos.z); scene.add(iceMe); setTimeout(() => { scene.remove(iceMe); iceMe.geometry.dispose(); iceMe.material.dispose(); }, 3000); }
    for (const t of targets) {
      const pos = t.group.position;
      for (let i = 0; i < 3; i++) { const cube = new THREE.Mesh(new THREE.BoxGeometry(3 - i*0.8, 4 - i*0.8, 3 - i*0.8), new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.55 + i*0.15, wireframe: true })); cube.position.copy(pos).add(new THREE.Vector3(0, 2, 0)); scene.add(cube); setTimeout(() => { scene.remove(cube); cube.geometry.dispose(); cube.material.dispose(); }, 3000); }
      if (typeof spawnParticles === 'function') spawnParticles(pos.clone().add(new THREE.Vector3(0,1,0)), 0x00f2fe, 12);
      t.frozen = 3.0; t._mpMoving = false; t.vel.x = 0; t.vel.z = 0; if (!t._mpId && typeof damageEnemy === 'function') damageEnemy(t, FREEZE_DMG, new THREE.Vector3(), '*ЗАМОРОЖЕН!*');
    }
    for (let i = 0; i < 25; i++) { const ang = Math.random() * Math.PI * 2; const rad = Math.random() * FREEZE_RADIUS; const p = ParticlePool.get(0x88ffff); p.position.set(player.pos.x + Math.cos(ang) * rad, 0.5 + Math.random() * 3, player.pos.z + Math.sin(ang) * rad); p.scale.setScalar(0.8); scene.add(p); ParticlePool.active.push({ mesh: p, vel: new THREE.Vector3(0, 3 + Math.random() * 4, 0), life: 1.2 }); }
    if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'freeze', radius: FREEZE_RADIUS });
    if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,5,0)), `❄ ЗАМОРОЗКА (${targets.length})`, '#00f2fe');
    if (typeof SoundFX !== 'undefined') { SoundFX.devastator(); SoundFX.boom(); }
  }, true);
  setInterval(() => { if (player.consumeCd > 0) player.consumeCd = Math.max(0, player.consumeCd - 0.1); }, 100);

  // ═══ 10. T — Божественный синтез ═══
  let tHoldTimer = 0, tCharging = false, nanoUltCd = 0;
  const tPanel = document.createElement('div'); tPanel.style.cssText = 'position:fixed;bottom:180px;left:50%;transform:translateX(-50%);width:340px;background:rgba(0,20,40,.95);border:3px solid #00f2fe;border-radius:8px;padding:12px;text-align:center;z-index:50;display:none;box-shadow:0 0 30px rgba(0,242,254,.7),5px 5px 0 #000'; tPanel.innerHTML = '<div style="font-family:Bangers,Impact,sans-serif;font-size:20px;color:#00f2fe;-webkit-text-stroke:1px #000;margin-bottom:6px;letter-spacing:2px">⚡ БОЖЕСТВЕННЫЙ СИНТЕЗ ⚡</div><div style="height:22px;background:#001a1a;border:2px solid #000;overflow:hidden"><div id="t-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#00f2fe,#ff0055);box-shadow:0 0 15px #00f2fe;transition:width .05s"></div></div>'; document.body.appendChild(tPanel);
  window.addEventListener('keydown', e => { if (e.code === 'KeyT' && player.character === 'banana' && player.suitIdx === 4 && !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE && !window.__POTATO_MODE) { if (nanoUltCd > 0) { if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), `*T КД ${Math.ceil(nanoUltCd)}с*`, '#ff4400'); return; } if (!tCharging) { tCharging = true; tHoldTimer = 0; tPanel.style.display = 'block'; } } });
  window.addEventListener('keyup', e => { if (e.code === 'KeyT' && tCharging) { tCharging = false; tPanel.style.display = 'none'; } });
  setInterval(() => { if (nanoUltCd > 0) nanoUltCd -= 0.1; if (tCharging) { tHoldTimer += 0.1; document.getElementById('t-bar').style.width = Math.min(100, (tHoldTimer / 5) * 100) + '%'; if (tHoldTimer >= 5) { tCharging = false; tPanel.style.display = 'none'; nanoUltCd = 102.5; const beam = new THREE.Mesh(new THREE.CylinderGeometry(2, 15, 40, 16), new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.7, wireframe: true })); beam.rotation.x = Math.PI / 2; const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw)); beam.position.copy(player.pos).add(fwd.clone().multiplyScalar(20)); beam.lookAt(player.pos.clone().add(fwd.clone().multiplyScalar(40))); scene.add(beam); setTimeout(() => { scene.remove(beam); beam.geometry.dispose(); beam.material.dispose(); }, 1500); const ring = new THREE.Mesh(new THREE.RingGeometry(1, 50, 32), new THREE.MeshBasicMaterial({ color: 0x00f2fe, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.copy(player.pos); scene.add(ring); let rt = 0; (function animRing() { rt += 0.05; ring.scale.setScalar(1 + rt * 3); ring.material.opacity = Math.max(0, 1 - rt); if (rt < 1) requestAnimationFrame(animRing); else { scene.remove(ring); ring.geometry.dispose(); ring.material.dispose(); } })(); if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'nano_ult', radius: 50 }); if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,5,0)), '⚡ БОЖЕСТВЕННЫЙ СИНТЕЗ! ⚡', '#00f2fe'); if (typeof SoundFX !== 'undefined') { SoundFX.devastator(); SoundFX.boom(); } } } }, 100);

  // ═══ 11. Остановка замороженных ═══
  if (typeof updateEnemiesAndVehicles === 'function') { const _origUpdateEnemies = window.updateEnemiesAndVehicles; window.updateEnemiesAndVehicles = function(dt, now) { const frozenPos = new Map(); for (let i = 0; i < enemies.length; i++) { const en = enemies[i]; if (en.frozen > 0) { en.frozen -= dt; en.vel.x = 0; en.vel.z = 0; en._mpMoving = false; frozenPos.set(en, en.group.position.clone()); } } _origUpdateEnemies.apply(this, arguments); for (let [en, pos] of frozenPos) en.group.position.copy(pos); }; }

  // ═══ 12. F-СПОСОБНОСТИ ═══
  player._suitCdMap = player._suitCdMap || [0,0,0,0,0];
  const origTriggerF = window.triggerUniqueAbilityF;
  window.triggerUniqueAbilityF = function() {
    if (window.__POTATO_MODE) return;
    const idx = player.suitIdx;
    if (CARROT_MODE) { if (CARROT_FORM === 2) { if (player._suitCdMap[4] > 0) { if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,5,0)), `*F КД ${player._suitCdMap[4].toFixed(1)}с*`, '#f9ca24'); return; } if (player.carrotStamina < 60) { if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,4,0)), '*МАЛО СТАМИНЫ!*', '#ff2200'); return; } player._suitCdMap[4] = 8; carrotEarthquake(); if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'earthquake', radius: 40 }); } else { if (player._suitCdMap[3] > 0) { if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), `*F КД ${player._suitCdMap[3].toFixed(1)}с*`, '#f9ca24'); return; } player._suitCdMap[3] = 8; carrotRootBind(); if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'root_bind', radius: 22 }); } return; }
    if (player.character === 'banana') { if (player._suitCdMap[idx] > 0) { if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), `*F КД ${player._suitCdMap[idx].toFixed(1)}с*`, '#f9ca24'); return; } if (idx === 0) { player._suitCdMap[0] = 5; if (typeof alliedTurrets !== 'undefined') for(let i=0; i<2; i++) { const g=new THREE.Group(); g.position.copy(player.pos).add(new THREE.Vector3((i-0.5)*4, 0, 0)); const b=new THREE.Mesh(new THREE.CylinderGeometry(.9,1.1,2,6),createPrototypeShader(0x3f4650,0x111111,0)); b.position.y=1; g.add(b); scene.add(g); alliedTurrets.push({group:g,life:15,cd:0}); } return; } if (idx === 1) { player._suitCdMap[1] = 4; SoundFX.whip(); for(let k=-4;k<=4;k++){ const a=player.camYaw+k*.15; const d=new THREE.Vector3(-Math.sin(a),0,-Math.cos(a)); const p=new THREE.Mesh(new THREE.SphereGeometry(0.4,6,6), new THREE.MeshBasicMaterial({color:0xf9ca24})); p.position.copy(player.pos).add(new THREE.Vector3(0,2,0)); scene.add(p); projectiles.push({mesh:p,vel:new THREE.Vector3(d.x*50,0,d.z*50),life:1.5,fromPlayer:true,dmg:60,radius:2}); } return; } if (idx === 2) { player._suitCdMap[2] = 8; SoundFX.devastator(); player.facingYaw = player.camYaw; const f = new THREE.Vector3(-Math.sin(player.facingYaw),0,-Math.cos(player.facingYaw)); player.durianRam = { timer: 0, speed: 60, dir: f, hitSet: new Set(), maxDur: 5.0 }; if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), 'ТАРАН!', '#78bd37'); return; } if (idx === 3) { player._suitCdMap[3] = 1; player.activeModeF = !player.activeModeF; if (player.mesh && player.mesh.userData.limeShield) player.mesh.userData.limeShield.visible = player.activeModeF; if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), player.activeModeF ? 'ЩИТ ВКЛ' : 'ЩИТ ВЫКЛ', '#00f2fe'); return; } return; }
    if (PEPPER_MODE && player.pepperTBeamCd <= 0) { releasePepperTBeam(); if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'hell_explosion', radius: 40 }); return; }
    if (LEMON_MODE && player.lemonUltCd <= 0) { lemonUltimate(); if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'ult_lemon', radius: 40 }); return; }
    if (origTriggerF) origTriggerF.apply(this, arguments);
  };
  setInterval(() => { if (player._suitCdMap) for (let i = 0; i < 5; i++) if (player._suitCdMap[i] > 0) player._suitCdMap[i] -= 0.1; }, 100);

  // ═══ 13. Танки ═══
  if (typeof spawnCitrusAPC === 'function') { const _origAPC = spawnCitrusAPC; window.spawnCitrusAPC = function(x, z) { _origAPC(x, z); const t = enemies[enemies.length - 1]; if (t && t.type === 'tank') { t.group.scale.set(1.8, 1.8, 1.8); t.radius = 6.8; } }; }

  // ═══ 14. Опутывание сбивает летающих ═══
  const origRootBind = window.carrotRootBind;
  window.carrotRootBind = function() { if (origRootBind) origRootBind.apply(this, arguments); for (let i = 0; i < enemies.length; i++) { const e = enemies[i]; if (e.flying && e.group.position.distanceTo(player.pos) < 25) { e.flying = false; e.group.position.y = 0; e.vel.y = 0; if (typeof spawnComicPop === 'function') spawnComicPop(e.group.position.clone().add(new THREE.Vector3(0,2,0)), 'СБИТ!', '#2ecc71'); } } };

  // ═══ 15. Ярость Перца ═══
  if (typeof addRage === 'function') { const origAddRage = window.addRage; window.addRage = function(amount) { if (PEPPER_MODE) { if (typeof addSpiciness === 'function') addSpiciness(amount); return; } if (origAddRage) origAddRage.apply(this, arguments); }; }

  // ══════════════════════════════════════════════════════════
  // ═══ 16. МОРГЕНКАРТОШКА (v50) ═══
  // ══════════════════════════════════════════════════════════
  
  window.__POTATO_MODE = false;
  window.__POTATO_FORM = 1;
  window.__bananaBtnRef = null;

  // 1. Модели
  window.createPotatoMesh = function(form) {
    form = (form === 2) ? 2 : 1; 
    var g = new THREE.Group();
    var spine = new THREE.Object3D(); g.add(spine);
    var legL = new THREE.Group(), legL_hip = new THREE.Group(), legL_knee = new THREE.Group(); legL.add(legL_hip); legL_hip.add(legL_knee); g.add(legL);
    var legR = new THREE.Group(), legR_hip = new THREE.Group(), legR_knee = new THREE.Group(); legR.add(legR_hip); legR_hip.add(legR_knee); g.add(legR);
    var armR = new THREE.Group(), armR_shoulder = new THREE.Group(); armR.add(armR_shoulder); g.add(armR);
    var armL = new THREE.Group(), armL_shoulder = new THREE.Group(); armL.add(armL_shoulder); g.add(armL);
    
    g.userData = { legL: { pivot: legL, hip: legL_hip, knee: legL_knee }, legR: { pivot: legR, hip: legR_hip, knee: legR_knee }, armR: { pivot: armR, shoulder: armR_shoulder }, armL: { pivot: armL, shoulder: armL_shoulder }, spine: spine, attackAnim: 0 };

    if (form === 1) {
        var body = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 1.6, 8), new THREE.MeshStandardMaterial({color: 0x8B0000})); body.position.y = 1.6; spine.add(body);
        var belly = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), new THREE.MeshStandardMaterial({color: 0xD2B48C})); belly.position.set(0, 1.3, 0.5); belly.scale.set(1, 0.9, 0.6); spine.add(belly);
        var head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshStandardMaterial({color: 0xD2B48C})); head.position.y = 2.8; spine.add(head);
        var hair = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1.0), new THREE.MeshStandardMaterial({color: 0x2a1a0f})); hair.position.set(0, 3.0, -0.1); spine.add(hair);
        var hammerGroup = new THREE.Group();
        var handle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.0, 6), new THREE.MeshStandardMaterial({color: 0x5D4037})); handle.rotation.x = Math.PI/2; hammerGroup.add(handle);
        var headH = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 1.0), new THREE.MeshStandardMaterial({color: 0x9E9E9E})); headH.position.y = 1.0; hammerGroup.add(headH);
        hammerGroup.position.set(0, -1.2, 0.5); armR_shoulder.add(hammerGroup);
        var armRMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.2, 6), new THREE.MeshStandardMaterial({color: 0x8B0000})); armRMesh.position.y = -0.6; armR_shoulder.add(armRMesh);
        var legLMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 1.0, 6), new THREE.MeshStandardMaterial({color: 0x424242})); legLMesh.position.y = -0.5; legL_hip.add(legLMesh);
        var legRMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 1.0, 6), new THREE.MeshStandardMaterial({color: 0x424242})); legRMesh.position.y = -0.5; legR_hip.add(legRMesh);
        legL.position.set(-0.3, 1.0, 0); legR.position.set(0.3, 1.0, 0); armR.position.set(1.0, 2.0, 0); armR_shoulder.rotation.z = -0.4;
    } else {
        var body = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 1.5, 10), new THREE.MeshStandardMaterial({color: 0x4a0010})); body.position.y = 1.5; spine.add(body);
        var belly = new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 10), new THREE.MeshStandardMaterial({color: 0xFF2200})); belly.position.set(0, 1.2, 0.4); belly.scale.set(1.1, 0.9, 0.9); spine.add(belly);
        var head = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 12), new THREE.MeshStandardMaterial({color: 0xFF0000})); head.position.y = 2.7; spine.add(head);
        var hair = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 1.0), new THREE.MeshStandardMaterial({color: 0x111111})); hair.position.set(0, 3.1, -0.1); spine.add(hair);
        var gloveR = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshStandardMaterial({color: 0x00FF00})); gloveR.position.y = -0.9; armR_shoulder.add(gloveR);
        var gloveL = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshStandardMaterial({color: 0x00FF00})); gloveL.position.y = -0.9; armL_shoulder.add(gloveL);
        var armRMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.0, 6), new THREE.MeshStandardMaterial({color: 0x4a0010})); armRMesh.position.y = -0.4; armR_shoulder.add(armRMesh);
        var armLMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.0, 6), new THREE.MeshStandardMaterial({color: 0x4a0010})); armLMesh.position.y = -0.4; armL_shoulder.add(armLMesh);
        var legLMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.8, 6), new THREE.MeshStandardMaterial({color: 0x111111})); legLMesh.position.y = -0.4; legL_hip.add(legLMesh);
        var legRMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.8, 6), new THREE.MeshStandardMaterial({color: 0x111111})); legRMesh.position.y = -0.4; legR_hip.add(legRMesh);
        legL.position.set(-0.3, 0.8, 0); legR.position.set(0.3, 0.8, 0); armR.position.set(0.9, 1.6, 0.3); armL.position.set(-0.9, 1.6, 0.3);
    }
    return g;
  };

  // 2. Активация
  window.activatePotato = function() {
    console.log('[POTATO] Активация запущена.');
    
    // Нажимаем кнопку Банана (если нашли) или вызываем функцию
    if (window.__bananaBtnRef) {
      console.log('[POTATO] Кликаю кнопку Банана...');
      window.__bananaBtnRef.click();
    } else if (typeof equipBanana === 'function') {
      console.log('[POTATO] Вызываю equipBanana()...');
      equipBanana();
    } else {
      console.error('[POTATO] Не найдено ни кнопки Банана, ни функции equipBanana!');
      alert('Ошибка: не найдена кнопка Банана!');
      return;
    }

    setTimeout(() => {
      window.__POTATO_MODE = true;
      window.__POTATO_FORM = 1;
      console.log('[POTATO] Режим Картошки включен.');
      
      if (player.mesh) player.mesh.visible = false;
      if (typeof Companion !== 'undefined' && Companion.group) Companion.group.visible = false;
      const hotbar = document.getElementById('suit-hotbar'); if (hotbar) hotbar.style.display = 'none';
      const evo = document.getElementById('pepper-evo-panel'); if (evo) evo.style.display = 'none';

      if (playerGroup) {
        if (window.__potatoMesh && window.__potatoMesh.parent) window.__potatoMesh.parent.remove(window.__potatoMesh);
        window.__potatoMesh = window.createPotatoMesh(1);
        playerGroup.add(window.__potatoMesh);
      }
      
      if (window.__MP && window.__MP.room) window.__MP.room.send('charState', { char: 'potato', potatoForm: 1 });
      if (typeof spawnComicPop === 'function' && player.pos) spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), 'МОРГЕНКАРТОШКА', '#8B4513');
    }, 500);
  };

  // 3. Горячая клавиша F10 (железобетонный запуск)
  window.addEventListener('keydown', e => {
    if (e.code === 'F10') {
      const cs = document.getElementById('char-select');
      if (cs && cs.style.display !== 'none' && cs.style.display !== '') {
        e.preventDefault();
        console.log('[POTATO] F10 нажата в меню. Запускаю Картошку...');
        window.activatePotato();
      }
    }
  });

  // 4. Поиск кнопки Банана и клонирование
  const setupPotatoBtn = () => {
    console.log('[POTATO] Ищу кнопку Банана...');
    
    // Ищем кнопку Банана
    const allElements = document.querySelectorAll('button, div, span, a, [onclick]');
    let bananaBtn = null;
    
    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];
      const oc = el.getAttribute('onclick') || '';
      if (oc.includes('equipBanana')) { bananaBtn = el; break; }
      
      const txt = (el.innerText || el.textContent || '').toLowerCase();
      if ((txt.includes('банан') || txt.includes('egor') || txt.includes('егор')) && el.offsetWidth > 50) {
        bananaBtn = el; break;
      }
    }
    
    if (!bananaBtn) {
      console.log('[POTATO] Кнопка Банана не найдена. Попробую позже...');
      return false;
    }
    
    console.log('[POTATO] Кнопка Банана найдена:', bananaBtn);
    window.__bananaBtnRef = bananaBtn;
    
    // Проверяем, есть ли уже наша кнопка
    if (document.getElementById('btn-potato')) {
      console.log('[POTATO] Кнопка уже вставлена.');
      return true;
    }
    
    // Клонируем кнопку Банана
    const clone = bananaBtn.cloneNode(true);
    clone.id = 'btn-potato';
    clone.removeAttribute('onclick'); // Убираем старый обработчик
    
    // Меняем текст внутри на "Картошка"
    // Клонируем структуру, но меняем содержимое
    clone.innerHTML = '🥔 МОРГЕНКАРТОШКА';
    
    // Добавляем свои стили поверх
    clone.style.cssText += `
      background: #8B4513 !important;
      border-color: #FFD700 !important;
      color: #fff !important;
      cursor: pointer !important;
      pointer-events: auto !important;
      z-index: 9999 !important;
    `;
    
    // Обработчик
    clone.onclick = function(e) {
      console.log('[POTATO] Клик по нашей кнопке!');
      if (e) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }
      window.activatePotato();
    };
    
    // Вставляем клон сразу после кнопки Банана
    if (bananaBtn.parentNode) {
      bananaBtn.parentNode.insertBefore(clone, bananaBtn.nextSibling);
      console.log('[POTATO] Клон кнопки вставлен рядом с Бананом.');
    }
    
    return true;
  };

  // Пытаемся настроить кнопку при загрузке и периодически
  setInterval(setupPotatoBtn, 1000);
  setTimeout(setupPotatoBtn, 500);

  // 5. Пересоздание меша
  const _origRebuildP = window.rebuildHeroMesh;
  window.rebuildHeroMesh = function() {
    if (_origRebuildP) _origRebuildP.apply(this, arguments);
    if (window.__POTATO_MODE) {
      if (player.mesh) player.mesh.visible = false;
      if (playerGroup && (!window.__potatoMesh || !window.__potatoMesh.parent)) {
        window.__potatoMesh = window.createPotatoMesh(window.__POTATO_FORM);
        playerGroup.add(window.__potatoMesh);
      }
    } else {
      if (player.mesh) player.mesh.visible = true;
      if (window.__potatoMesh && window.__potatoMesh.parent) {
        window.__potatoMesh.parent.remove(window.__potatoMesh);
        window.__potatoMesh = null;
      }
    }
  };

  // 6. Смена формы
  window.addEventListener('keydown', e => {
    if (!window.__POTATO_MODE) return;
    if (e.code === 'Digit1' || e.code === 'Numpad1') {
      if (window.__POTATO_FORM === 1) return;
      window.__POTATO_FORM = 1; player.maxHp = 800; player.hp = Math.min(player.hp, player.maxHp);
      if (playerGroup && window.__potatoMesh) playerGroup.remove(window.__potatoMesh);
      window.__potatoMesh = window.createPotatoMesh(1);
      if (playerGroup) playerGroup.add(window.__potatoMesh);
      if (window.__MP && window.__MP.room) window.__MP.room.send('charState', { potatoForm: 1 });
    }
    if (e.code === 'Digit2' || e.code === 'Numpad2') {
      if (window.__POTATO_FORM === 2) return;
      window.__POTATO_FORM = 2; player.maxHp = 600; player.hp = Math.min(player.hp, player.maxHp);
      if (playerGroup && window.__potatoMesh) playerGroup.remove(window.__potatoMesh);
      window.__potatoMesh = window.createPotatoMesh(2);
      if (playerGroup) playerGroup.add(window.__potatoMesh);
      if (window.__MP && window.__MP.room) window.__MP.room.send('charState', { potatoForm: 2 });
    }
  });

  // 7. ЛКМ и ПКМ
  window.addEventListener('mousedown', e => {
    if (!window.__POTATO_MODE || player.isDead) return;
    const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
    if (e.button === 0) {
      if (window.__potatoMesh) window.__potatoMesh.userData.attackAnim = 1;
      let dmg = (window.__POTATO_FORM === 1) ? 60 : 35;
      for (let i = 0; i < enemies.length; i++) {
        const en = enemies[i]; const toE = en.group.position.clone().sub(player.pos);
        if (toE.length() < 5.5 && toE.clone().normalize().dot(fwd) > 0.5) {
          if (typeof damageEnemy === 'function') damageEnemy(en, dmg, fwd.clone(), '');
        }
      }
      if (window.__MP && window.__MP.room && window.__MP.remotes) {
        window.__MP.remotes.forEach((r, id) => {
          const toP = r.group.position.clone().sub(player.pos);
          if (toP.length() < 5.5 && toP.clone().normalize().dot(fwd) > 0.5) window.__MP.room.send('pvp', { targetId: id, damage: dmg });
        });
      }
    }
    if (e.button === 2) {
      if (player.potatoQCd > 0) return;
      player.potatoQCd = (window.__POTATO_FORM === 1) ? 4 : 5;
      if (window.__POTATO_FORM === 1) {
        player.vel.y = 20; setTimeout(() => { player.vel.y = -80; setTimeout(() => {
          if (typeof spawnGroundCrackRing === 'function') spawnGroundCrackRing(player.pos, 0x8B4513, 15);
          if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'potato_slam', radius: 12, dmg: 250 });
        }, 300); }, 400);
      } else {
        if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'tomato_nova', radius: 12, dmg: 300 });
      }
    }
  });

  // 8. Кулдауны и анимация
  setInterval(() => {
    if (window.__POTATO_MODE && window.__potatoMesh) {
      window.__potatoMesh.rotation.y = player.camYaw;
      if (window.__potatoMesh.userData.attackAnim > 0) {
        window.__potatoMesh.userData.attackAnim -= 0.1;
        if (window.__potatoMesh.userData.armR) window.__potatoMesh.userData.armR.pivot.rotation.x = -Math.sin((1 - window.__potatoMesh.userData.attackAnim) * Math.PI) * 2;
      }
    }
    if (player.potatoQCd > 0) player.potatoQCd -= 0.1;
    if (player.potatoCCd > 0) player.potatoCCd -= 0.1;
    if (player.potatoFCd > 0) player.potatoFCd -= 0.1;
    if (player.potatoTCd > 0) player.potatoTCd -= 0.1;
    if (player._potatoArmor > 0) player._potatoArmor -= 0.1;
  }, 100);

  // 9. C, F, T
  window.addEventListener('keydown', e => {
    if (!window.__POTATO_MODE || player.isDead) return;
    if (e.code === 'KeyC') {
      if (player.potatoCCd > 0) return; player.potatoCCd = 10;
      player.hp = Math.min(player.maxHp, player.hp + 250); player._potatoArmor = 4.0;
      if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'potato_heal' });
    }
    if (e.code === 'KeyF') {
      if (player.potatoFCd > 0) return; player.potatoFCd = 6;
      const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
      player.vel.add(fwd.multiplyScalar(150));
      if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'potato_ram' });
    }
    if (e.code === 'KeyT' && window.__POTATO_FORM === 2) {
      if (player.potatoTCd > 0) return; player.potatoTCd = 30;
      let bestE = null, bestD = 9999;
      for (let i = 0; i < enemies.length; i++) { let d = player.pos.distanceTo(enemies[i].group.position); if (d < bestD) { bestD = d; bestE = enemies[i]; } }
      if (bestE) player.pos.copy(bestE.group.position).add(new THREE.Vector3(0, 0, 3));
    }
  });

  console.log("🍌 [PATCH v50] Готово. Жми F10 в меню ИЛИ ищи кнопку '🥔 МОРГЕНКАРТОШКА' рядом с Бананом.");
})();
