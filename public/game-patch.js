// =======================================================
// BANANA INDUSTRIES - GLOBAL PATCH (v52)
// Все старые фиксы + Моргенкартошка как 5-й персонаж
// =======================================================
(function() {
  console.log("🍌 [PATCH] v52 — Загружен. Картошка = 5-й персонаж.");

  // ═══ 1-15. ВСЕ СТАРЫЕ ФИКСЫ (сохранены полностью) ═══
  if (typeof addProp === 'function') {
    const _orig = window.addProp;
    window.addProp = function(x, z, type) { if (type === 'bush') return; _orig.apply(this, arguments); };
  }

  function fixCarrotMeshGround() {
    if (!player || !player.mesh || !player.mesh.userData || !player.mesh.userData.isCarrot) return;
    try {
      player.mesh.position.y = 0; player.mesh.updateMatrixWorld(true);
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
        const p = TimeOfDay.progress, angle = p * Math.PI * 2 - Math.PI / 2;
        sunMoon.position.set(Math.cos(angle) * 3500, Math.sin(angle) * 3500, -1000);
        if (p < 0.2 || p > 0.8) { sunMoon.material.color.setHex(0xc0c0ff); sunMoon.scale.setScalar(0.6); }
        else { sunMoon.material.color.setHex(0xffee88); sunMoon.scale.setScalar(1.0); }
      }
    }, 100);
  }, 1000);

  setTimeout(() => {
    if (typeof scene !== 'undefined' && typeof createPrototypeShader === 'function') {
      const hillMat = createPrototypeShader(0x3a5a2a, 0x1a2a0a, 8, 0x88cc44);
      for (let i = 0; i < 20; i++) {
        const x = (Math.random() - 0.5) * 1600, z = (Math.random() - 0.5) * 1600;
        if (Math.abs(x) < 120 && Math.abs(z) < 120) continue;
        const r = 25 + Math.random() * 35, h = 8 + Math.random() * 15;
        const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6, 0, Math.PI*2, 0, Math.PI/2), hillMat);
        hill.position.set(x, 0, z); hill.scale.y = h / r; scene.add(hill);
      }
    }
  }, 1500);

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
    };
  }

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

  window.addEventListener('keydown', e => {
    if (e.code === 'Escape' && typeof gameStarted !== 'undefined' && gameStarted) {
      document.getElementById('start-screen').style.display = 'flex';
      try { document.exitPointerLock(); } catch(err) {}
    }
    if (e.code === 'KeyB' && typeof player !== 'undefined' && player.character === 'banana' && !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE && !window.__POTATO_MODE) {
      if (typeof Companion !== 'undefined') {
        Companion._disabled = !Companion._disabled;
        if (Companion._disabled) { if (Companion.group) Companion.group.visible = false; Companion.shootCd = 99999; Companion.buffCd = 99999; player.companionShield = 0; player.companionRegen = 0; player.companionDmg = 0; if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), 'ДРОН ОТКЛЮЧЕН', '#ff0000'); }
        else { if (Companion.group) Companion.group.visible = true; Companion.shootCd = 0; Companion.buffCd = 15; if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), 'ДРОН ВКЛЮЧЕН', '#00ff66'); }
      }
    }
  });

  if (typeof Companion !== 'undefined') {
    const origUpdate = Companion.update;
    Companion.update = function(dt, now) { origUpdate.call(this, dt, now); if ((this._disabled || window.__POTATO_MODE) && this.group) { this.group.visible = false; this.shootCd = 99999; this.buffCd = 99999; } };
    const origFind = Companion.findNearestEnemy;
    Companion.findNearestEnemy = function(maxD) { let best = null, bd = maxD; if (window.__MP_MODE && window.__MP && window.__MP.remotes) { window.__MP.remotes.forEach((r, id) => { const d = r.group.position.distanceTo(this.group.position); if (d < bd) { bd = d; best = { isPlayer: true, id: id, group: r.group }; } }); } if (origFind) { const enemy = origFind.call(this, maxD); if (enemy) { const d = enemy.group.position.distanceTo(this.group.position); if (d < bd) { bd = d; best = enemy; } } } return best; };
    const origShoot = Companion.shootAt;
    Companion.shootAt = function(e) { if (window.__POTATO_MODE) return; if (e.isPlayer) { if (window.__MP && window.__MP.room) window.__MP.room.send('pvp', { targetId: e.id, damage: 5 }); if (typeof SoundFX !== 'undefined') SoundFX.whip(); const p = ParticlePool.get(0xadff2f); p.position.copy(this.group.position); p.scale.setScalar(1.2); scene.add(p); ParticlePool.active.push({ mesh: p, vel: new THREE.Vector3(0,0,0), life: 0.2 }); return; } if (origShoot) origShoot.apply(this, arguments); };
  }

  // ГАРПУН
  let _newVineCd = 0;
  window.addEventListener('mousedown', function(e) {
    if (e.button !== 2 || !CARROT_MODE || CARROT_FORM !== 1) return;
    if (player.isDead || (typeof gameStarted !== 'undefined' && !gameStarted) || (typeof isLabOpen !== 'undefined' && isLabOpen)) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if (_newVineCd > 0) return;
    const origin = player.pos.clone().add(new THREE.Vector3(0, 2, 0));
    const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
    const rc = new THREE.Raycaster(); rc.set(origin, fwd); rc.far = 450;
    const buildHits = rc.intersectObjects(buildingMeshes, false).filter(h => h.point.y > player.pos.y + 1);
    const buildingDist = buildHits.length > 0 ? buildHits[0].distance : Infinity;
    let bestEnemy = null, bestDist = 450;
    for (let i = 0; i < enemies.length; i++) { const en = enemies[i]; const toE = en.group.position.clone().sub(player.pos); if (toE.length() > 450) continue; if (toE.clone().normalize().dot(fwd) < 0.5) continue; if (toE.length() < bestDist) { bestDist = toE.length(); bestEnemy = en; } }
    if (bestEnemy && bestDist <= buildingDist) { _newVineCd = 0.6; const isElite = (bestEnemy.type === 'titan' || bestEnemy.type === 'tank' || bestEnemy.type === 'lemon' || bestEnemy.type === 'valkyrie' || bestEnemy.type === 'necromancer' || bestEnemy.type === 'heli' || bestEnemy.type === 'shield' || bestEnemy.type === 'sniper'); const tp = bestEnemy.group.position.clone().add(new THREE.Vector3(0, 2, 0)); if (activeTendrils.length < 8) activeTendrils.push(new OrganicTendril3D(scene, origin.clone(), tp.clone(), 0x2ecc71, 0.4, 0.5)); SoundFX.whip(); triggerHitstopAndChroma(0.06, 0.4, 0.9); const travelMs = Math.max(250, Math.min(2000, (bestDist / 250) * 1000)); if (isElite) { spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), '*К БОССУ!*', '#ff2200'); const dir = tp.clone().sub(player.pos).normalize(); player.vel.x = dir.x * 250; player.vel.z = dir.z * 250; player.vel.y = Math.max(20, dir.y * 50); player.dodgeIframes = 0.7; postUniforms.uRadialBlur.value = 1.3; const capE = bestEnemy; setTimeout(function(){ if (capE && capE.group.parent) { const st = carrotStats(); damageEnemy(capE, st.dmg * 4.5, new THREE.Vector3(0,0,0), '*СОКРУШИТЕЛЬНЫЙ УДАР!*'); spawnParticles(tp.clone(), 0x2ecc71, 24); spawnGroundCrackRing(capE.group.position, 0x2ecc71, 14); triggerHitstopAndChroma(0.12, 0.8, 1.3); } }, travelMs); } else { spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), '*ИДИ СЮДА!*', '#2ecc71'); const capE = bestEnemy; capE.vel.x = (player.pos.x - capE.group.position.x) * 8; capE.vel.z = (player.pos.z - capE.group.position.z) * 8; capE._rooted = 0.6; setTimeout(function(){ if (capE && capE.group.parent) { const st = carrotStats(); const fwd2 = new THREE.Vector3(-Math.sin(player.facingYaw), 0, -Math.cos(player.facingYaw)); spawnSlashArc(player.pos.clone().add(new THREE.Vector3(0, 2, 0)), player.facingYaw, 0, 0x2ecc71, 6.5, 0.4); damageEnemy(capE, st.dmg * 3.0, fwd2.clone().multiplyScalar(10), '*УДАР С РАЗВОРОТА!*'); spawnParticles(capE.group.position.clone().add(new THREE.Vector3(0, 2, 0)), 0xadff2f, 14); triggerHitstopAndChroma(0.08, 0.6, 1.1); } }, 450); } }
    else if (buildHits.length > 0) { _newVineCd = 0.6; const hp = buildHits[0].point; if (activeTendrils.length < 8) activeTendrils.push(new OrganicTendril3D(scene, origin.clone(), hp.clone(), 0x2ecc71, 0.35, 0.4)); SoundFX.swing(500); spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), '*ЦЕПКИЙ КОРЕНЬ!*', '#2ecc71'); const dir = hp.clone().sub(player.pos).normalize(); player.vel.x = dir.x * 220; player.vel.z = dir.z * 220; player.vel.y = Math.max(40, Math.abs(dir.y) * 80 + 20); player.isGrounded = false; player.isBulletdropping = false; player.dodgeIframes = 0.5; postUniforms.uRadialBlur.value = 1.1; }
  }, true);
  setInterval(() => { if (_newVineCd > 0) _newVineCd = Math.max(0, _newVineCd - 0.1); }, 100);

  // ЗАМОРОЗКА
  window.addEventListener('keydown', function(e) {
    if (e.code !== 'KeyC' || player.character !== 'banana' || player.suitIdx !== 4 || CARROT_MODE || PEPPER_MODE || LEMON_MODE || window.__POTATO_MODE) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if (player.consumeCd > 0) return;
    player.consumeCd = 8.0;
    const targets = []; for (let i = 0; i < enemies.length; i++) if (enemies[i].group.position.distanceTo(player.pos) < 15) targets.push(enemies[i]);
    const groundRing = new THREE.Mesh(new THREE.RingGeometry(1, 15, 40), new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false }));
    groundRing.rotation.x = -Math.PI / 2; groundRing.position.set(player.pos.x, 0.15, player.pos.z); scene.add(groundRing);
    let rt = 0; (function animRing() { rt += 0.03; groundRing.material.opacity = Math.max(0, 0.65 * (1 - rt)); groundRing.scale.setScalar(1 + rt * 0.2); if (rt < 1) requestAnimationFrame(animRing); else { scene.remove(groundRing); groundRing.geometry.dispose(); groundRing.material.dispose(); } })();
    for (const t of targets) { if (typeof spawnParticles === 'function') spawnParticles(t.group.position.clone().add(new THREE.Vector3(0,1,0)), 0x00f2fe, 12); t.frozen = 3.0; t._mpMoving = false; t.vel.x = 0; t.vel.z = 0; if (!t._mpId && typeof damageEnemy === 'function') damageEnemy(t, 20, new THREE.Vector3(), '*ЗАМОРОЖЕН!*'); }
    if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'freeze', radius: 15 });
    if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,5,0)), `❄ ЗАМОРОЗКА (${targets.length})`, '#00f2fe');
    if (typeof SoundFX !== 'undefined') { SoundFX.devastator(); SoundFX.boom(); }
  }, true);
  setInterval(() => { if (player.consumeCd > 0) player.consumeCd = Math.max(0, player.consumeCd - 0.1); }, 100);

  // T Егора (обновлено: +урон, +КД)
  let tHoldTimer = 0, tCharging = false, nanoUltCd = 0;
  const tPanel = document.createElement('div'); tPanel.style.cssText = 'position:fixed;bottom:180px;left:50%;transform:translateX(-50%);width:340px;background:rgba(0,20,40,.95);border:3px solid #00f2fe;border-radius:8px;padding:12px;text-align:center;z-index:50;display:none;box-shadow:0 0 30px rgba(0,242,254,.7),5px 5px 0 #000'; tPanel.innerHTML = '<div style="font-family:Bangers,Impact,sans-serif;font-size:20px;color:#00f2fe;-webkit-text-stroke:1px #000;margin-bottom:6px;letter-spacing:2px">⚡ БОЖЕСТВЕННЫЙ СИНТЕЗ ⚡</div><div style="height:22px;background:#001a1a;border:2px solid #000;overflow:hidden"><div id="t-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#00f2fe,#ff0055);box-shadow:0 0 15px #00f2fe;transition:width .05s"></div></div>'; document.body.appendChild(tPanel);
  window.addEventListener('keydown', e => { if (e.code === 'KeyT' && player.character === 'banana' && player.suitIdx === 4 && !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE && !window.__POTATO_MODE) { if (nanoUltCd > 0) { if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), `*T КД ${Math.ceil(nanoUltCd)}с*`, '#ff4400'); return; } if (!tCharging) { tCharging = true; tHoldTimer = 0; tPanel.style.display = 'block'; } } });
  window.addEventListener('keyup', e => { if (e.code === 'KeyT' && tCharging) { tCharging = false; tPanel.style.display = 'none'; } });
  setInterval(() => { if (nanoUltCd > 0) nanoUltCd -= 0.1; if (tCharging) { tHoldTimer += 0.1; document.getElementById('t-bar').style.width = Math.min(100, (tHoldTimer / 5) * 100) + '%'; if (tHoldTimer >= 5) { tCharging = false; tPanel.style.display = 'none'; nanoUltCd = 102.5; const beam = new THREE.Mesh(new THREE.CylinderGeometry(2, 15, 40, 16), new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.7, wireframe: true })); beam.rotation.x = Math.PI / 2; const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw)); beam.position.copy(player.pos).add(fwd.clone().multiplyScalar(20)); beam.lookAt(player.pos.clone().add(fwd.clone().multiplyScalar(40))); scene.add(beam); setTimeout(() => { scene.remove(beam); beam.geometry.dispose(); beam.material.dispose(); }, 1500); const ring = new THREE.Mesh(new THREE.RingGeometry(1, 50, 32), new THREE.MeshBasicMaterial({ color: 0x00f2fe, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.copy(player.pos); scene.add(ring); let rt = 0; (function animRing() { rt += 0.05; ring.scale.setScalar(1 + rt * 3); ring.material.opacity = Math.max(0, 1 - rt); if (rt < 1) requestAnimationFrame(animRing); else { scene.remove(ring); ring.geometry.dispose(); ring.material.dispose(); } })(); if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'nano_ult', radius: 50 }); if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,5,0)), '⚡ БОЖЕСТВЕННЫЙ СИНТЕЗ! ⚡', '#00f2fe'); if (typeof SoundFX !== 'undefined') { SoundFX.devastator(); SoundFX.boom(); } } } }, 100);

  // ОСТАНОВКА ЗАМОРОЖЕННЫХ
  if (typeof updateEnemiesAndVehicles === 'function') { const _origUpdateEnemies = window.updateEnemiesAndVehicles; window.updateEnemiesAndVehicles = function(dt, now) { const frozenPos = new Map(); for (let i = 0; i < enemies.length; i++) { const en = enemies[i]; if (en.frozen > 0) { en.frozen -= dt; en.vel.x = 0; en.vel.z = 0; en._mpMoving = false; frozenPos.set(en, en.group.position.clone()); } } _origUpdateEnemies.apply(this, arguments); for (let [en, pos] of frozenPos) en.group.position.copy(pos); }; }

  // F-СПОСОБНОСТИ
  player._suitCdMap = player._suitCdMap || [0,0,0,0,0];
  const origTriggerF = window.triggerUniqueAbilityF;
  window.triggerUniqueAbilityF = function() {
    if (window.__POTATO_MODE) return;
    const idx = player.suitIdx;
    if (CARROT_MODE) { if (CARROT_FORM === 2) { if (player._suitCdMap[4] > 0) return; if (player.carrotStamina < 60) return; player._suitCdMap[4] = 8; carrotEarthquake(); if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'earthquake', radius: 40 }); } else { if (player._suitCdMap[3] > 0) return; player._suitCdMap[3] = 8; carrotRootBind(); if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'root_bind', radius: 22 }); } return; }
    if (player.character === 'banana') { if (player._suitCdMap[idx] > 0) return; if (idx === 0) { player._suitCdMap[0] = 5; if (typeof alliedTurrets !== 'undefined') for(let i=0; i<2; i++) { const g=new THREE.Group(); g.position.copy(player.pos).add(new THREE.Vector3((i-0.5)*4, 0, 0)); const b=new THREE.Mesh(new THREE.CylinderGeometry(.9,1.1,2,6),createPrototypeShader(0x3f4650,0x111111,0)); b.position.y=1; g.add(b); scene.add(g); alliedTurrets.push({group:g,life:15,cd:0}); } return; } if (idx === 1) { player._suitCdMap[1] = 4; SoundFX.whip(); for(let k=-4;k<=4;k++){ const a=player.camYaw+k*.15; const d=new THREE.Vector3(-Math.sin(a),0,-Math.cos(a)); const p=new THREE.Mesh(new THREE.SphereGeometry(0.4,6,6), new THREE.MeshBasicMaterial({color:0xf9ca24})); p.position.copy(player.pos).add(new THREE.Vector3(0,2,0)); scene.add(p); projectiles.push({mesh:p,vel:new THREE.Vector3(d.x*50,0,d.z*50),life:1.5,fromPlayer:true,dmg:60,radius:2}); } return; } if (idx === 2) { player._suitCdMap[2] = 8; SoundFX.devastator(); player.facingYaw = player.camYaw; const f = new THREE.Vector3(-Math.sin(player.facingYaw),0,-Math.cos(player.facingYaw)); player.durianRam = { timer: 0, speed: 60, dir: f, hitSet: new Set(), maxDur: 5.0 }; return; } if (idx === 3) { player._suitCdMap[3] = 1; player.activeModeF = !player.activeModeF; if (player.mesh && player.mesh.userData.limeShield) player.mesh.userData.limeShield.visible = player.activeModeF; return; } return; }
    if (PEPPER_MODE && player.pepperTBeamCd <= 0) { releasePepperTBeam(); if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'hell_explosion', radius: 40 }); return; }
    if (LEMON_MODE && player.lemonUltCd <= 0) { lemonUltimate(); if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'ult_lemon', radius: 40 }); return; }
    if (origTriggerF) origTriggerF.apply(this, arguments);
  };
  setInterval(() => { if (player._suitCdMap) for (let i = 0; i < 5; i++) if (player._suitCdMap[i] > 0) player._suitCdMap[i] -= 0.1; }, 100);

  // ТАНКИ
  if (typeof spawnCitrusAPC === 'function') { const _origAPC = spawnCitrusAPC; window.spawnCitrusAPC = function(x, z) { _origAPC(x, z); const t = enemies[enemies.length - 1]; if (t && t.type === 'tank') { t.group.scale.set(1.8, 1.8, 1.8); t.radius = 6.8; } }; }

  // ОПУТЫВАНИЕ СБИВАЕТ ЛЕТАЮЩИХ
  const origRootBind = window.carrotRootBind;
  window.carrotRootBind = function() { if (origRootBind) origRootBind.apply(this, arguments); for (let i = 0; i < enemies.length; i++) { const e = enemies[i]; if (e.flying && e.group.position.distanceTo(player.pos) < 25) { e.flying = false; e.group.position.y = 0; e.vel.y = 0; if (typeof spawnComicPop === 'function') spawnComicPop(e.group.position.clone().add(new THREE.Vector3(0,2,0)), 'СБИТ!', '#2ecc71'); } } };

  // ЯРОСТЬ ПЕРЦА
  if (typeof addRage === 'function') { const origAddRage = window.addRage; window.addRage = function(amount) { if (PEPPER_MODE) { if (typeof addSpiciness === 'function') addSpiciness(amount); return; } if (origAddRage) origAddRage.apply(this, arguments); }; }


  // ═══════════════════════════════════════════════════════════
  // ═══ 16. НОВЫЙ ПЕРСОНАЖ: МОРГЕНКАРТОШКА & ГРОМТОМАТ ═══
  // ═══════════════════════════════════════════════════════════
  window.__POTATO_MODE = false;
  window.__POTATO_FORM = 1;
  let potatoCombo = 0;
  let potatoComboTimer = 0;
  player._potatoArmor = 0;
  player._potatoHealCd = 0;
  player._potatoRageCd = 0;
  player._potatoRamCd = 0;
  player._potatoSauceCd = 0;
  player._potatoPortalCd = 0;
  player._potatoSlamCd = 0;
  player._potatoNovaCd = 0;

  // === 3D-модель ===
  window.createPotatoMesh = function(form) {
    form = (form === 2) ? 2 : 1;
    var g = new THREE.Group();
    var pelvis = new THREE.Group(); pelvis.position.y = 1.65; g.add(pelvis);
    var spine = new THREE.Group(); pelvis.add(spine);
    var neck = new THREE.Group(); neck.position.y = 1.95; spine.add(neck);
    var headGroup = new THREE.Group(); headGroup.position.y = 0.4; neck.add(headGroup);
    var armL = new THREE.Group(); armL.position.set(-1.0, 1.55, 0); spine.add(armL);
    var armR = new THREE.Group(); armR.position.set(1.0, 1.55, 0); spine.add(armR);
    var legL = new THREE.Group(); legL.position.set(-0.35, 0, 0); pelvis.add(legL);
    var legR = new THREE.Group(); legR.position.set(0.35, 0, 0); pelvis.add(legR);

    // части тела
    var bodyMat, bellyMat, headMat, hairMat, armMat, legMat, accentMat;
    var isMorg = (form === 1);
    if (isMorg) {
      bodyMat = new THREE.MeshStandardMaterial({color: 0x8B0000});
      bellyMat = new THREE.MeshStandardMaterial({color: 0xD2B48C});
      headMat = new THREE.MeshStandardMaterial({color: 0xE8C4A0});
      hairMat = new THREE.MeshStandardMaterial({color: 0x2A1A0F});
      armMat = new THREE.MeshStandardMaterial({color: 0x8B0000});
      legMat = new THREE.MeshStandardMaterial({color: 0x2A2A2A});
      accentMat = new THREE.MeshBasicMaterial({color: 0x3E2723});
    } else {
      bodyMat = new THREE.MeshStandardMaterial({color: 0x4A0010});
      bellyMat = new THREE.MeshStandardMaterial({color: 0xFF2200});
      headMat = new THREE.MeshStandardMaterial({color: 0xFF0000});
      hairMat = new THREE.MeshStandardMaterial({color: 0x0A0A0A});
      armMat = new THREE.MeshStandardMaterial({color: 0x4A0010});
      legMat = new THREE.MeshStandardMaterial({color: 0x1A1A1A});
      accentMat = new THREE.MeshStandardMaterial({color: 0x00FF00});
    }

    // Торс
    var torso = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 1.5, 10), bodyMat);
    torso.position.y = 1.1; spine.add(torso);

    // Клетка для Моргена
    if (isMorg) {
      for (var s = 0; s < 4; s++) {
        var stripeH = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.06, 0.06), new THREE.MeshBasicMaterial({color: 0x000000}));
        stripeH.position.set(0, 0.55 + s * 0.35, 0.86); spine.add(stripeH);
      }
      for (var sv = 0; sv < 3; sv++) {
        var stripeV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.06), new THREE.MeshBasicMaterial({color: 0x000000}));
        stripeV.position.set(-0.6 + sv * 0.6, 1.15, 0.86); spine.add(stripeV);
      }
      // Пузо
      var belly = new THREE.Mesh(new THREE.SphereGeometry(0.78, 12, 10), bellyMat);
      belly.position.set(0, 0.7, 0.55); belly.scale.set(1.05, 0.95, 0.55); spine.add(belly);
      // Борода
      var beard = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.85, 8), hairMat);
      beard.position.set(0, 0.05, 0.48); beard.rotation.x = Math.PI; headGroup.add(beard);
      // Глаза
      var eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.05), new THREE.MeshBasicMaterial({color: 0x000000}));
      eyeL.position.set(-0.18, 0.45, 0.48); headGroup.add(eyeL);
      var eyeR = eyeL.clone(); eyeR.position.x = 0.18; headGroup.add(eyeR);
    } else {
      // Пузо Громтомата
      var belly2 = new THREE.Mesh(new THREE.SphereGeometry(0.82, 14, 12), bellyMat);
      belly2.position.set(0, 0.65, 0.5); belly2.scale.set(1.1, 1.0, 0.6); spine.add(belly2);
      // Глаза
      var eyeL2 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), new THREE.MeshBasicMaterial({color: 0xFFFFFF}));
      eyeL2.position.set(-0.2, 0.45, 0.52); headGroup.add(eyeL2);
      var pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), new THREE.MeshBasicMaterial({color: 0x000000}));
      pupilL.position.set(-0.2, 0.45, 0.62); headGroup.add(pupilL);
      var eyeR2 = eyeL2.clone(); eyeR2.position.x = 0.2; headGroup.add(eyeR2);
      var pupilR = pupilL.clone(); pupilR.position.x = 0.2; headGroup.add(pupilR);
    }

    // Голова (общая для обоих)
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 12), headMat);
    head.position.y = 0.4; head.scale.set(1, 1.05, 1); headGroup.add(head);

    // Волосы
    if (isMorg) {
      var hairLong = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.75, 12), hairMat);
      hairLong.position.set(0, 0.68, -0.05); headGroup.add(hairLong);
    } else {
      var hairShort = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8, 0, Math.PI*2, 0, Math.PI*0.55), hairMat);
      hairShort.position.set(0, 0.65, -0.02); headGroup.add(hairShort);
    }

    // Руки
    function buildArm(side) {
      var upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.7, 8), armMat);
      upperArm.position.y = -0.35; side.add(upperArm);
      var elbow = new THREE.Group(); elbow.position.y = -0.7; side.add(elbow);
      var foreArm = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.65, 8), armMat);
      foreArm.position.y = -0.32; elbow.add(foreArm);
      var wrist = new THREE.Group(); wrist.position.y = -0.65; elbow.add(wrist);

      if (isMorg) {
        // Молот в правой руке
        if (side === armR) {
          var handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 6), new THREE.MeshStandardMaterial({color: 0x5D4037}));
          handle.position.y = -0.9; wrist.add(handle);
          var hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.75), new THREE.MeshStandardMaterial({color: 0x8E8E8E}));
          hammerHead.position.y = -1.75; wrist.add(hammerHead);
        }
        var fist = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 8), headMat);
        fist.position.y = -0.08; wrist.add(fist);
      } else {
        // Зелёные перчатки
        var glove = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), accentMat);
        glove.position.y = -0.08; wrist.add(glove);
      }
      return { shoulder: side, elbow: elbow, wrist: wrist };
    }
    var armLData = buildArm(armL);
    var armRData = buildArm(armR);

    // Ноги
    function buildLeg(side) {
      var thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.85, 8), legMat);
      thigh.position.y = -0.42; side.add(thigh);
      var knee = new THREE.Group(); knee.position.y = -0.85; side.add(knee);
      var shin = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.85, 8), legMat);
      shin.position.y = -0.42; knee.add(shin);
      return { hip: side, knee: knee };
    }
    var legLData = buildLeg(legL);
    var legRData = buildLeg(legR);

    g.userData = {
      pelvis: pelvis, spine: spine, neck: neck, headGroup: headGroup,
      armL: armLData, armR: armRData, legL: legLData, legR: legRData,
      limeShield: null, backTentacles: null, isPotato: true
    };
    return g;
  };

  // === Переопределение getSuitData ===
  const origGetSuitData = window.getSuitData;
  window.getSuitData = function() {
    if (window.__POTATO_MODE) {
      if (window.__POTATO_FORM === 1) {
        return { id: 'potato1', name: 'МОРГЕНКАРТОШКА', desc: 'Танк.', maxHp: 800, maxEn: 300, speed: 22, dmg: 90, canFly: false, level: 1, slashColor: 0x8B4513, quote: '' };
      } else {
        return { id: 'potato2', name: 'ГРОМТОМАТ', desc: 'Дамагер.', maxHp: 600, maxEn: 400, speed: 30, dmg: 70, canFly: false, level: 1, slashColor: 0xFF2200, quote: '' };
      }
    }
    return origGetSuitData ? origGetSuitData.apply(this, arguments) : SUITS[player.suitIdx];
  };

  // === Переопределение performPrimaryAttack ===
  const origPPA = window.performPrimaryAttack;
  window.performPrimaryAttack = function() {
    if (!window.__POTATO_MODE) {
      if (origPPA) return origPPA.apply(this, arguments);
      return;
    }
    if (player.isDead || player.consumeState || player.attackTimer > 0.08) return;

    if (potatoComboTimer <= 0) potatoCombo = 0;
    potatoComboTimer = 1.5;

    var fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
    var isMorg = (window.__POTATO_FORM === 1);
    var maxCombo = isMorg ? 3 : 5;
    potatoCombo = (potatoCombo % maxCombo) + 1;

    // Мапим 3-й удар Моргена → 5-й в PLAYER_COMBO (финишер)
    var comboStep = (isMorg && potatoCombo === 3) ? 5 : potatoCombo;
    player.comboStep = comboStep;
    player.attackDuration = PLAYER_COMBO[comboStep].dur;
    player.attackTimer = player.attackDuration;
    player.comboResetTimer = 1.5;
    player.facingYaw = player.camYaw;
    player.vel.x += fwd.x * PLAYER_COMBO[comboStep].lunge;
    player.vel.z += fwd.z * PLAYER_COMBO[comboStep].lunge;

    var baseDmg = (window.__POTATO_FORM === 1) ? 90 : 70;
    var dmgMult = (potatoCombo === maxCombo) ? 2.5 : 1.0;
    var isFinisher = (potatoCombo === maxCombo);

    var chest = new THREE.Vector3(player.pos.x, player.pos.y + 2.3, player.pos.z);
    var slashColor = (window.__POTATO_FORM === 1) ? 0x8B4513 : 0xFF2200;
    spawnSlashArc(chest.clone().add(fwd.clone().multiplyScalar(1.7)), player.facingYaw, PLAYER_COMBO[comboStep].tilt, slashColor, isMorg ? 4.8 : 4.0, 0.2);

    if (isFinisher) {
      if (isMorg) {
        // AoE подброс
        spawnGroundCrackRing(new THREE.Vector3(player.pos.x + fwd.x*3.5, 0, player.pos.z + fwd.z*3.5), 0x8B4513, 10);
        SoundFX.devastator();
        triggerHitstopAndChroma(0.05, 0.6, 1.1);
      } else {
        // Огненный шар
        var fireBall = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 10), new THREE.MeshBasicMaterial({color: 0xFF2200}));
        fireBall.position.copy(chest); scene.add(fireBall);
        projectiles.push({mesh: fireBall, vel: new THREE.Vector3(fwd.x*45, 0, fwd.z*45), life: 1.5, fromPlayer: true, dmg: baseDmg * 2.5, radius: 3.0});
        spawnParticles(chest, 0xFF2200, 12);
        triggerHitstopAndChroma(0.05, 0.6, 1.1);
      }
    }
    SoundFX.swing(200 + potatoCombo * 50);

    var hr = isMorg ? 6.0 : 5.0;
    if (isFinisher) hr = isMorg ? 10 : 6.5;
    var hx = player.pos.x + fwd.x * 3.4, hz = player.pos.z + fwd.z * 3.4;

    for (var i = enemies.length - 1; i >= 0; i--) {
      var e = enemies[i];
      var dx = e.group.position.x - hx, dz = e.group.position.z - hz;
      if (dx*dx + dz*dz <= (hr + e.radius) * (hr + e.radius)) {
        var finalDmg = baseDmg * dmgMult;
        if (isFinisher && isMorg) e.vel.y = 18;
        damageEnemy(e, finalDmg, new THREE.Vector3(fwd.x*3, 0, fwd.z*3), isFinisher ? (isMorg ? '*ТЯЖЁЛЫЙ!' : '*ОГНЕННЫЙ ШАР!*') : '');
      }
    }
    if (window.__MP && window.__MP.room && window.__MP.remotes) {
      window.__MP.remotes.forEach(function(r, id) {
        var ddx = r.group.position.x - hx, ddz = r.group.position.z - hz;
        if (ddx*ddx + ddz*ddz <= (hr + 1) * (hr + 1)) {
          window.__MP.room.send('pvp', { targetId: id, damage: Math.round(baseDmg * dmgMult) });
        }
      });
    }
    if (typeof isLabOpen === 'undefined' || !isLabOpen) {
      if (typeof checkCarDestruction === 'function') checkCarDestruction(new THREE.Vector3(hx, 0, hz), hr);
    }
  };

  // === Переопределение performDevastator (Q/ПКМ) ===
  const origDevastator = window.performDevastator;
  window.performDevastator = function() {
    if (!window.__POTATO_MODE) {
      if (origDevastator) return origDevastator.apply(this, arguments);
      return;
    }
    if (player.isDead || player.consumeState) return;
    if (window.__POTATO_FORM === 1) {
      if (player._potatoSlamCd > 0) return;
      player._potatoSlamCd = 4.0;
      // Прыжок с молотом
      player.vel.y = 22;
      SoundFX.whip();
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), '⚡ ГРОМОВОЙ МОЛОТ! ⚡', '#8B4513');
      setTimeout(function() {
        player.vel.y = -85;
        setTimeout(function() {
          spawnGroundCrackRing(player.pos, 0x8B4513, 18);
          spawnParticles(player.pos.clone().add(new THREE.Vector3(0,1,0)), 0x8B4513, 30);
          SoundFX.boom(); SoundFX.devastator();
          triggerHitstopAndChroma(0.12, 0.9, 1.4);
          spawnLandingCrater(player.pos, 5);
          for (var i = enemies.length - 1; i >= 0; i--) {
            var e = enemies[i];
            var d = e.group.position.distanceTo(player.pos);
            if (d < 14) {
              e.vel.y = Math.max(e.vel.y, 15);
              damageEnemy(e, 250 * (1 - d/16), new THREE.Vector3(), '*ЗЕМЛЕТРЯСЕНИЕ!*');
            }
          }
          if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'potato_slam', radius: 14, damage: 250 });
        }, 300);
      }, 400);
    } else {
      if (player._potatoNovaCd > 0) return;
      player._potatoNovaCd = 5.0;
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), '🔥 СВЕРХНОВА! 🔥', '#FF2200');
      SoundFX.devastator(); SoundFX.boom();
      triggerHitstopAndChroma(0.1, 0.8, 1.3);
      spawnGroundCrackRing(player.pos, 0xFF2200, 14);
      spawnParticles(player.pos.clone().add(new THREE.Vector3(0,2,0)), 0xFF2200, 40);
      for (var j = enemies.length - 1; j >= 0; j--) {
        var en = enemies[j];
        var dist = en.group.position.distanceTo(player.pos);
        if (dist < 14) {
          en.vel.y = Math.max(en.vel.y, 12);
          damageEnemy(en, 300 * (1 - dist/16), new THREE.Vector3(), '*ВЗРЫВ!*');
        }
      }
      if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'tomato_nova', radius: 14, damage: 300 });
    }
  };

  // === F ===
  const origF = window.triggerUniqueAbilityF;
  window.triggerUniqueAbilityF = function() {
    if (!window.__POTATO_MODE) {
      if (origF) return origF.apply(this, arguments);
      return;
    }
    if (player.isDead) return;
    if (window.__POTATO_FORM === 1) {
      if (player._potatoRamCd > 0) return;
      player._potatoRamCd = 6.0;
      var fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
      player.vel.x += fwd.x * 180;
      player.vel.z += fwd.z * 180;
      player.dodgeIframes = 0.6;
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), '💥 ТАРАН! 💥', '#8B4513');
      SoundFX.devastator();
      // Проверка столкновения через 300мс
      setTimeout(function() {
        for (var i = enemies.length - 1; i >= 0; i--) {
          var e = enemies[i];
          if (e.group.position.distanceTo(player.pos) < 8) {
            e.vel.y = Math.max(e.vel.y, 18);
            damageEnemy(e, 180, fwd.clone().multiplyScalar(8), '*ТАРАН!*');
          }
        }
      }, 200);
      if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'potato_ram', radius: 8, damage: 180 });
    } else {
      if (player._potatoSauceCd > 0) return;
      player._potatoSauceCd = 3.0;
      var fwd2 = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), '🍅 СТРУЯ СОУСА! 🍅', '#FF2200');
      for (var step = 1; step < 16; step++) {
        (function(s) {
          setTimeout(function() {
            var p = player.pos.clone().add(fwd2.clone().multiplyScalar(s));
            spawnParticles(p, 0xCC0000, 4);
            for (var i = enemies.length - 1; i >= 0; i--) {
              var e = enemies[i];
              if (e.group.position.distanceTo(p) < 3) {
                damageEnemy(e, 25, fwd2.clone(), '');
              }
            }
          }, s * 30);
        })(step);
      }
      if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'tomato_sauce', radius: 15, damage: 100 });
    }
  };

  // === C ===
  window.addEventListener('keydown', function(e) {
    if (e.code !== 'KeyC' || !window.__POTATO_MODE) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if (player.isDead) return;

    if (window.__POTATO_FORM === 1) {
      if (player._potatoHealCd > 0) return;
      player._potatoHealCd = 10.0;
      player.hp = Math.min(player.maxHp, player.hp + 250);
      player._potatoArmor = 4.0;
      player.rooted = 1.0;
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), '🌱 ПИТАНИЕ КОРНЕЙ (+250 HP)', '#2ecc71');
      spawnGroundCrackRing(player.pos, 0x2ecc71, 8);
      spawnParticles(player.pos.clone().add(new THREE.Vector3(0,1,0)), 0x2ecc71, 20);
      SoundFX.hit(150, 0.3);
      if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'potato_heal' });
    } else {
      if (player._potatoRageCd > 0) return;
      player._potatoRageCd = 12.0;
      player._tomatoRage = 6.0;
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), '🔥 ИСПЫТАНИЕ ПЛАМЕНЕМ', '#FF4400');
      spawnParticles(player.pos.clone().add(new THREE.Vector3(0,2,0)), 0xFF4400, 25);
      SoundFX.devastator();
      if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'tomato_rage' });
    }
  }, true);

  // === T ===
  window.addEventListener('keydown', function(e) {
    if (e.code !== 'KeyT' || !window.__POTATO_MODE) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if (player.isDead || window.__POTATO_FORM !== 2) return;
    if (player._potatoPortalCd > 0) return;
    player._potatoPortalCd = 30.0;

    let bestE = null, bestD = 9999;
    for (let i = 0; i < enemies.length; i++) { let d = player.pos.distanceTo(enemies[i].group.position); if (d < bestD) { bestD = d; bestE = enemies[i]; } }
    if (bestE) {
      player.pos.copy(bestE.group.position).add(new THREE.Vector3(0, 0, 4));
      player.vel.set(0, 0, 0);
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), '🍅 ТОМАТНЫЙ ПОРТАЛ!', '#FF2200');
      spawnParticles(player.pos.clone(), 0xFF2200, 20);
      SoundFX.whip();
    } else {
      player._potatoPortalCd = 0;
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), 'НЕТ ЦЕЛЕЙ', '#888888');
    }
  }, true);

  // === Переключение формы (R) ===
  window.addEventListener('keydown', function(e) {
    if (e.code !== 'KeyR' || !window.__POTATO_MODE) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if (player.isDead) return;
    switchPotatoForm(window.__POTATO_FORM === 1 ? 2 : 1);
  }, true);

  // === Digit1 / Digit2 переключают форму ===
  window.addEventListener('keydown', function(e) {
    if (!window.__POTATO_MODE) return;
    if (e.code === 'Digit1' || e.code === 'Numpad1') { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); if (window.__POTATO_FORM !== 1) switchPotatoForm(1); }
    if (e.code === 'Digit2' || e.code === 'Numpad2') { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); if (window.__POTATO_FORM !== 2) switchPotatoForm(2); }
  }, true);

  function switchPotatoForm(form) {
    window.__POTATO_FORM = form;
    player.maxHp = (form === 1) ? 800 : 600;
    player.hp = Math.min(player.hp, player.maxHp);
    if (typeof window.rebuildHeroMesh === 'function') window.rebuildHeroMesh();
    spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), form === 1 ? '🥔 МОРГЕН' : '🍅 ГРОМТОМАТ', form === 1 ? '#8B4513' : '#FF2200');
    SoundFX.devastator();
    triggerHitstopAndChroma(0.08, 0.5, 1.1);
    if (window.__MP && window.__MP.room) window.__MP.room.send('charState', { char: 'potato', potatoForm: form });
  }

  // === Переопределение rebuildHeroMesh ===
  const origRebuild = window.rebuildHeroMesh;
  window.rebuildHeroMesh = function() {
    if (window.__POTATO_MODE) {
      // Удаляем старый меш
      if (player.mesh && playerGroup.children.indexOf(player.mesh) >= 0) playerGroup.remove(player.mesh);
      player.mesh = window.createPotatoMesh(window.__POTATO_FORM);
      playerGroup.add(player.mesh);
      // Скрываем стандартные UI
      const hotbar = document.getElementById('suit-hotbar'); if (hotbar) hotbar.style.display = 'none';
      const evo = document.getElementById('pepper-evo-panel'); if (evo) evo.classList.remove('active');
      if (typeof Companion !== 'undefined' && Companion.group) Companion.group.visible = false;
      return;
    }
    if (origRebuild) return origRebuild.apply(this, arguments);
  };

  // === equipPotato ===
  window.equipPotato = function() {
    console.log('[POTATO] equip');
    window.__POTATO_MODE = true;
    window.__POTATO_FORM = 1;
    player.character = 'potato';
    player.suitIdx = 4;
    PEPPER_MODE = false; CARROT_MODE = false; LEMON_MODE = false; CARROT_FORM = 1;
    playerGroup.scale.set(1, 1, 1);
    player.maxHp = 800; player.hp = 800;
    player.maxEn = 300; player.en = 300;
    player._potatoArmor = 0;
    player._potatoHealCd = 0;
    player._potatoRageCd = 0;
    player._potatoRamCd = 0;
    player._potatoSauceCd = 0;
    player._potatoPortalCd = 0;
    player._potatoSlamCd = 0;
    player._potatoNovaCd = 0;

    if (typeof rebuildHeroMesh === 'function') rebuildHeroMesh();

    const badge = document.querySelector('.suit-badge'); if (badge) badge.innerText = '🥔 МОРГЕНКАРТОШКА';
    const rageLbl = document.querySelector('.rage-wrap .bar-label span'); if (rageLbl) rageLbl.innerText = '🛡️ БРОНЯ / ЯРОСТЬ';
    const powers = document.getElementById('ui-powers-desc');
    if (powers) powers.innerHTML = '<b>ЛКМ:</b> 3-Hit (3-й AoE) | <b>Q:</b> Прыжок-молот | <b>C:</b> Лечение+броня | <b>F:</b> Таран | <b>R:</b> Форма';

    if (typeof Companion !== 'undefined' && Companion.group) Companion.group.visible = false;
    const hotbar = document.getElementById('suit-hotbar'); if (hotbar) hotbar.style.display = 'none';
    const evo = document.getElementById('pepper-evo-panel'); if (evo) evo.classList.remove('active');

    heroAuraLight.color.setHex(0x8B4513);

    if (typeof window.updateHUD === 'function') window.updateHUD();
    if (typeof window.updateScoreDisplay === 'function') window.updateScoreDisplay();
    if (window.__MP && window.__MP.room) window.__MP.room.send('charState', { char: 'potato', potatoForm: 1 });

    spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), '🥔 МОРГЕНКАРТОШКА', '#8B4513');
    SoundFX.devastator();
    triggerHitstopAndChroma(0.08, 0.5, 1.1);
  };

  // === Старт сессии с картошкой ===
  const origStartGameSession = window.startGameSession;
  window.startGameSession = function(loaded) {
    if (player.character === 'potato') {
      SoundFX.init();
      gameStarted = true;
      player.runStartTime = performance.now();
      document.getElementById('start-screen').style.display = 'none';
      document.getElementById('char-select').style.display = 'none';
      ignoreNextMouseFrames = 2;
      try { if (canvas.requestPointerLock) canvas.requestPointerLock(); } catch(e) {}
      if (typeof Mutations !== 'undefined' && Mutations.applyAll) Mutations.applyAll();
      if (loaded) {
        player.score = loaded.score || 0;
        player.wave = loaded.wave || 1;
        player.ep = loaded.ep || 350;
        if (loaded.mutations && typeof Mutations !== 'undefined') Mutations.owned = loaded.mutations;
      }
      window.equipPotato();
      if (typeof updateScoreDisplay === 'function') updateScoreDisplay();
      if (typeof updateCompanionHUD === 'function') updateCompanionHUD();
      if (typeof updateRageHUD === 'function') updateRageHUD();
      if (typeof updateDashHUD === 'function') updateDashHUD();
      setTimeout(function() {
        const el = document.getElementById('ui-shrek-msg');
        if (el) el.innerText = 'Моргенкартошка: «Молот земли!»';
      }, 300);
      return;
    }
    if (origStartGameSession) return origStartGameSession.apply(this, arguments);
  };

  // === Кнопка в меню ===
  const btnSetup = function() {
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

    card.addEventListener('click', function() {
      window.__pendingPotato = true;
      player.character = 'potato';
      document.getElementById('char-select').style.display = 'none';
      window.startGameSession(window.__pendingLoad || null);
    });

    grid.appendChild(card);
  };

  // Пытаемся добавить карточку при открытии меню
  setInterval(btnSetup, 300);

  // === Переопределение updateExecPrompt (нет казни для картошки) ===
  const origExecPrompt = window.updateExecPrompt;
  if (typeof origExecPrompt === 'function') {
    window.updateExecPrompt = function() {
      if (window.__POTATO_MODE) {
        const el = document.getElementById('exec-prompt');
        if (el) el.style.display = 'none';
        return;
      }
      return origExecPrompt.apply(this, arguments);
    };
  }

  // === Кулдауны и броня ===
  setInterval(function() {
    if (player._potatoArmor > 0) player._potatoArmor -= 0.1;
    if (player._potatoHealCd > 0) player._potatoHealCd -= 0.1;
    if (player._potatoRageCd > 0) player._potatoRageCd -= 0.1;
    if (player._potatoRamCd > 0) player._potatoRamCd -= 0.1;
    if (player._potatoSauceCd > 0) player._potatoSauceCd -= 0.1;
    if (player._potatoPortalCd > 0) player._potatoPortalCd -= 0.1;
    if (player._potatoSlamCd > 0) player._potatoSlamCd -= 0.1;
    if (player._potatoNovaCd > 0) player._potatoNovaCd -= 0.1;
    if (potatoComboTimer > 0) { potatoComboTimer -= 0.1; if (potatoComboTimer <= 0) potatoCombo = 0; }
    if (window.__POTATO_MODE && window.__POTATO_FORM === 2 && player._tomatoRage > 0) {
      player._tomatoRage -= 0.1;
      if (Math.random() < 0.2) spawnParticles(player.pos.clone().add(new THREE.Vector3((Math.random()-0.5)*2, 1, (Math.random()-0.5)*2)), 0xFF2200, 1);
    }
  }, 100);

  // === Блокировка шрекича и костюмов в HUD ===
  setInterval(function() {
    if (window.__POTATO_MODE) {
      const sh = document.getElementById('shrekich-monitor'); if (sh) sh.style.display = 'none';
      const comp = document.getElementById('companion-panel'); if (comp) comp.style.display = 'none';
      const rp = document.getElementById('rocket-panel'); if (rp) rp.style.display = 'none';
      const hb = document.getElementById('suit-hotbar'); if (hb) hb.style.display = 'none';
    }
  }, 500);

  console.log("🍌 [PATCH v52] Готово. Картошка = 5-й персонаж. Все фиксы сохранены.");
})();
