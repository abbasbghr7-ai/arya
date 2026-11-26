export class Sfx {
  private ctx: AudioContext | null = null;
  muted = false;

  unlock() {
    if (this.muted) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!this.ctx) this.ctx = new Ctx();
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, slideTo?: number) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t + dur);
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp);
    amp.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, gain: number) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const length = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    const amp = this.ctx.createGain();
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(this.ctx.destination);
    src.start(t);
  }

  jump() {
    this.tone(220, 0.14, "square", 0.05, 520);
  }

  land() {
    this.noise(0.08, 0.04);
    this.tone(120, 0.07, "triangle", 0.04);
  }

  slide() {
    this.noise(0.12, 0.035);
  }

  clear(close: boolean) {
    this.tone(close ? 660 : 520, 0.08, "triangle", close ? 0.05 : 0.03, close ? 880 : 700);
  }

  die(recording: boolean) {
    this.noise(0.22, 0.07);
    this.tone(recording ? 340 : 180, 0.28, "sawtooth", 0.04, 70);
  }
}
