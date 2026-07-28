/**
 * Kelas Enemy — penjaga yang mengejar target secara otomatis.
 *
 * Dua jenis penjaga, dibedakan lewat orientasi garis tugasnya (lihat arena.js):
 * - Penjaga Garis Melintang ("vertical"): X tetap pada garis tugasnya, hanya
 *   bergerak kiri–kanan menyusuri LEBAR lapangan (Y), mengejar posisi Y target.
 * - Penjaga Sodor ("horizontal"): Y tetap di garis sodor (tengah lapangan),
 *   hanya bergerak maju–mundur menyusuri KEDALAMAN lapangan (X), mengejar
 *   posisi X target.
 * Penjaga tidak pernah bergerak diagonal dan tidak dapat pindah garis tugas.
 *
 * Target dipilih lewat threat score (bukan acak), dikunci minimal 1,5 detik
 * (anti-jitter/hysteresis), dan gerakannya memakai percepatan/perlambatan
 * sederhana (steering) dengan reaction delay agar terasa manusiawi dan dapat
 * diamati siswa. Saat tidak ada target dalam radius deteksi, penjaga kembali
 * ke perilaku siaga (diam di titik asal dengan goyangan kecil).
 */
const DETECTION_RADIUS = 260;
const TARGET_LOCK_SECONDS = 1.5;
const HYSTERESIS_MULTIPLIER = 1.2;
const REACTION_DELAY_MIN = 0.25;
const REACTION_DELAY_MAX = 0.5;
const REACTION_DELAY_DEMO = 0.35;
const STOPPING_DISTANCE = 28;
const RETURN_SPEEDUP = 1.15;
const STANDBY_WOBBLE_RANGE = 24;
const STANDBY_WOBBLE_SPEED = 0.6;

const THREAT_WEIGHT = {
  proximity: 40,
  crossingIntent: 25,
  recentMovement: 15,
  // "Apakah pemain lain sedang membuka jalur": tim yang sama-sama aktif
  // bergerak dianggap sedang menyusun serangan bersama.
  teammateOpening: 10
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class Enemy {
  constructor({
    id,
    name,
    type = "melintang",
    orientation,
    fixed,
    min,
    max,
    position,
    speed = 150,
    label = "P",
    deterministic = false
  }) {
    this.id = id || label;
    this.name = name || label;
    this.type = type; // "melintang" | "sodor" — untuk label dan warna berbeda
    this.orientation = orientation;
    this.fixed = fixed;
    this.min = min;
    this.max = max;
    this.position = position;
    this.homePosition = position;
    this.maxSpeed = speed;
    this.acceleration = speed * 3;
    this.velocity = 0;
    this.size = 34;
    this.label = label;
    this.deterministic = deterministic;

    this.returnActive = false;
    this.returnMultiplier = 1;

    this.clock = 0;
    this.currentTargetId = null;
    this.currentTargetScore = 0;
    this.targetLockUntil = 0;
    this.lastTargetChange = 0;
    this.targetReason = "belum ada";
    this.previousTargetIdForReaction = null;
    this.reactionDelay = 0;
    this.pendingReactionUntil = 0;
  }

  setReturnPhase(active) {
    this.returnActive = Boolean(active);
    this.returnMultiplier = this.returnActive ? RETURN_SPEEDUP : 1;
  }

  /** Titik terdekat pada garis tugas penjaga terhadap posisi pemain. */
  closestPointTo(player) {
    if (this.orientation === "horizontal") {
      return { x: clamp(player.x, this.min, this.max), y: this.fixed };
    }
    return { x: this.fixed, y: clamp(player.y, this.min, this.max) };
  }

  distanceToLine(player) {
    const point = this.closestPointTo(player);
    return Math.hypot(player.x - point.x, player.y - point.y);
  }

  /** Komponen kecepatan pemain yang menuju/melewati garis penjaga (bukan acak, murni data posisi/kecepatan). */
  crossingIntent(player) {
    const axisPos = this.orientation === "horizontal" ? player.y : player.x;
    const axisVelocity = this.orientation === "horizontal" ? player.vy : player.vx;
    const towardLine = this.fixed - axisPos;
    if (towardLine === 0 || axisVelocity === 0) return 0;
    const sameDirection = Math.sign(towardLine) === Math.sign(axisVelocity);
    if (!sameDirection) return 0;
    return clamp(Math.abs(axisVelocity) / 260, 0, 1);
  }

  teammateOpeningScore(player, allPlayers) {
    const teammate = allPlayers.find((candidate) => candidate.playerNumber !== player.playerNumber);
    if (!teammate || !teammate.isActive?.()) return 0;
    const teammateSpeed = Math.hypot(teammate.vx, teammate.vy);
    return clamp(teammateSpeed / 260, 0, 1) * THREAT_WEIGHT.teammateOpening;
  }

  threatScore(player, allPlayers) {
    const distance = this.distanceToLine(player);
    const proximity = clamp(1 - distance / DETECTION_RADIUS, 0, 1) * THREAT_WEIGHT.proximity;
    const crossing = this.crossingIntent(player) * THREAT_WEIGHT.crossingIntent;
    const speedMagnitude = Math.hypot(player.vx, player.vy);
    const recentMovement = clamp(speedMagnitude / 260, 0, 1) * THREAT_WEIGHT.recentMovement;
    const teammateOpening = this.teammateOpeningScore(player, allPlayers);
    return proximity + crossing + recentMovement + teammateOpening;
  }

  pickReactionDelay() {
    if (this.deterministic) return REACTION_DELAY_DEMO;
    return REACTION_DELAY_MIN + Math.random() * (REACTION_DELAY_MAX - REACTION_DELAY_MIN);
  }

  changeTarget(newId, score, reason) {
    const previousTarget = this.currentTargetId;
    this.previousTargetIdForReaction = previousTarget;
    this.currentTargetId = newId;
    this.currentTargetScore = score;
    this.targetLockUntil = this.clock + TARGET_LOCK_SECONDS;
    this.lastTargetChange = this.clock;
    this.targetReason = reason;
    this.reactionDelay = this.pickReactionDelay();
    this.pendingReactionUntil = this.clock + this.reactionDelay;
    return { previousTarget, newTarget: newId, reason };
  }

  /**
   * Evaluasi dan (bila perlu) mengganti target. Mengembalikan info perubahan
   * target (untuk event log / deteksi pengalihan) atau null bila tidak berubah.
   */
  evaluateTarget(players, deltaTime) {
    this.clock += deltaTime;

    // Pemain yang sudah tertangkap atau selesai bukan lagi target yang sah.
    const activePlayers = players.filter((player) => player.isActive?.() ?? true);
    const candidates = activePlayers
      .map((player) => ({ player, distance: this.distanceToLine(player) }))
      .filter((entry) => entry.distance <= DETECTION_RADIUS)
      .map((entry) => ({ id: entry.player.playerNumber, score: this.threatScore(entry.player, activePlayers) }));

    if (!candidates.length) {
      if (this.currentTargetId !== null) return this.changeTarget(null, 0, "tidak-ada-target-dalam-radius");
      return null;
    }

    const best = candidates.reduce((top, item) => (item.score > top.score ? item : top));

    if (this.currentTargetId === null) {
      return this.changeTarget(best.id, best.score, "target-pertama-terdeteksi");
    }

    const currentAsCandidate = candidates.find((item) => item.id === this.currentTargetId);
    if (!currentAsCandidate) {
      return this.changeTarget(best.id, best.score, "target-keluar-radius");
    }

    const lockActive = this.clock < this.targetLockUntil;
    if (lockActive) {
      this.currentTargetScore = currentAsCandidate.score;
      return null;
    }

    if (best.id !== this.currentTargetId && best.score >= currentAsCandidate.score * HYSTERESIS_MULTIPLIER) {
      return this.changeTarget(best.id, best.score, "ancaman-lebih-tinggi");
    }

    this.currentTargetScore = currentAsCandidate.score;
    return null;
  }

  /** Target yang sedang dipakai untuk kemudi (dapat tertinggal dari currentTargetId selama reaction delay). */
  getSteeringTargetId() {
    return this.clock < this.pendingReactionUntil ? this.previousTargetIdForReaction : this.currentTargetId;
  }

  getTargetLabel() {
    if (this.currentTargetId === 1) return "Target: P1";
    if (this.currentTargetId === 2) return "Target: P2";
    return "Siaga";
  }

  getTargetShortLabel() {
    if (this.currentTargetId === 1) return "P1";
    if (this.currentTargetId === 2) return "P2";
    return "Siaga";
  }

  getTargetPlayer(players) {
    if (this.currentTargetId === null) return null;
    return players.find((player) => player.playerNumber === this.currentTargetId) ?? null;
  }

  standbyPoint() {
    const wobble = Math.sin(this.clock * STANDBY_WOBBLE_SPEED) * STANDBY_WOBBLE_RANGE;
    return clamp(this.homePosition + wobble, this.min, this.max);
  }

  /** Gerak steering: percepatan/perlambatan sederhana menuju proyeksi target, melambat mendekati tujuan (arrive). */
  steer(deltaTime, players) {
    const steeringTargetId = this.getSteeringTargetId();
    const steeringPlayer = steeringTargetId === null ? null : players.find((player) => player.playerNumber === steeringTargetId);

    let goal;
    if (steeringPlayer) {
      const point = this.closestPointTo(steeringPlayer);
      goal = this.orientation === "horizontal" ? point.x : point.y;
    } else {
      goal = this.standbyPoint();
    }

    const distance = goal - this.position;
    const absDistance = Math.abs(distance);
    const topSpeed = this.maxSpeed * this.returnMultiplier;
    const desiredSpeed = absDistance < STOPPING_DISTANCE ? topSpeed * (absDistance / STOPPING_DISTANCE) : topSpeed;
    const desiredVelocity = absDistance < 0.5 ? 0 : Math.sign(distance) * desiredSpeed;

    const diff = desiredVelocity - this.velocity;
    const maxStep = this.acceleration * deltaTime;
    this.velocity = Math.abs(diff) <= maxStep ? desiredVelocity : this.velocity + Math.sign(diff) * maxStep;
    this.velocity = clamp(this.velocity, -topSpeed, topSpeed);

    this.position = clamp(this.position + this.velocity * deltaTime, this.min, this.max);
  }

  /** @returns {object|null} info perubahan target untuk event log, atau null bila tidak berubah. */
  update(deltaTime, players) {
    const change = this.evaluateTarget(players, deltaTime);
    this.steer(deltaTime, players);
    return change;
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

  drawTargetIndicator(ctx, players) {
    const label = this.getTargetLabel();
    const targetPlayer = this.getTargetPlayer(players);

    if (targetPlayer) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(targetPlayer.x, targetPlayer.y);
      ctx.stroke();
      ctx.restore();
    }

    const half = this.size / 2;
    const chipY = -half - 20;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.font = "800 10px Poppins, sans-serif";
    const width = ctx.measureText(label).width + 14;

    ctx.fillStyle = "rgba(17, 31, 51, 0.88)";
    // Bentuk chip berbeda per jenis target agar tidak hanya dibedakan warna.
    if (this.currentTargetId === 1) {
      this.roundRect(ctx, -width / 2, chipY - 9, width, 18, 9);
    } else if (this.currentTargetId === 2) {
      this.diamondRect(ctx, -width / 2, chipY - 9, width, 18);
    } else {
      ctx.beginPath();
      ctx.ellipse(0, chipY, width / 2, 9, 0, 0, Math.PI * 2);
    }
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, chipY + 1);
    ctx.restore();
  }

  diamondRect(ctx, x, y, width, height) {
    const cx = x + width / 2;
    const cy = y + height / 2;
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(x + width, cy);
    ctx.lineTo(cx, y + height);
    ctx.lineTo(x, cy);
    ctx.closePath();
  }

  draw(ctx, { colorBlind = false } = {}) {
    const x = this.x;
    const y = this.y;
    const half = this.size / 2;
    // Penjaga Sodor memakai bentuk dan warna berbeda dari Penjaga Garis
    // Melintang agar kedua jenis penjaga mudah dibedakan (bukan hanya warna).
    const isSodor = this.type === "sodor";
    const drawShape = isSodor ? this.drawHexagon.bind(this) : this.drawOctagon.bind(this);

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.beginPath();
    ctx.ellipse(0, half + 9, half * 0.9, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    drawShape(ctx, half + 4);
    ctx.fill();

    if (isSodor) {
      ctx.fillStyle = colorBlind ? "#7b3fb3" : "#2f6fed";
    } else {
      ctx.fillStyle = colorBlind ? "#c46a1f" : "#e84444";
    }
    drawShape(ctx, half);
    ctx.fill();

    if (colorBlind) {
      ctx.save();
      drawShape(ctx, half - 2);
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
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  drawHexagon(ctx, radius) {
    ctx.beginPath();
    for (let index = 0; index < 6; index += 1) {
      const angle = -Math.PI / 2 + index * Math.PI / 3;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }
}
