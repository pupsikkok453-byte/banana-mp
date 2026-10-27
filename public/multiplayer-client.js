/* Banana Industries — Multiplayer Client v26 (PvP Balance Fix) */
(function(){
'use strict';

if (typeof player === 'undefined') { console.error('[MP] player не определён'); return; }
if (typeof scene === 'undefined')  { console.error('[MP] scene не определён'); return; }
if (typeof THREE === 'undefined')  { console.error('[MP] THREE не загружен'); return; }
if (typeof enemies === 'undefined'){ console.error('[MP] enemies не определён'); return; }
if (typeof buildings === 'undefined') { console.warn('[MP] buildings не определён'); }

var BOSS_TYPES = { titan: 1, lemon: 1, valkyrie: 1, necromancer: 1 };
var CDN_LIST = [
  'https://unpkg.com/colyseus.js@^0.14.0/dist/colyseus.js',
  'https://cdn.jsdelivr.net/npm/colyseus.js@^0.14.0/dist/colyseus.js',
  '/colyseus.js'
];

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════
var MP = {
  client: null, room: null,
  remotes: new Map(),
  serverEnemies: new Map(),
  serverSpiders: new Map(),
  lastSend: 0,
  _playersWired: false, _enemiesWired: false, _spidersWired: false, _msgHooksWired: false,
  _lastCharState: { suit: -1, char: '', pepperEvolved: false, carrotForm: 1, potatoForm: 1 },
  _myServerHp: 460, _myServerMaxHp: 460, _myServerDead: false,
  _myRootedUntil: 0, _rootedViz: null, _buildingsSent: false,
  _frozenViz: null, _myFrozenUntil: 0
};
window.__MP = MP;
window.__MP_MODE = false;

// ═══════════════════════════════════════════════════════════════════════════
// HIT BUFFER
// ═══════════════════════════════════════════════════════════════════════════
var hitBuffer = new Map();
var hitBufferTimer = null;
function bufferHit(id, dmg, crit){
  if (!id) return;
  var existing = hitBuffer.get(id);
  if (existing) { existing.dmg += dmg; existing.crit = existing.crit || !!crit; }
  else hitBuffer.set(id, { id: id, dmg: dmg, crit: !!crit });
  if (!hitBufferTimer) hitBufferTimer = setTimeout(flushHits, 40);
}
function flushHits(){
  hitBufferTimer = null;
  if (hitBuffer.size === 0) return;
  if (!MP.room || !window.__MP_MODE) { hitBuffer.clear(); return; }
  var arr = Array.from(hitBuffer.values());
  hitBuffer.clear();
  try { MP.room.send('hit_batch', { hits: arr }); } catch(e){}
}

// ═══════════════════════════════════════════════════════════════════════════
// EXEC-PROMPT FIX
// ═══════════════════════════════════════════════════════════════════════════
if (!document.getElementById('exec-prompt')) {
  var _ep = document.createElement('div');
  _ep.id = 'exec-prompt';
  _ep.style.cssText = 'position:fixed;top:58%;left:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:30;display:none;background:rgba(255,0,85,.92);color:#fff;border:3px solid #000;outline:2px solid #fff200;padding:8px 18px;font-family:Bangers,Impact,sans-serif;font-size:24px;letter-spacing:1.5px;text-shadow:2px 2px 0 #000;';
  _ep.textContent = '[X] КАЗНЬ';
  document.body.appendChild(_ep);
  console.log('[MP] ✓ exec-prompt создан');
}

// ═══════════════════════════════════════════════════════════════════════════
// __MP_HIT
// ═══════════════════════════════════════════════════════════════════════════
var _origMpHit = window.__mpHit;
window.__mpHit = function(id, dmg, crit, popText){
  if (!MP.room || !window.__MP_MODE) {
    if (typeof _origMpHit === 'function') { try { return _origMpHit(id, dmg, crit, popText); } catch(e){} }
    return;
  }
  if (player && player.character === 'lemon') dmg = dmg * 1.5;
  bufferHit(id, dmg, crit);
};

// ═══════════════════════════════════════════════════════════════════════════
// SEND PVP ABILITY
// ═══════════════════════════════════════════════════════════════════════════
function sendPvPAbility(type, radius, dmg){
  if (!MP.room || !window.__MP_MODE || !player || !player.pos) return;
  // Lemon passive +50% only to enemies — но для PvP нет, чтобы не баффать
  // (урон в PvP идёт по базовым значениям PVP_ABILITIES)
  try {
    MP.room.send('pvp_ability', {
      type: type,
      radius: radius || 0,
      damage: dmg || 0,
      x: player.pos.x, y: player.pos.y, z: player.pos.z
    });
  } catch(e){}
}

// ═══════════════════════════════════════════════════════════════════════════
// EFFECT VISUAL
// ═══════════════════════════════════════════════════════════════════════════
function spawnEffectVisual(type, x, y, z, radius){
  try {
    var pos = new THREE.Vector3(x || 0, y || 0, z || 0);
    var r = Number(radius) || 5;

    function ring(colorHex, maxR, yOffset){
      var rg = new THREE.Mesh(
        new THREE.RingGeometry(1, maxR * 0.9, 24),
        new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
      );
      rg.rotation.x = -Math.PI / 2;
      rg.position.set(pos.x, (yOffset || 0.2) + pos.y, pos.z);
      scene.add(rg);
      var t = 0;
      (function anim(){
        t += 0.04;
        rg.scale.setScalar(1 + t * 2.8);
        rg.material.opacity = Math.max(0, 0.85 * (1 - t));
        if (t < 1.5) requestAnimationFrame(anim);
        else { scene.remove(rg); rg.geometry.dispose(); rg.material.dispose(); }
      })();
    }
    function pillar(colorHex, height){
      var p = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 3, height || 25, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.7, wireframe: true, side: THREE.DoubleSide })
      );
      p.position.set(pos.x, pos.y + (height || 25) / 2, pos.z);
      scene.add(p);
      var t = 0;
      (function anim(){
        t += 0.03;
        p.material.opacity = Math.max(0, 0.7 * (1 - t / 1.2));
        p.rotation.y += 0.08;
        if (t < 1.2) requestAnimationFrame(anim);
        else { scene.remove(p); p.geometry.dispose(); p.material.dispose(); }
      })();
    }
    function burst(colorHex, count){
      if (typeof spawnParticles === 'function') spawnParticles(pos.clone().add(new THREE.Vector3(0, 2, 0)), colorHex, count || 15);
    }

    var effectMap = {
      // ═══ BANANA ═══
      devastator: function(){ ring(0xff0055, r || 20, 0.2); ring(0x00f2fe, r * 0.7, 0.25); burst(0xff0055, 20); },
      rocket: function(){ ring(0xff0055, r || 8, 0.2); burst(0xff7f00, 15); },
      freeze: function(){
        for (let i = 0; i < 3; i++) {
          var ice = new THREE.Mesh(
            new THREE.BoxGeometry(3.5 - i * 0.8, 4.5 - i * 0.8, 3.5 - i * 0.8),
            new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.35 + i * 0.15, wireframe: true })
          );
          ice.position.set(pos.x, pos.y + 2, pos.z);
          scene.add(ice);
          setTimeout(function(){ scene.remove(ice); ice.geometry.dispose(); ice.material.dispose(); }, 3000);
        }
        burst(0x00f2fe, 30);
      },
      nano_ult: function(){
        ring(0x00f2fe, r || 25, 0.2);
        ring(0xff0055, (r || 25) * 0.8, 0.3);
        ring(0xffffff, (r || 25) * 0.6, 0.4);
        pillar(0x00f2fe, 45);
        burst(0x00f2fe, 50);
      },
      consume_heal: function(){ ring(0xff0055, r || 12, 0.2); burst(0xff0055, 20); },
      durian_ram: function(){ ring(0x78bd37, r || 10, 0.2); burst(0x78bd37, 20); },

      // ═══ PEPPER ═══
      fire_fist: function(){ burst(0xff5500, 8); },
      fire_beam: function(){
        var beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.8, 0.8, 30, 8),
          new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.85 })
        );
        beam.rotation.z = Math.PI / 2;
        beam.position.set(pos.x + 15, pos.y + 2, pos.z);
        scene.add(beam);
        setTimeout(function(){ scene.remove(beam); beam.geometry.dispose(); beam.material.dispose(); }, 500);
        burst(0xff4400, 25);
      },
      hell_explosion: function(){
        ring(0xff2200, r, 0.2);
        ring(0xffaa00, r * 0.8, 0.3);
        ring(0xfff200, r * 0.5, 0.4);
        burst(0xff4400, 30);
      },
      pepper_dash: function(){ ring(0xff4400, r || 6, 0.2); burst(0xff5500, 10); },
      pepper_dive: function(){ ring(0xff2200, r || 15, 0.2); burst(0xff2200, 25); },
      pepper_evolve: function(){ pillar(0xff2200, 20); burst(0xff2200, 25); },

      // ═══ CARROT ═══
      root_bind: function(){ ring(0x2ecc71, r || 18, 0.2); burst(0x2ecc71, 20); },
      vine_harpoon: function(){ burst(0x2ecc71, 15); },
      earthquake: function(){
        for (var w = 0; w < 4; w++) {
          (function(wIdx){
            setTimeout(function(){ ring(0xff5500, 10 + wIdx * 8, 0.15 + wIdx * 0.1); }, wIdx * 120);
          })(w);
        }
        burst(0xff5500, 25);
      },
      drill: function(){ ring(0xff5500, r || 10, 0.2); burst(0xff5500, 20); },
      carrot_form: function(){ pillar(0xff5500, 22); ring(0xff5500, 18, 0.2); burst(0xff5500, 25); },
      carrot_ground_slam: function(){ ring(0x2ecc71, r || 15, 0.2); burst(0x2ecc71, 20); },

      // ═══ LEMON ═══
      lemon_plasma: function(){ burst(0xffee00, 6); },
      repulse: function(){ ring(0x44ffaa, r || 8, 0.2); burst(0x44ffaa, 18); },
      acid_rain: function(){ ring(0x88ff00, r || 6, 0.15); burst(0x88ff00, 15); },
      lemon_salvo: function(){
        ring(0xffee00, r || 25, 0.2);
        ring(0xff8800, (r || 25) * 0.7, 0.3);
        burst(0xff8800, 25);
      },
      lemon_ground_slam: function(){ ring(0x88ff00, r || 12, 0.2); burst(0x88ff00, 20); },
      lemon_laser: function(){ burst(0x44ffaa, 8); },
      ult_lemon: function(){
        pillar(0xffee00, 40);
        ring(0xffee00, r, 0.15);
        burst(0xffee00, 30);
      },
      kamikaze_spider: function(){ ring(0xff8800, 8, 0.2); burst(0xff8800, 15); },
      spider_bite: function(){ burst(0xffee00, 6); },
      summon: function(){ burst(0xff8800, 12); },

      // ═══ POTATO ═══
      potato_slam: function(){
        ring(0x8B4513, r || 10, 0.2);
        ring(0xd4a017, (r || 10) * 0.7, 0.3);
        burst(0x8B4513, 25);
      },
      potato_heal: function(){ ring(0x2ecc71, 8, 0.2); burst(0x2ecc71, 20); },
      potato_ram: function(){ ring(0x8B4513, r || 8, 0.2); burst(0x8B4513, 15); },
      tomato_nova: function(){
        ring(0xff0055, r || 10, 0.2);
        ring(0xff2200, (r || 10) * 0.7, 0.3);
        burst(0xff2200, 30);
      },
      tomato_rage: function(){ pillar(0xff2200, 20); burst(0xff4400, 20); },
      tomato_sauce: function(){ ring(0xcc0000, r || 12, 0.2); burst(0xcc0000, 15); },
      potato_electric_slam: function(){
        ring(0xffaa00, r || 12, 0.2);
        ring(0xfff200, (r || 12) * 0.6, 0.3);
        burst(0xffaa00, 25);
      },

      // ═══ BOSS ═══
      titan_hammer: function(){ ring(0xff7f00, r || 6, 0.2); burst(0xff7f00, 20); },
      lemon_lightning: function(){
        var bolt = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4, 0.6, 25, 6),
          new THREE.MeshBasicMaterial({ color: 0xfff200, transparent: true, opacity: 0.95 })
        );
        bolt.position.set(pos.x, 12, pos.z);
        scene.add(bolt);
        setTimeout(function(){ scene.remove(bolt); bolt.geometry.dispose(); bolt.material.dispose(); }, 300);
      },
      valkyrie_dive: function(){ ring(0xff7f00, r || 5, 0.2); burst(0xffcc00, 15); },
      necromancer_summon: function(){ ring(0xaa44ff, r || 8, 0.2); burst(0xaa44ff, 20); },
      kamikaze: function(){ ring(0xff4400, r || 6, 0.2); burst(0xff4400, 20); }
    };

    if (effectMap[type]) effectMap[type]();
    else if (typeof spawnParticles === 'function') spawnParticles(pos.clone().add(new THREE.Vector3(0, 2, 0)), 0xffffff, 8);
  } catch(e){}
}

// ═══════════════════════════════════════════════════════════════════════════
// waitFor helper
// ═══════════════════════════════════════════════════════════════════════════
function waitFor(cond, cb, maxMs) {
  var t0 = performance.now();
  var done = false;
  (function tick(){
    if (done) return;
    var ok = false;
    try { ok = cond(); } catch(e){ ok = false; }
    if (ok) { done = true; try { cb(); } catch(e){ console.error('[MP waitFor]', e); } return; }
    if (performance.now() - t0 >= (maxMs || 15000)) return;
    requestAnimationFrame(tick);
  })();
}

// ═══════════════════════════════════════════════════════════════════════════
// HUK
// ═══════════════════════════════════════════════════════════════════════════
function hookAbility(fnName, abilityType) {
  var orig = window[fnName];
  if (typeof orig !== 'function') return false;
  if (orig._mpHookedV26) return true;
  var wrapped = function(){
    var ret = orig.apply(this, arguments);
    try {
      if (MP.room && window.__MP_MODE && player && player.pos && abilityType) {
        sendPvPAbility(abilityType);
      }
    } catch(e){}
    return ret;
  };
  wrapped._mpHookedV26 = true;
  window[fnName] = wrapped;
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// ХУКИ
// ═══════════════════════════════════════════════════════════════════════════
waitFor(function(){ return true; }, function(){
  // ═══ BANANA ═══
  hookAbility('unleashDevastatorExplosion', 'devastator');
  hookAbility('fireRocket', 'rocket');

  // ═══ PEPPER ═══
  hookAbility('pepperFireFist', 'fire_fist');
  hookAbility('pepperFireBeam', 'fire_beam');
  hookAbility('pepperExplosion', 'devastator');
  hookAbility('pepperDash', 'pepper_dash');
  hookAbility('pepperFastFireDash', 'pepper_dash');
  hookAbility('pepperDiveAttack', 'pepper_dive');

  // ═══ CARROT ═══
  hookAbility('carrotRootBind', 'root_bind');
  hookAbility('carrotVineHarpoon', 'vine_harpoon');
  hookAbility('carrotEarthquake', 'earthquake');
  hookAbility('carrotGiantDrillDash', 'drill');

  // ═══ LEMON ═══
  hookAbility('lemonRepulse', 'repulse');
  hookAbility('lemonAcidRain', 'acid_rain');
  hookAbility('lemonSalvo', 'lemon_salvo');
  hookAbility('lemonGroundSlam', 'lemon_ground_slam');
  hookAbility('lemonUltimate', 'ult_lemon');

  console.log('[MP] ✓ Базовые хуки установлены (v26)');
}, 5000);

// ═══════════════════════════════════════════════════════════════════════════
// pepper_evolve
// ═══════════════════════════════════════════════════════════════════════════
waitFor(function(){ return typeof window.togglePepperEvolution === 'function'; }, function(){
  var _origEvo = window.togglePepperEvolution;
  if (_origEvo._mpHookedV26) return;
  window.togglePepperEvolution = function(){
    if (!MP.room || !window.__MP_MODE) return _origEvo.apply(this, arguments);
    var wasEvolved = !!(player && player.pepperEvolved);
    var ret = _origEvo.apply(this, arguments);
    try {
      if (player && player.pepperEvolved && !wasEvolved) {
        sendPvPAbility('pepper_evolve');
      }
    } catch(e){}
    return ret;
  };
  window.togglePepperEvolution._mpHookedV26 = true;
  console.log('[MP] ✓ togglePepperEvolution захукан');
}, 5000);

// ═══════════════════════════════════════════════════════════════════════════
// carrot_form
// ═══════════════════════════════════════════════════════════════════════════
waitFor(function(){ return typeof window.toggleCarrotForm === 'function'; }, function(){
  var _origForm = window.toggleCarrotForm;
  if (_origForm._mpHookedV26) return;
  window.toggleCarrotForm = function(){
    if (!MP.room || !window.__MP_MODE) return _origForm.apply(this, arguments);
    var beforeForm = (typeof window.CARROT_FORM !== 'undefined') ? window.CARROT_FORM : 1;
    var ret = _origForm.apply(this, arguments);
    try {
      var afterForm = (typeof window.CARROT_FORM !== 'undefined') ? window.CARROT_FORM : 1;
      if (beforeForm !== afterForm) {
        sendPvPAbility('carrot_form');
      }
    } catch(e){}
    return ret;
  };
  window.toggleCarrotForm._mpHookedV26 = true;
  console.log('[MP] ✓ toggleCarrotForm захукан');
}, 5000);

// ═══════════════════════════════════════════════════════════════════════════
// freeze (крио-куб) — по keydown C
// ═══════════════════════════════════════════════════════════════════════════
window.addEventListener('keydown', function(e){
  if (e.code !== 'KeyC') return;
  if (!MP.room || !window.__MP_MODE) return;
  if (!player || player.character !== 'banana') return;
  if (window.PEPPER_MODE || window.CARROT_MODE || window.LEMON_MODE || window.__POTATO_MODE) return;
  if (player.isDead) return;
  var before = player._cryoCd || 0;
  setTimeout(function(){
    var after = player._cryoCd || 0;
    if (after > before + 0.1) {
      try { sendPvPAbility('freeze'); } catch(err){}
    }
  }, 15);
}, true);

// ═══════════════════════════════════════════════════════════════════════════
// consume_heal
// ═══════════════════════════════════════════════════════════════════════════
waitFor(function(){ return typeof window.performConsume === 'function'; }, function(){
  var _origConsume = window.performConsume;
  if (_origConsume._mpHookedV26) return;
  window.performConsume = function(){
    var ret = _origConsume.apply(this, arguments);
    try {
      if (MP.room && window.__MP_MODE && player && player.pos) {
        if (player.consumeCd > 0) sendPvPAbility('consume_heal');
      }
    } catch(e){}
    return ret;
  };
  window.performConsume._mpHookedV26 = true;
  console.log('[MP] ✓ performConsume захукан');
}, 5000);

// ═══════════════════════════════════════════════════════════════════════════
// SPIDERS
// ═══════════════════════════════════════════════════════════════════════════
waitFor(function(){ return typeof window.lemonKamikaze === 'function'; }, function(){
  var _k = window.lemonKamikaze;
  if (_k._mpHookedV26) return;
  window.lemonKamikaze = function(){
    if (MP.room && window.__MP_MODE) {
      if (player && player.lemonKamikazeCd > 0) return;
      if (player) player.lemonKamikazeCd = 5;
      // Только серверное сообщение — взрыв у цели делает сервер
      try { MP.room.send('kamikaze_spiders', {}); } catch(e){}
      return;
    }
    return _k.apply(this, arguments);
  };
  window.lemonKamikaze._mpHookedV26 = true;
  console.log('[MP] ✓ lemonKamikaze → server');
}, 5000);

waitFor(function(){ return typeof window.lemonSummonSpiders === 'function'; }, function(){
  var _s = window.lemonSummonSpiders;
  if (_s._mpHookedV26) return;
  window.lemonSummonSpiders = function(){
    if (MP.room && window.__MP_MODE) {
      if (player && player.lemonSummonCd > 0) return;
      if (player) player.lemonSummonCd = 10;
      try { MP.room.send('spawn_spiders', { count: 2 }); } catch(e){}
      return;
    }
    return _s.apply(this, arguments);
  };
  window.lemonSummonSpiders._mpHookedV26 = true;
  console.log('[MP] ✓ lemonSummonSpiders → server');
}, 5000);

// ═══════════════════════════════════════════════════════════════════════════
// LEMON PLASMA SHOT → pvp_ability lemon_plasma
// ═══════════════════════════════════════════════════════════════════════════
waitFor(function(){ return typeof window.lemonPlasmaShot === 'function'; }, function(){
  if (window.__MP_lemonPlasma_hooked) return;
  window.__MP_lemonPlasma_hooked = true;
  var _origShot = window.lemonPlasmaShot;
  window.lemonPlasmaShot = function(){
    var ret = _origShot.apply(this, arguments);
    tryPvP();
    try {
      if (MP.room && window.__MP_MODE) {
        MP.room.send('attack', {});
        sendPvPAbility('lemon_plasma');   // ★ снаряд летит в цель
      }
    } catch(e){}
    return ret;
  };
  console.log('[MP] ✓ lemonPlasmaShot → lemon_plasma');
}, 5000);

// ═══════════════════════════════════════════════════════════════════════════
// LEMON LASER → pvp_beam (мультицель, конус)
// ═══════════════════════════════════════════════════════════════════════════
setInterval(function(){
  if (!MP.room || !window.__MP_MODE) return;
  if (!player || player.character !== 'lemon') return;
  if (!player.lemonLaserActive) return;
  if (MP.remotes.size === 0) return;
  try {
    var fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw)).normalize();
    var hits = [];
    MP.remotes.forEach(function(r, id){
      try {
        var to = r.group.position.clone().sub(player.pos);
        var dist = to.length();
        if (dist > 35) return;
        var dot = to.clone().normalize().dot(fwd);
        if (dot < 0.85) return;
        hits.push(id);
      } catch(e){}
    });
    if (hits.length > 0) MP.room.send('pvp_beam', { targetIds: hits });
  } catch(e){}
}, 180);

// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ POTATO POLLING — заменяет сломанные хуки для картошки
// (game-patch перезаписывает performDevastator/triggerUniqueAbilityF
//  без делегации → хуки не срабатывают. Отслеживаем КД-поля.)
// ═══════════════════════════════════════════════════════════════════════════
var _lastPotatoSlam  = 0;
var _lastPotatoNova  = 0;
var _lastPotatoRam   = 0;
var _lastPotatoSauce = 0;
var _lastPotatoHeal  = 0;
var _lastPotatoRage  = 0;

setInterval(function(){
  if (!window.__POTATO_MODE || !MP.room || !window.__MP_MODE || !player || player.isDead) {
    _lastPotatoSlam = _lastPotatoNova = _lastPotatoRam = _lastPotatoSauce = 0;
    _lastPotatoHeal = _lastPotatoRage = 0;
    return;
  }

  var curSlam  = player._potatoSlamCd  || 0;
  var curNova  = player._potatoNovaCd  || 0;
  var curRam   = player._potatoRamCd   || 0;
  var curSauce = player._potatoSauceCd || 0;
  var curHeal  = player._potatoHealCd  || 0;
  var curRage  = player._potatoRageCd  || 0;

  // КД вырос на >0.5с → способность только что сработала
  if (curSlam > _lastPotatoSlam + 0.5) {
    try { sendPvPAbility('potato_slam'); } catch(e){}
    console.log('[MP] ✓ potato_slam sent');
  }
  if (curNova > _lastPotatoNova + 0.5) {
    try { sendPvPAbility('tomato_nova'); } catch(e){}
    console.log('[MP] ✓ tomato_nova sent');
  }
  if (curRam > _lastPotatoRam + 0.5) {
    try { sendPvPAbility('potato_ram'); } catch(e){}
    console.log('[MP] ✓ potato_ram sent');
  }
  if (curSauce > _lastPotatoSauce + 0.5) {
    try { sendPvPAbility('tomato_sauce'); } catch(e){}
    console.log('[MP] ✓ tomato_sauce sent');
  }
  if (curHeal > _lastPotatoHeal + 0.5) {
    try { sendPvPAbility('potato_heal'); } catch(e){}
    console.log('[MP] ✓ potato_heal sent');
  }
  if (curRage > _lastPotatoRage + 0.5) {
    try { sendPvPAbility('tomato_rage'); } catch(e){}
    console.log('[MP] ✓ tomato_rage sent');
  }

  _lastPotatoSlam  = curSlam;
  _lastPotatoNova  = curNova;
  _lastPotatoRam   = curRam;
  _lastPotatoSauce = curSauce;
  _lastPotatoHeal  = curHeal;
  _lastPotatoRage  = curRage;
}, 50);

// ═══════════════════════════════════════════════════════════════════════════
// UI PANEL
// ═══════════════════════════════════════════════════════════════════════════
var panel = document.createElement('div');
panel.style.cssText = 'position:fixed;right:16px;bottom:96px;z-index:150;width:280px;background:rgba(4,20,10,.96);border:2px solid #000;outline:2px solid #00ff66;border-radius:6px;padding:10px 12px;font:700 11px/1.4 Rubik,sans-serif;color:#eaffea;box-shadow:0 0 25px rgba(0,255,102,.35),6px 6px 0 #000;display:none';
panel.innerHTML = '<div style="color:#adff2f;font-size:12px;border-bottom:1px solid #00ff66;padding-bottom:4px;margin-bottom:8px;display:flex;justify-content:space-between"><span>🌐 МУЛЬТИПЛЕЕР</span><span id="mp-status" style="color:#f9ca24">OFFLINE</span></div>'
  + '<label style="display:block;margin-bottom:4px;color:#7bed9f">Имя</label>'
  + '<input id="mp-name" maxlength="16" value="Банан-' + Math.floor(Math.random() * 90 + 10) + '" style="width:100%;padding:4px 6px;background:#0a160f;border:1px solid #2ecc71;color:#fff;margin-bottom:6px;font:inherit">'
  + '<label style="display:block;margin-bottom:4px;color:#7bed9f">Код комнаты</label>'
  + '<input id="mp-code" maxlength="6" placeholder="XXXXX" style="width:100%;padding:4px 6px;background:#0a160f;border:1px solid #2ecc71;color:#fff;margin-bottom:8px;font:inherit;text-transform:uppercase">'
  + '<div style="display:flex;gap:6px;margin-bottom:6px">'
  +   '<button id="mp-create" style="flex:1;padding:6px;background:#f9ca24;color:#000;border:2px solid #000;cursor:pointer;font:900 11px Rubik">СОЗДАТЬ</button>'
  +   '<button id="mp-join" style="flex:1;padding:6px;background:#00d2d3;color:#000;border:2px solid #000;cursor:pointer;font:900 11px Rubik">ВОЙТИ</button>'
  + '</div>'
  + '<button id="mp-leave" style="width:100%;padding:5px;background:#eb2f06;color:#fff;border:2px solid #000;cursor:pointer;font:900 11px Rubik;margin-bottom:4px">ВЫЙТИ</button>'
  + '<button id="mp-enemies" style="width:100%;padding:5px;background:#f9ca24;color:#000;border:2px solid #000;cursor:pointer;font:900 11px Rubik">🚫 ВРАГИ OFF</button>'
  + '<div id="mp-info" style="margin-top:6px;color:#7bed9f;font-size:10px;white-space:pre-wrap;word-break:break-all"></div>';
document.body.appendChild(panel);

var btn = document.createElement('button');
btn.innerText = '🌐';
btn.style.cssText = 'position:fixed;right:16px;bottom:60px;z-index:151;width:36px;height:36px;background:#0a160f;color:#00ff66;border:2px solid #000;outline:2px solid #00ff66;cursor:pointer;font-size:17px;box-shadow:4px 4px 0 #000';
btn.onclick = function(){ panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; };
document.body.appendChild(btn);

// ═══════════════════════════════════════════════════════════════════════════
// KILL FEED
// ═══════════════════════════════════════════════════════════════════════════
var killFeed = document.createElement('div');
killFeed.style.cssText = 'position:fixed;right:16px;top:120px;z-index:145;display:flex;flex-direction:column;gap:4px;pointer-events:none;max-width:320px';
document.body.appendChild(killFeed);

function addKillFeedEntry(killer, victim, isBoss, isPvp, ability){
  var e = document.createElement('div');
  var color = isBoss ? '#ffea00' : (isPvp ? '#ff0055' : '#adff2f');
  var icon = isBoss ? '💀' : (isPvp ? '⚔️' : '🎯');
  var txt = killer + ' ➜ ' + victim;
  if (ability) txt += ' (' + ability + ')';
  e.textContent = icon + ' ' + txt;
  e.style.cssText = 'background:rgba(4,20,10,.9);border:2px solid ' + color + ';color:' + color + ';padding:4px 10px;font:900 11px Rubik,sans-serif;text-align:right;border-radius:3px;transition:opacity .4s';
  killFeed.appendChild(e);
  setTimeout(function(){
    e.style.opacity = '0';
    setTimeout(function(){ if (e.parentNode) e.parentNode.removeChild(e); }, 400);
  }, 4000);
  while (killFeed.children.length > 6) killFeed.removeChild(killFeed.firstChild);
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB TABLE
// ═══════════════════════════════════════════════════════════════════════════
var tabPanel = document.createElement('div');
tabPanel.style.cssText = 'position:fixed;inset:0;z-index:148;background:rgba(0,0,0,.7);display:none;align-items:center;justify-content:center;pointer-events:none';
tabPanel.innerHTML = '<div id="mp-tab-content" style="background:rgba(4,20,10,.96);border:3px solid #000;outline:3px solid #00ff66;padding:20px 30px;min-width:520px;box-shadow:0 0 50px rgba(0,255,102,.4),10px 10px 0 #000;font-family:Rubik,sans-serif"></div>';
document.body.appendChild(tabPanel);

function renderTabTable(){
  var c = document.getElementById('mp-tab-content');
  if (!c || !MP.room || !MP.room.state) return;
  var rows = '<div style="color:#adff2f;font-size:14px;font-weight:900;margin-bottom:10px;text-align:center;letter-spacing:1px">📊 ТАБЛИЦА ИГРОКОВ</div>';
  rows += '<div style="display:grid;grid-template-columns:1fr 80px 50px 50px;gap:6px;padding:6px 12px;color:#7bed9f;font-size:11px;font-weight:900;border-bottom:1px solid #2ecc71"><div>ИГРОК</div><div style="text-align:right">ОЧКИ</div><div style="text-align:center">УБ</div><div style="text-align:center">СМР</div></div>';
  var arr = [];
  MP.room.state.players.forEach(function(p, sid){
    arr.push({ name: p.name, score: Number(p.score) || 0, kills: Number(p.kills) || 0, deaths: Number(p.deaths) || 0, isMe: sid === MP.room.sessionId });
  });
  arr.sort(function(a, b){ return b.score - a.score; });
  arr.forEach(function(p, i){
    var me = p.isMe ? ' style="background:rgba(0,255,102,.15);outline:1px solid #00ff66"' : '';
    var rankColor = i === 0 ? '#ffea00' : (i === 1 ? '#c0c0c0' : (i === 2 ? '#cd7f32' : '#fff'));
    rows += '<div' + me + ' style="display:grid;grid-template-columns:1fr 80px 50px 50px;gap:6px;padding:6px 12px;font-size:12px;border-bottom:1px solid #1a3a1a"><div style="color:' + rankColor + ';font-weight:900">' + (i + 1) + '. ' + String(p.name).slice(0, 20) + '</div><div style="text-align:right;color:#f9ca24;font-weight:900">' + p.score + '</div><div style="text-align:center;color:#7bed9f;font-weight:900">' + p.kills + '</div><div style="text-align:center;color:#ff0055;font-weight:900">' + p.deaths + '</div></div>';
  });
  c.innerHTML = rows;
}

var _tabDown = false;
window.addEventListener('keydown', function(e){
  if (e.code === 'Tab' && window.__MP_MODE) {
    e.preventDefault();
    if (!_tabDown) { _tabDown = true; renderTabTable(); tabPanel.style.display = 'flex'; }
  }
});
window.addEventListener('keyup', function(e){
  if (e.code === 'Tab') { _tabDown = false; tabPanel.style.display = 'none'; }
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════
var $ = function(id){ return document.getElementById(id); };
function setStatus(t, bad){ var e = $('mp-status'); if (e) { e.innerText = String(t); e.style.color = bad ? '#ff0055' : '#f9ca24'; } }
function setInfo(t){ var e = $('mp-info'); if (e) e.innerText = String(t); }
function safeId(id){ return (typeof id === 'string' && id.length > 0 && id[0] !== '_'); }

function isInsideBuilding(x, z, pad){
  if (typeof buildings === 'undefined') return false;
  for (var i = 0; i < buildings.length; i++) {
    var b = buildings[i];
    if (x > b.minX - pad && x < b.maxX + pad && z > b.minZ - pad && z < b.maxZ + pad) return true;
  }
  return false;
}
function pushOutOfBuilding(x, z, pad){
  if (typeof buildings === 'undefined') return { x: x, z: z };
  for (var i = 0; i < buildings.length; i++) {
    var b = buildings[i];
    if (x > b.minX - pad && x < b.maxX + pad && z > b.minZ - pad && z < b.maxZ + pad) {
      var dx1 = Math.abs(x - (b.minX - pad));
      var dx2 = Math.abs(x - (b.maxX + pad));
      var dz1 = Math.abs(z - (b.minZ - pad));
      var dz2 = Math.abs(z - (b.maxZ + pad));
      var m = Math.min(dx1, dx2, dz1, dz2);
      if (m === dx1) x = b.minX - pad;
      else if (m === dx2) x = b.maxX + pad;
      else if (m === dz1) z = b.minZ - pad;
      else z = b.maxZ + pad;
    }
  }
  return { x: x, z: z };
}

function ensureLib(cb){
  if (window.Colyseus) return cb();
  var i = 0;
  function next(){
    if (i >= CDN_LIST.length) { setStatus('LIB FAIL', true); return; }
    var url = CDN_LIST[i++];
    var s = document.createElement('script');
    s.src = url; s.async = true;
    var d = false;
    s.onload = function(){ if (d) return; d = true; if (window.Colyseus) cb(); else next(); };
    s.onerror = function(){ if (d) return; d = true; next(); };
    setTimeout(function(){ if (!d && !window.Colyseus) { d = true; next(); } }, 6000);
    document.head.appendChild(s);
  }
  next();
}
function serverUrl(){
  if (location.protocol === 'https:') return 'wss://' + location.hostname;
  if (location.protocol === 'http:') return 'ws://' + location.hostname + ':2567';
  return 'ws://localhost:2567';
}
function randCode(){
  var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var s = '';
  for (var i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)];
  return s;
}

// ═══════════════════════════════════════════════════════════════════════════
// NAME TAG / HP BAR / MESH
// ═══════════════════════════════════════════════════════════════════════════
function makeNameTag(text){
  try {
    var cv = document.createElement('canvas');
    cv.width = 256; cv.height = 64;
    var x = cv.getContext('2d');
    x.fillStyle = 'rgba(0,0,0,.65)';
    x.fillRect(0, 0, 256, 64);
    x.strokeStyle = '#00ff66';
    x.lineWidth = 4;
    x.strokeRect(2, 2, 252, 60);
    x.fillStyle = '#eaffea';
    x.font = 'bold 30px Rubik,Arial';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(String(text || 'Игрок').slice(0, 14), 128, 34);
    var t = new THREE.CanvasTexture(cv);
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
    sp.scale.set(4, 1, 1);
    sp.position.y = 3.4;
    return sp;
  } catch(e){ return new THREE.Object3D(); }
}
function makePlayerHpBar(){
  var d = document.createElement('div');
  d.style.cssText = 'position:fixed;width:60px;height:6px;background:rgba(0,0,0,.85);border:2px solid #000;outline:1px solid #00ff66;transform:translate(-50%,-50%);display:none;z-index:17;pointer-events:none';
  d.innerHTML = '<div style="height:100%;width:100%;background:linear-gradient(90deg,#eb2f06,#2ecc71);transition:width .1s"></div>';
  document.body.appendChild(d);
  return d;
}

function createRemoteMesh(d){
  var charId = (d && typeof d.char === 'string') ? d.char : 'banana';
  var suit = (d && typeof d.suit === 'number') ? (d.suit | 0) : 0;
  var evo = !!(d && d.pepperEvolved);
  var form = (d && typeof d.carrotForm === 'number') ? (d.carrotForm | 0) : 1;
  var pForm = (d && typeof d.potatoForm === 'number') ? (d.potatoForm | 0) : 1;

  if (charId === 'potato') {
    if (typeof window.createPotatoMesh === 'function') return window.createPotatoMesh(pForm);
    var g = new THREE.Group();
    var mat = new THREE.MeshBasicMaterial({ color: pForm === 1 ? 0x8B4513 : 0xFF0000 });
    var b = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, 1.6, 8), mat); b.position.y = 1.6; g.add(b);
    var h = new THREE.Mesh(new THREE.SphereGeometry(.5, 8, 8), mat); h.position.y = 2.7; g.add(h);
    return g;
  }

  if (charId === 'pepper') {
    try {
      if (evo && typeof window.createPepperEvolvedMesh === 'function') { var m = window.createPepperEvolvedMesh(); if (m && m.isObject3D) return m; }
      if (typeof window.createPepperMesh === 'function') { var m2 = window.createPepperMesh(); if (m2 && m2.isObject3D) return m2; }
    } catch(e){}
  }
  if (charId === 'carrot') {
    try {
      if (form === 2 && typeof window.createCarrotGiantMesh === 'function') { var m = window.createCarrotGiantMesh(); if (m && m.isObject3D) return m; }
      if (typeof window.createCarrotMesh === 'function') { var m2 = window.createCarrotMesh(); if (m2 && m2.isObject3D) return m2; }
    } catch(e){}
  }
  if (charId === 'lemon') {
    try { if (typeof window.createLemonMesh === 'function') { var m = window.createLemonMesh(); if (m && m.isObject3D) return m; } } catch(e){}
  }
  try {
    if (typeof window.createArticulatedHero === 'function') {
      var m = window.createArticulatedHero(suit, false);
      if (m && m.isObject3D) return m;
    }
  } catch(e){}

  var g = new THREE.Group();
  var pal = [0xadff2f, 0xf9ca24, 0x78bd37, 0x00ff66, 0xff0055];
  var mat = new THREE.MeshBasicMaterial({ color: pal[suit % 5] });
  var b = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, 1.4, 8), mat); b.position.y = 1.6; g.add(b);
  var h = new THREE.Mesh(new THREE.SphereGeometry(.42, 10, 10), mat); h.position.y = 2.7; g.add(h);
  return g;
}
function applyScaleForChar(group, d){
  var charId = (d && d.char) || 'banana';
  var form = (d && d.carrotForm) || 1;
  if (charId === 'carrot' && form === 2) group.scale.set(2.5, 2.5, 2.5);
  else group.scale.set(1, 1, 1);
}
function createSpiderMesh(){
  var g = new THREE.Group();
  var body = new THREE.Mesh(new THREE.SphereGeometry(.4, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffee00 }));
  body.position.y = 0.5; g.add(body);
  for (var i = 0; i < 6; i++) {
    var a = (i / 6) * Math.PI * 2;
    var leg = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .7, 4), new THREE.MeshBasicMaterial({ color: 0x884400 }));
    leg.position.set(Math.cos(a) * .4, 0.3, Math.sin(a) * .4);
    leg.rotation.z = Math.PI / 2 - .35;
    leg.rotation.y = a;
    g.add(leg);
  }
  var eye = new THREE.Mesh(new THREE.SphereGeometry(.12, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
  eye.position.set(0, 0.55, 0.35); g.add(eye);
  return g;
}

// ═══════════════════════════════════════════════════════════════════════════
// REMOTES
// ═══════════════════════════════════════════════════════════════════════════
function addRemote(id, d){
  if (!safeId(id) || !d) return;
  if (MP.room && id === MP.room.sessionId) return;
  if (MP.remotes.has(id)) return;
  var g = new THREE.Group();
  var mesh;
  try { mesh = createRemoteMesh(d); } catch(e){ return; }
  g.add(mesh);
  try { g.add(makeNameTag(d.name)); } catch(e){}
  applyScaleForChar(g, d);
  g.position.set(Number(d.x) || 0, Number(d.y) || 0, Number(d.z) || 0);
  scene.add(g);
  var hpBar = makePlayerHpBar();
  MP.remotes.set(id, {
    group: g, mesh: mesh, hpBar: hpBar,
    target: new THREE.Vector3(Number(d.x) || 0, Number(d.y) || 0, Number(d.z) || 0),
    yaw: Number(d.ry) || 0, anim: 0,
    lastChar: d.char || 'banana',
    lastSuit: d.suit | 0,
    lastEvo: !!d.pepperEvolved,
    lastForm: (d.carrotForm | 0) || 1,
    lastPotatoForm: (d.potatoForm | 0) || 1
  });
}
function removeRemote(id){
  if (!safeId(id)) return;
  var r = MP.remotes.get(id);
  if (!r) return;
  try {
    if (r.mesh) r.mesh.traverse(function(o){ if (o.geometry) o.geometry.dispose(); });
    scene.remove(r.group);
    if (r.hpBar && r.hpBar.parentNode) r.hpBar.parentNode.removeChild(r.hpBar);
  } catch(e){}
  MP.remotes.delete(id);
}
function recreateRemote(id, r, p){
  try {
    if (r.mesh) r.mesh.traverse(function(o){ if (o.geometry) o.geometry.dispose(); });
    scene.remove(r.group);
  } catch(e){}
  var g = new THREE.Group();
  var mesh = createRemoteMesh(p);
  g.add(mesh);
  try { g.add(makeNameTag(p.name)); } catch(e){}
  applyScaleForChar(g, p);
  g.position.copy(r.group.position);
  g.rotation.copy(r.group.rotation);
  scene.add(g);
  r.group = g;
  r.mesh = mesh;
  r.lastChar = p.char || 'banana';
  r.lastSuit = p.suit | 0;
  r.lastEvo = !!p.pepperEvolved;
  r.lastForm = (p.carrotForm | 0) || 1;
  r.lastPotatoForm = (p.potatoForm | 0) || 1;
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVER ENEMIES
// ═══════════════════════════════════════════════════════════════════════════
function addServerEnemy(id, d){
  if (!safeId(id) || !d) return;
  if (MP.serverEnemies.has(id)) return;
  var role = String(d.type || 'mandarin');
  var isBoss = !!d.isBoss || !!BOSS_TYPES[role];
  var sx = Number(d.x) || 0, sz = Number(d.z) || 0;
  var pushed = pushOutOfBuilding(sx, sz, isBoss ? 5.0 : 2.0);
  sx = pushed.x; sz = pushed.z;

  var beforeCount = enemies.length;
  window.__MP_SPAWNING = true;
  try {
    if (isBoss) {
      var savedBoss = (typeof activeBoss !== 'undefined') ? activeBoss : null;
      try { activeBoss = null; } catch(e){}
      if (role === 'titan' && typeof window.spawnCitrusTitan === 'function') window.spawnCitrusTitan(sx, sz);
      else if (role === 'lemon' && typeof window.spawnLemonColossus === 'function') window.spawnLemonColossus(sx, sz);
      else if (role === 'valkyrie' && typeof window.spawnOrangeValkyrie === 'function') window.spawnOrangeValkyrie(sx, sz);
      else if (role === 'necromancer' && typeof window.spawnMandarinNecromancer === 'function') window.spawnMandarinNecromancer(sx, sz);
      if (enemies.length <= beforeCount) { try { activeBoss = savedBoss; } catch(e){} }
    } else if (role === 'tank' && typeof window.spawnCitrusAPC === 'function') {
      window.spawnCitrusAPC(sx, sz);
    } else if (role === 'heli' && typeof window.spawnCitrusHeli === 'function') {
      window.spawnCitrusHeli(sx, sz);
    } else if (typeof window.spawnCitrusSoldier === 'function') {
      window.spawnCitrusSoldier(sx, sz, role);
    }
  } catch(e){}
  window.__MP_SPAWNING = false;

  if (enemies.length <= beforeCount) return;
  var e = enemies[enemies.length - 1];
  e._mpId = id;
  e._isBoss = isBoss;
  e.hp = Number(d.hp) || e.hp;
  e.maxHp = Number(d.maxHp) || e.maxHp;
  e._mpTarget = new THREE.Vector3(sx, Number(d.y) || 0, sz);
  e._mpMoving = false;
  MP.serverEnemies.set(id, { local: e, target: e._mpTarget, hp: e.hp, isBoss: isBoss });

  if (isBoss) {
    try {
      var titleMap = {
        titan: '⚠️ ТИТАН ⚠️',
        lemon: '🍋 КОЛОСС 🍋',
        valkyrie: '🟠 ВАЛЬКИРИЯ 🟠',
        necromancer: '🔮 НЕКРОМАНТ 🔮'
      };
      if (typeof showBossHUD === 'function') showBossHUD(titleMap[role] || '⚠️ БОСС ⚠️', 'Синхронизирован');
    } catch(e){}
  }
}
function removeServerEnemy(id){
  if (!safeId(id)) return;
  var r = MP.serverEnemies.get(id);
  if (!r) {
    for (var i = 0; i < enemies.length; i++) {
      if (enemies[i]._mpId === id) { r = { local: enemies[i] }; break; }
    }
    if (!r) return;
  }
  var wasBoss = r.isBoss || (r.local && r.local._isBoss);
  try {
    var e = r.local;
    if (e.group) {
      e.group.traverse(function(o){ if (o.geometry) o.geometry.dispose(); });
      scene.remove(e.group);
    }
    if (typeof enemyHpBars !== 'undefined' && enemyHpBars.has(e)) {
      var bar = enemyHpBars.get(e);
      if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
      enemyHpBars.delete(e);
    }
    var idx = enemies.indexOf(e);
    if (idx >= 0) enemies.splice(idx, 1);
  } catch(err){}
  if (wasBoss) {
    try { activeBoss = null; } catch(e){}
    try { document.getElementById('boss-hud').style.display = 'none'; } catch(e){}
  }
  MP.serverEnemies.delete(id);
}

// ═══════════════════════════════════════════════════════════════════════════
// SPIDERS (сервер)
// ═══════════════════════════════════════════════════════════════════════════
function addSpider(id, d){
  if (!safeId(id) || !d) return;
  if (MP.serverSpiders.has(id)) return;
  var g = createSpiderMesh();
  g.position.set(Number(d.x) || 0, 0.1, Number(d.z) || 0);
  scene.add(g);
  MP.serverSpiders.set(id, {
    group: g,
    target: new THREE.Vector3(Number(d.x) || 0, 0.1, Number(d.z) || 0),
    attachedTo: null
  });
}
function removeSpider(id){
  if (!safeId(id)) return;
  var r = MP.serverSpiders.get(id);
  if (!r) return;
  try {
    r.group.traverse(function(o){ if (o.geometry) o.geometry.dispose(); });
    scene.remove(r.group);
  } catch(e){}
  MP.serverSpiders.delete(id);
}

// ═══════════════════════════════════════════════════════════════════════════
// ROOT/FREEZE VIZ
// ═══════════════════════════════════════════════════════════════════════════
function setRootedViz(active){
  if (active && !MP._rootedViz && player && player.pos) {
    try {
      var r = new THREE.Mesh(
        new THREE.TorusGeometry(1.9, 0.18, 6, 20),
        new THREE.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
      );
      r.rotation.x = -Math.PI / 2;
      r.position.set(player.pos.x, 0.15, player.pos.z);
      scene.add(r);
      MP._rootedViz = r;
    } catch(e){}
  } else if (!active && MP._rootedViz) {
    try { scene.remove(MP._rootedViz); MP._rootedViz.geometry.dispose(); MP._rootedViz.material.dispose(); } catch(e){}
    MP._rootedViz = null;
  }
  if (MP._rootedViz && player && player.pos) {
    MP._rootedViz.position.x = player.pos.x;
    MP._rootedViz.position.z = player.pos.z;
  }
}
function setFrozenViz(active){
  if (active && !MP._frozenViz && player && player.pos) {
    try {
      var r = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 4.5, 3.5),
        new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.4, wireframe: true })
      );
      r.position.set(player.pos.x, player.pos.y + 2, player.pos.z);
      scene.add(r);
      MP._frozenViz = r;
    } catch(e){}
  } else if (!active && MP._frozenViz) {
    try { scene.remove(MP._frozenViz); MP._frozenViz.geometry.dispose(); MP._frozenViz.material.dispose(); } catch(e){}
    MP._frozenViz = null;
  }
  if (MP._frozenViz && player && player.pos) {
    MP._frozenViz.position.x = player.pos.x;
    MP._frozenViz.position.y = player.pos.y + 2;
    MP._frozenViz.position.z = player.pos.z;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SYNC SELF
// ═══════════════════════════════════════════════════════════════════════════
function syncSelfFromServer(me){
  if (!me || !player) return;
  player.score = Number(me.score) || 0;
  player.ep = Number(me.ep) || 0;

  try {
    var st = MP.room && MP.room.state;
    if (st) {
      if (typeof st.wave === 'number') player.wave = st.wave;
      if (typeof st.killedThisWave === 'number') player.enemiesKilledThisWave = st.killedThisWave;
      if (typeof st.goalThisWave === 'number') player.waveKillGoal = st.goalThisWave;
    }
  } catch(e){}

  var rooted = Number(me.rooted) || 0;
  var frozen = Number(me.frozen) || 0;

  if (rooted > 0.01 || frozen > 0.01) {
    MP._myRootedUntil = performance.now() + 200;
    player.pos.set(Number(me.x) || 0, Number(me.y) || 0, Number(me.z) || 0);
    player.vel.set(0, 0, 0);
    if (rooted > 0.01) setRootedViz(true);
    if (frozen > 0.01) setFrozenViz(true);
  } else {
    if (MP._myRootedUntil > 0 && performance.now() > MP._myRootedUntil + 50) {
      setRootedViz(false);
      setFrozenViz(false);
      MP._myRootedUntil = 0;
    }
  }

  var serverHp = Number(me.hp);
  var serverMaxHp = Number(me.maxHp);
  var serverDead = !!me.dead;

  if (isFinite(serverMaxHp) && serverMaxHp > 0) {
    MP._myServerMaxHp = serverMaxHp;
    if (player.maxHp !== serverMaxHp) player.maxHp = serverMaxHp;
  }
  if (isFinite(serverHp)) {
    if (serverHp < player.hp - 1) {
      var diff = Math.round(player.hp - serverHp);
      if (diff > 0 && !player.isDead) {
        try { if (typeof applyDamageToHero === 'function') applyDamageToHero(diff); } catch(e){}
      }
      player.hp = serverHp;
    } else {
      player.hp = serverHp;
    }
    MP._myServerHp = serverHp;
  }

  if (serverDead && !player.isDead) {
    player.isDead = true;
    setRootedViz(false);
    setFrozenViz(false);
    try {
      if (typeof showDeathScreen === 'function') showDeathScreen();
      var ds = document.getElementById('death-screen');
      if (ds) ds.classList.add('show');
    } catch(e){}
  } else if (!serverDead && player.isDead) {
    player.isDead = false;
    try {
      var ds2 = document.getElementById('death-screen');
      if (ds2) ds2.classList.remove('show');
    } catch(e){}
    var sx = Number(me.x), sy = Number(me.y), sz = Number(me.z);
    if (isFinite(sx) && isFinite(sz)) {
      player.pos.set(sx, isFinite(sy) ? sy : 0, sz);
      player.vel.set(0, 0, 0);
    }
  }
  MP._myServerDead = serverDead;
}

// ═══════════════════════════════════════════════════════════════════════════
// ATTACH
// ═══════════════════════════════════════════════════════════════════════════
function attach(room){
  Array.from(MP.remotes.keys()).forEach(removeRemote);
  Array.from(MP.serverEnemies.keys()).forEach(removeServerEnemy);
  Array.from(MP.serverSpiders.keys()).forEach(removeSpider);
  setRootedViz(false);
  setFrozenViz(false);
  MP._playersWired = false;
  MP._enemiesWired = false;
  MP._spidersWired = false;
  MP._msgHooksWired = false;
  MP._myServerHp = 460;
  MP._myServerMaxHp = 460;
  MP._myServerDead = false;
  hitBuffer.clear();
  if (hitBufferTimer) { clearTimeout(hitBufferTimer); hitBufferTimer = null; }

  MP.room = room;
  window.__MP_MODE = true;
  setStatus('ONLINE');

  if (!MP._buildingsSent && typeof buildings !== 'undefined' && buildings.length > 0) {
    MP._buildingsSent = true;
    try {
      var list = buildings.map(function(b){ return { x: b.x, z: b.z, w: b.w, d: b.d, h: b.topY || b.h || 0 }; });
      room.send('register_buildings', { list: list });
    } catch(e){}
  }

  function wire(){
    if (!room.state || !room.state.players || !room.state.enemies) return false;
    var ps = room.state.players, es = room.state.enemies, sps = room.state.spiders;

    if (!MP._playersWired) {
      MP._playersWired = true;
      ps.onAdd = function(p, k){ if (!safeId(k)) return; if (k === room.sessionId) return; addRemote(k, p); };
      ps.onRemove = function(p, k){ if (!safeId(k)) return; removeRemote(k); };
      try {
        ps.forEach(function(p, k){ if (!safeId(k)) return; if (k !== room.sessionId) addRemote(k, p); });
      } catch(e){}
    }
    if (!MP._enemiesWired) {
      MP._enemiesWired = true;
      es.onAdd = function(e, k){ if (!safeId(k)) return; addServerEnemy(k, e); };
      es.onRemove = function(e, k){ if (!safeId(k)) return; removeServerEnemy(k); };
      try {
        es.forEach(function(e, k){ if (!safeId(k)) return; addServerEnemy(k, e); });
      } catch(e){}
    }
    if (!MP._spidersWired && sps) {
      MP._spidersWired = true;
      sps.onAdd = function(s, k){ if (!safeId(k)) return; addSpider(k, s); };
      sps.onRemove = function(s, k){ if (!safeId(k)) return; removeSpider(k); };
      try {
        sps.forEach(function(s, k){ if (!safeId(k)) return; addSpider(k, s); });
      } catch(e){}
    }
    setInfo('Комната: ' + (room.id || '').slice(0, 8) + '\nИгроков: ' + ps.size + '\nВрагов: ' + es.size);
    return true;
  }
  if (!wire()) room.onStateChange.once(function(){ wire(); });

  if (!MP._msgHooksWired) {
    MP._msgHooksWired = true;

    room.onMessage('kill_feed', function(m){
      try { if (m) addKillFeedEntry(m.killer, m.victim, m.isBoss, m.isPvp, m.ability); } catch(e){}
    });
    room.onMessage('boss_attack', function(m){
      try {
        var t = m.bossType, x = Number(m.x) || 0, z = Number(m.z) || 0, r = Number(m.radius) || 5;
        if (t === 'titan') spawnEffectVisual('titan_hammer', x, 0, z, r);
        else if (t === 'lemon') spawnEffectVisual('lemon_lightning', x, 0, z, r);
        else if (t === 'valkyrie') spawnEffectVisual('valkyrie_dive', x, 0, z, r);
        else if (t === 'necromancer') spawnEffectVisual('necromancer_summon', x, 0, z, r);
      } catch(e){}
    });
    room.onMessage('effect', function(m){
      try { if (m && m.type) spawnEffectVisual(m.type, m.x, m.y, m.z, m.radius); } catch(e){}
    });
    room.onMessage('enemies_off_changed', function(m){
      try {
        var b = $('mp-enemies');
        if (b) {
          b.textContent = m.off ? '✅ ВРАГИ ON' : '🚫 ВРАГИ OFF';
          b.style.background = m.off ? '#2ecc71' : '#f9ca24';
        }
      } catch(e){}
    });
    room.onMessage('kill_reward', function(m){
      try {
        if (m && m.killerId === room.sessionId && player && player.pos) {
          var prefix = m.isBoss ? '💀 +' : '+';
          var color = m.isBoss ? '#ffea00' : '#adff2f';
          if (typeof spawnComicPop === 'function') {
            spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 4.5, 0)), prefix + m.score + ' (' + m.ep + ' EP)', color);
          }
        }
      } catch(e){}
    });
    room.onMessage('boss_spawn', function(m){
      try {
        if (typeof spawnComicPop === 'function' && player && player.pos) {
          var titles = {
            titan: '⚠️ ТИТАН! ⚠️',
            lemon: '⚡ КОЛОСС! ⚡',
            valkyrie: '🟠 ВАЛЬКИРИЯ! 🟠',
            necromancer: '🔮 НЕКРОМАНТ! 🔮'
          };
          spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 6, 0)), titles[m.bossType] || '⚠️ БОСС! ⚠️', '#ff7f00');
        }
      } catch(e){}
    });
    room.onMessage('enemy_attack', function(m){
      try {
        if (!m || !player || player.isDead) return;
        var r = MP.serverEnemies.get(m.enemyId);
        if (r && r.local && r.local.group && player.pos && r.local.group.position.distanceTo(player.pos) < 40) {
          if (typeof triggerHitFlash === 'function') try { triggerHitFlash(); } catch(e){}
        }
      } catch(e){}
    });
    room.onMessage('player_down', function(m){
      try {
        if (m && typeof spawnComicPop === 'function' && player && player.pos) {
          spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 5.5, 0)), (m.name || '?') + ' ПАЛ', '#ff7f00');
        }
      } catch(e){}
    });
    room.onMessage('pvp_hit', function(m){
      try {
        if (!m || !m.targetId) return;
        if (m.targetId === room.sessionId && player && !player.isDead) {
          if (typeof triggerHitFlash === 'function') try { triggerHitFlash(); } catch(e){}
          if (typeof spawnComicPop === 'function' && player.pos) {
            var lbl = m.ability ? ('-PvP ' + m.ability + ' ' + (m.damage || 0)) : ('-PvP ' + (m.damage || 40));
            spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3.5, 0)), lbl, '#ff0055');
          }
          if (m.ability && player && player.pos) {
            spawnEffectVisual(m.ability, player.pos.x, player.pos.y, player.pos.z, 0);
          }
        } else if (m.attacker && typeof spawnComicPop === 'function' && player && player.pos) {
          var lbl2 = m.ability ? (m.attacker + ' ' + m.ability + ' → ' + m.target) : (m.attacker + ' → ' + m.target);
          spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 5, 0)), lbl2, '#ffea00');
        }
      } catch(e){}
    });
    room.onMessage('pvp_kill', function(m){
      try {
        if (typeof spawnComicPop === 'function' && player && player.pos) {
          spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 5.5, 0)), (m.killer || '?') + ' УБИЛ ' + (m.victim || '?'), '#ff2200');
        }
      } catch(e){}
    });
    room.onMessage('dmg', function(m){
      try {
        var r = MP.serverEnemies.get(m.enemyId);
        if (!r || !r.local || !r.local.group) return;
        if (typeof spawnParticles === 'function') {
          spawnParticles(r.local.group.position.clone().add(new THREE.Vector3(0, 2, 0)), 0xff9f1a, 2);
        }
      } catch(e){}
    });
    room.onMessage('enemy_die', function(m){
      try {
        var r = MP.serverEnemies.get(m.enemyId);
        if (r && r.local && r.local.group && typeof spawnGroundCrackRing === 'function') {
          spawnGroundCrackRing(r.local.group.position, m.isBoss ? 0xff00ff : 0xff0055, m.isBoss ? 12 : 4.5);
        }
        if (m.isBoss && typeof spawnComicPop === 'function' && player && player.pos) {
          spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 7, 0)), '💀 БОСС ПОВЕРЖЕН! 💀', '#ffea00');
        }
      } catch(e){}
    });
    room.onMessage('wave_up', function(m){
      try {
        if (typeof spawnComicPop === 'function' && player && player.pos) {
          spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 4, 0)), '⚠ ВОЛНА ' + (m.wave || '?') + ' ⚠', '#ff9f1a');
        }
      } catch(e){}
    });
    room.onMessage('kamikaze_attach', function(m){
      var r = MP.serverSpiders.get(m.spiderId);
      if (r) r.attachedTo = m.targetId;
      if (typeof SoundFX !== 'undefined') try { SoundFX._osc(880, 0.3, 'square', 0.15); } catch(e){}
    });
  }

  room.onLeave = function(){
    MP.room = null;
    window.__MP_MODE = false;
    setStatus('OFFLINE', true);
    setInfo('');
    hitBuffer.clear();
    if (hitBufferTimer) { clearTimeout(hitBufferTimer); hitBufferTimer = null; }
    Array.from(MP.remotes.keys()).forEach(removeRemote);
    Array.from(MP.serverEnemies.keys()).forEach(removeServerEnemy);
    Array.from(MP.serverSpiders.keys()).forEach(removeSpider);
    setRootedViz(false);
    setFrozenViz(false);
    MP._playersWired = false;
    MP._enemiesWired = false;
    MP._spidersWired = false;
    MP._msgHooksWired = false;
    tabPanel.style.display = 'none';
    _tabDown = false;
  };

  room.onError = function(c, m){ setStatus('ERR ' + c, true); };
}

// ═══════════════════════════════════════════════════════════════════════════
// START NET
// ═══════════════════════════════════════════════════════════════════════════
function startNet(fn){
  ensureLib(function(){
    try {
      MP.client = new window.Colyseus.Client(serverUrl());
      var codeVal = ($('mp-code').value || '').trim() || randCode();
      var form = 1;
      try { if (typeof CARROT_FORM !== 'undefined') form = CARROT_FORM | 0 || 1; } catch(e){}
      var pForm = 1;
      try { if (typeof window.__POTATO_FORM !== 'undefined') pForm = window.__POTATO_FORM | 0 || 1; } catch(e){}

      var opts = {
        code: codeVal.toUpperCase(),
        name: (($('mp-name').value || 'Игрок').trim().slice(0, 16)) || 'Игрок',
        char: (player && player.character) || 'banana',
        suit: (player && typeof player.suitIdx === 'number') ? player.suitIdx : 4,
        pepperEvolved: !!(player && player.pepperEvolved),
        carrotForm: form,
        potatoForm: pForm
      };
      $('mp-code').value = opts.code;
      MP._lastCharState = {
        suit: opts.suit, char: opts.char,
        pepperEvolved: opts.pepperEvolved,
        carrotForm: opts.carrotForm,
        potatoForm: opts.potatoForm
      };
      setStatus('CONNECT…');
      fn(opts).then(attach).catch(function(e){
        setStatus('FAIL', true);
        setInfo(String((e && e.message) || e));
      });
    } catch(e){
      setStatus('FAIL', true);
      setInfo(String((e && e.message) || e));
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// UI EVENTS
// ═══════════════════════════════════════════════════════════════════════════
$('mp-create').onclick = function(){ startNet(function(o){ return MP.client.create('game_room', o); }); };
$('mp-join').onclick = function(){
  if (!($('mp-code').value || '').trim()) { setInfo('Введи код'); return; }
  startNet(function(o){ return MP.client.join('game_room', o); });
};
$('mp-leave').onclick = function(){ if (MP.room) MP.room.leave(); };
$('mp-enemies').onclick = function(){
  if (!MP.room || !window.__MP_MODE) { setInfo('Нет подключения'); return; }
  try { MP.room.send('toggle_enemies', {}); } catch(e){}
};

// ═══════════════════════════════════════════════════════════════════════════
// MOVEMENT SYNC
// ═══════════════════════════════════════════════════════════════════════════
setInterval(function(){
  try {
    if (!MP.room || !window.__MP_MODE || !player || !player.pos) return;
    if (player.isDead) return;
    if (MP._myRootedUntil > performance.now()) return;
    var now = performance.now();
    if (now - MP.lastSend < 60) return;
    MP.lastSend = now;
    var anim = (player.vel && (Math.abs(player.vel.x) + Math.abs(player.vel.z)) > 4) ? 1 : 0;
    MP.room.send('mv', {
      x: player.pos.x || 0,
      y: player.pos.y || 0,
      z: player.pos.z || 0,
      ry: player.facingYaw || 0,
      anim: anim
    });
  } catch(e){}
}, 30);

// ═══════════════════════════════════════════════════════════════════════════
// CHAR STATE SYNC
// ═══════════════════════════════════════════════════════════════════════════
setInterval(function(){
  try {
    if (!MP.room || !window.__MP_MODE || !player) return;
    var curSuit = (player.suitIdx | 0) || 4;
    var curChar = player.character || 'banana';
    var curEvo = !!player.pepperEvolved;
    var curForm = 1;
    try { if (typeof CARROT_FORM !== 'undefined') curForm = CARROT_FORM | 0 || 1; } catch(e){}
    var curPotatoForm = 1;
    try { if (typeof window.__POTATO_FORM !== 'undefined') curPotatoForm = window.__POTATO_FORM | 0 || 1; } catch(e){}

    var l = MP._lastCharState;
    if (curSuit !== l.suit || curChar !== l.char || curEvo !== l.pepperEvolved ||
        curForm !== l.carrotForm || curPotatoForm !== l.potatoForm) {
      MP._lastCharState = {
        suit: curSuit, char: curChar,
        pepperEvolved: curEvo,
        carrotForm: curForm,
        potatoForm: curPotatoForm
      };
      MP.room.send('charState', {
        suit: curSuit, char: curChar,
        pepperEvolved: curEvo,
        carrotForm: curForm,
        potatoForm: curPotatoForm
      });
    }
  } catch(e){}
}, 200);

// ═══════════════════════════════════════════════════════════════════════════
// PVP MELEE
// ═══════════════════════════════════════════════════════════════════════════
function tryPvP(){
  try {
    if (!MP.room || !window.__MP_MODE) return;
    if (!player || !player.pos || player.isDead) return;
    if (typeof isLabOpen !== 'undefined' && isLabOpen) return;
    if (MP.remotes.size === 0) return;

    var bestId = null, bestD = 7.5;
    MP.remotes.forEach(function(r, id){
      try {
        var d = r.group.position.distanceTo(player.pos);
        if (d < bestD) { bestD = d; bestId = id; }
      } catch(e){}
    });
    if (bestId) {
      var dmg = (player.character === 'lemon') ? 55 : 40;
      MP.room.send('pvp', { targetId: bestId, damage: dmg });
    }
  } catch(e){}
}

if (typeof window.performPrimaryAttack === 'function' && !window.__MP_pvp_hooked) {
  window.__MP_pvp_hooked = true;
  var _origPPA = window.performPrimaryAttack;
  window.performPrimaryAttack = function(){
    try { _origPPA.apply(this, arguments); } catch(e){}
    tryPvP();
    try { if (MP.room && window.__MP_MODE) MP.room.send('attack', {}); } catch(e){}
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATIONS
// ═══════════════════════════════════════════════════════════════════════════
function animateLegs(mesh, anim, now){
  var ud = mesh && mesh.userData;
  if (!ud || !ud.legL || !ud.legR) return;
  var hipL = ud.legL.hip || ud.legL.pivot;
  var hipR = ud.legR.hip || ud.legR.pivot;
  if (!hipL || !hipR) return;
  var t = now * 0.012;
  var sw = anim ? Math.sin(t) * 0.6 : 0;
  hipL.rotation.x = sw;
  hipR.rotation.x = -sw;
  if (ud.legL.knee) ud.legL.knee.rotation.x = Math.max(0, -Math.cos(t) * 0.7) * (anim ? 1 : 0);
  if (ud.legR.knee) ud.legR.knee.rotation.x = Math.max(0, Math.cos(t) * 0.7) * (anim ? 1 : 0);
}
function animateAttack(mesh, attackAnim){
  if (!attackAnim || attackAnim <= 0) return;
  var ud = mesh && mesh.userData;
  if (!ud || !ud.armR) return;
  var shoulder = ud.armR.shoulder || ud.armR.pivot;
  if (!shoulder) return;
  shoulder.rotation.x = -2 * Math.sin((1 - attackAnim) * Math.PI);
}
function updatePlayerHpBar(r, hp, maxHp){
  if (!r.hpBar) return;
  try {
    var cp = camera.position;
    var dx = cp.x - r.group.position.x;
    var dy = cp.y - r.group.position.y;
    var dz = cp.z - r.group.position.z;
    var dSq = dx * dx + dy * dy + dz * dz;
    if (dSq > 2500) { r.hpBar.style.display = 'none'; return; }
    var v = new THREE.Vector3(r.group.position.x, r.group.position.y + 3.8, r.group.position.z).project(camera);
    if (v.z > 1 || v.z < -1) { r.hpBar.style.display = 'none'; return; }
    r.hpBar.style.display = 'block';
    r.hpBar.style.left = ((v.x * 0.5 + 0.5) * window.innerWidth) + 'px';
    r.hpBar.style.top = ((-v.y * 0.5 + 0.5) * window.innerHeight) + 'px';
    var pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
    r.hpBar.firstChild.style.width = pct + '%';
    r.hpBar.firstChild.style.background = pct > 50
      ? 'linear-gradient(90deg,#2ecc71,#adff2f)'
      : (pct > 25 ? 'linear-gradient(90deg,#ff9f1a,#f9ca24)' : 'linear-gradient(90deg,#ff0055,#eb2f06)');
  } catch(e){}
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN TICK
// ═══════════════════════════════════════════════════════════════════════════
function tick(){
  requestAnimationFrame(tick);
  try {
    if (!MP.room || !MP.room.state) return;
    var now = performance.now();

    try {
      var me = MP.room.state.players.get(MP.room.sessionId);
      if (me) syncSelfFromServer(me);
    } catch(e){}

    if (MP.remotes.size > 0 && MP.room.state.players) {
      MP.remotes.forEach(function(r, id){
        try {
          var p = MP.room.state.players.get(id);
          if (!p) return;
          var curChar = p.char || 'banana';
          var curSuit = p.suit | 0;
          var curEvo = !!p.pepperEvolved;
          var curForm = (p.carrotForm | 0) || 1;
          var curPotatoForm = (p.potatoForm | 0) || 1;

          if (curChar !== r.lastChar || curSuit !== r.lastSuit || curEvo !== r.lastEvo ||
              curForm !== r.lastForm || curPotatoForm !== r.lastPotatoForm) {
            recreateRemote(id, r, p);
          }

          var px = Number(p.x), py = Number(p.y), pz = Number(p.z), pry = Number(p.ry);
          if (!isFinite(px)) px = r.group.position.x;
          if (!isFinite(py)) py = r.group.position.y;
          if (!isFinite(pz)) pz = r.group.position.z;
          if (!isFinite(pry)) pry = r.yaw;
          r.target.set(px, py, pz);
          r.anim = p.anim | 0;
          r.group.position.lerp(r.target, 0.18);
          r.group.visible = !p.dead;

          var d = pry - r.yaw;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          r.yaw += d * 0.2;
          r.group.rotation.y = r.yaw + Math.PI;

          animateLegs(r.mesh, r.anim, now);
          animateAttack(r.mesh, Number(p.attackAnim) || 0);

          if (!p.dead && Number(p.hp) < Number(p.maxHp)) {
            updatePlayerHpBar(r, Number(p.hp), Number(p.maxHp));
          } else if (r.hpBar) {
            r.hpBar.style.display = 'none';
          }
        } catch(e){}
      });
    }

    if (MP.serverEnemies.size > 0 && MP.room.state.enemies) {
      MP.serverEnemies.forEach(function(r, id){
        try {
          var e = MP.room.state.enemies.get(id);
          if (!e) return;
          var ex = Number(e.x), ez = Number(e.z), ey = Number(e.y), ery = Number(e.ry), ehp = Number(e.hp);
          if (!isFinite(ex)) ex = r.target.x;
          if (!isFinite(ez)) ez = r.target.z;
          if (!isFinite(ey)) ey = r.target.y;
          if (!isFinite(ery)) ery = r.local.group.rotation.y;

          var pad = r.isBoss ? 5.0 : ((r.local.radius || 1.3) + 0.5);
          if (isInsideBuilding(ex, ez, pad)) {
            var pushed = pushOutOfBuilding(ex, ez, pad);
            ex = pushed.x;
            ez = pushed.z;
          }
          r.target.set(ex, ey, ez);
          var oldX = r.local.group.position.x;
          var oldZ = r.local.group.position.z;
          r.local.group.position.lerp(r.target, r.isBoss ? 0.15 : 0.3);
          var newX = r.local.group.position.x;
          var newZ = r.local.group.position.z;
          if (isInsideBuilding(newX, newZ, pad)) {
            r.local.group.position.x = oldX;
            r.local.group.position.z = oldZ;
            r.local._mpMoving = false;
          } else {
            var dx = newX - oldX, dz = newZ - oldZ;
            r.local._mpMoving = Math.sqrt(dx * dx + dz * dz) > 0.02;
          }
          r.local.group.rotation.y = ery;
          if (isFinite(ehp)) { r.local.hp = ehp; r.hp = ehp; }

          if (r.isBoss && typeof activeBoss !== 'undefined' && activeBoss === r.local) {
            try {
              var f = document.getElementById('boss-hp-fill');
              if (f) f.style.width = Math.max(0, (r.local.hp / r.local.maxHp) * 100) + '%';
            } catch(e2){}
          }
        } catch(e){}
      });
    }

    if (MP.serverSpiders.size > 0 && MP.room.state.spiders) {
      MP.serverSpiders.forEach(function(r, id){
        try {
          var s = MP.room.state.spiders.get(id);
          if (!s) return;
          if (r.attachedTo) {
            var tgt = MP.remotes.get(r.attachedTo);
            if (!tgt) {
              var es = MP.serverEnemies.get(r.attachedTo);
              if (es) tgt = es.local ? { group: es.local.group } : es;
            }
            if (tgt && tgt.group) {
              r.group.position.lerp(tgt.group.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 0.5);
              r.group.position.y = 0.5 + Math.sin(now * 0.01 + id.length) * 0.15;
              return;
            }
          }
          var sx = Number(s.x) || 0;
          var sz = Number(s.z) || 0;
          r.target.set(sx, 0.1, sz);
          r.group.position.lerp(r.target, 0.4);
          r.group.position.y = 0.3 + Math.sin(now * 0.01 + id.length) * 0.15;
        } catch(e){}
      });
    }

    if (MP._rootedViz && player && player.pos) {
      MP._rootedViz.position.x = player.pos.x;
      MP._rootedViz.position.z = player.pos.z;
      MP._rootedViz.rotation.z = now * 0.003;
    }
    if (MP._frozenViz && player && player.pos) {
      MP._frozenViz.position.x = player.pos.x;
      MP._frozenViz.position.y = player.pos.y + 2;
      MP._frozenViz.position.z = player.pos.z;
    }

    if (_tabDown && now - (MP._tabUpdateAt || 0) > 500) {
      MP._tabUpdateAt = now;
      renderTabTable();
    }
  } catch(e){}
}
tick();

console.log('[MP] v26 готов. Лимон/дроны, potato polling, баланс урона.');
console.log('[MP] Banana devastator=45, nano_ult=500; Lemon plasma=30 + laser 12/тик + пауки 30/укус; Potato: Q=120, F=90, heal=200.');

})();
