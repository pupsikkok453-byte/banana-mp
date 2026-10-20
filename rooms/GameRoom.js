const colyseus = require('colyseus');
const schema = require('@colyseus/schema');

class Player extends schema.Schema {}
schema.defineTypes(Player, {
  x: 'number', y: 'number', z: 'number',
  ry: 'number', suit: 'number', char: 'string',
  anim: 'number', name: 'string',
  hp: 'number', maxHp: 'number',
  dead: 'boolean', respawnTimer: 'number',
  pepperEvolved: 'boolean', carrotForm: 'number',
  attackAnim: 'number', score: 'number', ep: 'number',
  rooted: 'number', frozen: 'number', kills: 'number', deaths: 'number'
});

class Enemy extends schema.Schema {}
schema.defineTypes(Enemy, {
  type: 'string', x: 'number', z: 'number', y: 'number',
  hp: 'number', maxHp: 'number', ry: 'number', anim: 'number', isBoss: 'boolean'
});

class Spider extends schema.Schema {}
schema.defineTypes(Spider, {
  x: 'number', z: 'number', owner: 'string', targetId: 'string', targetType: 'string', hp: 'number', life: 'number', isKamikaze: 'boolean'
});

class State extends schema.Schema {
  constructor() {
    super();
    this.players = new schema.MapSchema();
    this.enemies = new schema.MapSchema();
    this.spiders = new schema.MapSchema();
    this.wave = 1; this.killedThisWave = 0; this.goalThisWave = 8;
    this.code = 'DEFAULT'; this.bossWave = 0; this.enemiesOff = false;
  }
}
schema.defineTypes(State, {
  players: { map: Player }, enemies: { map: Enemy }, spiders: { map: Spider },
  wave: 'number', killedThisWave: 'number', goalThisWave: 'number', code: 'string', bossWave: 'number', enemiesOff: 'boolean'
});

// ★ СБАЛАНСИРОВАННЫЙ УРОН СПОСОБНОСТЕЙ (Сервер - авторитет)
const PVP_ABILITIES = {
  hell_explosion:  { radius: 40, dmg: 150, cd: 5000 },
  carrot_ult:      { radius: 50, dmg: 200, cd: 8000 },
  ult_lemon:       { radius: 40, dmg: 120, cd: 5000 },
  devastator:      { radius: 30, dmg: 80, cd: 2000 },
  earthquake:      { radius: 40, dmg: 100, cd: 3000 },
  drill:           { radius: 12, dmg: 90, cd: 1500 },
  root_bind:       { radius: 22, dmg: 50, cd: 1500 },
  vine_harpoon:    { radius: 25, dmg: 60, cd: 1000 },
  acid_rain:       { radius: 7,  dmg: 30, cd: 800 },
  repulse:         { radius: 10, dmg: 60, cd: 1000 },
  fire_beam:       { radius: 36, dmg: 100, cd: 2000 },
  fire_fist:       { radius: 7,  dmg: 45, cd: 400 },
  rocket:          { radius: 10, dmg: 90, cd: 1500 },
  kamikaze_spider: { radius: 10, dmg: 80, cd: 5000 },
  freeze:          { radius: 8,  dmg: 20, cd: 8000 }
};

const ENEMY_TYPES = {
  mandarin: { hp: 600, speed: 12, dmg: 12, radius: 1.3, attackCd: 1.6, attackRange: 24, score: 100, ep: 30, maxAttackY: 3 },
  leader: { hp: 840, speed: 13, dmg: 15, radius: 1.6, attackCd: 2.0, attackRange: 30, score: 150, ep: 40, maxAttackY: 3 },
  brawler: { hp: 1560, speed: 16, dmg: 28, radius: 2.0, attackCd: 1.4, attackRange: 4.5, score: 250, ep: 55, maxAttackY: 3 },
  shield: { hp: 1050, speed: 10, dmg: 12, radius: 1.3, attackCd: 2.0, attackRange: 26, score: 180, ep: 45, maxAttackY: 3 },
  sniper: { hp: 660, speed: 14, dmg: 32, radius: 1.3, attackCd: 2.2, attackRange: 40, score: 200, ep: 50, maxAttackY: 6 },
  medic: { hp: 780, speed: 12, dmg: 5, radius: 1.3, attackCd: 2.5, attackRange: 20, score: 160, ep: 40, maxAttackY: 3 },
  kamikaze: { hp: 540, speed: 18, dmg: 55, radius: 1.3, attackCd: 0.5, attackRange: 4, score: 120, ep: 35, maxAttackY: 3 },
  tank: { hp: 2700, speed: 6, dmg: 24, radius: 3.8, attackCd: 2.2, attackRange: 40, score: 400, ep: 75, maxAttackY: 8 },
  heli: { hp: 1950, speed: 14, dmg: 22, radius: 3.2, attackCd: 1.8, attackRange: 40, score: 350, ep: 70, maxAttackY: 30 },
  titan: { hp: 15000, speed: 8, dmg: 45, radius: 4.4, attackCd: 2.4, attackRange: 6.0, isBoss: true, score: 3000, ep: 300, maxAttackY: 8 },
  lemon: { hp: 18000, speed: 8, dmg: 30, radius: 4.5, attackCd: 2.0, attackRange: 6.0, isBoss: true, score: 3500, ep: 350, maxAttackY: 15 },
  valkyrie: { hp: 13500, speed: 12, dmg: 25, radius: 3.2, attackCd: 1.5, attackRange: 6.5, isBoss: true, score: 2800, ep: 280, maxAttackY: 28 },
  necromancer: { hp: 12000, speed: 7, dmg: 22, radius: 3.5, attackCd: 2.0, attackRange: 6.5, isBoss: true, score: 2600, ep: 260, maxAttackY: 10 }
};
const BOSS_TYPES = ['titan', 'lemon', 'valkyrie', 'necromancer'];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v, fb) => (typeof v === 'number' && isFinite(v) ? v : fb);
const rand = () => Math.random();
const distXZ = (a, b) => { const dx = a.x - b.x, dz = a.z - b.z; return dx*dx + dz*dz; };
const dist3D = (a, b) => { const dx = a.x - b.x; const dy = (a.y||0) - (b.y||0); const dz = a.z - b.z; return dx*dx + dy*dy + dz*dz; };
const dyAbs = (a, b) => Math.abs((a.y||0) - (b.y||0));

class GameRoom extends colyseus.Room {
  onCreate(options) {
    this.setState(new State());
    this.state.code = (options && options.code) ? String(options.code).toUpperCase().slice(0, 8) : 'DEFAULT';
    this.maxClients = 8;
    this.attackCooldowns = new Map();
    this.bossAttackCd = new Map();
    this.playerAttackCd = new Map();
    this.lastMsg = new Map();
    this.enemySeq = 0; this.spiderSeq = 0;
    this.lastHitBy = new Map();
    this.buildings = [];

    this.setSimulationInterval((dt) => this.tick(dt / 1000), 50);

    this.onMessage('register_buildings', (client, d) => {
      if (this.buildings.length > 0 || !d || !Array.isArray(d.list)) return;
      this.buildings = d.list.slice(0, 3000).map(b => ({
        minX: num(b.x, 0) - num(b.w, 0) / 2, maxX: num(b.x, 0) + num(b.w, 0) / 2,
        minZ: num(b.z, 0) - num(b.d, 0) / 2, maxZ: num(b.z, 0) + num(b.d, 0) / 2, topY: num(b.h, 0)
      }));
    });

    this.onMessage('mv', (client, d) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || !d || p.dead) return;
      if (p.rooted > 0 || p.frozen > 0) return;
      const now = Date.now();
      if (now - (this.lastMsg.get(client.sessionId) || 0) < 25) return;
      this.lastMsg.set(client.sessionId, now);
      p.x = clamp(num(d.x, p.x), -2700, 2700); p.y = clamp(num(d.y, p.y), 0, 400); p.z = clamp(num(d.z, p.z), -2700, 2700);
      p.ry = num(d.ry, p.ry); p.anim = d.anim ? 1 : 0;
    });

    this.onMessage('charState', (client, d) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || !d) return;
      if (typeof d.suit === 'number') p.suit = clamp(d.suit | 0, 0, 4);
      if (typeof d.char === 'string') p.char = d.char.slice(0, 12);
      if (typeof d.pepperEvolved === 'boolean') p.pepperEvolved = d.pepperEvolved;
      if (typeof d.carrotForm === 'number') p.carrotForm = clamp(d.carrotForm | 0, 1, 2);
      
      // Разные HP в зависимости от формы
      if (p.char === 'carrot') {
        p.maxHp = (p.carrotForm === 2) ? 800 : 480;
      } else if (p.char === 'banana') {
        p.maxHp = [350, 420, 600, 450, 500][p.suit] || 500;
      }
      if (p.hp > p.maxHp) p.hp = p.maxHp;
    });

    this.onMessage('attack', (client) => {
      const p = this.state.players.get(client.sessionId);
      if (p) p.attackAnim = 1;
    });

    this.onMessage('hit_batch', (client, d) => {
      if (!d || !Array.isArray(d.hits)) return;
      const attacker = this.state.players.get(client.sessionId);
      if (!attacker || attacker.dead) return;
      const key = 'b_' + client.sessionId;
      if (Date.now() - (this.playerAttackCd.get(key) || 0) < 30) return;
      this.playerAttackCd.set(key, Date.now());
      
      d.hits.forEach(hit => {
        if (!hit || !hit.id) return;
        const enemy = this.state.enemies.get(hit.id);
        if (!enemy) return;
        if (distXZ(attacker, enemy) > Math.pow(20, 2) || dyAbs(attacker, enemy) > 40) return;
        enemy.hp -= clamp(num(hit.dmg, 0), 1, 5000);
        this.lastHitBy.set(hit.id, client.sessionId);
        this.broadcast('dmg', { enemyId: hit.id, amount: hit.dmg, crit: !!hit.crit });
        if (enemy.hp <= 0) this.killEnemy(hit.id);
      });
    });

    this.onMessage('pvp_ability', (client, d) => {
      if (!d || !d.type) return;
      const atk = this.state.players.get(client.sessionId);
      if (!atk || atk.dead) return;
      const def = PVP_ABILITIES[d.type];
      if (!def) return;
      
      const key = 'pva_' + client.sessionId + '_' + d.type;
      if (Date.now() - (this.playerAttackCd.get(key) || 0) < def.cd) return;
      this.playerAttackCd.set(key, Date.now());

      const radius = def.radius;
      const dmg = def.dmg;

      this.state.players.forEach((tgt, sid) => {
        if (tgt === atk || tgt.dead) return;
        if (Math.sqrt(distXZ(atk, tgt)) > radius || dyAbs(atk, tgt) > 15) return;
        
        tgt.hp -= dmg;
        if (d.type === 'root_bind') {
          tgt.rooted = Math.max(tgt.rooted || 0, 2.5);
          tgt.y = 0;
        }
        if (d.type === 'freeze') tgt.frozen = Math.max(tgt.frozen || 0, 2.0);

        this.broadcast('pvp_hit', { attacker: atk.name, target: tgt.name, targetId: sid, damage: dmg, ability: d.type });
        
        if (tgt.hp <= 0 && !tgt.dead) {
          tgt.dead = true; tgt.hp = 0; tgt.respawnTimer = 6; tgt.rooted = 0; tgt.frozen = 0;
          tgt.deaths = (tgt.deaths || 0) + 1; atk.kills = (atk.kills || 0) + 1; atk.score += 300;
          this.broadcast('pvp_kill', { killer: atk.name, victim: tgt.name });
          this.broadcast('kill_feed', { killer: atk.name, victim: tgt.name, isPvp: true, ability: d.type });
        }
      });
      this.broadcast('effect', { type: d.type, x: atk.x, y: atk.y, z: atk.z, bySession: client.sessionId, byName: atk.name, radius: radius }, { except: client });
    });

    this.onMessage('spawn_spiders', (client, d) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || p.dead || p.char !== 'lemon') return;
      let owned = 0; this.state.spiders.forEach(s => { if (s.owner === client.sessionId) owned++; });
      const toAdd = Math.min(num(d && d.count, 2), 4 - owned);
      for (let i = 0; i < toAdd; i++) {
        const sp = new Spider();
        const a = rand() * Math.PI * 2;
        sp.x = p.x + Math.cos(a) * 2; sp.z = p.z + Math.sin(a) * 2;
        sp.owner = client.sessionId; sp.targetId = ''; sp.targetType = ''; sp.hp = 100; sp.life = 8;
        sp.isKamikaze = false;
        this.state.spiders.set('spider_' + this.spiderSeq++ + Date.now(), sp);
      }
    });

    this.onMessage('kamikaze_spiders', (client) => {
      this.state.spiders.forEach((s) => {
        if (s.owner === client.sessionId) s.isKamikaze = true;
      });
    });

    this.onMessage('toggle_enemies', (client) => {
      this.state.enemiesOff = !this.state.enemiesOff;
      if (this.state.enemiesOff) {
        const toKill = []; this.state.enemies.forEach((e, id) => toKill.push(id));
        toKill.forEach(id => { this.broadcast('enemy_die', { enemyId: id, type: this.state.enemies.get(id).type, isBoss: this.state.enemies.get(id).isBoss }); this.state.enemies.delete(id); });
      } else { this.spawnWave(); }
      this.broadcast('enemies_off_changed', { off: this.state.enemiesOff });
    });

    this.onMessage('pvp', (client, d) => {
      if (!d || !d.targetId) return;
      const atk = this.state.players.get(client.sessionId);
      const tgt = this.state.players.get(d.targetId);
      if (!atk || !tgt || atk.dead || tgt.dead || atk === tgt) return;
      const key = 'p_' + client.sessionId;
      if (Date.now() - (this.playerAttackCd.get(key) || 0) < 250) return;
      this.playerAttackCd.set(key, Date.now());
      
      if (distXZ(atk, tgt) > 8 * 8 || dyAbs(atk, tgt) > 4) return;
      
      let dmg = 40;
      if (atk.char === 'banana') {
        if (atk.suit === 2) dmg = 65;
        if (atk.suit === 4) dmg = 55;
      } else if (atk.char === 'carrot') {
        dmg = (atk.carrotForm === 2) ? 80 : 45;
      } else if (atk.char === 'lemon') {
        dmg = 50;
      } else if (atk.char === 'pepper') {
        dmg = 45;
      }

      tgt.hp -= dmg;
      this.broadcast('pvp_hit', { attacker: atk.name, target: tgt.name, targetId: d.targetId, damage: dmg });
      if (tgt.hp <= 0 && !tgt.dead) {
        tgt.dead = true; tgt.hp = 0; tgt.respawnTimer = 6; tgt.rooted = 0; tgt.frozen = 0;
        tgt.deaths = (tgt.deaths || 0) + 1; atk.kills = (atk.kills || 0) + 1; atk.score += 200;
        this.broadcast('pvp_kill', { killer: atk.name, victim: tgt.name });
        this.broadcast('kill_feed', { killer: atk.name, victim: tgt.name, isPvp: true });
      }
    });
  }

  isInsideBuilding(x, z, pad) {
    for (let i = 0; i < this.buildings.length; i++) {
      const b = this.buildings[i];
      if (x > b.minX - pad && x < b.maxX + pad && z > b.minZ - pad && z < b.maxZ + pad) return true;
    }
    return false;
  }

  findSafeSpawn(cx, cz, minR, maxR) {
    for (let i = 0; i < 30; i++) {
      const a = rand() * Math.PI * 2, r = minR + rand() * (maxR - minR);
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (!this.isInsideBuilding(x, z, 3)) return { x, z };
    }
    return { x: cx + minR, z: cz };
  }

  findSafeRespawn(player) {
    for (let i = 0; i < 40; i++) {
      const a = rand() * Math.PI * 2, r = 80 + rand() * 80;
      const x = player.x + Math.cos(a) * r, z = player.z + Math.sin(a) * r;
      if (this.isInsideBuilding(x, z, 3)) continue;
      let tooClose = false;
      this.state.enemies.forEach(e => { if ((e.x-x)**2 + (e.z-z)**2 < 45**2) tooClose = true; });
      this.state.players.forEach(p => { if (p !== player && !p.dead && (p.x-x)**2 + (p.z-z)**2 < 15**2) tooClose = true; });
      if (!tooClose) return { x, z };
    }
    return { x: 0, z: -8 };
  }

  onJoin(client, options) {
    const p = new Player();
    p.x = 0; p.y = 0; p.z = -8; p.ry = 0; p.anim = 0; p.suit = clamp(num(options && options.suit, 4), 0, 4);
    p.char = (options && typeof options.char === 'string') ? options.char.slice(0, 12) : 'banana';
    p.name = (options && typeof options.name === 'string') ? options.name.slice(0, 16) : 'Игрок';
    
    if (p.char === 'banana') {
      p.maxHp = [350, 420, 600, 450, 500][p.suit] || 500;
    } else if (p.char === 'pepper') p.maxHp = 420;
    else if (p.char === 'carrot') p.maxHp = 480;
    else if (p.char === 'lemon') p.maxHp = 400;
    p.hp = p.maxHp;

    p.dead = false; p.respawnTimer = 0; p.pepperEvolved = false; p.carrotForm = 1;
    p.attackAnim = 0; p.score = 0; p.ep = 0; p.rooted = 0; p.frozen = 0; p.kills = 0; p.deaths = 0;
    this.state.players.set(client.sessionId, p);
    if (this.state.players.size === 1 && !this.state.enemiesOff) this.spawnWave();
  }

  onLeave(client) {
    this.state.players.delete(client.sessionId);
    const sToDel = []; this.state.spiders.forEach((s, id) => { if (s.owner === client.sessionId) sToDel.push(id); });
    sToDel.forEach(id => this.state.spiders.delete(id));
    this.playerAttackCd.forEach((v, k) => { if (k.endsWith(client.sessionId)) this.playerAttackCd.delete(k); });
    this.lastHitBy.forEach((sid, eid) => { if (sid === client.sessionId) this.lastHitBy.delete(eid); });
    if (this.state.players.size === 0) this.state.enemies.clear();
  }

  spawnWave() {
    if (this.state.enemiesOff) return;
    const w = this.state.wave; const n = 4 + Math.floor(w * 0.9);
    const pool = ['mandarin','mandarin','leader','shield','sniper','medic','kamikaze'];
    let cx = 0, cz = 0, cnt = 0; this.state.players.forEach(p => { cx += p.x; cz += p.z; cnt++; });
    if (cnt > 0) { cx /= cnt; cz /= cnt; }
    for (let i = 0; i < n; i++) { this.spawnEnemy(pool[Math.floor(rand() * pool.length)], cx, cz); }
    if (w % 2 === 0) this.spawnEnemy('tank', cx, cz);
    if (w % 3 === 0) this.spawnEnemy('heli', cx, cz);
    if (w >= 3 && w % 3 === 0) this.spawnBoss(cx, cz);
  }

  spawnBoss(cx, cz) {
    let hasBoss = false; this.state.enemies.forEach(e => { if (e.isBoss) hasBoss = true; });
    if (hasBoss) return;
    const type = BOSS_TYPES[Math.floor(rand() * BOSS_TYPES.length)];
    const tpl = ENEMY_TYPES[type]; const e = new Enemy();
    e.type = type; e.isBoss = true; e.maxHp = tpl.hp; e.hp = tpl.hp;
    const safe = this.findSafeSpawn(cx, cz, 55, 80); e.x = safe.x; e.z = safe.z;
    e.y = type === 'valkyrie' ? 18 : 0; e.ry = 0; e.anim = 1;
    const id = 'boss_' + type + '_' + Date.now();
    this.state.enemies.set(id, e); this.state.bossWave = this.state.wave;
    this.broadcast('boss_spawn', { bossType: type, enemyId: id, x: e.x, z: e.z });
  }

  spawnEnemy(type, cx, cz) {
    if (this.state.enemiesOff) return;
    const tpl = ENEMY_TYPES[type] || ENEMY_TYPES.mandarin;
    const e = new Enemy(); e.type = type; e.isBoss = !!tpl.isBoss; e.maxHp = tpl.hp; e.hp = tpl.hp;
    const safe = this.findSafeSpawn(cx, cz, 38, 58); e.x = safe.x; e.z = safe.z;
    e.y = type === 'heli' ? 24 : 0; e.ry = 0; e.anim = 1;
    this.state.enemies.set(type + '_' + (this.enemySeq++) + '_' + Date.now(), e);
  }

  spawnEnemyAt(type, x, z) {
    if (this.state.enemiesOff) return;
    const tpl = ENEMY_TYPES[type] || ENEMY_TYPES.mandarin;
    const e = new Enemy(); e.type = type; e.isBoss = false; e.maxHp = tpl.hp; e.hp = tpl.hp;
    e.x = x; e.z = z; e.y = 0; e.ry = 0; e.anim = 1;
    this.state.enemies.set(type + '_minion_' + (this.enemySeq++) + Date.now(), e);
  }

  killEnemy(id) {
    const e = this.state.enemies.get(id); if (!e) return;
    const wasBoss = e.isBoss; const tpl = ENEMY_TYPES[e.type] || ENEMY_TYPES.mandarin;
    const killerId = this.lastHitBy.get(id); const killer = killerId ? this.state.players.get(killerId) : null;
    
    if (killer) {
      killer.score += tpl.score || 100; killer.ep += tpl.ep || 30;
      killer.hp = Math.min(killer.maxHp, killer.hp + 20); killer.kills = (killer.kills || 0) + 1;
      this.broadcast('kill_reward', { killerId, killerName: killer.name, score: tpl.score || 100, ep: tpl.ep || 30, enemyType: e.type, isBoss: wasBoss });
      if (wasBoss) this.broadcast('kill_feed', { killer: killer.name, victim: e.type.toUpperCase(), isBoss: true });
    }
    
    this.state.enemies.delete(id); this.attackCooldowns.delete(id); this.bossAttackCd.delete(id); this.lastHitBy.delete(id);
    this.state.killedThisWave++; this.broadcast('enemy_die', { enemyId: id, type: e.type, isBoss: wasBoss });

    if (wasBoss) {
      this.state.wave += 2; this.state.killedThisWave = 0; this.state.goalThisWave = 6 + this.state.wave * 2;
      this.broadcast('wave_up', { wave: this.state.wave }); this.spawnWave(); return;
    }
    if (this.state.killedThisWave >= this.state.goalThisWave) {
      this.state.wave++; this.state.killedThisWave = 0; this.state.goalThisWave = 6 + this.state.wave * 2;
      this.broadcast('wave_up', { wave: this.state.wave }); this.spawnWave();
    }
  }

  tick(dt) {
    if (!this.state.players.size) return;

    this.state.players.forEach((p) => {
      if (p.dead) {
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) {
          p.dead = false; p.hp = p.maxHp; p.rooted = 0; p.frozen = 0;
          const safe = this.findSafeRespawn(p); p.x = safe.x; p.z = safe.z; p.y = 0;
        }
      }
      if (p.attackAnim > 0) p.attackAnim = Math.max(0, p.attackAnim - dt * 3);
      if (p.rooted > 0) p.rooted = Math.max(0, p.rooted - dt);
      if (p.frozen > 0) p.frozen = Math.max(0, p.frozen - dt);
      
      // ★ РЕГЕНЕРАЦИЯ HP (5 в секунду)
      if (!p.dead && p.hp < p.maxHp) {
        p.hp = Math.min(p.maxHp, p.hp + 5 * dt);
      }
    });

    this.state.spiders.forEach((sp, id) => {
      sp.life -= dt; if (sp.life <= 0) { this.state.spiders.delete(id); return; }
      
      let target = null;
      if (sp.targetId) {
        if (sp.targetType === 'player') target = this.state.players.get(sp.targetId);
        else if (sp.targetType === 'enemy') target = this.state.enemies.get(sp.targetId);
      }
      if (!target || target.dead) {
        let best = null, bestD = Infinity, bestType = null, bestId = '';
        this.state.players.forEach((p, sid) => { if (p.dead || sid === sp.owner) return; const d = distXZ(sp, p); if (d < bestD) { bestD = d; best = p; bestType = 'player'; bestId = sid; } });
        this.state.enemies.forEach((e, eid) => { const d = distXZ(sp, e); if (d < bestD) { bestD = d; best = e; bestType = 'enemy'; bestId = eid; } });
        if (best) { sp.targetId = bestId; sp.targetType = bestType; target = best; } else return;
      }
      
      const dx = target.x - sp.x, dz = target.z - sp.z; const dist = Math.sqrt(dx*dx + dz*dz);
      
      if (sp.isKamikaze && dist < 2.5) {
        this.broadcast('effect', { type: 'kamikaze', x: sp.x, y: 1, z: sp.z, radius: 6 });
        this.state.players.forEach(p => {
          if (!p.dead && (p.x - sp.x)**2 + (p.z - sp.z)**2 < 36) { p.hp -= 80; this.broadcast('pvp_hit', { attacker: 'Паук', target: p.name, targetId: p.name, damage: 80, ability: 'kamikaze' }); if(p.hp <= 0){p.dead=true;p.hp=0;p.respawnTimer=5;} }
        });
        this.state.enemies.forEach(e => {
          if ((e.x - sp.x)**2 + (e.z - sp.z)**2 < 36) { e.hp -= 150; if (e.hp <= 0) this.killEnemy(e.name); }
        });
        this.state.spiders.delete(id);
        return;
      }

      if (dist > (sp.isKamikaze ? 1 : 3)) {
        const nx = sp.x + dx * (1/(dist||1)) * (sp.isKamikaze ? 24 : 14) * dt;
        const nz = sp.z + dz * (1/(dist||1)) * (sp.isKamikaze ? 24 : 14) * dt;
        if (!this.isInsideBuilding(nx, nz, 0.5)) { sp.x = nx; sp.z = nz; }
      }
      
      if (!sp.isKamikaze) {
        const cdKey = 'spider_' + id;
        if ((this.attackCooldowns.get(cdKey) || 0) <= 0 && dist < 25) {
          this.attackCooldowns.set(cdKey, 0.6);
          if (sp.targetType === 'player') {
            target.hp -= 15;
            this.broadcast('pvp_hit', { attacker: 'Паук', target: target.name, targetId: sp.targetId, damage: 15, ability: 'spider_bite' });
            if (target.hp <= 0 && !target.dead) { target.dead = true; target.hp = 0; target.respawnTimer = 6; target.deaths++; this.broadcast('pvp_kill', { killer: 'Паук Лимона', victim: target.name }); }
          } else if (sp.targetType === 'enemy') {
            target.hp -= 22; this.lastHitBy.set(sp.targetId, sp.owner);
            this.broadcast('dmg', { enemyId: sp.targetId, amount: 22, crit: false });
            if (target.hp <= 0) this.killEnemy(sp.targetId);
          }
        } else { this.attackCooldowns.set(cdKey, (this.attackCooldowns.get(cdKey) || 0) - dt); }
      }
    });

    this.state.enemies.forEach((en, id) => {
      const tpl = ENEMY_TYPES[en.type] || ENEMY_TYPES.mandarin;
      let bestP = null, bestD3 = Infinity;
      this.state.players.forEach(p => { if (!p.dead) { const d3 = dist3D(p, en); if (d3 < bestD3) { bestD3 = d3; bestP = p; } } });
      if (!bestP) { en.anim = 0; return; }
      const dxz = Math.sqrt(distXZ(bestP, en)), dy = dyAbs(bestP, en);
      en.ry = Math.atan2(bestP.x - en.x, bestP.z - en.z);

      if (en.isBoss) {
        if ((this.bossAttackCd.get(id) || 0) > 0) this.bossAttackCd.set(id, this.bossAttackCd.get(id) - dt);
        else this._bossSpecialAttack(en, id, bestP, dxz, dy);
      }

      const stopD = tpl.attackRange * 0.8;
      if (dxz > stopD) {
        en.anim = 1;
        const nx = en.x + (bestP.x - en.x) * (1/(dxz||1)) * tpl.speed * dt;
        const nz = en.z + (bestP.z - en.z) * (1/(dxz||1)) * tpl.speed * dt;
        if (!this.isInsideBuilding(nx, nz, tpl.radius || 1.5)) { en.x = nx; en.z = nz; }
        else if (!this.isInsideBuilding(nx, en.z, tpl.radius || 1.5)) en.x = nx;
        else if (!this.isInsideBuilding(en.x, nz, tpl.radius || 1.5)) en.z = nz;
      } else {
        en.anim = 0;
        if (!en.isBoss && dy <= (tpl.maxAttackY || 3) && (this.attackCooldowns.get(id) || 0) <= 0) {
          this.attackCooldowns.set(id, tpl.attackCd);
          bestP.hp -= tpl.dmg; this.broadcast('enemy_attack', { enemyId: id, damage: tpl.dmg });
          if (bestP.hp <= 0 && !bestP.dead) { bestP.dead = true; bestP.hp = 0; bestP.respawnTimer = 5; this.broadcast('player_down', { name: bestP.name }); }
        } else if (!en.isBoss) { this.attackCooldowns.set(id, (this.attackCooldowns.get(id) || 0) - dt); }
      }
    });
  }

  _bossSpecialAttack(en, id, bestP, dxz, dy) {
    const t = en.type;
    if (t === 'titan') {
      if (dxz > 12 || dy > 8) { this.bossAttackCd.set(id, 0.5); return; }
      this.bossAttackCd.set(id, 2.4); this.broadcast('boss_attack', { bossType: 'titan', enemyId: id, x: en.x, z: en.z, radius: 6 });
      this.state.players.forEach(p => { if (!p.dead && Math.sqrt(distXZ(p, en)) <= 6 && dyAbs(p, en) <= 8) { p.hp -= 45; if (p.hp <= 0) { p.dead = true; p.hp = 0; p.respawnTimer = 5; this.broadcast('player_down', { name: p.name }); } } });
      return;
    }
    if (t === 'lemon') {
      if (dxz > 40 || dy > 15) { this.bossAttackCd.set(id, 0.5); return; }
      this.bossAttackCd.set(id, 3.5);
      for (let k = 0; k < 3; k++) {
        const lx = bestP.x + (rand() - 0.5) * 6, lz = bestP.z + (rand() - 0.5) * 6;
        this.broadcast('boss_attack', { bossType: 'lemon', enemyId: id, x: lx, z: lz, radius: 2.5 });
        if ((bestP.x-lx)**2 + (bestP.z-lz)**2 < 9 && dyAbs(bestP, en) < 15) { bestP.hp -= 18; if (bestP.hp <= 0) { bestP.dead = true; bestP.hp = 0; bestP.respawnTimer = 5; this.broadcast('player_down', { name: bestP.name }); } }
      }
      return;
    }
    if (t === 'valkyrie') {
      if (dxz > 45 || dy > 28) { this.bossAttackCd.set(id, 0.5); return; }
      this.bossAttackCd.set(id, 5.0); this.broadcast('boss_attack', { bossType: 'valkyrie', enemyId: id, x: bestP.x, z: bestP.z, radius: 5 });
      en.x = bestP.x + (rand() - 0.5) * 3; en.z = bestP.z + (rand() - 0.5) * 3; en.y = Math.max(18, bestP.y + 4);
      if ((bestP.x-en.x)**2 + (bestP.z-en.z)**2 <= 25 && dyAbs(bestP, en) < 10) { bestP.hp -= 35; if (bestP.hp <= 0) { bestP.dead = true; bestP.hp = 0; bestP.respawnTimer = 5; this.broadcast('player_down', { name: bestP.name }); } }
      return;
    }
    if (t === 'necromancer') {
      if (dxz > 50 || dy > 10) { this.bossAttackCd.set(id, 0.5); return; }
      this.bossAttackCd.set(id, 6.0);
      for (let k = 0; k < 3; k++) { const a = rand() * Math.PI * 2, r = 6 + rand() * 4; this.spawnEnemyAt('mandarin', en.x + Math.cos(a) * r, en.z + Math.sin(a) * r); }
      this.broadcast('boss_attack', { bossType: 'necromancer', enemyId: id, x: en.x, z: en.z, radius: 8 });
      bestP.hp -= 20; if (bestP.hp <= 0) { bestP.dead = true; bestP.hp = 0; bestP.respawnTimer = 5; this.broadcast('player_down', { name: bestP.name }); }
      return;
    }
  }
}
module.exports = { GameRoom };
