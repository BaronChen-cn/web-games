// shared/utils.js

/** 毫秒转 mm:ss 字符串 */
function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
}

/** Fisher-Yates 原地洗牌，返回数组本身 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 基于字符串种子的简单伪随机数生成器（返回 0~1）
 * 相同种子始终返回相同序列
 */
function seededRandom(seed) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return function () {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
}

/** 计时器：start / stop / reset / getElapsed */
class Timer {
  constructor() { this._start = null; this._elapsed = 0; this._running = false; }
  start() {
    if (this._running) return;
    this._start = Date.now() - this._elapsed;
    this._running = true;
  }
  stop() {
    if (!this._running) return;
    this._elapsed = Date.now() - this._start;
    this._running = false;
  }
  reset() { this._start = null; this._elapsed = 0; this._running = false; }
  getElapsed() {
    return this._running ? Date.now() - this._start : this._elapsed;
  }
}
