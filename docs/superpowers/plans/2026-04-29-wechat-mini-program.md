# H5 游戏合集微信小程序转换 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert 9 H5 Canvas games into a single WeChat Mini Program game collection with ads, friend rankings, and viral sharing.

**Architecture:** Native Mini Program with a lightweight adapter layer (~200 lines) that bridges H5 Canvas API differences. Each game is extracted from its single-file H5 source into a Mini Program subpackage page, receiving a `createGameAdapter()` object instead of direct DOM access. A `game-canvas` component handles Canvas lifecycle, touch event forwarding, and DPR scaling universally.

**Tech Stack:** WeChat Mini Program native (WXML/WXSS/JS), Canvas 2D API, wx.setStorageSync, wx.createBannerAd/RewardedVideoAd/InterstitialAd, Open Data Domain (friend rankings)

**Spec:** `docs/superpowers/specs/2026-04-29-wechat-mini-program-design.md`

---

## File Structure

```
mini-games-collection/
├── app.js                              # Global: onLaunch, onShow, globalData, share defaults
├── app.json                            # Routes, subpackages, window config, permission
├── app.wxss                            # Global dark theme styles
├── project.config.json                 # DevTools project config
├── sitemap.json                        # Mini Program sitemap
│
├── lib/
│   ├── adapter.js                      # createGameAdapter(canvas, ctx, page) → adapter object
│   ├── storage.js                      # localStorage-compatible wrapper over wx.storage
│   ├── ad-manager.js                   # AdManager class: banner/interstitial/rewarded
│   └── share.js                        # configShare(page, gameId, getScore) helper
│
├── components/
│   ├── game-canvas/
│   │   ├── game-canvas.wxml            # <canvas> + touch bindings
│   │   ├── game-canvas.js              # Canvas init, DPR, touch→adapter forwarding
│   │   ├── game-canvas.json            # Component config
│   │   └── game-canvas.wxss            # Full-screen canvas styles
│   ├── game-over/
│   │   ├── game-over.wxml              # Overlay: score, best, retry, share, rank buttons
│   │   ├── game-over.js                # Events: onRetry, onShare, onRank
│   │   ├── game-over.json
│   │   └── game-over.wxss
│   ├── virtual-dpad/
│   │   ├── virtual-dpad.wxml           # D-pad layout (up/down/left/right)
│   │   ├── virtual-dpad.js             # Touch→direction events
│   │   ├── virtual-dpad.json
│   │   └── virtual-dpad.wxss
│   └── virtual-buttons/
│       ├── virtual-buttons.wxml        # Action buttons (A/B configurable)
│       ├── virtual-buttons.js          # Touch→action events
│       ├── virtual-buttons.json
│       └── virtual-buttons.wxss
│
├── pages/
│   └── home/
│       ├── home.wxml                   # Game lobby: search, banner, category tabs, grid
│       ├── home.js                     # Game list data, navigation, ad init
│       ├── home.json
│       └── home.wxss
│
├── packages/
│   ├── pkg-casual/
│   │   ├── stack/
│   │   │   ├── index.wxml              # game-canvas + HUD (score/best/layer) + game-over
│   │   │   ├── index.js                # Page lifecycle, adapter init, game.js bridge
│   │   │   ├── index.json
│   │   │   ├── index.wxss
│   │   │   └── game.js                 # Extracted from stack/index.html <script>
│   │   ├── snake/  (same 5-file pattern)
│   │   ├── tetris/ (same pattern)
│   │   ├── match3/ (same pattern)
│   │   └── 2048/   (game.js is Canvas rewrite, not extraction)
│   ├── pkg-arcade/
│   │   ├── flappy/ (same 5-file pattern)
│   │   ├── fruit/  (same pattern)
│   │   └── breakout/ (same pattern)
│   └── pkg-strategy/
│       └── pvz/
│           ├── index.wxml              # game-canvas + sun counter + card panel + lives
│           ├── index.js
│           ├── index.json
│           ├── index.wxss
│           └── game.js
│
└── open-data/                          # Open Data Domain (isolated context)
    ├── index.js                        # Receives postMessage, renders friend rank via Canvas
    ├── index.json                      # { "openDataContext": true }
    └── data.js                         # getFriendCloudStorage wrapper
```

Each game page follows the same 5-file pattern: `index.wxml` (layout), `index.js` (page lifecycle + adapter bridge), `index.json` (component refs), `index.wxss` (HUD styles), `game.js` (extracted game logic).

---

## Task 1: Mini Program Project Scaffolding

**Files:**
- Create: `mini-games-collection/app.js`
- Create: `mini-games-collection/app.json`
- Create: `mini-games-collection/app.wxss`
- Create: `mini-games-collection/project.config.json`
- Create: `mini-games-collection/sitemap.json`

- [ ] **Step 1: Create project directory**

```bash
mkdir -p mini-games-collection
```

- [ ] **Step 2: Create app.js**

```javascript
// mini-games-collection/app.js
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
```

- [ ] **Step 3: Create app.json**

```json
{
  "pages": [
    "pages/home/home"
  ],
  "subpackages": [
    {
      "root": "packages/pkg-casual",
      "pages": [
        "stack/index",
        "snake/index",
        "tetris/index",
        "match3/index",
        "2048/index"
      ]
    },
    {
      "root": "packages/pkg-arcade",
      "pages": [
        "flappy/index",
        "fruit/index",
        "breakout/index"
      ]
    },
    {
      "root": "packages/pkg-strategy",
      "pages": [
        "pvz/index"
      ]
    }
  ],
  "window": {
    "backgroundTextStyle": "dark",
    "navigationBarBackgroundColor": "#07080f",
    "navigationBarTitleText": "游戏合集",
    "navigationBarTextStyle": "white",
    "backgroundColor": "#07080f"
  },
  "usingComponents": {},
  "permission": {
    "scope.userInfo": {
      "desc": "用于好友排行榜"
    }
  },
  "requiredPrivateInfos": []
}
```

- [ ] **Step 4: Create app.wxss**

```css
/* mini-games-collection/app.wxss */
page {
  background: #07080f;
  color: #e0e0ff;
  font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
  overflow: hidden;
  height: 100%;
}

.hidden { display: none !important; }

.overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(7, 8, 15, 0.92);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.overlay-title {
  font-size: 28px;
  font-weight: 700;
  color: #818cf8;
  margin-bottom: 20px;
}

.btn-primary {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
  border: none;
  border-radius: 25px;
  padding: 14px 48px;
  font-size: 16px;
  font-weight: 600;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #e0e0ff;
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 25px;
  padding: 12px 36px;
  font-size: 14px;
}

.stat-box {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 10px;
  padding: 8px 12px;
  text-align: center;
}

.stat-label {
  font-size: 10px;
  color: #6b7280;
  text-transform: uppercase;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #e0e0ff;
}
```

- [ ] **Step 5: Create project.config.json**

```json
{
  "description": "H5游戏合集微信小程序版",
  "packOptions": {
    "ignore": [],
    "include": []
  },
  "setting": {
    "urlCheck": true,
    "es6": true,
    "enhance": true,
    "postcss": true,
    "preloadBackgroundData": false,
    "minified": true,
    "newFeature": true,
    "autoAudits": false,
    "checkInvalidKey": true,
    "checkSiteMap": true,
    "uploadWithSourceMap": true,
    "babelSetting": {
      "ignore": [],
      "disablePlugins": [],
      "outputPath": ""
    }
  },
  "compileType": "miniprogram",
  "condition": {},
  "libVersion": "3.3.4",
  "appid": "YOUR_APPID_HERE",
  "projectname": "mini-games-collection"
}
```

- [ ] **Step 6: Create sitemap.json**

```json
{
  "rules": [
    { "action": "allow", "page": "*" }
  ]
}
```

- [ ] **Step 7: Verify in DevTools**

Open WeChat DevTools → Import Project → select `mini-games-collection/` directory. Should compile without errors and show a blank page (home page not yet built).

- [ ] **Step 8: Commit**

```bash
git add mini-games-collection/
git commit -m "feat(mini-program): project scaffolding — app config, global styles, subpackage routing"
```

---

## Task 2: Core Adapter Layer (adapter.js)

**Files:**
- Create: `mini-games-collection/lib/adapter.js`

This is the most critical file — it bridges H5 Canvas API differences so game code runs with minimal changes.

- [ ] **Step 1: Create adapter.js**

```javascript
// mini-games-collection/lib/adapter.js

function createGameAdapter(canvasNode, ctx, page) {
  const app = getApp();
  const sysInfo = app.globalData.systemInfo;
  const dpr = sysInfo.pixelRatio;

  // Canvas logical dimensions (set by game-canvas component)
  const width = canvasNode.width / dpr;
  const height = canvasNode.height / dpr;

  // requestAnimationFrame adapter
  let _rafId = 0;
  let _rafRunning = false;

  function requestAnimationFrame(cb) {
    _rafId = canvasNode.requestAnimationFrame(cb);
    _rafRunning = true;
    return _rafId;
  }

  function cancelAnimationFrame(id) {
    if (id) canvasNode.cancelAnimationFrame(id);
    _rafRunning = false;
  }

  // Touch event normalization
  // game-canvas component calls adapter.handleTouchStart/Move/End
  // which forward to registered listeners
  const _listeners = {
    touchstart: [],
    touchmove: [],
    touchend: [],
    tap: []
  };

  function addEventListener(type, fn) {
    if (_listeners[type]) {
      _listeners[type].push(fn);
    }
  }

  function removeEventListener(type, fn) {
    if (_listeners[type]) {
      _listeners[type] = _listeners[type].filter(f => f !== fn);
    }
  }

  function _normalizeTouches(e) {
    // Convert Mini Program touch event to H5-like format
    const touches = (e.touches || []).map(t => ({
      clientX: t.x,
      clientY: t.y,
      x: t.x,
      y: t.y
    }));
    const changedTouches = (e.changedTouches || []).map(t => ({
      clientX: t.x,
      clientY: t.y,
      x: t.x,
      y: t.y
    }));
    return {
      touches,
      changedTouches,
      preventDefault() {},
      stopPropagation() {},
      type: e.type,
      timeStamp: e.timeStamp
    };
  }

  function handleTouchStart(e) {
    const normalized = _normalizeTouches(e);
    _listeners.touchstart.forEach(fn => fn(normalized));
  }

  function handleTouchMove(e) {
    const normalized = _normalizeTouches(e);
    _listeners.touchmove.forEach(fn => fn(normalized));
  }

  function handleTouchEnd(e) {
    const normalized = _normalizeTouches(e);
    _listeners.touchend.forEach(fn => fn(normalized));
    // Also fire tap for simple click-like behavior
    if (normalized.changedTouches.length > 0) {
      _listeners.tap.forEach(fn => fn(normalized));
    }
  }

  // Keyboard event simulation (from virtual d-pad/buttons)
  const _keyListeners = { keydown: [], keyup: [] };

  function addKeyListener(type, fn) {
    if (_keyListeners[type]) _keyListeners[type].push(fn);
  }

  function removeKeyListener(type, fn) {
    if (_keyListeners[type]) {
      _keyListeners[type] = _keyListeners[type].filter(f => f !== fn);
    }
  }

  function simulateKey(type, code, key) {
    const event = { code, key, preventDefault() {} };
    (_keyListeners[type] || []).forEach(fn => fn(event));
  }

  // Page data bridge — games call updateHUD to push data to WXML
  function updateHUD(data) {
    if (page && page.setData) {
      page.setData(data);
    }
  }

  // Cleanup
  function destroy() {
    cancelAnimationFrame(_rafId);
    Object.keys(_listeners).forEach(k => { _listeners[k] = []; });
    Object.keys(_keyListeners).forEach(k => { _keyListeners[k] = []; });
  }

  return {
    canvas: canvasNode,
    ctx,
    width,
    height,
    dpr,
    screenWidth: sysInfo.windowWidth,
    screenHeight: sysInfo.windowHeight,

    // RAF
    requestAnimationFrame,
    cancelAnimationFrame,

    // Touch events (called by game-canvas component)
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,

    // Registered by game code
    addEventListener,
    removeEventListener,

    // Keyboard simulation (from virtual controls)
    addKeyListener,
    removeKeyListener,
    simulateKey,

    // HUD bridge
    updateHUD,

    // Lifecycle
    destroy
  };
}

module.exports = { createGameAdapter };
```

- [ ] **Step 2: Verify module exports**

In DevTools console or a test page, verify `require('../../lib/adapter')` returns an object with `createGameAdapter` function.

- [ ] **Step 3: Commit**

```bash
git add mini-games-collection/lib/adapter.js
git commit -m "feat(mini-program): adapter.js — core H5→Mini Program Canvas API bridge"
```

---

## Task 3: Storage Compatibility Layer (storage.js)

**Files:**
- Create: `mini-games-collection/lib/storage.js`

- [ ] **Step 1: Create storage.js**

```javascript
// mini-games-collection/lib/storage.js

const PREFIX = 'wg_';

const storage = {
  getItem(key) {
    try {
      return wx.getStorageSync(PREFIX + key);
    } catch (e) {
      return null;
    }
  },

  setItem(key, value) {
    try {
      wx.setStorageSync(PREFIX + key, value);
    } catch (e) {
      // Storage full or other error — silently fail
    }
  },

  removeItem(key) {
    try {
      wx.removeStorageSync(PREFIX + key);
    } catch (e) {}
  }
};

module.exports = storage;
```

- [ ] **Step 2: Commit**

```bash
git add mini-games-collection/lib/storage.js
git commit -m "feat(mini-program): storage.js — localStorage-compatible wx.storage wrapper"
```

---

## Task 4: Game Canvas Component

**Files:**
- Create: `mini-games-collection/components/game-canvas/game-canvas.wxml`
- Create: `mini-games-collection/components/game-canvas/game-canvas.js`
- Create: `mini-games-collection/components/game-canvas/game-canvas.json`
- Create: `mini-games-collection/components/game-canvas/game-canvas.wxss`

- [ ] **Step 1: Create game-canvas.json**

```json
{
  "component": true
}
```

- [ ] **Step 2: Create game-canvas.wxml**

```html
<!-- components/game-canvas/game-canvas.wxml -->
<canvas
  type="2d"
  id="gameCanvas"
  style="width: {{canvasWidth}}px; height: {{canvasHeight}}px;"
  bindtouchstart="onTouchStart"
  bindtouchmove="onTouchMove"
  bindtouchend="onTouchEnd"
></canvas>
```

- [ ] **Step 3: Create game-canvas.wxss**

```css
/* components/game-canvas/game-canvas.wxss */
:host {
  display: block;
}

#gameCanvas {
  display: block;
}
```

- [ ] **Step 4: Create game-canvas.js**

```javascript
// components/game-canvas/game-canvas.js
const { createGameAdapter } = require('../../lib/adapter');

Component({
  properties: {
    // Logical width/height — if 0, use full screen
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

      // Wait for layout, then init canvas
      wx.nextTick(() => {
        const query = this.createSelectorQuery();
        query.select('#gameCanvas')
          .fields({ node: true, size: true })
          .exec((res) => {
            if (!res || !res[0] || !res[0].node) return;

            const canvas = res[0].node;
            const ctx = canvas.getContext('2d');

            // Set actual pixel dimensions for HiDPI
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.scale(dpr, dpr);

            this._canvas = canvas;
            this._ctx = ctx;

            // Create adapter and notify parent page
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
      // Fallback: get current page from page stack
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
```

- [ ] **Step 5: Verify component loads**

Create a temporary test page that uses `<game-canvas bind:ready="onCanvasReady" />` and logs the adapter object in `onCanvasReady`. Verify canvas renders and adapter has all expected methods.

- [ ] **Step 6: Commit**

```bash
git add mini-games-collection/components/game-canvas/
git commit -m "feat(mini-program): game-canvas component — universal Canvas container with DPR + touch forwarding"
```

---

## Task 5: Game Over Component

**Files:**
- Create: `mini-games-collection/components/game-over/game-over.wxml`
- Create: `mini-games-collection/components/game-over/game-over.js`
- Create: `mini-games-collection/components/game-over/game-over.json`
- Create: `mini-games-collection/components/game-over/game-over.wxss`

- [ ] **Step 1: Create game-over.json**

```json
{
  "component": true
}
```

- [ ] **Step 2: Create game-over.wxml**

```html
<!-- components/game-over/game-over.wxml -->
<view class="overlay" wx:if="{{visible}}">
  <view class="overlay-card">
    <text class="overlay-title">{{title || '游戏结束'}}</text>

    <view class="score-section">
      <view class="stat-box" wx:if="{{score !== undefined}}">
        <text class="stat-label">得分</text>
        <text class="stat-value">{{score}}</text>
      </view>
      <view class="stat-box" wx:if="{{best !== undefined}}">
        <text class="stat-label">最佳</text>
        <text class="stat-value">{{best}}</text>
      </view>
    </view>

    <view class="new-record" wx:if="{{isNewRecord}}">
      <text>🎉 新纪录!</text>
    </view>

    <view class="btn-group">
      <button class="btn-primary" bindtap="onRetry">再来一局</button>
      <button class="btn-secondary btn-share" open-type="share" wx:if="{{showShare}}">
        挑战好友
      </button>
      <button class="btn-secondary" bindtap="onRank" wx:if="{{showRank}}">
        排行榜
      </button>
      <button class="btn-secondary" bindtap="onHome">返回大厅</button>
    </view>
  </view>
</view>
```

- [ ] **Step 3: Create game-over.wxss**

```css
/* components/game-over/game-over.wxss */
.overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(7, 8, 15, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.overlay-card {
  background: rgba(15, 16, 30, 0.95);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 20px;
  padding: 32px 28px;
  width: 280px;
  text-align: center;
}

.overlay-title {
  font-size: 24px;
  font-weight: 700;
  color: #818cf8;
  display: block;
  margin-bottom: 20px;
}

.score-section {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
}

.score-section .stat-box {
  min-width: 80px;
}

.new-record {
  color: #fbbf24;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.btn-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

.btn-primary, .btn-secondary {
  width: 100%;
  line-height: 1.2;
}

.btn-share {
  background: linear-gradient(135deg, #059669, #10b981);
  color: #fff;
  border-color: transparent;
}
```

- [ ] **Step 4: Create game-over.js**

```javascript
// components/game-over/game-over.js
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
    onRetry() {
      this.triggerEvent('retry');
    },

    onRank() {
      this.triggerEvent('rank');
    },

    onHome() {
      wx.navigateBack({ delta: 1 });
    }
  }
});
```

- [ ] **Step 5: Commit**

```bash
git add mini-games-collection/components/game-over/
git commit -m "feat(mini-program): game-over component — overlay with score, share, rank, retry"
```

---

## Task 6: Virtual D-Pad Component

**Files:**
- Create: `mini-games-collection/components/virtual-dpad/virtual-dpad.wxml`
- Create: `mini-games-collection/components/virtual-dpad/virtual-dpad.js`
- Create: `mini-games-collection/components/virtual-dpad/virtual-dpad.json`
- Create: `mini-games-collection/components/virtual-dpad/virtual-dpad.wxss`

- [ ] **Step 1: Create virtual-dpad.json**

```json
{
  "component": true
}
```

- [ ] **Step 2: Create virtual-dpad.wxml**

```html
<!-- components/virtual-dpad/virtual-dpad.wxml -->
<view class="dpad-container">
  <view class="dpad-row">
    <view class="dpad-btn dpad-up {{activeDir === 'up' ? 'active' : ''}}"
      catchtouchstart="onUp" catchtouchend="onRelease">▲</view>
  </view>
  <view class="dpad-row dpad-middle">
    <view class="dpad-btn dpad-left {{activeDir === 'left' ? 'active' : ''}}"
      catchtouchstart="onLeft" catchtouchend="onRelease">◀</view>
    <view class="dpad-center"></view>
    <view class="dpad-btn dpad-right {{activeDir === 'right' ? 'active' : ''}}"
      catchtouchstart="onRight" catchtouchend="onRelease">▶</view>
  </view>
  <view class="dpad-row">
    <view class="dpad-btn dpad-down {{activeDir === 'down' ? 'active' : ''}}"
      catchtouchstart="onDown" catchtouchend="onRelease">▼</view>
  </view>
</view>
```

- [ ] **Step 3: Create virtual-dpad.wxss**

```css
/* components/virtual-dpad/virtual-dpad.wxss */
.dpad-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  user-select: none;
}

.dpad-row {
  display: flex;
  justify-content: center;
}

.dpad-middle {
  gap: 2px;
}

.dpad-btn {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 8px;
  color: #818cf8;
  font-size: 18px;
}

.dpad-btn.active {
  background: rgba(99, 102, 241, 0.3);
  border-color: #818cf8;
}

.dpad-center {
  width: 52px;
  height: 52px;
}
```

- [ ] **Step 4: Create virtual-dpad.js**

```javascript
// components/virtual-dpad/virtual-dpad.js
const KEY_MAP = {
  up: { code: 'ArrowUp', key: 'ArrowUp' },
  down: { code: 'ArrowDown', key: 'ArrowDown' },
  left: { code: 'ArrowLeft', key: 'ArrowLeft' },
  right: { code: 'ArrowRight', key: 'ArrowRight' }
};

Component({
  data: {
    activeDir: ''
  },

  methods: {
    _press(dir) {
      this.setData({ activeDir: dir });
      const k = KEY_MAP[dir];
      this.triggerEvent('direction', { direction: dir, code: k.code, key: k.key, type: 'keydown' });
    },

    onUp()    { this._press('up'); },
    onDown()  { this._press('down'); },
    onLeft()  { this._press('left'); },
    onRight() { this._press('right'); },

    onRelease() {
      const dir = this.data.activeDir;
      if (dir) {
        const k = KEY_MAP[dir];
        this.triggerEvent('direction', { direction: dir, code: k.code, key: k.key, type: 'keyup' });
      }
      this.setData({ activeDir: '' });
    }
  }
});
```

- [ ] **Step 5: Commit**

```bash
git add mini-games-collection/components/virtual-dpad/
git commit -m "feat(mini-program): virtual-dpad component — touch d-pad emitting arrow key events"
```

---

## Task 7: Virtual Action Buttons Component

**Files:**
- Create: `mini-games-collection/components/virtual-buttons/virtual-buttons.wxml`
- Create: `mini-games-collection/components/virtual-buttons/virtual-buttons.js`
- Create: `mini-games-collection/components/virtual-buttons/virtual-buttons.json`
- Create: `mini-games-collection/components/virtual-buttons/virtual-buttons.wxss`

- [ ] **Step 1: Create virtual-buttons.json**

```json
{
  "component": true
}
```

- [ ] **Step 2: Create virtual-buttons.wxml**

```html
<!-- components/virtual-buttons/virtual-buttons.wxml -->
<view class="action-btns">
  <view wx:for="{{buttons}}" wx:key="label"
    class="action-btn {{item.active ? 'active' : ''}}"
    catchtouchstart="onPress" catchtouchend="onRelease"
    data-index="{{index}}">
    {{item.label}}
  </view>
</view>
```

- [ ] **Step 3: Create virtual-buttons.wxss**

```css
/* components/virtual-buttons/virtual-buttons.wxss */
.action-btns {
  display: flex;
  gap: 12px;
  align-items: center;
}

.action-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  border: 2px solid rgba(99, 102, 241, 0.3);
  color: #818cf8;
  font-size: 14px;
  font-weight: 600;
}

.action-btn.active {
  background: rgba(99, 102, 241, 0.3);
  border-color: #818cf8;
}
```

- [ ] **Step 4: Create virtual-buttons.js**

```javascript
// components/virtual-buttons/virtual-buttons.js
Component({
  properties: {
    // Array of { label, code, key } — e.g. [{ label: 'A', code: 'Space', key: ' ' }]
    config: {
      type: Array,
      value: []
    }
  },

  data: {
    buttons: []
  },

  observers: {
    'config'(val) {
      this.setData({ buttons: val.map(b => ({ ...b, active: false })) });
    }
  },

  methods: {
    onPress(e) {
      const idx = e.currentTarget.dataset.index;
      const btn = this.data.buttons[idx];
      if (!btn) return;
      const buttons = [...this.data.buttons];
      buttons[idx] = { ...btn, active: true };
      this.setData({ buttons });
      this.triggerEvent('action', { ...btn, type: 'keydown' });
    },

    onRelease(e) {
      const idx = e.currentTarget.dataset.index;
      const btn = this.data.buttons[idx];
      if (!btn) return;
      const buttons = [...this.data.buttons];
      buttons[idx] = { ...btn, active: false };
      this.setData({ buttons });
      this.triggerEvent('action', { ...btn, type: 'keyup' });
    }
  }
});
```

- [ ] **Step 5: Commit**

```bash
git add mini-games-collection/components/virtual-buttons/
git commit -m "feat(mini-program): virtual-buttons component — configurable action buttons emitting key events"
```

---

## Task 8: Convert Stack (First Game — Pipeline Validation)

**Files:**
- Create: `mini-games-collection/packages/pkg-casual/stack/index.wxml`
- Create: `mini-games-collection/packages/pkg-casual/stack/index.js`
- Create: `mini-games-collection/packages/pkg-casual/stack/index.json`
- Create: `mini-games-collection/packages/pkg-casual/stack/index.wxss`
- Create: `mini-games-collection/packages/pkg-casual/stack/game.js`
- Source: `stack/index.html` (H5 original)

This is the first game conversion. The pattern established here applies to all subsequent games.

- [ ] **Step 1: Create game.js — extract game logic from stack/index.html**

Open `stack/index.html`, copy the entire content of the `<script>` tag (the IIFE body). Apply these transformations:

1. Remove the IIFE wrapper `(function(){ ... })()`
2. Remove all `document.getElementById(...)` calls
3. Remove all `document.addEventListener(...)` / `canvas.addEventListener(...)` calls
4. Remove the canvas/ctx initialization (`document.getElementById('gameCanvas')`, `.getContext('2d')`)
5. Remove `localStorage` calls — replace with `storage.getItem/setItem`
6. Remove `requestAnimationFrame` / `cancelAnimationFrame` — use `adapter.rAF` / `adapter.cancelRAF`
7. Replace `window.devicePixelRatio` with `adapter.dpr`
8. Replace `canvas.width/height` reads with `adapter.width/height`
9. Replace direct DOM updates (`scoreEl.textContent = ...`) with `adapter.updateHUD({...})`
10. Wrap everything in an `initGame(adapter)` function and export it

The resulting `game.js` structure:

```javascript
// packages/pkg-casual/stack/game.js
const storage = require('../../../lib/storage');

function initGame(adapter) {
  const { canvas, ctx, width: W, height: H, dpr } = adapter;
  const rAF = (cb) => adapter.requestAnimationFrame(cb);
  const cAF = (id) => adapter.cancelAnimationFrame(id);

  // --- All game constants from original (PALETTES, etc.) ---
  // Copy directly from original <script>, no changes needed

  // --- Game state variables ---
  // Copy directly: layers, currentBlock, debris, particles, etc.
  let bestScore = parseInt(storage.getItem('stack_best')) || 0;
  let score = 0;

  // --- Replace resize() function ---
  // No dynamic resize needed — W and H are fixed from adapter
  // Remove the original resize() function and window resize listener
  // ctx.setTransform already handled by game-canvas component (dpr scaling)

  // --- updateScoreUI() → adapter.updateHUD() ---
  function updateScoreUI() {
    adapter.updateHUD({
      score: score,
      bestScore: bestScore,
      layers: layers.length
    });
  }

  // --- Remove overlay DOM manipulation ---
  // showOverlay/hideOverlay → adapter.updateHUD({ gameState: 'idle'|'playing'|'dead' })
  function gameOver() {
    // ... existing game over logic (debris creation, etc.) ...
    if (score > bestScore) {
      bestScore = score;
      storage.setItem('stack_best', String(bestScore));
    }
    adapter.updateHUD({
      gameState: 'dead',
      score: score,
      bestScore: bestScore,
      isNewRecord: score > 0 && score >= bestScore
    });
  }

  // --- Input: register via adapter instead of DOM ---
  adapter.addEventListener('tap', handleAction);
  adapter.addKeyListener('keydown', function(e) {
    if (e.code === 'Space' || e.code === 'Enter') {
      handleAction();
    }
  });

  // --- Keep draw(), loop(), initGame(), spawnBlock(), dropBlock() etc. as-is ---
  // All ctx drawing code (fillRect, arc, stroke etc) works unchanged on Mini Program

  // --- Game loop uses adapter.rAF ---
  let animId;
  function loop(ts) {
    // ... existing loop logic ...
    animId = rAF(loop);
  }

  // --- Start ---
  function startGame() {
    // ... existing init logic ...
    adapter.updateHUD({ gameState: 'playing', score: 0, bestScore, layers: 0 });
    animId = rAF(loop);
  }

  // Draw idle state initially
  adapter.updateHUD({
    gameState: 'idle',
    score: 0,
    bestScore: bestScore,
    layers: 0
  });

  // Return control interface for the page
  return {
    start: startGame,
    destroy() {
      cAF(animId);
      adapter.removeEventListener('tap', handleAction);
    }
  };
}

module.exports = { initGame };
```

**Key principle:** The Canvas 2D drawing code (ctx methods like fillRect, arc, beginPath, stroke, lineTo, save, restore) is identical between H5 and Mini Program. Only the "plumbing" around it changes (event listeners, DOM updates, localStorage, RAF).

- [ ] **Step 2: Create index.json**

```json
{
  "usingComponents": {
    "game-canvas": "/components/game-canvas/game-canvas",
    "game-over": "/components/game-over/game-over"
  },
  "navigationBarTitleText": "叠叠乐"
}
```

- [ ] **Step 3: Create index.wxml**

```html
<!-- packages/pkg-casual/stack/index.wxml -->
<view class="game-page">
  <!-- HUD -->
  <view class="hud" wx:if="{{gameState === 'playing'}}">
    <view class="stat-box">
      <text class="stat-label">分数</text>
      <text class="stat-value">{{score}}</text>
    </view>
    <view class="stat-box">
      <text class="stat-label">最佳</text>
      <text class="stat-value">{{bestScore}}</text>
    </view>
    <view class="stat-box">
      <text class="stat-label">层数</text>
      <text class="stat-value">{{layers}}</text>
    </view>
  </view>

  <!-- Canvas -->
  <game-canvas bind:ready="onCanvasReady" />

  <!-- Start Overlay -->
  <view class="overlay" wx:if="{{gameState === 'idle'}}">
    <text class="overlay-title">叠叠乐</text>
    <text class="overlay-sub">点击屏幕放下方块</text>
    <button class="btn-primary" bindtap="onStartGame">开始游戏</button>
  </view>

  <!-- Game Over -->
  <game-over
    visible="{{gameState === 'dead'}}"
    score="{{score}}"
    best="{{bestScore}}"
    is-new-record="{{isNewRecord}}"
    bind:retry="onStartGame"
  />
</view>
```

- [ ] **Step 4: Create index.wxss**

```css
/* packages/pkg-casual/stack/index.wxss */
.game-page {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.hud {
  position: absolute;
  top: 10px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 16px;
  z-index: 10;
  pointer-events: none;
}

.overlay-sub {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 24px;
}
```

- [ ] **Step 5: Create index.js**

```javascript
// packages/pkg-casual/stack/index.js
const { initGame } = require('./game');

Page({
  data: {
    gameState: 'idle',
    score: 0,
    bestScore: 0,
    layers: 0,
    isNewRecord: false
  },

  _game: null,

  onCanvasReady(e) {
    this._adapter = e.detail.adapter;
  },

  onStartGame() {
    if (!this._adapter) return;

    if (this._game) {
      this._game.destroy();
    }

    this._game = initGame(this._adapter);
    this._game.start();
  },

  onShareAppMessage() {
    return {
      title: `我在叠叠乐叠了${this.data.layers}层，你能超过我吗？`,
      path: '/packages/pkg-casual/stack/index'
    };
  },

  onUnload() {
    if (this._game) {
      this._game.destroy();
    }
  }
});
```

- [ ] **Step 6: Test in DevTools**

1. Open WeChat DevTools
2. Navigate to stack page
3. Verify: canvas renders, start overlay shows, tap starts game, blocks animate, score updates in HUD, game over overlay appears with score
4. Test: share button generates correct card

- [ ] **Step 7: Commit**

```bash
git add mini-games-collection/packages/pkg-casual/stack/
git commit -m "feat(mini-program): convert stack (叠叠乐) — first game, validates full conversion pipeline"
```

---

## Task 9: Convert Flappy Bird

**Files:**
- Create: `mini-games-collection/packages/pkg-arcade/flappy/index.wxml`
- Create: `mini-games-collection/packages/pkg-arcade/flappy/index.js`
- Create: `mini-games-collection/packages/pkg-arcade/flappy/index.json`
- Create: `mini-games-collection/packages/pkg-arcade/flappy/index.wxss`
- Create: `mini-games-collection/packages/pkg-arcade/flappy/game.js`
- Source: `flappy/index.html`

**Conversion notes for Flappy Bird:**
- Input: tap only (same as Stack) — `adapter.addEventListener('tap', flap)`
- Uses `var` throughout — works as-is in Mini Program, no need to convert to let/const
- Internal scaling system (`scale = W / BASE_W`) — keep as-is, just feed adapter.width/height as W/H
- Score also drawn ON canvas (keep), plus HUD (adapter.updateHUD)
- No keyboard dependency needed (tap is sufficient for mobile)

- [ ] **Step 1: Extract game.js from flappy/index.html**

Same extraction pattern as Task 8. Key changes:
- Remove `document.getElementById` for `board`, `boardWrap`, overlays, stats
- Remove `computeSize()` — receive dimensions from adapter
- Remove `window.addEventListener('resize', ...)`
- Replace `localStorage.getItem/setItem(LS_KEY)` with `storage.getItem/setItem('flappy_hs')`
- Replace `requestAnimationFrame(loop)` with `adapter.requestAnimationFrame(loop)`
- Replace `var canvas = ...` / `var ctx = ...` with adapter-provided objects
- `flap()` registered via `adapter.addEventListener('tap', flap)`
- Overlay state changes → `adapter.updateHUD({ gameState, score, highScore })`
- Export: `module.exports = { initGame }` returning `{ start, destroy }`

- [ ] **Step 2: Create page files (index.json, index.wxml, index.wxss, index.js)**

index.json: same pattern as stack, title "Flappy Bird"

index.wxml: same layout as stack — game-canvas + HUD (score/best) + start overlay + game-over

index.js: same pattern as stack's index.js — `onCanvasReady`, `onStartGame`, `onShareAppMessage`

index.wxss: same as stack

- [ ] **Step 3: Test in DevTools** — tap to flap, pipes generate, score counts, game over overlay

- [ ] **Step 4: Commit**

```bash
git add mini-games-collection/packages/pkg-arcade/flappy/
git commit -m "feat(mini-program): convert flappy bird — tap-to-flap, pipe generation, score tracking"
```

---

## Task 10: Convert Fruit Ninja

**Files:** Create 5 files in `mini-games-collection/packages/pkg-arcade/fruit/`
- Source: `fruit/index.html`

**Conversion notes:**
- Input: `touchmove` continuous trail — use `adapter.addEventListener('touchmove', ...)` and `adapter.addEventListener('touchend', ...)`
- No keyboard input needed
- Trail-based slicing works identically with Mini Program touch events
- `Date.now()` for trail timestamps — works in Mini Program
- Frame-count physics (no delta time) — keep as-is
- Lives display + combo display → `adapter.updateHUD({ lives, combo, score, best })`

- [ ] **Step 1: Extract game.js**

Key changes from H5:
- Remove `canvas.addEventListener('mousemove/mouseleave')` — not needed on mobile
- Keep `touchmove` / `touchend` via adapter
- Replace `resizeCanvas()` — use adapter dimensions
- Replace `getBoundingClientRect()` for coordinate transform — adapter touch events already provide canvas-relative coordinates
- Replace `localStorage` with storage module

- [ ] **Step 2: Create page files** — game-canvas + HUD (score/best/lives/combo) + overlays

- [ ] **Step 3: Test** — swipe to slice, fruits split, bombs shake, lives deplete, game over

- [ ] **Step 4: Commit**

```bash
git add mini-games-collection/packages/pkg-arcade/fruit/
git commit -m "feat(mini-program): convert fruit ninja — trail-based slicing, combo system"
```

---

## Task 11: Convert Breakout

**Files:** Create 5 files in `mini-games-collection/packages/pkg-arcade/breakout/`
- Source: `breakout/index.html`

**Conversion notes:**
- Input: `touchmove` for paddle position (follow finger X) + `tap` to launch ball
- Fixed logical size (420x560) with CSS scaling — use adapter dimensions, compute scale internally
- Replace `getCanvasX(clientX)` coordinate transform — adapter touch events already provide canvas coords
- Remove `mousemove` — `touchmove` sufficient on mobile
- Pause via virtual button or overlay (no keyboard P/Escape)
- Level clear overlay → `adapter.updateHUD({ gameState: 'levelclear', level })`
- Lives display → HUD data binding
- Custom `roundRect()` helper — keep as-is (Canvas compatible)

- [ ] **Step 1: Extract game.js** — remove DOM, wire adapter touch for paddle + launch

- [ ] **Step 2: Create page files** — game-canvas + HUD (score/best/level/lives) + start/pause/levelclear/gameover overlays

- [ ] **Step 3: Test** — paddle follows touch, ball bounces, bricks break, power-ups work, level progression

- [ ] **Step 4: Commit**

```bash
git add mini-games-collection/packages/pkg-arcade/breakout/
git commit -m "feat(mini-program): convert breakout — paddle touch control, multi-level, power-ups"
```

---

## Task 12: Convert Snake

**Files:** Create 5 files in `mini-games-collection/packages/pkg-casual/snake/`
- Source: `snake/index.html`

**Conversion notes — first game needing virtual d-pad:**
- Input: virtual d-pad for direction + swipe on canvas as alternative
- D-pad events → `adapter.simulateKey('keydown', 'ArrowUp', 'ArrowUp')` etc.
- Game already has both keyboard AND touch swipe support — keep swipe via adapter touch events, add d-pad via component
- Pause button via virtual-buttons component (single button, code 'KeyP')
- Heavy DOM for dual desktop/mobile stats — all replaced by single HUD via `adapter.updateHUD`
- D-pad button visual feedback (`classList.toggle('pressed')`) handled by component internally
- Interpolation system (prevSegs/lerp) — keep as-is, pure Canvas code

- [ ] **Step 1: Extract game.js**

Key changes:
- Remove all D-pad DOM event wiring (`btn-up/down/left/right` touchstart/touchend)
- Remove overlay DOM manipulation
- Keep swipe detection logic (touchstart/touchend on canvas via adapter)
- Add: `adapter.addKeyListener('keydown', handleKeyDown)` for d-pad simulation
- Replace score/hi/level/food DOM updates with `adapter.updateHUD`

- [ ] **Step 2: Create page files**

index.wxml includes d-pad and pause button:
```html
<view class="game-page">
  <view class="hud">...</view>
  <game-canvas bind:ready="onCanvasReady" />
  <!-- D-pad positioned bottom-left -->
  <view class="controls-left">
    <virtual-dpad bind:direction="onDirection" />
  </view>
  <!-- Pause button bottom-right -->
  <view class="controls-right">
    <virtual-buttons config="{{pauseBtn}}" bind:action="onAction" />
  </view>
  <game-over ... />
</view>
```

index.js wires d-pad events to adapter:
```javascript
onDirection(e) {
  const { code, key, type } = e.detail;
  if (this._adapter) this._adapter.simulateKey(type, code, key);
},
onAction(e) {
  const { code, key, type } = e.detail;
  if (this._adapter) this._adapter.simulateKey(type, code, key);
}
```

- [ ] **Step 3: Test** — d-pad controls snake, swipe works, food collection, level progression, pause

- [ ] **Step 4: Commit**

```bash
git add mini-games-collection/packages/pkg-casual/snake/
git commit -m "feat(mini-program): convert snake — virtual d-pad, swipe, level progression"
```

---

## Task 13: Convert Match3

**Files:** Create 5 files in `mini-games-collection/packages/pkg-casual/match3/`
- Source: `match3/index.html`

**Conversion notes:**
- Input: tap to select gem + swipe to swap direction — both via adapter touch events
- Complex animation state machine (IDLE→SWAP→MATCH→FALL→SPAWN) — all pure Canvas, works unchanged
- `getBoundingClientRect()` for click coords → adapter provides canvas-relative coords directly
- `ctx.roundRect()` — check Mini Program Canvas API support; if not available, add polyfill
- Level toast (`#level-toast`) → `adapter.updateHUD({ showToast: true, toastText: ... })`
- `window._pendingSpecials` global → convert to module-level variable
- Deep copy grid for valid moves check — keep as-is, pure JS

- [ ] **Step 1: Extract game.js** — remove DOM, wire adapter touch (tap + swipe detection)

- [ ] **Step 2: Create page files** — game-canvas + HUD (score/level/target/moves/best) + level toast + overlays

- [ ] **Step 3: Test** — gem selection, swipe swap, cascade matches, special gems, level progression

- [ ] **Step 4: Commit**

```bash
git add mini-games-collection/packages/pkg-casual/match3/
git commit -m "feat(mini-program): convert match3 — tap/swipe swap, cascades, specials, levels"
```

---

## Task 14: Convert Tetris

**Files:** Create 5 files in `mini-games-collection/packages/pkg-casual/tetris/`
- Source: `tetris/index.html`

**Conversion notes — most complex controls:**
- Uses 6 canvases in H5 (board + hold + 3 next previews + mobile next) — simplify to 1 main canvas, draw hold/next pieces directly on the main canvas or use WXML mini views
- Complex touch controls: tap-rotate, swipe-left/right, swipe-down/up — keep via adapter touch events
- DAS (Delayed Auto-Shift) system — works with adapter key simulation from d-pad
- Touch buttons in H5 (rotCW, rotCCW, soft, hard, hold) → virtual-buttons component
- Hold + Next piece preview — draw on main canvas in reserved area, or use separate small canvases

**Simplification for Mini Program:**
- Single canvas approach: draw hold piece (top-left corner) and next 3 pieces (right side) on the main game canvas
- This avoids managing multiple canvas nodes and simplifies the component structure

- [ ] **Step 1: Extract game.js**

Key changes:
- Remove 5 extra canvas initializations — draw hold/next on main canvas
- Modify `drawMiniPiece()` to draw at specific x,y offset on main ctx instead of separate canvas
- Remove DAS keyboard wiring — re-implement via adapter.addKeyListener with same timer logic
- Remove touch button setup — receive from virtual-buttons component
- Keep SRS rotation, 7-bag randomizer, ghost piece — all pure logic

- [ ] **Step 2: Create page files**

index.wxml with virtual controls for Tetris:
```html
<view class="game-page">
  <view class="hud">score/level/lines</view>
  <game-canvas bind:ready="onCanvasReady" />
  <view class="controls-bottom">
    <virtual-dpad bind:direction="onDirection" />
    <virtual-buttons config="{{tetrisButtons}}" bind:action="onAction" />
  </view>
  <game-over ... />
</view>
```

tetrisButtons config:
```javascript
data: {
  tetrisButtons: [
    { label: '↻', code: 'ArrowUp', key: 'ArrowUp' },
    { label: '↺', code: 'KeyZ', key: 'z' },
    { label: '⏬', code: 'Space', key: ' ' },
    { label: '⇄', code: 'KeyC', key: 'c' }
  ]
}
```

- [ ] **Step 3: Test** — piece rotation (SRS), wall kicks, hold, DAS, line clear animation, scoring

- [ ] **Step 4: Commit**

```bash
git add mini-games-collection/packages/pkg-casual/tetris/
git commit -m "feat(mini-program): convert tetris — SRS rotation, DAS, hold/next, line clear, virtual controls"
```

---

## Task 15: Convert 2048 (DOM → Canvas Full Rewrite)

**Files:** Create 5 files in `mini-games-collection/packages/pkg-casual/2048/`
- Source: `2048/index.html`

**This is the only game requiring a full Canvas rewrite — original is entirely DOM-based.**

The game logic (board state, move/merge, undo, win detection) stays the same. Only the rendering changes from DOM manipulation to Canvas drawing.

- [ ] **Step 1: Create game.js — rewrite rendering as Canvas**

```javascript
// packages/pkg-casual/2048/game.js
const storage = require('../../../lib/storage');

function initGame(adapter) {
  const { canvas, ctx, width: W, height: H } = adapter;

  // --- Constants ---
  const GRID = 4;
  const PAD = 10;
  const BOARD_PAD = 16;
  const BOARD_SIZE = Math.min(W, H) - BOARD_PAD * 2;
  const CELL = (BOARD_SIZE - PAD * (GRID + 1)) / GRID;
  const BOARD_X = (W - BOARD_SIZE) / 2;
  const BOARD_Y = (H - BOARD_SIZE) / 2 + 30;

  // Tile colors matching original CSS
  const TILE_COLORS = {
    2:    { bg: '#eee4da', fg: '#776e65' },
    4:    { bg: '#ede0c8', fg: '#776e65' },
    8:    { bg: '#f2b179', fg: '#f9f6f2' },
    16:   { bg: '#f59563', fg: '#f9f6f2' },
    32:   { bg: '#f67c5f', fg: '#f9f6f2' },
    64:   { bg: '#f65e3b', fg: '#f9f6f2' },
    128:  { bg: '#edcf72', fg: '#f9f6f2' },
    256:  { bg: '#edcc61', fg: '#f9f6f2' },
    512:  { bg: '#edc850', fg: '#f9f6f2' },
    1024: { bg: '#edc53f', fg: '#f9f6f2' },
    2048: { bg: '#edc22e', fg: '#f9f6f2' }
  };
  const DEFAULT_TILE = { bg: '#3c3a32', fg: '#f9f6f2' };

  // --- Game state (copied from original) ---
  let board = [];
  let score = 0;
  let best = parseInt(storage.getItem('2048best')) || 0;
  let prevBoard = null;
  let prevScore = 0;
  let canUndo = false;
  let won = false;
  let lost = false;
  let continueAfterWin = false;

  // Animation state
  let tiles = []; // { r, c, val, x, y, targetX, targetY, scale, opacity }
  let animating = false;
  let animTimer = 0;
  const ANIM_DURATION = 150; // ms

  // --- Board logic (identical to original) ---
  function initBoard() {
    board = Array.from({ length: GRID }, () => Array(GRID).fill(0));
    score = 0;
    won = false;
    lost = false;
    continueAfterWin = false;
    canUndo = false;
    addRandom();
    addRandom();
    syncTiles();
    adapter.updateHUD({ score, best, gameState: 'playing' });
  }

  function addRandom() {
    const empty = [];
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++)
        if (board[r][c] === 0) empty.push([r, c]);
    if (empty.length === 0) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    board[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  function slideRow(row) {
    const filtered = row.filter(v => v !== 0);
    const result = [];
    let merged = [];
    let i = 0;
    while (i < filtered.length) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        const val = filtered[i] * 2;
        result.push(val);
        merged.push(result.length - 1);
        score += val;
        if (val === 2048) won = true;
        i += 2;
      } else {
        result.push(filtered[i]);
        i++;
      }
    }
    while (result.length < GRID) result.push(0);
    return { row: result, merged };
  }

  function applyMove(dir) {
    prevBoard = board.map(r => [...r]);
    prevScore = score;
    let moved = false;

    const getCol = c => board.map(r => r[c]);
    const setCol = (c, col) => col.forEach((v, r) => { board[r][c] = v; });

    if (dir === 'left') {
      for (let r = 0; r < GRID; r++) {
        const { row } = slideRow(board[r]);
        if (row.some((v, i) => v !== board[r][i])) moved = true;
        board[r] = row;
      }
    } else if (dir === 'right') {
      for (let r = 0; r < GRID; r++) {
        const { row } = slideRow([...board[r]].reverse());
        row.reverse();
        if (row.some((v, i) => v !== board[r][i])) moved = true;
        board[r] = row;
      }
    } else if (dir === 'up') {
      for (let c = 0; c < GRID; c++) {
        const { row } = slideRow(getCol(c));
        if (row.some((v, r) => v !== board[r][c])) moved = true;
        setCol(c, row);
      }
    } else if (dir === 'down') {
      for (let c = 0; c < GRID; c++) {
        const { row } = slideRow(getCol(c).reverse());
        row.reverse();
        if (row.some((v, r) => v !== board[r][c])) moved = true;
        setCol(c, row);
      }
    }

    if (moved) {
      addRandom();
      canUndo = true;
      if (score > best) {
        best = score;
        storage.setItem('2048best', String(best));
      }
      syncTiles();
      adapter.updateHUD({ score, best });

      if (won && !continueAfterWin) {
        adapter.updateHUD({ gameState: 'win', score, best });
      } else if (isGameOver()) {
        lost = true;
        adapter.updateHUD({ gameState: 'dead', score, best, isNewRecord: score >= best && score > 0 });
      }
    }
  }

  function undo() {
    if (!canUndo || !prevBoard) return;
    board = prevBoard;
    score = prevScore;
    canUndo = false;
    won = false;
    lost = false;
    syncTiles();
    adapter.updateHUD({ score, best, gameState: 'playing' });
  }

  function isGameOver() {
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++) {
        if (board[r][c] === 0) return false;
        if (c + 1 < GRID && board[r][c] === board[r][c + 1]) return false;
        if (r + 1 < GRID && board[r][c] === board[r + 1][c]) return false;
      }
    return true;
  }

  // --- Tile position sync ---
  function syncTiles() {
    tiles = [];
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++)
        if (board[r][c] !== 0) {
          tiles.push({
            r, c, val: board[r][c],
            x: BOARD_X + PAD + c * (CELL + PAD),
            y: BOARD_Y + PAD + r * (CELL + PAD),
            scale: 1, opacity: 1
          });
        }
  }

  // --- Canvas rendering ---
  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#07080f';
    ctx.fillRect(0, 0, W, H);

    // Title + Score
    ctx.fillStyle = '#818cf8';
    ctx.font = 'bold 24px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('2048', W / 2, 30);

    // Board background
    ctx.fillStyle = '#1a1b2e';
    const r = 8;
    ctx.beginPath();
    ctx.roundRect(BOARD_X, BOARD_Y, BOARD_SIZE, BOARD_SIZE, r);
    ctx.fill();

    // Empty cells
    ctx.fillStyle = '#2a2b3e';
    for (let row = 0; row < GRID; row++)
      for (let col = 0; col < GRID; col++) {
        const x = BOARD_X + PAD + col * (CELL + PAD);
        const y = BOARD_Y + PAD + row * (CELL + PAD);
        ctx.beginPath();
        ctx.roundRect(x, y, CELL, CELL, 4);
        ctx.fill();
      }

    // Tiles
    tiles.forEach(t => {
      const colors = TILE_COLORS[t.val] || DEFAULT_TILE;
      ctx.fillStyle = colors.bg;
      ctx.beginPath();
      ctx.roundRect(t.x, t.y, CELL, CELL, 4);
      ctx.fill();

      ctx.fillStyle = colors.fg;
      const fontSize = t.val >= 1024 ? 18 : t.val >= 128 ? 22 : 28;
      ctx.font = `bold ${fontSize}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(t.val), t.x + CELL / 2, t.y + CELL / 2);
    });
  }

  // --- Input: swipe detection ---
  let touchStartX = 0, touchStartY = 0;

  adapter.addEventListener('touchstart', function(e) {
    if (animating || lost) return;
    const t = e.touches[0] || e.changedTouches[0];
    touchStartX = t.x;
    touchStartY = t.y;
  });

  adapter.addEventListener('touchend', function(e) {
    if (animating || lost) return;
    const t = e.changedTouches[0];
    const dx = t.x - touchStartX;
    const dy = t.y - touchStartY;
    const MIN = 30;
    if (Math.abs(dx) < MIN && Math.abs(dy) < MIN) return;

    let dir;
    if (Math.abs(dx) > Math.abs(dy)) {
      dir = dx > 0 ? 'right' : 'left';
    } else {
      dir = dy > 0 ? 'down' : 'up';
    }
    applyMove(dir);
    draw();
  });

  // Keyboard (from virtual d-pad)
  const dirMap = {
    ArrowLeft: 'left', ArrowRight: 'right',
    ArrowUp: 'up', ArrowDown: 'down'
  };
  adapter.addKeyListener('keydown', function(e) {
    if (animating || lost) return;
    const dir = dirMap[e.code];
    if (dir) {
      applyMove(dir);
      draw();
    }
  });

  // --- Game loop (simple redraw, no physics) ---
  function loop() {
    draw();
    adapter.requestAnimationFrame(loop);
  }

  function start() {
    initBoard();
    adapter.requestAnimationFrame(loop);
  }

  return {
    start,
    undo,
    continueGame() {
      continueAfterWin = true;
      adapter.updateHUD({ gameState: 'playing' });
    },
    destroy() {
      // adapter.destroy() handles RAF cleanup
    }
  };
}

module.exports = { initGame };
```

- [ ] **Step 2: Create page files**

index.wxml — includes undo button and d-pad for direction input:
```html
<view class="game-page">
  <view class="hud">
    <view class="stat-box"><text class="stat-label">分数</text><text class="stat-value">{{score}}</text></view>
    <view class="stat-box"><text class="stat-label">最佳</text><text class="stat-value">{{best}}</text></view>
    <button class="btn-small" bindtap="onUndo">撤销</button>
    <button class="btn-small" bindtap="onNewGame">新游戏</button>
  </view>
  <game-canvas bind:ready="onCanvasReady" />
  <virtual-dpad bind:direction="onDirection" />
  <game-over visible="{{gameState === 'dead'}}" ... bind:retry="onNewGame" />
</view>
```

- [ ] **Step 3: Test** — swipe/d-pad moves tiles, merge animation, undo works, 2048 win detection, game over detection

- [ ] **Step 4: Commit**

```bash
git add mini-games-collection/packages/pkg-casual/2048/
git commit -m "feat(mini-program): convert 2048 — DOM→Canvas full rewrite, swipe + d-pad, undo system"
```

---

## Task 16: Convert PVZ (Most Complex)

**Files:** Create 5 files in `mini-games-collection/packages/pkg-strategy/pvz/`
- Source: `pvz/index.html`

**Conversion notes — most complex game:**
- Card panel: H5 uses dynamically created DOM with mini canvases per card → convert to WXML template with `wx:for` and data binding
- Card cooldown: H5 manipulates DOM classes/styles → use `setData` to update cooldown percentages
- Overlay: H5 rebuilds `innerHTML` dynamically → use WXML conditional rendering (`wx:if`)
- Sun counter, wave bar, lives: DOM elements → WXML data binding
- Touch-to-click bridge: H5 dispatches synthetic MouseEvent → use adapter touch directly
- Mouse hover for placement cursor: use `touchmove` instead
- Card icon mini-canvases: draw plant icons as static images once, or draw them on main canvas

**Key architectural decision:** Move card panel and HUD entirely to WXML. Only the game board (plants, zombies, bullets, particles) renders on Canvas.

- [ ] **Step 1: Extract game.js**

Major changes from H5:
- Remove `buildCardPanel()` and all card DOM manipulation — card state managed via `adapter.updateHUD`
- Remove overlay innerHTML rebuilding — overlay state via `adapter.updateHUD({ overlayType })`
- Remove `canvas.dispatchEvent(new MouseEvent(...))` bridge — handle touch directly
- Replace `canvas.addEventListener('mousemove', ...)` with `adapter.addEventListener('touchmove', ...)`
- Replace `canvas.addEventListener('click', ...)` with `adapter.addEventListener('tap', ...)`
- Card selection: page handles card tap, sets `selectedPlant` on game via exported method
- Sun collection: game detects tap on sun drops, no DOM needed
- Keep all game logic: plant/zombie/bullet update, wave spawning, level progression — pure JS/Canvas

Export interface:
```javascript
module.exports = { initGame };
// initGame returns:
// { start, selectPlant(id), deselectPlant, destroy }
```

- [ ] **Step 2: Create index.wxml with card panel**

```html
<view class="game-page">
  <!-- HUD bar -->
  <view class="pvz-hud">
    <view class="sun-counter">☀️ {{sunCount}}</view>
    <view class="wave-bar">
      <view class="wave-fill" style="width: {{waveProgress}}%"></view>
    </view>
    <text class="wave-label">{{waveLabel}}</text>
    <view class="lives">
      <text wx:for="{{livesArray}}" wx:key="*this">❤️</text>
    </view>
  </view>

  <!-- Card panel -->
  <scroll-view class="card-panel" scroll-x>
    <view wx:for="{{cards}}" wx:key="id"
      class="plant-card {{item.selected ? 'selected' : ''}} {{item.affordable && !item.cooling ? '' : 'disabled'}}"
      bindtap="onCardTap" data-id="{{item.id}}">
      <view class="card-icon" style="background: {{item.color}}">{{item.emoji}}</view>
      <text class="card-name">{{item.name}}</text>
      <text class="card-cost">{{item.cost}}</text>
      <view class="cooldown-overlay" wx:if="{{item.cooling}}"
        style="height: {{item.cooldownPct}}%"></view>
    </view>
  </scroll-view>

  <!-- Game canvas -->
  <game-canvas bind:ready="onCanvasReady"
    logical-height="{{canvasHeight}}" />

  <!-- Overlays -->
  <view class="overlay" wx:if="{{overlayType === 'menu'}}">
    <text class="overlay-title">植物守卫战</text>
    <text class="overlay-sub">第 {{currentLevel}} 关</text>
    <button class="btn-primary" bindtap="onStartLevel">开始</button>
  </view>

  <game-over visible="{{overlayType === 'dead'}}" title="失败"
    bind:retry="onRetryLevel" />

  <view class="overlay" wx:if="{{overlayType === 'levelwin'}}">
    <text class="overlay-title">🎉 过关!</text>
    <button class="btn-primary" bindtap="onNextLevel">下一关</button>
  </view>
</view>
```

- [ ] **Step 3: Create index.js**

```javascript
const { initGame } = require('./game');

Page({
  data: {
    sunCount: 50,
    waveProgress: 0,
    waveLabel: '',
    livesArray: [1, 2, 3],
    cards: [], // populated from PLANT_DEFS
    overlayType: 'menu',
    currentLevel: 1,
    canvasHeight: 400
  },

  onCanvasReady(e) {
    this._adapter = e.detail.adapter;
    this._game = initGame(this._adapter);
  },

  onCardTap(e) {
    const id = e.currentTarget.dataset.id;
    if (this._game) this._game.selectPlant(id);
  },

  onStartLevel() {
    if (this._game) this._game.start();
  },

  onRetryLevel() {
    if (this._game) this._game.start();
  },

  onNextLevel() {
    if (this._game) this._game.start();
  },

  onShareAppMessage() {
    return {
      title: `我在植物守卫战通过了第${this.data.currentLevel}关！`,
      path: '/packages/pkg-strategy/pvz/index'
    };
  },

  onUnload() {
    if (this._game) this._game.destroy();
  }
});
```

- [ ] **Step 4: Test** — card selection, plant placement, sun collection, zombie waves, level progression, game over/win

- [ ] **Step 5: Commit**

```bash
git add mini-games-collection/packages/pkg-strategy/pvz/
git commit -m "feat(mini-program): convert pvz — WXML card panel, Canvas game board, 6 levels"
```

---

## Task 17: Ad Manager

**Files:**
- Create: `mini-games-collection/lib/ad-manager.js`

- [ ] **Step 1: Create ad-manager.js**

```javascript
// mini-games-collection/lib/ad-manager.js

class AdManager {
  constructor() {
    this._banner = null;
    this._interstitial = null;
    this._rewarded = null;
    this._playCount = 0;
    this._interstitialCooldown = 3; // show every N games

    // Ad unit IDs — replace with real IDs after申请流量主
    this._adIds = {
      banner: 'adunit-banner-placeholder',
      interstitial: 'adunit-interstitial-placeholder',
      rewarded: 'adunit-rewarded-placeholder'
    };
  }

  // --- Banner ---
  showBanner() {
    if (!wx.createBannerAd) return;
    if (this._banner) {
      this._banner.show().catch(() => {});
      return;
    }
    try {
      const sysInfo = wx.getSystemInfoSync();
      this._banner = wx.createBannerAd({
        adUnitId: this._adIds.banner,
        style: {
          left: 0,
          top: sysInfo.windowHeight - 80,
          width: sysInfo.windowWidth
        }
      });
      this._banner.onError((err) => {
        console.warn('Banner ad error:', err);
      });
      this._banner.onResize((res) => {
        this._banner.style.top = sysInfo.windowHeight - res.height;
      });
      this._banner.show().catch(() => {});
    } catch (e) {}
  }

  hideBanner() {
    if (this._banner) {
      this._banner.hide();
    }
  }

  // --- Interstitial ---
  showInterstitial() {
    this._playCount++;
    if (this._playCount % this._interstitialCooldown !== 0) return;
    if (!wx.createInterstitialAd) return;

    try {
      if (!this._interstitial) {
        this._interstitial = wx.createInterstitialAd({
          adUnitId: this._adIds.interstitial
        });
        this._interstitial.onError((err) => {
          console.warn('Interstitial ad error:', err);
        });
      }
      this._interstitial.show().catch(() => {});
    } catch (e) {}
  }

  // --- Rewarded Video ---
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

      this._rewarded.offClose(); // remove previous listener
      this._rewarded.onClose((res) => {
        if (res && res.isEnded) {
          if (onSuccess) onSuccess();
        } else {
          if (onFail) onFail('not_completed');
        }
      });

      this._rewarded.show().catch(() => {
        // Ad not ready, try loading first
        this._rewarded.load().then(() => {
          this._rewarded.show().catch(() => {
            if (onFail) onFail('load_failed');
          });
        }).catch(() => {
          if (onFail) onFail('load_failed');
        });
      });
    } catch (e) {
      if (onFail) onFail('error');
    }
  }

  // --- Cleanup ---
  destroy() {
    if (this._banner) this._banner.destroy();
    if (this._interstitial) this._interstitial.destroy();
    if (this._rewarded) this._rewarded.destroy();
  }
}

// Singleton
let _instance = null;
function getAdManager() {
  if (!_instance) _instance = new AdManager();
  return _instance;
}

module.exports = { getAdManager };
```

- [ ] **Step 2: Integrate into game-over component**

Modify `game-over.js` to show interstitial on game over:
```javascript
const { getAdManager } = require('../../lib/ad-manager');

// In attached() or when visible changes to true:
observers: {
  'visible'(val) {
    if (val) {
      getAdManager().showInterstitial();
    }
  }
}
```

- [ ] **Step 3: Add rewarded video hooks to game pages**

In each game's page JS, add rewarded video for revive/2x score. Example for snake:
```javascript
onRewardRevive() {
  getAdManager().showRewarded(
    () => { this._game.revive(); },
    () => { wx.showToast({ title: '观看完整视频才能复活', icon: 'none' }); }
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add mini-games-collection/lib/ad-manager.js
git commit -m "feat(mini-program): ad-manager — banner/interstitial/rewarded video with cooldown"
```

---

## Task 18: Share Module

**Files:**
- Create: `mini-games-collection/lib/share.js`

- [ ] **Step 1: Create share.js**

```javascript
// mini-games-collection/lib/share.js

const SHARE_TEMPLATES = {
  stack:    { title: (s) => `我在叠叠乐叠了${s.layers || s.score}层，你能超过我吗？`, emoji: '📦' },
  snake:    { title: (s) => `我在贪吃蛇拿了${s.score}分，你能超过我吗？`, emoji: '🐍' },
  flappy:   { title: (s) => `Flappy Bird ${s.score}分！来挑战！`, emoji: '🐦' },
  tetris:   { title: (s) => `俄罗斯方块消了${s.lines || s.score}行，敢来比吗？`, emoji: '🧱' },
  match3:   { title: (s) => `消消乐第${s.level}关 ${s.score}分，来超越我！`, emoji: '💎' },
  fruit:    { title: (s) => `切水果${s.score}分！你的刀法如何？`, emoji: '🍎' },
  breakout: { title: (s) => `打砖块第${s.level}关 ${s.score}分！`, emoji: '🧱' },
  '2048':   { title: (s) => `2048 最高${s.score}分，你能拼出2048吗？`, emoji: '🔢' },
  pvz:      { title: (s) => `植物守卫战通过了第${s.level}关！`, emoji: '🌻' }
};

function configShare(page, gameId, getScoreData) {
  const tmpl = SHARE_TEMPLATES[gameId];
  if (!tmpl) return;

  page.onShareAppMessage = function() {
    const scoreData = getScoreData ? getScoreData() : {};
    return {
      title: tmpl.title(scoreData),
      path: `/packages/${getPackage(gameId)}/${gameId}/index?challenge=${scoreData.score || 0}`,
      imageUrl: '' // Can generate share image via canvas.toTempFilePath
    };
  };

  page.onShareTimeline = function() {
    const scoreData = getScoreData ? getScoreData() : {};
    return {
      title: tmpl.title(scoreData),
      query: `challenge=${scoreData.score || 0}`
    };
  };
}

function getPackage(gameId) {
  const casual = ['stack', 'snake', 'tetris', 'match3', '2048'];
  const arcade = ['flappy', 'fruit', 'breakout'];
  if (casual.includes(gameId)) return 'pkg-casual';
  if (arcade.includes(gameId)) return 'pkg-arcade';
  return 'pkg-strategy';
}

// Handle incoming share — show challenge score
function handleShareLanding(options) {
  if (options && options.challenge) {
    return {
      challengeScore: parseInt(options.challenge) || 0,
      isChallenge: true
    };
  }
  return { isChallenge: false };
}

module.exports = { configShare, handleShareLanding };
```

- [ ] **Step 2: Integrate into each game page**

In each game's `index.js` onLoad:
```javascript
const { configShare, handleShareLanding } = require('../../../lib/share');

Page({
  onLoad(options) {
    const challenge = handleShareLanding(options);
    if (challenge.isChallenge) {
      this.setData({ challengeScore: challenge.challengeScore, showChallenge: true });
    }
    configShare(this, 'snake', () => ({ score: this.data.score }));
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add mini-games-collection/lib/share.js
git commit -m "feat(mini-program): share module — per-game challenge text, share landing handler"
```

---

## Task 19: Open Data Domain (Friend Rankings)

**Files:**
- Create: `mini-games-collection/open-data/index.js`
- Create: `mini-games-collection/open-data/index.json`
- Create: `mini-games-collection/open-data/data.js`
- Modify: `mini-games-collection/app.json` (add openDataContext)

- [ ] **Step 1: Update app.json**

Add to app.json:
```json
{
  "openDataContext": "open-data/",
  "workers": {}
}
```

- [ ] **Step 2: Create open-data/index.json**

```json
{
  "openDataContext": true
}
```

- [ ] **Step 3: Create open-data/data.js**

```javascript
// open-data/data.js
function getFriendScores(gameKey, callback) {
  wx.getFriendCloudStorage({
    keyList: [gameKey],
    success(res) {
      const friends = (res.data || [])
        .map(f => {
          const kv = f.KVDataList.find(k => k.key === gameKey);
          if (!kv) return null;
          const data = JSON.parse(kv.value);
          return {
            nickname: f.nickname,
            avatarUrl: f.avatarUrl,
            score: data.score || 0,
            time: data.time || 0
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score);
      callback(friends);
    },
    fail() {
      callback([]);
    }
  });
}

module.exports = { getFriendScores };
```

- [ ] **Step 4: Create open-data/index.js**

```javascript
// open-data/index.js
const { getFriendScores } = require('./data');

let sharedCanvas = null;
let ctx = null;

function init() {
  sharedCanvas = wx.getSharedCanvas();
  ctx = sharedCanvas.getContext('2d');
}

wx.onMessage((data) => {
  if (!ctx) init();

  if (data.type === 'showRank') {
    const gameKey = data.gameKey || 'score_default';
    const W = sharedCanvas.width;
    const H = sharedCanvas.height;

    getFriendScores(gameKey, (friends) => {
      // Clear
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0a0b14';
      ctx.fillRect(0, 0, W, H);

      // Title
      ctx.fillStyle = '#818cf8';
      ctx.font = 'bold 18px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 好友排行榜', W / 2, 30);

      // Rank list
      const ROW_H = 56;
      const START_Y = 50;
      const medals = ['🥇', '🥈', '🥉'];

      friends.slice(0, 20).forEach((f, i) => {
        const y = START_Y + i * ROW_H;
        const isMe = f.isMe;

        // Row background
        ctx.fillStyle = isMe ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)';
        ctx.fillRect(8, y, W - 16, ROW_H - 4);

        // Rank
        ctx.fillStyle = '#e0e0ff';
        ctx.font = '16px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(i < 3 ? medals[i] : String(i + 1), 30, y + 32);

        // Name
        ctx.textAlign = 'left';
        ctx.fillStyle = isMe ? '#818cf8' : '#e0e0ff';
        ctx.font = `${isMe ? 'bold ' : ''}14px system-ui`;
        ctx.fillText(f.nickname || '玩家', 56, y + 28);

        // Score
        ctx.textAlign = 'right';
        ctx.fillStyle = i === 0 ? '#fbbf24' : '#9ca3af';
        ctx.font = 'bold 16px system-ui';
        ctx.fillText(String(f.score), W - 16, y + 30);
      });

      if (friends.length === 0) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '14px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('暂无好友数据', W / 2, START_Y + 40);
        ctx.fillText('邀请好友一起玩吧！', W / 2, START_Y + 65);
      }
    });
  }
});
```

- [ ] **Step 5: Add score upload to game pages**

In each game's game-over handler, upload score:
```javascript
// Upload score to cloud storage for friend ranking
wx.setUserCloudStorage({
  KVDataList: [{
    key: `score_${gameId}`,
    value: JSON.stringify({ score: finalScore, time: Date.now() })
  }],
  success() {},
  fail() {}
});
```

- [ ] **Step 6: Add rank display trigger**

In game pages, when rank button is tapped:
```javascript
onRank() {
  // Send message to open data domain
  const openDataContext = wx.getOpenDataContext();
  openDataContext.postMessage({
    type: 'showRank',
    gameKey: `score_${this.gameId}`
  });
  // Navigate to a rank display page or show sharedCanvas overlay
}
```

- [ ] **Step 7: Commit**

```bash
git add mini-games-collection/open-data/
git commit -m "feat(mini-program): open data domain — friend ranking Canvas renderer"
```

---

## Task 20: Game Lobby Home Page

**Files:**
- Create: `mini-games-collection/pages/home/home.wxml`
- Create: `mini-games-collection/pages/home/home.js`
- Create: `mini-games-collection/pages/home/home.json`
- Create: `mini-games-collection/pages/home/home.wxss`

- [ ] **Step 1: Create home.json**

```json
{
  "usingComponents": {},
  "navigationBarTitleText": "游戏合集",
  "enablePullDownRefresh": false
}
```

- [ ] **Step 2: Create home.wxml**

```html
<!-- pages/home/home.wxml -->
<view class="home-page">
  <!-- Search -->
  <view class="search-bar">
    <icon type="search" size="14" color="#6b7280"/>
    <input class="search-input" placeholder="搜索游戏..." bindinput="onSearch" value="{{searchText}}" />
  </view>

  <!-- Hot Banner -->
  <swiper class="hot-banner" autoplay circular interval="4000" indicator-dots indicator-color="rgba(255,255,255,0.3)" indicator-active-color="#818cf8">
    <swiper-item wx:for="{{hotGames}}" wx:key="id" bindtap="onGameTap" data-id="{{item.id}}">
      <view class="banner-card" style="background: linear-gradient(135deg, {{item.gradientFrom}}, {{item.gradientTo}})">
        <view class="banner-tag">🔥 热门推荐</view>
        <text class="banner-title">{{item.name}}</text>
        <text class="banner-emoji">{{item.emoji}}</text>
      </view>
    </swiper-item>
  </swiper>

  <!-- Category Tabs -->
  <scroll-view class="category-tabs" scroll-x>
    <view wx:for="{{categories}}" wx:key="key"
      class="tab {{activeCategory === item.key ? 'active' : ''}}"
      bindtap="onCategoryTap" data-key="{{item.key}}">
      {{item.label}}
    </view>
  </scroll-view>

  <!-- Game Grid -->
  <scroll-view class="game-grid-scroll" scroll-y>
    <view class="game-grid">
      <view wx:for="{{filteredGames}}" wx:key="id"
        class="game-card" bindtap="onGameTap" data-id="{{item.id}}">
        <view class="game-icon" style="background: linear-gradient(135deg, {{item.gradientFrom}}, {{item.gradientTo}})">
          <text class="game-emoji">{{item.emoji}}</text>
        </view>
        <text class="game-name">{{item.name}}</text>
      </view>
    </view>
  </scroll-view>

  <!-- Banner Ad Placeholder -->
  <ad wx:if="{{showAd}}" unit-id="adunit-banner-placeholder" ad-type="banner"
    ad-theme="dark" binderror="onAdError"></ad>
</view>
```

- [ ] **Step 3: Create home.wxss**

```css
/* pages/home/home.wxss */
.home-page {
  min-height: 100vh;
  padding-bottom: 80px;
}

.search-bar {
  display: flex;
  align-items: center;
  margin: 12px 16px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  gap: 8px;
}

.search-input {
  flex: 1;
  font-size: 14px;
  color: #e0e0ff;
}

.search-input::placeholder {
  color: #6b7280;
}

.hot-banner {
  height: 140px;
  margin: 8px 16px;
}

.banner-card {
  height: 100%;
  border-radius: 14px;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.banner-tag {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 4px;
}

.banner-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
}

.banner-emoji {
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 40px;
}

.category-tabs {
  display: flex;
  padding: 14px 16px 0;
  white-space: nowrap;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.tab {
  display: inline-block;
  padding: 8px 16px;
  font-size: 14px;
  color: #6b7280;
}

.tab.active {
  color: #818cf8;
  font-weight: 600;
  border-bottom: 2px solid #818cf8;
}

.game-grid-scroll {
  height: calc(100vh - 320px);
}

.game-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  padding: 14px 16px;
}

.game-card {
  text-align: center;
}

.game-icon {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(99, 102, 241, 0.15);
}

.game-emoji {
  font-size: 32px;
}

.game-name {
  font-size: 12px;
  margin-top: 6px;
  display: block;
  color: #e0e0ff;
}
```

- [ ] **Step 4: Create home.js**

```javascript
// pages/home/home.js
const { getAdManager } = require('../../lib/ad-manager');

const ALL_GAMES = [
  { id: 'stack',    name: '叠叠乐',       emoji: '📦', category: 'casual',   package: 'pkg-casual',   gradientFrom: '#1e1e5a', gradientTo: '#0d0d2a' },
  { id: 'snake',    name: '贪吃蛇',       emoji: '🐍', category: 'casual',   package: 'pkg-casual',   gradientFrom: '#1e3a5f', gradientTo: '#0d1b2a' },
  { id: 'tetris',   name: '俄罗斯方块',   emoji: '🧱', category: 'casual',   package: 'pkg-casual',   gradientFrom: '#3b1f4e', gradientTo: '#1a0d2e' },
  { id: 'match3',   name: '消消乐',       emoji: '💎', category: 'casual',   package: 'pkg-casual',   gradientFrom: '#4a1e4a', gradientTo: '#2a0d2a' },
  { id: '2048',     name: '2048',          emoji: '🔢', category: 'casual',   package: 'pkg-casual',   gradientFrom: '#4a3000', gradientTo: '#2a1a00' },
  { id: 'flappy',   name: 'Flappy Bird',   emoji: '🐦', category: 'arcade',   package: 'pkg-arcade',   gradientFrom: '#4a3000', gradientTo: '#2a1a00' },
  { id: 'fruit',    name: '切水果',       emoji: '🍎', category: 'arcade',   package: 'pkg-arcade',   gradientFrom: '#5a1e1e', gradientTo: '#2a0d0d' },
  { id: 'breakout', name: '打砖块',       emoji: '🎯', category: 'arcade',   package: 'pkg-arcade',   gradientFrom: '#1e3a1e', gradientTo: '#0d2a0d' },
  { id: 'pvz',      name: '植物守卫战',   emoji: '🌻', category: 'strategy', package: 'pkg-strategy', gradientFrom: '#1e3a1e', gradientTo: '#0d2a0d' }
];

const CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'casual', label: '休闲' },
  { key: 'arcade', label: '街机' },
  { key: 'strategy', label: '策略' }
];

Page({
  data: {
    categories: CATEGORIES,
    activeCategory: 'all',
    searchText: '',
    hotGames: [],
    filteredGames: ALL_GAMES,
    allGames: ALL_GAMES,
    showAd: false
  },

  onLoad() {
    // Pick 3 random hot games for banner
    const shuffled = [...ALL_GAMES].sort(() => Math.random() - 0.5);
    this.setData({ hotGames: shuffled.slice(0, 3) });
  },

  onShow() {
    getAdManager().showBanner();
  },

  onHide() {
    getAdManager().hideBanner();
  },

  onCategoryTap(e) {
    const key = e.currentTarget.dataset.key;
    const filtered = key === 'all'
      ? ALL_GAMES
      : ALL_GAMES.filter(g => g.category === key);
    this.setData({ activeCategory: key, filteredGames: filtered });
  },

  onSearch(e) {
    const text = e.detail.value.toLowerCase();
    const filtered = text
      ? ALL_GAMES.filter(g => g.name.toLowerCase().includes(text) || g.id.includes(text))
      : ALL_GAMES;
    this.setData({ searchText: text, filteredGames: filtered });
  },

  onGameTap(e) {
    const id = e.currentTarget.dataset.id;
    const game = ALL_GAMES.find(g => g.id === id);
    if (!game) return;
    wx.navigateTo({
      url: `/packages/${game.package}/${id}/index`
    });
  },

  onShareAppMessage() {
    return {
      title: '超好玩的经典游戏合集，快来挑战！',
      path: '/pages/home/home'
    };
  }
});
```

- [ ] **Step 5: Test in DevTools**

1. Home page renders with search bar, banner swiper, category tabs, game grid
2. Category tabs filter correctly
3. Search filters by name
4. Tapping a game card navigates to the game page
5. Game page loads canvas and game runs

- [ ] **Step 6: Commit**

```bash
git add mini-games-collection/pages/home/
git commit -m "feat(mini-program): game lobby home page — search, banner, categories, 3-column grid"
```

---

## Task 21: Integration Testing & Final Polish

**Files:**
- Modify: all game page `index.js` files (integrate share + ads)
- Modify: `mini-games-collection/app.json` (verify all routes)

- [ ] **Step 1: Integrate share.js into all 9 game pages**

In each game page's `onLoad`, add:
```javascript
const { configShare, handleShareLanding } = require('path/to/lib/share');
// In onLoad:
configShare(this, '<gameId>', () => this.data);
const challenge = handleShareLanding(options);
if (challenge.isChallenge) {
  this.setData({ challengeScore: challenge.challengeScore });
}
```

- [ ] **Step 2: Integrate ad-manager into all game pages**

In each game page:
- `onShow`: `getAdManager().showBanner()` (for game lobby visible behind)
- `onHide`: `getAdManager().hideBanner()`
- Game over handler: `getAdManager().showInterstitial()`
- Add rewarded video button in game-over for applicable games (revive for arcade/strategy, 2x score for casual)

- [ ] **Step 3: Score upload to cloud storage for all games**

In each game's game-over callback:
```javascript
wx.setUserCloudStorage({
  KVDataList: [{
    key: `score_${gameId}`,
    value: JSON.stringify({ score, time: Date.now() })
  }]
});
```

- [ ] **Step 4: Full integration test checklist**

Test each game in WeChat DevTools simulator:

| Game | Canvas renders | Touch input | HUD updates | Game over | Share card | Score saved |
|------|:-:|:-:|:-:|:-:|:-:|:-:|
| stack    | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| snake    | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| flappy   | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| tetris   | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| match3   | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| fruit    | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| breakout | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 2048     | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| pvz      | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

Test navigation:
- ☐ Home page loads, all 9 games visible
- ☐ Category tabs filter correctly
- ☐ Search works
- ☐ Navigate to game → play → game over → back to home
- ☐ Share generates correct card with score
- ☐ Share landing opens correct game with challenge score

- [ ] **Step 5: Real device preview**

Use WeChat DevTools "Preview" feature → scan QR code on phone → test all games on real device:
- ☐ Touch responsiveness on each game
- ☐ D-pad comfort for snake/tetris
- ☐ Canvas performance (no frame drops)
- ☐ Share flow works end-to-end

- [ ] **Step 6: Final commit**

```bash
git add -A mini-games-collection/
git commit -m "feat(mini-program): integration — share, ads, cloud storage across all 9 games"
```

---

## Summary

| Task | Description | Estimated Time |
|------|-------------|---------------|
| 1 | Project scaffolding | 0.5 day |
| 2 | adapter.js | 0.5 day |
| 3 | storage.js | 0.5 hour |
| 4 | game-canvas component | 0.5 day |
| 5 | game-over component | 0.5 day |
| 6 | virtual-dpad component | 0.5 day |
| 7 | virtual-buttons component | 0.25 day |
| 8 | Convert stack (pipeline validation) | 1 day |
| 9 | Convert flappy | 0.5 day |
| 10 | Convert fruit | 0.5 day |
| 11 | Convert breakout | 0.5 day |
| 12 | Convert snake (first d-pad game) | 1 day |
| 13 | Convert match3 | 1 day |
| 14 | Convert tetris (complex controls) | 1.5 days |
| 15 | Convert 2048 (DOM→Canvas rewrite) | 1.5 days |
| 16 | Convert pvz (most complex) | 2 days |
| 17 | Ad manager | 0.5 day |
| 18 | Share module | 0.5 day |
| 19 | Open data domain (rankings) | 1 day |
| 20 | Game lobby home page | 1 day |
| 21 | Integration testing | 1.5 days |
| **Total** | | **~15 days** |
