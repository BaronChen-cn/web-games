var game = require('./game');

Page({
  data: {
    gameState: 'idle',
    score: 0,
    bestScore: 0,
    level: 1,
    lines: 0,
    isNewRecord: false,
    tetrisButtons: [
      { label: '↻', code: 'ArrowUp', key: 'ArrowUp' },
      { label: '↺', code: 'KeyZ', key: 'z' },
      { label: '⏬', code: 'Space', key: ' ' },
      { label: '⇄', code: 'KeyC', key: 'c' }
    ]
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

  onAction: function (e) {
    var detail = e.detail;
    if (this._adapter) {
      this._adapter.simulateKey(detail.type, detail.code, detail.key);
    }
  },

  onStartGame: function () {
    if (!this._adapter) return;

    if (this._game) {
      this._game.destroy();
    }

    this._game = game.initGame(this._adapter);
    this._game.start();
    this.setData({ gameState: 'playing' });
  },

  onPause: function () {
    if (this._game) {
      this._game.togglePause();
    }
  },

  onShareAppMessage: function () {
    return {
      title: '俄罗斯方块得分' + this.data.score + '，等级' + this.data.level + '，来挑战！',
      path: '/packages/pkg-casual/tetris/index'
    };
  },

  onUnload: function () {
    if (this._game) {
      this._game.destroy();
    }
  }
});
