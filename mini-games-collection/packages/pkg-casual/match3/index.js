var game = require('./game');

Page({
  data: {
    gameState: 'idle',
    score: 0,
    best: 0,
    level: 1,
    target: 1000,
    moves: 20,
    showToast: false,
    toastText: '',
    isNewRecord: false
  },

  _game: null,

  onCanvasReady: function (e) {
    this._adapter = e.detail.adapter;
  },

  onStartGame: function () {
    if (!this._adapter) return;

    if (this._game) {
      this._game.destroy();
    }

    this._game = game.initGame(this._adapter);
    this._game.start();
  },

  onShareAppMessage: function () {
    return {
      title: '我在消消乐第' + this.data.level + '关得了' + this.data.score + '分，你来挑战！',
      path: '/packages/pkg-casual/match3/index'
    };
  },

  onUnload: function () {
    if (this._game) {
      this._game.destroy();
    }
  }
});
