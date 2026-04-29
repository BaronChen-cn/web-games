var game = require('./game');

Page({
  data: {
    gameState: 'idle',
    score: 0,
    bestScore: 0,
    isNewRecord: false
  },

  _game: null,
  _adapter: null,

  onCanvasReady: function (e) {
    this._adapter = e.detail.adapter;
  },

  onDirection: function (e) {
    var detail = e.detail;
    if (this._adapter) {
      this._adapter.simulateKey(detail.type, detail.code, detail.key);
    }
  },

  onNewGame: function () {
    if (!this._adapter) return;

    if (this._game) {
      this._game.destroy();
    }

    this._game = game.initGame(this._adapter);
    this._game.start();
  },

  onUndo: function () {
    if (this._game) {
      this._game.undo();
    }
  },

  onContinue: function () {
    if (this._game) {
      this._game.continueGame();
    }
  },

  onShareAppMessage: function () {
    return {
      title: '2048得分' + this.data.score + '，来挑战！',
      path: '/packages/pkg-casual/2048/index'
    };
  },

  onUnload: function () {
    if (this._game) {
      this._game.destroy();
    }
  }
});
