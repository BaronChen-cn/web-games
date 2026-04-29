var adManager = require('../../lib/ad-manager');

Component({
  properties: {
    visible: { type: Boolean, value: false },
    title: { type: String, value: '游戏结束' },
    score: { type: Number, value: undefined },
    best: { type: Number, value: undefined },
    isNewRecord: { type: Boolean, value: false },
    showShare: { type: Boolean, value: true },
    showRank: { type: Boolean, value: true }
  },
  observers: {
    'visible': function (val) {
      if (val) {
        adManager.getAdManager().showInterstitial();
      }
    }
  },
  methods: {
    onRetry: function () { this.triggerEvent('retry'); },
    onRank: function () { this.triggerEvent('rank'); },
    onHome: function () { wx.navigateBack({ delta: 1 }); }
  }
});
