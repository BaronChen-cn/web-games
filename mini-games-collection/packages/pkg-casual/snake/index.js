var game = require('./game');
var share = require('../../../lib/share');

Page({
  data: {
    gameState: 'idle',
    score: 0,
    bestScore: 0,
    level: 1,
    foodEaten: 0,
    isNewRecord: false,
    pauseBtn: [{ label: '暂停', code: 'KeyP', key: 'p' }],
    challengeScore: 0,
    showChallenge: false
  },

  _game: null,
  _adapter: null,

  onLoad: function (options) {
    var self = this;
    share.configShare(this, 'snake', function () { return self.data; });
    var challenge = share.handleShareLanding(options);
    if (challenge.isChallenge) {
      this.setData({ challengeScore: challenge.challengeScore, showChallenge: true });
    }
  },

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
  },

  onUnload: function () {
    if (this._game) {
      this._game.destroy();
    }
  }
});
