var adManager = require('../../lib/ad-manager');
var getAdManager = adManager.getAdManager;

var ALL_GAMES = [
  { id: 'stack',    name: '叠叠乐',       emoji: '📦', category: 'casual',   package: 'pkg-casual',   gradientFrom: '#1e1e5a', gradientTo: '#0d0d2a' },
  { id: 'snake',    name: '贪吃蛇',       emoji: '🐍', category: 'casual',   package: 'pkg-casual',   gradientFrom: '#1e3a5f', gradientTo: '#0d1b2a' },
  { id: 'tetris',   name: '俄罗斯方块',   emoji: '🧱', category: 'casual',   package: 'pkg-casual',   gradientFrom: '#3b1f4e', gradientTo: '#1a0d2e' },
  { id: 'match3',   name: '消消乐',       emoji: '💎', category: 'casual',   package: 'pkg-casual',   gradientFrom: '#4a1e4a', gradientTo: '#2a0d2a' },
  { id: '2048',     name: '2048',          emoji: '🔢', category: 'casual',   package: 'pkg-casual',   gradientFrom: '#4a3000', gradientTo: '#2a1a00' },
  { id: 'flappy',   name: 'Flappy Bird',   emoji: '🐦', category: 'arcade',   package: 'pkg-arcade',   gradientFrom: '#4a3000', gradientTo: '#2a1a00' },
  { id: 'fruit',    name: '切水果',       emoji: '🍎', category: 'arcade',   package: 'pkg-arcade',   gradientFrom: '#5a1e1e', gradientTo: '#2a0d0d' },
  { id: 'breakout', name: '打砖块',       emoji: '🎯', category: 'arcade',   package: 'pkg-arcade',   gradientFrom: '#1e3a1e', gradientTo: '#0d2a0d' },
  { id: 'pvz',      name: '植物守卫战',   emoji: '🌻', category: 'strategy', package: 'pkg-strategy', gradientFrom: '#1e3a1e', gradientTo: '#0d2a0d' }
];

var CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'casual', label: '休闲' },
  { key: 'arcade', label: '街机' },
  { key: 'strategy', label: '策略' }
];

Page({
  data: {
    categories: CATEGORIES,
    activeCategory: 'all',
    searchText: '',
    hotGames: [],
    filteredGames: ALL_GAMES,
    allGames: ALL_GAMES,
    showAd: false
  },

  onLoad: function () {
    var shuffled = ALL_GAMES.slice().sort(function () { return Math.random() - 0.5; });
    this.setData({ hotGames: shuffled.slice(0, 3) });
  },

  onShow: function () {
    getAdManager().showBanner();
  },

  onHide: function () {
    getAdManager().hideBanner();
  },

  onCategoryTap: function (e) {
    var key = e.currentTarget.dataset.key;
    var filtered = key === 'all'
      ? ALL_GAMES
      : ALL_GAMES.filter(function (g) { return g.category === key; });
    this.setData({ activeCategory: key, filteredGames: filtered });
  },

  onSearch: function (e) {
    var text = e.detail.value.toLowerCase();
    var filtered = text
      ? ALL_GAMES.filter(function (g) { return g.name.toLowerCase().indexOf(text) !== -1 || g.id.indexOf(text) !== -1; })
      : ALL_GAMES;
    this.setData({ searchText: text, filteredGames: filtered });
  },

  onGameTap: function (e) {
    var id = e.currentTarget.dataset.id;
    var game = ALL_GAMES.find(function (g) { return g.id === id; });
    if (!game) return;
    wx.navigateTo({
      url: '/packages/' + game.package + '/' + id + '/index'
    });
  },

  onAdError: function () {},

  onShareAppMessage: function () {
    return {
      title: '超好玩的经典游戏合集，快来挑战！',
      path: '/pages/home/home'
    };
  }
});
