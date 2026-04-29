var storage = require('../../../lib/storage');

function initGame(adapter) {
  var ctx = adapter.ctx;
  var W = adapter.width;
  var H = adapter.height;

  var GRID = 4;
  var PAD = 10;
  var BOARD_PAD = 16;
  var BOARD_SIZE = Math.min(W, H * 0.7) - BOARD_PAD * 2;
  var CELL = (BOARD_SIZE - PAD * (GRID + 1)) / GRID;
  var BOARD_X = (W - BOARD_SIZE) / 2;
  var BOARD_Y = (H - BOARD_SIZE) / 2 + 30;

  var TILE_COLORS = {
    2:    { bg: '#eee4da', fg: '#776e65' },
    4:    { bg: '#ede0c8', fg: '#776e65' },
    8:    { bg: '#f2b179', fg: '#f9f6f2' },
    16:   { bg: '#f59563', fg: '#f9f6f2' },
    32:   { bg: '#f67c5f', fg: '#f9f6f2' },
    64:   { bg: '#f65e3b', fg: '#f9f6f2' },
    128:  { bg: '#edcf72', fg: '#f9f6f2' },
    256:  { bg: '#edcc61', fg: '#f9f6f2' },
    512:  { bg: '#edc850', fg: '#f9f6f2' },
    1024: { bg: '#edc53f', fg: '#f9f6f2' },
    2048: { bg: '#edc22e', fg: '#f9f6f2' }
  };
  var DEFAULT_TILE = { bg: '#3c3a32', fg: '#f9f6f2' };

  // Game state
  var board = [];
  var score = 0;
  var best = parseInt(storage.getItem('2048_best') || '0', 10);
  var prevBoard = null;
  var prevScore = 0;
  var canUndo = false;
  var won = false;
  var lost = false;
  var continueAfterWin = false;
  var animId = null;

  // Touch state
  var touchStartX = 0;
  var touchStartY = 0;

  // ─── Board Logic ─────────────────────────────────────────────────────────────

  function initBoard() {
    board = [];
    for (var r = 0; r < 4; r++) {
      board.push([0, 0, 0, 0]);
    }
    score = 0;
    prevBoard = null;
    prevScore = 0;
    canUndo = false;
    won = false;
    lost = false;
    continueAfterWin = false;
    spawnTile();
    spawnTile();
  }

  function spawnTile() {
    var empty = [];
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 4; c++) {
        if (board[r][c] === 0) empty.push([r, c]);
      }
    }
    if (empty.length === 0) return null;
    var pos = empty[Math.floor(Math.random() * empty.length)];
    board[pos[0]][pos[1]] = Math.random() < 0.9 ? 2 : 4;
    return pos;
  }

  function slideRow(row) {
    var nums = [];
    for (var i = 0; i < row.length; i++) {
      if (row[i] !== 0) nums.push(row[i]);
    }
    var points = 0;
    for (var i = 0; i < nums.length - 1; i++) {
      if (nums[i] === nums[i + 1]) {
        nums[i] *= 2;
        points += nums[i];
        nums.splice(i + 1, 1);
      }
    }
    while (nums.length < 4) nums.push(0);
    return { newRow: nums, points: points };
  }

  function applyMove(dir) {
    var prev = board.map(function(r) { return r.slice(); });
    var totalPoints = 0;

    if (dir === 'left') {
      for (var r = 0; r < 4; r++) {
        var result = slideRow(board[r]);
        totalPoints += result.points;
        board[r] = result.newRow;
      }
    } else if (dir === 'right') {
      for (var r = 0; r < 4; r++) {
        var rev = board[r].slice().reverse();
        var result = slideRow(rev);
        totalPoints += result.points;
        board[r] = result.newRow.reverse();
      }
    } else if (dir === 'up') {
      for (var c = 0; c < 4; c++) {
        var col = [];
        for (var r = 0; r < 4; r++) col.push(board[r][c]);
        var result = slideRow(col);
        totalPoints += result.points;
        for (var r = 0; r < 4; r++) board[r][c] = result.newRow[r];
      }
    } else if (dir === 'down') {
      for (var c = 0; c < 4; c++) {
        var col = [];
        for (var r = 0; r < 4; r++) col.push(board[r][c]);
        col.reverse();
        var result = slideRow(col);
        totalPoints += result.points;
        var newCol = result.newRow.reverse();
        for (var r = 0; r < 4; r++) board[r][c] = newCol[r];
      }
    }

    var moved = false;
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 4; c++) {
        if (board[r][c] !== prev[r][c]) { moved = true; break; }
      }
      if (moved) break;
    }

    return { moved: moved, points: totalPoints, prev: prev };
  }

  function hasValidMoves() {
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 4; c++) {
        if (board[r][c] === 0) return true;
        if (c < 3 && board[r][c] === board[r][c + 1]) return true;
        if (r < 3 && board[r][c] === board[r + 1][c]) return true;
      }
    }
    return false;
  }

  function hasTile2048() {
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 4; c++) {
        if (board[r][c] >= 2048) return true;
      }
    }
    return false;
  }

  function move(dir) {
    if (lost) return;
    if (won && !continueAfterWin) return;

    var savedBoard = board.map(function(r) { return r.slice(); });
    var savedScore = score;

    var result = applyMove(dir);
    if (!result.moved) return;

    prevBoard = savedBoard;
    prevScore = savedScore;
    canUndo = true;

    score += result.points;
    updateScore();

    spawnTile();

    // Check win
    if (!won && hasTile2048()) {
      won = true;
      if (!continueAfterWin) {
        adapter.updateHUD({
          gameState: 'won',
          score: score,
          bestScore: best
        });
        return;
      }
    }

    // Check lose
    if (!hasValidMoves()) {
      lost = true;
      var isNewBest = score > best;
      if (isNewBest) {
        best = score;
        storage.setItem('2048_best', String(best));
      }
      adapter.updateHUD({
        gameState: 'dead',
        score: score,
        bestScore: best,
        isNewRecord: isNewBest
      });
    }
  }

  function undoMove() {
    if (!canUndo) return;
    board = prevBoard.map(function(r) { return r.slice(); });
    score = prevScore;
    canUndo = false;
    lost = false;
    won = false;
    updateScore();
    adapter.updateHUD({
      gameState: 'playing',
      score: score,
      bestScore: best
    });
  }

  function updateScore() {
    if (score > best) {
      best = score;
      storage.setItem('2048_best', String(best));
    }
    adapter.updateHUD({
      score: score,
      bestScore: best
    });
  }

  // ─── Canvas Rendering ────────────────────────────────────────────────────────

  function roundRect(x, y, w, h, r) {
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

  function getFontSize(val) {
    if (val >= 1024) return 18;
    if (val >= 128) return 22;
    return 28;
  }

  function draw() {
    // Background
    ctx.fillStyle = '#07080f';
    ctx.fillRect(0, 0, W, H);

    // Board background
    ctx.fillStyle = '#1a1b2e';
    roundRect(BOARD_X, BOARD_Y, BOARD_SIZE, BOARD_SIZE, 8);
    ctx.fill();

    // Draw cells
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var x = BOARD_X + PAD + c * (CELL + PAD);
        var y = BOARD_Y + PAD + r * (CELL + PAD);

        // Empty cell background
        ctx.fillStyle = '#2a2b3e';
        roundRect(x, y, CELL, CELL, 4);
        ctx.fill();

        var val = board[r] ? board[r][c] : 0;
        if (val === 0) continue;

        // Tile
        var colors = TILE_COLORS[val] || DEFAULT_TILE;
        ctx.fillStyle = colors.bg;
        roundRect(x, y, CELL, CELL, 4);
        ctx.fill();

        // Tile text
        var fontSize = getFontSize(val);
        ctx.font = 'bold ' + fontSize + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = colors.fg;
        ctx.fillText(String(val), x + CELL / 2, y + CELL / 2);
      }
    }

    // Score display on canvas (above board)
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('SCORE', BOARD_X, BOARD_Y - 26);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(score), BOARD_X, BOARD_Y - 8);

    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('BEST', BOARD_X + BOARD_SIZE, BOARD_Y - 26);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(best), BOARD_X + BOARD_SIZE, BOARD_Y - 8);
  }

  function loop() {
    draw();
    animId = adapter.requestAnimationFrame(loop);
  }

  // ─── Input Handling ──────────────────────────────────────────────────────────

  function onTouchStart(e) {
    var touch = e.changedTouches ? e.changedTouches[0] : (e.touches ? e.touches[0] : null);
    if (!touch) return;
    touchStartX = touch.clientX || touch.x || 0;
    touchStartY = touch.clientY || touch.y || 0;
  }

  function onTouchEnd(e) {
    var touch = e.changedTouches ? e.changedTouches[0] : null;
    if (!touch) return;
    var dx = (touch.clientX || touch.x || 0) - touchStartX;
    var dy = (touch.clientY || touch.y || 0) - touchStartY;
    var minDist = 30;
    if (Math.abs(dx) < minDist && Math.abs(dy) < minDist) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      move(dx > 0 ? 'right' : 'left');
    } else {
      move(dy > 0 ? 'down' : 'up');
    }
  }

  function onKeyDown(e) {
    var code = e.code || e.key;
    if (code === 'ArrowLeft') move('left');
    else if (code === 'ArrowRight') move('right');
    else if (code === 'ArrowUp') move('up');
    else if (code === 'ArrowDown') move('down');
  }

  // Register input handlers
  adapter.addEventListener('touchstart', onTouchStart);
  adapter.addEventListener('touchend', onTouchEnd);
  adapter.addKeyListener('keydown', onKeyDown);

  // ─── Public API ──────────────────────────────────────────────────────────────

  function start() {
    initBoard();
    updateScore();

    adapter.updateHUD({
      gameState: 'playing',
      score: score,
      bestScore: best,
      isNewRecord: false
    });

    if (animId) adapter.cancelAnimationFrame(animId);
    animId = adapter.requestAnimationFrame(loop);
  }

  function undo() {
    undoMove();
  }

  function continueGame() {
    continueAfterWin = true;
    adapter.updateHUD({
      gameState: 'playing',
      score: score,
      bestScore: best
    });
  }

  function destroy() {
    if (animId) adapter.cancelAnimationFrame(animId);
    animId = null;
    adapter.removeEventListener('touchstart', onTouchStart);
    adapter.removeEventListener('touchend', onTouchEnd);
    adapter.removeKeyListener('keydown', onKeyDown);
  }

  // Draw idle state
  ctx.fillStyle = '#07080f';
  ctx.fillRect(0, 0, W, H);

  return { start: start, undo: undo, continueGame: continueGame, destroy: destroy };
}

module.exports = { initGame: initGame };
