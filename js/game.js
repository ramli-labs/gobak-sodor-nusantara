/**
 * Simulasi Strategi Gobak Sodor — Versi 1.4.0.
 * Simulasi pembelajaran interdisipliner (Hari 3 KKA): bermain, mengamati pola
 * penjaga, menerapkan logika jika–maka, mencoba strategi, dan merefleksikan hasil.
 * Satu arena tunggal, tanpa peta pulau/level, tanpa leaderboard, tanpa combo/shield.
 */
import { Player } from "./player.js";
import { Enemy } from "./enemy.js";
import { QuizSystem } from "./quiz.js";
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
const MAX_CHANCES = 3;
const TOUCH_CONTROLS_KEY = "gsnTouchControlsV1";
const GAME_VERSION = "1.4.0";

const GAME_STATES = Object.freeze({
  LOADING: "loading",
  READY: "ready",
  COUNTDOWN: "countdown",
  RUNNING: "running",
  QUIZ: "quiz",
  PAUSED: "paused",
  CATCH_LIMIT: "catch-limit",
  FINISHED: "finished",
  ERROR: "error"
});

function isFormControl(target) {
  return target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, button"));
}

function isDemoMode() {
  return new URLSearchParams(location.search).get("demo") === "1";
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
    this.arena = ARENA;
    this.demoMode = isDemoMode();
    this.mode = this.demoMode ? "Co-op" : "Solo";
    this.quizReady = false;
    this.state = GAME_STATES.LOADING;
    this.lastTime = 0;
    this.elapsedActiveTime = 0;
    this.chances = MAX_CHANCES;
    this.catchesSinceContinue = 0;
    this.collisions = 0;
    this.linesCrossed = 0;
    this.questionAnsweredCount = 0;
    this.decoyEvents = 0;
    this.catchesByCheckpoint = {};
    this.returnStartedAt = null;
    this.returnDuration = null;
    this.countdownRemaining = 0;
    this.lastCountdownNumber = null;
    this.messageTimer = 0;
    this.message = "";
    this.flag = { x: 880, y: GAME_HEIGHT / 2, radius: 22, carrierId: null };
    this.startZone = { x: 24, y: 40, width: START_ZONE_WIDTH - 24, height: GAME_HEIGHT - 80 };
    this.players = [];
    this.enemies = [];
    this.checkpoints = [];
    this.quizAnswered = false;
    this.activeTrip = "outbound";
    this.overlayPrimaryAction = "start";
    this.overlaySecondaryAction = "restart";
    this.roundId = "";

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
      chances: document.querySelector("[data-hud-chances]"),
      caught: document.querySelector("[data-hud-caught]"),
      lines: document.querySelector("[data-hud-lines]"),
      answers: document.querySelector("[data-hud-answers]"),
      score: document.querySelector("[data-hud-score]"),
      flag: document.querySelector("[data-hud-flag]"),
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
      resultCorrect: document.querySelector("[data-result-correct]"),
      resultCaught: document.querySelector("[data-result-caught]"),
      resultLines: document.querySelector("[data-result-lines]"),
      resultStrategy: document.querySelector("[data-result-strategy]"),
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
    this.resetGame();
    this.showLoadingOverlay();
    requestAnimationFrame((time) => this.loop(time));

    try {
      await this.quiz.load();
      this.quizReady = true;
      this.state = GAME_STATES.READY;
      this.showReadyOverlay();
      this.setStatus("Bank soal siap. Amati pola penjaga, lalu mulai simulasi.");
      this.updateButtons();
    } catch (error) {
      console.error(error);
      this.state = GAME_STATES.ERROR;
      this.showErrorOverlay(error.message);
      this.setStatus("Bank soal gagal dimuat. Jalankan proyek melalui server lokal.");
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
    if (action === "resume-safe") this.resumeAfterCatchLimit();
    if (action === "view-result") this.scrollToResult();
  }

  resetGame() {
    this.state = this.quizReady ? GAME_STATES.READY : GAME_STATES.LOADING;
    this.chances = MAX_CHANCES;
    this.catchesSinceContinue = 0;
    this.collisions = 0;
    this.linesCrossed = 0;
    this.questionAnsweredCount = 0;
    this.decoyEvents = 0;
    this.catchesByCheckpoint = {};
    this.elapsedActiveTime = 0;
    this.returnStartedAt = null;
    this.returnDuration = null;
    this.countdownRemaining = 0;
    this.lastCountdownNumber = null;
    this.message = "";
    this.messageTimer = 0;
    this.flag.carrierId = null;
    this.quizAnswered = false;
    this.activeTrip = "outbound";
    this.roundId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.quiz.startSession({ demo: this.demoMode });
    this.input.clear();

    this.checkpoints = this.arena.checkpoints.map((x, index) => ({
      id: index + 1,
      x,
      outboundAsked: false,
      returnAsked: false
    }));
    this.players = [new Player({ x: 65, y: this.mode === "Co-op" ? 225 : GAME_HEIGHT / 2, speed: PLAYER_SPEED, playerNumber: 1, color: "#2775d8", accent: "#153c78" })];
    if (this.mode === "Co-op") {
      this.players.push(new Player({ x: 65, y: 335, speed: PLAYER_SPEED, playerNumber: 2, color: "#1fa678", accent: "#0d523d" }));
    }
    this.enemies = this.arena.enemies.map((config) => new Enemy(config));

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
    this.setStatus(`${this.mode === "Co-op" ? "Dua Pemain" : "Satu Pemain"}: bersiap di garis START.`);
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
    window.gsnAudio?.startMusic();
    window.gsnAudio?.play("start");
    window.gsnEffects?.burst(window.innerWidth / 2, Math.min(window.innerHeight * 0.42, 360), { count: 28, speed: 4 });
    this.setMessage(this.mode === "Co-op" ? "Amati pola penjaga, lalu bagi peran untuk mencapai bendera." : "Amati pola penjaga dan cari waktu yang tepat untuk bergerak.", 3);
    this.setStatus(`Simulasi dimulai. Amati pola penjaga sebelum bergerak.`);
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

  resumeAfterCatchLimit() {
    this.catchesSinceContinue = 0;
    this.chances = MAX_CHANCES;
    this.hideOverlay();
    this.state = GAME_STATES.RUNNING;
    this.lastTime = performance.now();
    this.setMessage("Lanjutkan dari posisi aman. Amati ritme penjaga lebih cermat.", 2.6);
    this.setStatus("Simulasi dilanjutkan dari posisi aman terakhir.");
    this.updateButtons();
    this.updateHud();
    this.canvas.focus();
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
    const previousPositions = this.players.map((player) => player.x);
    this.players[0].update(deltaTime, this.input.getDirection("p1"), bounds);
    if (this.players[1]) this.players[1].update(deltaTime, this.input.getDirection("p2"), bounds);
    this.enemies.forEach((enemy) => enemy.update(deltaTime));

    if (this.checkCheckpoint(previousPositions)) {
      this.updateHud();
      return;
    }
    this.checkFlagCollection();
    this.checkEnemyCollisions();
    // checkEnemyCollisions dapat memindahkan state ke CATCH_LIMIT (menampilkan
    // modal pilihan); hentikan pemrosesan frame ini agar tidak tertimpa hasil.
    if (this.state === GAME_STATES.RUNNING) this.checkWinCondition();
    this.updateHud();
  }

  nearestCheckpointId(x) {
    let closest = this.checkpoints[0];
    let minDistance = Infinity;
    this.checkpoints.forEach((checkpoint) => {
      const distance = Math.abs(checkpoint.x - x);
      if (distance < minDistance) {
        minDistance = distance;
        closest = checkpoint;
      }
    });
    return closest?.id ?? 1;
  }

  checkCheckpoint(previousPositions) {
    // Perjalanan pergi: pemain mana pun dapat membuka checkpoint sebelum bendera diambil.
    if (this.flag.carrierId === null) {
      for (let playerIndex = 0; playerIndex < this.players.length; playerIndex += 1) {
        const player = this.players[playerIndex];
        const checkpoint = this.checkpoints.find((item) => (
          !item.outboundAsked
          && previousPositions[playerIndex] < item.x
          && player.x >= item.x
        ));
        if (!checkpoint) continue;
        checkpoint.outboundAsked = true;
        player.x = checkpoint.x - player.radius - 7;
        this.linesCrossed += 1;
        this.openQuiz(checkpoint, player, "outbound");
        return true;
      }
      return false;
    }

    // Perjalanan pulang: hanya pembawa bendera yang memicu soal dari kanan ke kiri.
    const carrierIndex = this.players.findIndex((player) => player.playerNumber === this.flag.carrierId);
    if (carrierIndex < 0) return false;
    const carrier = this.players[carrierIndex];
    const checkpoint = [...this.checkpoints].reverse().find((item) => (
      !item.returnAsked
      && previousPositions[carrierIndex] > item.x
      && carrier.x <= item.x
    ));
    if (!checkpoint) return false;

    checkpoint.returnAsked = true;
    carrier.x = checkpoint.x + carrier.radius + 7;
    this.linesCrossed += 1;
    this.openQuiz(checkpoint, carrier, "return");
    return true;
  }

  openQuiz(checkpoint, triggerPlayer, trip = "outbound") {
    this.state = GAME_STATES.QUIZ;
    this.input.clear();
    this.activeTrip = trip;
    this.quizAnswered = false;
    const question = this.quiz.getNextQuestion();
    const tripLabel = trip === "return" ? "Perjalanan pulang" : "Perjalanan pergi";
    const tripNumber = trip === "return"
      ? this.checkpoints.length - checkpoint.id + 1
      : checkpoint.id;
    const totalQuestionNumber = trip === "return"
      ? this.checkpoints.length + tripNumber
      : tripNumber;
    const totalRoundQuestions = this.checkpoints.length * 2;

    this.elements.quizCategory.textContent = question.category;
    this.elements.quizProgress.textContent = `${tripLabel} ${tripNumber}/${this.checkpoints.length} · Soal ${totalQuestionNumber}/${totalRoundQuestions} · P${triggerPlayer.playerNumber}`;
    this.elements.quizQuestion.textContent = question.question;
    this.elements.quizFeedback.textContent = trip === "return"
      ? "Jawab untuk membuka jalur pulang menuju START."
      : "Jawab untuk membuka zona menuju bendera.";
    this.elements.quizFeedback.className = "quiz-feedback";
    this.elements.quizContinue.hidden = true;
    this.elements.quizChoices.innerHTML = question.choices.map((choice, index) => `
      <button class="quiz-choice" type="button" data-choice-index="${index}"><span>${String.fromCharCode(65 + index)}</span>${this.escapeHtml(choice)}</button>
    `).join("");
    this.elements.quizLayer.classList.add("show");
    this.elements.quizLayer.setAttribute("aria-hidden", "false");
    this.elements.quizChoices.querySelector("button")?.focus();
    window.gsnAudio?.play("checkpoint");
    this.effectAtGamePoint(checkpoint.x, triggerPlayer.y, { count: 20, colors: [this.arena.colors.accent, "#ffffff", "#f7c948"], speed: 4 });
    this.setStatus(`${tripLabel}, garis ${checkpoint.id}: soal ${question.category}. Permainan berhenti sementara.`);
    this.updateButtons();
  }

  submitQuizAnswer(choiceIndex) {
    const result = this.quiz.answer(choiceIndex);
    this.quizAnswered = true;
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
    this.state = GAME_STATES.RUNNING;
    this.lastTime = performance.now();
    this.setMessage("Jalur terbuka. Tetap amati ritme penjaga.", 2.2);
    this.setStatus(this.activeTrip === "return" ? "Jalur pulang terbuka. Lanjut menuju START." : "Jalur pergi terbuka. Lanjut menuju bendera.");
    this.updateButtons();
    this.canvas.focus();
  }

  hideQuiz() {
    this.elements.quizLayer?.classList.remove("show");
    this.elements.quizLayer?.setAttribute("aria-hidden", "true");
  }

  checkFlagCollection() {
    if (this.flag.carrierId !== null) return;
    const collector = this.players.find((player) => this.circleCollision(player.getCircle(), this.flag));
    if (!collector) return;

    const missingOutbound = this.checkpoints.filter((checkpoint) => !checkpoint.outboundAsked).length;
    if (missingOutbound > 0) {
      if (this.messageTimer <= 0) {
        this.setMessage(`Masih ada ${missingOutbound} garis pergi yang belum dilewati.`, 2.4);
        this.setStatus("Bendera belum dapat diambil sebelum seluruh soal perjalanan pergi selesai.");
      }
      return;
    }

    this.flag.carrierId = collector.playerNumber;
    collector.hasFlag = true;
    this.returnStartedAt = this.elapsedActiveTime;
    this.setEnemyReturnPhase(true);
    window.gsnAudio?.play("flag");
    this.effectAtGamePoint(collector.x, collector.y, { count: 40, colors: [this.arena.colors.accent, "#f7c948", "#ffffff"], speed: 6 });
    this.setMessage(`P${collector.playerNumber} membawa bendera — penjaga bergerak lebih cepat. Kembali ke START!`, 3);
    this.setStatus(`Bendera diambil Pemain ${collector.playerNumber}. Perjalanan pulang kini lebih menantang.`);
  }

  checkEnemyCollisions() {
    for (const player of this.players) {
      if (player.isInvulnerable()) continue;
      const hit = this.enemies.some((enemy) => this.circleRectCollision(player.getCircle(), enemy.getRect()));
      if (!hit) continue;

      this.collisions += 1;
      this.catchesSinceContinue += 1;
      this.chances = Math.max(0, MAX_CHANCES - this.catchesSinceContinue);
      const lineId = this.nearestCheckpointId(player.x);
      this.catchesByCheckpoint[lineId] = (this.catchesByCheckpoint[lineId] || 0) + 1;

      window.gsnAudio?.play("collision");
      this.pulseArena("danger");
      this.effectAtGamePoint(player.x, player.y, { count: 26, colors: ["#e84444", "#f7c948", "#172033"], speed: 5, gravity: 0.22 });
      const wasCarrier = this.flag.carrierId === player.playerNumber;
      if (wasCarrier) this.dropFlag();

      const carrier = this.players.find((candidate) => candidate.playerNumber === this.flag.carrierId);
      const decoyEvent = this.mode === "Co-op" && !wasCarrier && Boolean(carrier);
      if (decoyEvent) this.decoyEvents += 1;

      player.reset({ keepFlag: false });
      this.setMessage("Perhatikan kembali ritme dan posisi penjaga.", 2.4);

      if (!this.settings.practiceMode && this.catchesSinceContinue >= MAX_CHANCES) {
        this.showCatchLimitOverlay();
        return;
      }

      this.setStatus(this.settings.practiceMode ? "Mode Latihan: sesi tetap berlanjut tanpa batas tertangkap." : `Kesempatan tersisa ${this.chances}.`);
    }
  }

  dropFlag() {
    const carrier = this.players.find((player) => player.playerNumber === this.flag.carrierId);
    if (carrier) carrier.hasFlag = false;
    this.flag.carrierId = null;
    this.returnStartedAt = null;
    this.setEnemyReturnPhase(false);
  }

  showCatchLimitOverlay() {
    this.state = GAME_STATES.CATCH_LIMIT;
    this.input.clear();
    this.overlayPrimaryAction = "resume-safe";
    this.overlaySecondaryAction = "restart";
    this.configureOverlay({
      icon: "fa-arrows-rotate",
      eyebrow: "Sudah tiga kali tertangkap",
      title: "Lanjutkan atau ulangi dari awal?",
      text: "Amati kembali posisi dan ritme penjaga sebelum mencoba lagi.",
      primary: "Coba Lagi dari Posisi Terakhir",
      showSecondary: true,
      secondary: "Ulangi Simulasi"
    });
    this.setStatus("Tiga kali tertangkap. Pilih untuk melanjutkan atau mengulang simulasi.");
    this.updateButtons();
  }

  checkWinCondition() {
    if (this.flag.carrierId === null) return;
    const carrier = this.players.find((player) => player.playerNumber === this.flag.carrierId);
    if (!carrier) return;
    const insideStart = carrier.x - carrier.radius <= this.startZone.x + this.startZone.width;
    if (!insideStart) return;

    const missingReturn = this.checkpoints.filter((checkpoint) => !checkpoint.returnAsked).length;
    if (missingReturn > 0) return;

    if (this.returnStartedAt !== null) this.returnDuration = Math.max(0, this.elapsedActiveTime - this.returnStartedAt);
    this.finish();
  }

  finish() {
    if (this.state === GAME_STATES.FINISHED) return;
    this.state = GAME_STATES.FINISHED;
    if (this.returnStartedAt !== null && this.returnDuration === null) {
      this.returnDuration = Math.max(0, this.elapsedActiveTime - this.returnStartedAt);
    }
    this.input.clear();

    window.gsnAudio?.stopMusic();
    window.gsnAudio?.play("win");
    window.gsnEffects?.confetti({ count: 90 });

    this.updateHud();
    this.renderResult();
    this.overlayPrimaryAction = "view-result";
    this.configureOverlay({
      icon: "fa-flag-checkered",
      eyebrow: "Simulasi selesai",
      title: "Bendera berhasil dibawa pulang!",
      text: "Lihat hasil, analisis strategi, dan pertanyaan refleksi di bawah.",
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

  mostCaughtLine() {
    const entries = Object.entries(this.catchesByCheckpoint);
    if (!entries.length) return null;
    const [id, count] = entries.reduce((best, entry) => (entry[1] > best[1] ? entry : best));
    return { id: Number(id), count };
  }

  buildStrategyAnalysis(report) {
    const lines = [];
    if (this.mode === "Co-op" && this.decoyEvents > 0) {
      lines.push(`Tim berhasil memanfaatkan pengalihan penjaga sebanyak ${this.decoyEvents} kali.`);
    }
    const worst = this.mostCaughtLine();
    if (worst) {
      lines.push(`Tim paling sering tertangkap pada garis ke-${worst.id} (${worst.count} kali).`);
    } else {
      lines.push("Tim tidak tertangkap sama sekali sepanjang simulasi ini.");
    }
    if (report.total > 0) {
      lines.push(report.accuracy >= 70
        ? "Jawaban kuis menunjukkan pemahaman logika permainan yang baik."
        : "Beberapa jawaban kuis perlu ditinjau kembali untuk memahami logika jika–maka pada permainan.");
    }
    if (this.collisions > 0) {
      lines.push("Tim perlu memperbaiki waktu bergerak setelah penjaga berpindah arah atau ritme.");
    }
    return lines;
  }

  renderResult() {
    if (!this.elements.resultSection) return;
    const report = this.quiz.getSessionReport();
    this.elements.resultSection.hidden = false;
    if (this.elements.resultTime) this.elements.resultTime.textContent = this.formatDuration(this.elapsedActiveTime);
    if (this.elements.resultCorrect) this.elements.resultCorrect.textContent = `${report.correct}/${report.total}`;
    if (this.elements.resultCaught) this.elements.resultCaught.textContent = String(this.collisions);
    if (this.elements.resultLines) this.elements.resultLines.textContent = String(this.linesCrossed);
    if (this.elements.resultStrategy) {
      this.elements.resultStrategy.innerHTML = this.buildStrategyAnalysis(report)
        .map((line) => `<li>${this.escapeHtml(line)}</li>`)
        .join("");
    }
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
      this.elements.gameDescription.textContent = `${MAX_CHANCES} kesempatan · ${this.checkpoints.length * 2} soal (${this.checkpoints.length} pergi + ${this.checkpoints.length} pulang) · ${this.arena.enemies.length} penjaga`;
    }
  }

  setEnemyReturnPhase(active) {
    this.enemies.forEach((enemy) => enemy.setReturnPhase(active));
  }

  getJourneyProgress() {
    if (this.state === GAME_STATES.FINISHED) return 100;
    const routeLength = Math.max(1, this.flag.x - 65);
    if (this.flag.carrierId === null) {
      const furthestX = Math.max(65, ...this.players.map((player) => player.x));
      return Math.max(0, Math.min(50, ((furthestX - 65) / routeLength) * 50));
    }
    const carrier = this.players.find((player) => player.playerNumber === this.flag.carrierId);
    if (!carrier) return 50;
    return Math.max(50, Math.min(100, 50 + ((this.flag.x - carrier.x) / routeLength) * 50));
  }

  updateJourneyHud() {
    let phase = "Belum dimulai";
    if (this.state === GAME_STATES.COUNTDOWN) phase = "Bersiap";
    else if (this.state === GAME_STATES.QUIZ) phase = this.activeTrip === "return" ? "Soal perjalanan pulang" : "Soal menuju bendera";
    else if (this.flag.carrierId !== null) phase = "Kembali ke START";
    else if ([GAME_STATES.RUNNING, GAME_STATES.PAUSED].includes(this.state)) phase = "Menuju bendera";
    else if (this.state === GAME_STATES.CATCH_LIMIT) phase = "Tiga kali tertangkap";
    else if (this.state === GAME_STATES.FINISHED) phase = "Simulasi selesai";

    if (this.elements.journeyPhase) this.elements.journeyPhase.textContent = phase;
    if (this.elements.journeyBar) {
      const progress = Number(this.getJourneyProgress().toFixed(1));
      const track = this.elements.journeyBar.parentElement;
      this.elements.journeyBar.style.width = `${progress}%`;
      track?.setAttribute("aria-valuenow", String(Math.round(progress)));
      track?.style.setProperty("--journey-progress", `${progress}%`);
      track?.classList.toggle("returning", this.flag.carrierId !== null);
    }
  }

  circleCollision(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y) <= a.radius + b.radius;
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
    if (this.elements.chances) {
      this.elements.chances.textContent = this.settings.practiceMode ? "∞ Latihan" : `${this.chances} tersisa`;
      this.elements.chances.closest(".hud-item")?.classList.toggle("danger", !this.settings.practiceMode && this.chances <= 1);
    }
    if (this.elements.caught) this.elements.caught.textContent = String(this.collisions);
    if (this.elements.lines) this.elements.lines.textContent = String(this.linesCrossed);
    if (this.elements.answers) this.elements.answers.textContent = `${this.questionAnsweredCount}/${this.quiz.totalQuestions || 6}`;
    if (this.elements.score) {
      const report = this.quiz.getSessionReport();
      this.elements.score.textContent = `${report.accuracy}%`;
    }
    if (this.elements.flag) {
      this.elements.flag.textContent = this.flag.carrierId ? `P${this.flag.carrierId} membawa` : "Belum";
      this.elements.flag.closest(".hud-item")?.classList.toggle("success", this.flag.carrierId !== null);
    }
    this.updateJourneyHud();
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
    this.configureOverlay({ icon: this.mode === "Co-op" ? "fa-people-group" : "fa-person-running", eyebrow: `Mode ${modeLabel}`, title: "Siap memulai simulasi?", text: `Bawa pemain menuju bendera dan kembali ke garis START tanpa kehabisan kesempatan. Maksimal ${MAX_CHANCES} kali tertangkap sebelum memilih untuk melanjutkan atau mengulang.`, primary: "Mulai Simulasi", showSecondary: false });
  }

  showPauseOverlay() {
    this.overlayPrimaryAction = "resume";
    this.overlaySecondaryAction = "restart";
    this.configureOverlay({ icon: "fa-pause", eyebrow: "Permainan dijeda", title: "Atur strategi tim.", text: "Posisi, waktu, dan hasil soal tetap tersimpan. Tekan Lanjut atau tombol P.", primary: "Lanjut", showSecondary: true, secondary: "Ulangi Simulasi" });
  }

  showErrorOverlay(detail) {
    this.configureOverlay({ icon: "fa-triangle-exclamation", eyebrow: "Bank soal tidak tersedia", title: "Simulasi belum dapat dimulai.", text: `${detail} Jalankan folder proyek melalui python -m http.server 8000, lalu buka game.html.`, primary: "Tidak tersedia", showSecondary: false, disablePrimary: true });
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
    this.drawFlag(ctx);
    this.drawTeamLink(ctx);
    this.enemies.forEach((enemy) => enemy.draw(ctx, { colorBlind: this.settings.colorBlind }));
    this.players.forEach((player) => player.draw(ctx, { colorBlind: this.settings.colorBlind }));
    this.drawCanvasMessage(ctx);
    if ([GAME_STATES.QUIZ, GAME_STATES.PAUSED, GAME_STATES.CATCH_LIMIT].includes(this.state)) this.drawDimOverlay(ctx);
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
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.76;
    [190, 370].forEach((y) => { ctx.beginPath(); ctx.moveTo(24, y); ctx.lineTo(GAME_WIDTH - 24, y); ctx.stroke(); });
    this.arena.checkpoints.forEach((x) => { ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x, GAME_HEIGHT - 40); ctx.stroke(); });
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(39, 117, 216, 0.34)";
    ctx.fillRect(this.startZone.x, this.startZone.y, this.startZone.width, this.startZone.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 18px Poppins, sans-serif";
    ctx.textAlign = "center";
    ctx.save(); ctx.translate(65, GAME_HEIGHT / 2); ctx.rotate(-Math.PI / 2); ctx.fillText("START", 0, 6); ctx.restore();

    ctx.fillStyle = `${accent}38`;
    ctx.fillRect(840, 40, 96, GAME_HEIGHT - 80);
    ctx.fillStyle = line;
    ctx.font = "700 12px Poppins, sans-serif";
    ctx.fillText("TUJUAN", 886, 68);
  }

  drawCheckpoints(ctx) {
    this.checkpoints.forEach((checkpoint) => {
      ctx.save();
      ctx.translate(checkpoint.x, 54);
      const states = [
        { x: -11, done: checkpoint.outboundAsked, symbol: "→" },
        { x: 11, done: checkpoint.returnAsked, symbol: "←" }
      ];
      states.forEach((state) => {
        ctx.fillStyle = state.done ? "#1ec28b" : this.arena.colors.accent;
        ctx.beginPath(); ctx.arc(state.x, 0, 13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#172033";
        ctx.font = "800 13px Poppins, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(state.done ? "✓" : state.symbol, state.x, 1);
      });
      ctx.restore();
    });
  }

  drawFlag(ctx) {
    if (this.flag.carrierId !== null) return;
    const { x, y } = this.flag;
    ctx.save();
    ctx.fillStyle = `${this.arena.colors.accent}48`;
    ctx.beginPath(); ctx.arc(x, y, 42 + Math.sin(performance.now() / 250) * 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#fffdf8";
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x - 6, y + 34); ctx.lineTo(x - 6, y - 35); ctx.stroke();
    ctx.fillStyle = this.arena.colors.accent;
    ctx.beginPath(); ctx.moveTo(x - 3, y - 34); ctx.lineTo(x + 31, y - 23); ctx.lineTo(x - 3, y - 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#172033";
    ctx.font = "800 12px Poppins, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("AMBIL", x, y + 56);
    ctx.restore();
  }

  drawTeamLink(ctx) {
    if (this.players.length < 2) return;
    const [first, second] = this.players;
    const distance = Math.hypot(first.x - second.x, first.y - second.y);
    if (distance > 180) return;
    ctx.save();
    ctx.strokeStyle = "rgba(247, 201, 72, 0.75)";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 7]);
    ctx.beginPath(); ctx.moveTo(first.x, first.y); ctx.lineTo(second.x, second.y); ctx.stroke();
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

export { GobakSodorGame, GAME_STATES };

document.addEventListener("DOMContentLoaded", () => {
  const game = new GobakSodorGame();
  game.init();
});
