var storage = require('../../../lib/storage');

function initGame(adapter) {
  var ctx = adapter.ctx;
  var W = adapter.width;
  var H = adapter.height;

  // ── Constants ──────────────────────────────────────────
  var BASE_W      = 340;
  var GRAVITY     = 0.38;
  var FLAP_VY     = -7.2;
  var PIPE_W      = 60;
  var PIPE_GAP    = 155;
  var PIPE_SPEED  = 2.4;
  var PIPE_SPAWN  = 90;   // frames
  var BIRD_R      = 14;
  var GROUND_H    = 40;

  var STATE_IDLE    = 0;
  var STATE_PLAYING = 1;
  var STATE_DEAD    = 2;

  // ── Static stars (fixed coords, no random) ─────────────
  var STARS = [
    [12,18],[45,8],[80,30],[110,15],[150,5],[190,22],[220,10],[260,35],[290,12],[320,28],
    [30,55],[70,48],[100,65],[140,42],[175,58],[210,45],[250,68],[300,50],[330,38],[8,80],
    [55,90],[95,75],[130,88],[165,72],[200,95],[240,82],[280,70],[315,85],[25,115],[65,108],
    [105,122],[145,100],[185,118],[225,105],[265,125],[305,110],[20,145],[60,138],[100,152],
    [140,130],[180,148],[220,135],[260,155],[300,140],[40,175],[85,168],[125,182],[165,160],
    [205,178],[245,165],[285,185],[10,200],[50,210],[90,195],[135,215],[170,202],[215,220],
    [255,195],[295,212],[325,205],[35,240],[75,228],[115,245],[155,232],[195,250],[235,238],
    [275,252],[318,242],[22,270],[62,258],[102,275],[142,262],[182,280],[222,268],[262,285],
    [302,272]
  ];

  // ── Internal scaling ───────────────────────────────────
  var scale   = W / BASE_W;
  var groundY = H - Math.round(GROUND_H * scale);

  // ── State ──────────────────────────────────────────────
  var state, score, highScore, sessionBest;
  var birdX, birdY, birdVY;
  var birdAngle, wingPhase;
  var idlePhase;
  var pipes;       // [{x, topH, scored}]
  var particles;   // [{x,y,vx,vy,life,maxLife,color}]
  var frameCount;
  var animId = null;

  highScore   = parseInt(storage.getItem('flappy_hs') || '0', 10);
  sessionBest = 0;
  state       = STATE_IDLE;

  function resetGame() {
    score      = 0;
    pipes      = [];
    particles  = [];
    frameCount = 0;
    birdX      = Math.round(W * 0.3);
    birdY      = Math.round(H * 0.45);
    birdVY     = 0;
    birdAngle  = 0;
    wingPhase  = 0;
    idlePhase  = 0;
    updateUI();
  }

  function startGame() {
    resetGame();
    state = STATE_PLAYING;
    adapter.updateHUD({ gameState: 'playing' });
  }

  function die() {
    state = STATE_DEAD;
    if (score > sessionBest) sessionBest = score;
    var isNewRecord = false;
    if (score > highScore) {
      highScore = score;
      storage.setItem('flappy_hs', String(highScore));
      isNewRecord = true;
    }
    updateUI();
    adapter.updateHUD({
      gameState: 'dead',
      score: score,
      bestScore: highScore,
      isNewRecord: isNewRecord
    });
  }

  function flap() {
    if (state !== STATE_PLAYING) return;
    birdVY = FLAP_VY * scale;
    wingPhase = 1;
    spawnParticles();
  }

  // ── Particles ──────────────────────────────────────────
  function spawnParticles() {
    var colors = ['#ffd700','#ff8c00','#ffb300','#fff176'];
    for (var i = 0; i < 8; i++) {
      var angle = Math.PI + (Math.random() - 0.5) * 1.8;
      var speed = (1.5 + Math.random() * 2.5) * scale;
      particles.push({
        x:    birdX,
        y:    birdY + BIRD_R * scale * 0.3,
        vx:   Math.cos(angle) * speed,
        vy:   Math.sin(angle) * speed - 1 * scale,
        life: 0,
        maxLife: 22 + Math.random() * 14 | 0,
        color: colors[Math.random() * colors.length | 0]
      });
    }
  }

  function updateParticles() {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.12 * scale;
      p.life++;
      if (p.life >= p.maxLife) particles.splice(i, 1);
    }
  }

  function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
      var p   = particles[i];
      var t   = p.life / p.maxLife;
      var r   = (2.5 + (1 - t) * 2) * scale;
      ctx.globalAlpha = (1 - t) * 0.85;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── Drawing ────────────────────────────────────────────
  function drawBackground() {
    // sky gradient
    var grad = ctx.createLinearGradient(0, 0, 0, groundY);
    grad.addColorStop(0,   '#07080f');
    grad.addColorStop(0.4, '#0d1220');
    grad.addColorStop(1,   '#1a2a3a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // stars
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (var i = 0; i < STARS.length; i++) {
      var sx = STARS[i][0] * scale;
      var sy = STARS[i][1] * scale;
      if (sy < groundY - 5 * scale) {
        var r = (0.7 + (i % 3) * 0.4) * scale;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawGround() {
    // dirt
    var dirtGrad = ctx.createLinearGradient(0, groundY, 0, H);
    dirtGrad.addColorStop(0, '#4a3728');
    dirtGrad.addColorStop(1, '#2a1f14');
    ctx.fillStyle = dirtGrad;
    ctx.fillRect(0, groundY, W, H - groundY);

    // grass strip
    var grassH = Math.round(8 * scale);
    var grassGrad = ctx.createLinearGradient(0, groundY, 0, groundY + grassH);
    grassGrad.addColorStop(0, '#4caf50');
    grassGrad.addColorStop(1, '#2e7d32');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, groundY, W, grassH);

    // grass highlight
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, groundY, W, Math.round(2 * scale));
  }

  function drawPipe(pipe) {
    var x    = pipe.x;
    var topH = pipe.topH;
    var pw   = PIPE_W * scale;
    var capH = Math.round(14 * scale);
    var capW = pw + Math.round(8 * scale);
    var capX = x - Math.round(4 * scale);

    // === Top pipe ===
    var tGrad = ctx.createLinearGradient(x, 0, x + pw, 0);
    tGrad.addColorStop(0,   '#1b5e20');
    tGrad.addColorStop(0.3, '#388e3c');
    tGrad.addColorStop(0.6, '#4caf50');
    tGrad.addColorStop(1,   '#1b5e20');
    ctx.fillStyle = tGrad;
    ctx.fillRect(x, 0, pw, topH - capH);

    // highlight stripe
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(x + pw * 0.18, 0, pw * 0.12, topH - capH);

    // cap
    var tcGrad = ctx.createLinearGradient(capX, 0, capX + capW, 0);
    tcGrad.addColorStop(0,   '#1b5e20');
    tcGrad.addColorStop(0.3, '#43a047');
    tcGrad.addColorStop(0.6, '#66bb6a');
    tcGrad.addColorStop(1,   '#1b5e20');
    ctx.fillStyle = tcGrad;
    roundRect(ctx, capX, topH - capH, capW, capH, Math.round(4 * scale));
    ctx.fill();

    // neon glow on cap
    ctx.save();
    ctx.shadowColor = 'rgba(100,255,100,0.35)';
    ctx.shadowBlur  = Math.round(8 * scale);
    ctx.strokeStyle = 'rgba(150,255,150,0.25)';
    ctx.lineWidth   = 1.5 * scale;
    roundRect(ctx, capX, topH - capH, capW, capH, Math.round(4 * scale));
    ctx.stroke();
    ctx.restore();

    // === Bottom pipe ===
    var botY = topH + PIPE_GAP * scale;
    var botH = groundY - botY;
    if (botH <= 0) return;

    var bGrad = ctx.createLinearGradient(x, 0, x + pw, 0);
    bGrad.addColorStop(0,   '#1b5e20');
    bGrad.addColorStop(0.3, '#388e3c');
    bGrad.addColorStop(0.6, '#4caf50');
    bGrad.addColorStop(1,   '#1b5e20');
    ctx.fillStyle = bGrad;
    ctx.fillRect(x, botY + capH, pw, botH - capH);

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(x + pw * 0.18, botY + capH, pw * 0.12, botH - capH);

    var bcGrad = ctx.createLinearGradient(capX, 0, capX + capW, 0);
    bcGrad.addColorStop(0,   '#1b5e20');
    bcGrad.addColorStop(0.3, '#43a047');
    bcGrad.addColorStop(0.6, '#66bb6a');
    bcGrad.addColorStop(1,   '#1b5e20');
    ctx.fillStyle = bcGrad;
    roundRect(ctx, capX, botY, capW, capH, Math.round(4 * scale));
    ctx.fill();

    ctx.save();
    ctx.shadowColor = 'rgba(100,255,100,0.35)';
    ctx.shadowBlur  = Math.round(8 * scale);
    ctx.strokeStyle = 'rgba(150,255,150,0.25)';
    ctx.lineWidth   = 1.5 * scale;
    roundRect(ctx, capX, botY, capW, capH, Math.round(4 * scale));
    ctx.stroke();
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function drawBird(x, y, angle, wingPh) {
    var r   = BIRD_R * scale;
    var wAmp = Math.sin(wingPh) * r * 0.7;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // shadow
    ctx.save();
    ctx.shadowColor = 'rgba(255,200,0,0.3)';
    ctx.shadowBlur  = r * 1.2;

    // body
    var bodyGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.3, r * 0.1, 0, 0, r);
    bodyGrad.addColorStop(0, '#fff176');
    bodyGrad.addColorStop(0.5, '#fdd835');
    bodyGrad.addColorStop(1,   '#f57f17');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // wing (left / behind)
    ctx.fillStyle = '#ff8c00';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, wAmp, r * 0.55, r * 0.32, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // wing highlight
    ctx.fillStyle = 'rgba(255,200,100,0.35)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, wAmp - r * 0.06, r * 0.35, r * 0.16, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // white of eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(r * 0.35, -r * 0.22, r * 0.36, 0, Math.PI * 2);
    ctx.fill();

    // pupil
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(r * 0.44, -r * 0.22, r * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // eye shine
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(r * 0.50, -r * 0.30, r * 0.07, 0, Math.PI * 2);
    ctx.fill();

    // beak
    ctx.fillStyle = '#ff6f00';
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -r * 0.1);
    ctx.lineTo(r * 1.25, 0);
    ctx.lineTo(r * 0.7, r * 0.22);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#e65100';
    ctx.beginPath();
    ctx.moveTo(r * 0.7, r * 0.02);
    ctx.lineTo(r * 1.25, 0);
    ctx.lineTo(r * 0.7, r * 0.12);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawScore() {
    if (state !== STATE_PLAYING) return;
    var s   = String(score);
    var fs  = Math.round(28 * scale);
    ctx.save();
    ctx.font = '900 ' + fs + 'px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor  = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur   = Math.round(12 * scale);
    ctx.fillStyle    = '#ffffff';
    ctx.fillText(s, W / 2, Math.round(12 * scale));
    ctx.restore();
  }

  // ── Update ─────────────────────────────────────────────
  function updateBird() {
    if (state === STATE_IDLE) {
      idlePhase += 0.05;
      birdY  = H * 0.45 + Math.sin(idlePhase) * 8 * scale;
      birdX  = W * 0.3;
      birdAngle = 0;
      wingPhase += 0.12;
      return;
    }

    birdVY    += GRAVITY * scale;
    birdY     += birdVY;
    wingPhase += 0.18;

    // tilt angle based on velocity
    var maxUp   = -Math.PI * 0.38;
    var maxDown =  Math.PI * 0.46;
    var normVY  = birdVY / (8 * scale);
    birdAngle   = Math.max(maxUp, Math.min(maxDown, normVY * Math.PI * 0.28));

    // ceiling
    if (birdY - BIRD_R * scale <= 0) { die(); return; }
    // ground
    if (birdY + BIRD_R * scale >= groundY) { die(); return; }
  }

  function updatePipes() {
    if (state !== STATE_PLAYING) return;

    // spawn
    if (frameCount % PIPE_SPAWN === 0) {
      var minTop = Math.round(60 * scale);
      var maxTop = groundY - Math.round(PIPE_GAP * scale) - Math.round(60 * scale);
      // deterministic-ish: use frameCount + sin for variety
      var topH   = minTop + Math.abs(Math.sin(frameCount * 0.37 + 1.2)) * (maxTop - minTop);
      topH       = Math.round(topH);
      pipes.push({ x: W, topH: topH, scored: false });
    }

    var pw = PIPE_W * scale;
    var sp = PIPE_SPEED * scale;
    var br = BIRD_R * scale;
    var margin = 3; // pixel tolerance

    for (var i = pipes.length - 1; i >= 0; i--) {
      var p = pipes[i];
      p.x  -= sp;

      // scoring
      if (!p.scored && p.x + pw < birdX) {
        p.scored = true;
        score++;
        updateUI();
      }

      // collision (rect vs circle)
      var botY = p.topH + PIPE_GAP * scale;
      var left = p.x - margin;
      var right= p.x + pw + margin;

      if (birdX + br > left && birdX - br < right) {
        // top pipe: 0 to topH
        if (birdY - br < p.topH - margin) { die(); return; }
        // bot pipe
        if (birdY + br > botY + margin)   { die(); return; }
      }

      // remove off-screen
      if (p.x + pw < -10) pipes.splice(i, 1);
    }
  }

  // ── UI ─────────────────────────────────────────────────
  function updateUI() {
    var hs = Math.max(highScore, score);
    adapter.updateHUD({
      score: score,
      bestScore: hs,
      sessionBest: Math.max(sessionBest, score)
    });
  }

  // ── Game loop ──────────────────────────────────────────
  function loop() {
    animId = adapter.requestAnimationFrame(loop);

    // update
    if (state === STATE_PLAYING || state === STATE_IDLE) {
      updateBird();
      updatePipes();
      updateParticles();
      if (state === STATE_PLAYING) frameCount++;
    }

    // draw
    drawBackground();
    for (var i = 0; i < pipes.length; i++) drawPipe(pipes[i]);
    drawParticles();
    drawGround();
    drawBird(birdX, birdY, birdAngle, wingPhase);
    drawScore();
  }

  // ── Input ──────────────────────────────────────────────
  adapter.addEventListener('tap', flap);

  // ── Public API ─────────────────────────────────────────
  function start() {
    startGame();
    if (animId) adapter.cancelAnimationFrame(animId);
    animId = adapter.requestAnimationFrame(loop);
  }

  function destroy() {
    if (animId) adapter.cancelAnimationFrame(animId);
    animId = null;
    adapter.removeEventListener('tap', flap);
  }

  // Draw idle state immediately (bird bobbing)
  resetGame();
  animId = adapter.requestAnimationFrame(loop);

  return { start: start, destroy: destroy };
}

module.exports = { initGame: initGame };
