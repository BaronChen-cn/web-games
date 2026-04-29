const PREFIX = 'wg_';

const storage = {
  getItem(key) {
    try {
      return wx.getStorageSync(PREFIX + key);
    } catch (e) {
      return null;
    }
  },

  setItem(key, value) {
    try {
      wx.setStorageSync(PREFIX + key, value);
    } catch (e) {}
  },

  removeItem(key) {
    try {
      wx.removeStorageSync(PREFIX + key);
    } catch (e) {}
  }
};

module.exports = storage;
