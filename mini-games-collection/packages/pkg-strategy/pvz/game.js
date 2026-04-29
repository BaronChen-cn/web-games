var storage = require('../../../lib/storage');

function initGame(adapter) {
  var ctx = adapter.ctx;
  var W = adapter.width;
  var H = adapter.height;

  // ===================== CONFIG =====================
  var ROWS = 5, COLS = 9;
  var CELL = Math.floor(W / COLS);
  // Recalculate H to fit 5 rows if needed
  var BOARD_H = ROWS * CELL;
  var BOARD_OFFSET_Y = H - BOARD_H; // offset from top to push board down

  var PLANT_DEFS = [
    { id: 'sunflower', name: '向日葵', cost: 50, cd: 7, hp: 100, color: '#f5e200', emoji: '🌻', cooldownRemaining: 0 },
    { id: 'peashooter', name: '豌豆射手', cost: 100, cd: 7.5, hp: 100, color: '#39ff14', emoji: '🌱', cooldownRemaining: 0 },
    { id: 'wallnut', name: '坚果', cost: 50, cd: 20, hp: 600, color: '#c8830a', emoji: '🥜', cooldownRemaining: 0 },
    { id: 'iceshooter', name: '寒冰射手', cost: 175, cd: 7.5, hp: 100, color: '#00cfff', emoji: '❄️', cooldownRemaining: 0 },
    { id: 'cherry', name: '樱桃炸弹', cost: 150, cd: 15, hp: 100, color: '#ff3333', emoji: '🍒', cooldownRemaining: 0 },
    { id: 'twinsun', name: '双枪向日葵', cost: 200, cd: 7.5, hp: 100, color: '#ffaa00', emoji: '🌟', cooldownRemaining: 0 }
  ];

  var ZOMBIE_DEFS = {
    normal: { name: '普通僵尸', hp: 80, speed: 24, dmg: 1, armor: 0, score: 10 },
    cone: { name: '路障僵尸', hp: 150, speed: 24, dmg: 1, armor: 60, score: 20 },
    bucket: { name: '铁桶僵尸', hp: 280, speed: 16, dmg: 1, armor: 160, score: 40 },
    jumper: { name: '跳跳僵尸', hp: 100, speed: 30, dmg: 1, armor: 0, score: 25 }
  };

  var LEVELS = [
    { waves: [
      [{ type: 'normal', count: 2, interval: 3500 }],
      [{ type: 'normal', count: 3, interval: 3000 }],
      [{ type: 'normal', count: 3, interval: 2800 }, { type: 'cone', count: 1, interval: 4000 }],
      [{ type: 'normal', count: 4, interval: 2500 }, { type: 'cone', count: 1, interval: 3500 }],
      [{ type: 'normal', count: 4, interval: 2000 }, { type: 'cone', count: 1, interval: 3000 }]
    ]},
    { waves: [
      [{ type: 'normal', count: 3, interval: 2800 }, { type: 'cone', count: 1, interval: 3500 }],
      [{ type: 'normal', count: 4, interval: 2500 }, { type: 'cone', count: 2, interval: 3000 }],
      [{ type: 'cone', count: 3, interval: 2500 }, { type: 'jumper', count: 1, interval: 4000 }],
      [{ type: 'normal', count: 5, interval: 2000 }, { type: 'cone', count: 2, interval: 2500 }, { type: 'bucket', count: 1, interval: 4500 }],
      [{ type: 'normal', count: 6, interval: 1800 }, { type: 'cone', count: 3, interval: 2200 }, { type: 'bucket', count: 2, interval: 4000 }]
    ]},
    { waves: [
      [{ type: 'normal', count: 5, interval: 2000 }, { type: 'cone', count: 2, interval: 2500 }],
      [{ type: 'cone', count: 4, interval: 2000 }, { type: 'jumper', count: 2, interval: 3000 }],
      [{ type: 'normal', count: 5, interval: 1800 }, { type: 'bucket', count: 2, interval: 3500 }],
      [{ type: 'cone', count: 5, interval: 2000 }, { type: 'bucket', count: 2, interval: 3200 }, { type: 'jumper', count: 2, interval: 3000 }],
      [{ type: 'normal', count: 10, interval: 1200 }, { type: 'cone', count: 5, interval: 1800 }, { type: 'bucket', count: 3, interval: 3000 }]
    ]},
    { waves: [
      [{ type: 'cone', count: 4, interval: 2000 }, { type: 'bucket', count: 2, interval: 3000 }],
      [{ type: 'jumper', count: 4, interval: 2500 }, { type: 'normal', count: 4, interval: 1800 }],
      [{ type: 'bucket', count: 4, interval: 3000 }, { type: 'cone', count: 4, interval: 2200 }],
      [{ type: 'normal', count: 8, interval: 1500 }, { type: 'jumper', count: 4, interval: 2500 }, { type: 'bucket', count: 3, interval: 3000 }],
      [{ type: 'normal', count: 12, interval: 1000 }, { type: 'cone', count: 6, interval: 1800 }, { type: 'bucket', count: 4, interval: 2800 }, { type: 'jumper', count: 3, interval: 2500 }]
    ]},
    { waves: [
      [{ type: 'bucket', count: 4, interval: 2800 }, { type: 'jumper', count: 3, interval: 2500 }],
      [{ type: 'cone', count: 6, interval: 1800 }, { type: 'bucket', count: 3, interval: 2800 }],
      [{ type: 'normal', count: 8, interval: 1300 }, { type: 'jumper', count: 5, interval: 2200 }, { type: 'bucket', count: 3, interval: 2800 }],
      [{ type: 'cone', count: 8, interval: 1600 }, { type: 'bucket', count: 5, interval: 2500 }, { type: 'jumper', count: 4, interval: 2200 }],
      [{ type: 'normal', count: 15, interval: 800 }, { type: 'cone', count: 8, interval: 1500 }, { type: 'bucket', count: 6, interval: 2500 }, { type: 'jumper', count: 5, interval: 2000 }]
    ]},
    { waves: [
      [{ type: 'bucket', count: 5, interval: 2500 }, { type: 'jumper', count: 4, interval: 2200 }],
      [{ type: 'normal', count: 10, interval: 1200 }, { type: 'cone', count: 6, interval: 1800 }, { type: 'bucket', count: 4, interval: 2800 }],
      [{ type: 'jumper', count: 8, interval: 1800 }, { type: 'bucket', count: 5, interval: 2500 }],
      [{ type: 'normal', count: 12, interval: 1000 }, { type: 'cone', count: 8, interval: 1500 }, { type: 'bucket', count: 6, interval: 2500 }, { type: 'jumper', count: 6, interval: 2000 }],
      [{ type: 'normal', count: 20, interval: 600 }, { type: 'cone', count: 12, interval: 1200 }, { type: 'bucket', count: 8, interval: 2200 }, { type: 'jumper', count: 8, interval: 1800 }]
    ]}
  ];

  // ===================== STATE =====================
  var gameState = 'menu';
  var sun = 300;
  var lives = 3;
  var currentLevel = parseInt(storage.getItem('pvz_level') || '0', 10);
  var currentWave = 0;
  var selectedCard = null;
  var score = 0;

  var grid = [];
  var zombies = [];
  var bullets = [];
  var sunDrops = [];
  var particles = [];
  var explosions = [];
  var notifications = [];

  var lastTime = 0;
  var sunDropTimer = 0;
  var sunDropInterval = 3500;
  var waveTimer = 0;
  var waveActive = false;
  var waveSpawnQueue = [];
  var waveSpawnTimer = 0;
  var allWavesDone = false;

  var animId = null;
  var plantIdCounter = 0;
  var zombieIdCounter = 0;
  var bulletIdCounter = 0;
  var sunDropIdCounter = 0;

  var touchX = 0, touchY = 0;

  // ===================== GRID =====================
  function initGrid() {
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (var c = 0; c < COLS; c++) grid[r][c] = null;
    }
  }

  function cellToXY(row, col) {
    return { x: col * CELL + CELL / 2, y: BOARD_OFFSET_Y + row * CELL + CELL / 2 };
  }

  function xyToCell(x, y) {
    var adjY = y - BOARD_OFFSET_Y;
    return { col: Math.floor(x / CELL), row: Math.floor(adjY / CELL) };
  }

  // ===================== PLANTS =====================
  function createPlant(type, row, col) {
    var def = null;
    for (var i = 0; i < PLANT_DEFS.length; i++) {
      if (PLANT_DEFS[i].id === type) { def = PLANT_DEFS[i]; break; }
    }
    var pos = cellToXY(row, col);
    return {
      id: plantIdCounter++,
      type: type,
      row: row, col: col,
      x: pos.x, y: pos.y,
      hp: def.hp,
      maxHp: def.hp,
      shootTimer: 0,
      sunTimer: 0,
      explodeTimer: type === 'cherry' ? 2000 : -1,
      exploded: false,
      anim: 0
    };
  }

  function getShootInterval(type) {
    if (type === 'peashooter') return 1500;
    if (type === 'iceshooter') return 1600;
    if (type === 'twinsun') return 1400;
    return 9999999;
  }

  function plantHasFiringRow(plant) {
    return plant.type === 'peashooter' || plant.type === 'iceshooter' || plant.type === 'twinsun';
  }

  function getZombiesInRow(row) {
    var result = [];
    for (var i = 0; i < zombies.length; i++) {
      if (zombies[i].row === row && !zombies[i].dead) result.push(zombies[i]);
    }
    return result;
  }

  // ===================== ZOMBIES =====================
  function createZombie(type, row) {
    var def = ZOMBIE_DEFS[type];
    return {
      id: zombieIdCounter++,
      type: type,
      row: row,
      x: W + CELL,
      y: BOARD_OFFSET_Y + row * CELL + CELL / 2,
      hp: def.hp,
      maxHp: def.hp,
      armorHp: def.armor,
      maxArmorHp: def.armor,
      speed: def.speed * (0.8 + Math.random() * 0.4),
      dmg: def.dmg,
      eating: false,
      eatTimer: 0,
      walkAnim: 0,
      dead: false,
      hasJumped: false,
      jumping: false,
      jumpTimer: 0,
      slowTimer: 0,
      scoreValue: def.score
    };
  }

  // ===================== BULLETS =====================
  function createBullet(plant, targetRow) {
    var isIce = plant.type === 'iceshooter';
    var isTwin = plant.type === 'twinsun';
    var result = [];
    var base = {
      id: bulletIdCounter++,
      x: plant.x + CELL / 2,
      row: targetRow,
      speed: 350,
      dmg: 1,
      ice: isIce,
      dead: false
    };
    if (isTwin) {
      result.push({ id: bulletIdCounter++, x: base.x, row: base.row, speed: base.speed, dmg: base.dmg, ice: base.ice, dead: false, y: plant.y - 6 });
      result.push({ id: base.id, x: base.x, row: base.row, speed: base.speed, dmg: base.dmg, ice: base.ice, dead: false, y: plant.y + 6 });
    } else {
      result.push({ id: base.id, x: base.x, row: base.row, speed: base.speed, dmg: base.dmg, ice: base.ice, dead: false, y: plant.y });
    }
    return result;
  }

  // ===================== SUN DROPS =====================
  function createSunDrop(x, y, fromSunflower) {
    return {
      id: sunDropIdCounter++,
      x: x,
      y: fromSunflower ? y - CELL * 0.3 : BOARD_OFFSET_Y - 20,
      targetY: fromSunflower ? y + CELL * 0.4 : y,
      dead: false,
      timer: 0,
      lifetime: 7000,
      rot: 0,
      fromSunflower: fromSunflower,
      amount: 25,
      falling: true
    };
  }

  // ===================== EXPLOSIONS =====================
  function createExplosion(cx, cy) {
    var col = Math.floor(cx / CELL);
    var row = Math.floor((cy - BOARD_OFFSET_Y) / CELL);
    for (var r = Math.max(0, row - 1); r <= Math.min(ROWS - 1, row + 1); r++) {
      for (var c = Math.max(0, col - 1); c <= Math.min(COLS - 1, col + 1); c++) {
        for (var zi = 0; zi < zombies.length; zi++) {
          var z = zombies[zi];
          if (z.dead) continue;
          if (z.row === r && z.x >= c * CELL && z.x <= (c + 1) * CELL) {
            z.hp -= 90;
            if (z.hp <= 0) { z.dead = true; score += z.scoreValue; }
          }
        }
      }
    }
    for (var i = 0; i < 30; i++) {
      var angle = Math.random() * Math.PI * 2;
      var spd = 60 + Math.random() * 180;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        life: 1, maxLife: 0.8 + Math.random() * 0.4,
        color: Math.random() < 0.5 ? '#ff4400' : '#ffaa00',
        size: 3 + Math.random() * 5,
        dead: false
      });
    }
    explosions.push({ x: cx, y: cy, r: 0, maxR: CELL * 1.8, life: 1, dead: false });
  }

  // ===================== NOTIFICATIONS =====================
  function addNotif(text, color) {
    color = color || '#39ff14';
    notifications.push({ text: text, color: color, y: BOARD_OFFSET_Y + BOARD_H / 2 - 40, life: 2, maxLife: 2, dead: false });
  }

  // ===================== WAVE SYSTEM =====================
  function startWave(waveIdx) {
    if (waveIdx >= LEVELS[currentLevel].waves.length) {
      allWavesDone = true;
      return;
    }
    currentWave = waveIdx;
    waveActive = true;
    waveSpawnQueue = [];
    var waveDef = LEVELS[currentLevel].waves[waveIdx];
    var t = 500;
    for (var gi = 0; gi < waveDef.length; gi++) {
      var group = waveDef[gi];
      for (var i = 0; i < group.count; i++) {
        var row = Math.floor(Math.random() * ROWS);
        waveSpawnQueue.push({ type: group.type, row: row, time: t });
        t += group.interval + (Math.random() - 0.5) * 500;
      }
    }
    waveSpawnQueue.sort(function (a, b) { return a.time - b.time; });
    waveSpawnTimer = 0;
    if (waveIdx === LEVELS[currentLevel].waves.length - 1) {
      addNotif('最后一波！坚持住！', '#ff4444');
    } else {
      addNotif('第' + (waveIdx + 1) + '波僵尸来袭！', '#ffdd00');
    }
  }

  // ===================== HUD UPDATE =====================
  function pushHUD() {
    var totalWaves = LEVELS[currentLevel].waves.length;
    var pct = ((currentWave + (waveActive ? 0.5 : 0)) / totalWaves) * 100;
    adapter.updateHUD({
      sunCount: sun,
      cards: PLANT_DEFS.map(function (p) {
        return {
          id: p.id,
          name: p.name,
          emoji: p.emoji,
          cost: p.cost,
          color: p.color,
          selected: selectedCard === p.id,
          affordable: sun >= p.cost,
          cooling: p.cooldownRemaining > 0,
          cooldownPct: p.cooldownRemaining > 0 ? Math.round((p.cooldownRemaining / p.cd) * 100) : 0
        };
      }),
      waveProgress: Math.min(pct, 100),
      waveLabel: '第' + (currentWave + 1) + '波 / ' + totalWaves + '波',
      levelLabel: '第' + (currentLevel + 1) + '关',
      livesArray: Array.from({ length: lives }, function (_, i) { return i + 1; }),
      overlayType: gameState,
      currentLevel: currentLevel,
      score: score
    });
  }

  // ===================== DRAWING =====================
  function drawBackground() {
    ctx.fillStyle = '#0a1a05';
    ctx.fillRect(0, 0, W, H);

    // Top area (above board)
    if (BOARD_OFFSET_Y > 0) {
      ctx.fillStyle = '#071505';
      ctx.fillRect(0, 0, W, BOARD_OFFSET_Y);
    }

    // Row stripes
    for (var r = 0; r < ROWS; r++) {
      ctx.fillStyle = r % 2 === 0 ? '#0b2108' : '#0f2b0c';
      ctx.fillRect(0, BOARD_OFFSET_Y + r * CELL, W, CELL);
    }

    // Grid lines
    ctx.lineWidth = 1;
    for (var c = 0; c <= COLS; c++) {
      ctx.strokeStyle = 'rgba(80,200,60,0.1)';
      ctx.beginPath(); ctx.moveTo(c * CELL, BOARD_OFFSET_Y); ctx.lineTo(c * CELL, BOARD_OFFSET_Y + BOARD_H); ctx.stroke();
    }
    for (var r2 = 0; r2 <= ROWS; r2++) {
      ctx.strokeStyle = r2 === 0 || r2 === ROWS ? 'rgba(80,200,60,0.22)' : 'rgba(80,200,60,0.1)';
      ctx.beginPath(); ctx.moveTo(0, BOARD_OFFSET_Y + r2 * CELL); ctx.lineTo(W, BOARD_OFFSET_Y + r2 * CELL); ctx.stroke();
    }

    // Left danger zone
    var stoneW = CELL * 0.55;
    ctx.fillStyle = 'rgba(180,30,30,0.07)';
    ctx.fillRect(0, BOARD_OFFSET_Y, stoneW, BOARD_H);
  }

  function drawPlantIcon(cx2, id, x, y, size) {
    cx2.save();
    cx2.translate(x, y);
    switch (id) {
      case 'sunflower': {
        for (var i = 0; i < 12; i++) {
          cx2.save(); cx2.rotate(i * Math.PI / 6);
          cx2.fillStyle = '#ffe033';
          cx2.beginPath(); cx2.ellipse(0, -size * 0.65, size * 0.16, size * 0.32, 0, 0, Math.PI * 2); cx2.fill();
          cx2.restore();
        }
        cx2.fillStyle = '#7a4200';
        cx2.beginPath(); cx2.arc(0, 0, size * 0.38, 0, Math.PI * 2); cx2.fill();
        cx2.fillStyle = '#c8700a';
        for (var si = 0; si < 7; si++) {
          var a = si * Math.PI * 2 / 7, r = size * 0.2;
          cx2.beginPath(); cx2.arc(Math.cos(a) * r, Math.sin(a) * r, size * 0.055, 0, Math.PI * 2); cx2.fill();
        }
        cx2.fillStyle = '#fff';
        cx2.beginPath(); cx2.arc(-size * 0.1, -size * 0.05, size * 0.085, 0, Math.PI * 2); cx2.fill();
        cx2.beginPath(); cx2.arc(size * 0.1, -size * 0.05, size * 0.085, 0, Math.PI * 2); cx2.fill();
        cx2.fillStyle = '#1a0800';
        cx2.beginPath(); cx2.arc(-size * 0.09, -size * 0.04, size * 0.05, 0, Math.PI * 2); cx2.fill();
        cx2.beginPath(); cx2.arc(size * 0.11, -size * 0.04, size * 0.05, 0, Math.PI * 2); cx2.fill();
        break;
      }
      case 'peashooter': {
        cx2.fillStyle = '#2ad400';
        cx2.beginPath(); cx2.ellipse(0, size * 0.48, size * 0.22, size * 0.36, 0, 0, Math.PI * 2); cx2.fill();
        cx2.fillStyle = '#2cd400';
        cx2.beginPath(); cx2.arc(0, -size * 0.08, size * 0.44, 0, Math.PI * 2); cx2.fill();
        cx2.fillStyle = '#1a6600';
        cx2.fillRect(size * 0.24, -size * 0.2, size * 0.42, size * 0.24);
        cx2.fillStyle = '#001800';
        cx2.beginPath(); cx2.ellipse(size * 0.64, -size * 0.08, size * 0.07, size * 0.1, 0, 0, Math.PI * 2); cx2.fill();
        cx2.fillStyle = '#fff';
        cx2.beginPath(); cx2.arc(-size * 0.14, -size * 0.14, size * 0.1, 0, Math.PI * 2); cx2.fill();
        cx2.fillStyle = '#001800';
        cx2.beginPath(); cx2.arc(-size * 0.12, -size * 0.13, size * 0.065, 0, Math.PI * 2); cx2.fill();
        break;
      }
      case 'wallnut': {
        cx2.fillStyle = '#c07818';
        cx2.beginPath(); cx2.arc(0, 0, size * 0.56, 0, Math.PI * 2); cx2.fill();
        cx2.fillStyle = 'rgba(50,20,0,0.3)';
        cx2.beginPath(); cx2.arc(size * 0.1, size * 0.12, size * 0.44, 0, Math.PI * 2); cx2.fill();
        cx2.fillStyle = '#fff';
        cx2.beginPath(); cx2.ellipse(-size * 0.17, -size * 0.1, size * 0.12, size * 0.09, 0, 0, Math.PI * 2); cx2.fill();
        cx2.beginPath(); cx2.ellipse(size * 0.17, -size * 0.1, size * 0.12, size * 0.09, 0, 0, Math.PI * 2); cx2.fill();
        cx2.fillStyle = '#2a1000';
        cx2.beginPath(); cx2.arc(-size * 0.17, -size * 0.1, size * 0.055, 0, Math.PI * 2); cx2.fill();
        cx2.beginPath(); cx2.arc(size * 0.17, -size * 0.1, size * 0.055, 0, Math.PI * 2); cx2.fill();
        break;
      }
      case 'iceshooter': {
        cx2.fillStyle = '#0090b8';
        cx2.beginPath(); cx2.ellipse(0, size * 0.48, size * 0.22, size * 0.36, 0, 0, Math.PI * 2); cx2.fill();
        cx2.fillStyle = '#00b8e0';
        cx2.beginPath(); cx2.arc(0, -size * 0.08, size * 0.44, 0, Math.PI * 2); cx2.fill();
        cx2.fillStyle = '#005577';
        cx2.fillRect(size * 0.24, -size * 0.2, size * 0.42, size * 0.24);
        cx2.fillStyle = '#001a2a';
        cx2.beginPath(); cx2.ellipse(size * 0.64, -size * 0.08, size * 0.07, size * 0.1, 0, 0, Math.PI * 2); cx2.fill();
        cx2.fillStyle = '#fff';
        cx2.beginPath(); cx2.arc(-size * 0.14, -size * 0.14, size * 0.1, 0, Math.PI * 2); cx2.fill();
        cx2.fillStyle = '#007aaa';
        cx2.beginPath(); cx2.arc(-size * 0.12, -size * 0.13, size * 0.065, 0, Math.PI * 2); cx2.fill();
        break;
      }
      case 'cherry': {
        cx2.fillStyle = '#ee1111';
        cx2.beginPath(); cx2.arc(-size * 0.24, size * 0.1, size * 0.36, 0, Math.PI * 2); cx2.fill();
        cx2.fillStyle = 'rgba(255,255,255,0.35)';
        cx2.beginPath(); cx2.ellipse(-size * 0.34, -size * 0.04, size * 0.1, size * 0.07, 0, 0, Math.PI * 2); cx2.fill();
        cx2.fillStyle = '#ee1111';
        cx2.beginPath(); cx2.arc(size * 0.24, size * 0.1, size * 0.36, 0, Math.PI * 2); cx2.fill();
        cx2.fillStyle = 'rgba(255,255,255,0.35)';
        cx2.beginPath(); cx2.ellipse(size * 0.14, -size * 0.04, size * 0.1, size * 0.07, 0, 0, Math.PI * 2); cx2.fill();
        cx2.strokeStyle = '#2a7000'; cx2.lineWidth = Math.max(1.5, size * 0.08); cx2.lineCap = 'round';
        cx2.beginPath(); cx2.moveTo(-size * 0.24, -size * 0.26); cx2.quadraticCurveTo(0, -size * 0.54, size * 0.24, -size * 0.26); cx2.stroke();
        cx2.fillStyle = '#ffe033';
        cx2.beginPath(); cx2.arc(0, -size * 0.56, size * 0.08, 0, Math.PI * 2); cx2.fill();
        break;
      }
      case 'twinsun': {
        var offsets = [{ ox: -size * 0.26, oy: 0 }, { ox: size * 0.26, oy: -size * 0.06 }];
        for (var oi = 0; oi < offsets.length; oi++) {
          var ox = offsets[oi].ox, oy = offsets[oi].oy;
          var s2 = size * 0.6;
          cx2.save(); cx2.translate(ox, oy);
          for (var pi = 0; pi < 8; pi++) {
            cx2.save(); cx2.rotate(pi * Math.PI / 4);
            cx2.fillStyle = '#ffdd33';
            cx2.beginPath(); cx2.ellipse(0, -s2 * 0.6, s2 * 0.12, s2 * 0.24, 0, 0, Math.PI * 2); cx2.fill();
            cx2.restore();
          }
          cx2.fillStyle = '#7a4200';
          cx2.beginPath(); cx2.arc(0, 0, s2 * 0.3, 0, Math.PI * 2); cx2.fill();
          cx2.fillStyle = '#fff';
          cx2.beginPath(); cx2.arc(-s2 * 0.08, -s2 * 0.04, s2 * 0.07, 0, Math.PI * 2); cx2.fill();
          cx2.beginPath(); cx2.arc(s2 * 0.08, -s2 * 0.04, s2 * 0.07, 0, Math.PI * 2); cx2.fill();
          cx2.fillStyle = '#1a0800';
          cx2.beginPath(); cx2.arc(-s2 * 0.07, -s2 * 0.03, s2 * 0.04, 0, Math.PI * 2); cx2.fill();
          cx2.beginPath(); cx2.arc(s2 * 0.09, -s2 * 0.03, s2 * 0.04, 0, Math.PI * 2); cx2.fill();
          cx2.restore();
        }
        cx2.fillStyle = '#2cd400';
        cx2.fillRect(size * 0.3, -size * 0.28, size * 0.44, size * 0.16);
        cx2.fillRect(size * 0.3, -size * 0.05, size * 0.44, size * 0.16);
        cx2.fillStyle = '#001800';
        cx2.beginPath(); cx2.ellipse(size * 0.72, -size * 0.2, size * 0.05, size * 0.07, 0, 0, Math.PI * 2); cx2.fill();
        cx2.beginPath(); cx2.ellipse(size * 0.72, size * 0.03, size * 0.05, size * 0.07, 0, 0, Math.PI * 2); cx2.fill();
        break;
      }
    }
    cx2.restore();
  }

  function drawPlant(plant) {
    ctx.save();
    ctx.translate(plant.x, plant.y);
    var hpPct = plant.hp / plant.maxHp;
    if (hpPct < 0.3) ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.01) * 0.2;

    if (plant.type === 'sunflower') {
      var bob = Math.sin(plant.anim * 0.002) * 4;
      ctx.translate(0, bob);
    } else if (plant.type === 'cherry' && plant.explodeTimer > 0) {
      var scale = 1 + 0.1 * Math.sin(plant.anim * 0.01);
      ctx.scale(scale, scale);
    }

    drawPlantIcon(ctx, plant.type, 0, 0, CELL * 0.38);
    ctx.restore();

    // HP bar when damaged
    if (plant.hp < plant.maxHp) {
      var bw = CELL * 0.7, bh = 4;
      var bx = plant.x - bw / 2, by = plant.y - CELL * 0.55;
      ctx.fillStyle = '#333';
      ctx.fillRect(bx, by, bw, bh);
      var pct2 = plant.hp / plant.maxHp;
      ctx.fillStyle = pct2 > 0.5 ? '#39ff14' : pct2 > 0.25 ? '#ffdd00' : '#ff3333';
      ctx.fillRect(bx, by, bw * pct2, bh);
    }
  }

  function drawZombie(z) {
    if (z.dead) return;
    ctx.save();
    ctx.translate(z.x, z.y);

    var walk = Math.sin(z.walkAnim * 0.08) * 5;
    var walkR = Math.sin(z.walkAnim * 0.08);
    var hpPct = z.hp / z.maxHp;
    var skinColor = hpPct > 0.5 ? 'rgb(130,165,110)' : 'rgb(100,140,90)';
    var shirtColor = hpPct > 0.5 ? '#5a6e8a' : '#3a4e6a';

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(0, CELL * 0.42, CELL * 0.22, CELL * 0.05, 0, 0, Math.PI * 2); ctx.fill();

    // Legs
    var legW = CELL * 0.1, legH = CELL * 0.25;
    ctx.save();
    ctx.translate(-CELL * 0.1, CELL * 0.2 + walk * 0.1);
    ctx.rotate(walkR * 0.38);
    ctx.fillStyle = '#4a5a7a';
    ctx.fillRect(-legW / 2, 0, legW, legH);
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.ellipse(-legW * 0.1, legH, legW * 0.8, legH * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(CELL * 0.1, CELL * 0.2 + walk * 0.1);
    ctx.rotate(-walkR * 0.38);
    ctx.fillStyle = '#4a5a7a';
    ctx.fillRect(-legW / 2, 0, legW, legH);
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.ellipse(legW * 0.1, legH, legW * 0.8, legH * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Body
    ctx.save();
    ctx.translate(0, walk * 0.15);
    ctx.fillStyle = shirtColor;
    ctx.fillRect(-CELL * 0.15, -CELL * 0.05, CELL * 0.3, CELL * 0.3);
    ctx.restore();

    // Arms
    var armW = CELL * 0.09, armH = CELL * 0.24;
    ctx.save();
    ctx.translate(-CELL * 0.17, -CELL * 0.0 + walk * 0.12);
    ctx.fillStyle = skinColor;
    ctx.fillRect(-armW / 2, 0, armW, armH);
    ctx.beginPath(); ctx.arc(0, armH, armW * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(CELL * 0.17, -CELL * 0.0 + walk * 0.12);
    ctx.fillStyle = skinColor;
    ctx.fillRect(-armW / 2, 0, armW, armH);
    ctx.beginPath(); ctx.arc(0, armH, armW * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Head
    var headY = -CELL * 0.25 + walk * 0.18;
    ctx.save();
    ctx.translate(0, headY);
    ctx.fillStyle = skinColor;
    ctx.beginPath(); ctx.ellipse(0, 0, CELL * 0.18, CELL * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    // Eyes
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.ellipse(-CELL * 0.07, -CELL * 0.06, CELL * 0.07, CELL * 0.055, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(CELL * 0.07, -CELL * 0.06, CELL * 0.07, CELL * 0.055, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff3300';
    ctx.beginPath(); ctx.ellipse(-CELL * 0.07, -CELL * 0.062, CELL * 0.045, CELL * 0.038, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(CELL * 0.07, -CELL * 0.062, CELL * 0.045, CELL * 0.038, 0, 0, Math.PI * 2); ctx.fill();
    // Mouth
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = Math.max(1, CELL * 0.03); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, CELL * 0.08, CELL * 0.07, Math.PI + 0.5, Math.PI * 2 - 0.5); ctx.stroke();
    ctx.fillStyle = '#ddd';
    ctx.fillRect(-CELL * 0.02, CELL * 0.08, CELL * 0.035, CELL * 0.06);
    ctx.restore();

    // Armor
    if (z.type === 'cone' && z.armorHp > 0) {
      var armorPct = z.armorHp / z.maxArmorHp;
      ctx.save();
      ctx.translate(0, headY);
      ctx.globalAlpha = 0.5 + armorPct * 0.5;
      ctx.fillStyle = '#dca030';
      ctx.beginPath();
      ctx.moveTo(-CELL * 0.2, -CELL * 0.08);
      ctx.lineTo(CELL * 0.2, -CELL * 0.08);
      ctx.lineTo(CELL * 0.07, -CELL * 0.38);
      ctx.lineTo(-CELL * 0.07, -CELL * 0.38);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    } else if (z.type === 'bucket' && z.armorHp > 0) {
      var armorPct2 = z.armorHp / z.maxArmorHp;
      ctx.save();
      ctx.translate(0, headY);
      ctx.globalAlpha = 0.45 + armorPct2 * 0.55;
      ctx.fillStyle = '#9a9faa';
      ctx.fillRect(-CELL * 0.22, -CELL * 0.38, CELL * 0.44, CELL * 0.3);
      ctx.restore();
    }

    ctx.restore();

    // HP bar
    var bw = CELL * 0.72, bh = Math.max(3, CELL * 0.05);
    var bx = z.x - bw / 2, by = z.y - CELL * 0.62;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    var hpPct2 = z.hp / z.maxHp;
    ctx.fillStyle = '#222'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = hpPct2 > 0.5 ? '#39ff14' : hpPct2 > 0.25 ? '#ffdd00' : '#ff3333';
    ctx.fillRect(bx, by, bw * Math.max(0, hpPct2), bh);

    // Slow indicator
    if (z.slowTimer > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0,210,255,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(z.x, z.y, CELL * 0.36, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  function drawBullet(b) {
    if (b.dead) return;
    ctx.save();
    ctx.translate(b.x, b.y);
    if (b.ice) {
      ctx.fillStyle = '#a0f0ff';
      ctx.beginPath();
      ctx.moveTo(0, -6); ctx.lineTo(5, 0); ctx.lineTo(0, 6); ctx.lineTo(-5, 0);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -3); ctx.lineTo(2.5, 0); ctx.lineTo(0, 3); ctx.lineTo(-2.5, 0);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = '#39ff14';
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.ellipse(-2, -2.5, 2, 1.4, -0.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawSunDrop(s) {
    if (s.dead) return;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    // Glow
    ctx.fillStyle = 'rgba(255,240,80,0.4)';
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
    // Core
    ctx.fillStyle = '#ffe94d';
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
    // Rays
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2;
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12);
      ctx.lineTo(Math.cos(a) * 17, Math.sin(a) * 17); ctx.stroke();
    }
    ctx.restore();
  }

  function drawParticles() {
    for (var pi = 0; pi < particles.length; pi++) {
      var p = particles[pi];
      if (p.dead) continue;
      ctx.save();
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    for (var ei = 0; ei < explosions.length; ei++) {
      var e = explosions[ei];
      if (e.dead) continue;
      ctx.save();
      ctx.globalAlpha = e.life * 0.5;
      ctx.strokeStyle = '#ff6600';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  function drawNotifications() {
    for (var ni = 0; ni < notifications.length; ni++) {
      var n = notifications[ni];
      if (n.dead) continue;
      ctx.save();
      ctx.globalAlpha = Math.min(1, (n.life / n.maxLife) * 2);
      ctx.fillStyle = n.color;
      ctx.font = 'bold ' + Math.round(CELL * 0.35) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(n.text, W / 2, n.y);
      ctx.restore();
    }
  }

  function drawSelectedPlantCursor() {
    if (!selectedCard || gameState !== 'playing') return;
    var cell = xyToCell(touchX, touchY);
    if (cell.row < 0 || cell.row >= ROWS || cell.col < 0 || cell.col >= COLS) return;
    ctx.save();
    ctx.strokeStyle = grid[cell.row] && grid[cell.row][cell.col] ? '#ff4444' : '#39ff14';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    ctx.strokeRect(cell.col * CELL + 2, BOARD_OFFSET_Y + cell.row * CELL + 2, CELL - 4, CELL - 4);
    ctx.restore();
  }

  // ===================== UPDATE =====================
  function update(dt) {
    if (gameState !== 'playing') return;

    // Sun drop timer
    sunDropTimer += dt;
    if (sunDropTimer >= sunDropInterval) {
      sunDropTimer = 0;
      sunDropInterval = 5000 + Math.random() * 3000;
      var sx = CELL * 0.5 + Math.random() * (W - CELL);
      var sy = BOARD_OFFSET_Y + CELL * 0.5 + Math.random() * (BOARD_H - CELL);
      sunDrops.push(createSunDrop(sx, sy, false));
    }

    // Update sun drops
    for (var si = sunDrops.length - 1; si >= 0; si--) {
      var s = sunDrops[si];
      if (s.dead) { sunDrops.splice(si, 1); continue; }
      s.rot += dt * 0.002;
      s.timer += dt;
      if (s.falling) {
        s.y += dt * 0.08;
        if (s.y >= s.targetY) { s.y = s.targetY; s.falling = false; }
      } else {
        if (s.timer >= s.lifetime) { sunDrops.splice(si, 1); continue; }
      }
    }

    // Update card cooldowns
    for (var ci = 0; ci < PLANT_DEFS.length; ci++) {
      if (PLANT_DEFS[ci].cooldownRemaining > 0) {
        PLANT_DEFS[ci].cooldownRemaining -= dt / 1000;
        if (PLANT_DEFS[ci].cooldownRemaining < 0) PLANT_DEFS[ci].cooldownRemaining = 0;
      }
    }

    // Update plants
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var p = grid[r][c];
        if (!p) continue;
        p.anim += dt;

        if (p.type === 'sunflower') {
          p.sunTimer += dt;
          if (p.sunTimer >= 10000) {
            p.sunTimer = 0;
            sunDrops.push(createSunDrop(p.x, p.y, true));
          }
        }

        if (plantHasFiringRow(p)) {
          var rowZ = getZombiesInRow(r);
          if (rowZ.length > 0) {
            p.shootTimer += dt;
            var interval = getShootInterval(p.type);
            if (p.shootTimer >= interval) {
              p.shootTimer = 0;
              var newBullets = createBullet(p, r);
              for (var bi = 0; bi < newBullets.length; bi++) bullets.push(newBullets[bi]);
            }
          }
        }

        if (p.type === 'cherry' && !p.exploded) {
          p.explodeTimer -= dt;
          if (p.explodeTimer <= 0) {
            p.exploded = true;
            createExplosion(p.x, p.y);
            grid[r][c] = null;
          }
        }

        if (p.hp <= 0) {
          grid[r][c] = null;
        }
      }
    }

    // Update bullets
    for (var bi2 = bullets.length - 1; bi2 >= 0; bi2--) {
      var b = bullets[bi2];
      if (b.dead) { bullets.splice(bi2, 1); continue; }
      b.x += b.speed * (dt / 1000);
      if (b.x > W + 20) { bullets.splice(bi2, 1); continue; }
      for (var zi = 0; zi < zombies.length; zi++) {
        var z = zombies[zi];
        if (z.dead || b.dead) continue;
        if (z.row !== b.row) continue;
        if (Math.abs(b.x - z.x) < CELL * 0.35 && Math.abs(b.y - z.y) < CELL * 0.4) {
          if (z.armorHp > 0) {
            z.armorHp -= b.dmg;
            if (z.armorHp < 0) { z.hp += z.armorHp; z.armorHp = 0; }
          } else {
            z.hp -= b.dmg;
          }
          if (b.ice) z.slowTimer = 3000;
          b.dead = true;
          if (z.hp <= 0) { z.dead = true; score += z.scoreValue; }
        }
      }
    }
    bullets = bullets.filter(function (b) { return !b.dead; });

    // Update zombies
    for (var zi2 = zombies.length - 1; zi2 >= 0; zi2--) {
      var z2 = zombies[zi2];
      if (z2.dead) { zombies.splice(zi2, 1); continue; }
      z2.slowTimer = Math.max(0, z2.slowTimer - dt);
      var speedMult = z2.slowTimer > 0 ? 0.5 : 1;

      // Jumper logic
      if (z2.type === 'jumper' && !z2.hasJumped && !z2.jumping) {
        for (var jc = COLS - 1; jc >= 0; jc--) {
          var jp = grid[z2.row] && grid[z2.row][jc];
          if (jp) {
            var jpx = jc * CELL + CELL / 2;
            if (z2.x - jpx < CELL * 1.2 && z2.x > jpx) {
              z2.jumping = true;
              z2.jumpTimer = 0;
              z2.hasJumped = true;
            }
            break;
          }
        }
      }

      if (z2.jumping) {
        z2.jumpTimer += dt;
        var dur = 600;
        var t2 = z2.jumpTimer / dur;
        z2.x -= z2.speed * (dt / 1000) * speedMult * 1.5;
        z2.y = (BOARD_OFFSET_Y + z2.row * CELL + CELL / 2) - Math.sin(t2 * Math.PI) * CELL * 0.8;
        if (z2.jumpTimer >= dur) {
          z2.jumping = false;
          z2.y = BOARD_OFFSET_Y + z2.row * CELL + CELL / 2;
        }
        continue;
      }

      // Normal movement
      z2.eating = false;
      var blocked = false;
      for (var ec = COLS - 1; ec >= 0; ec--) {
        var ep = grid[z2.row] && grid[z2.row][ec];
        if (!ep) continue;
        var epx = ec * CELL + CELL / 2;
        if (z2.x > epx - CELL * 0.3 && z2.x < epx + CELL * 0.6) {
          blocked = true;
          z2.eating = true;
          z2.eatTimer += dt;
          if (z2.eatTimer >= 800) {
            z2.eatTimer = 0;
            ep.hp -= z2.dmg * 10;
            if (ep.hp <= 0) grid[z2.row][ec] = null;
          }
          break;
        }
      }

      if (!blocked) {
        z2.x -= z2.speed * (dt / 1000) * speedMult;
        z2.walkAnim += dt * speedMult;
      }

      // Reached left side
      if (z2.x < -CELL * 0.5) {
        z2.dead = true;
        lives--;
        addNotif('僵尸到家了！', '#ff4444');
        if (lives <= 0) {
          gameState = 'dead';
          pushHUD();
        }
      }
    }
    zombies = zombies.filter(function (z) { return !z.dead; });

    // Particles
    for (var pi2 = particles.length - 1; pi2 >= 0; pi2--) {
      var pa = particles[pi2];
      pa.life -= dt / 1000;
      pa.x += pa.vx * (dt / 1000);
      pa.y += pa.vy * (dt / 1000);
      pa.vy += 100 * (dt / 1000);
      if (pa.life <= 0) particles.splice(pi2, 1);
    }
    for (var ei = explosions.length - 1; ei >= 0; ei--) {
      var ex = explosions[ei];
      ex.r += CELL * 3 * (dt / 1000);
      ex.life -= dt / 1000;
      if (ex.r >= ex.maxR || ex.life <= 0) explosions.splice(ei, 1);
    }

    // Notifications
    for (var ni = notifications.length - 1; ni >= 0; ni--) {
      var nn = notifications[ni];
      nn.life -= dt / 1000;
      nn.y -= 30 * (dt / 1000);
      if (nn.life <= 0) notifications.splice(ni, 1);
    }

    // Wave system
    if (waveActive) {
      waveSpawnTimer += dt;
      while (waveSpawnQueue.length > 0 && waveSpawnTimer >= waveSpawnQueue[0].time) {
        var spawn = waveSpawnQueue.shift();
        zombies.push(createZombie(spawn.type, spawn.row));
      }
      if (waveSpawnQueue.length === 0 && zombies.length === 0) {
        waveActive = false;
        waveTimer = 0;
        if (allWavesDone) {
          gameState = 'paused';
          setTimeout(function () {
            if (currentLevel < LEVELS.length - 1) {
              gameState = 'levelwin';
            } else {
              gameState = 'win';
            }
            pushHUD();
          }, 1500);
        } else {
          startWave(currentWave + 1);
          if (allWavesDone) {
            addNotif('最后一波已清除！', '#39ff14');
            gameState = 'paused';
            setTimeout(function () {
              if (currentLevel < LEVELS.length - 1) {
                gameState = 'levelwin';
              } else {
                gameState = 'win';
              }
              pushHUD();
            }, 1500);
          } else {
            addNotif('波次清除！准备下一波…', '#39ff14');
          }
        }
      }
    }

    pushHUD();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();

    // Plants
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (grid[r][c]) drawPlant(grid[r][c]);
      }
    }

    // Zombies
    for (var zi = 0; zi < zombies.length; zi++) drawZombie(zombies[zi]);

    // Bullets
    for (var bi = 0; bi < bullets.length; bi++) drawBullet(bullets[bi]);

    // Sun drops
    for (var si = 0; si < sunDrops.length; si++) drawSunDrop(sunDrops[si]);

    // Particles/explosions
    drawParticles();

    // Notifications
    drawNotifications();

    // Cursor
    drawSelectedPlantCursor();
  }

  // ===================== GAME LOOP =====================
  function gameLoop(ts) {
    if (lastTime === 0) lastTime = ts;
    var dt = Math.min(ts - lastTime, 50);
    lastTime = ts;
    if (gameState === 'playing') {
      update(dt);
      draw();
    } else if (gameState === 'paused' || gameState === 'menu') {
      draw();
    }
    animId = adapter.requestAnimationFrame(gameLoop);
  }

  // ===================== INPUT =====================
  function handleTap(e) {
    if (gameState !== 'playing') return;
    var touch = e.changedTouches && e.changedTouches[0];
    if (!touch) return;
    var cx = touch.x !== undefined ? touch.x : touch.clientX;
    var cy = touch.y !== undefined ? touch.y : touch.clientY;

    // Check sun drops first
    var collected = false;
    for (var si = 0; si < sunDrops.length; si++) {
      var s = sunDrops[si];
      if (s.dead || s.falling) continue;
      var dx = cx - s.x, dy = cy - s.y;
      if (Math.sqrt(dx * dx + dy * dy) < 22) {
        sun += s.amount;
        s.dead = true;
        collected = true;
        break;
      }
    }
    if (collected) return;

    // Plant placement
    if (selectedCard) {
      var cell = xyToCell(cx, cy);
      if (cell.row < 0 || cell.row >= ROWS || cell.col < 0 || cell.col >= COLS) return;
      if (grid[cell.row][cell.col] !== null) return;
      var def = null;
      for (var i = 0; i < PLANT_DEFS.length; i++) {
        if (PLANT_DEFS[i].id === selectedCard) { def = PLANT_DEFS[i]; break; }
      }
      if (!def) return;
      if (sun < def.cost) return;
      if (def.cooldownRemaining > 0) return;
      sun -= def.cost;
      def.cooldownRemaining = def.cd;
      var plant = createPlant(selectedCard, cell.row, cell.col);
      grid[cell.row][cell.col] = plant;
      selectedCard = null;
    }
  }

  function handleTouchMove(e) {
    var touch = e.touches && e.touches[0];
    if (!touch) return;
    touchX = touch.x !== undefined ? touch.x : touch.clientX;
    touchY = touch.y !== undefined ? touch.y : touch.clientY;
  }

  adapter.addEventListener('tap', handleTap);
  adapter.addEventListener('touchmove', handleTouchMove);

  // ===================== PUBLIC API =====================
  function startLevel() {
    gameState = 'playing';
    lives = 3;
    sun = 300;
    initGrid();
    zombies = [];
    bullets = [];
    sunDrops = [];
    particles = [];
    explosions = [];
    notifications = [];
    sunDropTimer = 0;
    sunDropInterval = 3500;
    waveActive = false;
    allWavesDone = false;
    currentWave = 0;
    selectedCard = null;
    lastTime = 0;

    PLANT_DEFS.forEach(function (p) { p.cooldownRemaining = 0; });

    pushHUD();

    if (animId) adapter.cancelAnimationFrame(animId);
    animId = adapter.requestAnimationFrame(gameLoop);

    setTimeout(function () {
      if (gameState === 'playing') startWave(0);
    }, 5000);

    addNotif('第' + (currentLevel + 1) + '关开始！', '#39ff14');
  }

  function start() {
    currentLevel = parseInt(storage.getItem('pvz_level') || '0', 10);
    score = 0;
    gameState = 'menu';
    pushHUD();
    // Draw initial background
    draw();
    animId = adapter.requestAnimationFrame(gameLoop);
  }

  function startGame() {
    currentLevel = 0;
    score = 0;
    storage.setItem('pvz_level', '0');
    startLevel();
  }

  function startFromMenu() {
    score = 0;
    startLevel();
  }

  function nextLevel() {
    currentLevel++;
    if (currentLevel >= LEVELS.length) currentLevel = 0;
    storage.setItem('pvz_level', String(currentLevel));
    startLevel();
  }

  function retryLevel() {
    startLevel();
  }

  function goToMenu() {
    gameState = 'menu';
    currentLevel = 0;
    pushHUD();
  }

  function selectPlant(id) {
    if (gameState !== 'playing') return;
    var def = null;
    for (var i = 0; i < PLANT_DEFS.length; i++) {
      if (PLANT_DEFS[i].id === id) { def = PLANT_DEFS[i]; break; }
    }
    if (!def) return;
    if (def.cooldownRemaining > 0) return;
    if (sun < def.cost) return;
    selectedCard = (selectedCard === id) ? null : id;
  }

  function deselectPlant() {
    selectedCard = null;
  }

  function destroy() {
    if (animId) adapter.cancelAnimationFrame(animId);
    animId = null;
    adapter.removeEventListener('tap', handleTap);
    adapter.removeEventListener('touchmove', handleTouchMove);
  }

  // Initial draw
  initGrid();
  draw();

  return {
    start: start,
    startGame: startGame,
    startFromMenu: startFromMenu,
    nextLevel: nextLevel,
    retryLevel: retryLevel,
    goToMenu: goToMenu,
    selectPlant: selectPlant,
    deselectPlant: deselectPlant,
    destroy: destroy
  };
}

module.exports = { initGame: initGame };
