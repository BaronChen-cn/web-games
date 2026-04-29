const storage = require('../../../lib/storage');

function initGame(adapter) {
  const ctx = adapter.ctx;
  const W = adapter.width;
  const H = adapter.height;

  const PALETTES = [
    ['#3b82f6', '#6ee7f7'],
    ['#8b5cf6', '#a78bfa'],
    ['#ec4899', '#f472b6'],
    ['#f97316', '#fb923c'],
    ['#eab308', '#fde68a'],
    ['#10b981', '#6ee7b7'],
    ['#f43f5e', '#fb7185'],
    ['#06b6d4', '#67e8f9']
  ];

  function getPalette(layer) {
    return PALETTES[layer % PALETTES.length];
  }

  const BLOCK_HEIGHT = 28;
  const BOTTOM_MARGIN = 0;
  var INITIAL_BLOCK_W = function () { return Math.min(W * 0.55, 240); };
  var STACK_COUNT = function () { return Math.floor((H - 120 - BOTTOM_MARGIN) / BLOCK_HEIGHT); };
  const BASE_SPEED = 3.2;
  const MAX_SPEED = 11;
  const SPEED_STEP = 0.18;
  const PERFECT_THRESHOLD = 4;

  var state = 'idle';
  var score = 0;
  var bestScore = parseInt(storage.getItem('stack_best') || '0', 10);
  var layers = [];
  var currentBlock = {};
  var debris = [];
  var particles = [];
  var cameraY = 0;
  var targetCameraY = 0;
  var animId = null;
  var lastTime = 0;
  var perfectTextTimer = 0;
  var perfectTextAlpha = 0;
  var perfectTextY = 0;

  function _initGameState() {
    score = 0;
    layers = [];
    debris = [];
    particles = [];
    cameraY = 0;
    targetCameraY = 0;
    perfectTextTimer = 0;
    perfectTextAlpha = 0;

    var bw = INITIAL_BLOCK_W();
    var bx = (W - bw) / 2;
    layers.push({ x: bx, w: bw, layer: 0, colorIdx: 0 });

    spawnBlock();
    updateScoreUI();
  }

  function spawnBlock() {
    var prevLayer = layers[layers.length - 1];
    var layer = layers.length;
    var colorIdx = layer % PALETTES.length;
    var bw = prevLayer.w;
    var goingRight = layer % 2 === 1;
    var startX = goingRight ? -bw - 10 : W + 10;

    currentBlock = {
      x: startX,
      w: bw,
      layer: layer,
      colorIdx: colorIdx,
      goingRight: goingRight,
      speed: Math.min(BASE_SPEED + SPEED_STEP * score, MAX_SPEED)
    };
  }

  function layerToScreenY(layerIdx) {
    var baseY = H - BOTTOM_MARGIN - BLOCK_HEIGHT;
    return baseY - layerIdx * BLOCK_HEIGHT + cameraY;
  }

  function dropBlock() {
    if (state !== 'playing') return;

    var prev = layers[layers.length - 1];
    var cur = currentBlock;

    var left = Math.max(cur.x, prev.x);
    var right = Math.min(cur.x + cur.w, prev.x + prev.w);
    var overlap = right - left;

    if (overlap <= 0) {
      gameOver();
      return;
    }

    var cutAmount = cur.w - overlap;
    if (cutAmount > cur.w * 0.5) {
      gameOver();
      return;
    }

    var isPerfect = cutAmount <= PERFECT_THRESHOLD;

    var newX, newW;
    if (isPerfect) {
      newX = prev.x;
      newW = prev.w;
      triggerPerfect();
      score += 2;
    } else {
      newX = left;
      newW = overlap;
      score += 1;

      spawnDebris(cur, prev, left, right);
    }

    layers.push({ x: newX, w: newW, layer: cur.layer, colorIdx: cur.colorIdx });

    var topLayer = layers.length - 1;
    var visibleLayers = STACK_COUNT();
    if (topLayer >= visibleLayers - 2) {
      targetCameraY = (topLayer - (visibleLayers - 3)) * BLOCK_HEIGHT;
    }

    updateScoreUI();
    spawnBlock();
  }

  function spawnDebris(cur, prev, keepLeft, keepRight) {
    var palette = getPalette(cur.colorIdx);
    var c1 = palette[0];
    var c2 = palette[1];
    if (cur.x < keepLeft) {
      debris.push({
        x: cur.x, y: layerToScreenY(cur.layer),
        w: keepLeft - cur.x, h: BLOCK_HEIGHT,
        vx: -1.5 - Math.random(), vy: -1,
        gravity: 0.4, alpha: 1,
        c1: c1, c2: c2, rot: 0, rotV: (Math.random() - 0.5) * 0.08
      });
    }
    if (cur.x + cur.w > keepRight) {
      debris.push({
        x: keepRight, y: layerToScreenY(cur.layer),
        w: (cur.x + cur.w) - keepRight, h: BLOCK_HEIGHT,
        vx: 1.5 + Math.random(), vy: -1,
        gravity: 0.4, alpha: 1,
        c1: c1, c2: c2, rot: 0, rotV: (Math.random() - 0.5) * 0.08
      });
    }
  }

  function triggerPerfect() {
    // Canvas-drawn perfect text
    perfectTextAlpha = 1;
    perfectTextTimer = 60; // frames to display
    perfectTextY = layerToScreenY(currentBlock.layer) - 10;

    // Particle burst
    var cx = W / 2;
    var cy = layerToScreenY(currentBlock.layer) + BLOCK_HEIGHT / 2;
    for (var i = 0; i < 36; i++) {
      var angle = (Math.PI * 2 * i) / 36 + Math.random() * 0.2;
      var speed = 2 + Math.random() * 4;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        alpha: 1, size: 3 + Math.random() * 3,
        gravity: 0.12,
        hue: 180 + Math.random() * 60
      });
    }
  }

  function gameOver() {
    state = 'dead';
    if (animId) adapter.cancelAnimationFrame(animId);
    animId = null;

    var isNewBest = score > bestScore;
    if (isNewBest) {
      bestScore = score;
      storage.setItem('stack_best', String(bestScore));
    }

    adapter.updateHUD({
      gameState: 'dead',
      score: score,
      bestScore: bestScore,
      layers: layers.length,
      isNewRecord: isNewBest
    });
  }

  function updateScoreUI() {
    adapter.updateHUD({
      score: score,
      bestScore: Math.max(score, bestScore),
      layers: layers.length
    });
  }

  function drawBlock(x, y, w, h, colorIdx, alpha, shadow) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;

    var palette = getPalette(colorIdx);
    var c1 = palette[0];
    var c2 = palette[1];

    if (shadow !== false) {
      ctx.shadowColor = c1;
      ctx.shadowBlur = 14;
    }

    var grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;

    var r = 4;
    roundRect(ctx, x, y, w, h, r);
    ctx.fill();

    ctx.shadowBlur = 0;
    var hiGrad = ctx.createLinearGradient(x, y, x, y + h * 0.35);
    hiGrad.addColorStop(0, 'rgba(255,255,255,0.22)');
    hiGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hiGrad;
    roundRect(ctx, x, y, w, h, r);
    ctx.fill();

    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
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

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Background
    var bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#07080f');
    bgGrad.addColorStop(1, '#0d1020');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.025)';
    ctx.lineWidth = 1;
    var gridSpacing = 40;
    for (var gx = 0; gx < W; gx += gridSpacing) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (var gy = 0; gy < H; gy += gridSpacing) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }
    ctx.restore();

    if (state === 'idle') return;

    // Draw stacked layers
    var topLayer = layers.length - 1;
    for (var i = 0; i < layers.length; i++) {
      var lyr = layers[i];
      var sy = layerToScreenY(i);
      if (sy > H + BLOCK_HEIGHT || sy < -BLOCK_HEIGHT * 3) continue;

      var distFromTop = topLayer - i;
      var alpha = distFromTop > 20 ? 0.35 : 1 - distFromTop * 0.03;
      drawBlock(lyr.x, sy, lyr.w, BLOCK_HEIGHT, lyr.colorIdx, alpha);
    }

    // Draw moving block
    if (state === 'playing') {
      var msy = layerToScreenY(currentBlock.layer);
      drawBlock(currentBlock.x, msy, currentBlock.w, BLOCK_HEIGHT, currentBlock.colorIdx, 1);
    }

    // Draw debris
    for (var di = 0; di < debris.length; di++) {
      var d = debris[di];
      ctx.save();
      ctx.globalAlpha = d.alpha;
      ctx.translate(d.x + d.w / 2, d.y + d.h / 2);
      ctx.rotate(d.rot);
      var dGrad = ctx.createLinearGradient(-d.w / 2, -d.h / 2, d.w / 2, d.h / 2);
      dGrad.addColorStop(0, d.c1);
      dGrad.addColorStop(1, d.c2);
      ctx.fillStyle = dGrad;
      ctx.shadowColor = d.c1;
      ctx.shadowBlur = 8;
      ctx.fillRect(-d.w / 2, -d.h / 2, d.w, d.h);
      ctx.restore();
    }

    // Draw particles
    for (var pi = 0; pi < particles.length; pi++) {
      var p = particles[pi];
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = 'hsla(' + p.hue + ',90%,75%,1)';
      ctx.shadowColor = 'hsl(' + p.hue + ',90%,75%)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw perfect text on canvas
    if (perfectTextAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = perfectTextAlpha;
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#6ee7f7';
      ctx.shadowColor = '#6ee7f7';
      ctx.shadowBlur = 16;
      ctx.fillText('PERFECT!', W / 2, perfectTextY);
      ctx.restore();
    }
  }

  function drawIdle() {
    ctx.clearRect(0, 0, W, H);
    var bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#07080f');
    bgGrad.addColorStop(1, '#0d1020');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
  }

  function loop(ts) {
    var dt = Math.min((ts - lastTime) / 16.67, 3);
    lastTime = ts;

    if (state === 'playing') {
      currentBlock.x += currentBlock.goingRight
        ? currentBlock.speed * dt
        : -currentBlock.speed * dt;

      if (currentBlock.goingRight && currentBlock.x > W + 10) {
        currentBlock.x = W + 10;
        currentBlock.goingRight = false;
      } else if (!currentBlock.goingRight && currentBlock.x + currentBlock.w < -10) {
        currentBlock.x = -currentBlock.w - 10;
        currentBlock.goingRight = true;
      }
    }

    cameraY += (targetCameraY - cameraY) * 0.1 * dt;

    // Update debris
    for (var i = debris.length - 1; i >= 0; i--) {
      var d = debris[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += d.gravity * dt;
      d.rot += d.rotV * dt;
      d.alpha -= 0.018 * dt;
      if (d.alpha <= 0) debris.splice(i, 1);
    }

    // Update particles
    for (var j = particles.length - 1; j >= 0; j--) {
      var p = particles[j];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.alpha -= 0.022 * dt;
      p.size *= 0.985;
      if (p.alpha <= 0) particles.splice(j, 1);
    }

    // Update perfect text fade
    if (perfectTextTimer > 0) {
      perfectTextTimer -= dt;
      perfectTextY -= 0.3 * dt;
      if (perfectTextTimer <= 20) {
        perfectTextAlpha = Math.max(0, perfectTextTimer / 20);
      }
    } else {
      perfectTextAlpha = 0;
    }

    draw();
    animId = adapter.requestAnimationFrame(loop);
  }

  function handleAction() {
    if (state === 'playing') {
      dropBlock();
    }
  }

  // Register event listeners via adapter
  adapter.addEventListener('tap', handleAction);

  function start() {
    _initGameState();
    state = 'playing';
    lastTime = 0;
    if (animId) adapter.cancelAnimationFrame(animId);

    adapter.updateHUD({
      gameState: 'playing',
      score: 0,
      bestScore: bestScore,
      layers: 1,
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
    adapter.removeEventListener('tap', handleAction);
  }

  // Draw idle background immediately
  drawIdle();

  return { start: start, destroy: destroy };
}

module.exports = { initGame: initGame };
