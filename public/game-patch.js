// =======================================================
// BANANA INDUSTRIES - GLOBAL PATCH (v23)
// Ландшафт, Idle, Шрекич (урон снижен) и Щупальца
// =======================================================
(function() {
  console.log("🍌 [PATCH] Применение финальных патчей...");

  // 1. ДЕНЬ И НОЧЬ
  if (typeof TimeOfDay !== 'undefined') {
    TimeOfDay.speed = 1 / 120; 
  }

  // 2. ЛАНДШАФТ (Холмы)
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
        hill.position.set(x, 0, z);
        hill.scale.y = h / r;
        scene.add(hill);
      }
    }
  }, 2000);

  // 3. IDLE-АНИМАЦИЯ (Торс, руки, голова)
  if (typeof updatePlayerChoreographyAndCamera === 'function') {
    const _origChoreo = updatePlayerChoreographyAndCamera;
    window.updatePlayerChoreographyAndCamera = function(dt, now) {
      _origChoreo.apply(this, arguments);
      if (!player.isDead && player.attackTimer <= 0 && !player.isFlying && !player.isDodging && !player.isSliding && !player.isWallRunning) {
        const ud = player.mesh ? player.mesh.userData : null;
        if (ud && ud.spine) {
          ud.spine.rotation.x = Math.sin(now * 0.003) * 0.04;
          ud.spine.position.y = Math.sin(now * 0.003) * 0.02;
          if (ud.armL && ud.armL.shoulder) ud.armL.shoulder.rotation.x = Math.sin(now * 0.002) * 0.1;
          if (ud.armR && ud.armR.shoulder) ud.armR.shoulder.rotation.x = Math.sin(now * 0.002 + 1.5) * 0.1;
          if (ud.neck) ud.neck.rotation.y = Math.sin(now * 0.001) * 0.05;
        }
      }
    };
  }

  // 4. МЕНЮ ПАУЗЫ (Esc) И ДРОН (B)
  window.addEventListener('keydown', e => {
    if (e.code === 'Escape' && typeof gameStarted !== 'undefined' && gameStarted) {
      document.getElementById('start-screen').style.display = 'flex';
      try { document.exitPointerLock(); } catch(err) {}
    }
    if (e.code === 'KeyB' && typeof player !== 'undefined' && player.character === 'banana') {
      if (typeof Companion !== 'undefined' && Companion.group) {
        Companion.group.visible = !Companion.group.visible;
        if (!Companion.group.visible) {
          player.companionShield = 0; player.companionRegen = 0; player.companionDmg = 0;
          Companion.buffCd = 99999;
          if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), 'ДРОН ОТКЛЮЧЕН', '#ff0000');
        } else {
          Companion.buffCd = 5;
          if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), 'ДРОН ВКЛЮЧЕН', '#00ff66');
        }
      }
    }
  });

  // 5. ШРЕКИЧ АТАКУЕТ ИГРОКОВ (УРОН СНИЖЕН ДО 5)
  if (typeof Companion !== 'undefined') {
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
        if (window.__MP && window.__MP.room) {
          // УРОН СНИЖЕН С 34 ДО 5
          window.__MP.room.send('pvp', { targetId: e.id, damage: 5 });
        }
        if (typeof SoundFX !== 'undefined') SoundFX.whip();
        const p = ParticlePool.get(0xadff2f);
        p.position.copy(this.group.position);
        p.scale.setScalar(1.2);
        scene.add(p);
        ParticlePool.active.push({ mesh: p, vel: new THREE.Vector3(0,0,0), life: 0.2 });
        return;
      }
      if (origShoot) origShoot.apply(this, arguments);
    };
  }

  // 6. ЩУПАЛЬЦА (4 КОСТЮМ) АТАКУЮТ ИГРОКОВ
  if (typeof performPrimaryAttack === 'function') {
    const origPrimary = window.performPrimaryAttack;
    window.performPrimaryAttack = function() {
      origPrimary.apply(this, arguments);
      
      if (player.suitIdx === 4 && !PEPPER_MODE && !CARROT_MODE && window.__MP_MODE && window.__MP.remotes.size > 0) {
        let bestId = null, bestD = 22; 
        window.__MP.remotes.forEach((r, id) => {
          const d = r.group.position.distanceTo(player.pos);
          if (d < bestD) { bestD = d; bestId = id; }
        });
        
        if (bestId && bestD > 7.5) {
          window.__MP.room.send('pvp', { targetId: bestId, damage: 34 });
          if (typeof OrganicTendril3D !== 'undefined' && typeof activeTendrils !== 'undefined') {
            activeTendrils.push(new OrganicTendril3D(scene, player.pos.clone().add(new THREE.Vector3(0,2,0)), window.__MP.remotes.get(bestId).group.position.clone().add(new THREE.Vector3(0,2,0)), 0xff0055, .34, .32));
          }
        }
      }
    };
  }

  // 7. ТАНКИ БОЛЬШЕ
  if (typeof spawnCitrusAPC === 'function') {
    const _origAPC = spawnCitrusAPC;
    window.spawnCitrusAPC = function(x, z) {
      _origAPC(x, z);
      const t = enemies[enemies.length - 1];
      if (t && t.type === 'tank') {
        t.group.scale.set(1.8, 1.8, 1.8);
        t.radius = 6.8;
      }
    };
  }

  // 8. ФИКСЫ СПОСОБНОСТЕЙ (ЕГОРБАНАН)
  const origTriggerF = window.triggerUniqueAbilityF;
  window.triggerUniqueAbilityF = function() {
    if (player.character === 'banana') {
      if (player.suitIdx === 0) {
        if (player.uniqueCd <= 0) {
          player.uniqueCd = 5; 
          if (typeof alliedTurrets !== 'undefined') {
            for(let i=0; i<2; i++) {
              const g=new THREE.Group(); g.position.copy(player.pos).add(new THREE.Vector3((i-0.5)*4, 0, 0));
              const b=new THREE.Mesh(new THREE.CylinderGeometry(.9,1.1,2,6),createPrototypeShader(0x3f4650,0x111111,0));
              b.position.y=1; g.add(b); scene.add(g);
              alliedTurrets.push({group:g,life:15,cd:0});
            }
          }
        }
        return;
      }
      if (player.suitIdx === 1) {
        if (player.uniqueCd <= 0) {
          player.uniqueCd = 4;
          SoundFX.whip();
          for(let k=-4;k<=4;k++){
            const a=player.camYaw+k*.15; const d=new THREE.Vector3(-Math.sin(a),0,-Math.cos(a));
            const p=new THREE.Mesh(new THREE.SphereGeometry(0.4,6,6), new THREE.MeshBasicMaterial({color:0xf9ca24}));
            p.position.copy(player.pos).add(new THREE.Vector3(0,2,0)); scene.add(p);
            projectiles.push({mesh:p,vel:new THREE.Vector3(d.x*50,0,d.z*50),life:1.5,fromPlayer:true,dmg:60,radius:2});
          }
        }
        return;
      }
      if (player.suitIdx === 2) {
        if (player.uniqueCd <= 0 && !player.durianRam) {
          SoundFX.devastator(); player.facingYaw = player.camYaw;
          const f = new THREE.Vector3(-Math.sin(player.facingYaw),0,-Math.cos(player.facingYaw));
          player.durianRam = { timer: 0, speed: 60, dir: f, hitSet: new Set(), maxDur: 5.0 }; 
          player.uniqueCd = 8; 
          if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), 'ТАРАН!', '#78bd37');
        }
        return;
      }
      if (player.suitIdx === 3) {
        player.activeModeF = !player.activeModeF;
        if (player.mesh && player.mesh.userData.limeShield) player.mesh.userData.limeShield.visible = player.activeModeF;
        if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), player.activeModeF ? 'ЩИТ ВКЛ' : 'ЩИТ ВЫКЛ', '#00f2fe');
        return;
      }
    }
    if (PEPPER_MODE && player.pepperTBeamCd <= 0) {
      releasePepperTBeam();
      if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'hell_explosion', radius: 40, damage: 150 });
      return;
    }
    if (CARROT_MODE && CARROT_FORM === 2 && player.carrotStamina >= 60) {
      carrotEarthquake();
      if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'earthquake', radius: 40, damage: 100 });
      return;
    }
    if (LEMON_MODE && player.lemonUltCd <= 0) {
      lemonUltimate();
      if (window.__MP && window.__MP.room) window.__MP.room.send('pvp_ability', { type: 'ult_lemon', radius: 40, damage: 120 });
      return;
    }
    if (origTriggerF) origTriggerF.apply(this, arguments);
  };

  // 9. ЗАМЕНА ПОГЛОЩЕНИЯ (C) НА ЗАМОРОЗКУ
  const origConsume = window.performConsume;
  window.performConsume = function() {
    if (player.character === 'banana' && player.suitIdx === 4) {
      if (window.__MP && window.__MP.room) {
        window.__MP.room.send('pvp_ability', { type: 'freeze', radius: 8, damage: 20 });
        if (typeof spawnComicPop === 'function') spawnComicPop(player.pos.clone().add(new THREE.Vector3(0,3,0)), 'ЗАМОРОЗКА!', '#00f2fe');
        if (typeof window.spawnEffectVisual === 'function') window.spawnEffectVisual('freeze', player.pos.x, player.pos.y, player.pos.z, 0);
      }
      return;
    }
    if (origConsume) origConsume.apply(this, arguments);
  };

  // 10. ОПУТЫВАНИЕ СБИВАЕТ ЛЕТАЮЩИХ
  const origRootBind = window.carrotRootBind;
  window.carrotRootBind = function() {
    if (origRootBind) origRootBind.apply(this, arguments);
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.flying && e.group.position.distanceTo(player.pos) < 25) {
        e.flying = false;
        e.group.position.y = 0;
        e.vel.y = 0;
        if (typeof spawnComicPop === 'function') spawnComicPop(e.group.position.clone().add(new THREE.Vector3(0,2,0)), 'СБИТ!', '#2ecc71');
      }
    }
  };

  // 11. РАЗНОЕ HP ДЛЯ ФОРМ МОРКОВИ
  const origToggleCarrot = window.toggleCarrotForm;
  window.toggleCarrotForm = function() {
    if (origToggleCarrot) origToggleCarrot.apply(this, arguments);
    if (player.character === 'carrot') {
      player.maxHp = (CARROT_FORM === 2) ? 800 : 480;
      player.hp = player.maxHp;
      if (typeof updateHUD === 'function') updateHUD();
    }
  };

  // 12. ЯРОСТЬ ПЕРЕЦА
  if (typeof addRage === 'function') {
    const origAddRage = window.addRage;
    window.addRage = function(amount) {
      if (PEPPER_MODE) {
        if (typeof addSpiciness === 'function') addSpiciness(amount);
        return;
      }
      if (origAddRage) origAddRage.apply(this, arguments);
    };
  }

  console.log("🍌 [PATCH] Все системы переопределены! Шрекич ослаблен.");
})();