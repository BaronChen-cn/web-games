var game = require('./game');

Page({
  data: {
    gameState: 'idle',
    score: 0,
    bestScore: 0,
    level: 1,
    lives: 3,
    isNewRecord: false
  },

  _game: null,
  _adapter: null,

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

  onNextLevel: function () {
    if (this._game) {
      this._game.nextLevel();
    }
  },

  onPause: function () {
    if (this._game) {
      this._game.togglePause();
    }
  },

  onResume: function () {
    if (this._game) {
      this._game.togglePause();
    }
  },

  onShareAppMessage: function () {
    return {
      title: '我在打砖块得了' + this.data.score + '分，第' + this.data.level + '关，你能超过我吗？',
      path: '/packages/pkg-arcade/breakout/index'
    };
  },

  onUnload: function () {
    if (this._game) {
      this._game.destroy();
      this._game = null;
    }
  }
});
