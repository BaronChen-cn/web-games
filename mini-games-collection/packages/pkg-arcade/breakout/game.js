var storage = require('../../../lib/storage');

function initGame(adapter) {
  var ctx = adapter.ctx;
  var W = adapter.width;
  var H = adapter.height;

  // ── Constants (scaled to actual canvas size) ──────────────────────────────
  var BASE_W = 420;
  var BASE_H = 560;
  var scaleX = W / BASE_W;
  var scaleY = H / BASE_H;
  var s = Math.min(scaleX, scaleY);

  var COLS = 10;
  var ROWS = 7;
  var BRICK_W = Math.floor(36 * s);
  var BRICK_H = Math.floor(14 * s);
  var BRICK_GAP = Math.floor(3 * s);
  var BRICK_TOP = Math.floor(50 * s);
  var BRICK_LEFT = Math.floor((W - COLS * (BRICK_W + BRICK_GAP) + BRICK_GAP) / 2);

  var ROW_COLORS = ['#ff3355','#ff6b35','#ffa500','#ffd700','#39ff14','#00f5ff','#bf00ff'];
  var ROW_SCORES = [10, 20, 30, 40, 50, 60, 70];

  var PADDLE_W = Math.floor(80 * s);
  var PADDLE_H = Math.floor(12 * s);
  var PADDLE_Y = H - Math.floor(30 * s) - PADDLE_H;
  var BALL_RADIUS = Math.floor(8 * s);
  var BASE_SPEED = 5 * s;
  var SPEED_INC = 0.3 * s;

  var POWERUP_CHANCE = 0.20;
  var POWERUP_SPEED = 2 * s;
  var POWERUP_TYPES = ['WIDE', 'SLOW', 'MULTI'];
  var POWERUP_COLORS = { WIDE: '#00f5ff', SLOW: '#bf00ff', MULTI: '#ffd700' };
  var POWERUP_LETTERS = { WIDE: 'W', SLOW: 'S', MULTI: 'M' };

  // ── State ────────────────────────────────────────────────────────────────
  var gameState = 'start';
  var score = 0;
  var highScore = parseInt(storage.getItem('breakout_hs') || '0', 10);
  var level = 1;
  var lives = 3;

  var paddleX = W / 2 - PADDLE_W / 2;
  var paddleWidth = PADDLE_W;
  var paddleWidthTimer = 0;

  var balls = [];
  var bricks = [];
  var powerups = [];
  var particles = [];

  var slowTimer = 0;
  var slowActive = false;

  var lastTime = 0;
  var animId = null;

  // ── Brick init ───────────────────────────────────────────────────────────
  function initBricks() {
    bricks = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var maxHp = r < 2 ? 2 : 1;
        bricks.push({
          r: r, c: c,
          x: BRICK_LEFT + c * (BRICK_W + BRICK_GAP),
          y: BRICK_TOP + r * (BRICK_H + BRICK_GAP),
          hp: maxHp,
          maxHp: maxHp,
          color: ROW_COLORS[r],
          alive: true
        });
      }
    }
  }

  // ── Ball init ────────────────────────────────────────────────────────────
  function createBall(onPaddle) {
    if (onPaddle === undefined) onPaddle = true;
    var speed = BASE_SPEED + (level - 1) * SPEED_INC;
    return {
      x: paddleX + paddleWidth / 2,
      y: PADDLE_Y - BALL_RADIUS - 1,
      vx: 0,
      vy: -speed,
      speed: speed,
      onPaddle: onPaddle
    };
  }

  function resetGameState(fromLevel) {
    if (!fromLevel) {
      score = 0;
      lives = 3;
      level = 1;
    }
    paddleX = W / 2 - PADDLE_W / 2;
    paddleWidth = PADDLE_W;
    paddleWidthTimer = 0;
    slowTimer = 0;
    slowActive = false;
    balls = [createBall(true)];
    powerups = [];
    particles = [];
    initBricks();
    updateUI();
  }

  // ── Particles ────────────────────────────────────────────────────────────
  function spawnParticles(x, y, color) {
    for (var i = 0; i < 8; i++) {
      var angle = (Math.PI * 2 / 8) * i + Math.random() * 0.3;
      var speed = (1.5 + Math.random() * 2) * s;
      particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        life: 1.0,
        size: (2.5 + Math.random() * 2) * s
      });
    }
  }

  // ── Powerup spawn ────────────────────────────────────────────────────────
  function spawnPowerup(x, y) {
    if (Math.random() > POWERUP_CHANCE) return;
    var type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    var pw = Math.floor(28 * s);
    var ph = Math.floor(14 * s);
    powerups.push({
      x: x - pw / 2, y: y,
      w: pw, h: ph,
      vy: POWERUP_SPEED,
      type: type,
      color: POWERUP_COLORS[type],
      letter: POWERUP_LETTERS[type]
    });
  }

  // ── Ball-Brick collision ──────────────────────────────────────────────────
  function ballBrickCollision(ball) {
    for (var i = 0; i < bricks.length; i++) {
      var b = bricks[i];
      if (!b.alive) continue;
      if (ball.x + BALL_RADIUS < b.x || ball.x - BALL_RADIUS > b.x + BRICK_W) continue;
      if (ball.y + BALL_RADIUS < b.y || ball.y - BALL_RADIUS > b.y + BRICK_H) continue;

      var overlapLeft  = (ball.x + BALL_RADIUS) - b.x;
      var overlapRight = (b.x + BRICK_W) - (ball.x - BALL_RADIUS);
      var overlapTop   = (ball.y + BALL_RADIUS) - b.y;
      var overlapBot   = (b.y + BRICK_H) - (ball.y - BALL_RADIUS);
      var minOverlap   = Math.min(overlapLeft, overlapRight, overlapTop, overlapBot);

      if (minOverlap === overlapLeft || minOverlap === overlapRight) {
        ball.vx = -ball.vx;
      } else {
        ball.vy = -ball.vy;
      }

      b.hp--;
      if (b.hp <= 0) {
        b.alive = false;
        var cx = b.x + BRICK_W / 2;
        var cy = b.y + BRICK_H / 2;
        spawnParticles(cx, cy, b.color);
        spawnPowerup(cx, cy);
        score += ROW_SCORES[b.r];
        if (score > highScore) {
          highScore = score;
          storage.setItem('breakout_hs', String(highScore));
        }
        updateUI();
      }
      return;
    }
  }

  // ── Ball-Paddle collision ─────────────────────────────────────────────────
  function ballPaddleCollision(ball) {
    if (ball.vy < 0) return;
    if (ball.y + BALL_RADIUS < PADDLE_Y) return;
    if (ball.y + BALL_RADIUS > PADDLE_Y + PADDLE_H + 6 * s) return;
    if (ball.x < paddleX || ball.x > paddleX + paddleWidth) return;

    var hitX = ball.x - (paddleX + paddleWidth / 2);
    var norm = hitX / (paddleWidth / 2);
    var angle = norm * 60 * (Math.PI / 180);
    var spd = ball.speed;
    ball.vx = Math.sin(angle) * spd;
    ball.vy = -Math.cos(angle) * spd;
    ball.y = PADDLE_Y - BALL_RADIUS - 1;
  }

  // ── Powerup collection ────────────────────────────────────────────────────
  function collectPowerup(p) {
    score += 50;
    if (score > highScore) {
      highScore = score;
      storage.setItem('breakout_hs', String(highScore));
    }
    switch (p.type) {
      case 'WIDE':
        paddleWidth = Math.floor(120 * s);
        paddleWidthTimer = 12000;
        break;
      case 'SLOW':
        slowActive = true;
        slowTimer = 10000;
        for (var i = 0; i < balls.length; i++) {
          var ball = balls[i];
          var spd = ball.speed * 0.6;
          var len = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
          if (len > 0) { ball.vx = ball.vx / len * spd; ball.vy = ball.vy / len * spd; }
          ball.speed = spd;
        }
        break;
      case 'MULTI':
        if (balls.length < 4) {
          var ref = balls[0];
          var nb = {
            x: ref.x, y: ref.y,
            vx: -ref.vx + (Math.random() - 0.5) * 2,
            vy: ref.vy,
            speed: ref.speed,
            onPaddle: false
          };
          var nLen = Math.sqrt(nb.vx * nb.vx + nb.vy * nb.vy);
          if (nLen > 0) { nb.vx = nb.vx / nLen * ref.speed; nb.vy = nb.vy / nLen * ref.speed; }
          balls.push(nb);
        }
        break;
    }
    updateUI();
  }

  // ── Check level clear ─────────────────────────────────────────────────────
  function checkLevelClear() {
    var allDead = true;
    for (var i = 0; i < bricks.length; i++) {
      if (bricks[i].alive) { allDead = false; break; }
    }
    if (allDead) {
      gameState = 'levelclear';
      adapter.updateHUD({
        gameState: 'levelclear',
        score: score,
        bestScore: highScore,
        level: level,
        lives: lives
      });
    }
  }

  // ── Update UI ─────────────────────────────────────────────────────────────
  function updateUI() {
    adapter.updateHUD({
      gameState: gameState,
      score: score,
      bestScore: highScore,
      level: level,
      lives: lives
    });
  }

  // ── Main game loop ────────────────────────────────────────────────────────
  function tick(ts) {
    var dt = Math.min(ts - lastTime, 50);
    lastTime = ts;

    if (gameState !== 'playing') {
      drawFrame();
      animId = adapter.requestAnimationFrame(tick);
      return;
    }

    update(dt);
    drawFrame();
    animId = adapter.requestAnimationFrame(tick);
  }

  function update(dt) {
    var dtFactor = dt / (1000 / 60);

    // Timers
    if (paddleWidthTimer > 0) {
      paddleWidthTimer -= dt;
      if (paddleWidthTimer <= 0) { paddleWidth = PADDLE_W; paddleWidthTimer = 0; }
    }
    if (slowTimer > 0) {
      slowTimer -= dt;
      if (slowTimer <= 0) {
        slowActive = false;
        slowTimer = 0;
        for (var si = 0; si < balls.length; si++) {
          var sb = balls[si];
          if (!sb.onPaddle) {
            var currentSpeed = BASE_SPEED + (level - 1) * SPEED_INC;
            var sLen = Math.sqrt(sb.vx * sb.vx + sb.vy * sb.vy);
            if (sLen > 0) { sb.vx = sb.vx / sLen * currentSpeed; sb.vy = sb.vy / sLen * currentSpeed; }
            sb.speed = currentSpeed;
          }
        }
      }
    }

    // Update balls
    var deadBalls = [];
    for (var i = 0; i < balls.length; i++) {
      var ball = balls[i];
      if (ball.onPaddle) {
        ball.x = paddleX + paddleWidth / 2;
        ball.y = PADDLE_Y - BALL_RADIUS - 1;
        continue;
      }
      ball.x += ball.vx * dtFactor;
      ball.y += ball.vy * dtFactor;

      // Wall collisions
      if (ball.x - BALL_RADIUS < 0) {
        ball.x = BALL_RADIUS;
        ball.vx = Math.abs(ball.vx);
      }
      if (ball.x + BALL_RADIUS > W) {
        ball.x = W - BALL_RADIUS;
        ball.vx = -Math.abs(ball.vx);
      }
      if (ball.y - BALL_RADIUS < 0) {
        ball.y = BALL_RADIUS;
        ball.vy = Math.abs(ball.vy);
      }

      ballPaddleCollision(ball);
      ballBrickCollision(ball);

      if (ball.y - BALL_RADIUS > H) {
        deadBalls.push(i);
      }
    }

    // Remove dead balls
    for (var di = deadBalls.length - 1; di >= 0; di--) {
      balls.splice(deadBalls[di], 1);
    }

    if (balls.length === 0) {
      lives--;
      updateUI();
      if (lives <= 0) {
        gameState = 'gameover';
        var isNewRecord = score > parseInt(storage.getItem('breakout_hs') || '0', 10);
        adapter.updateHUD({
          gameState: 'gameover',
          score: score,
          bestScore: highScore,
          level: level,
          lives: 0,
          isNewRecord: isNewRecord
        });
        return;
      }
      balls = [createBall(true)];
    }

    // Update powerups
    for (var pi = powerups.length - 1; pi >= 0; pi--) {
      var p = powerups[pi];
      p.y += p.vy * dtFactor;
      if (p.y + p.h >= PADDLE_Y && p.y <= PADDLE_Y + PADDLE_H &&
          p.x + p.w >= paddleX && p.x <= paddleX + paddleWidth) {
        collectPowerup(p);
        powerups.splice(pi, 1);
        continue;
      }
      if (p.y > H) powerups.splice(pi, 1);
    }

    // Update particles
    for (var qi = particles.length - 1; qi >= 0; qi--) {
      var pt = particles[qi];
      pt.x += pt.vx * dtFactor;
      pt.y += pt.vy * dtFactor;
      pt.life -= dtFactor / 30;
      if (pt.life <= 0) particles.splice(qi, 1);
    }

    checkLevelClear();
  }

  // ── Drawing ───────────────────────────────────────────────────────────────
  function drawFrame() {
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#07080f';
    ctx.fillRect(0, 0, W, H);

    drawBricks();
    drawPowerups();
    drawParticles();
    drawPaddle();
    for (var i = 0; i < balls.length; i++) drawBall(balls[i]);
  }

  function drawBricks() {
    for (var i = 0; i < bricks.length; i++) {
      var b = bricks[i];
      if (!b.alive) continue;
      var faded = b.hp < b.maxHp;
      ctx.save();
      ctx.shadowColor = b.color;
      ctx.shadowBlur = faded ? 4 : 8;
      var alpha = faded ? 0.5 : 1.0;
      ctx.globalAlpha = alpha;

      var grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + BRICK_H);
      grad.addColorStop(0, b.color);
      var dim = hexToRgb(b.color);
      grad.addColorStop(1, 'rgba(' + dim.r + ',' + dim.g + ',' + dim.b + ',0.5)');
      ctx.fillStyle = grad;
      roundRect(ctx, b.x, b.y, BRICK_W, BRICK_H, 3 * s);
      ctx.fill();

      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      roundRect(ctx, b.x + 1, b.y + 1, BRICK_W - 2, 3 * s, 1);
      ctx.fill();

      ctx.restore();
    }
  }

  function drawPaddle() {
    ctx.save();
    ctx.shadowColor = '#ff6b35';
    ctx.shadowBlur = 12;
    var grad = ctx.createLinearGradient(paddleX, PADDLE_Y, paddleX + paddleWidth, PADDLE_Y);
    grad.addColorStop(0, '#ff6b35');
    grad.addColorStop(0.5, '#ffd700');
    grad.addColorStop(1, '#ff6b35');
    ctx.fillStyle = grad;
    roundRect(ctx, paddleX, PADDLE_Y, paddleWidth, PADDLE_H, 6 * s);
    ctx.fill();

    ctx.globalAlpha = 0.4;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    roundRect(ctx, paddleX + 2, PADDLE_Y + 1, paddleWidth - 4, 3 * s, 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBall(ball) {
    ctx.save();
    ctx.shadowColor = '#ff6b35';
    ctx.shadowBlur = 15;
    var grad = ctx.createRadialGradient(
      ball.x - BALL_RADIUS * 0.3, ball.y - BALL_RADIUS * 0.3, BALL_RADIUS * 0.1,
      ball.x, ball.y, BALL_RADIUS
    );
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.3, '#ffd700');
    grad.addColorStop(1, '#ff6b35');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPowerups() {
    for (var i = 0; i < powerups.length; i++) {
      var p = powerups[i];
      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.85;
      roundRect(ctx, p.x, p.y, p.w, p.h, 6 * s);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + Math.floor(9 * s) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 0;
      ctx.fillText(p.letter, p.x + p.w / 2, p.y + p.h / 2);
      ctx.restore();
    }
  }

  function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return { r: r, g: g, b: b };
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  function handleTouchMove(e) {
    if (gameState !== 'playing') return;
    var touches = e.touches || [];
    if (touches.length === 0) return;
    var touch = touches[0];
    var cx = touch.x / adapter.width * W;
    paddleX = Math.max(0, Math.min(W - paddleWidth, cx - paddleWidth / 2));
    for (var i = 0; i < balls.length; i++) {
      if (balls[i].onPaddle) balls[i].x = paddleX + paddleWidth / 2;
    }
  }

  function handleTouchStart(e) {
    if (gameState !== 'playing') return;
    var touches = e.touches || [];
    if (touches.length === 0) return;
    var touch = touches[0];
    var cx = touch.x / adapter.width * W;
    paddleX = Math.max(0, Math.min(W - paddleWidth, cx - paddleWidth / 2));
    for (var i = 0; i < balls.length; i++) {
      if (balls[i].onPaddle) balls[i].x = paddleX + paddleWidth / 2;
    }
  }

  function handleTap() {
    if (gameState === 'playing') {
      launchBalls();
    }
  }

  function launchBalls() {
    for (var i = 0; i < balls.length; i++) {
      var ball = balls[i];
      if (ball.onPaddle) {
        ball.onPaddle = false;
        var spd = BASE_SPEED + (level - 1) * SPEED_INC;
        ball.speed = spd;
        ball.vx = (Math.random() - 0.5) * 2;
        ball.vy = -spd;
        var len = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        ball.vx = ball.vx / len * spd;
        ball.vy = ball.vy / len * spd;
      }
    }
  }

  function handlePauseKey(e) {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      togglePause();
    }
  }

  // Register event listeners
  adapter.addEventListener('touchmove', handleTouchMove);
  adapter.addEventListener('touchstart', handleTouchStart);
  adapter.addEventListener('tap', handleTap);
  adapter.addKeyListener('keydown', handlePauseKey);

  // ── Public API ────────────────────────────────────────────────────────────
  function start() {
    resetGameState(false);
    gameState = 'playing';
    lastTime = 0;
    if (animId) adapter.cancelAnimationFrame(animId);

    adapter.updateHUD({
      gameState: 'playing',
      score: 0,
      bestScore: highScore,
      level: 1,
      lives: 3,
      isNewRecord: false
    });

    animId = adapter.requestAnimationFrame(function firstFrame(ts) {
      lastTime = ts;
      animId = adapter.requestAnimationFrame(tick);
    });
  }

  function nextLevel() {
    level++;
    resetGameState(true);
    gameState = 'playing';

    adapter.updateHUD({
      gameState: 'playing',
      score: score,
      bestScore: highScore,
      level: level,
      lives: lives,
      isNewRecord: false
    });

    if (!animId) {
      animId = adapter.requestAnimationFrame(function firstFrame(ts) {
        lastTime = ts;
        animId = adapter.requestAnimationFrame(tick);
      });
    }
  }

  function togglePause() {
    if (gameState === 'playing') {
      gameState = 'paused';
      adapter.updateHUD({
        gameState: 'paused',
        score: score,
        bestScore: highScore,
        level: level,
        lives: lives
      });
    } else if (gameState === 'paused') {
      gameState = 'playing';
      adapter.updateHUD({
        gameState: 'playing',
        score: score,
        bestScore: highScore,
        level: level,
        lives: lives
      });
    }
  }

  function destroy() {
    if (animId) adapter.cancelAnimationFrame(animId);
    animId = null;
    adapter.removeEventListener('touchmove', handleTouchMove);
    adapter.removeEventListener('touchstart', handleTouchStart);
    adapter.removeEventListener('tap', handleTap);
    adapter.removeKeyListener('keydown', handlePauseKey);
  }

  // Draw initial frame
  drawFrame();

  return { start: start, destroy: destroy, nextLevel: nextLevel, togglePause: togglePause };
}

module.exports = { initGame: initGame };
