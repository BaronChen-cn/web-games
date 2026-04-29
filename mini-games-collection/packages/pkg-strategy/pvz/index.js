var game = require('./game');

Page({
  data: {
    sunCount: 300,
    cards: [],
    waveProgress: 0,
    waveLabel: '第1波 / 5波',
    levelLabel: '第1关',
    livesArray: [1, 2, 3],
    overlayType: 'menu',
    currentLevel: 0,
    score: 0
  },

  _game: null,

  onCanvasReady: function (e) {
    this._adapter = e.detail.adapter;
    this._game = game.initGame(this._adapter);
    this._game.start();
  },

  onCardTap: function (e) {
    if (!this._game) return;
    var id = e.currentTarget.dataset.id;
    this._game.selectPlant(id);
  },

  onStartGame: function () {
    if (!this._game) return;
    this._game.startFromMenu();
  },

  onNextLevel: function () {
    if (!this._game) return;
    this._game.nextLevel();
  },

  onRetry: function () {
    if (!this._game) return;
    this._game.retryLevel();
  },

  onBackToMenu: function () {
    if (!this._game) return;
    this._game.goToMenu();
  },

  onShareAppMessage: function () {
    return {
      title: '植物守卫战 - 我通关了第' + (this.data.currentLevel + 1) + '关！',
      path: '/packages/pkg-strategy/pvz/index'
    };
  },

  onUnload: function () {
    if (this._game) {
      this._game.destroy();
    }
  }
});
