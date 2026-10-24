// Delade hjälpfunktioner: lokal lagring (highscore) och ljud.
const Store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem('spelhornan:' + key);
      return v === null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('spelhornan:' + key, JSON.stringify(value)); } catch { /* ignoreras */ }
  },
};

const Sound = {
  muted: Store.get('muted', false),
  ctx: null,
  beep(freq = 440, dur = 0.08, type = 'square', vol = 0.05) {
    if (this.muted) return;
    try {
      this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
    } catch { /* ljud är valfritt */ }
  },
  toggle() {
    this.muted = !this.muted;
    Store.set('muted', this.muted);
    return this.muted;
  },
};

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-best]').forEach(el => {
    el.textContent = Store.get(el.dataset.best, 0);
  });
  document.querySelectorAll('[data-mute]').forEach(btn => {
    const paint = () => { btn.textContent = Sound.muted ? '🔇 Ljud av' : '🔊 Ljud på'; };
    paint();
    btn.addEventListener('click', () => { Sound.toggle(); paint(); });
  });
});
