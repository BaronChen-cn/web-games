var game = require('./game');

Page({
  data: {
    gameState: 'idle',
    score: 0,
    bestScore: 0,
    sessionBest: 0,
    isNewRecord: false
  },

  _game: null,

  onCanvasReady: function (e) {
    this._adapter = e.detail.adapter;
    // initGame starts the idle animation (bird bobbing)
    this._game = game.initGame(this._adapter);
  },

  onStartGame: function () {
    if (!this._adapter) return;

    if (!this._game) {
      this._game = game.initGame(this._adapter);
    }

    this._game.start();
    this.setData({ gameState: 'playing' });
  },

  onShareAppMessage: function () {
    return {
      title: '我在 Flappy Bird 得了' + this.data.score + '分，你能超过我吗？',
      path: '/packages/pkg-arcade/flappy/index'
    };
  },

  onUnload: function () {
    if (this._game) {
      this._game.destroy();
      this._game = null;
    }
  }
});
