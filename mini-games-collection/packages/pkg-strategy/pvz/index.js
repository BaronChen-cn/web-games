var game = require('./game');
var share = require('../../../lib/share');

Page({
  data: {
    sunCount: 300,
    cards: [],
    waveProgress: 0,
    waveLabel: '第1波 / 5波',
    levelLabel: '第1关',
    livesArray: [1, 2, 3],
    overlayType: 'menu',
    currentLevel: 0,
    score: 0,
    challengeScore: 0,
    showChallenge: false
  },

  _game: null,

  onLoad: function (options) {
    var self = this;
    share.configShare(this, 'pvz', function () { return { level: self.data.currentLevel + 1, score: self.data.score }; });
    var challenge = share.handleShareLanding(options);
    if (challenge.isChallenge) {
      this.setData({ challengeScore: challenge.challengeScore, showChallenge: true });
    }
  },

  onCanvasReady: function (e) {
    this._adapter = e.detail.adapter;
    this._game = game.initGame(this._adapter);
    this._game.start();
  },

  onCardTap: function (e) {
    if (!this._game) return;
    var id = e.currentTarget.dataset.id;
    this._game.selectPlant(id);
  },

  onStartGame: function () {
    if (!this._game) return;
    this._game.startFromMenu();
  },

  onNextLevel: function () {
    if (!this._game) return;
    this._game.nextLevel();
  },

  onRetry: function () {
    if (!this._game) return;
    this._game.retryLevel();
  },

  onBackToMenu: function () {
    if (!this._game) return;
    this._game.goToMenu();
  },

  onUnload: function () {
    if (this._game) {
      this._game.destroy();
    }
  }
});
