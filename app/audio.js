// WebAudio 合成音效：海浪 / 海风 / 雷鸣（零素材依赖）
export class AudioEngine {
  constructor() { this.ctx = null; this.enabled = false; }
  ensure() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this._build();
        this.enabled = true;
      } catch (e) { /* 无音频环境时静默降级 */ }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  _noiseBuffer(seconds, brown) {
    const ctx = this.ctx, buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else d[i] = w;
    }
    return buf;
  }
  _build() {
    const ctx = this.ctx;
    this.master = ctx.createGain(); this.master.gain.value = 0.0;
    this.master.connect(ctx.destination);
    // 海浪：棕噪声 + 低通 + 缓慢起伏
    const osrc = ctx.createBufferSource(); osrc.buffer = this._noiseBuffer(4, true); osrc.loop = true;
    const olp = ctx.createBiquadFilter(); olp.type = 'lowpass'; olp.frequency.value = 480;
    this.oceanGain = ctx.createGain(); this.oceanGain.gain.value = 0.5;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
    const lg = ctx.createGain(); lg.gain.value = 0.2;
    lfo.connect(lg); lg.connect(this.oceanGain.gain); lfo.start();
    osrc.connect(olp); olp.connect(this.oceanGain); this.oceanGain.connect(this.master); osrc.start();
    // 海风：白噪声 + 带通
    const wsrc = ctx.createBufferSource(); wsrc.buffer = this._noiseBuffer(2, false); wsrc.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 620; bp.Q.value = 0.6;
    this.windGain = ctx.createGain(); this.windGain.gain.value = 0.05;
    wsrc.connect(bp); bp.connect(this.windGain); this.windGain.connect(this.master); wsrc.start();
  }
  fadeTo(v, t = 2) {
    if (!this.ctx) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(v, this.ctx.currentTime + t);
  }
  setStorm(s) {
    if (!this.ctx) return;
    this.windGain.gain.setTargetAtTime(0.05 + s * 0.32, this.ctx.currentTime, 1.2);
    this.oceanGain.gain.setTargetAtTime(0.5 + s * 0.35, this.ctx.currentTime, 1.2);
  }
  thunder() {
    if (!this.ctx) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this._noiseBuffer(3, true);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(320, t0);
    lp.frequency.exponentialRampToValueAtTime(60, t0 + 2.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(1.1, t0 + 0.06);
    g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.6);
    src.connect(lp); lp.connect(g); g.connect(this.master);
    src.start(t0); src.stop(t0 + 3);
  }
}
