var storage = require('../../../lib/storage');

function initGame(adapter) {
  var ctx = adapter.ctx;
  var W = adapter.width;
  var H = adapter.height;

  // ============================================================
  // CONSTANTS
  // ============================================================
  var COLS = 10;
  var ROWS = 20;
  var HIDDEN = 2;

  // Calculate cell size based on canvas dimensions
  var CELL = Math.floor(Math.min((W * 0.55) / COLS, (H * 0.85) / ROWS));

  var boardWidth = COLS * CELL;
  var boardHeight = ROWS * CELL;
  var boardX = Math.floor((W - boardWidth) / 2 - W * 0.05);
  var boardY = Math.floor((H - boardHeight) / 2);

  // Preview cell size for hold/next
  var PREVIEW_CELL = Math.floor(CELL * 0.6);
  var PREVIEW_SIZE = PREVIEW_CELL * 4;

  // Hold area position (top-left)
  var holdX = Math.max(8, boardX - PREVIEW_SIZE - 12);
  var holdY = boardY + 10;

  // Next pieces position (right of board)
  var nextX = boardX + boardWidth + 12;
  var nextY = boardY + 10;

  var COLORS = {
    I: '#00f5ff', O: '#ffd700', T: '#bf00ff',
    S: '#39ff14', Z: '#ff4444', J: '#4488ff', L: '#ff8c00'
  };

  var SPEED_TABLE = [800,720,630,550,470,380,300,220,130,100,80,70,60,50,45,40,35,30,25,20];

  var PIECES = {
    I: [
      [[1,0],[1,1],[1,2],[1,3]],
      [[0,2],[1,2],[2,2],[3,2]],
      [[2,0],[2,1],[2,2],[2,3]],
      [[0,1],[1,1],[2,1],[3,1]]
    ],
    O: [
      [[0,1],[0,2],[1,1],[1,2]],
      [[0,1],[0,2],[1,1],[1,2]],
      [[0,1],[0,2],[1,1],[1,2]],
      [[0,1],[0,2],[1,1],[1,2]]
    ],
    T: [
      [[0,1],[1,0],[1,1],[1,2]],
      [[0,1],[1,1],[1,2],[2,1]],
      [[1,0],[1,1],[1,2],[2,1]],
      [[0,1],[1,0],[1,1],[2,1]]
    ],
    S: [
      [[0,1],[0,2],[1,0],[1,1]],
      [[0,1],[1,1],[1,2],[2,2]],
      [[1,1],[1,2],[2,0],[2,1]],
      [[0,0],[1,0],[1,1],[2,1]]
    ],
    Z: [
      [[0,0],[0,1],[1,1],[1,2]],
      [[0,2],[1,1],[1,2],[2,1]],
      [[1,0],[1,1],[2,1],[2,2]],
      [[0,1],[1,0],[1,1],[2,0]]
    ],
    J: [
      [[0,0],[1,0],[1,1],[1,2]],
      [[0,1],[0,2],[1,1],[2,1]],
      [[1,0],[1,1],[1,2],[2,2]],
      [[0,1],[1,1],[2,0],[2,1]]
    ],
    L: [
      [[0,2],[1,0],[1,1],[1,2]],
      [[0,1],[1,1],[2,1],[2,2]],
      [[1,0],[1,1],[1,2],[2,0]],
      [[0,0],[0,1],[1,1],[2,1]]
    ]
  };

  var KICKS_JLSTZ = {
    '0>1': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '1>0': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    '1>2': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    '2>1': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '2>3': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    '3>2': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '3>0': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '0>3': [[0,0],[1,0],[1,-1],[0,2],[1,2]]
  };

  var KICKS_I = {
    '0>1': [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
    '1>0': [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
    '1>2': [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
    '2>1': [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
    '2>3': [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
    '3>2': [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
    '3>0': [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
    '0>3': [[0,0],[-1,0],[2,0],[-1,-2],[2,1]]
  };

  var PIECE_TYPES = ['I','O','T','S','Z','J','L'];
  var LINE_SCORES = [0, 100, 300, 500, 800];

  // ============================================================
  // GAME STATE
  // ============================================================
  var board, current, ghost, held, nextQueue, bag;
  var score, level, lines, combo, backToBack;
  var gameState;
  var lockTimer, lockResets, lockActive;
  var dasTimer, dasActive, dasDir, arrTimer;
  var dropTimer;
  var lastTime;
  var particles;
  var lineFlashTimer, flashLines;
  var holdUsed;
  var softDropActive;
  var comboText, comboColor, comboAlpha, comboHideTimer;
  var animFrameId;
  var bestScore = parseInt(storage.getItem('tetris_hs') || '0', 10);
  var keysDown = {};
  var paused = false;

  // ============================================================
  // INITIALIZATION
  // ============================================================
  function resetGame() {
    board = [];
    for (var i = 0; i < ROWS + HIDDEN; i++) {
      var row = [];
      for (var j = 0; j < COLS; j++) row.push(null);
      board.push(row);
    }
    bag = [];
    nextQueue = [pickPiece(), pickPiece(), pickPiece(), pickPiece()];
    held = null;
    score = 0; level = 1; lines = 0; combo = -1; backToBack = false;
    lockTimer = 0; lockResets = 0; lockActive = false;
    dasTimer = 0; dasActive = false; dasDir = 0; arrTimer = 0;
    dropTimer = 0;
    particles = [];
    flashLines = [];
    lineFlashTimer = 0;
    holdUsed = false;
    softDropActive = false;
    comboText = ''; comboColor = '#ffd700'; comboAlpha = 0; comboHideTimer = 0;
    gameState = 'playing';
    paused = false;
    spawnPiece();
    updateUI();
  }

  // ============================================================
  // BAG RANDOMIZER
  // ============================================================
  function refillBag() {
    bag = PIECE_TYPES.slice();
    for (var i = bag.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = bag[i]; bag[i] = bag[j]; bag[j] = tmp;
    }
  }

  function pickPiece() {
    if (bag.length === 0) refillBag();
    return bag.pop();
  }

  // ============================================================
  // PIECE MANAGEMENT
  // ============================================================
  function spawnPiece() {
    var type = nextQueue.shift();
    nextQueue.push(pickPiece());
    current = { type: type, rot: 0, row: -1, col: 3 };
    lockTimer = 0; lockResets = 0; lockActive = false;
    holdUsed = false;
    calcGhost();
    if (!isValid(current.type, current.rot, current.row, current.col)) {
      triggerGameOver();
    }
  }

  function getBlocks(type, rot, row, col) {
    var result = [];
    var shape = PIECES[type][rot];
    for (var i = 0; i < shape.length; i++) {
      result.push([row + shape[i][0], col + shape[i][1]]);
    }
    return result;
  }

  function isValid(type, rot, row, col) {
    var blocks = getBlocks(type, rot, row, col);
    for (var i = 0; i < blocks.length; i++) {
      var r = blocks[i][0], c = blocks[i][1];
      if (c < 0 || c >= COLS) return false;
      if (r >= ROWS + HIDDEN) return false;
      if (r >= 0 && board[r][c] !== null) return false;
    }
    return true;
  }

  function calcGhost() {
    var gRow = current.row;
    while (isValid(current.type, current.rot, gRow + 1, current.col)) gRow++;
    ghost = { type: current.type, rot: current.rot, row: gRow, col: current.col };
  }

  // ============================================================
  // MOVEMENT
  // ============================================================
  function moveLeft() {
    if (gameState !== 'playing') return;
    if (isValid(current.type, current.rot, current.row, current.col - 1)) {
      current.col--;
      onMove();
    }
  }

  function moveRight() {
    if (gameState !== 'playing') return;
    if (isValid(current.type, current.rot, current.row, current.col + 1)) {
      current.col++;
      onMove();
    }
  }

  function softDrop() {
    if (gameState !== 'playing') return;
    if (isValid(current.type, current.rot, current.row + 1, current.col)) {
      current.row++;
      score += 1;
      dropTimer = 0;
      lockActive = false;
      lockTimer = 0;
      calcGhost();
    }
  }

  function hardDrop() {
    if (gameState !== 'playing') return;
    var dropped = 0;
    while (isValid(current.type, current.rot, current.row + 1, current.col)) {
      current.row++;
      dropped++;
    }
    score += dropped * 2;
    spawnHardDropParticles();
    lock();
  }

  function onMove() {
    calcGhost();
    if (lockActive && lockResets < 15) {
      lockTimer = 0;
      lockResets++;
    }
  }

  function rotate(dir) {
    if (gameState !== 'playing') return;
    var fromRot = current.rot;
    var toRot = (fromRot + dir + 4) % 4;
    var key = fromRot + '>' + toRot;
    var kicks = current.type === 'I' ? KICKS_I[key] : KICKS_JLSTZ[key];

    if (!kicks) {
      if (isValid(current.type, toRot, current.row, current.col)) {
        current.rot = toRot;
        onMove();
      }
      return;
    }

    for (var i = 0; i < kicks.length; i++) {
      var dx = kicks[i][0], dy = kicks[i][1];
      var newRow = current.row + dy;
      var newCol = current.col + dx;
      if (isValid(current.type, toRot, newRow, newCol)) {
        current.rot = toRot;
        current.row = newRow;
        current.col = newCol;
        onMove();
        return;
      }
    }
  }

  // ============================================================
  // LOCKING & LINE CLEAR
  // ============================================================
  function lock() {
    var blocks = getBlocks(current.type, current.rot, current.row, current.col);
    for (var i = 0; i < blocks.length; i++) {
      var r = blocks[i][0], c = blocks[i][1];
      if (r >= 0) board[r][c] = current.type;
    }

    var full = [];
    for (var r2 = 0; r2 < ROWS + HIDDEN; r2++) {
      var isFull = true;
      for (var c2 = 0; c2 < COLS; c2++) {
        if (board[r2][c2] === null) { isFull = false; break; }
      }
      if (isFull) full.push(r2);
    }

    if (full.length > 0) {
      flashLines = full;
      lineFlashTimer = 220;
      gameState = 'lineclear';
      for (var k = 0; k < full.length; k++) spawnLineClearParticles(full[k]);
    } else {
      combo = -1;
      spawnPiece();
    }
  }

  function clearLines() {
    var count = flashLines.length;
    flashLines.sort(function(a, b) { return b - a; });
    for (var i = 0; i < flashLines.length; i++) {
      board.splice(flashLines[i], 1);
      var emptyRow = [];
      for (var j = 0; j < COLS; j++) emptyRow.push(null);
      board.unshift(emptyRow);
    }
    flashLines = [];

    var isTetris = count === 4;
    var b2bBonus = backToBack && isTetris;
    var pts = LINE_SCORES[count] * level;
    if (b2bBonus) pts = Math.floor(pts * 1.5);
    backToBack = isTetris;

    combo++;
    if (combo > 0) pts += 50 * combo * level;

    score += pts;
    lines += count;
    level = Math.min(Math.floor(lines / 10) + 1, 20);

    if (combo > 0 || count >= 2) showComboText(count, combo, b2bBonus, isTetris);

    updateUI();
    gameState = 'playing';
    spawnPiece();
  }

  function showComboText(count, cmb, b2b, tetris) {
    var text = '', color = '#ffd700';
    if (tetris && b2b)  { text = 'BACK-TO-BACK!'; color = '#00f5ff'; }
    else if (tetris)    { text = 'TETRIS!'; color = '#bf00ff'; }
    else if (count===3) { text = 'TRIPLE!'; color = '#39ff14'; }
    else if (count===2) { text = 'DOUBLE!'; color = '#ff8c00'; }
    if (cmb > 0) text = (text ? text + ' ' : '') + cmb + ' COMBO';
    comboText = text;
    comboColor = color;
    comboAlpha = 1;
    comboHideTimer = 1800;
  }

  // ============================================================
  // HOLD
  // ============================================================
  function doHold() {
    if (gameState !== 'playing' || holdUsed) return;
    holdUsed = true;
    var prev = held;
    held = current.type;
    if (prev === null) {
      spawnPiece();
    } else {
      current = { type: prev, rot: 0, row: -1, col: 3 };
      lockTimer = 0; lockResets = 0; lockActive = false;
      calcGhost();
    }
  }

  // ============================================================
  // PARTICLES
  // ============================================================
  function spawnLineClearParticles(row) {
    var adjustedY = (row - HIDDEN) * CELL + CELL / 2;
    if (adjustedY < 0) return;
    for (var i = 0; i < 12; i++) {
      particles.push({
        x: Math.random() * boardWidth,
        y: adjustedY,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.8) * 5,
        life: 1.0,
        decay: 0.015 + Math.random() * 0.02,
        size: 2 + Math.random() * 3,
        color: 'hsl(' + Math.floor(Math.random() * 360) + ', 100%, 70%)'
      });
    }
  }

  function spawnHardDropParticles() {
    var blocks = getBlocks(current.type, current.rot, current.row, current.col);
    for (var i = 0; i < blocks.length; i++) {
      var r = blocks[i][0], c = blocks[i][1];
      if (r < HIDDEN) continue;
      var x = c * CELL + CELL / 2;
      var y = (r - HIDDEN) * CELL + CELL / 2;
      for (var j = 0; j < 2; j++) {
        particles.push({
          x: x, y: y,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 1) * 3,
          life: 0.8, decay: 0.04,
          size: 1.5 + Math.random() * 2,
          color: COLORS[current.type]
        });
      }
    }
  }

  function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.15;
      p.life -= p.decay;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  // ============================================================
  // DRAWING
  // ============================================================
  function drawBlockCell(x, y, size, type, alpha) {
    if (alpha === undefined) alpha = 1;
    var color = COLORS[type];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    // Highlight top-left
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(x + 1, y + 1, size - 2, 2);
    ctx.fillRect(x + 1, y + 1, 2, size - 2);
    // Shadow bottom-right
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + 1, y + size - 3, size - 2, 2);
    ctx.fillRect(x + size - 3, y + 1, 2, size - 2);
    ctx.restore();
  }

  function drawGhostBlock(x, y, size, type) {
    var color = COLORS[type];
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.08;
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    ctx.restore();
  }

  function drawGrid() {
    ctx.save();
    ctx.strokeStyle = 'rgba(100,50,200,0.1)';
    ctx.lineWidth = 0.5;
    for (var r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(boardX, boardY + r * CELL);
      ctx.lineTo(boardX + boardWidth, boardY + r * CELL);
      ctx.stroke();
    }
    for (var c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(boardX + c * CELL, boardY);
      ctx.lineTo(boardX + c * CELL, boardY + boardHeight);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBoard() {
    // Board background
    ctx.fillStyle = 'rgba(5,0,20,0.95)';
    ctx.fillRect(boardX, boardY, boardWidth, boardHeight);

    // Board border
    ctx.strokeStyle = 'rgba(100,50,200,0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(boardX, boardY, boardWidth, boardHeight);

    drawGrid();

    // Placed blocks
    for (var r = HIDDEN; r < ROWS + HIDDEN; r++) {
      for (var c = 0; c < COLS; c++) {
        if (board[r][c]) {
          var x = boardX + c * CELL;
          var y = boardY + (r - HIDDEN) * CELL;
          var alpha = 1;
          if (gameState === 'lineclear' && flashLines.indexOf(r) >= 0) {
            alpha = 0.4 + 0.6 * Math.abs(Math.sin(Date.now() / 40));
          }
          drawBlockCell(x, y, CELL, board[r][c], alpha);
        }
      }
    }

    // Ghost piece
    if ((gameState === 'playing' || gameState === 'lineclear') && ghost && ghost.row !== current.row) {
      var gBlocks = getBlocks(ghost.type, ghost.rot, ghost.row, ghost.col);
      for (var gi = 0; gi < gBlocks.length; gi++) {
        var gr = gBlocks[gi][0], gc = gBlocks[gi][1];
        if (gr < HIDDEN) continue;
        drawGhostBlock(boardX + gc * CELL, boardY + (gr - HIDDEN) * CELL, CELL, ghost.type);
      }
    }

    // Current piece
    if (gameState === 'playing') {
      var cBlocks = getBlocks(current.type, current.rot, current.row, current.col);
      for (var ci = 0; ci < cBlocks.length; ci++) {
        var cr = cBlocks[ci][0], cc = cBlocks[ci][1];
        if (cr < HIDDEN) continue;
        drawBlockCell(boardX + cc * CELL, boardY + (cr - HIDDEN) * CELL, CELL, current.type);
      }
    }

    // Particles
    for (var pi = 0; pi < particles.length; pi++) {
      var p = particles[pi];
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(boardX + p.x, boardY + p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Combo text
    if (comboAlpha > 0 && comboText) {
      ctx.save();
      ctx.globalAlpha = comboAlpha;
      ctx.font = 'bold ' + Math.max(12, Math.floor(CELL * 0.7)) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = comboColor;
      ctx.fillText(comboText, boardX + boardWidth / 2, boardY + boardHeight * 0.15);
      ctx.restore();
    }
  }

  function drawMiniPiece(x, y, areaW, areaH, type, scale) {
    if (!type) return;
    if (!scale) scale = 1;
    var blocks = PIECES[type][0];
    var minR = 99, maxR = -1, minC = 99, maxC = -1;
    for (var i = 0; i < blocks.length; i++) {
      var br = blocks[i][0], bc = blocks[i][1];
      if (br < minR) minR = br;
      if (br > maxR) maxR = br;
      if (bc < minC) minC = bc;
      if (bc > maxC) maxC = bc;
    }
    var rows = maxR - minR + 1, cols = maxC - minC + 1;
    var cellSize = Math.min(
      (areaW * 0.8 / cols) * scale,
      (areaH * 0.8 / rows) * scale,
      PREVIEW_CELL * scale
    );
    var offX = x + (areaW - cols * cellSize) / 2;
    var offY = y + (areaH - rows * cellSize) / 2;
    for (var j = 0; j < blocks.length; j++) {
      drawBlockCell(
        offX + (blocks[j][1] - minC) * cellSize,
        offY + (blocks[j][0] - minR) * cellSize,
        cellSize, type
      );
    }
  }

  function drawHoldArea() {
    // Label
    ctx.save();
    ctx.font = '10px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('HOLD', holdX + PREVIEW_SIZE / 2, holdY - 4);
    ctx.restore();

    // Background
    ctx.fillStyle = 'rgba(10,5,30,0.7)';
    ctx.fillRect(holdX, holdY, PREVIEW_SIZE, PREVIEW_SIZE);
    ctx.strokeStyle = 'rgba(100,50,200,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(holdX, holdY, PREVIEW_SIZE, PREVIEW_SIZE);

    if (held) {
      drawMiniPiece(holdX, holdY, PREVIEW_SIZE, PREVIEW_SIZE, held, 0.9);
    }
  }

  function drawNextArea() {
    // Label
    ctx.save();
    ctx.font = '10px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('NEXT', nextX + PREVIEW_SIZE / 2, nextY - 4);
    ctx.restore();

    for (var i = 0; i < 3; i++) {
      var ny = nextY + i * (PREVIEW_SIZE + 6);
      ctx.fillStyle = 'rgba(10,5,30,0.7)';
      ctx.fillRect(nextX, ny, PREVIEW_SIZE, PREVIEW_SIZE);
      ctx.strokeStyle = 'rgba(100,50,200,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(nextX, ny, PREVIEW_SIZE, PREVIEW_SIZE);

      if (nextQueue[i]) {
        var sc = i === 0 ? 0.9 : 0.7;
        drawMiniPiece(nextX, ny, PREVIEW_SIZE, PREVIEW_SIZE, nextQueue[i], sc);
      }
    }
  }

  function drawAll() {
    // Clear full canvas
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#07080f';
    ctx.fillRect(0, 0, W, H);

    drawBoard();
    drawHoldArea();
    drawNextArea();
  }

  // ============================================================
  // UI UPDATES
  // ============================================================
  function updateUI() {
    adapter.updateHUD({
      score: score,
      bestScore: Math.max(score, bestScore),
      level: level,
      lines: lines
    });
  }

  // ============================================================
  // GAME OVER
  // ============================================================
  function triggerGameOver() {
    gameState = 'gameover';
    if (animFrameId) adapter.cancelAnimationFrame(animFrameId);
    animFrameId = null;

    var isNewBest = score > bestScore;
    if (isNewBest) {
      bestScore = score;
      storage.setItem('tetris_hs', String(bestScore));
    }

    adapter.updateHUD({
      gameState: 'dead',
      score: score,
      bestScore: bestScore,
      level: level,
      lines: lines,
      isNewRecord: isNewBest
    });
  }

  // ============================================================
  // MAIN LOOP
  // ============================================================
  function gameLoop(ts) {
    animFrameId = adapter.requestAnimationFrame(gameLoop);
    if (!lastTime) { lastTime = ts; return; }
    var dt = Math.min(ts - lastTime, 50);
    lastTime = ts;

    if (gameState === 'playing') {
      // DAS (Delayed Auto Shift)
      if (dasActive && dasDir !== 0) {
        dasTimer += dt;
        if (dasTimer >= 167) {
          arrTimer += dt;
          while (arrTimer >= 33) {
            arrTimer -= 33;
            if (dasDir === -1) moveLeft(); else moveRight();
          }
        }
      }

      // Gravity
      var speed = SPEED_TABLE[Math.min(level - 1, SPEED_TABLE.length - 1)];
      var effSpeed = softDropActive ? Math.min(speed, 50) : speed;
      dropTimer += dt;
      if (dropTimer >= effSpeed) {
        dropTimer -= effSpeed;
        if (isValid(current.type, current.rot, current.row + 1, current.col)) {
          current.row++;
          if (softDropActive) score += 1;
          calcGhost();
          lockActive = false;
          lockTimer = 0;
        } else {
          lockActive = true;
        }
      }

      // Lock delay
      if (lockActive) {
        if (!isValid(current.type, current.rot, current.row + 1, current.col)) {
          lockTimer += dt;
          if (lockTimer >= 500) lock();
        } else {
          lockActive = false;
          lockTimer = 0;
        }
      }

      // Combo fade
      if (comboAlpha > 0) {
        comboHideTimer -= dt;
        if (comboHideTimer <= 0) {
          comboAlpha = 0;
          comboText = '';
        }
      }
    } else if (gameState === 'lineclear') {
      lineFlashTimer -= dt;
      if (lineFlashTimer <= 0) clearLines();
    }

    updateParticles(dt);
    drawAll();
  }

  // ============================================================
  // INPUT HANDLING
  // ============================================================
  function handleKeyDown(e) {
    var code = e.code || e.key;

    // Pause handling
    if (code === 'KeyP' || code === 'Escape') {
      togglePause();
      return;
    }

    if (gameState !== 'playing') return;

    // Prevent DAS re-trigger on repeated keydown
    if ((code === 'ArrowLeft' || code === 'ArrowRight') && keysDown[code]) return;
    keysDown[code] = true;

    switch (code) {
      case 'ArrowLeft':
        moveLeft();
        dasDir = -1; dasTimer = 0; arrTimer = 0; dasActive = true;
        break;
      case 'ArrowRight':
        moveRight();
        dasDir = 1; dasTimer = 0; arrTimer = 0; dasActive = true;
        break;
      case 'ArrowDown':
        softDropActive = true;
        break;
      case 'ArrowUp': case 'KeyX':
        rotate(1);
        break;
      case 'KeyZ':
        rotate(-1);
        break;
      case 'Space':
        hardDrop();
        break;
      case 'KeyC': case 'ShiftLeft': case 'ShiftRight':
        doHold();
        break;
    }
  }

  function handleKeyUp(e) {
    var code = e.code || e.key;
    keysDown[code] = false;

    if (code === 'ArrowLeft' || code === 'ArrowRight') {
      dasActive = false; dasTimer = 0; arrTimer = 0; dasDir = 0;
    }
    if (code === 'ArrowDown') {
      softDropActive = false;
    }
  }

  adapter.addKeyListener('keydown', handleKeyDown);
  adapter.addKeyListener('keyup', handleKeyUp);

  // ============================================================
  // TOUCH GESTURES ON CANVAS
  // ============================================================
  var touchStartX = 0, touchStartY = 0, touchStartTime = 0;
  var touchLastMoveY = 0;
  var touchSoftDropping = false;

  function onTouchStart(e) {
    var t = e.touches ? e.touches[0] : e;
    touchStartX = t.x || t.clientX || 0;
    touchStartY = t.y || t.clientY || 0;
    touchLastMoveY = touchStartY;
    touchStartTime = Date.now();
    touchSoftDropping = false;
  }

  function onTouchMove(e) {
    if (gameState !== 'playing') return;
    var t = e.touches ? e.touches[0] : e;
    var ty = t.y || t.clientY || 0;
    var dy = ty - touchLastMoveY;
    if (dy > CELL * 0.6) {
      softDrop();
      touchLastMoveY = ty;
      touchSoftDropping = true;
    }
  }

  function onTouchEnd(e) {
    if (gameState !== 'playing') return;
    var t = e.changedTouches ? e.changedTouches[0] : e;
    var tx = t.x || t.clientX || 0;
    var ty = t.y || t.clientY || 0;
    var dx = tx - touchStartX;
    var dy = ty - touchStartY;
    var elapsed = Date.now() - touchStartTime;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (touchSoftDropping) return;

    if (dist < 16 && elapsed < 250) {
      rotate(1);
      return;
    }

    var absDx = Math.abs(dx), absDy = Math.abs(dy);
    if (absDx > absDy && absDx > 20) {
      var cells = Math.max(1, Math.min(Math.round(Math.abs(dx) / CELL), COLS));
      for (var i = 0; i < cells; i++) {
        if (dx < 0) moveLeft(); else moveRight();
      }
    } else if (dy < -40 && absDy > absDx) {
      hardDrop();
    }
  }

  adapter.addEventListener('touchstart', onTouchStart);
  adapter.addEventListener('touchmove', onTouchMove);
  adapter.addEventListener('touchend', onTouchEnd);

  // ============================================================
  // PAUSE
  // ============================================================
  function togglePause() {
    if (gameState === 'playing') {
      gameState = 'paused';
      paused = true;
      adapter.updateHUD({ gameState: 'paused' });
    } else if (gameState === 'paused') {
      gameState = 'playing';
      paused = false;
      lastTime = 0;
      adapter.updateHUD({ gameState: 'playing' });
    }
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  function start() {
    resetGame();
    lastTime = 0;
    if (animFrameId) adapter.cancelAnimationFrame(animFrameId);

    adapter.updateHUD({
      gameState: 'playing',
      score: 0,
      bestScore: bestScore,
      level: 1,
      lines: 0,
      isNewRecord: false
    });

    animFrameId = adapter.requestAnimationFrame(gameLoop);
  }

  function destroy() {
    if (animFrameId) adapter.cancelAnimationFrame(animFrameId);
    animFrameId = null;
    adapter.removeKeyListener('keydown', handleKeyDown);
    adapter.removeKeyListener('keyup', handleKeyUp);
    adapter.removeEventListener('touchstart', onTouchStart);
    adapter.removeEventListener('touchmove', onTouchMove);
    adapter.removeEventListener('touchend', onTouchEnd);
  }

  // Draw idle state
  ctx.fillStyle = '#07080f';
  ctx.fillRect(0, 0, W, H);

  return { start: start, destroy: destroy, togglePause: togglePause };
}

module.exports = { initGame: initGame };
