/**
 * Kelas Player — penyerang dalam adaptasi Gobak Sodor/Hadang.
 * Menangani posisi, gerakan, benturan batas arena, visual pemain, dan
 * progres perjalanan masing-masing pemain (independen, tanpa mekanik bendera).
 */
const START_INVULNERABLE_SECONDS = 1;

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
    this.invulnerableTime = START_INVULNERABLE_SECONDS;
    this.animationTime = 0;
    this.vx = 0;
    this.vy = 0;

    // Progres perjalanan per pemain (independen antara P1 dan P2).
    this.status = "active"; // "active" | "caught" | "completed"
    this.currentBox = 0;
    this.highestLineReached = 0;
    this.hasReachedBackLine = false;
    this.hasReturnedToStart = false;
    this.outwardCrossings = 0;
    this.returnCrossings = 0;
    this.crossedOutboundLines = new Set();
    this.crossedReturnLines = new Set();
    this.caughtByEnemyId = null;
    this.caughtAtLineId = null;
    this.travelScore = 0; // 0–2: +1 mencapai garis belakang, +1 kembali ke START
  }

  isActive() {
    return this.status === "active";
  }

  markCaught(enemyId, lineId) {
    if (!this.isActive()) return;
    this.status = "caught";
    this.caughtByEnemyId = enemyId;
    this.caughtAtLineId = lineId;
  }

  markCompleted() {
    if (this.status === "caught") return;
    this.status = "completed";
    this.hasReturnedToStart = true;
    this.travelScore = 2;
  }

  update(deltaTime, direction, bounds) {
    this.animationTime += deltaTime;
    this.invulnerableTime = Math.max(0, this.invulnerableTime - deltaTime);

    if (!this.isActive()) return;

    let { x: dx, y: dy } = direction;
    const length = Math.hypot(dx, dy);
    if (length > 0) {
      dx /= length;
      dy /= length;
    }

    this.vx = dx * this.speed;
    this.vy = dy * this.speed;
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.x = Math.max(bounds.left + this.radius, Math.min(bounds.right - this.radius, this.x));
    this.y = Math.max(bounds.top + this.radius, Math.min(bounds.bottom - this.radius, this.y));
  }

  isInvulnerable() {
    return this.invulnerableTime > 0;
  }

  getCircle() {
    return { x: this.x, y: this.y, radius: this.radius };
  }

  draw(ctx, { colorBlind = false } = {}) {
    const caught = this.status === "caught";
    const completed = this.status === "completed";
    const blinking = this.isActive() && this.isInvulnerable() && Math.floor(this.invulnerableTime * 10) % 2 === 0;
    if (blinking) return;

    const bounce = this.isActive() ? Math.sin(this.animationTime * 9 + this.playerNumber) * 1.8 : 0;
    ctx.save();
    ctx.translate(this.x, this.y + bounce);
    if (caught) ctx.globalAlpha = 0.55;

    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.beginPath();
    ctx.ellipse(0, this.radius + 8, this.radius * 0.9, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = caught ? "#8a8f98" : this.color;
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
    ctx.globalAlpha = 1;

    if (caught) {
      ctx.strokeStyle = "#e84444";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      const r = this.radius + 3;
      ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.7); ctx.lineTo(r * 0.7, r * 0.7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.7, -r * 0.7); ctx.lineTo(-r * 0.7, r * 0.7); ctx.stroke();
    }

    if (completed) {
      ctx.fillStyle = "#1ec28b";
      ctx.beginPath();
      ctx.arc(this.radius - 2, -(this.radius - 2), 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.radius - 6, -(this.radius - 2));
      ctx.lineTo(this.radius - 3, -(this.radius + 1));
      ctx.lineTo(this.radius + 2, -(this.radius - 6));
      ctx.stroke();
    }

    ctx.restore();
  }
}
