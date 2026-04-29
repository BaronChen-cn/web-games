Component({
  properties: {
    config: { type: Array, value: [] }
  },
  data: { buttons: [] },
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
