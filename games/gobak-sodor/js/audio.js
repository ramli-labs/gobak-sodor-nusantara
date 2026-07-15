/**
 * Mesin audio ringan Gobak Sodor Nusantara.
 * Seluruh bunyi dibuat dengan Web Audio API sehingga tetap dapat digunakan
 * secara offline tanpa mengunduh berkas musik tambahan.
 */
(() => {
  const STORAGE_KEY = "gsn-audio-muted-v1";
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  class AudioManager {
    constructor() {
      this.context = null;
      this.masterGain = null;
      this.musicGain = null;
      this.effectsGain = null;
      this.musicTimer = null;
      this.musicStep = 0;
      this.muted = localStorage.getItem(STORAGE_KEY) === "true";
      this.sequence = [261.63, 293.66, 329.63, 392, 440, 392, 329.63, 293.66];
    }

    async ensureContext() {
      if (!AudioContextClass || this.muted) return false;
      if (!this.context) {
        this.context = new AudioContextClass();
        this.masterGain = this.context.createGain();
        this.musicGain = this.context.createGain();
        this.effectsGain = this.context.createGain();
        this.masterGain.gain.value = 0.72;
        this.musicGain.gain.value = 0.12;
        this.effectsGain.gain.value = 0.5;
        this.musicGain.connect(this.masterGain);
        this.effectsGain.connect(this.masterGain);
        this.masterGain.connect(this.context.destination);
      }
      if (this.context.state === "suspended") {
        try { await this.context.resume(); } catch { return false; }
      }
      return true;
    }

    async toggle() {
      this.muted = !this.muted;
      localStorage.setItem(STORAGE_KEY, String(this.muted));
      if (this.muted) {
        this.stopMusic();
        if (this.masterGain && this.context) {
          this.masterGain.gain.setTargetAtTime(0, this.context.currentTime, 0.02);
        }
      } else {
        const ready = await this.ensureContext();
        if (ready) {
          this.masterGain.gain.setTargetAtTime(0.72, this.context.currentTime, 0.02);
          this.play("click");
        }
      }
      window.dispatchEvent(new CustomEvent("gsn:audio-change", { detail: { muted: this.muted } }));
      return this.muted;
    }

    async play(name = "click") {
      if (this.muted || !AudioContextClass) return;
      const ready = await this.ensureContext();
      if (!ready) return;

      const recipes = {
        click: [[520, 0.05, "sine", 0]],
        start: [[392, 0.09, "triangle", 0], [523.25, 0.12, "triangle", 0.09], [659.25, 0.16, "triangle", 0.2]],
        checkpoint: [[440, 0.08, "sine", 0], [587.33, 0.1, "sine", 0.08]],
        correct: [[523.25, 0.09, "triangle", 0], [659.25, 0.09, "triangle", 0.08], [783.99, 0.18, "triangle", 0.16]],
        wrong: [[220, 0.13, "sawtooth", 0], [164.81, 0.2, "sawtooth", 0.12]],
        flag: [[659.25, 0.08, "square", 0], [880, 0.18, "triangle", 0.08]],
        collision: [[150, 0.12, "sawtooth", 0], [95, 0.18, "square", 0.08]],
        shield: [[392, 0.08, "sine", 0], [587.33, 0.18, "sine", 0.06]],
        pause: [[330, 0.07, "sine", 0]],
        win: [[392, 0.1, "triangle", 0], [523.25, 0.1, "triangle", 0.1], [659.25, 0.12, "triangle", 0.2], [783.99, 0.28, "triangle", 0.32]],
        lose: [[293.66, 0.14, "sine", 0], [246.94, 0.14, "sine", 0.13], [196, 0.28, "sine", 0.26]],
        achievement: [[659.25, 0.08, "triangle", 0], [783.99, 0.08, "triangle", 0.08], [987.77, 0.23, "triangle", 0.16]]
      };

      (recipes[name] || recipes.click).forEach(([frequency, duration, type, delay]) => {
        this.scheduleTone({ frequency, duration, type, delay, destination: this.effectsGain, volume: 0.2 });
      });
    }

    scheduleTone({ frequency, duration, type = "sine", delay = 0, destination, volume = 0.12 }) {
      if (!this.context || !destination) return;
      const startAt = this.context.currentTime + delay;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), startAt + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
      oscillator.connect(gain);
      gain.connect(destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + duration + 0.03);
      oscillator.addEventListener("ended", () => {
        oscillator.disconnect();
        gain.disconnect();
      }, { once: true });
    }

    async startMusic() {
      if (this.muted || this.musicTimer) return;
      const ready = await this.ensureContext();
      if (!ready) return;
      const playStep = () => {
        if (this.muted || !this.context) return;
        const frequency = this.sequence[this.musicStep % this.sequence.length];
        this.scheduleTone({
          frequency,
          duration: 0.34,
          type: this.musicStep % 4 === 0 ? "triangle" : "sine",
          destination: this.musicGain,
          volume: 0.08
        });
        if (this.musicStep % 2 === 0) {
          this.scheduleTone({ frequency: frequency / 2, duration: 0.42, type: "sine", destination: this.musicGain, volume: 0.035 });
        }
        this.musicStep += 1;
      };
      playStep();
      this.musicTimer = window.setInterval(playStep, 560);
    }

    stopMusic() {
      if (this.musicTimer) window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  window.gsnAudio = new AudioManager();
})();
