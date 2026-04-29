var storage = require('../../../lib/storage');

function initGame(adapter) {
  var ctx = adapter.ctx;
  var W = adapter.width;
  var H = adapter.height;

  // roundRect polyfill
  if (!ctx.roundRect) {
    ctx.roundRect = function (x, y, w, h, radii) {
      var r = typeof radii === 'number' ? radii : (radii && radii[0]) || 0;
      r = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };
  }

  // ─── Constants ───────────────────────────────────────────────────────────────
  var COLS = 8, ROWS = 8;
  var GEM_TYPES = 6;
  var NONE = -1;
  var SPECIAL_NONE = 0;
  var SPECIAL_STRIPE_H = 1;
  var SPECIAL_STRIPE_V = 2;
  var SPECIAL_BOMB = 3;
  var SPECIAL_RAINBOW = 4;

  var GEM_COLORS = [
    { fill: '#ff3355', glow: 'rgba(255,51,85,0.7)' },
    { fill: '#ff8c00', glow: 'rgba(255,140,0,0.7)' },
    { fill: '#ffd700', glow: 'rgba(255,215,0,0.7)' },
    { fill: '#39ff14', glow: 'rgba(57,255,20,0.7)' },
    { fill: '#4488ff', glow: 'rgba(68,136,255,0.7)' },
    { fill: '#bf00ff', glow: 'rgba(191,0,255,0.7)' }
  ];

  var ANIM_SWAP = 180;
  var ANIM_MATCH = 280;
  var ANIM_FALL = 220;
  var ANIM_SPAWN = 180;

  var STATE_IDLE = 'IDLE';
  var STATE_SWAP = 'SWAP';
  var STATE_MATCH = 'MATCH';
  var STATE_FALL = 'FALL';
  var STATE_SPAWN = 'SPAWN';

  // ─── Sizing ──────────────────────────────────────────────────────────────────
  var CELL, PADDING, BOARD_SIZE;

  function computeSize() {
    var avail = Math.min(W, H) - 8;
    CELL = Math.floor((avail - 16) / COLS);
    PADDING = Math.floor((Math.min(W, H) - CELL * COLS) / 2);
    BOARD_SIZE = CELL * COLS + PADDING * 2;
  }

  // ─── Game state ──────────────────────────────────────────────────────────────
  var grid = [];
  var selected = null;
  var score = 0;
  var level = 1;
  var moves = 20;
  var targetScore = 1000;
  var highScore = parseInt(storage.getItem('match3_best') || '0', 10);
  var gameActive = false;
  var animState = STATE_IDLE;

  var visualGems = [];

  var swapData = null;
  var matchData = null;
  var fallData = null;
  var spawnData = null;
  var cascadeCount = 0;

  var particles = [];
  var scorePopups = [];

  var animStartTime = 0;
  var animCallback = null;

  var _pendingSpecials = null;

  var animId = null;
  var lastTime = 0;
  var rainbowHue = 0;

  // Touch state
  var touchStart = null;

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { return 1 - (1 - t) * (1 - t); }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function cellCenter(r, c) {
    return {
      x: PADDING + c * CELL + CELL / 2,
      y: PADDING + r * CELL + CELL / 2
    };
  }

  function makeCellVisual(r, c) {
    var pos = cellCenter(r, c);
    return { x: pos.x, y: pos.y, scale: 1, alpha: 1, offsetX: 0, offsetY: 0 };
  }

  function initVisuals() {
    visualGems = [];
    for (var r = 0; r < ROWS; r++) {
      visualGems[r] = [];
      for (var c = 0; c < COLS; c++) {
        visualGems[r][c] = makeCellVisual(r, c);
      }
    }
  }

  // ─── Grid initialization ─────────────────────────────────────────────────────
  function randomType() { return Math.floor(Math.random() * GEM_TYPES); }

  function makeGem(type, special) {
    return { type: type, special: special || SPECIAL_NONE };
  }

  function hasMatchAt(g, r, c) {
    var t = g[r][c].type;
    if (t === NONE) return false;
    if (c >= 2 && g[r][c - 1].type === t && g[r][c - 2].type === t) return true;
    if (c >= 1 && c < COLS - 1 && g[r][c - 1].type === t && g[r][c + 1] && g[r][c + 1].type === t) return true;
    if (c < COLS - 2 && g[r][c + 1] && g[r][c + 1].type === t && g[r][c + 2] && g[r][c + 2].type === t) return true;
    if (r >= 2 && g[r - 1][c].type === t && g[r - 2][c].type === t) return true;
    if (r >= 1 && r < ROWS - 1 && g[r - 1][c].type === t && g[r + 1] && g[r + 1][c] && g[r + 1][c].type === t) return true;
    if (r < ROWS - 2 && g[r + 1] && g[r + 1][c] && g[r + 1][c].type === t && g[r + 2] && g[r + 2][c] && g[r + 2][c].type === t) return true;
    return false;
  }

  function buildGrid() {
    var g = [];
    for (var r = 0; r < ROWS; r++) {
      g[r] = [];
      for (var c = 0; c < COLS; c++) {
        var t;
        var tries = 0;
        do {
          t = randomType();
          g[r][c] = makeGem(t);
          tries++;
        } while (tries < 50 && hasMatchAt(g, r, c));
        g[r][c] = makeGem(t);
      }
    }
    return g;
  }

  function deepCopyGrid(g) {
    return g.map(function (row) {
      return row.map(function (cell) {
        return { type: cell.type, special: cell.special };
      });
    });
  }

  // ─── Match finding ────────────────────────────────────────────────────────────
  function findAllMatches(g) {
    var groups = [];

    for (var r = 0; r < ROWS; r++) {
      var c = 0;
      while (c < COLS) {
        var t = g[r][c].type;
        if (t === NONE) { c++; continue; }
        var len = 1;
        while (c + len < COLS && g[r][c + len].type === t) len++;
        if (len >= 3) {
          var cells = [];
          for (var i = 0; i < len; i++) cells.push({ r: r, c: c + i });
          groups.push({ cells: cells, dir: 'H', len: len });
        }
        c += len;
      }
    }

    for (var c2 = 0; c2 < COLS; c2++) {
      var r2 = 0;
      while (r2 < ROWS) {
        var t2 = g[r2][c2].type;
        if (t2 === NONE) { r2++; continue; }
        var len2 = 1;
        while (r2 + len2 < ROWS && g[r2 + len2][c2].type === t2) len2++;
        if (len2 >= 3) {
          var cells2 = [];
          for (var i2 = 0; i2 < len2; i2++) cells2.push({ r: r2 + i2, c: c2 });
          groups.push({ cells: cells2, dir: 'V', len: len2 });
        }
        r2 += len2;
      }
    }

    return groups;
  }

  function mergeMatchGroups(groups) {
    var cellMap = {};

    groups.forEach(function (g, idx) {
      g.cells.forEach(function (cell) {
        var key = cell.r + ',' + cell.c;
        if (!cellMap[key]) cellMap[key] = [];
        cellMap[key].push(idx);
      });
    });

    var merged = [];
    var used = {};

    groups.forEach(function (g, idx) {
      if (used[idx]) return;
      var linked = {};
      linked[idx] = true;
      g.cells.forEach(function (cell) {
        var key = cell.r + ',' + cell.c;
        (cellMap[key] || []).forEach(function (other) { linked[other] = true; });
      });
      Object.keys(linked).forEach(function (li) {
        if (parseInt(li) === idx) return;
        groups[parseInt(li)].cells.forEach(function (cell) {
          var key = cell.r + ',' + cell.c;
          (cellMap[key] || []).forEach(function (other) { linked[other] = true; });
        });
      });

      var allCells = {};
      var linkedKeys = Object.keys(linked);
      linkedKeys.forEach(function (li) {
        var liIdx = parseInt(li);
        groups[liIdx].cells.forEach(function (cell) {
          allCells[cell.r + ',' + cell.c] = cell;
        });
        used[liIdx] = true;
      });

      var cellList = Object.keys(allCells).map(function (k) { return allCells[k]; });
      var dirs = linkedKeys.map(function (li) { return groups[parseInt(li)].dir; });
      var isLT = dirs.indexOf('H') >= 0 && dirs.indexOf('V') >= 0;
      var maxLen = 0;
      linkedKeys.forEach(function (li) {
        if (groups[parseInt(li)].len > maxLen) maxLen = groups[parseInt(li)].len;
      });

      var mgroups = linkedKeys.map(function (li) { return groups[parseInt(li)]; });
      merged.push({ cells: cellList, isLT: isLT, maxLen: maxLen, groups: mgroups });
    });

    return merged;
  }

  // ─── Valid moves check ───────────────────────────────────────────────────────
  function hasValidMoves(g) {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (c < COLS - 1) {
          var ng = deepCopyGrid(g);
          var tmp = ng[r][c]; ng[r][c] = ng[r][c + 1]; ng[r][c + 1] = tmp;
          if (findAllMatches(ng).length > 0) return true;
        }
        if (r < ROWS - 1) {
          var ng2 = deepCopyGrid(g);
          var tmp2 = ng2[r][c]; ng2[r][c] = ng2[r + 1][c]; ng2[r + 1][c] = tmp2;
          if (findAllMatches(ng2).length > 0) return true;
        }
      }
    }
    return false;
  }

  // ─── Level config ─────────────────────────────────────────────────────────────
  function getLevelMoves(lvl) { return 20 + (lvl - 1) * 2; }
  function getLevelTarget(lvl) { return 1000 * lvl * lvl; }

  // ─── UI updates ───────────────────────────────────────────────────────────────
  function updateUI() {
    adapter.updateHUD({
      gameState: 'playing',
      score: score,
      best: highScore,
      level: level,
      target: targetScore,
      moves: moves,
      showToast: false,
      toastText: ''
    });
  }

  function showLevelToast() {
    adapter.updateHUD({
      showToast: true,
      toastText: '第 ' + level + ' 关！'
    });
    setTimeout(function () {
      adapter.updateHUD({ showToast: false, toastText: '' });
    }, 1800);
  }

  // ─── Start / restart game ─────────────────────────────────────────────────────
  function startGame() {
    score = 0;
    level = 1;
    moves = getLevelMoves(level);
    targetScore = getLevelTarget(level);
    cascadeCount = 0;
    particles = [];
    scorePopups = [];
    selected = null;
    _pendingSpecials = null;
    grid = buildGrid();
    computeSize();
    initVisuals();
    updateUI();
    gameActive = true;
    animState = STATE_IDLE;
  }

  function nextLevel() {
    level++;
    moves = getLevelMoves(level);
    targetScore = getLevelTarget(level);
    cascadeCount = 0;
    particles = [];
    scorePopups = [];
    selected = null;
    _pendingSpecials = null;
    grid = buildGrid();
    computeSize();
    initVisuals();
    animState = STATE_IDLE;
    updateUI();
    showLevelToast();
  }

  // ─── Input handling ───────────────────────────────────────────────────────────
  function getCellFromPos(px, py) {
    var c = Math.floor((px - PADDING) / CELL);
    var r = Math.floor((py - PADDING) / CELL);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
    return { r: r, c: c };
  }

  function isAdjacent(a, b) {
    return (Math.abs(a.r - b.r) + Math.abs(a.c - b.c)) === 1;
  }

  function handleTouchStart(e) {
    if (!gameActive || animState !== STATE_IDLE) return;
    var t = e.touches[0];
    var px = t.x !== undefined ? t.x : t.clientX;
    var py = t.y !== undefined ? t.y : t.clientY;
    touchStart = { px: px, py: py, cell: getCellFromPos(px, py) };
  }

  function handleTouchEnd(e) {
    if (!gameActive || animState !== STATE_IDLE || !touchStart) return;
    var t = e.changedTouches[0];
    var px = t.x !== undefined ? t.x : t.clientX;
    var py = t.y !== undefined ? t.y : t.clientY;
    var dx = px - touchStart.px;
    var dy = py - touchStart.py;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > CELL * 0.35 && touchStart.cell) {
      var dr = 0, dc = 0;
      if (Math.abs(dx) > Math.abs(dy)) dc = dx > 0 ? 1 : -1;
      else dr = dy > 0 ? 1 : -1;
      var target = { r: touchStart.cell.r + dr, c: touchStart.cell.c + dc };
      if (target.r >= 0 && target.r < ROWS && target.c >= 0 && target.c < COLS) {
        selected = touchStart.cell;
        handleSelect(target);
      }
    } else {
      handleSelect(touchStart.cell);
    }
    touchStart = null;
  }

  function handleSelect(cell) {
    if (!cell) { selected = null; return; }

    if (!selected && grid[cell.r][cell.c].special === SPECIAL_RAINBOW) {
      selected = cell;
      return;
    }

    if (selected && grid[selected.r][selected.c].special === SPECIAL_RAINBOW) {
      if (cell.r === selected.r && cell.c === selected.c) {
        selected = null; return;
      }
      var targetType = grid[cell.r][cell.c].type;
      if (targetType !== NONE) {
        doRainbowActivation(selected, targetType);
        selected = null;
        return;
      }
    }

    if (!selected) {
      selected = cell;
      return;
    }

    if (selected.r === cell.r && selected.c === cell.c) {
      selected = null;
      return;
    }

    if (isAdjacent(selected, cell)) {
      attemptSwap(selected, cell);
      selected = null;
    } else {
      selected = cell;
    }
  }

  // ─── Rainbow activation ───────────────────────────────────────────────────────
  function doRainbowActivation(rainbowCell, targetType) {
    if (moves <= 0 && gameActive) return;
    moves--;
    updateUI();

    var toRemove = [];
    toRemove.push({ r: rainbowCell.r, c: rainbowCell.c });
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (grid[r][c].type === targetType) toRemove.push({ r: r, c: c });
      }
    }

    var pts = toRemove.length * 50 + 200;
    score += pts;
    if (score > highScore) {
      highScore = score;
      storage.setItem('match3_best', String(highScore));
    }

    beginMatchAnim(toRemove, pts);
  }

  // ─── Swap logic ───────────────────────────────────────────────────────────────
  function attemptSwap(a, b) {
    var ga = grid[a.r][a.c];
    var gb = grid[b.r][b.c];
    grid[a.r][a.c] = gb;
    grid[b.r][b.c] = ga;

    var isRainbow = ga.special === SPECIAL_RAINBOW || gb.special === SPECIAL_RAINBOW;
    var matches = findAllMatches(grid);

    if (matches.length === 0 && !isRainbow) {
      grid[a.r][a.c] = ga;
      grid[b.r][b.c] = gb;
      beginInvalidSwapAnim(a, b);
      return;
    }

    moves--;
    updateUI();
    cascadeCount = 0;
    beginSwapAnim(a, b, function () {
      if (ga.special === SPECIAL_RAINBOW || gb.special === SPECIAL_RAINBOW) {
        var rainbowPos = ga.special === SPECIAL_RAINBOW ? b : a;
        var coloredPos = ga.special === SPECIAL_RAINBOW ? a : b;
        var coloredType = grid[coloredPos.r][coloredPos.c].type;
        if (coloredType !== NONE) {
          var toRemove = [{ r: rainbowPos.r, c: rainbowPos.c }];
          for (var r = 0; r < ROWS; r++) {
            for (var c = 0; c < COLS; c++) {
              if (grid[r][c].type === coloredType) toRemove.push({ r: r, c: c });
            }
          }
          var pts = toRemove.length * 50 + 200;
          score += pts;
          if (score > highScore) {
            highScore = score;
            storage.setItem('match3_best', String(highScore));
          }
          beginMatchAnim(toRemove, pts);
          return;
        }
      }
      processMatches();
    });
  }

  function processMatches() {
    var groups = findAllMatches(grid);
    if (groups.length === 0) {
      cascadeCount = 0;
      animState = STATE_IDLE;
      checkWinLose();
      return;
    }

    var merged = mergeMatchGroups(groups);
    var multiplier = cascadeCount === 0 ? 1.0 : cascadeCount === 1 ? 1.5 : cascadeCount === 2 ? 2.0 : 2.5;
    cascadeCount++;

    var totalPts = 0;
    var toRemove = {};
    var specials = [];

    merged.forEach(function (m) {
      var cells = m.cells;
      var isLT = m.isLT;
      var maxLen = m.maxLen;
      var mgroups = m.groups;

      cells.forEach(function (cell) { toRemove[cell.r + ',' + cell.c] = cell; });
      var pts = cells.length * 50 * multiplier;

      var createSpecial = null;
      if (isLT) {
        var hGroup = null, vGroup = null;
        for (var gi = 0; gi < mgroups.length; gi++) {
          if (mgroups[gi].dir === 'H') hGroup = mgroups[gi];
          if (mgroups[gi].dir === 'V') vGroup = mgroups[gi];
        }
        if (hGroup && vGroup) {
          var intersection = null;
          for (var hi = 0; hi < hGroup.cells.length; hi++) {
            for (var vi = 0; vi < vGroup.cells.length; vi++) {
              if (hGroup.cells[hi].r === vGroup.cells[vi].r && hGroup.cells[hi].c === vGroup.cells[vi].c) {
                intersection = hGroup.cells[hi];
                break;
              }
            }
            if (intersection) break;
          }
          if (intersection) {
            createSpecial = { r: intersection.r, c: intersection.c, type: grid[intersection.r][intersection.c].type, special: SPECIAL_BOMB };
            pts += 200;
          }
        }
      } else if (maxLen === 5) {
        var centerCell = mgroups[0].cells[Math.floor(mgroups[0].cells.length / 2)];
        createSpecial = { r: centerCell.r, c: centerCell.c, type: grid[centerCell.r][centerCell.c].type, special: SPECIAL_RAINBOW };
        pts += 300;
      } else if (maxLen === 4) {
        var g4 = mgroups[0];
        var centerCell4 = g4.cells[Math.floor(g4.cells.length / 2)];
        var special = g4.dir === 'H' ? SPECIAL_STRIPE_H : SPECIAL_STRIPE_V;
        createSpecial = { r: centerCell4.r, c: centerCell4.c, type: grid[centerCell4.r][centerCell4.c].type, special: special };
        pts += 100;
      }

      if (createSpecial) specials.push(createSpecial);
      totalPts += Math.round(pts);
    });

    // Activate special gems in the match
    var removedKeys = Object.keys(toRemove);
    var extraRemove = {};

    removedKeys.forEach(function (key) {
      var cell = toRemove[key];
      var gem = grid[cell.r][cell.c];
      if (gem.special === SPECIAL_STRIPE_H) {
        for (var cc = 0; cc < COLS; cc++) extraRemove[cell.r + ',' + cc] = { r: cell.r, c: cc };
        totalPts += 200;
      } else if (gem.special === SPECIAL_STRIPE_V) {
        for (var rr = 0; rr < ROWS; rr++) extraRemove[rr + ',' + cell.c] = { r: rr, c: cell.c };
        totalPts += 200;
      } else if (gem.special === SPECIAL_BOMB) {
        for (var dr = -1; dr <= 1; dr++) {
          for (var dc = -1; dc <= 1; dc++) {
            var nr = cell.r + dr, nc = cell.c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
              extraRemove[nr + ',' + nc] = { r: nr, c: nc };
            }
          }
        }
        totalPts += 200;
      }
    });

    Object.keys(extraRemove).forEach(function (key) {
      toRemove[key] = extraRemove[key];
    });

    score += totalPts;
    if (score > highScore) {
      highScore = score;
      storage.setItem('match3_best', String(highScore));
    }
    updateUI();

    var allRemove = Object.keys(toRemove).map(function (k) { return toRemove[k]; });
    var validSpecials = specials.map(function (sp) {
      return { r: sp.r, c: sp.c, type: sp.type, special: sp.special };
    });

    beginMatchAnim(allRemove, totalPts, function () {
      allRemove.forEach(function (cell) {
        grid[cell.r][cell.c] = makeGem(NONE);
      });

      _pendingSpecials = validSpecials;

      beginFallAnim(function () {
        if (_pendingSpecials) {
          _pendingSpecials.forEach(function (sp) {
            grid[sp.r][sp.c] = makeGem(sp.type, sp.special);
            visualGems[sp.r][sp.c] = makeCellVisual(sp.r, sp.c);
          });
          _pendingSpecials = null;
        }
        beginSpawnAnim(function () {
          processMatches();
        });
      });
    });
  }

  // ─── Win/lose check ──────────────────────────────────────────────────────────
  function checkWinLose() {
    if (score >= targetScore) {
      setTimeout(function () { nextLevel(); }, 300);
      return;
    }
    if (moves <= 0) {
      gameActive = false;
      adapter.updateHUD({
        gameState: 'over',
        score: score,
        best: highScore,
        level: level,
        target: targetScore,
        moves: 0,
        isNewRecord: score >= highScore
      });
      return;
    }
    if (!hasValidMoves(grid)) {
      reshuffleBoard();
    }
  }

  function reshuffleBoard() {
    var types = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (grid[r][c].type !== NONE) types.push(grid[r][c].type);
      }
    }
    for (var i = types.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = types[i]; types[i] = types[j]; types[j] = tmp;
    }
    var idx = 0;
    for (var r2 = 0; r2 < ROWS; r2++) {
      for (var c2 = 0; c2 < COLS; c2++) {
        if (grid[r2][c2].type !== NONE) {
          grid[r2][c2] = makeGem(types[idx++]);
        }
      }
    }
    var tries = 0;
    while (!hasValidMoves(grid) && tries < 20) {
      grid = buildGrid();
      tries++;
    }
    initVisuals();
    animState = STATE_IDLE;
  }

  // ─── Animation state machine ─────────────────────────────────────────────────
  function beginInvalidSwapAnim(a, b) {
    animState = STATE_SWAP;
    animStartTime = performance.now();
    var posA = cellCenter(a.r, a.c);
    var posB = cellCenter(b.r, b.c);
    swapData = { a: a, b: b, posA: posA, posB: posB, invalid: true };
    animCallback = null;
  }

  function beginSwapAnim(a, b, cb) {
    animState = STATE_SWAP;
    animStartTime = performance.now();
    var posA = cellCenter(a.r, a.c);
    var posB = cellCenter(b.r, b.c);
    swapData = { a: a, b: b, posA: posA, posB: posB, invalid: false };
    animCallback = cb;
  }

  function beginMatchAnim(cells, pts, cb) {
    animState = STATE_MATCH;
    animStartTime = performance.now();
    matchData = { cells: cells, pts: pts };
    animCallback = cb || null;

    cells.forEach(function (cell) {
      var pos = cellCenter(cell.r, cell.c);
      var gem = grid[cell.r][cell.c];
      if (gem.type === NONE) return;
      var col = GEM_COLORS[gem.type] || GEM_COLORS[0];
      for (var i = 0; i < 8; i++) {
        var angle = (i / 8) * Math.PI * 2;
        var speed = 2 + Math.random() * 3;
        particles.push({
          x: pos.x, y: pos.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: col.fill,
          alpha: 1,
          radius: 3 + Math.random() * 3,
          life: 0, maxLife: 400 + Math.random() * 200
        });
      }
    });

    if (cells.length > 0) {
      var avgR = 0, avgC = 0;
      cells.forEach(function (c) { avgR += c.r; avgC += c.c; });
      avgR /= cells.length;
      avgC /= cells.length;
      var pos = cellCenter(avgR, avgC);
      scorePopups.push({ x: pos.x, y: pos.y, text: '+' + pts, alpha: 1, vy: -1.5, life: 0, maxLife: 900 });
    }
  }

  function beginFallAnim(cb) {
    fallData = [];

    for (var c = 0; c < COLS; c++) {
      var writeRow = ROWS - 1;
      for (var r = ROWS - 1; r >= 0; r--) {
        if (grid[r][c].type !== NONE) {
          if (r !== writeRow) {
            fallData.push({
              fromR: r, fromC: c, toR: writeRow, toC: c,
              gem: { type: grid[r][c].type, special: grid[r][c].special },
              startY: cellCenter(r, c).y,
              endY: cellCenter(writeRow, c).y
            });
            grid[writeRow][c] = { type: grid[r][c].type, special: grid[r][c].special };
            grid[r][c] = makeGem(NONE);
            visualGems[writeRow][c] = { x: visualGems[r][c].x, y: visualGems[r][c].y, scale: visualGems[r][c].scale, alpha: visualGems[r][c].alpha, offsetX: 0, offsetY: 0 };
          }
          writeRow--;
        }
      }
    }

    if (fallData.length === 0) {
      if (cb) cb();
      return;
    }

    animState = STATE_FALL;
    animStartTime = performance.now();
    animCallback = cb;
  }

  function beginSpawnAnim(cb) {
    spawnData = [];

    for (var c = 0; c < COLS; c++) {
      var spawnRow = 0;
      for (var r = 0; r < ROWS; r++) {
        if (grid[r][c].type === NONE) {
          var type = randomType();
          grid[r][c] = makeGem(type);
          var pos = cellCenter(r, c);
          visualGems[r][c] = {
            x: pos.x,
            y: pos.y - (spawnRow + 1) * CELL,
            scale: 1, alpha: 1, offsetX: 0, offsetY: 0
          };
          spawnData.push({ r: r, c: c, startY: pos.y - (spawnRow + 1) * CELL, endY: pos.y });
          spawnRow++;
        } else {
          spawnRow = 0;
        }
      }
    }

    if (spawnData.length === 0) {
      if (cb) cb();
      return;
    }

    animState = STATE_SPAWN;
    animStartTime = performance.now();
    animCallback = cb;
  }

  // ─── Rendering ────────────────────────────────────────────────────────────────
  function drawGem(x, y, type, special, scale, alpha, isSelected) {
    if (type === NONE || scale <= 0 || alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    var s = CELL * 0.72;
    var hs = s / 2;
    var cornerR = CELL * 0.12;

    var fillColor, glowColor;
    if (type >= 0 && type < GEM_COLORS.length) {
      if (special === SPECIAL_RAINBOW) {
        var hue = (rainbowHue + x * 0.5 + y * 0.3) % 360;
        fillColor = 'hsl(' + hue + ', 100%, 65%)';
        glowColor = 'hsla(' + hue + ', 100%, 65%, 0.7)';
      } else {
        fillColor = GEM_COLORS[type].fill;
        glowColor = GEM_COLORS[type].glow;
      }
    } else {
      fillColor = '#ffffff';
      glowColor = 'rgba(255,255,255,0.7)';
    }

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = isSelected ? 20 : 12;

    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.roundRect(-hs, -hs, s, s, cornerR);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.roundRect(-hs * 0.55, -hs * 0.55, s * 0.55, s * 0.55, cornerR * 0.5);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fill();

    ctx.rotate(-Math.PI / 4);

    ctx.beginPath();
    ctx.ellipse(-CELL * 0.14, -CELL * 0.18, CELL * 0.1, CELL * 0.07, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();

    // Special gem indicators
    if (special === SPECIAL_STRIPE_H) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-hs * 0.9, -hs * 0.9, s * 0.9, s * 0.9, cornerR);
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      for (var ly = -hs * 0.6; ly <= hs * 0.6; ly += hs * 0.35) {
        ctx.beginPath();
        ctx.moveTo(-hs * 0.85, ly);
        ctx.lineTo(hs * 0.85, ly);
        ctx.stroke();
      }
      ctx.restore();
    } else if (special === SPECIAL_STRIPE_V) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-hs * 0.9, -hs * 0.9, s * 0.9, s * 0.9, cornerR);
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      for (var lx = -hs * 0.6; lx <= hs * 0.6; lx += hs * 0.35) {
        ctx.beginPath();
        ctx.moveTo(lx, -hs * 0.85);
        ctx.lineTo(lx, hs * 0.85);
        ctx.stroke();
      }
      ctx.restore();
    } else if (special === SPECIAL_BOMB) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2;
      for (var bi = 0; bi < 4; bi++) {
        var ba = (bi / 4) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ba) * CELL * 0.05, Math.sin(ba) * CELL * 0.05);
        ctx.lineTo(Math.cos(ba) * CELL * 0.28, Math.sin(ba) * CELL * 0.28);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, CELL * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fill();
      ctx.restore();
    } else if (special === SPECIAL_RAINBOW) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1.5;
      for (var ri = 0; ri < 6; ri++) {
        var ra = (ri / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ra) * CELL * 0.25, Math.sin(ra) * CELL * 0.25);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (isSelected) {
      ctx.beginPath();
      ctx.arc(0, 0, CELL * 0.42, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  function drawBoard(now) {
    ctx.clearRect(0, 0, W, H);

    // Board background
    ctx.fillStyle = 'rgba(5,0,15,0.9)';
    ctx.beginPath();
    ctx.roundRect(0, 0, BOARD_SIZE, BOARD_SIZE, 8);
    ctx.fill();

    // Grid lines
    ctx.strokeStyle = 'rgba(191,0,255,0.06)';
    ctx.lineWidth = 1;
    for (var r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(PADDING, PADDING + r * CELL);
      ctx.lineTo(PADDING + COLS * CELL, PADDING + r * CELL);
      ctx.stroke();
    }
    for (var c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(PADDING + c * CELL, PADDING);
      ctx.lineTo(PADDING + c * CELL, PADDING + ROWS * CELL);
      ctx.stroke();
    }

    // Particles
    particles.forEach(function (p) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Score popups
    scorePopups.forEach(function (sp) {
      ctx.save();
      ctx.globalAlpha = sp.alpha;
      ctx.font = 'bold ' + Math.floor(CELL * 0.28) + 'px sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = 'rgba(255,215,0,0.8)';
      ctx.shadowBlur = 10;
      ctx.textAlign = 'center';
      ctx.fillText(sp.text, sp.x, sp.y);
      ctx.restore();
    });

    // Gems
    for (var gr = 0; gr < ROWS; gr++) {
      for (var gc = 0; gc < COLS; gc++) {
        var gem = grid[gr][gc];
        if (gem.type === NONE) continue;
        var vis = visualGems[gr][gc];
        var isSel = selected && selected.r === gr && selected.c === gc;
        drawGem(vis.x, vis.y, gem.type, gem.special, vis.scale, vis.alpha, isSel);
      }
    }
  }

  // ─── Main loop ────────────────────────────────────────────────────────────────
  function update(now) {
    var dt = Math.min(now - lastTime, 50);
    lastTime = now;

    rainbowHue = (rainbowHue + dt * 0.2) % 360;

    // Update particles
    particles = particles.filter(function (p) { return p.life < p.maxLife; });
    particles.forEach(function (p) {
      p.life += dt;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.vx *= 0.97;
      p.alpha = 1 - easeOut(p.life / p.maxLife);
    });

    // Update score popups
    scorePopups = scorePopups.filter(function (sp) { return sp.life < sp.maxLife; });
    scorePopups.forEach(function (sp) {
      sp.life += dt;
      sp.y += sp.vy;
      sp.alpha = 1 - (sp.life / sp.maxLife);
    });

    // Animation state
    if (animState === STATE_SWAP && swapData) {
      var t = clamp((now - animStartTime) / ANIM_SWAP, 0, 1);
      var et = easeInOut(t);
      var sd = swapData;

      if (!sd.invalid) {
        visualGems[sd.a.r][sd.a.c].x = lerp(sd.posA.x, sd.posB.x, et);
        visualGems[sd.a.r][sd.a.c].y = lerp(sd.posA.y, sd.posB.y, et);
        visualGems[sd.b.r][sd.b.c].x = lerp(sd.posB.x, sd.posA.x, et);
        visualGems[sd.b.r][sd.b.c].y = lerp(sd.posB.y, sd.posA.y, et);
      } else {
        var bounce = t < 0.5 ? easeOut(t * 2) * 0.4 : easeInOut((1 - t) * 2) * 0.4;
        var bdx = sd.posB.x - sd.posA.x;
        var bdy = sd.posB.y - sd.posA.y;
        visualGems[sd.a.r][sd.a.c].x = sd.posA.x + bdx * bounce;
        visualGems[sd.a.r][sd.a.c].y = sd.posA.y + bdy * bounce;
        visualGems[sd.b.r][sd.b.c].x = sd.posB.x - bdx * bounce;
        visualGems[sd.b.r][sd.b.c].y = sd.posB.y - bdy * bounce;
      }

      if (t >= 1) {
        var p1 = cellCenter(sd.a.r, sd.a.c);
        var p2 = cellCenter(sd.b.r, sd.b.c);
        visualGems[sd.a.r][sd.a.c].x = p1.x; visualGems[sd.a.r][sd.a.c].y = p1.y;
        visualGems[sd.b.r][sd.b.c].x = p2.x; visualGems[sd.b.r][sd.b.c].y = p2.y;
        swapData = null;
        animState = STATE_IDLE;
        if (animCallback) { var cb = animCallback; animCallback = null; cb(); }
      }
    } else if (animState === STATE_MATCH && matchData) {
      var tM = clamp((now - animStartTime) / ANIM_MATCH, 0, 1);

      matchData.cells.forEach(function (cell) {
        var vis = visualGems[cell.r][cell.c];
        if (tM < 0.4) {
          vis.scale = lerp(1, 1.3, tM / 0.4);
        } else {
          vis.scale = lerp(1.3, 0, (tM - 0.4) / 0.6);
        }
        vis.alpha = tM < 0.6 ? 1 : lerp(1, 0, (tM - 0.6) / 0.4);
      });

      if (tM >= 1) {
        matchData.cells.forEach(function (cell) {
          visualGems[cell.r][cell.c].scale = 0;
          visualGems[cell.r][cell.c].alpha = 0;
        });
        matchData = null;
        animState = STATE_IDLE;
        if (animCallback) { var cb2 = animCallback; animCallback = null; cb2(); }
      }
    } else if (animState === STATE_FALL && fallData) {
      var tF = clamp((now - animStartTime) / ANIM_FALL, 0, 1);
      var etF = easeInOut(tF);

      fallData.forEach(function (fd) {
        visualGems[fd.toR][fd.toC].x = cellCenter(fd.toR, fd.toC).x;
        visualGems[fd.toR][fd.toC].y = lerp(fd.startY, fd.endY, etF);
        visualGems[fd.toR][fd.toC].scale = 1;
        visualGems[fd.toR][fd.toC].alpha = 1;
      });

      if (tF >= 1) {
        fallData.forEach(function (fd) {
          var pos = cellCenter(fd.toR, fd.toC);
          visualGems[fd.toR][fd.toC].y = pos.y;
        });
        fallData = null;
        animState = STATE_IDLE;
        if (animCallback) { var cb3 = animCallback; animCallback = null; cb3(); }
      }
    } else if (animState === STATE_SPAWN && spawnData) {
      var tS = clamp((now - animStartTime) / ANIM_SPAWN, 0, 1);
      var etS = easeOut(tS);

      spawnData.forEach(function (sd2) {
        visualGems[sd2.r][sd2.c].y = lerp(sd2.startY, sd2.endY, etS);
        visualGems[sd2.r][sd2.c].scale = 1;
        visualGems[sd2.r][sd2.c].alpha = etS;
      });

      if (tS >= 1) {
        spawnData.forEach(function (sd2) {
          visualGems[sd2.r][sd2.c].y = sd2.endY;
          visualGems[sd2.r][sd2.c].alpha = 1;
        });
        spawnData = null;
        animState = STATE_IDLE;
        if (animCallback) { var cb4 = animCallback; animCallback = null; cb4(); }
      }
    }
  }

  function gameLoop(now) {
    update(now);
    if (gameActive || animState !== STATE_IDLE) {
      drawBoard(now);
    }
    animId = adapter.requestAnimationFrame(gameLoop);
  }

  // ─── Event listeners ─────────────────────────────────────────────────────────
  adapter.addEventListener('touchstart', handleTouchStart);
  adapter.addEventListener('touchend', handleTouchEnd);

  // ─── Public API ──────────────────────────────────────────────────────────────
  function start() {
    startGame();
    lastTime = 0;
    if (animId) adapter.cancelAnimationFrame(animId);

    adapter.updateHUD({
      gameState: 'playing',
      score: 0,
      best: highScore,
      level: 1,
      target: targetScore,
      moves: moves,
      showToast: false,
      toastText: '',
      isNewRecord: false
    });

    animId = adapter.requestAnimationFrame(function firstFrame(ts) {
      lastTime = ts;
      animId = adapter.requestAnimationFrame(gameLoop);
    });
  }

  function destroy() {
    if (animId) adapter.cancelAnimationFrame(animId);
    animId = null;
    gameActive = false;
    adapter.removeEventListener('touchstart', handleTouchStart);
    adapter.removeEventListener('touchend', handleTouchEnd);
  }

  // Draw initial empty board
  computeSize();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(5,0,15,0.9)';
  ctx.fillRect(0, 0, W, H);

  return { start: start, destroy: destroy };
}

module.exports = { initGame: initGame };
