var game = require('./game');
var share = require('../../../lib/share');

Page({
  data: {
    gameState: 'idle',
    score: 0,
    bestScore: 0,
    level: 1,
    lives: 3,
    isNewRecord: false,
    challengeScore: 0,
    showChallenge: false
  },

  _game: null,
  _adapter: null,

  onLoad: function (options) {
    var self = this;
    share.configShare(this, 'breakout', function () { return self.data; });
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

  onUnload: function () {
    if (this._game) {
      this._game.destroy();
      this._game = null;
    }
  }
});
