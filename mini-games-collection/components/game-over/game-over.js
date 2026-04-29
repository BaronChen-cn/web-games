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
  methods: {
    onRetry() { this.triggerEvent('retry'); },
    onRank() { this.triggerEvent('rank'); },
    onHome() { wx.navigateBack({ delta: 1 }); }
  }
});
