// shared/storage.js

class GameStorage {
  constructor(namespace) {
    this._ns = namespace;
  }
  _key(k) { return `wg_${this._ns}_${k}`; }
  get(key, def = null) {
    const v = localStorage.getItem(this._key(key));
    return v === null ? def : JSON.parse(v);
  }
  set(key, value) {
    localStorage.setItem(this._key(key), JSON.stringify(value));
  }
  /**
   * 更新最佳记录
   * @param {string} key
   * @param {number} value
   * @param {boolean} lowerIsBetter - true=越小越好（时间/步数），false=越大越好（分数）
   * @returns {boolean} 是否创造新纪录
   */
  updateBest(key, value, lowerIsBetter = true) {
    const prev = this.get(key, null);
    if (prev === null || (lowerIsBetter ? value < prev : value > prev)) {
      this.set(key, value);
      return true;
    }
    return false;
  }
  getBest(key) { return this.get(key, null); }
}
