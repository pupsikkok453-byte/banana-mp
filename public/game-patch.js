// ============================================================================
// BANANA INDUSTRIES v9.6.0 — GLOBAL MONOLITHIC PATCH v65 (ULTIMATE NEXT-GEN OVERHAUL)
// Заменяет и расширяет game-patch (4).js (v53):
// 1. Полная совместимость с базой v53 и мультиплеером (window.__MP) + единый dt-диспетчер
// 2. Рельсовый гринд по 40 неоновым силовым кабелям и мостам (window.__SKY_RAILS)
// 3. Боевые Модули Эволюции для всех 5 героев в терминале (#lab-modal)
// 4. Анатомическая геометрия (LatheGeometry / ExtrudeGeometry), редизайн Картошки/Томата и Battle Damage (<50% HP)
// 5. 2-суставная кинематика с плавным Lerp, Smear Frames, Ribbon Trails и Death Ragdoll (window.__RAGDOLLS)
// 6. Аэро-спидеры (физические платформы), пожарные гидранты, пул PointLight, 3D-обломки, Shoulder Cam + Soft-Lock
// ============================================================================
(function () {
  'use strict';

  if (window.__PATCH_V65_LOADED) return;
  window.__PATCH_V65_LOADED = true;
  console.log('🍌 [PATCH v65] Загрузка ULTIMATE NEXT-GEN OVERHAUL для BANANA INDUSTRIES v9.6.0...');

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 1. СОСТОЯНИЕ МОДУЛЕЙ ЭВОЛЮЦИИ, ПУЛЫ ПАМЯТИ И БАЗОВЫЕ УТИЛИТЫ (v53)
  // ═══════════════════════════════════════════════════════════════════════════
  const EVO_STORAGE_KEY = 'banana_v65_evo_modules';
  const EvoModules = {
    owned: {},
    load() {
      try {
        const raw = localStorage.getItem(EVO_STORAGE_KEY);
        if (raw) this.owned = JSON.parse(raw) || {};
      } catch (e) {
        this.owned = {};
      }
    },
    save() {
      try {
        localStorage.setItem(EVO_STORAGE_KEY, JSON.stringify(this.owned));
      } catch (e) {}
    },
    has(id) {
      return !!this.owned[id];
    },
    buy(id, cost) {
      if (this.has(id) || typeof player === 'undefined' || player.ep < cost) return false;
      player.ep -= cost;
      this.owned[id] = true;
      this.save();
      if (typeof Save !== 'undefined' && Save.save) Save.save();
      if (typeof updateHUD === 'function') updateHUD();
      return true;
    }
  };
  EvoModules.load();
  window.__EVO_MODULES = EvoModules;

  // Глобальные реестры v65
  window.__SKY_RAILS = [];
  window.__RAGDOLLS = [];
  window.__AERIAL_SPEEDERS = [];
  window.__STREET_HYDRANTS = [];
  const activeTimedZones = []; // Лавовые гейзеры, огненные следы, грави-воронки, отложенные взрывы кетчупа
  const activeDebrisPieces = []; // Отстреленная броня врагов и 3D-камни из-под земли
  const activeChainArcs = []; // Дуги электро-цепи и кастетов

  // Всплывающие Toast-уведомления и система коронных фраз Моргенкартошки/Громтомата (из v53)
  const toastContainer = document.createElement('div');
  toastContainer.id = 'v65-toast-container';
  toastContainer.style.cssText =
    'position:fixed;top:92px;right:18px;z-index:85;display:flex;flex-direction:column;gap:8px;pointer-events:none;max-width:360px;';
  document.body.appendChild(toastContainer);

  function showPatchToast(title, text, borderColor) {
    const el = document.createElement('div');
    el.style.cssText =
      'background:rgba(10,14,18,0.94);border:2px solid #000;outline:2px solid ' + (borderColor || '#f9ca24') + ';' +
      'padding:8px 12px;color:#fff;font-size:12px;font-weight:800;transform:skewX(-4deg);' +
      'box-shadow:5px 5px 0 #000;transition:opacity 0.25s, transform 0.25s;';
    el.innerHTML =
      '<div style="color:' + (borderColor || '#f9ca24') + ';font-family:Bangers,Impact,sans-serif;font-size:16px;letter-spacing:1px;">' + title + '</div>' +
      '<div style="color:#eaffea;margin-top:2px;">' + text + '</div>';
    toastContainer.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'skewX(-4deg) translateX(30px)';
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 260);
    }, 3200);
  }
  window.showPatchToast = showPatchToast;

  const POTATO_QUOTES = [
    'Моргенкартошка: «Крахмал в жилах — молот в руках!»',
    'Моргенкартошка: «Кто не спрятался — тот пюре!»',
    'Моргенкартошка: «Белорусский джаггернаут на связи!»',
    'Громтомат: «Томатная паста из цитрусов готова!»',
    'Громтомат: «Жарьте соус, сейчас будет Сверхнова!»'
  ];

  // Блокировка голоса Шрекича для Картошки/Томата и отправка тостов
  if (typeof window.sayShrekich === 'function') {
    const _origSayShrekich = window.sayShrekich;
    window.sayShrekich = function (text, silent) {
      if (window.__POTATO_MODE) return;
      return _origSayShrekich.call(this, text, silent);
    };
  }
  if (typeof ShrekichVoice !== 'undefined' && typeof ShrekichVoice.speak === 'function') {
    const _origSpeak = ShrekichVoice.speak;
    ShrekichVoice.speak = function (text) {
      if (window.__POTATO_MODE) return;
      return _origSpeak.call(this, text);
    };
  }

  // Безопасная отправка пакетов в мультиплеер (window.__MP)
  function sendMP(type, payload) {
    try {
      if (window.__MP && window.__MP.room && typeof window.__MP.room.send === 'function') {
        window.__MP.room.send(type, payload);
      }
    } catch (e) {}
  }

  // 1.1. Отключение спавна кустов и генерация дополнительных холмов (база v53)
  if (typeof window.addProp === 'function') {
    const _origAddProp = window.addProp;
    window.addProp = function (x, z, type) {
      if (type === 'bush') return;
      return _origAddProp.apply(this, arguments);
    };
  }

  function spawnExtraCityHills() {
    if (typeof scene === 'undefined' || typeof createPrototypeShader !== 'function') return;
    const hillCoords = [
      [-420, -280, 32, 6.5],
      [410, 260, 38, 7.5],
      [-380, 340, 28, 5.5],
      [360, -320, 34, 6.8],
      [0, -440, 42, 8.0]
    ];
    const hillMat = createPrototypeShader(0x3a5a2a, 0x1a2a0a, 8, 0x88cc44);
    const hillGeo = new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    for (let i = 0; i < hillCoords.length; i++) {
      const [hx, hz, rad, ht] = hillCoords[i];
      const m = new THREE.Mesh(hillGeo, hillMat);
      m.position.set(hx, 0, hz);
      m.scale.set(rad, ht, rad);
      scene.add(m);
    }
  }

  // 1.2. Фикс высоты ног моркови над землёй (fixCarrotMeshGround из v53)
  let _carrotGroundCheckAccum = 0;
  function fixCarrotMeshGround() {
    if (typeof player === 'undefined' || !player.mesh || !player.mesh.userData || !player.mesh.userData.isCarrot) return;
    try {
      player.mesh.position.y = 0;
      player.mesh.updateMatrixWorld(true);
      const bbox = new THREE.Box3().setFromObject(player.mesh);
      const scaleY = (typeof playerGroup !== 'undefined' && playerGroup.scale.y) || 1;
      if (bbox.min.y < 0.08) {
        player.mesh.position.y += (0.08 - bbox.min.y) / scaleY;
      }
    } catch (e) {}
  }
  window.fixCarrotMeshGround = fixCarrotMeshGround;

  // 1.3. Цикл солнца и луны (TimeOfDay.speed = 1/90 + небесное светило)
  if (typeof TimeOfDay !== 'undefined') {
    TimeOfDay.speed = 1 / 90;
  }
  let _celestialBody = null;
  function initCelestialBody() {
    if (typeof scene === 'undefined' || _celestialBody) return;
    scene.traverse((o) => {
      if (o.geometry && o.geometry.type === 'SphereGeometry') {
        const p = o.geometry.parameters;
        if (p && p.radius >= 4000 && o !== skyDome) o.visible = false;
      }
    });
    _celestialBody = new THREE.Mesh(
      new THREE.SphereGeometry(95, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffee88, fog: false })
    );
    scene.add(_celestialBody);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 4.1. АНАТОМИЧЕСКИЕ ГЕОМЕТРИИ (LATHE / EXTRUDE) И ХЕЛПЕРЫ МОДЕЛЕЙ
  // ═══════════════════════════════════════════════════════════════════════════
  const SharedGeometries = {
    latheTorsoV: null,
    lathePauldron: null,
    latheNozzle: null,
    extrudeWarhammerHead: null,
    extrudeHexShield: null,
    extrudeFacetedBlade: null,
    debrisRock: null,
    armorShard: null,
    init() {
      if (this.latheTorsoV) return;

      // V-образный атлетический торс через LatheGeometry
      const torsoPts = [
        new THREE.Vector2(0.01, 0.0),
        new THREE.Vector2(0.56, 0.05),
        new THREE.Vector2(0.52, 0.35),
        new THREE.Vector2(0.64, 0.72),
        new THREE.Vector2(0.88, 1.18),
        new THREE.Vector2(0.92, 1.42),
        new THREE.Vector2(0.62, 1.58),
        new THREE.Vector2(0.01, 1.62)
      ];
      this.latheTorsoV = new THREE.LatheGeometry(torsoPts, 12);

      // Точёный наплечник через LatheGeometry
      const pauldronPts = [
        new THREE.Vector2(0.01, 0.0),
        new THREE.Vector2(0.46, 0.06),
        new THREE.Vector2(0.52, 0.22),
        new THREE.Vector2(0.38, 0.42),
        new THREE.Vector2(0.01, 0.48)
      ];
      this.lathePauldron = new THREE.LatheGeometry(pauldronPts, 10);

      // Реактивное сопло через LatheGeometry
      const nozzlePts = [
        new THREE.Vector2(0.18, 0.0),
        new THREE.Vector2(0.26, 0.14),
        new THREE.Vector2(0.14, 0.28),
        new THREE.Vector2(0.24, 0.46)
      ];
      this.latheNozzle = new THREE.LatheGeometry(nozzlePts, 10);

      // Двухголовый гранёный боевой молот Моргенкартошки со скошенными фасками через ExtrudeGeometry
      const hammerShape = new THREE.Shape();
      hammerShape.moveTo(-0.55, -0.36);
      hammerShape.lineTo(0.55, -0.36);
      hammerShape.lineTo(0.68, -0.18);
      hammerShape.lineTo(0.68, 0.18);
      hammerShape.lineTo(0.55, 0.36);
      hammerShape.lineTo(-0.55, 0.36);
      hammerShape.lineTo(-0.68, 0.18);
      hammerShape.lineTo(-0.68, -0.18);
      hammerShape.closePath();
      this.extrudeWarhammerHead = new THREE.ExtrudeGeometry(hammerShape, {
        depth: 0.62,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.12,
        bevelThickness: 0.12
      });
      this.extrudeWarhammerHead.center();

      // Гексагональный энергетический щит через ExtrudeGeometry
      const hexShape = new THREE.Shape();
      const hexR = 1.15;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const hx = Math.cos(a) * hexR;
        const hy = Math.sin(a) * hexR;
        if (i === 0) hexShape.moveTo(hx, hy);
        else hexShape.lineTo(hx, hy);
      }
      hexShape.closePath();
      this.extrudeHexShield = new THREE.ExtrudeGeometry(hexShape, {
        depth: 0.08,
        bevelEnabled: true,
        bevelSegments: 1,
        steps: 1,
        bevelSize: 0.05,
        bevelThickness: 0.04
      });
      this.extrudeHexShield.center();

      // Гранёное лезвие через ExtrudeGeometry
      const bladeShape = new THREE.Shape();
      bladeShape.moveTo(0, 0);
      bladeShape.lineTo(0.18, 0.25);
      bladeShape.lineTo(0.14, 1.45);
      bladeShape.lineTo(0, 1.85);
      bladeShape.lineTo(-0.14, 1.45);
      bladeShape.lineTo(-0.18, 0.25);
      bladeShape.closePath();
      this.extrudeFacetedBlade = new THREE.ExtrudeGeometry(bladeShape, {
        depth: 0.06,
        bevelEnabled: true,
        bevelSegments: 1,
        steps: 1,
        bevelSize: 0.03,
        bevelThickness: 0.03
      });
      this.extrudeFacetedBlade.center();

      this.debrisRock = new THREE.DodecahedronGeometry(0.65, 0);
      this.armorShard = new THREE.BoxGeometry(0.55, 0.42, 0.22);
    }
  };
  SharedGeometries.init();

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 2. РЕЛЬСОВЫЙ ГРИНД ПО МОСТАМ И НЕОНОВЫМ КАБЕЛЯМ (NEON SKY-RAIL GRINDING)
  // ═══════════════════════════════════════════════════════════════════════════
  function buildNeonSkyRails() {
    if (typeof buildings === 'undefined' || buildings.length < 4 || window.__SKY_RAILS.length > 0) return;

    const tallBuildings = buildings.filter((b) => b && b.topY > 35 && Math.abs(b.x) < 1800 && Math.abs(b.z) < 1800);
    const railColors = [0x00f2fe, 0xff0055, 0xf9ca24];
    const usedPairs = new Set();

    // Подключаем также существующие Skybridges
    const candidatePairs = [];
    for (let i = 0; i < tallBuildings.length; i++) {
      for (let j = i + 1; j < tallBuildings.length; j++) {
        const b1 = tallBuildings[i];
        const b2 = tallBuildings[j];
        const dist = Math.hypot(b1.x - b2.x, b1.z - b2.z);
        if (dist >= 45 && dist <= 165) {
          candidatePairs.push({ b1, b2, dist });
        }
      }
    }

    // Перемешиваем детерминированно для равномерного покрытия города
    candidatePairs.sort((a, b) => Math.abs(a.dist - 95) - Math.abs(b.dist - 95));

    const maxRails = Math.min(40, candidatePairs.length);
    const pulseTorusGeo = new THREE.TorusGeometry(0.52, 0.09, 6, 12);

    for (let idx = 0; idx < maxRails; idx++) {
      const pair = candidatePairs[idx];
      const key = pair.b1.x + ',' + pair.b1.z + '|' + pair.b2.x + ',' + pair.b2.z;
      if (usedPairs.has(key)) continue;
      usedPairs.add(key);

      const pStart = new THREE.Vector3(pair.b1.x, pair.b1.topY + 0.6, pair.b1.z);
      const pEnd = new THREE.Vector3(pair.b2.x, pair.b2.topY + 0.6, pair.b2.z);
      const sag = Math.min(12, pair.dist * 0.08);
      const pMid1 = pStart.clone().lerp(pEnd, 0.33);
      pMid1.y -= sag * 0.85;
      const pMid2 = pStart.clone().lerp(pEnd, 0.66);
      pMid2.y -= sag * 0.85;

      const curve = new THREE.CatmullRomCurve3([pStart, pMid1, pMid2, pEnd]);
      const colHex = railColors[idx % railColors.length];
      const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.28, 6, false);
      const tubeMat = new THREE.MeshBasicMaterial({ color: colHex });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      scene.add(tubeMesh);

      // Неоновые стойки-анкеры на крышах
      const pylonMat = createPrototypeShader(0x242c38, 0x0a0d12, 2, colHex);
      for (const anchorPt of [pStart, pEnd]) {
        const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.8, 6), pylonMat);
        pylon.position.copy(anchorPt).add(new THREE.Vector3(0, 0.3, 0));
        scene.add(pylon);
      }

      // Импульсные световые кольца, бегущие вдоль кабеля
      const pulseRings = [];
      for (let p = 0; p < 2; p++) {
        const prMesh = new THREE.Mesh(
          pulseTorusGeo,
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        scene.add(prMesh);
        pulseRings.push({ mesh: prMesh, t: p * 0.5 });
      }

      window.__SKY_RAILS.push({
        id: idx,
        curve,
        mesh: tubeMesh,
        color: colHex,
        length: curve.getLength(),
        pulseRings,
        bboxCenter: pStart.clone().lerp(pEnd, 0.5),
        maxHalfSpan: pair.dist * 0.6 + 15
      });
    }
    console.log('⚡ [PATCH v65] Построено неоновых рельсов Sky-Rail: ' + window.__SKY_RAILS.length);
  }

  function findClosestSkyRailPoint(pos, maxDist) {
    let bestRail = null;
    let bestT = 0;
    let bestPt = null;
    let bestDistSq = maxDist * maxDist;

    for (let i = 0; i < window.__SKY_RAILS.length; i++) {
      const r = window.__SKY_RAILS[i];
      const dxC = pos.x - r.bboxCenter.x;
      const dzC = pos.z - r.bboxCenter.z;
      if (dxC * dxC + dzC * dzC > r.maxHalfSpan * r.maxHalfSpan) continue;

      const steps = 16;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const pt = r.curve.getPoint(t);
        const dSq = pt.distanceToSquared(pos);
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestRail = r;
          bestT = t;
          bestPt = pt;
        }
      }
    }
    if (!bestRail) return null;
    // Локальное уточнение параметра t
    let fineT = bestT;
    for (let delta of [-0.03, -0.015, 0.015, 0.03]) {
      const nt = Math.max(0, Math.min(1, bestT + delta));
      const npt = bestRail.curve.getPoint(nt);
      const dSq = npt.distanceToSquared(pos);
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        fineT = nt;
        bestPt = npt;
      }
    }
    return { rail: bestRail, t: fineT, point: bestPt, dist: Math.sqrt(bestDistSq) };
  }

  function startSkyRailGrind(hit) {
    if (!hit || !hit.rail || player.isDead) return;
    player.isGrinding = true;
    player._grindRail = hit.rail;
    player._grindT = hit.t;
    player._grindCooldown = 0.35;

    const tangent = hit.rail.curve.getTangent(hit.t).normalize();
    const lookFwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw)).normalize();
    player._grindDir = tangent.dot(lookFwd) >= -0.1 ? 1 : -1;

    player.isGrounded = false;
    player.isFlying = false;
    player.isWallRunning = false;
    player.isBulletdropping = false;
    player.vel.set(0, 0, 0);
    player.momentum = 1.0;
    player.momentumMult = 1.8;

    const speedLines = document.getElementById('speed-lines');
    if (speedLines) speedLines.classList.add('hot');
    if (typeof postUniforms !== 'undefined' && postUniforms.uRadialBlur) {
      postUniforms.uRadialBlur.value = 0.85;
    }
    if (typeof SoundFX !== 'undefined') SoundFX.swing(540);
    if (typeof spawnComicPop === 'function') {
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3.2, 0)), '⚡ NEON SKY-RAIL GRIND! x1.8 ⚡', '#00f2fe');
    }
  }

  function exitSkyRailGrind(withJumpFlip) {
    if (!player.isGrinding) return;
    const rail = player._grindRail;
    const t = player._grindT || 0.5;
    const dirSign = player._grindDir || 1;
    let tangent = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
    if (rail && rail.curve) {
      tangent = rail.curve.getTangent(Math.max(0, Math.min(1, t))).normalize().multiplyScalar(dirSign);
    }

    player.isGrinding = false;
    player._grindRail = null;
    player._grindCooldown = 0.45;

    const speedLines = document.getElementById('speed-lines');
    if (speedLines) speedLines.classList.remove('hot');

    if (withJumpFlip) {
      player.vel.set(tangent.x * 58, 28, tangent.z * 58);
      player.airFlipTimer = 0.55;
      player.isGrounded = false;
      if (typeof SoundFX !== 'undefined') SoundFX.whip();
      if (typeof spawnComicPop === 'function') {
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '*САЛЬТО С РЕЛЬСА!*', '#f9ca24');
      }
    } else {
      player.vel.set(tangent.x * 42, 8, tangent.z * 42);
    }
  }

  function updateSkyRailsAndGrinding(dt, now) {
    if (player._grindCooldown > 0) player._grindCooldown = Math.max(0, player._grindCooldown - dt);

    // Анимация бегущих импульсных колец на ближайших рельсах
    for (let i = 0; i < window.__SKY_RAILS.length; i++) {
      const r = window.__SKY_RAILS[i];
      if (r.bboxCenter.distanceToSquared(player.pos) > 260 * 260) continue;
      for (let p = 0; p < r.pulseRings.length; p++) {
        const pr = r.pulseRings[p];
        pr.t = (pr.t + dt * 0.45) % 1.0;
        const pt = r.curve.getPoint(pr.t);
        const tan = r.curve.getTangent(pr.t);
        pr.mesh.position.copy(pt);
        pr.mesh.lookAt(pt.clone().add(tan));
      }
    }

    if (player.isGrinding && player._grindRail) {
      const rail = player._grindRail;
      const grindSpeed = 75;
      const dtParam = (grindSpeed / Math.max(10, rail.length)) * dt * player._grindDir;
      player._grindT += dtParam;

      if (player._grindT >= 1.0 || player._grindT <= 0.0) {
        player._grindT = Math.max(0, Math.min(1, player._grindT));
        exitSkyRailGrind(true);
        return;
      }

      const pt = rail.curve.getPoint(player._grindT);
      const tangent = rail.curve.getTangent(player._grindT).normalize().multiplyScalar(player._grindDir);

      player.pos.copy(pt).add(new THREE.Vector3(0, 0.35, 0));
      player.vel.set(0, 0, 0);
      player.isGrounded = false;
      player.facingYaw = Math.atan2(-tangent.x, -tangent.z);
      player.momentum = 1.0;
      player.momentumMult = 1.8;

      const speedLines = document.getElementById('speed-lines');
      if (speedLines) speedLines.classList.add('hot');
      if (typeof postUniforms !== 'undefined' && postUniforms.uRadialBlur) {
        postUniforms.uRadialBlur.value = 0.85;
      }

      // Наклон камеры в сторону поворота рельса
      const crossTurn = tangent.x * Math.cos(player.camYaw) - tangent.z * Math.sin(player.camYaw);
      player.camRoll = THREE.MathUtils.lerp(player.camRoll, THREE.MathUtils.clamp(crossTurn * 0.35, -0.32, 0.32), Math.min(1, dt * 10));

      // Искры из-под ног во время скольжения
      if (Math.random() < 0.85 && typeof spawnSparks === 'function') {
        spawnSparks(player.pos.clone().add(new THREE.Vector3(0, 0.1, 0)), 2, rail.color);
      }
      return;
    }

    // Автоматический захват рельса при падении сверху или нажатии Space в радиусе 4.5 м
    if (!player.isGrinding && (!player._grindCooldown || player._grindCooldown <= 0) && player.pos.y > 12) {
      if (!player.isGrounded || keys['Space']) {
        const hit = findClosestSkyRailPoint(player.pos, 4.5);
        if (hit && (keys['Space'] || (player.vel.y <= 2 && player.pos.y >= hit.point.y - 1.5))) {
          startSkyRailGrind(hit);
        }
      }
    }
  }

  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' && typeof player !== 'undefined' && !player.isDead) {
      if (player.isGrinding) {
        e.preventDefault();
        e.stopPropagation();
        exitSkyRailGrind(true);
      } else if ((!player._grindCooldown || player._grindCooldown <= 0) && player.pos.y > 10) {
        const hit = findClosestSkyRailPoint(player.pos, 4.5);
        if (hit) {
          e.preventDefault();
          e.stopPropagation();
          startSkyRailGrind(hit);
        }
      }
    }
  }, true);

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 3. ПРОКАЧКА И КАСТОМИЗАЦИЯ ВСЕХ 5 ГЕРОЕВ В ТЕРМИНАЛЕ (#lab-modal)
  // ═══════════════════════════════════════════════════════════════════════════
  const HERO_EVO_CATALOG = {
    pepper: [
      {
        id: 'pepper_blue_flame',
        icon: '🔥',
        title: '«Синее Пламя Сковилля»',
        cost: 300,
        desc: 'Огонь Перца, ауры кулаков, огненные волны и луч меняют цвет на неоново-синий (0x00e5ff), урон увеличивается на +35%, а атаки полностью игнорируют щиты (en._shield).'
      },
      {
        id: 'pepper_meteor_core',
        icon: '☄️',
        title: '«Метеоритное Ядро»',
        cost: 450,
        desc: 'Огненное падение (pepperDiveAttack) создаёт на земле лавовый гейзер на 6 секунд, периодически подбрасывающий и сжигающий врагов.'
      }
    ],
    carrot: [
      {
        id: 'carrot_poison_ivy',
        icon: '🌿',
        title: '«Ядовитый Плющ»',
        cost: 300,
        desc: 'Опутывание корнями carrotRootBind (F) становится кислотно-изумрудным, наносит периодический урон ядом и высасывает HP из всех связанных врагов, исцеляя Хохлорковь.'
      },
      {
        id: 'carrot_ancient_ent',
        icon: '🪨',
        title: '«Кора Древнего Энта»',
        cost: 450,
        desc: 'В Форме Гиганта (CARROT_FORM === 2) вокруг героя вращаются 3 каменные глыбы, блокирующие урон и сбивающие врагов с ног, а Морковный Бур (ПКМ) оставляет за собой линию земляных шипов.'
      }
    ],
    lemon: [
      {
        id: 'lemon_mega_hive',
        icon: '🕷️',
        title: '«Мега-Улей»',
        cost: 300,
        desc: 'Увеличивает лимит пауков-ботов LEMON_BOTS с 4 до 8 штук, ускоряет их стрельбу на 50% и даёт каждому пауку энергетический мини-щит (0x44ffaa), взрывающийся при таране.'
      },
      {
        id: 'lemon_bold_superconductor',
        icon: '⚡',
        title: '«Сверхпроводник BOLD»',
        cost: 450,
        desc: 'Плазменный луч при удержании ЛКМ (lemonPlasmaBeamTick) бьёт цепной дугой ещё по 3 ближайшим врагам.'
      }
    ],
    potato: [
      {
        id: 'potato_starch_juggernaut',
        icon: '🥔',
        title: '«Крахмальный Джаггернаут»',
        cost: 300,
        desc: 'Таран на F оставляет за собой пылающий огненно-земляной след на 5 секунд, а переключение форм на R (switchPotatoForm) вызывает гравитационную ударную волну, раскидывающую врагов вокруг.'
      },
      {
        id: 'potato_thermo_ketchup',
        icon: '🍅',
        title: '«Термоядерный Кетчуп»',
        cost: 450,
        desc: 'Струя соуса Громтомата (F) и Сверхнова (Q) замедляют врагов на 60% и детонируют повторным взрывом через 2 секунды.'
      }
    ],
    banana: [
      {
        id: 'banana_shrek_singularity',
        icon: '🌀',
        title: '«Сингулярность Шрекича»',
        cost: 500,
        desc: 'Ракета на G (fireRocket) при взрыве создаёт гравитационную воронку на 4 секунды, стягивающую всех врагов в радиусе 18 метров.'
      }
    ]
  };

  window.buyHeroEvoModule = function (modId, cost) {
    if (EvoModules.buy(modId, cost)) {
      SoundFX.devastator();
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3.2, 0)), '⚡ МОДУЛЬ ЭВОЛЮЦИИ АКТИВИРОВАН! ⚡', '#00ff66');
      showPatchToast('🧬 ТЕРМИНАЛ BI', 'Модуль эволюции успешно установлен!', '#00ff66');
      applyActiveEvoVisuals();
      window.renderLabTab('suits');
    } else {
      SoundFX.hit(120, 0.15);
      showPatchToast('⚠️ ОШИБКА СИНТЕЗА', 'Недостаточно очков EP для покупки модуля!', '#ff0055');
    }
  };

  const _origRenderLabTab = window.renderLabTab;
  window.renderLabTab = function (tabName) {
    if (tabName !== 'suits') {
      if (_origRenderLabTab) return _origRenderLabTab.apply(this, arguments);
      return;
    }

    document.getElementById('lab-ep-val').innerText = player.ep;
    document.getElementById('lab-score-val').innerText = player.score.toLocaleString('ru-RU');
    document.getElementById('lab-wave-val').innerText = player.wave;
    const container = document.getElementById('lab-content');
    if (!container) return;
    container.innerHTML = '';

    let activeCharKey = 'banana';
    if (window.__POTATO_MODE || player.character === 'potato') activeCharKey = 'potato';
    else if (PEPPER_MODE || player.character === 'pepper') activeCharKey = 'pepper';
    else if (CARROT_MODE || player.character === 'carrot') activeCharKey = 'carrot';
    else if (LEMON_MODE || player.character === 'lemon') activeCharKey = 'lemon';

    // Если играет Егорбанан — рендерим стандартные 5 костюмов + карточку Сингулярности Шрекича
    if (activeCharKey === 'banana') {
      const suitGrid = document.createElement('div');
      suitGrid.className = 'lab-grid';
      SUITS.forEach((s, i) => {
        const cost = s.level * 60;
        const m = 1 + (s.level - 1) * 0.25;
        const card = document.createElement('div');
        card.className = 'lab-card' + (player.suitIdx === i ? ' active' : '');
        card.innerHTML =
          `<div><h3>[${i}] ${s.name} (Ур. ${s.level})</h3><p>${s.desc}</p>` +
          `<div style="font-size:11px;color:#7bed9f;margin-bottom:8px;font-weight:900;">❤️ ${Math.round(s.maxHp * m)} | ⚡ ${Math.round(s.maxEn * m)} | ⚔️ ${Math.round(s.dmg * m)}</div></div>` +
          `<div><button class="lab-btn" style="width:100%;background:#f9ca24;" onclick="window.equipSuit(${i});window.renderLabTab('suits');">${player.suitIdx === i ? '✓ АКТИВНЫЙ' : 'АКТИВИРОВАТЬ'}</button>` +
          `<button class="lab-btn" style="width:100%;background:#00d2d3;margin-top:5px;" onclick="window.upgradeSuit(${i})">⬆️ +25% — ${cost} EP</button></div>`;
        suitGrid.appendChild(card);
      });
      container.appendChild(suitGrid);
    }

    // Блок Боевых Модулей Эволюции для текущего героя + переключатель всех 5 героев
    const evoHeader = document.createElement('div');
    evoHeader.style.cssText = 'margin:16px 0 10px;padding:8px 12px;background:#14281d;border-left:4px solid #f9ca24;font-weight:900;color:#f9ca24;font-size:14px;text-transform:uppercase;';
    evoHeader.innerText = '⚡ БОЕВЫЕ МОДУЛИ ЭВОЛЮЦИИ (ВСЕ 5 ГЕРОЕВ BANANA INDUSTRIES)';
    container.appendChild(evoHeader);

    const evoGrid = document.createElement('div');
    evoGrid.className = 'lab-grid';

    const order = [activeCharKey, ...['banana', 'pepper', 'carrot', 'lemon', 'potato'].filter((k) => k !== activeCharKey)];
    const charNames = {
      banana: '🍌 ЕГОРБАНАН',
      pepper: '🌶️ КАПИТАН ПЕРЕЦ',
      carrot: '🥕 ХОХЛОРКОВЬ',
      lemon: '🍋 ДИМОН ЛИМОН',
      potato: '🥔 МОРГЕНКАРТОШКА / ГРОМТОМАТ'
    };

    order.forEach((cKey) => {
      const mods = HERO_EVO_CATALOG[cKey] || [];
      mods.forEach((mod) => {
        const isOwned = EvoModules.has(mod.id);
        const canAfford = player.ep >= mod.cost;
        const isCurrentHero = cKey === activeCharKey;
        const card = document.createElement('div');
        card.className = 'lab-card' + (isOwned ? ' active' : '');
        card.style.outlineColor = isOwned ? '#00ff66' : (isCurrentHero ? '#00f2fe' : '#2ecc71');
        card.innerHTML =
          `<div>` +
            `<div style="font-size:10px;color:#00f2fe;font-weight:900;margin-bottom:3px;">${charNames[cKey]} ${isCurrentHero ? '· [ВАШ ГЕРОЙ]' : ''}</div>` +
            `<h3>${mod.icon} ${mod.title}</h3>` +
            `<p>${mod.desc}</p>` +
          `</div>` +
          `<div>` +
            (isOwned
              ? `<button class="lab-btn" style="width:100%;background:#00ff66;color:#000;" disabled>✓ МОДУЛЬ УСТАНОВЛЕН</button>`
              : `<button class="lab-btn" style="width:100%;background:${canAfford ? '#f9ca24' : '#444'};color:${canAfford ? '#000' : '#999'};" ${canAfford ? '' : 'disabled'} onclick="window.buyHeroEvoModule('${mod.id}', ${mod.cost})">КУПИТЬ ЗА ${mod.cost} EP</button>`) +
          `</div>`;
        evoGrid.appendChild(card);
      });
    });

    container.appendChild(evoGrid);
  };

  function applyActiveEvoVisuals() {
    // 1. Синее Пламя Сковилля для Перца
    if (PEPPER_MODE && EvoModules.has('pepper_blue_flame') && player.mesh && player.mesh.userData) {
      const ud = player.mesh.userData;
      [ud.fistL, ud.fistR, ud.fistAuraL, ud.fistAuraR, ud.fireAura, ud.innerAura].forEach((m) => {
        if (m && m.material && m.material.color) m.material.color.setHex(0x00e5ff);
      });
      if (typeof heroAuraLight !== 'undefined') heroAuraLight.color.setHex(0x00e5ff);
    }
    // 2. Кора Древнего Энта (3 вращающиеся каменные глыбы вокруг Гиганта Хохлоркови)
    updateEntBouldersMesh();
  }

  let _entBoulderGroup = null;
  function updateEntBouldersMesh() {
    const shouldHave = CARROT_MODE && CARROT_FORM === 2 && EvoModules.has('carrot_ancient_ent') && !player.isDead;
    if (!shouldHave) {
      if (_entBoulderGroup && _entBoulderGroup.parent) {
        _entBoulderGroup.parent.remove(_entBoulderGroup);
      }
      _entBoulderGroup = null;
      return;
    }
    if (!_entBoulderGroup) {
      _entBoulderGroup = new THREE.Group();
      const rockMat = createPrototypeShader(0x6e5a44, 0x2e2214, 7, 0x2ecc71);
      for (let i = 0; i < 3; i++) {
        const rock = addInkOutline(new THREE.Mesh(SharedGeometries.debrisRock, rockMat), 1.05);
        rock.scale.setScalar(1.35);
        const a = (i / 3) * Math.PI * 2;
        rock.position.set(Math.cos(a) * 2.4, 1.8, Math.sin(a) * 2.4);
        _entBoulderGroup.add(rock);
      }
      playerGroup.add(_entBoulderGroup);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 4.2. СЕЛ-ШЕЙДИНГ И АНАТОМИЧЕСКИЙ РЕДИЗАЙН МОРГЕНКАРТОШКИ / ГРОМТОМАТА
  // ═══════════════════════════════════════════════════════════════════════════
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

  window.createPotatoMesh = function (form) {
    form = form === 2 ? 2 : 1;
    SharedGeometries.init();

    const g = new THREE.Group();
    const pelvis = new THREE.Group();
    pelvis.position.y = 1.65;
    g.add(pelvis);

    const spine = new THREE.Group();
    pelvis.add(spine);
    const neck = new THREE.Group();
    neck.position.y = 1.92;
    spine.add(neck);
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.35;
    neck.add(headGroup);

    const armL = new THREE.Group();
    armL.position.set(-1.06, 1.56, 0);
    spine.add(armL);
    const armR = new THREE.Group();
    armR.position.set(1.06, 1.56, 0);
    spine.add(armR);
    const legL = new THREE.Group();
    legL.position.set(-0.38, 0, 0);
    pelvis.add(legL);
    const legR = new THREE.Group();
    legR.position.set(0.38, 0, 0);
    pelvis.add(legR);

    const isMorg = form === 1;
    // Фирменный сел-шейдинг createPrototypeShader + addInkOutline
    const bodyMat = isMorg
      ? createPrototypeShader(0x8b4513, 0x3e1f08, 7, 0xf9ca24)
      : createPrototypeShader(0x880814, 0xff3800, 10, 0xffaa00);
    const skinMat = isMorg
      ? createPrototypeShader(0xd8b48a, 0x8c6239, 4, 0xffeaa7)
      : createPrototypeShader(0xff2200, 0x800000, 10, 0xfff200);
    const rootArmorMat = isMorg
      ? createPrototypeShader(0x4e342e, 0x1f120e, 2, 0x2ecc71)
      : createPrototypeShader(0x1b5e20, 0x0a280e, 8, 0x44ffaa);
    const legMat = createPrototypeShader(0x242830, 0x0d1014, 9, isMorg ? 0xf9ca24 : 0xff2200);
    const beardMat = createPrototypeShader(0x2c1b10, 0x120a05, 8, 0xd4a017);
    const goldMat = createPrototypeShader(0xf9ca24, 0xb8860b, 9, 0xffffff);

    // Анатомический V-образный торс через LatheGeometry
    const torso = addInkOutline(new THREE.Mesh(SharedGeometries.latheTorsoV, bodyMat), 1.045);
    torso.scale.set(1.08, 1.0, 0.92);
    spine.add(torso);

    const magmaVeins = [];
    const knuckleArcs = [];

    if (isMorg) {
      // Рельефная броня корней на груди и плечах
      for (let r = 0; r < 4; r++) {
        const rib = addInkOutline(new THREE.Mesh(new THREE.TorusGeometry(0.68 + r * 0.05, 0.07, 6, 12, Math.PI * 1.15), rootArmorMat), 1.04);
        rib.rotation.x = Math.PI / 2 + 0.15;
        rib.rotation.z = -0.18;
        rib.position.set(0, 0.52 + r * 0.24, 0.12);
        spine.add(rib);
      }
      // Ремень с массивной золотой пряжкой
      const belt = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.24, 12), rootArmorMat), 1.04);
      belt.position.y = 0.22;
      spine.add(belt);
      const buckle = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.30, 0.16), goldMat), 1.05);
      buckle.position.set(0, 0.22, 0.62);
      spine.add(buckle);

      // Пышная многослойная борода
      for (let layer = 0; layer < 3; layer++) {
        const bCone = addInkOutline(
          new THREE.Mesh(new THREE.ConeGeometry(0.42 - layer * 0.06, 0.65 + layer * 0.18, 9), beardMat),
          1.045
        );
        bCone.rotation.x = Math.PI - 0.12;
        bCone.position.set(0, 0.08 - layer * 0.18, 0.44 + layer * 0.04);
        headGroup.add(bCone);
      }
      const mustache = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.12, 0.16), beardMat), 1.04);
      mustache.position.set(0, 0.24, 0.52);
      headGroup.add(mustache);

      for (let s of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.06), new THREE.MeshBasicMaterial({ color: 0xffeaa7 }));
        eye.position.set(s * 0.19, 0.44, 0.49);
        headGroup.add(eye);
      }
    } else {
      // Пульсирующие магматические жилы на торсе Громтомата
      for (let v = 0; v < 5; v++) {
        const vein = new THREE.Mesh(
          new THREE.TorusGeometry(0.62 + (v % 2) * 0.12, 0.045, 6, 14, Math.PI),
          new THREE.MeshBasicMaterial({ color: 0xfff200 })
        );
        vein.position.set(0, 0.42 + v * 0.22, 0.1);
        vein.rotation.x = Math.PI / 2 + (v - 2) * 0.18;
        spine.add(vein);
        magmaVeins.push(vein);
      }
      // Огненный гребень и зелёная корона чашелистика
      for (let c = 0; c < 5; c++) {
        const crestSpike = addInkOutline(new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.52 + (2 - Math.abs(c - 2)) * 0.15, 6), new THREE.MeshBasicMaterial({ color: 0xffaa00 })), 1.04);
        crestSpike.position.set(0, 0.85, 0.22 - c * 0.14);
        crestSpike.rotation.x = -0.25 + c * 0.12;
        headGroup.add(crestSpike);
      }
      for (let s of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfff200 }));
        eye.position.set(s * 0.2, 0.44, 0.48);
        headGroup.add(eye);
      }
    }

    const head = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(0.54, 14, 12), skinMat), 1.045);
    head.position.y = 0.38;
    head.scale.set(1.0, 1.08, 0.98);
    headGroup.add(head);

    function buildArm(sideGroup, sign) {
      // Точёный наплечник через LatheGeometry
      const pauldron = addInkOutline(new THREE.Mesh(SharedGeometries.lathePauldron, rootArmorMat), 1.045);
      pauldron.position.set(sign * 0.08, -0.08, 0);
      pauldron.rotation.z = -sign * 0.35;
      sideGroup.add(pauldron);

      const upperArm = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.17, 0.72, 8), bodyMat), 1.045);
      upperArm.position.y = -0.36;
      sideGroup.add(upperArm);

      const elbow = new THREE.Group();
      elbow.position.y = -0.72;
      sideGroup.add(elbow);

      const foreArm = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.15, 0.66, 8), skinMat), 1.045);
      foreArm.position.y = -0.33;
      elbow.add(foreArm);

      const wrist = new THREE.Group();
      wrist.position.y = -0.66;
      elbow.add(wrist);

      const fist = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), isMorg ? skinMat : rootArmorMat), 1.045);
      fist.position.y = -0.10;
      wrist.add(fist);

      let weaponMesh = fist;
      if (isMorg && sideGroup === armR) {
        // Массивный двухголовый боевой молот через ExtrudeGeometry со светящимися рунами земли
        const hammerGroup = new THREE.Group();
        const shaft = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 2.05, 8), rootArmorMat), 1.04);
        shaft.position.y = -0.95;
        hammerGroup.add(shaft);

        const headMat = createPrototypeShader(0x5a626a, 0x1e2226, 2, 0x2ecc71);
        const hHead = addInkOutline(new THREE.Mesh(SharedGeometries.extrudeWarhammerHead, headMat), 1.045);
        hHead.position.y = -1.92;
        hammerGroup.add(hHead);

        // Светящиеся руны земли на молоте
        const runeMat = new THREE.MeshBasicMaterial({ color: 0x2ecc71 });
        for (let sideZ of [-0.33, 0.33]) {
          const runeRing = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.22, 6), runeMat);
          runeRing.position.set(0, -1.92, sideZ);
          hammerGroup.add(runeRing);
        }
        wrist.add(hammerGroup);
        weaponMesh = hammerGroup;
      } else if (!isMorg) {
        // Шипованные зелёные кастеты с дугами электричества для Громтомата
        for (let k = -1; k <= 1; k++) {
          const spike = addInkOutline(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.26, 5), rootArmorMat), 1.04);
          spike.rotation.x = Math.PI / 2;
          spike.position.set(k * 0.11, -0.12, 0.26);
          wrist.add(spike);
        }
        const arcRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.28, 0.025, 5, 10),
          new THREE.MeshBasicMaterial({ color: 0x00f2fe, wireframe: true })
        );
        arcRing.position.y = -0.12;
        wrist.add(arcRing);
        knuckleArcs.push(arcRing);
      }

      return { shoulder: sideGroup, elbow, wrist, fist: weaponMesh };
    }

    const armLData = buildArm(armL, -1);
    const armRData = buildArm(armR, 1);

    function buildLeg(sideGroup) {
      const thigh = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.21, 0.85, 8), legMat), 1.045);
      thigh.position.y = -0.42;
      sideGroup.add(thigh);
      const knee = new THREE.Group();
      knee.position.y = -0.85;
      sideGroup.add(knee);
      const shin = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.18, 0.85, 8), legMat), 1.045);
      shin.position.y = -0.42;
      knee.add(shin);
      const boot = addInkOutline(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.20, 0.52), rootArmorMat), 1.045);
      boot.position.set(0, -0.82, 0.10);
      knee.add(boot);
      return { hip: sideGroup, knee };
    }

    const legLData = buildLeg(legL);
    const legRData = buildLeg(legR);

    g.userData = {
      pelvis,
      spine,
      neck,
      headGroup,
      armL: armLData,
      armR: armRData,
      legL: legLData,
      legR: legRData,
      magmaVeins,
      knuckleArcs,
      limeShield: null,
      backTentacles: null,
      isPotato: true,
      potatoForm: form
    };
    return g;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 4.3. ДЕТАЛИЗАЦИЯ ВРАГОВ И СИСТЕМА BATTLE DAMAGE (< 50% HP)
  // ═══════════════════════════════════════════════════════════════════════════
  function enhanceEnemyModel(en) {
    if (!en || !en.group || en._v65Enhanced) return;
    en._v65Enhanced = true;
    const g = en.group;

    // 1. Снайпер: красный лазерный луч прицеливания (THREE.Line)
    if (en._sniper || en.type === 'sniper') {
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 2.5, 0.8),
        new THREE.Vector3(0, 2.5, 38)
      ]);
      const laserLine = new THREE.Line(
        lineGeo,
        new THREE.LineBasicMaterial({ color: 0xff0033, transparent: true, opacity: 0.75 })
      );
      g.add(laserLine);
      en._sniperLaser = laserLine;
    }

    // 2. Щитовик: энергетический гексагональный барьер (ExtrudeGeometry)
    if (en._shield || en.type === 'shield') {
      const hexMat = new THREE.MeshBasicMaterial({
        color: 0x00f2fe,
        transparent: true,
        opacity: 0.42,
        wireframe: false
      });
      const hexBarrier = new THREE.Mesh(SharedGeometries.extrudeHexShield, hexMat);
      hexBarrier.position.set(-0.95, 2.2, 0.85);
      hexBarrier.rotation.y = -0.25;
      g.add(hexBarrier);
      en._hexBarrierMesh = hexBarrier;
    }

    // 3. Медик: парящий мед-дрон на орбите
    if (en._medic || en.type === 'medic') {
      const droneG = new THREE.Group();
      const dBody = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.32, 0),
        new THREE.MeshBasicMaterial({ color: 0x00ff66 })
      );
      const dRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.45, 0.04, 4, 12),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      dRing.rotation.x = Math.PI / 2;
      droneG.add(dBody, dRing);
      droneG.position.set(1.2, 3.6, 0);
      g.add(droneG);
      en._medDrone = droneG;
    }

    // 4. Камикадзе: мигающие бочки на спине
    if (en._kamikaze || en.type === 'kamikaze') {
      const barrelGroup = new THREE.Group();
      const bMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
      for (let side of [-0.32, 0.32]) {
        const brl = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.95, 8), bMat.clone());
        brl.position.set(side, 2.35, -0.48);
        barrelGroup.add(brl);
      }
      g.add(barrelGroup);
      en._kamikazeBarrels = barrelGroup;
    }

    // 5. Танк (APC): ссылки на колёса и ствол для вращения и отдачи
    if (en.type === 'tank' && !en._isStoryConstruct && !en._isPhasePylon) {
      en._tankWheels = [];
      g.traverse((child) => {
        if (child.isMesh && child.geometry && child.geometry.type === 'CylinderGeometry') {
          if (Math.abs(child.position.y - 0.85) < 0.2) en._tankWheels.push(child);
          if (Math.abs(child.position.y - 3.0) < 0.2 && child.position.z > 1.0) en._tankBarrel = child;
        }
      });
    }

    // 6. Вертолёт (heli): хвостовой винт
    if (en.type === 'heli' && !en._isStoryConstruct) {
      const tailRotor = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.9, 0.22),
        new THREE.MeshBasicMaterial({ color: 0x111111 })
      );
      tailRotor.position.set(0.22, 0.65, -4.35);
      g.add(tailRotor);
      en._tailRotor = tailRotor;
    }
  }

  // Перехват спавнеров врагов для мгновенного улучшения моделей
  ['spawnCitrusSoldier', 'spawnCitrusAPC', 'spawnCitrusHeli'].forEach((fnName) => {
    if (typeof window[fnName] === 'function') {
      const _orig = window[fnName];
      window[fnName] = function () {
        const res = _orig.apply(this, arguments);
        if (enemies.length > 0) enhanceEnemyModel(enemies[enemies.length - 1]);
        return res;
      };
    }
  });

  function triggerEnemyBattleDamage(en) {
    if (!en || en._battleDamaged || !en.group) return;
    const isHeavyOrBoss =
      en._isBoss || en.type === 'brawler' || en.type === 'tank' || en.type === 'heli' ||
      en.type === 'titan' || en.type === 'lemon' || en.type === 'valkyrie' || en.type === 'necromancer';
    if (!isHeavyOrBoss) return;

    en._battleDamaged = true;
    const worldPos = en.group.position.clone().add(new THREE.Vector3(0, 2.6, 0));

    // Отстреливаем 3 куска обшивки/наплечника с физикой разлёта
    const shardMat = createPrototypeShader(0x8a5a30, 0x221105, 7, 0xff4400);
    for (let i = 0; i < 3; i++) {
      const shard = addInkOutline(new THREE.Mesh(SharedGeometries.armorShard, shardMat), 1.04);
      shard.position.copy(worldPos).add(new THREE.Vector3((Math.random() - 0.5) * 1.5, Math.random() * 1.5, (Math.random() - 0.5) * 1.5));
      scene.add(shard);
      activeDebrisPieces.push({
        mesh: shard,
        vel: new THREE.Vector3((Math.random() - 0.5) * 18, 10 + Math.random() * 10, (Math.random() - 0.5) * 18),
        rotVel: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
        life: 1.35,
        sinkPhase: false,
        sharedGeo: true
      });
    }

    // Оголяем светящееся нестабильное ядро в корпусе
    const exposedCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(en._isBoss ? 1.1 : 0.55, 0),
      new THREE.MeshBasicMaterial({ color: 0xff3300 })
    );
    exposedCore.position.set(0, en._isBoss ? 6.0 : 2.2, 0.65);
    en.group.add(exposedCore);
    en._exposedCoreMesh = exposedCore;

    if (typeof spawnComicPop === 'function') {
      spawnComicPop(worldPos.clone().add(new THREE.Vector3(0, 2.5, 0)), '💥 БРОНЯ ПРОБИТА! ЯДРО ОГОЛЕНО! 💥', '#ff9f1a');
    }
    if (typeof SoundFX !== 'undefined') SoundFX.boom();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 5. СГЛАЖЕННАЯ 2-СУСТАВНАЯ КИНЕМАТИКА, SMEAR FRAMES, RIBBON TRAILS И РЭГДОЛЛ
  // ═══════════════════════════════════════════════════════════════════════════
  function lerpAngle(cur, target, alpha) {
    return THREE.MathUtils.lerp(cur || 0, target, alpha);
  }

  // Динамический ленточный шлейф (Ribbon Trail на 6 точек за бьющей кистью)
  const weaponTrailHistory = [];
  const MAX_TRAIL_POINTS = 6;
  const trailPositionsAttr = new THREE.BufferAttribute(new Float32Array((MAX_TRAIL_POINTS - 1) * 6 * 3), 3);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', trailPositionsAttr);
  const trailMat = new THREE.MeshBasicMaterial({
    color: 0xff0055,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const weaponRibbonMesh = new THREE.Mesh(trailGeo, trailMat);
  weaponRibbonMesh.frustumCulled = false;
  weaponRibbonMesh.visible = false;
  scene.add(weaponRibbonMesh);

  function updateWeaponSmearAndRibbonTrail(dt) {
    if (!player.mesh || !player.mesh.userData) return;
    const ud = player.mesh.userData;
    const isStriking = player.attackTimer > 0.02;

    const armR = ud.armR;
    const armL = ud.armL;
    const activeHand = (player.comboStep % 2 === 0 && armL) ? armL : (armR || armL);
    const strikeNode = activeHand ? (activeHand.wrist || activeHand.elbow || activeHand.pivot || activeHand.shoulder) : null;
    const smearMesh = activeHand ? (activeHand.fist || activeHand.wrist || activeHand.elbow) : null;

    if (isStriking && strikeNode) {
      const p = 1 - player.attackTimer / Math.max(0.05, player.attackDuration || 0.25);
      const inFastStrike = p >= 0.22 && p <= 0.72;

      // Smear Frame: растягивание ударного кулака/молота в быстрой фазе
      if (smearMesh && smearMesh.scale) {
        if (inFastStrike) {
          smearMesh.scale.set(1.2, 1.45, 1.2);
        } else {
          smearMesh.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, dt * 16));
        }
      }

      const wp = new THREE.Vector3();
      strikeNode.getWorldPosition(wp);
      const upOffset = new THREE.Vector3(0, 0.42, 0);
      weaponTrailHistory.unshift({
        top: wp.clone().add(upOffset),
        bot: wp.clone().sub(upOffset)
      });
      if (weaponTrailHistory.length > MAX_TRAIL_POINTS) weaponTrailHistory.pop();

      if (weaponTrailHistory.length >= 2) {
        const arr = trailPositionsAttr.array;
        let ptr = 0;
        for (let i = 0; i < weaponTrailHistory.length - 1; i++) {
          const a = weaponTrailHistory[i];
          const b = weaponTrailHistory[i + 1];
          // Треугольник 1
          arr[ptr++] = a.top.x; arr[ptr++] = a.top.y; arr[ptr++] = a.top.z;
          arr[ptr++] = a.bot.x; arr[ptr++] = a.bot.y; arr[ptr++] = a.bot.z;
          arr[ptr++] = b.top.x; arr[ptr++] = b.top.y; arr[ptr++] = b.top.z;
          // Треугольник 2
          arr[ptr++] = a.bot.x; arr[ptr++] = a.bot.y; arr[ptr++] = a.bot.z;
          arr[ptr++] = b.bot.x; arr[ptr++] = b.bot.y; arr[ptr++] = b.bot.z;
          arr[ptr++] = b.top.x; arr[ptr++] = b.top.y; arr[ptr++] = b.top.z;
        }
        for (; ptr < arr.length; ptr++) arr[ptr] = wp.x;
        trailPositionsAttr.needsUpdate = true;

        let trailCol = getSuitData().slashColor || 0xff0055;
        if (PEPPER_MODE && EvoModules.has('pepper_blue_flame')) trailCol = 0x00e5ff;
        else if (window.__POTATO_MODE) trailCol = window.__POTATO_FORM === 1 ? 0x2ecc71 : 0xff2200;
        trailMat.color.setHex(trailCol);
        trailMat.opacity = 0.62;
        weaponRibbonMesh.visible = true;
      }
    } else {
      if (smearMesh && smearMesh.scale) {
        smearMesh.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, dt * 14));
      }
      trailMat.opacity = Math.max(0, trailMat.opacity - dt * 4.5);
      if (trailMat.opacity <= 0.02) {
        weaponRibbonMesh.visible = false;
        weaponTrailHistory.length = 0;
      }
    }
  }

  // Плавная двухсуставная процедурная кинематика героя (Shoulder -> Elbow -> Wrist, Hip -> Knee, Spine Twist, Banking)
  let _prevFacingYaw = 0;
  function applySmoothHeroKinematics(dt, now) {
    if (!player.mesh || !player.mesh.userData) return;
    const ud = player.mesh.userData;
    const kLerp = Math.min(1, dt * 14);

    // Вычисляем угловую скорость поворота для Banking (наклона таза внутрь виража)
    let yawDelta = player.facingYaw - _prevFacingYaw;
    while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
    while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
    _prevFacingYaw = player.facingYaw;

    const hSpeed = Math.hypot(player.vel.x, player.vel.z);
    const isMoving = keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD'] || hSpeed > 3.5;
    const isSprint = keys['ShiftLeft'] || keys['ShiftRight'];
    const bankTarget = isMoving ? THREE.MathUtils.clamp(-yawDelta * 5.5, -0.28, 0.28) : 0;

    if (ud.pelvis) {
      ud.pelvis.rotation.z = lerpAngle(ud.pelvis.rotation.z, bankTarget, kLerp);
    }

    // Поворот головы за камерой и боевое дыхание
    if (ud.headGroup || ud.neck) {
      const headNode = ud.headGroup || ud.neck;
      let lookDiff = player.camYaw - player.facingYaw;
      while (lookDiff > Math.PI) lookDiff -= Math.PI * 2;
      while (lookDiff < -Math.PI) lookDiff += Math.PI * 2;
      const targetHeadYaw = THREE.MathUtils.clamp(lookDiff * 0.55, -0.65, 0.65);
      const targetHeadPitch = THREE.MathUtils.clamp(-player.camPitch * 0.35, -0.35, 0.35);
      headNode.rotation.y = lerpAngle(headNode.rotation.y, targetHeadYaw, kLerp);
      headNode.rotation.x = lerpAngle(headNode.rotation.x, targetHeadPitch, kLerp);
    }

    // Пульсация жил Громтомата и искр на кастетах
    if (ud.magmaVeins && ud.magmaVeins.length) {
      const pulse = 0.7 + 0.3 * Math.sin(now * 0.01);
      for (let i = 0; i < ud.magmaVeins.length; i++) {
        ud.magmaVeins[i].scale.setScalar(0.95 + pulse * 0.1);
      }
    }
    if (ud.knuckleArcs && ud.knuckleArcs.length) {
      for (let i = 0; i < ud.knuckleArcs.length; i++) {
        ud.knuckleArcs[i].rotation.x += dt * 12;
        ud.knuckleArcs[i].rotation.y += dt * 9;
      }
    }

    // Многофазная анимация ударов Моргенкартошки и Громтомата (windup -> strike -> follow-through -> recovery)
    if (ud.isPotato && player.attackTimer > 0) {
      const p = THREE.MathUtils.clamp(1 - player.attackTimer / Math.max(0.05, player.attackDuration || 0.3), 0, 1);
      const isMorg = ud.potatoForm === 1;

      if (isMorg) {
        if (potatoCombo === 3) {
          // 3-й хит: сокрушительный двуручный рубящий удар молотом сверху вниз!
          let shX = 0, elX = -0.5, spX = 0;
          if (p < 0.32) {
            const w = p / 0.32;
            shX = -2.85 * w;
            elX = -0.95 * w;
            spX = -0.45 * w;
          } else if (p < 0.62) {
            const s = (p - 0.32) / 0.30;
            shX = -2.85 + 2.45 * s;
            elX = -0.95 + 0.75 * s;
            spX = -0.45 + 1.05 * s;
          } else {
            const r = (p - 0.62) / 0.38;
            shX = -0.4 * (1 - r);
            elX = -0.2 - 0.45 * r;
            spX = 0.6 * (1 - r);
          }
          ud.spine.rotation.x = lerpAngle(ud.spine.rotation.x, spX, kLerp * 1.4);
          ud.armR.shoulder.rotation.x = lerpAngle(ud.armR.shoulder.rotation.x, shX, kLerp * 1.5);
          ud.armL.shoulder.rotation.x = lerpAngle(ud.armL.shoulder.rotation.x, shX * 0.9, kLerp * 1.5);
          ud.armR.elbow.rotation.x = lerpAngle(ud.armR.elbow.rotation.x, elX, kLerp * 1.5);
          ud.armL.elbow.rotation.x = lerpAngle(ud.armL.elbow.rotation.x, elX, kLerp * 1.5);
        } else {
          // Размашистые боковые удары молотом
          const dir = potatoCombo % 2 === 1 ? 1 : -1;
          const swingArc = Math.sin(p * Math.PI);
          ud.spine.rotation.y = lerpAngle(ud.spine.rotation.y, dir * swingArc * 0.75, kLerp * 1.4);
          ud.armR.shoulder.rotation.x = lerpAngle(ud.armR.shoulder.rotation.x, -1.65 * swingArc, kLerp * 1.5);
          ud.armR.shoulder.rotation.z = lerpAngle(ud.armR.shoulder.rotation.z, -dir * 0.55 * swingArc, kLerp * 1.5);
          ud.armR.elbow.rotation.x = lerpAngle(ud.armR.elbow.rotation.x, -0.75 - 0.35 * swingArc, kLerp * 1.5);
        }
      } else {
        // Громтомат: серия боксёрских хуков и апперкотов с разворотом плеч
        const isRight = potatoCombo % 2 === 1;
        const activeArm = isRight ? ud.armR : ud.armL;
        const guardArm = isRight ? ud.armL : ud.armR;
        const strikeWave = Math.sin(p * Math.PI);
        const isUppercut = potatoCombo === 4 || potatoCombo === 5;

        ud.spine.rotation.y = lerpAngle(ud.spine.rotation.y, (isRight ? 0.68 : -0.68) * strikeWave, kLerp * 1.5);
        ud.spine.rotation.x = lerpAngle(ud.spine.rotation.x, isUppercut ? -0.35 * strikeWave : 0.22 * strikeWave, kLerp * 1.5);
        activeArm.shoulder.rotation.x = lerpAngle(activeArm.shoulder.rotation.x, (isUppercut ? -2.65 : -1.85) * strikeWave, kLerp * 1.6);
        activeArm.elbow.rotation.x = lerpAngle(activeArm.elbow.rotation.x, isUppercut ? -1.15 * strikeWave : -0.45 * strikeWave, kLerp * 1.6);
        guardArm.shoulder.rotation.x = lerpAngle(guardArm.shoulder.rotation.x, -0.85, kLerp);
        guardArm.elbow.rotation.x = lerpAngle(guardArm.elbow.rotation.x, -1.15, kLerp);
      }
      return;
    }

    // Двухсуставная кинематика бега, ходьбы и боевой стойки (Combat Idle) для всех героев
    if (player.attackTimer <= 0 && !player.consumeState && player.airFlipTimer <= 0 && !player.isSliding) {
      const phase = now * (isSprint ? 0.019 : 0.013);
      if (isMoving && (player.isGrounded || player.isWallRunning || player.isGrinding)) {
        const sL = Math.sin(phase);
        const sR = Math.sin(phase + Math.PI);

        // Скручивание позвоночника в противофазе шагам
        if (ud.spine) {
          ud.spine.rotation.y = lerpAngle(ud.spine.rotation.y, -sL * 0.22, kLerp);
          ud.spine.rotation.x = lerpAngle(ud.spine.rotation.x, player.isGrinding ? 0.35 : (isSprint ? 0.28 : 0.14), kLerp);
        }

        // Сгибание обоих локтей и коленей
        if (ud.armL && ud.armL.elbow) {
          ud.armL.elbow.rotation.x = lerpAngle(ud.armL.elbow.rotation.x, -0.65 - Math.sin(phase + Math.PI) * 0.35, kLerp);
        }
        if (ud.armR && ud.armR.elbow) {
          ud.armR.elbow.rotation.x = lerpAngle(ud.armR.elbow.rotation.x, -0.65 - Math.sin(phase) * 0.35, kLerp);
        }
        if (ud.legL && ud.legL.knee) {
          ud.legL.knee.rotation.x = lerpAngle(ud.legL.knee.rotation.x, Math.max(0, Math.sin(phase)) * 1.25, kLerp);
        }
        if (ud.legR && ud.legR.knee) {
          ud.legR.knee.rotation.x = lerpAngle(ud.legR.knee.rotation.x, Math.max(0, Math.sin(phase + Math.PI)) * 1.25, kLerp);
        }
      } else {
        // Combat Idle: плавное боевое дыхание без мгновенного сброса в 0
        const breath = Math.sin(now * 0.0035);
        if (ud.spine) {
          ud.spine.rotation.x = lerpAngle(ud.spine.rotation.x, 0.05 + breath * 0.04, kLerp);
          ud.spine.rotation.y = lerpAngle(ud.spine.rotation.y, 0, kLerp);
        }
        if (ud.armL) {
          const shL = ud.armL.shoulder || ud.armL.pivot;
          if (shL) shL.rotation.x = lerpAngle(shL.rotation.x, -0.22 + breath * 0.06, kLerp);
          if (ud.armL.elbow) ud.armL.elbow.rotation.x = lerpAngle(ud.armL.elbow.rotation.x, -0.58 + breath * 0.08, kLerp);
        }
        if (ud.armR) {
          const shR = ud.armR.shoulder || ud.armR.pivot;
          if (shR) shR.rotation.x = lerpAngle(shR.rotation.x, -0.28 - breath * 0.06, kLerp);
          if (ud.armR.elbow) ud.armR.elbow.rotation.x = lerpAngle(ud.armR.elbow.rotation.x, -0.68 - breath * 0.08, kLerp);
        }
        if (ud.legL && ud.legL.knee) ud.legL.knee.rotation.x = lerpAngle(ud.legL.knee.rotation.x, 0.08, kLerp);
        if (ud.legR && ud.legR.knee) ud.legR.knee.rotation.x = lerpAngle(ud.legR.knee.rotation.x, 0.08, kLerp);
      }
    }
  }

  // 5.3. Hit-Stagger и Процедурный Рэгдолл при смерти врагов (window.__RAGDOLLS на 0.75с)
  function spawnEnemyDeathRagdoll(en, knockVec) {
    if (!en || !en.group) return;
    const g = en.group;
    scene.add(g); // Гарантируем, что меш остаётся в сцене на время полёта рэгдолла

    const dir = new THREE.Vector3(
      g.position.x - player.pos.x,
      0,
      g.position.z - player.pos.z
    );
    if (dir.lengthSq() < 0.01) dir.set(Math.random() - 0.5, 0, Math.random() - 0.5);
    dir.normalize();

    const impulseX = dir.x * 26 + (knockVec ? knockVec.x * 3.5 : 0);
    const impulseZ = dir.z * 26 + (knockVec ? knockVec.z * 3.5 : 0);
    const impulseY = 16 + Math.random() * 6;

    window.__RAGDOLLS.push({
      group: g,
      armL: en.armL,
      armR: en.armR,
      legL: en.legL,
      legR: en.legR,
      vel: new THREE.Vector3(impulseX, impulseY, impulseZ),
      timer: 0,
      maxLife: 0.75,
      color: en.type === 'lemon' ? 0xfff200 : 0xff7f00
    });
  }

  function updateRagdolls(dt, now) {
    for (let i = window.__RAGDOLLS.length - 1; i >= 0; i--) {
      const rg = window.__RAGDOLLS[i];
      rg.timer += dt;
      rg.vel.y -= 42 * dt;
      rg.group.position.addScaledVector(rg.vel, dt);

      // Быстрое вращение в воздухе и хаотичное размахивание конечностями
      rg.group.rotation.x += 11 * dt;
      rg.group.rotation.z += 7 * dt;
      if (rg.armL) rg.armL.rotation.x = Math.sin(now * 0.04 + i) * 2.2;
      if (rg.armR) rg.armR.rotation.x = Math.cos(now * 0.04 + i) * 2.2;
      if (rg.legL) rg.legL.rotation.x = Math.cos(now * 0.035 + i) * 1.8;
      if (rg.legR) rg.legR.rotation.x = Math.sin(now * 0.035 + i) * 1.8;

      let hitBuilding = false;
      const gx = rg.group.position.x;
      const gz = rg.group.position.z;
      const gy = rg.group.position.y;
      for (let bIdx = 0; bIdx < buildings.length; bIdx++) {
        const b = buildings[bIdx];
        if (gx > b.minX && gx < b.maxX && gz > b.minZ && gz < b.maxZ && gy < b.topY) {
          hitBuilding = true;
          break;
        }
      }

      const hitGround = rg.timer > 0.12 && gy <= 0.4;
      if (hitGround || hitBuilding || rg.timer >= rg.maxLife) {
        const burstPos = rg.group.position.clone();
        burstPos.y = Math.max(0.5, burstPos.y);
        if (typeof spawnParticles === 'function') spawnParticles(burstPos, rg.color, 18);
        if (typeof spawnGroundCrackRing === 'function') spawnGroundCrackRing(new THREE.Vector3(burstPos.x, 0, burstPos.z), rg.color, 5.5);
        if (typeof SoundFX !== 'undefined') SoundFX.hit(110, 0.14);
        if (typeof safeDisposeGroup === 'function') safeDisposeGroup(rg.group);
        if (rg.group.parent) rg.group.parent.remove(rg.group);
        window.__RAGDOLLS.splice(i, 1);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 6. ЖИВОЙ МЕГАПОЛИС (АЭРО-СПИДЕРЫ, ГИДРАНТЫ) И VFX 2.0 (ПУЛЫ СВЕТА И ГЛЫБ)
  // ═══════════════════════════════════════════════════════════════════════════

  // 6.1. 4 замкнутые воздушные трассы и 25 неоновых спидеров (физические платформы!)
  function buildAerialSpeederTraffic() {
    if (window.__AERIAL_SPEEDERS.length > 0) return;

    const trackConfigs = [
      { y: 42, rx: 165, rz: 145, cx: 0, cz: -20, color: 0x00f2fe },
      { y: 56, rx: 240, rz: 195, cx: -40, cz: 30, color: 0xff0055 },
      { y: 68, rx: 190, rz: 230, cx: 50, cz: -40, color: 0xf9ca24 },
      { y: 82, rx: 280, rz: 250, cx: 0, cz: 0, color: 0x00ff66 }
    ];

    const tracks = trackConfigs.map((cfg) => {
      const pts = [];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const wobble = Math.sin(a * 3) * 18;
        pts.push(new THREE.Vector3(
          cfg.cx + Math.cos(a) * (cfg.rx + wobble),
          cfg.y + Math.cos(a * 2) * 4,
          cfg.cz + Math.sin(a) * (cfg.rz - wobble)
        ));
      }
      return { curve: new THREE.CatmullRomCurve3(pts, true), color: cfg.color };
    });

    const speederHullGeo = new THREE.BoxGeometry(3.4, 0.95, 7.2);
    const speederCanopyGeo = new THREE.BoxGeometry(2.4, 0.65, 3.4);
    const thrusterGeo = SharedGeometries.latheNozzle;

    for (let i = 0; i < 25; i++) {
      const tr = tracks[i % tracks.length];
      const g = new THREE.Group();
      const hullMat = createPrototypeShader(0x1e2738, 0x0a0e17, 2, tr.color);
      const hull = addInkOutline(new THREE.Mesh(speederHullGeo, hullMat), 1.04);
      g.add(hull);

      const canopy = new THREE.Mesh(
        speederCanopyGeo,
        new THREE.MeshBasicMaterial({ color: 0x081420 })
      );
      canopy.position.set(0, 0.65, -0.3);
      g.add(canopy);

      // Боковые неоновые полосы
      const stripMat = new THREE.MeshBasicMaterial({ color: tr.color });
      for (let side of [-1.74, 1.74]) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 6.8), stripMat);
        strip.position.set(side, 0.1, 0);
        g.add(strip);
      }

      // Яркие передние фары
      const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffdd });
      for (let side of [-1.05, 1.05]) {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.24, 0.12), hlMat);
        hl.position.set(side, 0.05, 3.62);
        g.add(hl);
      }

      // Сопла и красные шлейфы двигателей
      const trailMat = new THREE.MeshBasicMaterial({ color: 0xff0044, transparent: true, opacity: 0.8 });
      for (let side of [-0.9, 0.9]) {
        const noz = new THREE.Mesh(thrusterGeo, hullMat);
        noz.rotation.x = Math.PI / 2;
        noz.position.set(side, 0, -3.6);
        g.add(noz);

        const plume = new THREE.Mesh(new THREE.ConeGeometry(0.28, 3.2, 6), trailMat);
        plume.rotation.x = -Math.PI / 2;
        plume.position.set(side, 0, -5.2);
        g.add(plume);
      }

      const tStart = (i / 25) % 1.0;
      const startPos = tr.curve.getPoint(tStart);
      g.position.copy(startPos);
      scene.add(g);

      window.__AERIAL_SPEEDERS.push({
        group: g,
        track: tr,
        t: tStart,
        speedT: 0.022 + (i % 4) * 0.004,
        pos: startPos.clone(),
        prevPos: startPos.clone(),
        delta: new THREE.Vector3(),
        destroyedTimer: 0,
        color: tr.color
      });
    }

    // Разрушаемые пожарные гидранты на тротуарах + парящие голографические кольца вокруг небоскрёбов
    const hydrantCoords = [
      [-22, -18], [24, -18], [-28, 22], [28, 22], [0, 38], [-52, -32],
      [52, -32], [-65, 15], [65, 15], [-18, -52], [18, -52], [42, 55],
      [-42, 55], [85, -15], [-85, -15], [0, -82]
    ];
    const hydMat = createPrototypeShader(0xeb2f06, 0x7a0c00, 7, 0xfff200);
    for (let i = 0; i < hydrantCoords.length; i++) {
      const [hx, hz] = hydrantCoords[i];
      const hg = new THREE.Group();
      hg.position.set(hx, 0, hz);
      const body = addInkOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 1.15, 8), hydMat), 1.05);
      body.position.y = 0.58;
      const cap = addInkOutline(new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), hydMat), 1.05);
      cap.position.y = 1.15;
      hg.add(body, cap);
      scene.add(hg);
      window.__STREET_HYDRANTS.push({
        group: hg,
        pos: new THREE.Vector3(hx, 0, hz),
        broken: false,
        geyserTimer: 0
      });
    }

    // Парящие голографические кольца вокруг высоких небоскрёбов
    const holoBuildings = buildings.filter((b) => b.topY > 55).slice(0, 12);
    for (let i = 0; i < holoBuildings.length; i++) {
      const b = holoBuildings[i];
      const ringRadius = Math.max(b.w, b.d) * 0.68 + 3.5;
      const holoRing = new THREE.Mesh(
        new THREE.TorusGeometry(ringRadius, 0.35, 6, 24),
        new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? 0x00f2fe : 0xff0055,
          transparent: true,
          opacity: 0.45,
          wireframe: true
        })
      );
      holoRing.rotation.x = Math.PI / 2;
      holoRing.position.set(b.x, b.topY * 0.72, b.z);
      scene.add(holoRing);
      decorations.push({ mesh: holoRing, type: 'canopy', phase: i * 1.1 });
    }
  }

  function updateAerialSpeedersAndHydrants(dt, now) {
    // 1. Обновление летающих спидеров и физика катания на крыше спидера
    player._ridingSpeeder = null;
    for (let i = 0; i < window.__AERIAL_SPEEDERS.length; i++) {
      const sp = window.__AERIAL_SPEEDERS[i];
      if (sp.destroyedTimer > 0) {
        sp.destroyedTimer -= dt;
        if (sp.destroyedTimer <= 0) {
          sp.group.visible = true;
        }
        continue;
      }

      sp.prevPos.copy(sp.pos);
      sp.t = (sp.t + sp.speedT * dt) % 1.0;
      const nextPt = sp.track.curve.getPoint(sp.t);
      const tangent = sp.track.curve.getTangent(sp.t);
      sp.pos.copy(nextPt);
      sp.delta.subVectors(sp.pos, sp.prevPos);

      sp.group.position.copy(sp.pos);
      sp.group.lookAt(sp.pos.clone().add(tangent));

      // Проверка посадки игрока на крышу спидера
      const dx = Math.abs(player.pos.x - sp.pos.x);
      const dz = Math.abs(player.pos.z - sp.pos.z);
      const topSurfaceY = sp.pos.y + 0.85;
      if (dx < 2.8 && dz < 4.4 && player.pos.y >= topSurfaceY - 1.6 && player.pos.y <= topSurfaceY + 1.8 && player.vel.y <= 4) {
        player.pos.y = topSurfaceY;
        player.pos.add(sp.delta);
        player.vel.y = 0;
        player.isGrounded = true;
        player.isFlying = false;
        player.isBulletdropping = false;
        player._ridingSpeeder = sp;
      }

      // Если игрок атакует рядом со спидером (и не стоит на его крыше) — взрыв спидера за бонусные EP!
      if (player.attackTimer > 0.1 && player._ridingSpeeder !== sp && player.pos.distanceToSquared(sp.pos) < 36) {
        sp.destroyedTimer = 14.0;
        sp.group.visible = false;
        player.ep += 65;
        player.score += 450;
        SoundFX.boom();
        spawnParticles(sp.pos.clone(), sp.color, 22);
        spawnComicPop(sp.pos.clone().add(new THREE.Vector3(0, 2, 0)), '💥 СПИДЕР СБИТ! +65 EP 💥', '#00f2fe');
        updateHUD();
        updateScoreDisplay();
      }
    }

    // 2. Обновление уличных пожарных гидрантов и водяных гейзеров
    for (let i = 0; i < window.__STREET_HYDRANTS.length; i++) {
      const h = window.__STREET_HYDRANTS[i];
      if (!h.broken) {
        if (player.attackTimer > 0.05 && player.pos.distanceToSquared(h.pos) < 25) {
          h.broken = true;
          h.geyserTimer = 8.0;
          h.group.visible = false;
          SoundFX.boom();
          spawnComicPop(h.pos.clone().add(new THREE.Vector3(0, 2.5, 0)), '💦 ПРОРЫВ ГИДРАНТА! 💦', '#00f2fe');
        }
      } else if (h.geyserTimer > 0) {
        h.geyserTimer -= dt;
        if (Math.random() < 0.75) {
          const p = ParticlePool.get(0x66e0ff);
          p.position.copy(h.pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.5, (Math.random() - 0.5) * 0.8));
          scene.add(p);
          ParticlePool.active.push({
            mesh: p,
            vel: new THREE.Vector3((Math.random() - 0.5) * 4, 22 + Math.random() * 10, (Math.random() - 0.5) * 4),
            life: 0.55
          });
        }
        // Водяной гейзер подбрасывает врагов и игрока
        for (let eIdx = 0; eIdx < enemies.length; eIdx++) {
          const en = enemies[eIdx];
          if (Math.hypot(en.group.position.x - h.pos.x, en.group.position.z - h.pos.z) < 4.2) {
            en.vel.y = Math.max(en.vel.y, 20);
          }
        }
        if (Math.hypot(player.pos.x - h.pos.x, player.pos.z - h.pos.z) < 2.6 && player.pos.y < 3.0) {
          player.vel.y = Math.max(player.vel.y, 24);
          player.isGrounded = false;
          player.hp = Math.min(player.maxHp, player.hp + 15 * dt);
        }
        if (h.geyserTimer <= 0) {
          h.broken = false;
          h.group.visible = true;
        }
      }
    }
  }

  // 6.2. Пул из 4 постоянных источников света для снарядов (Pooled Projectile PointLights)
  const pooledProjectileLights = [];
  function initPooledProjectileLights() {
    if (pooledProjectileLights.length > 0) return;
    for (let i = 0; i < 4; i++) {
      const pl = new THREE.PointLight(0x00f2fe, 0, 22);
      pl.position.set(0, -500, 0);
      scene.add(pl);
      pooledProjectileLights.push(pl);
    }
  }

  function updatePooledProjectileLights() {
    initPooledProjectileLights();
    const candidates = [];

    // 1. Активные ракеты Егорбанана
    if (typeof Rocket !== 'undefined' && Rocket.active) {
      for (let i = 0; i < Rocket.active.length; i++) {
        candidates.push({ pos: Rocket.active[i].mesh.position, color: 0xff0055, intensity: 3.2 });
      }
    }
    // 2. Активные лучи Капитана Перца
    if (typeof pepperBeamEffects !== 'undefined') {
      for (let i = 0; i < pepperBeamEffects.length; i++) {
        const col = EvoModules.has('pepper_blue_flame') ? 0x00e5ff : 0xff4400;
        candidates.push({ pos: pepperBeamEffects[i].beam.position, color: col, intensity: 3.5 });
      }
    }
    // 3. Плазменный луч Димона Лимона
    if (typeof LEMON_LASER_FX !== 'undefined' && LEMON_LASER_FX.length > 0) {
      candidates.push({ pos: LEMON_LASER_FX[0].mesh.position, color: 0x44ffaa, intensity: 3.0 });
    }
    // 4. Активные зоны (лавовые гейзеры, сингулярность, огненные следы)
    for (let i = 0; i < activeTimedZones.length; i++) {
      candidates.push({ pos: activeTimedZones[i].pos, color: activeTimedZones[i].color, intensity: 2.8 });
    }
    // 5. Яркие летящие снаряды в массиве projectiles
    for (let i = 0; i < projectiles.length && candidates.length < 6; i++) {
      const pr = projectiles[i];
      if (pr && pr.mesh) {
        const col = (pr.mesh.material && pr.mesh.material.color) ? pr.mesh.material.color.getHex() : 0x00f2fe;
        candidates.push({ pos: pr.mesh.position, color: col, intensity: 2.4 });
      }
    }

    for (let i = 0; i < 4; i++) {
      const pl = pooledProjectileLights[i];
      if (i < candidates.length) {
        pl.position.copy(candidates[i].pos).add(new THREE.Vector3(0, 0.8, 0));
        pl.color.setHex(candidates[i].color);
        pl.intensity = candidates[i].intensity;
      } else {
        pl.intensity = 0;
      }
    }
  }

  // 6.3. Объёмные 3D-трещины и каменные глыбы (перехват window.spawnGroundCrackRing)
  const debrisMeshPool = [];
  function getPooledDebrisMesh(colorHex) {
    let m = debrisMeshPool.pop();
    if (!m) {
      m = addInkOutline(
        new THREE.Mesh(SharedGeometries.debrisRock, createPrototypeShader(0x3a3f46, 0x16191d, 7, colorHex || 0xff7f00)),
        1.04
      );
    }
    m.visible = true;
    scene.add(m);
    return m;
  }

  const _origSpawnGroundCrackRing = window.spawnGroundCrackRing;
  window.spawnGroundCrackRing = function (pos, colorHex = 0xff0055, maxR = 11) {
    if (_origSpawnGroundCrackRing) _origSpawnGroundCrackRing.call(this, pos, colorHex, maxR);
    if (!pos || activeDebrisPieces.length > 48) return;

    const count = Math.min(12, Math.max(8, Math.round(maxR * 0.75)));
    const ringR = Math.min(maxR * 0.55, 7.5);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      const rock = getPooledDebrisMesh(colorHex);
      const scale = 0.45 + Math.random() * 0.65;
      rock.scale.set(scale, scale * (0.7 + Math.random() * 0.6), scale);
      rock.position.set(pos.x + Math.cos(a) * ringR * 0.4, 0.15, pos.z + Math.sin(a) * ringR * 0.4);
      rock.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);

      activeDebrisPieces.push({
        mesh: rock,
        vel: new THREE.Vector3(Math.cos(a) * (6 + Math.random() * 8), 8 + Math.random() * 7, Math.sin(a) * (6 + Math.random() * 8)),
        rotVel: new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8),
        life: 1.2,
        pooledRock: true
      });
    }
  };

  function updateDebrisAndZones(dt) {
    // 1. Обновление 3D-глыб и осколков брони
    for (let i = activeDebrisPieces.length - 1; i >= 0; i--) {
      const d = activeDebrisPieces[i];
      d.life -= dt;
      if (d.mesh.position.y > 0.25 || d.vel.y > 0) {
        d.vel.y -= 32 * dt;
        d.mesh.position.addScaledVector(d.vel, dt);
        d.mesh.rotation.x += d.rotVel.x * dt;
        d.mesh.rotation.y += d.rotVel.y * dt;
        d.mesh.rotation.z += d.rotVel.z * dt;
        if (d.mesh.position.y < 0.25 && d.vel.y < 0) {
          d.mesh.position.y = 0.25;
          d.vel.set(0, 0, 0);
        }
      } else if (d.life < 0.35) {
        // Плавно уходят под землю
        d.mesh.position.y -= dt * 1.4;
      }

      if (d.life <= 0) {
        if (d.pooledRock) {
          d.mesh.visible = false;
          scene.remove(d.mesh);
          debrisMeshPool.push(d.mesh);
        } else {
          scene.remove(d.mesh);
          if (!d.sharedGeo && d.mesh.geometry) d.mesh.geometry.dispose();
          if (d.mesh.material) safeDisposeMaterial(d.mesh.material);
        }
        activeDebrisPieces.splice(i, 1);
      }
    }

    // 2. Обновление активных боевых зон Модулей Эволюции
    for (let i = activeTimedZones.length - 1; i >= 0; i--) {
      const z = activeTimedZones[i];
      z.life -= dt;
      z.tickAccum = (z.tickAccum || 0) + dt;

      if (z.mesh) {
        z.mesh.rotation.y += dt * 2.5;
        if (z.mesh.material && z.mesh.material.opacity !== undefined) {
          z.mesh.material.opacity = Math.min(0.75, Math.max(0, (z.life / z.maxLife) * 0.75));
        }
      }

      if (z.kind === 'lava_geyser' && z.tickAccum >= 0.45) {
        z.tickAccum = 0;
        spawnParticles(z.pos.clone().add(new THREE.Vector3(0, 1, 0)), z.color, 6);
        for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
          const en = enemies[eIdx];
          if (en.group.position.distanceTo(z.pos) <= z.radius) {
            en.vel.y = Math.max(en.vel.y, 15);
            damageEnemy(en, z.dmgPerTick, new THREE.Vector3(0, 8, 0), '*🌋 ГЕЙЗЕР!*');
          }
        }
      } else if (z.kind === 'shrek_singularity') {
        // Гравитационная воронка стягивает всех врагов в радиусе 18 м
        for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
          const en = enemies[eIdx];
          const d = en.group.position.distanceTo(z.pos);
          if (d <= z.radius && d > 1.5) {
            const pull = z.pos.clone().sub(en.group.position).normalize();
            en.group.position.addScaledVector(pull, 18 * dt);
            if (z.tickAccum >= 0.5) {
              damageEnemy(en, 45, new THREE.Vector3(), '');
            }
          }
        }
        if (z.tickAccum >= 0.5) z.tickAccum = 0;
      } else if (z.kind === 'starch_fire_trail' && z.tickAccum >= 0.35) {
        z.tickAccum = 0;
        for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
          const en = enemies[eIdx];
          if (en.group.position.distanceTo(z.pos) <= z.radius) {
            damageEnemy(en, 55, new THREE.Vector3(), '*🔥 СЛЕД ДЖАГГЕРНАУТА!*');
          }
        }
      } else if (z.kind === 'ketchup_bomb' && z.life <= 0) {
        // Повторная термоядерная детонация кетчупа через 2 секунды
        SoundFX.boom();
        spawnGroundCrackRing(z.pos, 0xff2200, z.radius);
        spawnParticles(z.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xff2200, 20);
        for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
          const en = enemies[eIdx];
          if (en.group.position.distanceTo(z.pos) <= z.radius) {
            en.vel.y = Math.max(en.vel.y, 16);
            damageEnemy(en, z.dmg, new THREE.Vector3(0, 10, 0), '*🍅 ТЕРМОЯДЕРНЫЙ КЕТЧУП!*');
          }
        }
      }

      if (z.life <= 0) {
        if (z.mesh) {
          scene.remove(z.mesh);
          if (z.mesh.geometry) z.mesh.geometry.dispose();
          if (z.mesh.material) safeDisposeMaterial(z.mesh.material);
        }
        activeTimedZones.splice(i, 1);
      }
    }

    // 3. Временные электро-дуги Сверхпроводника BOLD
    for (let i = activeChainArcs.length - 1; i >= 0; i--) {
      const arc = activeChainArcs[i];
      arc.life -= dt;
      if (arc.life <= 0) {
        scene.remove(arc.line);
        if (arc.line.geometry) arc.line.geometry.dispose();
        if (arc.line.material) arc.line.material.dispose();
        activeChainArcs.splice(i, 1);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ 6.4. SOFT-LOCK ПРИЦЕЛИВАНИЕ ПРИ АТАКАХ БЛИЖНЕГО БОЯ (ДО 6 МЕТРОВ)
  // ═══════════════════════════════════════════════════════════════════════════
  function applyMeleeSoftLockLunge(maxRange = 6.0) {
    if (player.isGrinding) return;
    const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw)).normalize();
    let bestEnemy = null;
    let bestScore = Infinity;

    for (let i = 0; i < enemies.length; i++) {
      const en = enemies[i];
      if (!en || !en.group || en.hp <= 0) continue;
      const toE = en.group.position.clone().sub(player.pos);
      const flatDist = Math.hypot(toE.x, toE.z);
      if (flatDist < 0.8 || flatDist > maxRange + (en.radius || 1.2)) continue;
      const dir = new THREE.Vector3(toE.x, 0, toE.z).normalize();
      const dot = dir.dot(fwd);
      if (dot < 0.45) continue;
      const score = flatDist * (1.2 - dot * 0.5);
      if (score < bestScore) {
        bestScore = score;
        bestEnemy = en;
      }
    }

    if (bestEnemy) {
      const dx = bestEnemy.group.position.x - player.pos.x;
      const dz = bestEnemy.group.position.z - player.pos.z;
      player.facingYaw = Math.atan2(-dx, -dz);
      const dist = Math.hypot(dx, dz);
      const stopDist = (bestEnemy.radius || 1.3) + 1.6;
      if (dist > stopDist) {
        const pull = Math.min(dist - stopDist, 4.2);
        player.pos.x += (dx / dist) * pull * 0.45;
        player.pos.z += (dz / dist) * pull * 0.45;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ ПЕРЕХВАТ БОЕВЫХ ФУНКЦИЙ И ИНТЕГРАЦИЯ МОДУЛЕЙ ЭВОЛЮЦИИ + БАЗЫ v53
  // ═══════════════════════════════════════════════════════════════════════════

  // 1. damageEnemy: Бонус гринда (x1.8), Синее Пламя Перца (+35% и игнор щита), Battle Damage (<50% HP), Hit-Stagger и Death Ragdoll
  const _origDamageEnemy = window.damageEnemy;
  window.damageEnemy = function (en, dmg, knockVec, popText) {
    if (!en) return;

    // Бонус урона при рельсовом гринде (x1.8)
    if (player.isGrinding) {
      dmg *= 1.8;
    }

    // Модуль Перца: «Синее Пламя Сковилля» (+35% урона + полное игнорирование щита en._shield)
    if (PEPPER_MODE && EvoModules.has('pepper_blue_flame')) {
      dmg *= 1.35;
      if (en._shield) {
        en._shield = false;
        if (en._hexBarrierMesh) en._hexBarrierMesh.visible = false;
        popText = '*🔥 ЩИТ ПРОЖЖЁН СИНИМ ПЛАМЕНЕМ!*';
      }
    }

    // Hit-Stagger при каждом попадании
    en._hitStagger = 0.2;

    const prevHp = en.hp;
    const res = _origDamageEnemy.call(this, en, dmg, knockVec, popText);

    // Проверка Battle Damage (< 50% HP)
    if (en.hp > 0 && en.maxHp > 0 && en.hp / en.maxHp < 0.5 && !en._battleDamaged) {
      triggerEnemyBattleDamage(en);
    }

    // Если враг только что погиб — запускаем 0.75-секундный физический Ragdoll!
    if (prevHp > 0 && en.hp <= 0 && !en._ragdollSpawned) {
      en._ragdollSpawned = true;
      spawnEnemyDeathRagdoll(en, knockVec);
    }

    return res;
  };

  // 2. applyDamageToHero: Кора Древнего Энта (блок глыбами), Броня Картошки и Энергощит Реактора МК-I (v53)
  const _origApplyDamageToHero = window.applyDamageToHero;
  window.applyDamageToHero = function (dmg) {
    if (player.isDead) return;

    // Модуль Хохлоркови: «Кора Древнего Энта» в форме Гиганта снижает урон на 45% и отбрасывает врагов глыбами
    if (CARROT_MODE && CARROT_FORM === 2 && EvoModules.has('carrot_ancient_ent')) {
      dmg *= 0.55;
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 4.2, 0)), '*🪨 БЛОК КОРОЙ ЭНТА!*', '#2ecc71');
    }

    // 5-й персонаж Моргенкартошка: броня корней снижает урон вдвое
    if (window.__POTATO_MODE && window.__POTATO_FORM === 1 && player._potatoArmor > 0) {
      dmg = Math.floor(dmg * 0.5);
    }

    // Фикс энергощита Реактора МК-I (suitIdx === 3) из v53
    if (player.activeModeF && player.suitIdx === 3 && player.character === 'banana' && !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE && !window.__POTATO_MODE) {
      const drain = dmg * 1.5;
      if (player.en >= drain) {
        player.en -= drain;
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3.2, 0)), '*ЩИТ БЛОК*', '#00f2fe');
        updateHUD();
        return;
      } else {
        player.activeModeF = false;
        if (player.mesh && player.mesh.userData && player.mesh.userData.limeShield) {
          player.mesh.userData.limeShield.visible = false;
        }
      }
    }

    return _origApplyDamageToHero.call(this, dmg);
  };

  // 3. Капитан Перец: «Синее Пламя Сковилля» + «Метеоритное Ядро» (лавовый гейзер на 6с после падения)
  const _origPepperFireBeam = window.pepperFireBeam;
  window.pepperFireBeam = function () {
    if (_origPepperFireBeam) _origPepperFireBeam.apply(this, arguments);
    if (EvoModules.has('pepper_blue_flame') && typeof pepperBeamEffects !== 'undefined' && pepperBeamEffects.length > 0) {
      const latest = pepperBeamEffects[pepperBeamEffects.length - 1];
      if (latest && latest.beam && latest.beam.material) latest.beam.material.color.setHex(0x00e5ff);
      if (latest && latest.core && latest.core.material) latest.core.material.color.setHex(0xffffff);
    }
  };

  const _origEmitPepperFireWave = window.emitPepperFireWave;
  window.emitPepperFireWave = function () {
    if (_origEmitPepperFireWave) _origEmitPepperFireWave.apply(this, arguments);
    if (EvoModules.has('pepper_blue_flame') && typeof pepperWaves !== 'undefined' && pepperWaves.length > 0) {
      const w = pepperWaves[pepperWaves.length - 1];
      if (w && w.mesh && w.mesh.material) w.mesh.material.color.setHex(0x00e5ff);
    }
  };

  function spawnMeteorCoreLavaGeyser(pos) {
    const col = EvoModules.has('pepper_blue_flame') ? 0x00e5ff : 0xff3300;
    const geyserMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 4.5, 9, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.65, wireframe: true, side: THREE.DoubleSide })
    );
    geyserMesh.position.set(pos.x, 4.5, pos.z);
    scene.add(geyserMesh);
    const st = pepperStats();
    activeTimedZones.push({
      kind: 'lava_geyser',
      pos: pos.clone(),
      radius: 9.5,
      dmgPerTick: st.dmg * 1.15,
      color: col,
      mesh: geyserMesh,
      life: 6.0,
      maxLife: 6.0,
      tickAccum: 0
    });
    spawnComicPop(pos.clone().add(new THREE.Vector3(0, 4, 0)), '☄️ МЕТЕОРИТНОЕ ЯДРО: ЛАВОВЫЙ ГЕЙЗЕР (6с)! ☄️', '#ff9f1a');
  }

  // 4. Хохлорковь: Гарпун с КД 0.6с (из v53), «Ядовитый Плющ» (яд + вампиризм) и «Кора Древнего Энта» (шипы за буром)
  let _vineHarpoonCdV65 = 0;
  window.carrotVineHarpoon = function () {
    if (!CARROT_MODE || CARROT_FORM !== 1 || player.isDead) return;
    if (_vineHarpoonCdV65 > 0) {
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '*ГАРПУН КД ' + _vineHarpoonCdV65.toFixed(1) + 'с*', '#2ecc71');
      return;
    }
    _vineHarpoonCdV65 = 0.6;
    player._vineHarpoonCd = 0.6;

    const origin = player.pos.clone().add(new THREE.Vector3(0, 2.1, 0));
    const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw)).normalize();
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);

    camRaycaster.set(origin, camDir);
    camRaycaster.far = 220;
    const rawHits = camRaycaster.intersectObjects(buildingMeshes, false);
    const buildHits = rawHits.filter((h) => h.point.y > 1.2 && h.distance > 5);
    const buildingDist = buildHits.length > 0 ? buildHits[0].distance : Infinity;

    let bestEnemy = null;
    let bestDist = 180;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e || !e.group) continue;
      const toE = e.group.position.clone().sub(player.pos);
      const dist = toE.length();
      if (dist > 180 || dist < 2.5) continue;
      if (toE.clone().normalize().dot(fwd) < 0.68) continue;
      if (dist < bestDist) {
        bestDist = dist;
        bestEnemy = e;
      }
    }

    if (bestEnemy && bestDist <= buildingDist + 4) {
      const tp = bestEnemy.group.position.clone().add(new THREE.Vector3(0, 1.8, 0));
      if (activeTendrils.length < 10) {
        activeTendrils.push(new OrganicTendril3D(scene, origin.clone(), tp, 0x2ecc71, 0.4, 0.45));
      }
      SoundFX.whip();
      const isHeavy = bestEnemy._isBoss || bestEnemy.type === 'titan' || bestEnemy.type === 'tank' || bestEnemy.type === 'lemon' || bestEnemy.type === 'valkyrie' || bestEnemy.type === 'necromancer' || bestEnemy.type === 'heli';
      if (isHeavy) {
        const dir = tp.clone().sub(player.pos).normalize();
        player.vel.set(dir.x * 78, Math.max(16, dir.y * 36), dir.z * 78);
        player.isGrounded = false;
        player.dodgeIframes = 0.55;
        spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), '*🌿 К БОССУ!*', '#ff2200');
      } else {
        bestEnemy._rooted = 1.2;
        bestEnemy.vel.set((player.pos.x - bestEnemy.group.position.x) * 6, 8, (player.pos.z - bestEnemy.group.position.z) * 6);
        const st = carrotStats();
        damageEnemy(bestEnemy, st.dmg * 2.8, fwd.clone().multiplyScalar(6), '*🌿 ГАРПУН!*');
      }
      sendMP('pvp_ability', { type: 'harpoon', x: tp.x, y: tp.y, z: tp.z });
      return;
    }

    if (buildHits.length > 0) {
      const hp = buildHits[0].point;
      if (activeTendrils.length < 10) {
        activeTendrils.push(new OrganicTendril3D(scene, origin.clone(), hp.clone(), 0x2ecc71, 0.38, 0.45));
      }
      const dir = hp.clone().sub(player.pos).normalize();
      player.vel.set(dir.x * 74, Math.max(24, dir.y * 55 + 14), dir.z * 74);
      player.isGrounded = false;
      player.isBulletdropping = false;
      player.dodgeIframes = 0.45;
      SoundFX.swing(500);
      spawnComicPop(origin.clone().add(new THREE.Vector3(0, 2, 0)), '*🌿 ЦЕПКИЙ КОРЕНЬ!*', '#2ecc71');
      return;
    }

    player.vel.set(fwd.x * 52, 14, fwd.z * 52);
    player.isGrounded = false;
    SoundFX.swing(440);
  };

  const _origCarrotRootBind = window.carrotRootBind;
  window.carrotRootBind = function () {
    if (!CARROT_MODE || player.isDead) return;
    if (_origCarrotRootBind) _origCarrotRootBind.apply(this, arguments);

    if (EvoModules.has('carrot_poison_ivy')) {
      const radius = CARROT_FORM === 2 ? 28 : 24;
      const st = carrotStats();
      for (let i = 0; i < enemies.length; i++) {
        const en = enemies[i];
        if (en.group.position.distanceTo(player.pos) <= radius) {
          en._poisonIvyTimer = 4.5;
          en._poisonIvyDps = st.dmg * 0.85;
        }
      }
      spawnGroundCrackRing(player.pos, 0x00ff88, radius);
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 4, 0)), '🌿 ЯДОВИТЫЙ ПЛЮЩ: ВАМПИРИЗМ! 🌿', '#00ff88');
    }
    sendMP('pvp_ability', { type: 'root_bind', radius: 26 });
  };

  const _origCarrotGiantDrillDash = window.carrotGiantDrillDash;
  window.carrotGiantDrillDash = function () {
    const startPos = player.pos.clone();
    const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw)).normalize();
    if (_origCarrotGiantDrillDash) _origCarrotGiantDrillDash.apply(this, arguments);

    if (CARROT_MODE && CARROT_FORM === 2 && EvoModules.has('carrot_ancient_ent')) {
      const st = carrotStats();
      for (let step = 1; step <= 8; step++) {
        const sx = startPos.x + fwd.x * step * 4.5;
        const sz = startPos.z + fwd.z * step * 4.5;
        eruptGroundSpike(sx, sz, step * 45);
        for (let i = enemies.length - 1; i >= 0; i--) {
          const en = enemies[i];
          if (Math.hypot(en.group.position.x - sx, en.group.position.z - sz) < 5.0) {
            en.vel.y = Math.max(en.vel.y, 16);
            damageEnemy(en, st.dmg * 1.8, new THREE.Vector3(0, 10, 0), '*🪨 ШИП ЭНТА!*');
          }
        }
      }
    }
  };

  // 5. Димон Лимон: «Мега-Улей» (до 8 пауков, +50% скорострельности, мини-щит 0x44ffaa) и «Сверхпроводник BOLD» (цепная дуга по 3 врагам)
  const _origSpawnLemonSpiderBot = window.spawnLemonSpiderBot;
  window.spawnLemonSpiderBot = function () {
    if (_origSpawnLemonSpiderBot) _origSpawnLemonSpiderBot.apply(this, arguments);
    if (EvoModules.has('lemon_mega_hive') && LEMON_BOTS.length > 0) {
      const bot = LEMON_BOTS[LEMON_BOTS.length - 1];
      if (bot && !bot._hiveUpgraded) {
        bot._hiveUpgraded = true;
        bot.life = 18;
        const shieldMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.68, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0x44ffaa, transparent: true, opacity: 0.38, wireframe: true })
        );
        bot.group.add(shieldMesh);
        bot._miniShield = shieldMesh;
      }
    }
  };

  window.lemonSummonSpiders = function () {
    if (player.lemonSummonCd > 0) return;
    player.lemonSummonCd = 10.0;
    SoundFX.devastator();
    const maxBots = EvoModules.has('lemon_mega_hive') ? 8 : 4;
    const batchCount = EvoModules.has('lemon_mega_hive') ? 4 : 2;
    spawnComicPop(
      player.pos.clone().add(new THREE.Vector3(0, 3.5, 0)),
      EvoModules.has('lemon_mega_hive') ? '*🕷️ МЕГА-УЛЕЙ: 8 ПАУКОВ В БОЙ!*' : '*РЕПУЛЬСОРЫ, ПОДЪЕМ!*',
      '#44ffaa'
    );
    const alive = LEMON_BOTS.filter((b) => b.alive).length;
    const toSpawn = Math.min(batchCount, maxBots - alive);
    for (let i = 0; i < toSpawn; i++) window.spawnLemonSpiderBot();
  };

  const _origLemonPlasmaBeamTick = window.lemonPlasmaBeamTick;
  window.lemonPlasmaBeamTick = function (dt) {
    if (_origLemonPlasmaBeamTick) _origLemonPlasmaBeamTick.call(this, dt);
    if (!EvoModules.has('lemon_bold_superconductor') || enemies.length < 2) return;

    const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw)).normalize();
    const start = player.pos.clone().add(new THREE.Vector3(0, 2.2, 0));
    let primaryHit = null;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const toE = e.group.position.clone().sub(start);
      const proj = toE.dot(fwd);
      if (proj > 0 && proj < 35) {
        const perpSq = toE.lengthSq() - proj * proj;
        if (perpSq <= (e.radius + 1.8) * (e.radius + 1.8)) {
          primaryHit = e;
          break;
        }
      }
    }
    if (!primaryHit) return;

    // Бьёт цепной дугой ещё по 3 ближайшим врагам
    const neighbors = enemies
      .filter((e) => e !== primaryHit && e.hp > 0 && e.group.position.distanceTo(primaryHit.group.position) < 20)
      .sort((a, b) => a.group.position.distanceTo(primaryHit.group.position) - b.group.position.distanceTo(primaryHit.group.position))
      .slice(0, 3);

    for (let i = 0; i < neighbors.length; i++) {
      const nb = neighbors[i];
      damageEnemy(nb, LEMON_DMG * 1.35 * dt, new THREE.Vector3(), '');
      if (Math.random() < 0.35) {
        const p1 = primaryHit.group.position.clone().add(new THREE.Vector3(0, 2, 0));
        const p2 = nb.group.position.clone().add(new THREE.Vector3(0, 2, 0));
        const mid = p1.clone().lerp(p2, 0.5).add(new THREE.Vector3((Math.random() - 0.5) * 2, 1.2, (Math.random() - 0.5) * 2));
        const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, mid, p2]);
        const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x00f2fe }));
        scene.add(line);
        activeChainArcs.push({ line, life: 0.08 });
      }
    }
  };

  // 6. Егорбанан: «Сингулярность Шрекича» на взрыв ракеты (G), Морозилка на [C] и Божественный Синтез на [T] (из v53)
  const _origExplodeRocket = window.explodeRocket;
  window.explodeRocket = function (r) {
    const pos = r && r.mesh ? r.mesh.position.clone() : player.pos.clone();
    if (_origExplodeRocket) _origExplodeRocket.apply(this, arguments);

    if (EvoModules.has('banana_shrek_singularity')) {
      const vortexMesh = new THREE.Mesh(
        new THREE.TorusKnotGeometry(2.6, 0.45, 36, 8),
        new THREE.MeshBasicMaterial({ color: 0xaa00ff, transparent: true, opacity: 0.65, wireframe: true })
      );
      vortexMesh.position.copy(pos).add(new THREE.Vector3(0, 2.2, 0));
      scene.add(vortexMesh);
      activeTimedZones.push({
        kind: 'shrek_singularity',
        pos: pos.clone(),
        radius: 18.0,
        color: 0xaa00ff,
        mesh: vortexMesh,
        life: 4.0,
        maxLife: 4.0,
        tickAccum: 0
      });
      spawnComicPop(pos.clone().add(new THREE.Vector3(0, 4, 0)), '🌀 СИНГУЛЯРНОСТЬ ШРЕКИЧА (18М)! 🌀', '#00f2fe');
    }
  };

  // Заморозка на KeyC и Божественный Синтез на KeyT для Нано-Егорбанана + переключение дрона Шрекича на KeyB (v53)
  let _bananaFreezeCd = 0;
  let _nanoUltCd = 0;
  let _nanoTCharging = false;
  let _nanoTHoldTimer = 0;

  const nanoTPanel = document.createElement('div');
  nanoTPanel.style.cssText =
    'position:fixed;bottom:180px;left:50%;transform:translateX(-50%);width:340px;background:rgba(0,20,40,.95);' +
    'border:3px solid #00f2fe;border-radius:8px;padding:12px;text-align:center;z-index:50;display:none;' +
    'box-shadow:0 0 30px rgba(0,242,254,.7),5px 5px 0 #000;';
  nanoTPanel.innerHTML =
    '<div style="font-family:Bangers,Impact,sans-serif;font-size:20px;color:#00f2fe;-webkit-text-stroke:1px #000;margin-bottom:6px;letter-spacing:2px">⚡ БОЖЕСТВЕННЫЙ СИНТЕЗ ⚡</div>' +
    '<div style="height:22px;background:#001a1a;border:2px solid #000;overflow:hidden"><div id="v65-t-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#00f2fe,#ff0055);box-shadow:0 0 15px #00f2fe;transition:width .05s"></div></div>';
  document.body.appendChild(nanoTPanel);

  window.addEventListener('keydown', function (e) {
    if (typeof player === 'undefined' || player.isDead) return;

    // Отключение/включение дрона Шрекича на KeyB (из v53)
    if (e.code === 'KeyB' && player.character === 'banana' && !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE && !window.__POTATO_MODE) {
      if (typeof Companion !== 'undefined') {
        Companion._disabled = !Companion._disabled;
        if (Companion._disabled) {
          if (Companion.group) Companion.group.visible = false;
          Companion.shootCd = 99999;
          Companion.buffCd = 99999;
          player.companionShield = 0;
          player.companionRegen = 0;
          player.companionDmg = 0;
          spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), 'ДРОН ОТКЛЮЧЕН', '#ff0000');
        } else {
          if (Companion.group) Companion.group.visible = true;
          Companion.shootCd = 0;
          Companion.buffCd = 15;
          spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), 'ДРОН ВКЛЮЧЕН', '#00ff66');
        }
      }
    }

    // Заморозка на KeyC для Егорбанана (из v53)
    if (e.code === 'KeyC' && player.character === 'banana' && !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE && !window.__POTATO_MODE && !player.isFlying) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (_bananaFreezeCd > 0) {
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), `*❄ КРИО КД ${_bananaFreezeCd.toFixed(1)}с*`, '#00f2fe');
        return;
      }
      _bananaFreezeCd = 7.5;
      player.hp = Math.min(player.maxHp, player.hp + 85);
      player.en = player.maxEn;
      spawnGroundCrackRing(player.pos, 0x00f2fe, 22);
      spawnParticles(player.pos.clone().add(new THREE.Vector3(0, 2, 0)), 0x00f2fe, 24);
      for (let i = 0; i < enemies.length; i++) {
        const en = enemies[i];
        if (en.group.position.distanceTo(player.pos) <= 22) {
          en._rooted = 5.0;
          en.vel.set(0, 0, 0);
          damageEnemy(en, 95, new THREE.Vector3(), '*❄ ЗАМОРОЖЕН!*');
        }
      }
      sendMP('pvp_ability', { type: 'freeze', radius: 22 });
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 4, 0)), '❄️ КРИО-ЗАМОРОЗКА! ❄️', '#00f2fe');
      SoundFX.devastator();
      updateHUD();
    }

    // Божественный Синтез на KeyT для Нано-Егорбанана (suitIdx === 4)
    if (e.code === 'KeyT' && player.character === 'banana' && player.suitIdx === 4 && !PEPPER_MODE && !CARROT_MODE && !LEMON_MODE && !window.__POTATO_MODE) {
      if (_nanoUltCd > 0) {
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), `*T КД ${Math.ceil(_nanoUltCd)}с*`, '#ff4400');
        return;
      }
      if (!_nanoTCharging) {
        _nanoTCharging = true;
        _nanoTHoldTimer = 0;
        nanoTPanel.style.display = 'block';
      }
    }
  }, true);

  window.addEventListener('keyup', function (e) {
    if (e.code === 'KeyT' && _nanoTCharging) {
      _nanoTCharging = false;
      nanoTPanel.style.display = 'none';
    }
  });

  // 7. Полная логика 5-го персонажа: Моргенкартошка и Громтомат + Модули Эволюции («Крахмальный Джаггернаут» и «Термоядерный Кетчуп»)
  const _origGetSuitData = window.getSuitData;
  window.getSuitData = function () {
    if (window.__POTATO_MODE) {
      if (window.__POTATO_FORM === 1) {
        return { id: 'potato1', name: 'МОРГЕНКАРТОШКА', desc: 'Танк корней и земли.', maxHp: 800, maxEn: 300, speed: 23, dmg: 95, canFly: false, level: 1, slashColor: 0x2ecc71, quote: '' };
      } else {
        return { id: 'potato2', name: 'ГРОМТОМАТ', desc: 'Магматический боксёр.', maxHp: 620, maxEn: 400, speed: 31, dmg: 76, canFly: false, level: 1, slashColor: 0xff2200, quote: '' };
      }
    }
    return _origGetSuitData ? _origGetSuitData.apply(this, arguments) : SUITS[player.suitIdx];
  };

  function switchPotatoForm(form) {
    window.__POTATO_FORM = form === 2 ? 2 : 1;
    player.maxHp = window.__POTATO_FORM === 1 ? 800 : 620;
    player.hp = Math.min(player.hp, player.maxHp);
    if (typeof window.rebuildHeroMesh === 'function') window.rebuildHeroMesh();

    const isMorg = window.__POTATO_FORM === 1;
    const badge = document.querySelector('.suit-badge');
    if (badge) badge.innerText = isMorg ? '🥔 МОРГЕНКАРТОШКА' : '🍅 ГРОМТОМАТ';
    const powers = document.getElementById('ui-powers-desc');
    if (powers) {
      powers.innerHTML = isMorg
        ? '<b>ЛКМ:</b> 3-Hit Молот | <b>Q:</b> Громовой Молот | <b>C:</b> Корни (+250 HP) | <b>F:</b> Таран | <b>R/1/2:</b> Форма'
        : '<b>ЛКМ:</b> 5-Hit Бокс | <b>Q:</b> Сверхнова | <b>C:</b> Пламя | <b>F:</b> Струя Соуса | <b>T:</b> Портал | <b>R:</b> Форма';
    }

    spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3.2, 0)), isMorg ? '🥔 МОРГЕНКАРТОШКА!' : '🍅 ГРОМТОМАТ!', isMorg ? '#2ecc71' : '#ff2200');
    showPatchToast(isMorg ? '🥔 ФОРМА ТАНКА' : '🍅 ФОРМА БЕРСЕРКА', POTATO_QUOTES[Math.floor(Math.random() * POTATO_QUOTES.length)], isMorg ? '#2ecc71' : '#ff2200');
    SoundFX.devastator();
    triggerHitstopAndChroma(0.08, 0.5, 1.1);

    // Модуль «Крахмальный Джаггернаут»: переключение форм на R вызывает гравитационную ударную волну
    if (EvoModules.has('potato_starch_juggernaut')) {
      spawnGroundCrackRing(player.pos, 0xf9ca24, 16);
      for (let i = enemies.length - 1; i >= 0; i--) {
        const en = enemies[i];
        const d = en.group.position.distanceTo(player.pos);
        if (d <= 15) {
          const push = en.group.position.clone().sub(player.pos).normalize().multiplyScalar(18);
          en.vel.y = Math.max(en.vel.y, 16);
          damageEnemy(en, 165, push, '*💥 ГРАВИ-ВОЛНА ФОРМЫ!*');
        }
      }
    }
    sendMP('charState', { char: 'potato', form: window.__POTATO_FORM });
  }
  window.switchPotatoForm = switchPotatoForm;

  const _origPerformPrimaryAttack = window.performPrimaryAttack;
  window.performPrimaryAttack = function () {
    if (player.isDead || player.consumeState) return;
    applyMeleeSoftLockLunge(6.0);

    if (!window.__POTATO_MODE) {
      if (_origPerformPrimaryAttack) return _origPerformPrimaryAttack.apply(this, arguments);
      return;
    }
    if (player.attackTimer > 0.08) return;
    if (potatoComboTimer <= 0) potatoCombo = 0;
    potatoComboTimer = 1.5;

    const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw));
    const isMorg = window.__POTATO_FORM === 1;
    const maxCombo = isMorg ? 3 : 5;
    potatoCombo = (potatoCombo % maxCombo) + 1;

    const comboStep = isMorg && potatoCombo === 3 ? 5 : potatoCombo;
    player.comboStep = comboStep;
    player.attackDuration = PLAYER_COMBO[comboStep].dur;
    player.attackTimer = player.attackDuration;
    player.comboResetTimer = 1.5;
    player.facingYaw = player.camYaw;
    player.vel.x += fwd.x * PLAYER_COMBO[comboStep].lunge;
    player.vel.z += fwd.z * PLAYER_COMBO[comboStep].lunge;

    let baseDmg = isMorg ? 95 : 76;
    if (!isMorg && player._tomatoRage > 0) baseDmg *= 1.45;
    const isFinisher = potatoCombo === maxCombo;
    const dmgMult = isFinisher ? 2.5 : 1.0;

    const chest = new THREE.Vector3(player.pos.x, player.pos.y + 2.3, player.pos.z);
    const slashColor = isMorg ? 0x2ecc71 : 0xff2200;
    spawnSlashArc(chest.clone().add(fwd.clone().multiplyScalar(1.8)), player.facingYaw, PLAYER_COMBO[comboStep].tilt, slashColor, isMorg ? 5.2 : 4.2, 0.22);

    if (isFinisher) {
      if (isMorg) {
        spawnGroundCrackRing(new THREE.Vector3(player.pos.x + fwd.x * 3.6, 0, player.pos.z + fwd.z * 3.6), 0x2ecc71, 11);
        SoundFX.devastator();
        triggerHitstopAndChroma(0.06, 0.65, 1.15);
      } else {
        const fireBall = new THREE.Mesh(new THREE.SphereGeometry(0.72, 10, 10), new THREE.MeshBasicMaterial({ color: 0xff2200 }));
        fireBall.position.copy(chest);
        scene.add(fireBall);
        projectiles.push({ mesh: fireBall, vel: new THREE.Vector3(fwd.x * 48, 0, fwd.z * 48), life: 1.5, fromPlayer: true, dmg: baseDmg * 2.5, radius: 3.0 });
        spawnParticles(chest, 0xff2200, 12);
        triggerHitstopAndChroma(0.05, 0.6, 1.1);
      }
    }
    SoundFX.swing(190 + potatoCombo * 48);

    const hr = isFinisher ? (isMorg ? 10.5 : 6.8) : (isMorg ? 6.2 : 5.2);
    const hx = player.pos.x + fwd.x * 3.4;
    const hz = player.pos.z + fwd.z * 3.4;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const dx = e.group.position.x - hx;
      const dz = e.group.position.z - hz;
      if (dx * dx + dz * dz <= (hr + e.radius) * (hr + e.radius)) {
        if (isFinisher && isMorg) e.vel.y = 18;
        damageEnemy(e, baseDmg * dmgMult, new THREE.Vector3(fwd.x * 3.5, 0, fwd.z * 3.5), isFinisher ? (isMorg ? '*🔨 КРУШИТЕЛЬ ЗЕМЛИ!*' : '*🔥 ОГНЕННЫЙ ХУК!*') : '');
      }
    }
    checkCarDestruction(new THREE.Vector3(hx, 0, hz), hr);
  };

  const _origPerformDevastator = window.performDevastator;
  window.performDevastator = function () {
    if (!window.__POTATO_MODE) {
      if (_origPerformDevastator) return _origPerformDevastator.apply(this, arguments);
      return;
    }
    if (player.isDead || player.consumeState) return;

    if (window.__POTATO_FORM === 1) {
      if (player._potatoSlamCd > 0) return;
      player._potatoSlamCd = 4.0;
      player.vel.y = 22;
      SoundFX.whip();
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '⚡ ГРОМОВОЙ МОЛОТ! ⚡', '#8B4513');
      setTimeout(() => {
        player.vel.y = -85;
        setTimeout(() => {
          spawnGroundCrackRing(player.pos, 0x8B4513, 18);
          spawnParticles(player.pos.clone().add(new THREE.Vector3(0, 1, 0)), 0x8B4513, 28);
          SoundFX.boom();
          SoundFX.devastator();
          triggerHitstopAndChroma(0.12, 0.9, 1.4);
          spawnLandingCrater(player.pos, 5);
          for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            const d = e.group.position.distanceTo(player.pos);
            if (d < 15) {
              e.vel.y = Math.max(e.vel.y, 16);
              damageEnemy(e, 260 * (1 - d / 17), new THREE.Vector3(), '*🔨 ЗЕМЛЕТРЯСЕНИЕ МОЛОТА!*');
            }
          }
        }, 280);
      }, 360);
    } else {
      if (player._potatoNovaCd > 0) return;
      player._potatoNovaCd = 5.0;
      spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '🔥 СВЕРХНОВА ГРОМТОМАТА! 🔥', '#FF2200');
      SoundFX.devastator();
      SoundFX.boom();
      triggerHitstopAndChroma(0.1, 0.8, 1.3);
      spawnGroundCrackRing(player.pos, 0xFF2200, 15);
      spawnParticles(player.pos.clone().add(new THREE.Vector3(0, 2, 0)), 0xFF2200, 36);
      const hasThermo = EvoModules.has('potato_thermo_ketchup');
      for (let j = enemies.length - 1; j >= 0; j--) {
        const en = enemies[j];
        const dist = en.group.position.distanceTo(player.pos);
        if (dist < 15) {
          en.vel.y = Math.max(en.vel.y, 13);
          if (hasThermo) en._ketchupSlowTimer = 4.0;
          damageEnemy(en, 310 * (1 - dist / 17), new THREE.Vector3(), '*🔥 СВЕРХНОВА!*');
        }
      }
      if (hasThermo) {
        activeTimedZones.push({
          kind: 'ketchup_bomb',
          pos: player.pos.clone(),
          radius: 14,
          dmg: 280,
          color: 0xff2200,
          life: 2.0,
          maxLife: 2.0
        });
      }
    }
  };

  const _origTriggerUniqueAbilityF = window.triggerUniqueAbilityF;
  window.triggerUniqueAbilityF = function () {
    if (window.__POTATO_MODE) {
      if (player.isDead) return;
      const fwd = new THREE.Vector3(-Math.sin(player.camYaw), 0, -Math.cos(player.camYaw)).normalize();
      if (window.__POTATO_FORM === 1) {
        if (player._potatoRamCd > 0) return;
        player._potatoRamCd = 6.0;
        const startPos = player.pos.clone();
        player.vel.x += fwd.x * 95;
        player.vel.z += fwd.z * 95;
        player.dodgeIframes = 0.6;
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '💥 КРАХМАЛЬНЫЙ ТАРАН! 💥', '#8B4513');
        SoundFX.devastator();

        // Модуль «Крахмальный Джаггернаут»: пылающий огненно-земляной след на 5 секунд
        if (EvoModules.has('potato_starch_juggernaut')) {
          for (let s = 1; s <= 5; s++) {
            const trailPos = startPos.clone().addScaledVector(fwd, s * 3.8);
            const patchMesh = new THREE.Mesh(
              new THREE.CircleGeometry(2.6, 12),
              new THREE.MeshBasicMaterial({ color: 0xff5500, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
            );
            patchMesh.rotation.x = -Math.PI / 2;
            patchMesh.position.set(trailPos.x, 0.14, trailPos.z);
            scene.add(patchMesh);
            activeTimedZones.push({
              kind: 'starch_fire_trail',
              pos: trailPos,
              radius: 3.4,
              color: 0xff5500,
              mesh: patchMesh,
              life: 5.0,
              maxLife: 5.0,
              tickAccum: 0
            });
          }
        }

        setTimeout(() => {
          for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            if (e.group.position.distanceTo(player.pos) < 8.5) {
              e.vel.y = Math.max(e.vel.y, 18);
              damageEnemy(e, 195, fwd.clone().multiplyScalar(8), '*ТАРАН!*');
            }
          }
        }, 180);
      } else {
        if (player._potatoSauceCd > 0) return;
        player._potatoSauceCd = 3.0;
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '🍅 СТРУЯ СОУСА! 🍅', '#FF2200');
        const hasThermo = EvoModules.has('potato_thermo_ketchup');
        for (let step = 1; step < 16; step++) {
          setTimeout(() => {
            const p = player.pos.clone().addScaledVector(fwd, step * 1.15);
            spawnParticles(p, 0xcc0000, 3);
            for (let i = enemies.length - 1; i >= 0; i--) {
              const e = enemies[i];
              if (e.group.position.distanceTo(p) < 3.4) {
                if (hasThermo) e._ketchupSlowTimer = 4.0;
                damageEnemy(e, 32, fwd.clone(), '');
              }
            }
          }, step * 25);
        }
        if (hasThermo) {
          activeTimedZones.push({
            kind: 'ketchup_bomb',
            pos: player.pos.clone().addScaledVector(fwd, 10),
            radius: 9.0,
            dmg: 210,
            color: 0xff2200,
            life: 2.0,
            maxLife: 2.0
          });
        }
      }
      return;
    }

    // Кулдауны способностей F для костюмов Банана и Хохлоркови (из v53)
    player._suitCdMap = player._suitCdMap || [0, 0, 0, 0, 0];
    if (CARROT_MODE) {
      if (CARROT_FORM === 2) {
        if (player._suitCdMap[4] > 0) return;
        player._suitCdMap[4] = 8.0;
        window.carrotEarthquake();
        sendMP('pvp_ability', { type: 'earthquake', radius: 40 });
      } else {
        if (player._suitCdMap[3] > 0) return;
        player._suitCdMap[3] = 6.0;
        window.carrotRootBind();
      }
      return;
    }

    if (_origTriggerUniqueAbilityF) return _origTriggerUniqueAbilityF.apply(this, arguments);
  };

  // Клавиши C, T, R, 1, 2 для Моргенкартошки / Громтомата
  window.addEventListener('keydown', function (e) {
    if (!window.__POTATO_MODE || player.isDead) return;
    if (e.code === 'KeyC') {
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      if (window.__POTATO_FORM === 1) {
        if (player._potatoHealCd > 0) return;
        player._potatoHealCd = 10.0;
        player.hp = Math.min(player.maxHp, player.hp + 250);
        player._potatoArmor = 4.0;
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '🌱 ПИТАНИЕ КОРНЕЙ (+250 HP)', '#2ecc71');
        spawnGroundCrackRing(player.pos, 0x2ecc71, 8);
        SoundFX.hit(150, 0.3);
        updateHUD();
      } else {
        if (player._potatoRageCd > 0) return;
        player._potatoRageCd = 12.0;
        player._tomatoRage = 6.0;
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '🔥 ИСПЫТАНИЕ ПЛАМЕНЕМ!', '#FF4400');
        SoundFX.devastator();
      }
    } else if (e.code === 'KeyT' && window.__POTATO_FORM === 2) {
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      if (player._potatoPortalCd > 0) return;
      let bestE = null, bestD = 9999;
      for (let i = 0; i < enemies.length; i++) {
        const d = player.pos.distanceTo(enemies[i].group.position);
        if (d < bestD) { bestD = d; bestE = enemies[i]; }
      }
      if (bestE) {
        player._potatoPortalCd = 25.0;
        player.pos.copy(bestE.group.position).add(new THREE.Vector3(0, 0, 3.8));
        player.vel.set(0, 0, 0);
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), '🍅 ТОМАТНЫЙ ПОРТАЛ!', '#FF2200');
        spawnParticles(player.pos.clone(), 0xFF2200, 20);
        SoundFX.whip();
      }
    } else if (e.code === 'KeyR') {
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      switchPotatoForm(window.__POTATO_FORM === 1 ? 2 : 1);
    } else if (e.code === 'Digit1' || e.code === 'Numpad1') {
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      if (window.__POTATO_FORM !== 1) switchPotatoForm(1);
    } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      if (window.__POTATO_FORM !== 2) switchPotatoForm(2);
    }
  }, true);

  window.equipPotato = function () {
    window.__POTATO_MODE = true;
    window.__POTATO_FORM = 1;
    player.character = 'potato';
    player.suitIdx = 4;
    PEPPER_MODE = false; CARROT_MODE = false; LEMON_MODE = false; CARROT_FORM = 1;
    playerGroup.scale.set(1, 1, 1);
    player.maxHp = 800; player.hp = 800; player.maxEn = 300; player.en = 300;
    window.rebuildHeroMesh();
    switchPotatoForm(1);
    if (typeof Companion !== 'undefined' && Companion.group) Companion.group.visible = false;
    const hotbar = document.getElementById('suit-hotbar');
    if (hotbar) hotbar.style.display = 'none';
    heroAuraLight.color.setHex(0x2ecc71);
    updateHUD();
    updateScoreDisplay();
  };

  const _origRebuildHero = window.rebuildHeroMesh;
  window.rebuildHeroMesh = function () {
    if (window.__POTATO_MODE) {
      if (player.mesh && playerGroup.children.indexOf(player.mesh) >= 0) {
        safeDisposeGroup(player.mesh);
        playerGroup.remove(player.mesh);
      }
      player.mesh = window.createPotatoMesh(window.__POTATO_FORM);
      playerGroup.add(player.mesh);
      const hotbar = document.getElementById('suit-hotbar');
      if (hotbar) hotbar.style.display = 'none';
      if (typeof Companion !== 'undefined' && Companion.group) Companion.group.visible = false;
      return;
    }
    if (_origRebuildHero) _origRebuildHero.apply(this, arguments);
    fixCarrotMeshGround();
    applyActiveEvoVisuals();
  };

  const _origToggleCarrotForm = window.toggleCarrotForm;
  window.toggleCarrotForm = function () {
    if (_origToggleCarrotForm) _origToggleCarrotForm.apply(this, arguments);
    if (player.character === 'carrot') {
      player.maxHp = CARROT_FORM === 2 ? 800 : 480;
      player.hp = player.maxHp;
      updateHUD();
    }
    fixCarrotMeshGround();
    updateEntBouldersMesh();
  };

  const _origStartGameSession = window.startGameSession;
  window.startGameSession = function (loaded) {
    if (player.character === 'potato') {
      SoundFX.init();
      gameStarted = true;
      player.runStartTime = performance.now();
      document.getElementById('start-screen').style.display = 'none';
      document.getElementById('char-select').style.display = 'none';
      ignoreNextMouseFrames = 2;
      try { if (canvas.requestPointerLock) canvas.requestPointerLock(); } catch (e) {}
      if (typeof Mutations !== 'undefined' && Mutations.applyAll) Mutations.applyAll();
      if (loaded) {
        player.score = loaded.score || 0;
        player.wave = loaded.wave || 1;
        player.ep = loaded.ep || 350;
        if (loaded.mutations && typeof Mutations !== 'undefined') Mutations.owned = loaded.mutations;
      }
      window.equipPotato();
      return;
    }
    if (_origStartGameSession) return _origStartGameSession.apply(this, arguments);
  };

  // Добавление карточки Моргенкартошки в меню выбора персонажей (#char-select) без setInterval
  function injectPotatoCharacterCard() {
    const cs = document.getElementById('char-select');
    if (!cs || document.getElementById('btn-potato')) return;
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
      '<p><b>Морген (форма 1):</b> 3-hit молот с рунами земли, прыжок-молот, корни+броня, таран.<br><b>Громтомат (форма 2):</b> 5-hit бокс, сверхнова, струя соуса, портал.</p>' +
      '<button style="background:linear-gradient(90deg,#8B4513,#D2B48C);color:#fff;font-weight:900;">ИГРАТЬ ЗА КАРТОШКУ</button>';
    card.addEventListener('click', function () {
      player.character = 'potato';
      document.getElementById('char-select').style.display = 'none';
      window.startGameSession(window.__pendingLoad || null);
    });
    grid.appendChild(card);
  }
  injectPotatoCharacterCard();

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ ЕДИНЫЙ ДИСПЕТЧЕР ВРЕМЕНИ В updatePlayerChoreographyAndCamera(dt, now)
  // ═══ + ПРУЖИННАЯ КАМЕРА С SHOULDER OFFSET (+0.8 rgt)
  // ═══════════════════════════════════════════════════════════════════════════
  let _wasDiveAttacking = false;
  const _origUpdatePlayerChoreo = window.updatePlayerChoreographyAndCamera;

  window.updatePlayerChoreographyAndCamera = function (dt, now) {
    // Инициализация мира при первом кадре
    if (window.__SKY_RAILS.length === 0 && typeof buildings !== 'undefined' && buildings.length > 0) {
      spawnExtraCityHills();
      buildNeonSkyRails();
      buildAerialSpeederTraffic();
      initCelestialBody();
    }

    // 1. Обновление небесного светила (Солнце / Луна)
    if (_celestialBody && typeof TimeOfDay !== 'undefined') {
      const p = TimeOfDay.progress;
      const angle = p * Math.PI * 2 - Math.PI / 2;
      _celestialBody.position.set(Math.cos(angle) * 3500, Math.sin(angle) * 3500, -1000);
      if (p < 0.2 || p > 0.8) {
        _celestialBody.material.color.setHex(0xc0c0ff);
        _celestialBody.scale.setScalar(0.65);
      } else {
        _celestialBody.material.color.setHex(0xffee88);
        _celestialBody.scale.setScalar(1.0);
      }
    }

    // 2. Единый цикл всех кулдаунов и таймеров (вместо разрозненных setInterval)
    if (_vineHarpoonCdV65 > 0) _vineHarpoonCdV65 = Math.max(0, _vineHarpoonCdV65 - dt);
    if (_bananaFreezeCd > 0) _bananaFreezeCd = Math.max(0, _bananaFreezeCd - dt);
    if (_nanoUltCd > 0) _nanoUltCd = Math.max(0, _nanoUltCd - dt);
    if (player._potatoArmor > 0) player._potatoArmor = Math.max(0, player._potatoArmor - dt);
    if (player._potatoHealCd > 0) player._potatoHealCd = Math.max(0, player._potatoHealCd - dt);
    if (player._potatoRageCd > 0) player._potatoRageCd = Math.max(0, player._potatoRageCd - dt);
    if (player._potatoRamCd > 0) player._potatoRamCd = Math.max(0, player._potatoRamCd - dt);
    if (player._potatoSauceCd > 0) player._potatoSauceCd = Math.max(0, player._potatoSauceCd - dt);
    if (player._potatoPortalCd > 0) player._potatoPortalCd = Math.max(0, player._potatoPortalCd - dt);
    if (player._potatoSlamCd > 0) player._potatoSlamCd = Math.max(0, player._potatoSlamCd - dt);
    if (player._potatoNovaCd > 0) player._potatoNovaCd = Math.max(0, player._potatoNovaCd - dt);
    if (player._tomatoRage > 0) player._tomatoRage = Math.max(0, player._tomatoRage - dt);
    if (potatoComboTimer > 0) {
      potatoComboTimer -= dt;
      if (potatoComboTimer <= 0) potatoCombo = 0;
    }
    if (player._suitCdMap) {
      for (let i = 0; i < 5; i++) {
        if (player._suitCdMap[i] > 0) player._suitCdMap[i] = Math.max(0, player._suitCdMap[i] - dt);
      }
    }

    // Зарядка Божественного Синтеза на KeyT (Нано-Егорбанан)
    if (_nanoTCharging) {
      _nanoTHoldTimer += dt;
      const bar = document.getElementById('v65-t-bar');
      if (bar) bar.style.width = Math.min(100, (_nanoTHoldTimer / 5.0) * 100) + '%';
      if (_nanoTHoldTimer >= 5.0) {
        _nanoTCharging = false;
        nanoTPanel.style.display = 'none';
        _nanoUltCd = 102.5;
        spawnGroundCrackRing(player.pos, 0x00f2fe, 48);
        spawnParticles(player.pos.clone().add(new THREE.Vector3(0, 3, 0)), 0x00f2fe, 35);
        for (let i = enemies.length - 1; i >= 0; i--) {
          if (enemies[i].group.position.distanceTo(player.pos) <= 50) {
            damageEnemy(enemies[i], 3000, new THREE.Vector3(0, 15, 0), '*⚡ БОЖЕСТВЕННЫЙ СИНТЕЗ!*');
          }
        }
        sendMP('pvp_ability', { type: 'nano_ult', radius: 50 });
        spawnComicPop(player.pos.clone().add(new THREE.Vector3(0, 5, 0)), '⚡ БОЖЕСТВЕННЫЙ СИНТЕЗ! ⚡', '#00f2fe');
        SoundFX.devastator();
        SoundFX.boom();
      }
    }

    // Периодическая проверка высоты стоп Хохлоркови
    _carrotGroundCheckAccum += dt;
    if (_carrotGroundCheckAccum >= 0.5) {
      _carrotGroundCheckAccum = 0;
      fixCarrotMeshGround();
    }

    // Вращение каменных глыб «Коры Древнего Энта» вокруг Гиганта Хохлоркови
    updateEntBouldersMesh();
    if (_entBoulderGroup) {
      _entBoulderGroup.rotation.y += dt * 2.8;
      for (let i = enemies.length - 1; i >= 0; i--) {
        const en = enemies[i];
        if (en.group.position.distanceTo(player.pos) < 6.8 && (!en._entKnockCd || en._entKnockCd <= 0)) {
          en._entKnockCd = 1.1;
          en.vel.y = Math.max(en.vel.y, 14);
          const push = en.group.position.clone().sub(player.pos).normalize().multiplyScalar(10);
          damageEnemy(en, 85, push, '*🪨 СБИТ ГЛЫБОЙ ЭНТА!*');
        }
      }
    }

    // Отслеживание приземления после pepperDiveAttack для модуля «Метеоритное Ядро»
    const preDive = player.diveAttackActive;
    _wasDiveAttacking = preDive;

    // Вызов базового цикла движения и камеры
    if (_origUpdatePlayerChoreo) {
      _origUpdatePlayerChoreo.call(this, dt, now);
    }

    if (_wasDiveAttacking && !player.diveAttackActive && player.isGrounded && PEPPER_MODE && EvoModules.has('pepper_meteor_core')) {
      spawnMeteorCoreLavaGeyser(player.pos.clone());
      _wasDiveAttacking = false;
    }

    // 3. Обновление рельсового гринда (Sky-Rail), аэро-спидеров, гидрантов, 3D-обломков, рэгдоллов и света
    updateSkyRailsAndGrinding(dt, now);
    updateAerialSpeedersAndHydrants(dt, now);
    updateDebrisAndZones(dt);
    updateRagdolls(dt, now);
    updatePooledProjectileLights();

    // 4. Применение плавной 2-суставной кинематики, Smear Frames и Ribbon Trails
    applySmoothHeroKinematics(dt, now);
    updateWeaponSmearAndRibbonTrail(dt);

    // 5. Пружинная камера со смещением за правое плечо (+0.8 по вектору rgt), чтобы модель не закрывала #crosshair
    const rgt = new THREE.Vector3(Math.cos(player.camYaw), 0, -Math.sin(player.camYaw));
    const shoulderOffset = rgt.clone().multiplyScalar(0.8);
    camera.position.add(shoulderOffset);
    const lookTarget = new THREE.Vector3(
      player.pos.x + shoulderOffset.x,
      player.pos.y + (CARROT_FORM === 2 ? 5.0 : 2.8),
      player.pos.z + shoulderOffset.z
    );
    camera.lookAt(lookTarget);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ РАСШИРЕННОЕ ОБНОВЛЕНИЕ ВРАГОВ (ДЕТАЛИ МОДЕЛЕЙ, STAGGER, БОЕВЫЕ МОДУЛИ)
  // ═══════════════════════════════════════════════════════════════════════════
  const _origUpdateEnemies = window.updateEnemiesAndVehicles;
  window.updateEnemiesAndVehicles = function (dt, now) {
    // Пре-обработка эффектов боевых модулей на врагах (замедление кетчупом, яд плюща, hit-stagger)
    for (let i = enemies.length - 1; i >= 0; i--) {
      const en = enemies[i];
      if (!en || !en.group) continue;
      enhanceEnemyModel(en);

      if (en._entKnockCd > 0) en._entKnockCd -= dt;

      // Пружинящий Hit-Stagger при попадании
      if (en._hitStagger > 0) {
        en._hitStagger = Math.max(0, en._hitStagger - dt);
        en.group.rotation.x = -Math.sin((en._hitStagger / 0.2) * Math.PI) * 0.28;
      } else {
        en.group.rotation.x = THREE.MathUtils.lerp(en.group.rotation.x || 0, 0, Math.min(1, dt * 10));
      }

      // Модуль «Ядовитый Плющ» Хохлоркови: периодический урон ядом + вампиризм HP
      if (en._poisonIvyTimer > 0) {
        en._poisonIvyTimer -= dt;
        en._poisonTick = (en._poisonTick || 0) + dt;
        if (en._poisonTick >= 0.5) {
          en._poisonTick = 0;
          const dmg = (en._poisonIvyDps || 45) * 0.5;
          player.hp = Math.min(player.maxHp, player.hp + 12);
          spawnParticles(en.group.position.clone().add(new THREE.Vector3(0, 1.8, 0)), 0x00ff88, 3);
          damageEnemy(en, dmg, new THREE.Vector3(), '');
          if (!enemies.includes(en)) continue;
        }
      }

      // Модуль «Термоядерный Кетчуп» Громтомата: замедление врагов на 60%
      if (en._ketchupSlowTimer > 0) {
        en._ketchupSlowTimer -= dt;
        if (!en._origBaseSpeed) en._origBaseSpeed = en.speed;
        en.speed = en._origBaseSpeed * 0.4;
      } else if (en._origBaseSpeed) {
        en.speed = en._origBaseSpeed;
        en._origBaseSpeed = null;
      }

      // Анимация деталей моделей врагов (мед-дрон, мигающие бочки камикадзе, колёса и отдача танка, винт вертолёта, дым Battle Damage)
      if (en._medDrone) {
        en._medDrone.position.x = Math.cos(now * 0.004 + i) * 1.35;
        en._medDrone.position.z = Math.sin(now * 0.004 + i) * 1.35;
        en._medDrone.rotation.y += dt * 4;
      }
      if (en._kamikazeBarrels) {
        const blinkOn = Math.sin(now * 0.025) > 0;
        en._kamikazeBarrels.children.forEach((b) => {
          if (b.material) b.material.color.setHex(blinkOn ? 0xffff00 : 0xff0000);
        });
      }
      if (en._tankWheels && en._tankWheels.length && en._moving) {
        for (let w = 0; w < en._tankWheels.length; w++) {
          en._tankWheels[w].rotation.x += dt * 6;
        }
      }
      if (en._tankBarrel) {
        const targetZ = en._shooting > 0 ? 1.45 : 2.0;
        en._tankBarrel.position.z = THREE.MathUtils.lerp(en._tankBarrel.position.z, targetZ, Math.min(1, dt * 12));
      }
      if (en._tailRotor) {
        en._tailRotor.rotation.x += dt * 24;
        // Наклон корпуса вертолёта по вектору скорости
        en.group.rotation.x = THREE.MathUtils.lerp(en.group.rotation.x, 0.18, Math.min(1, dt * 5));
      }
      if (en._battleDamaged && Math.random() < 0.35) {
        const smokePos = en.group.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 2.2, (Math.random() - 0.5) * 1.2));
        spawnParticles(smokePos, Math.random() < 0.4 ? 0xfff200 : 0x222222, 1);
        if (en._exposedCoreMesh) en._exposedCoreMesh.rotation.y += dt * 6;
      }
    }

    if (_origUpdateEnemies) {
      _origUpdateEnemies.call(this, dt, now);
    }

    // Ускорение стрельбы пауков Димона Лимона (+50%) и взрыв мини-щита при таране («Мега-Улей»)
    if (LEMON_MODE && EvoModules.has('lemon_mega_hive') && typeof LEMON_BOTS !== 'undefined') {
      for (let i = 0; i < LEMON_BOTS.length; i++) {
        const b = LEMON_BOTS[i];
        if (!b || !b.alive) continue;
        if (b.cd > 0) b.cd = Math.max(0, b.cd - dt * 0.5);
        if (b.kamikazeTarget && b.kamikazeTarget.group && b.group.position.distanceTo(b.kamikazeTarget.group.position) < 3.2) {
          spawnGroundCrackRing(b.group.position, 0x44ffaa, 10);
          for (let j = enemies.length - 1; j >= 0; j--) {
            if (enemies[j].group.position.distanceTo(b.group.position) < 8.5) {
              damageEnemy(enemies[j], 160, new THREE.Vector3(0, 12, 0), '*🛡️ ВЗРЫВ ЩИТА ПАУКА!*');
            }
          }
        }
      }
    }
  };

  console.log('🍌 [PATCH v65] ULTIMATE NEXT-GEN OVERHAUL успешно инициализирован!');
})();
