const KEY_MAP = {
  up: { code: 'ArrowUp', key: 'ArrowUp' },
  down: { code: 'ArrowDown', key: 'ArrowDown' },
  left: { code: 'ArrowLeft', key: 'ArrowLeft' },
  right: { code: 'ArrowRight', key: 'ArrowRight' }
};

Component({
  data: { activeDir: '' },
  methods: {
    _press(dir) {
      this.setData({ activeDir: dir });
      const k = KEY_MAP[dir];
      this.triggerEvent('direction', { direction: dir, code: k.code, key: k.key, type: 'keydown' });
    },
    onUp() { this._press('up'); },
    onDown() { this._press('down'); },
    onLeft() { this._press('left'); },
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
