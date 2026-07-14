/**
 * Kelas Enemy
 * Penjaga hanya bergerak pada garis tugasnya seperti permainan Gobak Sodor.
 */
export class Enemy {
  constructor({ orientation, fixed, min, max, position, speed = 150, direction = 1, label = "P" }) {
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
  }

  increaseSpeed(multiplier = 1.12, maximumMultiplier = 1.8) {
    this.speed = Math.min(this.speed * multiplier, this.baseSpeed * maximumMultiplier);
  }

  resetSpeed() {
    this.speed = this.baseSpeed;
  }

  update(deltaTime) {
    this.position += this.speed * this.direction * deltaTime;

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

    // Bentuk segi delapan agar penjaga tidak hanya dibedakan lewat warna.
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
