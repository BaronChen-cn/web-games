var game = require('./game');
var share = require('../../../lib/share');

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
    isNewRecord: false,
    challengeScore: 0,
    showChallenge: false
  },

  _game: null,

  onLoad: function (options) {
    var self = this;
    share.configShare(this, 'match3', function () { return self.data; });
    var challenge = share.handleShareLanding(options);
    if (challenge.isChallenge) {
      this.setData({ challengeScore: challenge.challengeScore, showChallenge: true });
    }
  },

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

  onUnload: function () {
    if (this._game) {
      this._game.destroy();
    }
  }
});
