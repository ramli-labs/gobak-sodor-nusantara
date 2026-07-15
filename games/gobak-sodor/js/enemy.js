/**
 * Kelas Enemy.
 * Penjaga tetap terikat pada garis tugasnya, tetapi ritmenya dapat berupa:
 * steady (konstan), pause (berhenti sesaat), pulse (cepat-lambat),
 * surge (lonjakan kecepatan), dan fakeout (berbalik sebelum batas).
 */
export class Enemy {
  constructor({
    orientation,
    fixed,
    min,
    max,
    position,
    speed = 150,
    direction = 1,
    label = "P",
    behavior = "steady",
    behaviorInterval = 4,
    pauseDuration = 0.45,
    surgeMultiplier = 1.28,
    phase = 0
  }) {
    this.orientation = orientation;
    this.fixed = fixed;
    this.min = min;
    this.max = max;
    this.position = position;
    this.baseSpeed = speed;
    this.speed = speed;
    this.direction = direction;
    this.size = 34;
    this.label = label;
    this.behavior = behavior;
    this.behaviorInterval = Math.max(1.8, behaviorInterval);
    this.pauseDuration = Math.max(0.15, pauseDuration);
    this.surgeMultiplier = Math.max(1, surgeMultiplier);
    this.behaviorClock = Math.max(0, phase);
    this.elapsed = Math.max(0, phase);
    this.pauseTimer = 0;
    this.difficultyMultiplier = 1;
    this.behaviorIntensity = 1;
    this.returnMultiplier = 1;
    this.returnActive = false;
  }

  configureDifficulty({ speedMultiplier = 1, behaviorIntensity = 1 } = {}) {
    this.difficultyMultiplier = Math.max(0.6, speedMultiplier);
    this.behaviorIntensity = Math.max(0.35, behaviorIntensity);
  }

  setReturnPhase(active, multiplier = 1.15) {
    const changed = this.returnActive !== Boolean(active);
    this.returnActive = Boolean(active);
    this.returnMultiplier = this.returnActive ? Math.max(1, multiplier) : 1;

    // Pada mode Normal/Ahli, sebagian penjaga melakukan tipuan sekali
    // ketika bendera diambil. Tetap berada di garis agar adil.
    if (changed && this.returnActive && this.behavior === "fakeout" && this.behaviorIntensity >= 0.9) {
      this.direction *= -1;
      this.behaviorClock = 0;
    }
  }

  increaseSpeed(multiplier = 1.12, maximumMultiplier = 1.8) {
    this.speed = Math.min(this.speed * multiplier, this.baseSpeed * maximumMultiplier);
  }

  resetSpeed() {
    this.speed = this.baseSpeed;
  }

  getBehaviorSpeedMultiplier() {
    if (this.behavior === "pulse") {
      return 1 + Math.sin(this.elapsed * (2.1 + this.behaviorIntensity * 0.35)) * 0.16 * this.behaviorIntensity;
    }
    if (this.behavior === "surge") {
      const wave = Math.max(0, Math.sin(this.elapsed * 1.65));
      return 1 + wave * (this.surgeMultiplier - 1) * this.behaviorIntensity;
    }
    return 1;
  }

  updateBehavior(deltaTime) {
    this.elapsed += deltaTime;
    this.behaviorClock += deltaTime;

    if (this.pauseTimer > 0) {
      this.pauseTimer = Math.max(0, this.pauseTimer - deltaTime);
      return true;
    }

    const triggerInterval = this.behaviorInterval / this.behaviorIntensity;
    if (this.behaviorClock < triggerInterval) return false;
    this.behaviorClock = 0;

    if (this.behavior === "pause") {
      this.pauseTimer = this.pauseDuration * Math.min(1.2, this.behaviorIntensity);
      return true;
    }

    if (this.behavior === "fakeout") {
      this.direction *= -1;
    }
    return false;
  }

  update(deltaTime) {
    const paused = this.updateBehavior(deltaTime);
    if (paused) return;

    const movementSpeed = this.speed
      * this.difficultyMultiplier
      * this.returnMultiplier
      * this.getBehaviorSpeedMultiplier();
    this.position += movementSpeed * this.direction * deltaTime;

    if (this.position >= this.max) {
      this.position = this.max;
      this.direction = -1;
    } else if (this.position <= this.min) {
      this.position = this.min;
      this.direction = 1;
    }
  }

  get x() {
    return this.orientation === "horizontal" ? this.position : this.fixed;
  }

  get y() {
    return this.orientation === "horizontal" ? this.fixed : this.position;
  }

  getRect() {
    return {
      x: this.x - this.size / 2,
      y: this.y - this.size / 2,
      width: this.size,
      height: this.size
    };
  }

  drawTrack(ctx) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 253, 248, 0.82)";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.setLineDash([13, 10]);
    ctx.beginPath();
    if (this.orientation === "horizontal") {
      ctx.moveTo(this.min, this.fixed);
      ctx.lineTo(this.max, this.fixed);
    } else {
      ctx.moveTo(this.fixed, this.min);
      ctx.lineTo(this.fixed, this.max);
    }
    ctx.stroke();
    ctx.restore();
  }

  draw(ctx, { colorBlind = false } = {}) {
    const x = this.x;
    const y = this.y;
    const half = this.size / 2;

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.beginPath();
    ctx.ellipse(0, half + 9, half * 0.9, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    this.drawOctagon(ctx, half + 4);
    ctx.fill();

    ctx.fillStyle = colorBlind ? "#7b3fb3" : "#e84444";
    this.drawOctagon(ctx, half);
    ctx.fill();

    if (colorBlind) {
      ctx.save();
      this.drawOctagon(ctx, half - 2);
      ctx.clip();
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 3;
      for (let offset = -28; offset <= 28; offset += 8) {
        ctx.beginPath();
        ctx.moveTo(-28, offset);
        ctx.lineTo(28, offset + 16);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.strokeStyle = "#8d2430";
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (this.orientation === "horizontal") {
      ctx.moveTo(-10, 0);
      ctx.lineTo(10, 0);
    } else {
      ctx.moveTo(0, -10);
      ctx.lineTo(0, 10);
    }
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "800 11px Poppins, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.label, 0, -1);

    // Ikon kecil memberi petunjuk ritme tanpa mengandalkan warna.
    if (this.behavior !== "steady") {
      const symbols = { pause: "Ⅱ", pulse: "~", surge: "+", fakeout: "↔" };
      ctx.fillStyle = "#172033";
      ctx.beginPath();
      ctx.arc(half - 1, -half + 2, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 8px Poppins, sans-serif";
      ctx.fillText(symbols[this.behavior] || "·", half - 1, -half + 2);
    }

    ctx.restore();
  }

  drawOctagon(ctx, radius) {
    ctx.beginPath();
    for (let index = 0; index < 8; index += 1) {
      const angle = Math.PI / 8 + index * Math.PI / 4;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
}
