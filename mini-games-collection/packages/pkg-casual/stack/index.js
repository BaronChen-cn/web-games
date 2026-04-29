var game = require('./game');

Page({
  data: {
    gameState: 'idle',
    score: 0,
    bestScore: 0,
    layers: 0,
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
      title: '我在叠叠乐叠了' + this.data.layers + '层，你能超过我吗？',
      path: '/packages/pkg-casual/stack/index'
    };
  },

  onUnload: function () {
    if (this._game) {
      this._game.destroy();
    }
  }
});
