var game = require('./game');

Page({
  data: {
    gameState: 'idle',
    score: 0,
    best: 0,
    lives: 3,
    livesStr: '♥♥♥',
    combo: '',
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
      title: '我在水果忍者得了' + this.data.score + '分，你能超过我吗？',
      path: '/packages/pkg-arcade/fruit/index'
    };
  },

  onUnload: function () {
    if (this._game) {
      this._game.destroy();
    }
  }
});
