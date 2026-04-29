App({
  onLaunch() {
    const sysInfo = wx.getSystemInfoSync();
    this.globalData.systemInfo = sysInfo;
    this.globalData.screenWidth = sysInfo.windowWidth;
    this.globalData.screenHeight = sysInfo.windowHeight;
    this.globalData.pixelRatio = sysInfo.pixelRatio;
  },
  onShow() {
    this.globalData.playCount = (this.globalData.playCount || 0);
  },
  globalData: {
    systemInfo: null,
    screenWidth: 375,
    screenHeight: 667,
    pixelRatio: 2,
    playCount: 0
  }
});
