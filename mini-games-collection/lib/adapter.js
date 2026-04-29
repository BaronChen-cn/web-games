function createGameAdapter(canvasNode, ctx, page) {
  const app = getApp();
  const sysInfo = app.globalData.systemInfo;
  const dpr = sysInfo.pixelRatio;
  const width = canvasNode.width / dpr;
  const height = canvasNode.height / dpr;

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

  const _listeners = { touchstart: [], touchmove: [], touchend: [], tap: [] };

  function addEventListener(type, fn) {
    if (_listeners[type]) _listeners[type].push(fn);
  }

  function removeEventListener(type, fn) {
    if (_listeners[type]) _listeners[type] = _listeners[type].filter(f => f !== fn);
  }

  function _normalizeTouches(e) {
    const touches = (e.touches || []).map(t => ({ clientX: t.x, clientY: t.y, x: t.x, y: t.y }));
    const changedTouches = (e.changedTouches || []).map(t => ({ clientX: t.x, clientY: t.y, x: t.x, y: t.y }));
    return { touches, changedTouches, preventDefault() {}, stopPropagation() {}, type: e.type, timeStamp: e.timeStamp };
  }

  function handleTouchStart(e) {
    const n = _normalizeTouches(e);
    _listeners.touchstart.forEach(fn => fn(n));
  }

  function handleTouchMove(e) {
    const n = _normalizeTouches(e);
    _listeners.touchmove.forEach(fn => fn(n));
  }

  function handleTouchEnd(e) {
    const n = _normalizeTouches(e);
    _listeners.touchend.forEach(fn => fn(n));
    if (n.changedTouches.length > 0) _listeners.tap.forEach(fn => fn(n));
  }

  const _keyListeners = { keydown: [], keyup: [] };

  function addKeyListener(type, fn) {
    if (_keyListeners[type]) _keyListeners[type].push(fn);
  }

  function removeKeyListener(type, fn) {
    if (_keyListeners[type]) _keyListeners[type] = _keyListeners[type].filter(f => f !== fn);
  }

  function simulateKey(type, code, key) {
    const event = { code, key, preventDefault() {} };
    (_keyListeners[type] || []).forEach(fn => fn(event));
  }

  function updateHUD(data) {
    if (page && page.setData) page.setData(data);
  }

  function destroy() {
    cancelAnimationFrame(_rafId);
    Object.keys(_listeners).forEach(k => { _listeners[k] = []; });
    Object.keys(_keyListeners).forEach(k => { _keyListeners[k] = []; });
  }

  return {
    canvas: canvasNode, ctx, width, height, dpr,
    screenWidth: sysInfo.windowWidth, screenHeight: sysInfo.windowHeight,
    requestAnimationFrame, cancelAnimationFrame,
    handleTouchStart, handleTouchMove, handleTouchEnd,
    addEventListener, removeEventListener,
    addKeyListener, removeKeyListener, simulateKey,
    updateHUD, destroy
  };
}

module.exports = { createGameAdapter };
