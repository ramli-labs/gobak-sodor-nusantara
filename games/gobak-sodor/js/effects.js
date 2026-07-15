/**
 * Particle effect dan confetti ringan tanpa library pihak ketiga.
 */
(() => {
  class EffectsLayer {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.particles = [];
      this.frame = 0;
      this.reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      this.colors = ["#e84444", "#f7c948", "#2775d8", "#2ca66f", "#ffffff"];
      this.resize = this.resize.bind(this);
      this.animate = this.animate.bind(this);
    }

    init() {
      if (this.canvas) return;
      this.canvas = document.createElement("canvas");
      this.canvas.className = "effects-layer";
      this.canvas.setAttribute("aria-hidden", "true");
      document.body.appendChild(this.canvas);
      this.ctx = this.canvas.getContext("2d");
      this.resize();
      window.addEventListener("resize", this.resize, { passive: true });
    }

    resize() {
      if (!this.canvas || !this.ctx) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.floor(window.innerWidth * ratio);
      this.canvas.height = Math.floor(window.innerHeight * ratio);
      this.canvas.style.width = `${window.innerWidth}px`;
      this.canvas.style.height = `${window.innerHeight}px`;
      this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    burst(x, y, options = {}) {
      if (this.reducedMotion) return;
      this.init();
      const count = Math.min(options.count || 24, 100);
      const colors = options.colors || this.colors;
      for (let index = 0; index < count; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (options.speed || 5) * (0.45 + Math.random() * 0.8);
        this.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (options.lift || 1.5),
          gravity: options.gravity ?? 0.15,
          drag: options.drag ?? 0.985,
          size: (options.size || 7) * (0.55 + Math.random() * 0.8),
          life: 1,
          decay: 0.018 + Math.random() * 0.018,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.25,
          shape: Math.random() > 0.45 ? "rect" : "circle"
        });
      }
      this.ensureAnimation();
    }

    confetti(options = {}) {
      if (this.reducedMotion) return;
      this.init();
      const width = window.innerWidth;
      const originY = options.y ?? Math.min(window.innerHeight * 0.28, 250);
      const launches = Math.min(options.count || 120, 180);
      for (let index = 0; index < launches; index += 1) {
        const x = width * (0.1 + Math.random() * 0.8);
        const y = originY + (Math.random() - 0.5) * 50;
        this.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 9,
          vy: -4 - Math.random() * 7,
          gravity: 0.2 + Math.random() * 0.08,
          drag: 0.992,
          size: 6 + Math.random() * 8,
          life: 1,
          decay: 0.006 + Math.random() * 0.008,
          color: this.colors[Math.floor(Math.random() * this.colors.length)],
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.35,
          shape: "rect"
        });
      }
      this.ensureAnimation();
    }

    ensureAnimation() {
      if (this.frame) return;
      this.frame = requestAnimationFrame(this.animate);
    }

    animate() {
      this.frame = 0;
      if (!this.ctx || !this.canvas) return;
      this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      this.particles = this.particles.filter((particle) => particle.life > 0.02);
      for (const particle of this.particles) {
        particle.vx *= particle.drag;
        particle.vy = particle.vy * particle.drag + particle.gravity;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.rotation += particle.spin;
        particle.life -= particle.decay;
        this.ctx.save();
        this.ctx.globalAlpha = Math.max(0, particle.life);
        this.ctx.fillStyle = particle.color;
        this.ctx.translate(particle.x, particle.y);
        this.ctx.rotate(particle.rotation);
        if (particle.shape === "circle") {
          this.ctx.beginPath();
          this.ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
          this.ctx.fill();
        } else {
          this.ctx.fillRect(-particle.size / 2, -particle.size / 3, particle.size, particle.size * 0.66);
        }
        this.ctx.restore();
      }
      if (this.particles.length) this.frame = requestAnimationFrame(this.animate);
      else this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  window.gsnEffects = new EffectsLayer();
})();
