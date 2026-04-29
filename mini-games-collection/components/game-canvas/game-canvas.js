const { createGameAdapter } = require('../../lib/adapter');

Component({
  properties: {
    logicalWidth: { type: Number, value: 0 },
    logicalHeight: { type: Number, value: 0 }
  },

  data: {
    canvasWidth: 375,
    canvasHeight: 600
  },

  lifetimes: {
    attached() {
      const app = getApp();
      const sysInfo = app.globalData.systemInfo;
      const dpr = sysInfo.pixelRatio;

      let w = this.properties.logicalWidth || sysInfo.windowWidth;
      let h = this.properties.logicalHeight || sysInfo.windowHeight;

      this.setData({ canvasWidth: w, canvasHeight: h });

      wx.nextTick(() => {
        const query = this.createSelectorQuery();
        query.select('#gameCanvas')
          .fields({ node: true, size: true })
          .exec((res) => {
            if (!res || !res[0] || !res[0].node) return;

            const canvas = res[0].node;
            const ctx = canvas.getContext('2d');

            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.scale(dpr, dpr);

            this._canvas = canvas;
            this._ctx = ctx;

            const page = this._getPage();
            const adapter = createGameAdapter(canvas, ctx, page);
            this._adapter = adapter;

            this.triggerEvent('ready', { canvas, ctx, adapter });
          });
      });
    },

    detached() {
      if (this._adapter) {
        this._adapter.destroy();
      }
    }
  },

  methods: {
    _getPage() {
      let page = this;
      while (page && !page.route) {
        page = page.selectOwnerComponent ? page.selectOwnerComponent() : null;
      }
      if (!page || !page.route) {
        const pages = getCurrentPages();
        page = pages[pages.length - 1];
      }
      return page;
    },

    onTouchStart(e) {
      if (this._adapter) this._adapter.handleTouchStart(e);
    },

    onTouchMove(e) {
      if (this._adapter) this._adapter.handleTouchMove(e);
    },

    onTouchEnd(e) {
      if (this._adapter) this._adapter.handleTouchEnd(e);
    }
  }
});
