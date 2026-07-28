/**
 * Simulasi Strategi Gobak Sodor — Versi 1.6.0.
 * Simulasi pembelajaran interdisipliner (Hari 3 KKA): membaca posisi dan
 * target penjaga, menerapkan logika jika–maka, bekerja sama, mencoba
 * strategi, dan merefleksikan hasil. Satu arena tunggal, tanpa peta pulau,
 * leaderboard, combo, shield, atau mekanik bendera.
 *
 * Peran pemain: P1 dan P2 SAMA-SAMA penyerang. Keduanya dapat melewati
 * garis penjaga, mencapai Garis Belakang, dan kembali ke START secara
 * independen. Tidak ada jabatan tetap "pembawa" atau "pengalih" — bila
 * salah satu pemain mengecoh penjaga, itu murni strategi yang muncul saat
 * bermain, dicatat lewat event log, bukan aturan baku.
 *
 * Gim ini merupakan adaptasi aturan Gobak Sodor/Hadang untuk simulasi
 * pembelajaran, bukan replika penuh aturan resmi.
 */
import { Player } from "./player.js";
import { Enemy } from "./enemy.js";
import { QuizSystem, QUESTIONS_PER_SESSION } from "./quiz.js";
import { EventLog } from "./eventlog.js";
import { ARENA } from "./arena.js";
import {
  initAccessibilityPanel,
  loadAccessibilitySettings,
  keyLabel
} from "./accessibility.js";

const GAME_WIDTH = 960;
const GAME_HEIGHT = 560;
const START_ZONE_WIDTH = 108;
const PLAYER_SPEED = 230;
const DIVERSION_WINDOW_SECONDS = 4;
const SESSION_TIME_LIMIT_SECONDS = 180;
const TOUCH_CONTROLS_KEY = "gsnTouchControlsV1";
const GAME_VERSION = "1.6.0";

const GAME_STATES = Object.freeze({
  LOADING: "loading",
  READY: "ready",
  COUNTDOWN: "countdown",
  RUNNING: "running",
  QUIZ: "quiz",
  PAUSED: "paused",
  FINISHED: "finished",
  ERROR: "error"
});

function isFormControl(target) {
  return target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, button"));
}

function isDemoMode() {
  return new URLSearchParams(location.search).get("demo") === "1";
}

function getDemoScene() {
  return new URLSearchParams(location.search).get("scene");
}

function partition(list, predicate) {
  const yes = [];
  const no = [];
  list.forEach((item) => (predicate(item) ? yes : no).push(item));
  return [yes, no];
}

class InputController {
  constructor(settings) {
    this.settings = settings;
    this.keyboard = new Set();
    // Satu set arah sentuh per pemain agar Co-op dapat dimainkan berdua
    // di layar sentuh besar (IFP/PID) tanpa keyboard.
    this.touch = { p1: new Set(), p2: new Set() };
  }

  init() {
    window.addEventListener("keydown", (event) => {
      if (isFormControl(event.target)) return;
      if (this.getGameKeys().has(event.code)) {
        event.preventDefault();
        this.keyboard.add(event.code);
      }
    }, { passive: false });

    window.addEventListener("keyup", (event) => {
      if (isFormControl(event.target)) return;
      if (this.getGameKeys().has(event.code)) {
        event.preventDefault();
        this.keyboard.delete(event.code);
      }
    }, { passive: false });

    window.addEventListener("blur", () => this.clear());

    document.querySelectorAll("[data-move]").forEach((button) => {
      const direction = button.dataset.move;
      const player = button.closest("[data-touch-player]")?.dataset.touchPlayer === "p2" ? "p2" : "p1";
      const activate = (event) => {
        event.preventDefault();
        this.touch[player].add(direction);
        button.classList.add("pressed");
        button.setPointerCapture?.(event.pointerId);
      };
      const deactivate = (event) => {
        event.preventDefault();
        this.touch[player].delete(direction);
        button.classList.remove("pressed");
      };
      button.addEventListener("pointerdown", activate);
      button.addEventListener("pointerup", deactivate);
      button.addEventListener("pointercancel", deactivate);
      button.addEventListener("lostpointercapture", deactivate);
    });
  }

  updateSettings(settings) {
    this.settings = settings;
    this.clear();
  }

  getGameKeys() {
    return new Set([
      ...Object.values(this.settings.controls.p1),
      ...Object.values(this.settings.controls.p2)
    ]);
  }

  clear() {
    this.keyboard.clear();
    Object.values(this.touch).forEach((directions) => directions.clear());
    document.querySelectorAll("[data-move].pressed").forEach((button) => button.classList.remove("pressed"));
  }

  getDirection(playerId) {
    const controls = this.settings.controls[playerId];
    const touch = this.touch[playerId] ?? new Set();
    const left = this.keyboard.has(controls.left) || touch.has("left");
    const right = this.keyboard.has(controls.right) || touch.has("right");
    const up = this.keyboard.has(controls.up) || touch.has("up");
    const down = this.keyboard.has(controls.down) || touch.has("down");
    return { x: Number(right) - Number(left), y: Number(down) - Number(up) };
  }
}

class GobakSodorGame {
  constructor() {
    this.canvas = document.querySelector("[data-game-canvas]");
    this.ctx = this.canvas?.getContext("2d");
    this.settings = loadAccessibilitySettings();
    this.input = new InputController(this.settings);
    this.quiz = new QuizSystem();
    this.eventLog = new EventLog();
    this.arena = ARENA;
    this.demoMode = isDemoMode();
    this.demoScene = this.demoMode ? getDemoScene() : null;
    this.mode = this.demoMode ? "Co-op" : "Solo";
    this.quizReady = false;
    this.state = GAME_STATES.LOADING;
    this.lastTime = 0;
    this.elapsedActiveTime = 0;
    this.linesCrossed = 0;
    this.questionAnsweredCount = 0;
    this.diversionSuccessCount = 0;
    this.diversionFailCount = 0;
    this.activeDiversions = [];
    this.catchesByEnemy = {};
    this.countdownRemaining = 0;
    this.lastCountdownNumber = null;
    this.messageTimer = 0;
    this.message = "";
    this.startZone = { x: 24, y: 40, width: START_ZONE_WIDTH - 24, height: GAME_HEIGHT - 80 };
    this.players = [];
    this.enemies = [];
    this.checkpoints = [];
    this.quizAnswered = false;
    this.overlayPrimaryAction = "start";
    this.overlaySecondaryAction = "restart";
    this.roundId = "";

    // Penanda soal berbasis tonggak tim (bukan per-perlintasan) agar total
    // tetap tepat enam meski dua pemain melintas secara independen.
    this.outboundQuizzedLines = new Set();
    this.returnQuizzedLines = new Set();
    this.backLineQuizTriggered = false;
    this.finalQuizTriggered = false;
    this.pendingSessionEnd = false;

    this.elements = {
      overlay: document.querySelector("[data-game-overlay]"),
      overlayIcon: document.querySelector("[data-overlay-icon]"),
      overlayEyebrow: document.querySelector("[data-overlay-eyebrow]"),
      overlayTitle: document.querySelector("[data-overlay-title]"),
      overlayText: document.querySelector("[data-overlay-text]"),
      primaryButton: document.querySelector("[data-overlay-primary]"),
      secondaryButton: document.querySelector("[data-overlay-secondary]"),
      pauseButton: document.querySelector("[data-pause-game]"),
      restartButton: document.querySelector("[data-restart-game]"),
      sceneRestartButton: document.querySelector("[data-restart-scene]"),
      fullscreenButton: document.querySelector("[data-fullscreen-game]"),
      arena: document.querySelector("[data-game-arena]"),
      timer: document.querySelector("[data-hud-time]"),
      activePlayers: document.querySelector("[data-hud-active]"),
      caught: document.querySelector("[data-hud-caught]"),
      backLine: document.querySelector("[data-hud-backline]"),
      returned: document.querySelector("[data-hud-returned]"),
      lines: document.querySelector("[data-hud-lines]"),
      answers: document.querySelector("[data-hud-answers]"),
      score: document.querySelector("[data-hud-score]"),
      focusList: document.querySelector("[data-focus-list]"),
      countdown: document.querySelector("[data-game-countdown]"),
      countdownValue: document.querySelector("[data-countdown-value]"),
      journeyPhase: document.querySelector("[data-hud-phase]"),
      journeyBar: document.querySelector("[data-journey-progress-bar]"),
      status: document.querySelector("[data-game-status]"),
      soloOption: document.querySelector("[data-solo-option]"),
      soloButton: document.querySelector("[data-start-solo]"),
      coopButton: document.querySelector("[data-start-coop]"),
      modeBadge: document.querySelector("[data-mode-badge]"),
      gameDescription: document.querySelector("[data-game-description]"),
      p1Controls: document.querySelector("[data-p1-controls]"),
      p2Controls: document.querySelector("[data-p2-controls]"),
      gameShell: document.querySelector(".game-shell"),
      touchToggle: document.querySelector("[data-touch-toggle]"),
      p2TouchZone: document.querySelector("[data-touch-player='p2']"),
      quizLayer: document.querySelector("[data-quiz-layer]"),
      quizCategory: document.querySelector("[data-quiz-category]"),
      quizProgress: document.querySelector("[data-quiz-progress]"),
      quizQuestion: document.querySelector("[data-quiz-question]"),
      quizChoices: document.querySelector("[data-quiz-choices]"),
      quizFeedback: document.querySelector("[data-quiz-feedback]"),
      quizContinue: document.querySelector("[data-quiz-continue]"),
      resultSection: document.querySelector("[data-result-section]"),
      resultTime: document.querySelector("[data-result-time]"),
      resultScoreP1: document.querySelector("[data-result-score-p1]"),
      resultScoreP2: document.querySelector("[data-result-score-p2]"),
      resultBackLine: document.querySelector("[data-result-backline]"),
      resultReturned: document.querySelector("[data-result-returned]"),
      resultCaught: document.querySelector("[data-result-caught]"),
      resultCorrect: document.querySelector("[data-result-correct]"),
      resultScore: document.querySelector("[data-result-score]"),
      resultLines: document.querySelector("[data-result-lines]"),
      resultTopEnemy: document.querySelector("[data-result-top-enemy]"),
      resultWorstLine: document.querySelector("[data-result-worst-line]"),
      resultStrategy: document.querySelector("[data-result-strategy]"),
      lkpdText: document.querySelector("[data-lkpd-text]"),
      lkpdCopyButton: document.querySelector("[data-lkpd-copy]"),
      resultRestart: document.querySelector("[data-result-restart]"),
      resultHome: document.querySelector("[data-result-home]")
    };
  }

  async init() {
    if (!this.canvas || !this.ctx) return;
    this.configureCanvas();
    this.input.init();
    initAccessibilityPanel();
    this.bindControls();
    this.applyDemoModeUi();
    this.updateControlLabels();
    // Susun arena/canvas lebih dulu agar layar tidak kosong saat soal masih
    // dimuat; resetGame() tidak membentuk sesi soal selama quizReady masih false.
    this.resetGame();
    this.showLoadingOverlay();
    requestAnimationFrame((time) => this.loop(time));

    try {
      await this.quiz.load();
      this.quizReady = true;
      // Bentuk sesi enam soal HANYA setelah bank soal selesai dimuat dan
      // tervalidasi (memperbaiki urutan inisialisasi lama).
      this.resetGame();
      if (this.quiz.totalQuestions !== QUESTIONS_PER_SESSION) {
        throw new Error("Sesi soal tidak lengkap.");
      }
      if (this.demoMode && this.demoScene) {
        this.jumpToScene(this.demoScene);
      } else {
        this.showReadyOverlay();
      }
      this.setStatus("Bank soal siap. Amati posisi dan target penjaga, lalu mulai simulasi.");
      this.updateButtons();
    } catch (error) {
      console.error(error);
      this.state = GAME_STATES.ERROR;
      this.showErrorOverlay();
      this.setStatus("Soal pembelajaran belum dapat dimuat. Silakan muat ulang halaman.");
      this.updateButtons();
    }
  }

  applyDemoModeUi() {
    if (!this.demoMode) return;
    if (this.elements.soloOption) this.elements.soloOption.hidden = true;
    if (this.elements.sceneRestartButton) this.elements.sceneRestartButton.hidden = false;
  }

  configureCanvas() {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = GAME_WIDTH * pixelRatio;
    this.canvas.height = GAME_HEIGHT * pixelRatio;
    this.canvas.style.aspectRatio = `${GAME_WIDTH} / ${GAME_HEIGHT}`;
    this.ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  bindControls() {
    this.elements.primaryButton?.addEventListener("click", () => this.handleOverlayAction(this.overlayPrimaryAction));
    this.elements.secondaryButton?.addEventListener("click", () => this.handleOverlayAction(this.overlaySecondaryAction));
    this.elements.pauseButton?.addEventListener("click", () => this.togglePause());
    this.elements.restartButton?.addEventListener("click", () => this.resetAndStart());
    this.elements.sceneRestartButton?.addEventListener("click", () => this.resetAndStart());
    this.elements.soloButton?.addEventListener("click", () => this.chooseModeAndStart("Solo"));
    this.elements.coopButton?.addEventListener("click", () => this.chooseModeAndStart("Co-op"));
    this.elements.touchToggle?.addEventListener("click", () => this.toggleTouchControls());
    this.applyTouchPreference(localStorage.getItem(TOUCH_CONTROLS_KEY) === "1");

    this.elements.quizChoices?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-choice-index]");
      if (!button || this.quizAnswered) return;
      this.submitQuizAnswer(Number(button.dataset.choiceIndex));
    });
    this.elements.quizContinue?.addEventListener("click", () => this.closeQuiz());

    this.elements.resultRestart?.addEventListener("click", () => this.resetAndStart());
    this.elements.resultHome?.addEventListener("click", () => this.returnToStart());
    this.elements.lkpdCopyButton?.addEventListener("click", () => this.copyLkpdText());

    this.elements.fullscreenButton?.addEventListener("click", async () => {
      try {
        if (!document.fullscreenElement) await this.elements.arena?.requestFullscreen();
        else await document.exitFullscreen();
      } catch {
        this.setMessage("Fullscreen tidak didukung browser ini.", 2);
      }
    });

    window.addEventListener("gsn:accessibility-change", (event) => {
      this.settings = event.detail || loadAccessibilitySettings();
      this.input.updateSettings(this.settings);
      document.documentElement.classList.toggle("color-blind-mode", this.settings.colorBlind);
      this.updateControlLabels();
      this.updateHud();
    });

    window.addEventListener("gsn:audio-change", (event) => {
      if (event.detail?.muted) window.gsnAudio?.stopMusic();
      else if (this.state === GAME_STATES.RUNNING) window.gsnAudio?.startMusic();
    });

    window.addEventListener("keydown", (event) => {
      if (isFormControl(event.target)) return;
      if (event.code === "KeyP" || event.code === "Escape") {
        event.preventDefault();
        this.togglePause();
      }
      if (event.code === "Enter" && this.state === GAME_STATES.READY) {
        this.resetAndStart();
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.state === GAME_STATES.RUNNING) this.pause();
    });
  }

  applyTouchPreference(forced) {
    // Media query (pointer: coarse) tetap menjadi deteksi utama; tombol ini
    // memaksa kontrol sentuh tampil pada perangkat yang salah terdeteksi (mis. IFP tertentu).
    this.elements.gameShell?.classList.toggle("force-touch", forced);
    this.elements.touchToggle?.setAttribute("aria-pressed", String(forced));
  }

  toggleTouchControls() {
    const forced = !this.elements.gameShell?.classList.contains("force-touch");
    this.applyTouchPreference(forced);
    localStorage.setItem(TOUCH_CONTROLS_KEY, forced ? "1" : "0");
    this.setStatus(forced ? "Kontrol sentuh selalu ditampilkan di layar." : "Kontrol sentuh kembali mengikuti deteksi perangkat.");
  }

  chooseModeAndStart(mode) {
    if (!this.quizReady) return;
    this.mode = this.demoMode ? "Co-op" : mode;
    this.resetGame();
    this.updateSetupText();
    this.elements.arena?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => this.start(), 300);
  }

  handleOverlayAction(action) {
    if (action === "start") this.start();
    if (action === "resume") this.resume();
    if (action === "restart") this.resetAndStart();
    if (action === "view-result") this.scrollToResult();
  }

  resetGame() {
    this.state = this.quizReady ? GAME_STATES.READY : GAME_STATES.LOADING;
    this.linesCrossed = 0;
    this.questionAnsweredCount = 0;
    this.diversionSuccessCount = 0;
    this.diversionFailCount = 0;
    this.activeDiversions = [];
    this.catchesByEnemy = {};
    this.elapsedActiveTime = 0;
    this.countdownRemaining = 0;
    this.lastCountdownNumber = null;
    this.message = "";
    this.messageTimer = 0;
    this.quizAnswered = false;
    this.outboundQuizzedLines = new Set();
    this.returnQuizzedLines = new Set();
    this.backLineQuizTriggered = false;
    this.finalQuizTriggered = false;
    this.pendingSessionEnd = false;
    this.roundId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.eventLog.start();
    this.eventLog.log("session_started", { mode: this.mode, demoMode: this.demoMode });
    // Sesi soal hanya dibentuk setelah bank soal selesai dimuat & tervalidasi.
    if (this.quizReady) this.quiz.startSession({ demo: this.demoMode });
    this.input.clear();

    this.checkpoints = this.arena.checkpoints.map((checkpoint) => ({ ...checkpoint }));
    this.players = [new Player({ x: this.arena.startLineX, y: this.mode === "Co-op" ? 225 : GAME_HEIGHT / 2, speed: PLAYER_SPEED, playerNumber: 1, color: "#2775d8", accent: "#153c78" })];
    if (this.mode === "Co-op") {
      this.players.push(new Player({ x: this.arena.startLineX, y: 335, speed: PLAYER_SPEED, playerNumber: 2, color: "#1fa678", accent: "#0d523d" }));
    }
    this.enemies = this.arena.enemies.map((config) => new Enemy({ ...config, deterministic: this.demoMode }));

    this.hideQuiz();
    this.hideCountdown();
    this.hideResult();
    this.updateSetupText();
    this.updateHud();
    this.setStatus(this.quizReady ? `Siap memulai simulasi ${this.mode === "Co-op" ? "Dua Pemain" : "Satu Pemain"}.` : "Memuat bank soal...");
  }

  start() {
    if (!this.quizReady || this.state === GAME_STATES.ERROR) {
      this.setStatus("Bank soal belum siap. Jalankan melalui server lokal dan muat ulang halaman.");
      return;
    }
    if ([GAME_STATES.COUNTDOWN, GAME_STATES.RUNNING, GAME_STATES.QUIZ].includes(this.state)) return;
    if (this.state === GAME_STATES.FINISHED) this.resetGame();
    this.beginCountdown();
  }

  beginCountdown() {
    this.state = GAME_STATES.COUNTDOWN;
    this.countdownRemaining = 3;
    this.lastCountdownNumber = null;
    this.lastTime = performance.now();
    window.gsnAudio?.stopMusic();
    this.hideOverlay();
    this.showCountdown();
    this.setStatus(`${this.mode === "Co-op" ? "Dua Pemain" : "Satu Pemain"}: bersiap di Garis Awal.`);
    this.updateButtons();
    this.updateHud();
    this.canvas.focus();
  }

  updateCountdown(deltaTime) {
    this.countdownRemaining = Math.max(0, this.countdownRemaining - deltaTime);
    const number = Math.ceil(this.countdownRemaining);
    if (number > 0 && number !== this.lastCountdownNumber) {
      this.lastCountdownNumber = number;
      if (this.elements.countdownValue) this.elements.countdownValue.textContent = String(number);
      window.gsnAudio?.play("click");
    }
    if (this.countdownRemaining <= 0) this.beginRunning();
  }

  beginRunning() {
    this.state = GAME_STATES.RUNNING;
    this.lastTime = performance.now();
    this.hideCountdown();
    this.hideOverlay();
    window.gsnAudio?.startMusic();
    window.gsnAudio?.play("start");
    window.gsnEffects?.burst(window.innerWidth / 2, Math.min(window.innerHeight * 0.42, 360), { count: 28, speed: 4 });
    this.setMessage(this.mode === "Co-op" ? "Lewati seluruh garis penjaga, capai Garis Belakang, lalu kembali ke START." : "Amati target dan arah penjaga sebelum bergerak.", 3);
    this.setStatus("Simulasi dimulai. Amati posisi dan target penjaga sebelum bergerak.");
    this.updateButtons();
    this.updateHud();
  }

  showCountdown() {
    this.elements.countdown?.classList.add("show");
    this.elements.countdown?.setAttribute("aria-hidden", "false");
    if (this.elements.countdownValue) this.elements.countdownValue.textContent = "3";
  }

  hideCountdown() {
    this.elements.countdown?.classList.remove("show");
    this.elements.countdown?.setAttribute("aria-hidden", "true");
  }

  resetAndStart() {
    if (!this.quizReady) return;
    this.resetGame();
    this.start();
  }

  returnToStart() {
    this.resetGame();
    this.showReadyOverlay();
    document.querySelector(".game-intro")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  pause() {
    if (this.state !== GAME_STATES.RUNNING) return;
    this.state = GAME_STATES.PAUSED;
    this.input.clear();
    window.gsnAudio?.stopMusic();
    window.gsnAudio?.play("pause");
    this.showPauseOverlay();
    this.setStatus("Permainan dijeda.");
    this.updateButtons();
  }

  resume() {
    if (this.state !== GAME_STATES.PAUSED) return;
    this.state = GAME_STATES.RUNNING;
    this.lastTime = performance.now();
    window.gsnAudio?.startMusic();
    window.gsnAudio?.play("click");
    this.hideOverlay();
    this.setStatus("Permainan dilanjutkan.");
    this.updateButtons();
  }

  togglePause() {
    if (this.state === GAME_STATES.RUNNING) this.pause();
    else if (this.state === GAME_STATES.PAUSED) this.resume();
  }

  loop(currentTime) {
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000 || 0, 0.05);
    this.lastTime = currentTime;
    if (this.state === GAME_STATES.COUNTDOWN) this.updateCountdown(deltaTime);
    if (this.state === GAME_STATES.RUNNING) this.update(deltaTime);
    this.draw();
    requestAnimationFrame((time) => this.loop(time));
  }

  update(deltaTime) {
    this.elapsedActiveTime += deltaTime;
    this.messageTimer = Math.max(0, this.messageTimer - deltaTime);

    const bounds = { left: 24, right: GAME_WIDTH - 24, top: 40, bottom: GAME_HEIGHT - 40 };
    const previousX = this.players.map((player) => player.x);
    this.players[0].update(deltaTime, this.input.getDirection("p1"), bounds);
    if (this.players[1]) this.players[1].update(deltaTime, this.input.getDirection("p2"), bounds);

    // Penjaga sedikit lebih waspada begitu perjalanan pulang tim dimulai
    // (setidaknya satu pemain aktif sudah mencapai Garis Belakang).
    this.setEnemyReturnPhase(this.players.some((player) => player.isActive() && player.hasReachedBackLine));

    this.enemies.forEach((enemy) => {
      const change = enemy.update(deltaTime, this.players);
      if (change) this.handleTargetChange(enemy, change);
    });
    this.expireDiversions();

    // Cek perlintasan garis per pemain; hentikan frame ini begitu satu soal terbuka.
    for (let i = 0; i < this.players.length; i += 1) {
      const player = this.players[i];
      if (!player.isActive()) continue;
      if (this.checkPlayerLineCrossing(player, previousX[i])) {
        this.updateHud();
        return;
      }
    }

    this.checkEnemyCollisions();
    if (this.state === GAME_STATES.RUNNING) this.checkSessionEnd();
    this.updateHud();
  }

  // ------------------------------------------------------------------
  // Pengalihan penjaga (diversion): kedua pemain dapat saling "membuka
  // jalur" satu sama lain. Hanya dihitung berhasil bila didukung event
  // log — bukan sekadar mendekat atau tertangkap.
  // ------------------------------------------------------------------
  handleTargetChange(enemy, change) {
    this.eventLog.log("enemy_target_changed", {
      enemyId: enemy.id,
      previousTarget: change.previousTarget,
      newTarget: change.newTarget,
      reason: change.reason
    });

    if (change.previousTarget && change.newTarget && change.previousTarget !== change.newTarget) {
      const relief = this.players.find((player) => player.playerNumber === change.previousTarget);
      const decoy = this.players.find((player) => player.playerNumber === change.newTarget);
      if (relief && decoy) {
        this.activeDiversions.push({
          enemyId: enemy.id,
          reliefPlayerId: relief.playerNumber,
          decoyPlayerId: decoy.playerNumber,
          startedAt: this.elapsedActiveTime,
          deadline: this.elapsedActiveTime + DIVERSION_WINDOW_SECONDS
        });
        this.eventLog.log("diversion_started", {
          enemyId: enemy.id,
          reliefPlayerId: relief.playerNumber,
          decoyPlayerId: decoy.playerNumber,
          reliefPosition: { x: Math.round(relief.x), y: Math.round(relief.y) },
          decoyPosition: { x: Math.round(decoy.x), y: Math.round(decoy.y) }
        });
      }
    }

    // Penjaga kembali menargetkan pemain yang tadi diringankan — pengalihan gagal.
    this.resolveDiversions(false, "penjaga-kembali-menargetkan", (item) => (
      item.enemyId === enemy.id && item.reliefPlayerId === change.newTarget
    ));
  }

  expireDiversions() {
    if (!this.activeDiversions.length) return;
    this.resolveDiversions(false, "waktu-habis", (item) => this.elapsedActiveTime > item.deadline);
  }

  resolveDiversions(succeeded, reason, filterFn = () => true) {
    const [matched, remaining] = partition(this.activeDiversions, filterFn);
    if (!matched.length) return;
    matched.forEach((diversion) => {
      this.eventLog.log(succeeded ? "diversion_succeeded" : "diversion_failed", {
        enemyId: diversion.enemyId,
        reliefPlayerId: diversion.reliefPlayerId,
        decoyPlayerId: diversion.decoyPlayerId,
        reason,
        elapsedSince: Number((this.elapsedActiveTime - diversion.startedAt).toFixed(2))
      });
      if (succeeded) this.diversionSuccessCount += 1;
      else this.diversionFailCount += 1;
    });
    this.activeDiversions = remaining;
  }

  // ------------------------------------------------------------------
  // Progres perjalanan per pemain: P1 dan P2 dicatat terpisah. Karena
  // posisi X bergerak kontinu, sebuah garis TIDAK dapat dilompati — jadi
  // urutan Garis Penjaga 1→2→3→Belakang selalu tercatat berurutan tanpa
  // perlu penjagaan tambahan.
  // ------------------------------------------------------------------
  checkPlayerLineCrossing(player, previousX) {
    if (!player.hasReachedBackLine) {
      const line = this.checkpoints.find((item) => (
        !player.crossedOutboundLines.has(item.id) && previousX < item.x && player.x >= item.x
      ));
      if (line) {
        player.crossedOutboundLines.add(line.id);
        player.outwardCrossings += 1;
        player.highestLineReached = Math.max(player.highestLineReached, line.id);
        player.currentBox = line.id;
        this.linesCrossed += 1;
        this.eventLog.log("checkpoint_crossed", { playerId: player.playerNumber, checkpointId: line.id, lineName: line.name, phase: "pergi" });
        this.resolveDiversions(true, "melewati-checkpoint", (item) => item.reliefPlayerId === player.playerNumber);
        window.gsnAudio?.play("checkpoint");
        this.effectAtGamePoint(line.x, player.y, { count: 20, colors: [this.arena.colors.accent, "#ffffff", "#f7c948"], speed: 4 });
        const opened = this.maybeTriggerOutboundLineQuiz(line, player);
        if (!opened) this.setStatus(`P${player.playerNumber} melewati ${line.name}.`);
        return opened;
      }

      if (previousX < this.arena.backLineX && player.x >= this.arena.backLineX) {
        player.hasReachedBackLine = true;
        player.travelScore = Math.max(player.travelScore, 1);
        player.currentBox = this.checkpoints.length + 1;
        this.eventLog.log("back_line_reached", { playerId: player.playerNumber });
        this.resolveDiversions(true, "mencapai-garis-belakang", (item) => item.reliefPlayerId === player.playerNumber);
        window.gsnAudio?.play("milestone");
        this.effectAtGamePoint(player.x, player.y, { count: 40, colors: [this.arena.colors.accent, "#f7c948", "#ffffff"], speed: 6 });
        this.setMessage(`P${player.playerNumber} mencapai Garis Belakang! Kembali ke START.`, 3);
        const opened = this.maybeTriggerBackLineQuiz(player);
        if (!opened) this.setStatus(`P${player.playerNumber} mencapai Garis Belakang.`);
        return opened;
      }
      return false;
    }

    const line = [...this.checkpoints].reverse().find((item) => (
      !player.crossedReturnLines.has(item.id) && previousX > item.x && player.x <= item.x
    ));
    if (line) {
      player.crossedReturnLines.add(line.id);
      player.returnCrossings += 1;
      player.currentBox = Math.max(0, line.id - 1);
      this.linesCrossed += 1;
      this.eventLog.log("checkpoint_crossed", { playerId: player.playerNumber, checkpointId: line.id, lineName: line.name, phase: "pulang" });
      this.resolveDiversions(true, "melewati-checkpoint", (item) => item.reliefPlayerId === player.playerNumber);
      window.gsnAudio?.play("checkpoint");
      this.effectAtGamePoint(line.x, player.y, { count: 20, colors: [this.arena.colors.accent, "#ffffff", "#f7c948"], speed: 4 });
      const opened = this.maybeTriggerReturnLineQuiz(line, player);
      if (!opened) this.setStatus(`P${player.playerNumber} melewati ${line.name} dalam perjalanan pulang.`);
      return opened;
    }

    if (previousX > this.arena.startLineX && player.x <= this.arena.startLineX) {
      player.markCompleted();
      player.currentBox = 0;
      this.eventLog.log("player_completed", { playerId: player.playerNumber });
      this.resolveDiversions(true, "kembali-ke-start", (item) => item.reliefPlayerId === player.playerNumber);
      window.gsnAudio?.play("win");
      this.effectAtGamePoint(player.x, player.y, { count: 32, colors: ["#1ec28b", "#ffffff", this.arena.colors.accent], speed: 5 });
      this.setMessage(`P${player.playerNumber} kembali ke START! +2 poin perjalanan.`, 3);
      if (!this.finalQuizTriggered) {
        this.finalQuizTriggered = true;
        this.openQuiz(`P${player.playerNumber} kembali ke START`);
        return true;
      }
      this.setStatus(`P${player.playerNumber} berhasil menyelesaikan perjalanan.`);
      return false;
    }
    return false;
  }

  maybeTriggerOutboundLineQuiz(line, player) {
    if (this.outboundQuizzedLines.has(line.id) || this.outboundQuizzedLines.size >= 2) return false;
    this.outboundQuizzedLines.add(line.id);
    this.openQuiz(`Perjalanan pergi · P${player.playerNumber} di ${line.name}`);
    return true;
  }

  maybeTriggerReturnLineQuiz(line, player) {
    if (this.returnQuizzedLines.has(line.id) || this.returnQuizzedLines.size >= 2) return false;
    this.returnQuizzedLines.add(line.id);
    this.openQuiz(`Perjalanan pulang · P${player.playerNumber} di ${line.name}`);
    return true;
  }

  maybeTriggerBackLineQuiz(player) {
    if (this.backLineQuizTriggered) return false;
    this.backLineQuizTriggered = true;
    this.openQuiz(`P${player.playerNumber} mencapai Garis Belakang`);
    return true;
  }

  openQuiz(label) {
    this.state = GAME_STATES.QUIZ;
    this.input.clear();
    this.quizAnswered = false;
    const question = this.quiz.getNextQuestion();
    this.eventLog.log("question_shown", { questionId: question.id, category: question.category, trigger: label });
    const questionNumber = this.questionAnsweredCount + 1;

    this.elements.quizCategory.textContent = question.category;
    this.elements.quizProgress.textContent = `${label} · Soal ${questionNumber} dari ${QUESTIONS_PER_SESSION}`;
    this.elements.quizQuestion.textContent = question.question;
    this.elements.quizFeedback.textContent = "Jawab untuk melanjutkan perjalanan.";
    this.elements.quizFeedback.className = "quiz-feedback";
    this.elements.quizContinue.hidden = true;
    this.elements.quizChoices.innerHTML = question.choices.map((choice, index) => `
      <button class="quiz-choice" type="button" data-choice-index="${index}"><span>${String.fromCharCode(65 + index)}</span>${this.escapeHtml(choice)}</button>
    `).join("");
    this.elements.quizLayer.classList.add("show");
    this.elements.quizLayer.setAttribute("aria-hidden", "false");
    this.elements.quizChoices.querySelector("button")?.focus();
    this.setStatus(`${label}: soal ${question.category}. Permainan berhenti sementara.`);
    this.updateButtons();
  }

  submitQuizAnswer(choiceIndex) {
    const result = this.quiz.answer(choiceIndex);
    this.quizAnswered = true;
    this.eventLog.log("question_answered", { questionId: result.question.id, isCorrect: result.isCorrect });
    const buttons = [...this.elements.quizChoices.querySelectorAll("[data-choice-index]")];
    buttons.forEach((button, index) => {
      button.disabled = true;
      if (index === result.correctIndex) button.classList.add("correct");
      if (index === result.selectedIndex && !result.isCorrect) button.classList.add("wrong");
    });

    // Kalimat penjelasan singkat memperkuat nilai edukatif tiap soal, maksimal dua kalimat.
    const explanation = typeof result.question.explanation === "string" && result.question.explanation.trim()
      ? ` ${result.question.explanation.trim()}`
      : "";
    if (result.isCorrect) {
      window.gsnAudio?.play("correct");
      this.pulseArena("success");
      window.gsnEffects?.burst(window.innerWidth / 2, window.innerHeight / 2, { count: 32, colors: ["#2ca66f", "#f7c948", "#ffffff"], speed: 5 });
      this.elements.quizFeedback.innerHTML = `<i class="fa-solid fa-check" aria-hidden="true"></i> <strong>Jawaban Tepat</strong> —${explanation}`;
      this.elements.quizFeedback.className = "quiz-feedback correct";
    } else {
      window.gsnAudio?.play("wrong");
      this.pulseArena("danger");
      window.gsnEffects?.burst(window.innerWidth / 2, window.innerHeight / 2, { count: 18, colors: ["#e84444", "#172033"], speed: 3.5, gravity: 0.24 });
      this.elements.quizFeedback.innerHTML = `<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> <strong>Perlu Ditinjau Kembali</strong> — Jawaban tepat: ${this.escapeHtml(result.question.choices[result.correctIndex])}.${explanation}`;
      this.elements.quizFeedback.className = "quiz-feedback wrong";
    }
    this.questionAnsweredCount += 1;
    this.elements.quizContinue.hidden = false;
    this.elements.quizContinue.focus();
    this.updateHud();
  }

  closeQuiz() {
    if (!this.quizAnswered) return;
    this.hideQuiz();
    if (this.pendingSessionEnd) {
      this.pendingSessionEnd = false;
      this.finish();
      return;
    }
    this.state = GAME_STATES.RUNNING;
    this.lastTime = performance.now();
    this.setMessage("Jalur terbuka. Tetap amati target penjaga.", 2.2);
    this.setStatus("Simulasi dilanjutkan. Amati posisi dan target penjaga.");
    this.updateButtons();
    this.canvas.focus();
  }

  hideQuiz() {
    this.elements.quizLayer?.classList.remove("show");
    this.elements.quizLayer?.setAttribute("aria-hidden", "true");
  }

  // ------------------------------------------------------------------
  // Penjaga hanya dapat menangkap bila tubuhnya masih berada di garis
  // tugasnya (selalu benar secara struktural — Enemy tidak pernah pindah
  // garis), pemain berada dalam radius sentuh, permainan sedang aktif, dan
  // pemain belum tertangkap/selesai. Sekali tertangkap, pemain TIDAK
  // dibangkitkan kembali pada percobaan ini; pemain lain tetap bermain.
  // ------------------------------------------------------------------
  checkEnemyCollisions() {
    for (const player of this.players) {
      if (!player.isActive() || player.isInvulnerable()) continue;
      const hitEnemy = this.enemies.find((enemy) => this.circleRectCollision(player.getCircle(), enemy.getRect()));
      if (!hitEnemy) continue;

      const phase = player.hasReachedBackLine ? "pulang" : "pergi";
      this.catchesByEnemy[hitEnemy.id] = (this.catchesByEnemy[hitEnemy.id] || 0) + 1;
      this.eventLog.log("player_caught", {
        enemyId: hitEnemy.id,
        enemyName: hitEnemy.name,
        enemyOrientation: hitEnemy.orientation,
        guardLineId: hitEnemy.id,
        playerId: player.playerNumber,
        collisionX: Math.round(player.x),
        collisionY: Math.round(player.y),
        phase
      });

      window.gsnAudio?.play("collision");
      this.pulseArena("danger");
      this.effectAtGamePoint(player.x, player.y, { count: 26, colors: ["#e84444", "#f7c948", "#172033"], speed: 5, gravity: 0.22 });

      this.resolveDiversions(false, "pemain-tertangkap", (item) => item.reliefPlayerId === player.playerNumber);
      this.resolveDiversions(false, "pengecoh-tertangkap", (item) => item.decoyPlayerId === player.playerNumber);

      if (this.settings.practiceMode) {
        // Mode Latihan: tertangkap tidak menghentikan perjalanan pemain,
        // hanya memberi jeda singkat sebelum dapat bergerak lagi.
        player.invulnerableTime = 1.2;
        this.setMessage("Perhatikan kembali ritme dan posisi penjaga.", 2.4);
        this.setStatus(`P${player.playerNumber} tersentuh ${hitEnemy.name}. Mode Latihan: perjalanan tetap berlanjut.`);
      } else {
        player.markCaught(hitEnemy.id, hitEnemy.id);
        this.setMessage(`P${player.playerNumber} tertangkap ${hitEnemy.name}.`, 2.6);
        this.setStatus(`P${player.playerNumber} tertangkap ${hitEnemy.name} dan keluar dari percobaan ini.`);
      }
    }
  }

  checkSessionEnd() {
    if (this.state !== GAME_STATES.RUNNING) return;
    const allDone = this.players.every((player) => !player.isActive());
    const timeUp = this.elapsedActiveTime >= SESSION_TIME_LIMIT_SECONDS;
    if (!allDone && !timeUp) return;

    if (!this.finalQuizTriggered) {
      // Soal keenam belum pernah muncul (mis. tidak ada pemain yang kembali
      // ke START) — tampilkan sebagai penutup sebelum sesi benar-benar berakhir.
      this.finalQuizTriggered = true;
      this.pendingSessionEnd = true;
      this.openQuiz("Sesi selesai");
      return;
    }
    this.finish();
  }

  finish() {
    if (this.state === GAME_STATES.FINISHED) return;
    this.state = GAME_STATES.FINISHED;
    this.input.clear();
    this.eventLog.log("session_completed", {});

    const anyCompleted = this.players.some((player) => player.status === "completed");
    window.gsnAudio?.stopMusic();
    window.gsnAudio?.play(anyCompleted ? "win" : "lose");
    if (anyCompleted) window.gsnEffects?.confetti({ count: 90 });

    this.updateHud();
    this.renderResult();
    this.overlayPrimaryAction = "view-result";
    this.configureOverlay({
      icon: anyCompleted ? "fa-flag-checkered" : "fa-chart-line",
      eyebrow: "Simulasi selesai",
      title: anyCompleted ? "Perjalanan selesai!" : "Percobaan selesai — pelajari hasilnya.",
      text: "Lihat hasil, analisis strategi, dan Data untuk LKPD di bawah.",
      primary: "Lihat Hasil",
      showSecondary: false
    });
    this.setStatus(`Simulasi selesai dalam ${this.formatDuration(this.elapsedActiveTime)}.`);
    this.updateButtons();
  }

  scrollToResult() {
    this.hideOverlay();
    this.elements.resultSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ------------------------------------------------------------------
  // Mode Simulasi Video: pintasan adegan agar setiap segmen dapat difilmkan
  // ulang secara konsisten tanpa mengulang seluruh alur. Tidak ada bendera;
  // perjalanan pergi berakhir di Garis Belakang, perjalanan pulang di START.
  // ------------------------------------------------------------------
  jumpToScene(scene) {
    const p1 = this.players[0];
    switch (scene) {
      case "quiz1":
        this.beginRunning();
        p1.x = this.checkpoints[0].x - p1.radius - 7;
        this.maybeTriggerOutboundLineQuiz(this.checkpoints[0], p1);
        this.linesCrossed = 1;
        break;
      case "quiz2":
        this.beginRunning();
        p1.crossedOutboundLines.add(this.checkpoints[0].id);
        p1.x = this.checkpoints[1].x - p1.radius - 7;
        this.maybeTriggerOutboundLineQuiz(this.checkpoints[1], p1);
        this.linesCrossed = 2;
        break;
      case "backline":
        this.beginRunning();
        this.checkpoints.forEach((checkpoint) => p1.crossedOutboundLines.add(checkpoint.id));
        this.linesCrossed = this.checkpoints.length;
        p1.x = this.arena.backLineX - p1.radius - 30;
        break;
      case "return":
        this.beginRunning();
        this.checkpoints.forEach((checkpoint) => p1.crossedOutboundLines.add(checkpoint.id));
        this.linesCrossed = this.checkpoints.length;
        p1.hasReachedBackLine = true;
        p1.travelScore = 1;
        p1.x = this.checkpoints[this.checkpoints.length - 1].x + p1.radius + 40;
        this.setEnemyReturnPhase(true);
        break;
      case "result":
        this.checkpoints.forEach((checkpoint) => {
          p1.crossedOutboundLines.add(checkpoint.id);
          p1.crossedReturnLines.add(checkpoint.id);
        });
        this.linesCrossed = this.checkpoints.length * 2;
        p1.hasReachedBackLine = true;
        p1.markCompleted();
        this.finish();
        break;
      case "start":
      default:
        this.showReadyOverlay();
        break;
    }
  }

  mostActiveEnemy() {
    const entries = Object.entries(this.catchesByEnemy);
    if (!entries.length) return null;
    const [id, count] = entries.reduce((best, entry) => (entry[1] > best[1] ? entry : best));
    const enemy = this.enemies.find((item) => item.id === id);
    return { id, name: enemy ? enemy.name : id, count };
  }

  playerOutcomeText(player) {
    if (player.status === "completed") {
      return `P${player.playerNumber} berhasil kembali ke START dan memperoleh ${player.travelScore} poin perjalanan.`;
    }
    const catcher = this.enemies.find((enemy) => enemy.id === player.caughtByEnemyId);
    const catcherName = catcher ? catcher.name : "penjaga";
    if (player.status === "caught") {
      return player.hasReachedBackLine
        ? `P${player.playerNumber} berhasil mencapai Garis Belakang, tetapi tertangkap ${catcherName} saat perjalanan pulang.`
        : `P${player.playerNumber} tertangkap ${catcherName} saat perjalanan pergi.`;
    }
    return `P${player.playerNumber} belum menyelesaikan perjalanan saat sesi berakhir.`;
  }

  buildStrategyAnalysis(report) {
    const lines = this.players.map((player) => this.playerOutcomeText(player));
    const topEnemy = this.mostActiveEnemy();
    if (topEnemy) lines.push(`${topEnemy.name} menjadi bagian yang paling sering menyebabkan penyerang tertangkap (${topEnemy.count} kali).`);
    if (report.total > 0) {
      lines.push(report.accuracy >= 70
        ? "Jawaban kuis menunjukkan pemahaman logika permainan yang baik."
        : "Beberapa jawaban kuis perlu ditinjau kembali untuk memahami logika jika–maka pada permainan.");
    }
    if (this.mode === "Co-op" && this.diversionSuccessCount > 0) {
      lines.push(`Strategi mengecoh penjaga berhasil dilakukan sebanyak ${this.diversionSuccessCount} kali.`);
    } else if (this.mode === "Co-op" && this.diversionFailCount > 0) {
      lines.push("Strategi mengecoh penjaga belum berhasil pada sesi ini; coba ubah waktu atau sisi pendekatan.");
    }
    if (!lines.length) lines.push("Belum cukup data untuk menentukan pola strategi utama.");
    return lines;
  }

  buildLkpdText(report) {
    const topEnemy = this.mostActiveEnemy();
    const backLineCount = this.players.filter((player) => player.hasReachedBackLine).length;
    const returnedCount = this.players.filter((player) => player.status === "completed").length;
    const caughtCount = this.players.filter((player) => player.status === "caught").length;
    const lines = [
      `Waktu permainan: ${this.formatDuration(this.elapsedActiveTime)}`,
      `Skor perjalanan P1: ${this.players[0]?.travelScore ?? 0}/2`
    ];
    if (this.players[1]) lines.push(`Skor perjalanan P2: ${this.players[1].travelScore}/2`);
    lines.push(
      `Mencapai Garis Belakang: ${backLineCount}/${this.players.length}`,
      `Kembali ke START: ${returnedCount}/${this.players.length}`,
      `Jumlah tertangkap: ${caughtCount}/${this.players.length}`,
      `Penjaga paling sering menangkap: ${topEnemy ? `${topEnemy.name} (${topEnemy.count} kali)` : "Tidak ada"}`,
      `Garis paling sulit dilewati: ${topEnemy ? topEnemy.name : "Tidak ada"}`,
      `Jawaban benar: ${report.correct}/${report.total}`,
      `Skor pemahaman: ${report.accuracy}%`,
      `Pengalihan berhasil: ${this.diversionSuccessCount}`
    );
    return lines.join("\n");
  }

  copyLkpdText() {
    const text = this.elements.lkpdText?.textContent || "";
    if (!text) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => this.setStatus("Ringkasan LKPD disalin ke clipboard."))
        .catch(() => this.setStatus("Gagal menyalin otomatis. Salin manual dari kotak teks."));
      return;
    }
    try {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.setAttribute("readonly", "");
      helper.style.position = "absolute";
      helper.style.left = "-9999px";
      document.body.append(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
      this.setStatus("Ringkasan LKPD disalin ke clipboard.");
    } catch {
      this.setStatus("Gagal menyalin otomatis. Salin manual dari kotak teks.");
    }
  }

  renderResult() {
    if (!this.elements.resultSection) return;
    const report = this.quiz.getSessionReport();
    const topEnemy = this.mostActiveEnemy();
    const backLineCount = this.players.filter((player) => player.hasReachedBackLine).length;
    const returnedCount = this.players.filter((player) => player.status === "completed").length;
    const caughtCount = this.players.filter((player) => player.status === "caught").length;

    this.elements.resultSection.hidden = false;
    if (this.elements.resultTime) this.elements.resultTime.textContent = this.formatDuration(this.elapsedActiveTime);
    if (this.elements.resultScoreP1) this.elements.resultScoreP1.textContent = `${this.players[0]?.travelScore ?? 0}/2`;
    if (this.elements.resultScoreP2) {
      const wrapper = this.elements.resultScoreP2.closest("[data-result-p2-wrap]") || this.elements.resultScoreP2.closest(".result-card");
      if (this.players[1]) {
        this.elements.resultScoreP2.textContent = `${this.players[1].travelScore}/2`;
        if (wrapper) wrapper.hidden = false;
      } else if (wrapper) {
        wrapper.hidden = true;
      }
    }
    if (this.elements.resultBackLine) this.elements.resultBackLine.textContent = `${backLineCount}/${this.players.length}`;
    if (this.elements.resultReturned) this.elements.resultReturned.textContent = `${returnedCount}/${this.players.length}`;
    if (this.elements.resultCaught) this.elements.resultCaught.textContent = `${caughtCount}/${this.players.length}`;
    if (this.elements.resultCorrect) this.elements.resultCorrect.textContent = `${report.correct}/${report.total}`;
    if (this.elements.resultScore) this.elements.resultScore.textContent = `${report.accuracy}%`;
    if (this.elements.resultLines) this.elements.resultLines.textContent = String(this.linesCrossed);
    if (this.elements.resultTopEnemy) this.elements.resultTopEnemy.textContent = topEnemy ? `${topEnemy.name} (${topEnemy.count}×)` : "Tidak ada";
    if (this.elements.resultWorstLine) this.elements.resultWorstLine.textContent = topEnemy ? topEnemy.name : "Tidak ada";
    if (this.elements.resultStrategy) {
      this.elements.resultStrategy.innerHTML = this.buildStrategyAnalysis(report)
        .map((line) => `<li>${this.escapeHtml(line)}</li>`)
        .join("");
    }
    if (this.elements.lkpdText) this.elements.lkpdText.textContent = this.buildLkpdText(report);
  }

  hideResult() {
    if (this.elements.resultSection) this.elements.resultSection.hidden = true;
  }

  updateControlLabels() {
    const label = (controls) => [controls.up, controls.left, controls.down, controls.right].map(keyLabel).join(" ");
    if (this.elements.p1Controls) this.elements.p1Controls.textContent = label(this.settings.controls.p1);
    if (this.elements.p2Controls) this.elements.p2Controls.textContent = label(this.settings.controls.p2);
  }

  updateSetupText() {
    if (this.elements.p2TouchZone) this.elements.p2TouchZone.hidden = this.mode !== "Co-op";
    const icon = this.mode === "Co-op" ? "fa-user-group" : "fa-user";
    const modeLabel = this.mode === "Co-op" ? "Mode Dua Pemain" : "Mode Satu Pemain";
    if (this.elements.modeBadge) this.elements.modeBadge.innerHTML = `<i class="fa-solid ${icon}"></i> ${modeLabel}`;
    if (this.elements.gameDescription) {
      const roleText = this.mode === "Co-op" ? "P1 dan P2 sama-sama penyerang" : "P1 menghadapi penjaga secara mandiri";
      this.elements.gameDescription.textContent = `${roleText} · sekali tertangkap, keluar dari percobaan · ${QUESTIONS_PER_SESSION} soal`;
    }
  }

  setEnemyReturnPhase(active) {
    this.enemies.forEach((enemy) => enemy.setReturnPhase(active));
  }

  playerProgressPercent(player) {
    if (player.status === "completed") return 100;
    const routeLength = Math.max(1, this.arena.backLineX - this.arena.startLineX);
    if (!player.hasReachedBackLine) {
      return Math.max(0, Math.min(50, ((player.x - this.arena.startLineX) / routeLength) * 50));
    }
    return Math.max(50, Math.min(100, 50 + ((this.arena.backLineX - player.x) / routeLength) * 50));
  }

  getJourneyProgress() {
    if (this.state === GAME_STATES.FINISHED) return 100;
    if (!this.players.length) return 0;
    return Math.max(...this.players.map((player) => this.playerProgressPercent(player)));
  }

  updateJourneyHud() {
    let phase = "Belum dimulai";
    if (this.state === GAME_STATES.COUNTDOWN) phase = "Bersiap";
    else if (this.state === GAME_STATES.QUIZ) phase = "Soal muncul";
    else if (this.state === GAME_STATES.FINISHED) phase = "Simulasi selesai";
    else if ([GAME_STATES.RUNNING, GAME_STATES.PAUSED].includes(this.state)) {
      const allDone = this.players.every((player) => !player.isActive());
      const anyReturning = this.players.some((player) => player.isActive() && player.hasReachedBackLine);
      phase = allDone ? "Menunggu hasil" : anyReturning ? "Ada pemain dalam perjalanan pulang" : "Menuju Garis Belakang";
    }

    if (this.elements.journeyPhase) this.elements.journeyPhase.textContent = phase;
    if (this.elements.journeyBar) {
      const progress = Number(this.getJourneyProgress().toFixed(1));
      const track = this.elements.journeyBar.parentElement;
      this.elements.journeyBar.style.width = `${progress}%`;
      track?.setAttribute("aria-valuenow", String(Math.round(progress)));
      track?.style.setProperty("--journey-progress", `${progress}%`);
      track?.classList.toggle("returning", this.players.some((player) => player.hasReachedBackLine));
    }
  }

  circleRectCollision(circle, rect) {
    const nearestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const nearestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
    return Math.hypot(circle.x - nearestX, circle.y - nearestY) <= circle.radius;
  }

  formatDuration(seconds) {
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  updateHud() {
    if (this.elements.timer) this.elements.timer.textContent = this.formatDuration(this.elapsedActiveTime);
    if (this.elements.activePlayers) this.elements.activePlayers.textContent = `${this.players.filter((player) => player.isActive()).length}/${this.players.length}`;
    if (this.elements.caught) this.elements.caught.textContent = `${this.players.filter((player) => player.status === "caught").length}/${this.players.length}`;
    if (this.elements.backLine) this.elements.backLine.textContent = `${this.players.filter((player) => player.hasReachedBackLine).length}/${this.players.length}`;
    if (this.elements.returned) this.elements.returned.textContent = `${this.players.filter((player) => player.status === "completed").length}/${this.players.length}`;
    if (this.elements.lines) this.elements.lines.textContent = String(this.linesCrossed);
    if (this.elements.answers) this.elements.answers.textContent = `${this.questionAnsweredCount}/${this.quiz.totalQuestions || QUESTIONS_PER_SESSION}`;
    if (this.elements.score) {
      const report = this.quiz.getSessionReport();
      this.elements.score.textContent = `${report.accuracy}%`;
    }
    this.updateFocusPanel();
    this.updateJourneyHud();
  }

  updateFocusPanel() {
    if (!this.elements.focusList) return;
    this.elements.focusList.innerHTML = this.enemies.map((enemy) => (
      `<li><span>${this.escapeHtml(enemy.name)}</span><strong>${this.escapeHtml(enemy.getTargetShortLabel())}</strong></li>`
    )).join("");
  }

  updateButtons() {
    const paused = this.state === GAME_STATES.PAUSED;
    if (this.elements.pauseButton) {
      this.elements.pauseButton.disabled = ![GAME_STATES.RUNNING, GAME_STATES.PAUSED].includes(this.state);
      this.elements.pauseButton.innerHTML = paused ? '<i class="fa-solid fa-play"></i><span>Lanjut</span>' : '<i class="fa-solid fa-pause"></i><span>Pause</span>';
    }
    const locked = !this.quizReady;
    if (this.elements.soloButton) this.elements.soloButton.disabled = locked;
    if (this.elements.coopButton) this.elements.coopButton.disabled = locked;
    if (this.elements.restartButton) this.elements.restartButton.disabled = locked;
  }

  effectAtGamePoint(x, y, options = {}) {
    if (!this.canvas || !window.gsnEffects) return;
    const rect = this.canvas.getBoundingClientRect();
    const screenX = rect.left + (x / GAME_WIDTH) * rect.width;
    const screenY = rect.top + (y / GAME_HEIGHT) * rect.height;
    window.gsnEffects.burst(screenX, screenY, options);
  }

  pulseArena(type) {
    const className = type === "success" ? "pulse-success" : "pulse-danger";
    this.elements.arena?.classList.remove("pulse-success", "pulse-danger");
    void this.elements.arena?.offsetWidth;
    this.elements.arena?.classList.add(className);
    window.setTimeout(() => this.elements.arena?.classList.remove(className), 520);
  }

  setMessage(message, duration = 2) {
    this.message = message;
    this.messageTimer = duration;
  }

  setStatus(message) {
    if (this.elements.status) this.elements.status.textContent = message;
  }

  hideOverlay() {
    this.elements.overlay?.classList.remove("show");
    this.elements.overlay?.setAttribute("aria-hidden", "true");
  }

  showLoadingOverlay() {
    this.overlayPrimaryAction = "start";
    this.configureOverlay({ icon: "fa-spinner fa-spin", eyebrow: "Menyiapkan simulasi", title: "Memuat bank soal...", text: "Sistem memeriksa soal simulasi pada perangkat ini.", primary: "Memuat...", showSecondary: false, disablePrimary: true });
  }

  showReadyOverlay() {
    this.overlayPrimaryAction = "start";
    const modeLabel = this.mode === "Co-op" ? "Dua Pemain" : "Satu Pemain";
    const text = this.mode === "Co-op"
      ? "P1 dan P2 sama-sama penyerang: lewati seluruh garis penjaga, capai Garis Belakang, lalu kembali ke START tanpa tersentuh. Sekali tertangkap, pemain itu keluar dari percobaan ini."
      : "P1 menghadapi seluruh penjaga secara mandiri: lewati seluruh garis penjaga, capai Garis Belakang, lalu kembali ke START tanpa tersentuh.";
    this.configureOverlay({ icon: this.mode === "Co-op" ? "fa-people-group" : "fa-person-running", eyebrow: `Mode ${modeLabel}`, title: "Siap memulai simulasi?", text, primary: "Mulai Simulasi", showSecondary: false });
  }

  showPauseOverlay() {
    this.overlayPrimaryAction = "resume";
    this.overlaySecondaryAction = "restart";
    this.configureOverlay({ icon: "fa-pause", eyebrow: "Permainan dijeda", title: "Atur strategi tim.", text: "Posisi, waktu, dan hasil soal tetap tersimpan. Tekan Lanjut atau tombol P.", primary: "Lanjut", showSecondary: true, secondary: "Ulangi Simulasi" });
  }

  showErrorOverlay() {
    this.configureOverlay({ icon: "fa-triangle-exclamation", eyebrow: "Soal pembelajaran belum dapat dimuat", title: "Silakan muat ulang halaman.", text: "Jalankan folder proyek melalui server lokal (mis. python -m http.server 8000), lalu buka game.html kembali.", primary: "Tidak tersedia", showSecondary: false, disablePrimary: true });
  }

  configureOverlay({ icon, eyebrow, title, text, primary, showSecondary, secondary = "Ulangi", disablePrimary = false }) {
    if (!this.elements.overlay) return;
    this.elements.overlay.className = "game-overlay show";
    this.elements.overlay.setAttribute("aria-hidden", "false");
    if (this.elements.overlayIcon) this.elements.overlayIcon.className = `fa-solid ${icon}`;
    if (this.elements.overlayEyebrow) this.elements.overlayEyebrow.textContent = eyebrow;
    if (this.elements.overlayTitle) this.elements.overlayTitle.textContent = title;
    if (this.elements.overlayText) this.elements.overlayText.textContent = text;
    if (this.elements.primaryButton) {
      this.elements.primaryButton.innerHTML = `${primary} <i class="fa-solid fa-arrow-right"></i>`;
      this.elements.primaryButton.disabled = disablePrimary;
    }
    if (this.elements.secondaryButton) {
      this.elements.secondaryButton.hidden = !showSecondary;
      this.elements.secondaryButton.textContent = secondary;
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.drawArena(ctx);
    this.drawCheckpoints(ctx);
    this.enemies.forEach((enemy) => enemy.drawTrack(ctx));
    this.drawTeamLink(ctx);
    this.enemies.forEach((enemy) => enemy.draw(ctx, { colorBlind: this.settings.colorBlind }));
    if (!this.settings.hideTargetIndicators) {
      this.enemies.forEach((enemy) => enemy.drawTargetIndicator(ctx, this.players));
    }
    this.players.forEach((player) => player.draw(ctx, { colorBlind: this.settings.colorBlind }));
    this.drawCanvasMessage(ctx);
    if ([GAME_STATES.QUIZ, GAME_STATES.PAUSED].includes(this.state)) this.drawDimOverlay(ctx);
  }

  drawDimOverlay(ctx) {
    ctx.save();
    ctx.fillStyle = "rgba(7, 20, 34, 0.32)";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.restore();
  }

  drawArena(ctx) {
    const { start, end, accent, line } = this.arena.colors;
    const gradient = ctx.createLinearGradient(0, 0, GAME_WIDTH, GAME_HEIGHT);
    gradient.addColorStop(0, start);
    gradient.addColorStop(1, end);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = line;
    ctx.lineWidth = 2;
    const spacing = 64;
    for (let x = 18; x < GAME_WIDTH; x += spacing) {
      for (let y = 16; y < GAME_HEIGHT; y += spacing) {
        ctx.beginPath();
        ctx.rect(x - 10, y - 10, 20, 20);
        ctx.stroke();
      }
    }
    ctx.restore();

    ctx.strokeStyle = line;
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 40, GAME_WIDTH - 48, GAME_HEIGHT - 80);

    // Garis Sodor: satu garis membujur di tengah lapangan.
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(24, this.arena.sodorLineY);
    ctx.lineTo(GAME_WIDTH - 24, this.arena.sodorLineY);
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.font = "800 11px Poppins, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("GARIS SODOR", 32, this.arena.sodorLineY - 9);
    ctx.restore();

    // Garis-garis penjaga melintang.
    ctx.strokeStyle = line;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.76;
    this.checkpoints.forEach((checkpoint) => {
      ctx.beginPath();
      ctx.moveTo(checkpoint.x, 40);
      ctx.lineTo(checkpoint.x, GAME_HEIGHT - 40);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // Garis Awal (START).
    ctx.fillStyle = "rgba(39, 117, 216, 0.34)";
    ctx.fillRect(this.startZone.x, this.startZone.y, this.startZone.width, this.startZone.height);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.arena.startLineX, 40);
    ctx.lineTo(this.arena.startLineX, GAME_HEIGHT - 40);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 16px Poppins, sans-serif";
    ctx.textAlign = "center";
    ctx.save();
    ctx.translate(this.arena.startLineX - 22, GAME_HEIGHT / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("GARIS AWAL", 0, 6);
    ctx.restore();

    // Garis Belakang.
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(this.arena.backLineX, 40);
    ctx.lineTo(this.arena.backLineX, GAME_HEIGHT - 40);
    ctx.stroke();
    ctx.save();
    ctx.translate(this.arena.backLineX + 22, GAME_HEIGHT / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("GARIS BELAKANG", 0, 6);
    ctx.restore();
  }

  drawCheckpoints(ctx) {
    this.checkpoints.forEach((checkpoint) => {
      ctx.save();
      ctx.translate(checkpoint.x, 54);
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "800 11px Poppins, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(checkpoint.name, 0, -22);

      const spacing = this.players.length > 1 ? 16 : 0;
      this.players.forEach((player, index) => {
        const dotX = this.players.length > 1 ? (index === 0 ? -spacing : spacing) : 0;
        const crossed = player.hasReachedBackLine
          ? player.crossedReturnLines.has(checkpoint.id)
          : player.crossedOutboundLines.has(checkpoint.id);
        ctx.fillStyle = crossed ? player.color : "rgba(255,255,255,0.25)";
        ctx.beginPath();
        ctx.arc(dotX, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#172033";
        ctx.font = "800 9px Poppins, sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText(String(player.playerNumber), dotX, 1);
      });
      ctx.restore();
    });
  }

  drawTeamLink(ctx) {
    if (this.players.length < 2) return;
    const [first, second] = this.players;
    if (!first.isActive() || !second.isActive()) return;
    const distance = Math.hypot(first.x - second.x, first.y - second.y);
    if (distance > 180) return;
    ctx.save();
    ctx.strokeStyle = "rgba(247, 201, 72, 0.75)";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 7]);
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    ctx.lineTo(second.x, second.y);
    ctx.stroke();
    ctx.restore();
  }

  drawCanvasMessage(ctx) {
    if (this.messageTimer <= 0 || !this.message) return;
    ctx.save();
    ctx.font = "700 17px Poppins, sans-serif";
    const width = Math.min(760, ctx.measureText(this.message).width + 48);
    const x = (GAME_WIDTH - width) / 2;
    ctx.fillStyle = "rgba(23, 32, 51, 0.9)";
    this.roundRect(ctx, x, 92, width, 48, 16);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.message, GAME_WIDTH / 2, 116);
    ctx.restore();
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

  escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
  }
}

export { GobakSodorGame, GAME_STATES, GAME_VERSION };

document.addEventListener("DOMContentLoaded", () => {
  const game = new GobakSodorGame();
  game.init();
});
