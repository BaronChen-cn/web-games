class AdManager {
  constructor() {
    this._banner = null;
    this._interstitial = null;
    this._rewarded = null;
    this._playCount = 0;
    this._interstitialCooldown = 3;

    this._adIds = {
      banner: 'adunit-banner-placeholder',
      interstitial: 'adunit-interstitial-placeholder',
      rewarded: 'adunit-rewarded-placeholder'
    };
  }

  showBanner() {
    if (!wx.createBannerAd) return;
    if (this._banner) {
      this._banner.show().catch(() => {});
      return;
    }
    try {
      var sysInfo = wx.getSystemInfoSync();
      this._banner = wx.createBannerAd({
        adUnitId: this._adIds.banner,
        style: {
          left: 0,
          top: sysInfo.windowHeight - 80,
          width: sysInfo.windowWidth
        }
      });
      this._banner.onError(function (err) {
        console.warn('Banner ad error:', err);
      });
      var self = this;
      this._banner.onResize(function (res) {
        self._banner.style.top = sysInfo.windowHeight - res.height;
      });
      this._banner.show().catch(() => {});
    } catch (e) {}
  }

  hideBanner() {
    if (this._banner) {
      this._banner.hide();
    }
  }

  showInterstitial() {
    this._playCount++;
    if (this._playCount % this._interstitialCooldown !== 0) return;
    if (!wx.createInterstitialAd) return;

    try {
      if (!this._interstitial) {
        this._interstitial = wx.createInterstitialAd({
          adUnitId: this._adIds.interstitial
        });
        this._interstitial.onError(function (err) {
          console.warn('Interstitial ad error:', err);
        });
      }
      this._interstitial.show().catch(() => {});
    } catch (e) {}
  }

  showRewarded(onSuccess, onFail) {
    if (!wx.createRewardedVideoAd) {
      if (onFail) onFail('not_supported');
      return;
    }

    try {
      if (!this._rewarded) {
        this._rewarded = wx.createRewardedVideoAd({
          adUnitId: this._adIds.rewarded
        });
      }

      this._rewarded.offClose();
      this._rewarded.onClose(function (res) {
        if (res && res.isEnded) {
          if (onSuccess) onSuccess();
        } else {
          if (onFail) onFail('not_completed');
        }
      });

      var rewarded = this._rewarded;
      rewarded.show().catch(function () {
        rewarded.load().then(function () {
          rewarded.show().catch(function () {
            if (onFail) onFail('load_failed');
          });
        }).catch(function () {
          if (onFail) onFail('load_failed');
        });
      });
    } catch (e) {
      if (onFail) onFail('error');
    }
  }

  destroy() {
    if (this._banner) this._banner.destroy();
    if (this._interstitial) this._interstitial.destroy();
    if (this._rewarded) this._rewarded.destroy();
  }
}

var _instance = null;
function getAdManager() {
  if (!_instance) _instance = new AdManager();
  return _instance;
}

module.exports = { getAdManager };
