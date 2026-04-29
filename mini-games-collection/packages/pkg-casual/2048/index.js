var game = require('./game');
var share = require('../../../lib/share');

Page({
  data: {
    gameState: 'idle',
    score: 0,
    bestScore: 0,
    isNewRecord: false,
    challengeScore: 0,
    showChallenge: false
  },

  _game: null,
  _adapter: null,

  onLoad: function (options) {
    var self = this;
    share.configShare(this, '2048', function () { return self.data; });
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

  onUnload: function () {
    if (this._game) {
      this._game.destroy();
    }
  }
});
