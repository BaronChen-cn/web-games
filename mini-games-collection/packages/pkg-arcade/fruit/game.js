var storage = require('../../../lib/storage');

function initGame(adapter) {
  var ctx = adapter.ctx;
  var W = adapter.width;
  var H = adapter.height;

  // ─── State ───────────────────────────────────────────────────
  var state = 'idle'; // idle | playing | dead
  var score = 0;
  var lives = 3;
  var best = parseInt(storage.getItem('fruit_best') || '0', 10);
  var combo = 0;
  var comboTimer = 0;
  var spawnTimer = 0;
  var spawnInterval = 120; // frames
  var gameFrame = 0;
  var shakeTimer = 0;
  var shakeAmt = 0;
  var animId = null;
  var lastTime = 0;

  // ─── Object pools ────────────────────────────────────────────
  var fruits = [];
  var halves = [];
  var particles = [];
  var comboTexts = [];
  var scoreTexts = [];

  // ─── Trail ───────────────────────────────────────────────────
  var trail = []; // {x, y, t}

  // ─── Fruit definitions ───────────────────────────────────────
  var FRUIT_TYPES = [
    { id: 'watermelon', points: 3, r: 28 },
    { id: 'orange',     points: 2, r: 22 },
    { id: 'apple',      points: 2, r: 22 },
    { id: 'banana',     points: 2, r: 22 },
    { id: 'grape',      points: 1, r: 18 },
    { id: 'lemon',      points: 1, r: 20 }
  ];

  // ─── Draw fruit helpers ───────────────────────────────────────
  function drawWatermelon(c, x, y, r, rot) {
    c.save(); c.translate(x, y); c.rotate(rot);
    // Green rind
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = '#2d8c2d'; c.fill();
    // Lighter green stripes
    c.save(); c.clip();
    c.strokeStyle = '#52c952'; c.lineWidth = 3;
    for (var i = -r; i < r; i += 9) {
      c.beginPath(); c.moveTo(i, -r); c.lineTo(i, r); c.stroke();
    }
    c.restore();
    // Red flesh inner circle
    c.beginPath(); c.arc(0, 0, r * 0.72, 0, Math.PI * 2);
    c.fillStyle = '#e8253a'; c.fill();
    // Seeds
    c.fillStyle = '#1a0a00';
    var seeds = [[0, -r * 0.35], [r * 0.25, -r * 0.1], [-r * 0.25, -r * 0.1], [r * 0.15, r * 0.25], [-r * 0.15, r * 0.25]];
    for (var si = 0; si < seeds.length; si++) {
      var sx = seeds[si][0], sy = seeds[si][1];
      c.beginPath(); c.ellipse(sx, sy, 2.5, 4, 0.3, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }

  function drawOrange(c, x, y, r, rot) {
    c.save(); c.translate(x, y); c.rotate(rot);
    var g = c.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#ffb84d'); g.addColorStop(1, '#e06000');
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = g; c.fill();
    // Peel texture dots
    c.fillStyle = 'rgba(0,0,0,0.12)';
    for (var i = 0; i < 8; i++) {
      var a = (i / 8) * Math.PI * 2;
      c.beginPath(); c.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, 2, 0, Math.PI * 2); c.fill();
    }
    // Stem
    c.fillStyle = '#5a3000';
    c.beginPath(); c.ellipse(0, -r + 2, 3, 5, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  function drawApple(c, x, y, r, rot) {
    c.save(); c.translate(x, y); c.rotate(rot);
    var g = c.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#ff6060'); g.addColorStop(1, '#b80000');
    c.beginPath();
    c.moveTo(0, -r * 0.85);
    c.bezierCurveTo(r * 1.1, -r * 0.9, r * 1.1, r * 0.9, 0, r * 0.95);
    c.bezierCurveTo(-r * 1.1, r * 0.9, -r * 1.1, -r * 0.9, 0, -r * 0.85);
    c.fillStyle = g; c.fill();
    // Shine
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.beginPath(); c.ellipse(-r * 0.25, -r * 0.3, r * 0.2, r * 0.35, -0.4, 0, Math.PI * 2); c.fill();
    // Stem
    c.strokeStyle = '#5a3000'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(0, -r * 0.85); c.quadraticCurveTo(r * 0.2, -r * 1.25, r * 0.05, -r * 1.3); c.stroke();
    // Leaf
    c.fillStyle = '#2d8c2d';
    c.beginPath(); c.ellipse(r * 0.12, -r * 1.1, 7, 4, 0.6, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  function drawBanana(c, x, y, r, rot) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.fillStyle = '#ffe033';
    c.strokeStyle = '#c8a000'; c.lineWidth = 1.5;
    // Banana crescent shape
    c.beginPath();
    c.moveTo(-r * 0.9, r * 0.2);
    c.quadraticCurveTo(-r * 0.3, -r * 1.1, r * 0.9, -r * 0.1);
    c.quadraticCurveTo(r * 0.7, r * 0.15, r * 0.55, r * 0.3);
    c.quadraticCurveTo(-r * 0.1, -r * 0.5, -r * 0.7, r * 0.45);
    c.closePath();
    c.fill(); c.stroke();
    // Tip ends dark
    c.fillStyle = '#8a6000';
    c.beginPath(); c.ellipse(-r * 0.88, r * 0.2, 4, 3, 0.8, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(r * 0.9, -r * 0.1, 4, 3, 0.5, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  function drawGrape(c, x, y, r, rot) {
    c.save(); c.translate(x, y); c.rotate(rot);
    // Cluster of small circles
    var positions = [
      [0, r * 0.3], [-r * 0.35, r * 0.05], [r * 0.35, r * 0.05],
      [-r * 0.18, -r * 0.28], [r * 0.18, -r * 0.28], [0, -r * 0.55]
    ];
    var gr = r * 0.38;
    for (var pi = 0; pi < positions.length; pi++) {
      var gx = positions[pi][0], gy = positions[pi][1];
      var g = c.createRadialGradient(gx - gr * 0.3, gy - gr * 0.3, gr * 0.1, gx, gy, gr);
      g.addColorStop(0, '#c060e0'); g.addColorStop(1, '#5a0880');
      c.beginPath(); c.arc(gx, gy, gr, 0, Math.PI * 2);
      c.fillStyle = g; c.fill();
      // Shine
      c.fillStyle = 'rgba(255,255,255,0.3)';
      c.beginPath(); c.arc(gx - gr * 0.28, gy - gr * 0.28, gr * 0.22, 0, Math.PI * 2); c.fill();
    }
    // Stem
    c.strokeStyle = '#5a3000'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, -r * 0.55 - gr); c.quadraticCurveTo(r * 0.3, -r * 1.1, r * 0.15, -r * 1.25); c.stroke();
    c.restore();
  }

  function drawLemon(c, x, y, r, rot) {
    c.save(); c.translate(x, y); c.rotate(rot);
    var g = c.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#fff176'); g.addColorStop(1, '#e0c000');
    c.beginPath();
    c.ellipse(0, 0, r, r * 0.72, 0, 0, Math.PI * 2);
    c.fillStyle = g; c.fill();
    // Pointy tips
    c.fillStyle = '#c8a800';
    c.beginPath(); c.ellipse(r * 0.88, 0, 5, 4, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(-r * 0.88, 0, 5, 4, 0, 0, Math.PI * 2); c.fill();
    // Texture dots
    c.fillStyle = 'rgba(0,0,0,0.1)';
    for (var i = 0; i < 6; i++) {
      var a = (i / 6) * Math.PI * 2;
      c.beginPath(); c.arc(Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4 * 0.7, 2, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }

  function drawBomb(c, x, y, r, rot) {
    c.save(); c.translate(x, y); c.rotate(rot);
    // Body
    var g = c.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#555'); g.addColorStop(1, '#111');
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = g; c.fill();
    c.strokeStyle = '#333'; c.lineWidth = 1.5; c.stroke();
    // Shine
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.beginPath(); c.arc(-r * 0.28, -r * 0.28, r * 0.22, 0, Math.PI * 2); c.fill();
    // Fuse
    c.strokeStyle = '#8a6000'; c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(r * 0.35, -r * 0.7);
    c.quadraticCurveTo(r * 0.6, -r * 1.1, r * 0.3, -r * 1.35);
    c.stroke();
    // Fuse spark
    var spark = (Date.now() % 400) / 400;
    c.fillStyle = 'hsl(' + (30 + spark * 60) + ',100%,' + (50 + spark * 30) + '%)';
    c.beginPath(); c.arc(r * 0.3, -r * 1.35, 3.5, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  function drawFruitHalf(c, type, x, y, r, rot, side) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.beginPath();
    // Clip to half
    if (side === 0) {
      c.rect(-r * 1.5, -r * 1.5, r * 1.5, r * 3);
    } else {
      c.rect(0, -r * 1.5, r * 1.5, r * 3);
    }
    c.clip();
    // Draw full fruit (clipped to half)
    switch (type) {
      case 'watermelon': drawWatermelon(c, 0, 0, r, 0); break;
      case 'orange':     drawOrange(c, 0, 0, r, 0); break;
      case 'apple':      drawApple(c, 0, 0, r, 0); break;
      case 'banana':     drawBanana(c, 0, 0, r, 0); break;
      case 'grape':      drawGrape(c, 0, 0, r, 0); break;
      case 'lemon':      drawLemon(c, 0, 0, r, 0); break;
    }
    // Cut face (inner color)
    var innerColors = {
      watermelon: '#e8253a', orange: '#ff9933', apple: '#ffcccc',
      banana: '#fff8c0', grape: '#d080f0', lemon: '#fffaaa'
    };
    c.fillStyle = innerColors[type] || '#fff';
    c.beginPath();
    c.rect(side === 0 ? -1 : 0, -r * 1.5, 2, r * 3);
    c.fill();
    c.restore();
  }

  function drawFruit(c, type, x, y, r, rot) {
    switch (type) {
      case 'watermelon': drawWatermelon(c, x, y, r, rot); break;
      case 'orange':     drawOrange(c, x, y, r, rot); break;
      case 'apple':      drawApple(c, x, y, r, rot); break;
      case 'banana':     drawBanana(c, x, y, r, rot); break;
      case 'grape':      drawGrape(c, x, y, r, rot); break;
      case 'lemon':      drawLemon(c, x, y, r, rot); break;
      case 'bomb':       drawBomb(c, x, y, r, rot); break;
    }
  }

  // ─── Spawn ────────────────────────────────────────────────────
  function spawnFruit() {
    var isBomb = Math.random() < 0.12;
    var type;
    if (isBomb) {
      type = 'bomb';
    } else {
      var t = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
      type = t.id;
    }

    var def = isBomb ? { r: 22, points: 0 } : FRUIT_TYPES.filter(function (f) { return f.id === type; })[0];
    var r = def.r;

    // Random spawn from bottom, random side bias
    var x = r + Math.random() * (W - r * 2);
    var y = H + r;

    // Velocity: upward with some horizontal
    var angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
    var speed = 5 + Math.random() * 3.5 + gameFrame * 0.003;
    var vx = Math.cos(angle) * speed;
    var vy = Math.sin(angle) * speed;

    fruits.push({
      type: type,
      x: x, y: y, vx: vx, vy: vy,
      r: r,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.12,
      points: def.points,
      alive: true
    });
  }

  // ─── Particles ────────────────────────────────────────────────
  function spawnJuice(x, y, type) {
    var colors = {
      watermelon: ['#e8253a', '#ff6080', '#c00020'],
      orange:     ['#ff9933', '#ffbb44', '#dd6600'],
      apple:      ['#ff4444', '#ffaaaa', '#cc0000'],
      banana:     ['#ffe033', '#fff8c0', '#ccb000'],
      grape:      ['#c060e0', '#e0a0ff', '#800090'],
      lemon:      ['#ffe066', '#fffaaa', '#c8a800'],
      bomb:       ['#ff6600', '#ff3300', '#ff9900', '#ffcc00']
    };
    var pool = colors[type] || ['#fff'];
    var count = type === 'bomb' ? 28 : 16;
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 1.5 + Math.random() * 5;
      particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (type === 'bomb' ? 1 : 0.5),
        r: 2 + Math.random() * 4,
        color: pool[Math.floor(Math.random() * pool.length)],
        life: 1,
        decay: 0.025 + Math.random() * 0.03,
        gravity: 0.15
      });
    }
  }

  // ─── COMBO text ───────────────────────────────────────────────
  function spawnComboText(txt) {
    comboTexts.push({ x: W / 2, y: H / 2, txt: txt, life: 1, scale: 0.4 });
  }

  // ─── Score text (floating) ────────────────────────────────────
  function spawnScoreText(x, y, pts) {
    scoreTexts.push({ x: x, y: y, txt: '+' + pts, life: 1, vy: -1.5 });
  }

  // ─── Intersection helper ─────────────────────────────────────
  function segCircle(ax, ay, bx, by, cx, cy, cr) {
    var dx = bx - ax, dy = by - ay;
    var fx = ax - cx, fy = ay - cy;
    var a = dx * dx + dy * dy;
    if (a < 0.0001) return false;
    var b = 2 * (fx * dx + fy * dy);
    var c = fx * fx + fy * fy - cr * cr;
    var disc = b * b - 4 * a * c;
    if (disc < 0) return false;
    disc = Math.sqrt(disc);
    var t1 = (-b - disc) / (2 * a);
    var t2 = (-b + disc) / (2 * a);
    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
  }

  // ─── Slice ────────────────────────────────────────────────────
  function sliceFruit(fruit) {
    if (!fruit.alive) return;
    fruit.alive = false;

    if (fruit.type === 'bomb') {
      spawnJuice(fruit.x, fruit.y, 'bomb');
      shakeTimer = 18; shakeAmt = 8;
      loseLife();
      return;
    }

    // Points with combo
    combo++;
    comboTimer = 48; // ~0.8s at 60fps
    var mult = Math.max(1, combo);
    var pts = fruit.points * mult;
    score += pts;
    spawnJuice(fruit.x, fruit.y, fruit.type);
    spawnScoreText(fruit.x, fruit.y - fruit.r, pts);

    if (combo >= 2) {
      spawnComboText('COMBO x' + combo + '!');
    }

    // Spawn halves
    var baseAngle = Math.atan2(
      trail.length > 1 ? trail[trail.length - 1].y - trail[trail.length - 2].y : -1,
      trail.length > 1 ? trail[trail.length - 1].x - trail[trail.length - 2].x : 0
    );
    for (var side = 0; side < 2; side++) {
      var perp = baseAngle + Math.PI / 2;
      var sign = side === 0 ? -1 : 1;
      halves.push({
        type: fruit.type,
        x: fruit.x, y: fruit.y,
        vx: fruit.vx * 0.5 + Math.cos(perp) * sign * 2.5,
        vy: fruit.vy * 0.5 + Math.sin(perp) * sign * 2.5 - 1,
        r: fruit.r,
        rot: fruit.rot,
        rotV: sign * (0.08 + Math.random() * 0.1),
        side: side,
        life: 1,
        decay: 0.012
      });
    }

    updateUI();
  }

  // ─── Life management ─────────────────────────────────────────
  function loseLife() {
    lives--;
    updateUI();
    if (lives <= 0) {
      endGame();
    }
  }

  // ─── Trail-based slicing ──────────────────────────────────────
  function checkSlice() {
    if (trail.length < 2) return;
    var a = trail[trail.length - 2];
    var b = trail[trail.length - 1];
    for (var i = 0; i < fruits.length; i++) {
      var fruit = fruits[i];
      if (!fruit.alive) continue;
      if (segCircle(a.x, a.y, b.x, b.y, fruit.x, fruit.y, fruit.r * 0.85)) {
        sliceFruit(fruit);
      }
    }
  }

  // ─── Input ───────────────────────────────────────────────────
  function addTrailPoint(x, y) {
    trail.push({ x: x, y: y, t: Date.now() });
    if (trail.length > 20) trail.shift();
    checkSlice();
  }

  function onTouchMove(e) {
    if (state !== 'playing') return;
    var t = e.touches[0];
    addTrailPoint(t.x, t.y);
  }

  function onTouchEnd() {
    trail = [];
  }

  adapter.addEventListener('touchmove', onTouchMove);
  adapter.addEventListener('touchend', onTouchEnd);

  // ─── UI helpers ───────────────────────────────────────────────
  function livesStr(n) {
    var s = '';
    var i;
    for (i = 0; i < Math.max(0, n); i++) s += '♥';
    for (i = 0; i < Math.max(0, 3 - n); i++) s += '♡';
    return s;
  }

  function updateUI() {
    adapter.updateHUD({
      gameState: state,
      score: score,
      best: Math.max(score, best),
      lives: lives,
      livesStr: livesStr(lives),
      combo: combo >= 2 ? 'x' + combo : ''
    });
  }

  // ─── Game flow ────────────────────────────────────────────────
  function endGame() {
    state = 'dead';
    if (animId) adapter.cancelAnimationFrame(animId);
    animId = null;

    var isNewBest = score > best;
    if (isNewBest) {
      best = score;
      storage.setItem('fruit_best', String(best));
    }

    adapter.updateHUD({
      gameState: 'dead',
      score: score,
      best: best,
      lives: 0,
      livesStr: livesStr(0),
      combo: '',
      isNewRecord: isNewBest
    });
  }

  // ─── Main loop ────────────────────────────────────────────────
  function loop(ts) {
    var dt = Math.min(ts - lastTime, 50);
    lastTime = ts;

    ctx.clearRect(0, 0, W, H);

    if (state !== 'playing') {
      animId = adapter.requestAnimationFrame(loop);
      return;
    }

    gameFrame++;

    // Shake offset
    var sx = 0, sy = 0;
    if (shakeTimer > 0) {
      shakeTimer--;
      sx = (Math.random() - 0.5) * shakeAmt;
      sy = (Math.random() - 0.5) * shakeAmt;
      shakeAmt *= 0.88;
      ctx.save(); ctx.translate(sx, sy);
    }

    // ── Combo timer ──
    if (comboTimer > 0) {
      comboTimer--;
      if (comboTimer <= 0) {
        combo = 0;
        updateUI();
      }
    }

    // ── Spawn ──
    spawnTimer++;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      // Difficulty: decrease interval over time
      spawnInterval = Math.max(35, 120 - Math.floor(gameFrame / 300) * 8);
      // Occasionally spawn 2-3 at once
      var count = Math.random() < 0.3 ? 2 : 1;
      for (var ci = 0; ci < count; ci++) spawnFruit();
    }

    var G = 0.18;

    // ── Update fruits ──
    for (var i = fruits.length - 1; i >= 0; i--) {
      var f = fruits[i];
      if (!f.alive) { fruits.splice(i, 1); continue; }
      f.vy += G;
      f.x += f.vx; f.y += f.vy;
      f.rot += f.rotV;
      // Out of bounds
      if (f.y > H + f.r + 20) {
        fruits.splice(i, 1);
        if (f.type !== 'bomb') loseLife();
        continue;
      }
      if (f.x < -f.r * 2 || f.x > W + f.r * 2) {
        fruits.splice(i, 1);
        continue;
      }
    }

    // ── Update halves ──
    for (var hi = halves.length - 1; hi >= 0; hi--) {
      var h = halves[hi];
      h.vy += G;
      h.x += h.vx; h.y += h.vy;
      h.rot += h.rotV;
      h.life -= h.decay;
      if (h.life <= 0 || h.y > H + 60) { halves.splice(hi, 1); }
    }

    // ── Update particles ──
    for (var pi = particles.length - 1; pi >= 0; pi--) {
      var p = particles[pi];
      p.vy += p.gravity;
      p.x += p.vx; p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) { particles.splice(pi, 1); }
    }

    // ── Update comboTexts ──
    for (var cti = comboTexts.length - 1; cti >= 0; cti--) {
      var ct = comboTexts[cti];
      ct.life -= 0.022;
      ct.y -= 1;
      ct.scale = Math.min(1.2, ct.scale + 0.06);
      if (ct.life <= 0) { comboTexts.splice(cti, 1); }
    }

    // ── Update scoreTexts ──
    for (var sti = scoreTexts.length - 1; sti >= 0; sti--) {
      var st = scoreTexts[sti];
      st.life -= 0.025;
      st.y += st.vy;
      if (st.life <= 0) { scoreTexts.splice(sti, 1); }
    }

    // ─── Draw ─────────────────────────────────────────────────

    // Halves
    for (var dhi = 0; dhi < halves.length; dhi++) {
      var dh = halves[dhi];
      ctx.save();
      ctx.globalAlpha = Math.min(1, dh.life * 2);
      drawFruitHalf(ctx, dh.type, dh.x, dh.y, dh.r, dh.rot, dh.side);
      ctx.restore();
    }

    // Fruits
    for (var dfi = 0; dfi < fruits.length; dfi++) {
      var df = fruits[dfi];
      if (!df.alive) continue;
      ctx.save();
      ctx.globalAlpha = 1;
      drawFruit(ctx, df.type, df.x, df.y, df.r, df.rot);
      ctx.restore();
    }

    // Particles
    for (var dpi = 0; dpi < particles.length; dpi++) {
      var dp = particles[dpi];
      ctx.save();
      ctx.globalAlpha = dp.life;
      ctx.fillStyle = dp.color;
      ctx.beginPath(); ctx.arc(dp.x, dp.y, dp.r * dp.life, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Trail
    var now = Date.now();
    var recentTrail = [];
    for (var ti = 0; ti < trail.length; ti++) {
      if (now - trail[ti].t < 150) recentTrail.push(trail[ti]);
    }
    if (recentTrail.length >= 2) {
      for (var ri = 1; ri < recentTrail.length; ri++) {
        var ta = recentTrail[ri - 1], tb = recentTrail[ri];
        var age = (now - tb.t) / 150;
        var alpha = 1 - age;
        var width = (1 - age) * 6 + 1;
        ctx.save();
        ctx.strokeStyle = 'rgba(57,255,20,' + (alpha * 0.9) + ')';
        ctx.shadowColor = '#39ff14';
        ctx.shadowBlur = 8;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(ta.x, ta.y); ctx.lineTo(tb.x, tb.y); ctx.stroke();
        ctx.restore();
      }
    }

    // Score texts
    for (var dsi = 0; dsi < scoreTexts.length; dsi++) {
      var ds = scoreTexts[dsi];
      ctx.save();
      ctx.globalAlpha = ds.life;
      ctx.font = 'bold 20px Arial';
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 8;
      ctx.textAlign = 'center';
      ctx.fillText(ds.txt, ds.x, ds.y);
      ctx.restore();
    }

    // Combo texts
    for (var dci = 0; dci < comboTexts.length; dci++) {
      var dc = comboTexts[dci];
      ctx.save();
      ctx.globalAlpha = dc.life * dc.life;
      ctx.font = 'bold ' + Math.floor(32 * dc.scale) + 'px Arial';
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 16;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(dc.txt, dc.x, dc.y);
      ctx.restore();
    }

    if (shakeTimer >= 0 && sx !== 0) ctx.restore();

    animId = adapter.requestAnimationFrame(loop);
  }

  // ─── Public API ────────────────────────────────────────────────
  function start() {
    state = 'playing';
    score = 0;
    lives = 3;
    combo = 0;
    comboTimer = 0;
    spawnTimer = 0;
    spawnInterval = 120;
    gameFrame = 0;
    shakeTimer = 0;
    shakeAmt = 0;
    fruits = [];
    halves = [];
    particles = [];
    comboTexts = [];
    scoreTexts = [];
    trail = [];
    lastTime = 0;

    if (animId) adapter.cancelAnimationFrame(animId);

    adapter.updateHUD({
      gameState: 'playing',
      score: 0,
      best: best,
      lives: 3,
      livesStr: livesStr(3),
      combo: '',
      isNewRecord: false
    });

    animId = adapter.requestAnimationFrame(function firstFrame(ts) {
      lastTime = ts;
      animId = adapter.requestAnimationFrame(loop);
    });
  }

  function destroy() {
    if (animId) adapter.cancelAnimationFrame(animId);
    animId = null;
    adapter.removeEventListener('touchmove', onTouchMove);
    adapter.removeEventListener('touchend', onTouchEnd);
  }

  return { start: start, destroy: destroy };
}

module.exports = { initGame: initGame };
