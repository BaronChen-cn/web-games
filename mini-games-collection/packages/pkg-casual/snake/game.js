var storage = require('../../../lib/storage');

function initGame(adapter) {
  var ctx = adapter.ctx;
  var W = adapter.width;
  var H = adapter.height;

  // ============================================================
  // CONFIG
  // ============================================================
  var GRID = 20;
  var CELL = Math.floor(Math.min(W, H) / GRID);
  var INIT_INTERVAL = 190;
  var MIN_INTERVAL = 75;

  var C_HEAD = '#00f5ff';
  var C_MID = '#5b6aff';
  var C_TAIL = '#180040';
  var C_FOOD = '#ff3366';
  var C_BONUS = '#ffd700';
  var C_EYE = '#ffffff';
  var C_GRID = 'rgba(80,160,100,0.06)';

  // ============================================================
  // STATE
  // ============================================================
  var segs = [];
  var prevSegs = [];
  var dir = { x: 1, y: 0 };
  var nextDir = { x: 1, y: 0 };
  var food = null;
  var bonus = null;
  var bonusTimer = 0;
  var score = 0;
  var hiScore = parseInt(storage.getItem('snake_hi') || '0', 10);
  var level = 1;
  var foodEaten = 0;
  var interval = INIT_INTERVAL;
  var lastTickTs = 0;
  var lastTs = 0;
  var particles = [];
  var popups = [];
  var state = 'idle'; // idle | playing | paused | dead
  var animId = null;

  // Touch swipe state
  var touchX0 = 0;
  var touchY0 = 0;

  function lerp(a, b, t) { return a + (b - a) * t; }

  function lerpHex(h1, h2, t) {
    var p = function (h, i) { return parseInt(h.slice(i, i + 2), 16); };
    var r = Math.round(lerp(p(h1, 1), p(h2, 1), t));
    var g = Math.round(lerp(p(h1, 3), p(h2, 3), t));
    var b = Math.round(lerp(p(h1, 5), p(h2, 5), t));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function rand(n) { return Math.floor(Math.random() * n); }

  // ============================================================
  // GAME LOGIC
  // ============================================================
  function _initGameState() {
    var mid = Math.floor(GRID / 2);
    segs = [
      { x: mid + 1, y: mid },
      { x: mid, y: mid },
      { x: mid - 1, y: mid }
    ];
    prevSegs = segs.map(function (s) { return { x: s.x, y: s.y }; });
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    level = 1;
    foodEaten = 0;
    interval = INIT_INTERVAL;
    particles = [];
    popups = [];
    bonus = null;
    bonusTimer = 0;
    spawnFood();
  }

  function spawnFood() {
    var p;
    do {
      p = { x: rand(GRID), y: rand(GRID) };
    } while (segs.some(function (s) { return s.x === p.x && s.y === p.y; }));
    food = p;
  }

  function spawnBonus() {
    var p;
    do {
      p = { x: rand(GRID), y: rand(GRID) };
    } while (
      segs.some(function (s) { return s.x === p.x && s.y === p.y; }) ||
      (food && food.x === p.x && food.y === p.y)
    );
    bonus = p;
    bonusTimer = 8000;
  }

  function tick() {
    prevSegs = segs.map(function (s) { return { x: s.x, y: s.y }; });
    dir = { x: nextDir.x, y: nextDir.y };

    var head = { x: segs[0].x + dir.x, y: segs[0].y + dir.y };

    // Wall collision
    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) { die(); return; }
    // Self collision
    if (segs.some(function (s) { return s.x === head.x && s.y === head.y; })) { die(); return; }

    segs.unshift(head);
    var grow = false;

    // Eat regular food
    if (food && head.x === food.x && head.y === food.y) {
      var pts = 10 * level;
      addScore(pts);
      foodEaten++;
      grow = true;
      spawnParticles(head.x, head.y, C_FOOD, 10);
      addPopup(head.x, head.y, '+' + pts);
      spawnFood();

      if (!bonus && foodEaten % 5 === 0) spawnBonus();
      if (foodEaten % 5 === 0) {
        interval = Math.max(MIN_INTERVAL, interval - 12);
      }
      level = Math.floor(foodEaten / 5) + 1;
      updateUI();
    }

    // Eat bonus food
    if (bonus && head.x === bonus.x && head.y === bonus.y) {
      var bpts = 30 * level;
      addScore(bpts);
      grow = true;
      spawnParticles(head.x, head.y, C_BONUS, 18);
      addPopup(head.x, head.y, '+' + bpts + '!');
      bonus = null;
      bonusTimer = 0;
      updateUI();
    }

    if (!grow) segs.pop();
  }

  function addScore(pts) {
    score += pts;
    if (score > hiScore) {
      hiScore = score;
      storage.setItem('snake_hi', String(hiScore));
    }
  }

  function die() {
    state = 'dead';
    segs.forEach(function (s) { spawnParticles(s.x, s.y, C_HEAD, 4); });

    var isNewRecord = score > parseInt(storage.getItem('snake_hi') || '0', 10);
    if (isNewRecord) {
      storage.setItem('snake_hi', String(score));
    }

    setTimeout(function () {
      adapter.updateHUD({
        gameState: 'dead',
        score: score,
        bestScore: hiScore,
        level: level,
        foodEaten: foodEaten,
        isNewRecord: isNewRecord
      });
    }, 700);
  }

  function spawnParticles(gx, gy, color, count) {
    var x = (gx + 0.5) * CELL;
    var y = (gy + 0.5) * CELL;
    for (var i = 0; i < count; i++) {
      var angle = (Math.PI * 2 * i / count) + Math.random() * 0.8;
      var speed = 1.5 + Math.random() * 4;
      particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        color: color, life: 1,
        decay: 0.02 + Math.random() * 0.025,
        size: 2 + Math.random() * 3
      });
    }
  }

  function addPopup(gx, gy, text) {
    popups.push({ x: (gx + 0.5) * CELL, y: gy * CELL - 4, text: text, life: 1, vy: -1.2 });
  }

  function updateUI() {
    adapter.updateHUD({
      gameState: state,
      score: score,
      bestScore: hiScore,
      level: level,
      foodEaten: foodEaten
    });
  }

  // ============================================================
  // DRAWING
  // ============================================================
  function drawGrid() {
    ctx.save();
    ctx.strokeStyle = C_GRID;
    ctx.lineWidth = 0.5;
    for (var r = 0; r <= GRID; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(GRID * CELL, r * CELL);
      ctx.stroke();
    }
    for (var c = 0; c <= GRID; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL, 0);
      ctx.lineTo(c * CELL, GRID * CELL);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSnake(progress) {
    if (!segs.length) return;

    var pts = segs.map(function (s, i) {
      var p = prevSegs[i] || prevSegs[prevSegs.length - 1];
      return {
        x: lerp(p.x, s.x, progress) * CELL + CELL / 2,
        y: lerp(p.y, s.y, progress) * CELL + CELL / 2
      };
    });

    var n = pts.length;
    var rad = CELL * 0.42;
    var lineW = CELL - 5;

    for (var i = n - 1; i > 0; i--) {
      var t = 1 - i / (n - 1);
      var alpha = 0.25 + t * 0.75;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = lineW;
      ctx.strokeStyle = lerpHex(C_TAIL, C_MID, Math.pow(t, 0.6));
      ctx.beginPath();
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.lineTo(pts[i - 1].x, pts[i - 1].y);
      ctx.stroke();
      ctx.restore();
    }

    // Head glow
    ctx.save();
    ctx.fillStyle = C_HEAD;
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Inner head highlight
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, rad * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Eyes
    var ex = dir.x * rad * 0.48;
    var ey = dir.y * rad * 0.48;
    var perp = { x: -dir.y, y: dir.x };
    var offsets = [0.35, -0.35];
    for (var oi = 0; oi < offsets.length; oi++) {
      var offset = offsets[oi];
      ctx.save();
      ctx.fillStyle = C_EYE;
      ctx.beginPath();
      ctx.arc(
        pts[0].x + ex + perp.x * rad * offset,
        pts[0].y + ey + perp.y * rad * offset,
        rad * 0.2, 0, Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }
  }

  function drawFood(ts) {
    if (!food) return;
    var pulse = 0.85 + 0.15 * Math.sin(ts / 280);
    var x = food.x * CELL + CELL / 2;
    var y = food.y * CELL + CELL / 2;
    var r = CELL * 0.35 * pulse;

    ctx.save();
    ctx.fillStyle = C_FOOD;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBonusFood(ts) {
    if (!bonus) return;
    var t = ts / 400;
    var x = bonus.x * CELL + CELL / 2;
    var y = bonus.y * CELL + CELL / 2 + Math.sin(t) * 2;
    var r = CELL * 0.38;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 0.6);

    var points = 5;
    var outer = r;
    var inner = r * 0.45;
    ctx.beginPath();
    for (var i = 0; i < points * 2; i++) {
      var angle = (Math.PI / points) * i - Math.PI / 2;
      var rr = i % 2 === 0 ? outer : inner;
      ctx.lineTo(Math.cos(angle) * rr, Math.sin(angle) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = C_BONUS;
    ctx.fill();

    // Countdown ring
    var remaining = bonusTimer / 8000;
    ctx.rotate(-t * 0.6);
    ctx.strokeStyle = 'rgba(255,215,0,' + (remaining * 0.6) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remaining);
    ctx.stroke();

    ctx.restore();
  }

  function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPopups() {
    for (var i = 0; i < popups.length; i++) {
      var p = popups[i];
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold ' + Math.max(10, Math.round(CELL * 0.65)) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    }
  }

  function draw(progress, ts) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(4,6,14,0.97)';
    ctx.fillRect(0, 0, W, H);

    drawGrid();

    if (state === 'dead') {
      ctx.save();
      drawParticles();
      ctx.restore();
      return;
    }

    if (state === 'playing' || state === 'paused') {
      drawFood(ts);
      drawBonusFood(ts);
      drawSnake(progress);
      drawParticles();
      drawPopups();
    }
  }

  // ============================================================
  // GAME LOOP
  // ============================================================
  function gameLoop(ts) {
    animId = adapter.requestAnimationFrame(gameLoop);

    var dt = Math.min(ts - (lastTs || ts), 50);
    lastTs = ts;

    if (state === 'playing') {
      // Bonus food countdown
      if (bonus) {
        bonusTimer -= dt;
        if (bonusTimer <= 0) { bonus = null; bonusTimer = 0; }
      }

      // Tick
      if (ts - lastTickTs >= interval) {
        lastTickTs += interval;
        if (lastTickTs < ts - interval) lastTickTs = ts;
        tick();
      }

      // Update particles
      for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.12;
        p.life -= p.decay;
        p.size *= 0.97;
        if (p.life <= 0) particles.splice(i, 1);
      }

      // Update popups
      for (var j = popups.length - 1; j >= 0; j--) {
        popups[j].y += popups[j].vy;
        popups[j].life -= 0.022;
        if (popups[j].life <= 0) popups.splice(j, 1);
      }
    } else {
      // Still animate particles on death screen
      for (var k = particles.length - 1; k >= 0; k--) {
        var pp = particles[k];
        pp.x += pp.vx; pp.y += pp.vy;
        pp.vy += 0.12;
        pp.life -= pp.decay;
        if (pp.life <= 0) particles.splice(k, 1);
      }
    }

    var progress = state === 'playing'
      ? Math.min(1, (ts - lastTickTs) / interval)
      : 1;

    draw(progress, ts);
  }

  // ============================================================
  // DIRECTION INPUT
  // ============================================================
  function setDir(dx, dy) {
    if (dx === -dir.x && dy === -dir.y) return;
    nextDir = { x: dx, y: dy };
  }

  function handleKeyDown(e) {
    if (state === 'playing' || state === 'paused') {
      if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        togglePause();
        return;
      }
    }
    if (state !== 'playing') return;
    switch (e.code) {
      case 'ArrowUp': case 'KeyW': e.preventDefault(); setDir(0, -1); break;
      case 'ArrowDown': case 'KeyS': e.preventDefault(); setDir(0, 1); break;
      case 'ArrowLeft': case 'KeyA': e.preventDefault(); setDir(-1, 0); break;
      case 'ArrowRight': case 'KeyD': e.preventDefault(); setDir(1, 0); break;
    }
  }

  // Touch swipe on canvas
  function handleTouchStart(e) {
    if (e.touches && e.touches.length > 0) {
      touchX0 = e.touches[0].clientX;
      touchY0 = e.touches[0].clientY;
    }
  }

  function handleTouchEnd(e) {
    if (state !== 'playing') return;
    if (e.changedTouches && e.changedTouches.length > 0) {
      var dx = e.changedTouches[0].clientX - touchX0;
      var dy = e.changedTouches[0].clientY - touchY0;
      var absDx = Math.abs(dx);
      var absDy = Math.abs(dy);
      if (Math.max(absDx, absDy) < 12) return;
      if (absDx > absDy) setDir(dx > 0 ? 1 : -1, 0);
      else setDir(0, dy > 0 ? 1 : -1);
    }
  }

  // ============================================================
  // PAUSE
  // ============================================================
  function togglePause() {
    if (state === 'playing') {
      state = 'paused';
      adapter.updateHUD({ gameState: 'paused' });
    } else if (state === 'paused') {
      state = 'playing';
      lastTickTs = lastTs;
      adapter.updateHUD({ gameState: 'playing' });
    }
  }

  // ============================================================
  // REGISTER LISTENERS
  // ============================================================
  adapter.addKeyListener('keydown', handleKeyDown);
  adapter.addEventListener('touchstart', handleTouchStart);
  adapter.addEventListener('touchend', handleTouchEnd);

  // ============================================================
  // PUBLIC API
  // ============================================================
  function start() {
    _initGameState();
    state = 'playing';
    lastTickTs = 0;
    lastTs = 0;

    adapter.updateHUD({
      gameState: 'playing',
      score: 0,
      bestScore: hiScore,
      level: 1,
      foodEaten: 0,
      isNewRecord: false
    });

    if (animId) adapter.cancelAnimationFrame(animId);
    animId = adapter.requestAnimationFrame(function firstFrame(ts) {
      lastTickTs = ts;
      lastTs = ts;
      animId = adapter.requestAnimationFrame(gameLoop);
    });
  }

  function destroy() {
    if (animId) adapter.cancelAnimationFrame(animId);
    animId = null;
    adapter.removeKeyListener('keydown', handleKeyDown);
    adapter.removeEventListener('touchstart', handleTouchStart);
    adapter.removeEventListener('touchend', handleTouchEnd);
  }

  // Draw idle background
  ctx.fillStyle = 'rgba(4,6,14,0.97)';
  ctx.fillRect(0, 0, W, H);
  drawGrid();

  return { start: start, destroy: destroy, togglePause: togglePause };
}

module.exports = { initGame: initGame };
