import overworldTravelMusicUrl from "../../assets/audio/overworld_travel_scarlet_raven.mp3?url";

export class SynthAudio {
  private ctx?: AudioContext;
  private muted = false;
  private step = 0;
  private mode: "title" | "world" | "battle" | "dungeon" | "ending" = "title";
  private tickTimer?: number;
  private worldMusic?: HTMLAudioElement;

  setMuted(value: boolean) {
    this.muted = value;
    this.syncWorldMusic();
  }

  start() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (!this.tickTimer) this.tickTimer = window.setInterval(() => this.tickLoop(), 220);
    this.ensureWorldMusic();
    this.syncWorldMusic();
  }

  setMode(mode: SynthAudio["mode"]) {
    this.mode = mode;
    this.syncWorldMusic();
  }

  blip(kind: "confirm" | "cancel" | "hit" | "spell" | "victory" | "error") {
    if (this.muted) return;
    this.start();
    const base = {
      confirm: 660,
      cancel: 240,
      hit: 130,
      spell: 880,
      victory: 1040,
      error: 110
    }[kind];
    this.tone(base, kind === "victory" ? 0.16 : 0.07, kind === "hit" ? "square" : "triangle", 0.08);
  }

  private tickLoop() {
    if (this.muted || !this.ctx) return;
    if (this.mode === "world" && this.worldMusic) return;
    const patterns = {
      title: [392, 0, 494, 0, 587, 523, 494, 0],
      world: [262, 330, 392, 330, 440, 392, 330, 294],
      battle: [196, 247, 294, 349, 294, 247, 220, 247],
      dungeon: [165, 0, 196, 0, 220, 196, 185, 0],
      ending: [392, 523, 659, 784, 659, 523, 494, 587]
    } as const;
    const note = patterns[this.mode][this.step % 8];
    this.step += 1;
    if (note) this.tone(note, 0.12, this.mode === "battle" ? "square" : "sine", 0.025);
  }

  private tone(freq: number, length: number, type: OscillatorType, gainValue: number) {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainValue, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + length);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + length);
  }

  private ensureWorldMusic(): HTMLAudioElement | undefined {
    if (this.worldMusic || typeof Audio === "undefined") return this.worldMusic;
    const music = new Audio(overworldTravelMusicUrl);
    music.loop = true;
    music.preload = "auto";
    music.volume = 0.42;
    this.worldMusic = music;
    return music;
  }

  private syncWorldMusic() {
    const music = this.worldMusic;
    if (!music) return;
    music.muted = this.muted;
    if (this.muted || this.mode !== "world") {
      music.pause();
      return;
    }
    void music.play().catch(() => {
      // Browser autoplay policy may defer playback until the next accepted input gesture.
    });
  }
}
