/**
 * Kelas Player.
 * Menangani posisi, gerakan, benturan batas arena, Shield, dan visual pemain.
 */
export class Player {
  constructor({
    x,
    y,
    radius = 18,
    speed = 245,
    playerNumber = 1,
    color = "#2775d8",
    accent = "#153c78"
  }) {
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.speed = speed;
    this.playerNumber = playerNumber;
    this.color = color;
    this.accent = accent;
    this.hasFlag = false;
    this.invulnerableTime = 0;
    this.shieldTime = 0;
    this.animationTime = 0;
  }

  reset({ keepFlag = false } = {}) {
    this.x = this.startX;
    this.y = this.startY;
    this.hasFlag = keepFlag;
    this.invulnerableTime = 1.6;
  }

  update(deltaTime, direction, bounds) {
    this.animationTime += deltaTime;
    this.invulnerableTime = Math.max(0, this.invulnerableTime - deltaTime);
    this.shieldTime = Math.max(0, this.shieldTime - deltaTime);

    let { x: dx, y: dy } = direction;
    const length = Math.hypot(dx, dy);
    if (length > 0) {
      dx /= length;
      dy /= length;
    }

    this.x += dx * this.speed * deltaTime;
    this.y += dy * this.speed * deltaTime;
    this.x = Math.max(bounds.left + this.radius, Math.min(bounds.right - this.radius, this.x));
    this.y = Math.max(bounds.top + this.radius, Math.min(bounds.bottom - this.radius, this.y));
  }

  isInvulnerable() {
    return this.invulnerableTime > 0;
  }

  activateShield(seconds = 5) {
    this.shieldTime = Math.max(this.shieldTime, seconds);
  }

  hasShield() {
    return this.shieldTime > 0;
  }

  getCircle() {
    return { x: this.x, y: this.y, radius: this.radius };
  }

  draw(ctx, { colorBlind = false } = {}) {
    const blinking = this.isInvulnerable() && Math.floor(this.invulnerableTime * 10) % 2 === 0;
    if (blinking) return;

    const bounce = Math.sin(this.animationTime * 9 + this.playerNumber) * 1.8;
    ctx.save();
    ctx.translate(this.x, this.y + bounce);

    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.beginPath();
    ctx.ellipse(0, this.radius + 8, this.radius * 0.9, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.hasShield()) {
      const pulse = 5 + Math.sin(this.animationTime * 8) * 2;
      ctx.strokeStyle = "#f7c948";
      ctx.lineWidth = 5;
      ctx.setLineDash([8, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 11 + pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Pola pembeda tetap terlihat pada mode buta warna.
    if (colorBlind) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, this.radius - 1, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 3;
      for (let offset = -30; offset <= 30; offset += 9) {
        ctx.beginPath();
        ctx.moveTo(offset - 18, 28);
        ctx.lineTo(offset + 18, -28);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.fillStyle = this.playerNumber === 1 ? "#e84444" : "#f7c948";
    ctx.fillRect(-this.radius, -7, this.radius * 2, 7);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-this.radius, 0, this.radius * 2, 7);

    ctx.fillStyle = this.accent;
    ctx.font = "800 15px Poppins, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(this.playerNumber), 0, 1);

    if (this.hasFlag) {
      ctx.strokeStyle = "#172033";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.radius - 2, 5);
      ctx.lineTo(this.radius - 2, -28);
      ctx.stroke();

      ctx.fillStyle = "#f7c948";
      ctx.beginPath();
      ctx.moveTo(this.radius, -27);
      ctx.lineTo(this.radius + 25, -20);
      ctx.lineTo(this.radius, -12);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}
