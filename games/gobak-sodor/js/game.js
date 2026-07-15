/**
 * Gobak Sodor Nusantara — Versi 1.2.3 Final Stabil.
 * Gameplay Solo/Co-op, peta Nusantara, set soal guru, aksesibilitas,
 * streak harian, achievement, rapor, dan leaderboard lokal.
 */
import { Player } from "./player.js";
import { Enemy } from "./enemy.js";
import { QuizSystem } from "./quiz.js";
import { LEVELS, MapProgress, getLevel } from "./map.js";
import {
  initAccessibilityPanel,
  loadAccessibilitySettings,
  keyLabel
} from "./accessibility.js";
import { ACHIEVEMENTS, GamificationSystem } from "./gamification.js";
import { DifficultySettings } from "./difficulty.js";

const GAME_WIDTH = 960;
const GAME_HEIGHT = 560;
const MAX_BONUS_TIME = 130;
const START_ZONE_WIDTH = 108;
const LEADERBOARD_KEY = "gsnLeaderboardV1";
const PLAYTEST_KEY = "gsnPlaytestV1";
const MAX_PLAYTEST_RECORDS = 120;

const GAME_STATES = Object.freeze({
  LOADING: "loading",
  READY: "ready",
  COUNTDOWN: "countdown",
  RUNNING: "running",
  QUIZ: "quiz",
  PAUSED: "paused",
  WON: "won",
  LOST: "lost",
  ERROR: "error"
});

function isFormControl(target) {
  return target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, button"));
}

class InputController {
  constructor(settings) {
    this.settings = settings;
    this.keyboard = new Set();
    this.touch = new Set();
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
      const activate = (event) => {
        event.preventDefault();
        this.touch.add(direction);
        button.classList.add("pressed");
        button.setPointerCapture?.(event.pointerId);
      };
      const deactivate = (event) => {
        event.preventDefault();
        this.touch.delete(direction);
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
    this.touch.clear();
    document.querySelectorAll("[data-move].pressed").forEach((button) => button.classList.remove("pressed"));
  }

  getDirection(playerId) {
    const controls = this.settings.controls[playerId];
    const touchEnabled = playerId === "p1";
    const left = this.keyboard.has(controls.left) || (touchEnabled && this.touch.has("left"));
    const right = this.keyboard.has(controls.right) || (touchEnabled && this.touch.has("right"));
    const up = this.keyboard.has(controls.up) || (touchEnabled && this.touch.has("up"));
    const down = this.keyboard.has(controls.down) || (touchEnabled && this.touch.has("down"));
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
    this.mapProgress = new MapProgress();
    this.gamification = new GamificationSystem();
    this.difficultySettings = new DifficultySettings();
    this.difficulty = this.difficultySettings.getSelected();
    this.level = this.mapProgress.getSelected();
    this.mode = "Solo";
    this.quizReady = false;
    this.state = GAME_STATES.LOADING;
    this.lastTime = 0;
    this.roundTime = this.level.roundTime;
    this.remainingTime = this.roundTime;
    this.lives = this.level.livesSolo;
    this.maxLives = this.level.livesSolo;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.collisions = 0;
    this.questionAnsweredCount = 0;
    this.elapsedActiveTime = 0;
    this.returnStartedAt = null;
    this.returnDuration = null;
    this.playtestRecorded = false;
    this.returnGateNoticeAt = 0;
    this.countdownRemaining = 0;
    this.lastCountdownNumber = null;
    this.messageTimer = 0;
    this.message = "";
    this.flag = { x: 880, y: GAME_HEIGHT / 2, radius: 22, carrierId: null };
    this.startZone = { x: 24, y: 40, width: START_ZONE_WIDTH - 24, height: GAME_HEIGHT - 80 };
    this.players = [];
    this.enemies = [];
    this.checkpoints = [];
    this.activeCheckpoint = null;
    this.quizAnswered = false;
    this.activeTrip = "outbound";
    this.overlayPrimaryAction = "start";
    this.overlaySecondaryAction = "restart";
    this.roundId = "";
    this.roundSaved = false;
    this.roundResult = "";
    this.roundUnlocks = [];
    this.pendingUnlocks = [];
    this.newIsland = null;

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
      fullscreenButton: document.querySelector("[data-fullscreen-game]"),
      arena: document.querySelector("[data-game-arena]"),
      timer: document.querySelector("[data-hud-time]"),
      lives: document.querySelector("[data-hud-lives]"),
      score: document.querySelector("[data-hud-score]"),
      scoreEvent: document.querySelector("[data-score-event]"),
      countdown: document.querySelector("[data-game-countdown]"),
      countdownValue: document.querySelector("[data-countdown-value]"),
      countdownLabel: document.querySelector("[data-countdown-label]"),
      ruleLives: document.querySelector("[data-rule-lives]"),
      ruleFinish: document.querySelector("[data-rule-finish]"),
      questionSetHelp: document.querySelector("#question-set-help"),
      difficultyInputs: [...document.querySelectorAll("[data-difficulty]")],
      combo: document.querySelector("[data-hud-combo]"),
      shield: document.querySelector("[data-hud-shield]"),
      flag: document.querySelector("[data-hud-flag]"),
      level: document.querySelector("[data-hud-level]"),
      journeyPhase: document.querySelector("[data-hud-phase]"),
      journeyQuestions: document.querySelector("[data-hud-question-progress]"),
      journeyDifficulty: document.querySelector("[data-hud-difficulty]"),
      journeyBar: document.querySelector("[data-journey-progress-bar]"),
      status: document.querySelector("[data-game-status]"),
      soloButton: document.querySelector("[data-start-solo]"),
      coopButton: document.querySelector("[data-start-coop]"),
      modeBadge: document.querySelector("[data-mode-badge]"),
      gameTitle: document.querySelector("[data-game-title]"),
      gameDescription: document.querySelector("[data-game-description]"),
      adventureMap: document.querySelector("[data-adventure-map]"),
      levelRegion: document.querySelector("[data-level-region]"),
      levelTitle: document.querySelector("[data-level-title]"),
      levelFact: document.querySelector("[data-level-fact]"),
      currentStreak: document.querySelector("[data-current-streak]"),
      questionSet: document.querySelector("[data-question-set]"),
      p1Controls: document.querySelector("[data-p1-controls]"),
      p2Controls: document.querySelector("[data-p2-controls]"),
      quizLayer: document.querySelector("[data-quiz-layer]"),
      quizCategory: document.querySelector("[data-quiz-category]"),
      quizProgress: document.querySelector("[data-quiz-progress]"),
      quizQuestion: document.querySelector("[data-quiz-question]"),
      quizChoices: document.querySelector("[data-quiz-choices]"),
      quizFeedback: document.querySelector("[data-quiz-feedback]"),
      quizContinue: document.querySelector("[data-quiz-continue]"),
      report: document.querySelector("[data-learning-report]"),
      reportSummary: document.querySelector("[data-report-summary]"),
      reportAccuracy: document.querySelector("[data-report-accuracy]"),
      reportGrid: document.querySelector("[data-report-grid]"),
      roundUnlocks: document.querySelector("[data-round-unlocks]"),
      playtestSummary: document.querySelector("[data-playtest-summary]"),
      playtestCount: document.querySelector("[data-playtest-count]"),
      exportPlaytest: document.querySelector("[data-export-playtest]"),
      resetPlaytest: document.querySelector("[data-reset-playtest]"),
      scoreForm: document.querySelector("[data-score-form]"),
      saveFeedback: document.querySelector("[data-save-feedback]")
    };
  }

  async init() {
    if (!this.canvas || !this.ctx) return;
    this.configureCanvas();
    this.input.init();
    initAccessibilityPanel();
    this.bindControls();
    this.renderMap();
    this.syncDifficultyInputs();
    this.updatePlaytestCount();
    this.updateSetupText();
    this.updateControlLabels();
    this.resetGame();
    this.showLoadingOverlay();
    requestAnimationFrame((time) => this.loop(time));

    try {
      await this.quiz.load();
      this.quizReady = true;
      this.populateQuestionSets();
      this.state = GAME_STATES.READY;
      this.showReadyOverlay();
      this.setStatus(`${this.quiz.questions.length} soal siap dari set “${this.quiz.getActiveSetInfo().name}”.`);
      this.updateButtons();
    } catch (error) {
      console.error(error);
      this.state = GAME_STATES.ERROR;
      this.showErrorOverlay(error.message);
      this.setStatus("Bank soal gagal dimuat. Jalankan proyek melalui server lokal.");
      this.updateButtons();
    }
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
    this.elements.soloButton?.addEventListener("click", () => this.chooseModeAndStart("Solo"));
    this.elements.coopButton?.addEventListener("click", () => this.chooseModeAndStart("Co-op"));

    this.elements.difficultyInputs.forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked || [GAME_STATES.COUNTDOWN, GAME_STATES.RUNNING, GAME_STATES.QUIZ, GAME_STATES.PAUSED].includes(this.state)) return;
        this.difficulty = this.difficultySettings.select(input.value);
        this.resetGame();
        this.showReadyOverlay();
        this.syncDifficultyInputs();
        this.setStatus(`Kesulitan ${this.difficulty.label} dipilih.`);
      });
    });
    this.elements.exportPlaytest?.addEventListener("click", () => this.exportPlaytestData());
    this.elements.resetPlaytest?.addEventListener("click", () => this.resetPlaytestData());

    this.elements.adventureMap?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-level-id]");
      if (!button || button.disabled || [GAME_STATES.COUNTDOWN, GAME_STATES.RUNNING, GAME_STATES.QUIZ, GAME_STATES.PAUSED].includes(this.state)) return;
      if (this.mapProgress.select(button.dataset.levelId)) {
        this.level = getLevel(button.dataset.levelId);
        this.resetGame();
        this.showReadyOverlay();
        this.renderMap();
        this.updateSetupText();
        this.setStatus(`${this.level.title} · ${this.level.name} dipilih.`);
      }
    });

    this.elements.questionSet?.addEventListener("change", () => {
      if ([GAME_STATES.COUNTDOWN, GAME_STATES.RUNNING, GAME_STATES.QUIZ, GAME_STATES.PAUSED].includes(this.state)) return;
      const info = this.quiz.setActiveSet(this.elements.questionSet.value);
      this.updateQuestionPoolInfo();
      this.resetGame();
      this.showReadyOverlay();
      this.setStatus(`Set soal “${info.name}” aktif untuk ronde berikutnya.`);
    });

    this.elements.quizChoices?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-choice-index]");
      if (!button || this.quizAnswered) return;
      this.submitQuizAnswer(Number(button.dataset.choiceIndex));
    });
    this.elements.quizContinue?.addEventListener("click", () => this.closeQuiz());
    this.elements.scoreForm?.addEventListener("submit", (event) => this.saveScore(event));

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
      this.updateSetupText();
    });

    window.addEventListener("gsn:question-sets-change", () => {
      this.quiz.reloadQuestionSets();
      this.populateQuestionSets();
    });

    window.addEventListener("gsn:audio-change", (event) => {
      if (event.detail?.muted) window.gsnAudio?.stopMusic();
      else if (this.state === GAME_STATES.RUNNING) window.gsnAudio?.startMusic();
    });

    window.addEventListener("storage", (event) => {
      if (["gsnQuestionSetsV1", "gsnActiveQuestionSetV1"].includes(event.key)) {
        this.quiz.reloadQuestionSets();
        this.populateQuestionSets();
      }
    });

    window.addEventListener("keydown", (event) => {
      if (isFormControl(event.target)) return;
      if (event.code === "KeyP" || event.code === "Escape") {
        event.preventDefault();
        this.togglePause();
      }
      if (event.code === "Enter" && [GAME_STATES.READY, GAME_STATES.WON, GAME_STATES.LOST].includes(this.state)) {
        this.resetAndStart();
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.state === GAME_STATES.RUNNING) this.pause();
    });
  }

  chooseModeAndStart(mode) {
    if (!this.quizReady) return;
    this.mode = mode;
    this.resetGame();
    this.updateSetupText();
    this.elements.arena?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => this.start(), 300);
  }

  handleOverlayAction(action) {
    if (action === "start") this.start();
    if (action === "resume") this.resume();
    if (action === "restart") this.resetAndStart();
    if (action === "report") this.openReport();
  }

  resetGame() {
    this.level = this.mapProgress.getSelected();
    this.difficulty = this.difficultySettings.getSelected();
    this.state = this.quizReady ? GAME_STATES.READY : GAME_STATES.LOADING;
    const baseLives = this.mode === "Co-op" ? this.level.livesCoop : this.level.livesSolo;
    const minimumLives = this.mode === "Co-op" ? 3 : 2;
    this.roundTime = Math.round(this.level.roundTime * this.difficulty.timeMultiplier);
    this.remainingTime = this.roundTime;
    this.maxLives = Math.max(minimumLives, baseLives + this.difficulty.livesOffset);
    this.lives = this.maxLives;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.collisions = 0;
    this.questionAnsweredCount = 0;
    this.elapsedActiveTime = 0;
    this.returnStartedAt = null;
    this.returnDuration = null;
    this.playtestRecorded = false;
    this.returnGateNoticeAt = 0;
    this.countdownRemaining = 0;
    this.lastCountdownNumber = null;
    this.message = "";
    this.messageTimer = 0;
    this.flag.carrierId = null;
    this.activeCheckpoint = null;
    this.quizAnswered = false;
    this.activeTrip = "outbound";
    this.roundSaved = false;
    this.roundResult = "";
    this.roundUnlocks = [];
    this.newIsland = null;
    this.roundId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // Statistik rapor direset per ronde, tetapi riwayat soal dipertahankan antar-pulau.
    this.quiz.resetSession({ preserveUsed: true });
    this.input.clear();
    window.clearTimeout(this.scoreEventTimer);
    this.elements.scoreEvent?.classList.remove("show", "positive", "negative");

    this.checkpoints = this.level.checkpoints.map((x, index) => ({
      id: index + 1,
      x,
      outboundAsked: false,
      returnAsked: false
    }));
    this.players = [new Player({ x: 65, y: this.mode === "Co-op" ? 225 : GAME_HEIGHT / 2, speed: this.difficulty.playerSpeed, playerNumber: 1, color: "#2775d8", accent: "#153c78" })];
    if (this.mode === "Co-op") {
      this.players.push(new Player({ x: 65, y: 335, speed: this.difficulty.playerSpeed, playerNumber: 2, color: "#1fa678", accent: "#0d523d" }));
    }
    this.enemies = this.level.enemies.map((config) => {
      const enemy = new Enemy(config);
      enemy.configureDifficulty({
        speedMultiplier: this.difficulty.enemySpeedMultiplier,
        behaviorIntensity: this.difficulty.behaviorIntensity
      });
      return enemy;
    });

    this.hideQuiz();
    this.hideCountdown();
    this.hideReport();
    this.clearSaveFeedback();
    this.updateSetupText();
    this.updateHud();
    this.setStatus(this.quizReady ? `Siap bermain ${this.mode} di ${this.level.name}.` : "Memuat bank soal...");
  }

  start() {
    if (!this.quizReady || this.state === GAME_STATES.ERROR) {
      this.setStatus("Bank soal belum siap. Jalankan melalui server lokal dan muat ulang halaman.");
      return;
    }
    if ([GAME_STATES.COUNTDOWN, GAME_STATES.RUNNING, GAME_STATES.QUIZ].includes(this.state)) return;
    if ([GAME_STATES.WON, GAME_STATES.LOST].includes(this.state)) this.resetGame();

    const dailyUnlocks = this.gamification.touchDailyStreak();
    this.pendingUnlocks = [...new Set([...this.pendingUnlocks, ...dailyUnlocks])];
    this.updateStreakDisplay();
    this.beginCountdown();
  }

  beginCountdown() {
    this.state = GAME_STATES.COUNTDOWN;
    this.countdownRemaining = 3;
    this.lastCountdownNumber = null;
    this.lastTime = performance.now();
    window.gsnAudio?.stopMusic();
    this.hideOverlay();
    this.hideReport();
    this.showCountdown();
    this.setStatus(`${this.mode} · ${this.difficulty.label}: bersiap di ${this.level.name}.`);
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
      if (this.elements.countdownLabel) this.elements.countdownLabel.textContent = number === 1 ? "Siap!" : "Bersiap";
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
    this.setMessage(this.mode === "Co-op" ? "Bagi peran—perjalanan pulang lebih cepat!" : "Ambil bendera, lalu hadapi ritme pulang yang lebih cepat!", 3);
    this.setStatus(`${this.mode} dimulai di ${this.level.name}. Timer berjalan.`);
    this.updateButtons();
    this.updateHud();
  }

  showCountdown() {
    this.elements.countdown?.classList.add("show");
    this.elements.countdown?.setAttribute("aria-hidden", "false");
    if (this.elements.countdownValue) this.elements.countdownValue.textContent = "3";
    if (this.elements.countdownLabel) this.elements.countdownLabel.textContent = "Bersiap";
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
    this.remainingTime = Math.max(0, this.remainingTime - deltaTime);
    this.messageTimer = Math.max(0, this.messageTimer - deltaTime);
    if (this.remainingTime <= 0) {
      this.finish(false, "Waktu habis sebelum bendera kembali ke Start.");
      return;
    }

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
    this.checkWinCondition();
    this.updateHud();
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
    this.openQuiz(checkpoint, carrier, "return");
    return true;
  }

  openQuiz(checkpoint, triggerPlayer, trip = "outbound") {
    this.state = GAME_STATES.QUIZ;
    this.input.clear();
    this.activeCheckpoint = checkpoint;
    this.activeTrip = trip;
    this.quizAnswered = false;
    const question = this.quiz.getNextQuestion();
    this.updateQuestionPoolInfo();
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
    this.effectAtGamePoint(checkpoint.x, triggerPlayer.y, { count: 20, colors: [this.level.colors.accent, "#ffffff", "#f7c948"], speed: 4 });
    this.setStatus(`${tripLabel}, checkpoint ${checkpoint.id}: soal ${question.category}. Timer berhenti sementara.`);
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

    if (result.isCorrect) {
      this.changeScore(100, "Jawaban benar");
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.remainingTime = Math.min(MAX_BONUS_TIME, this.remainingTime + this.difficulty.quizTimeBonus);
      this.players.forEach((player) => player.activateShield(this.difficulty.shieldDuration));
      window.gsnAudio?.play("correct");
      this.pulseArena("success");
      window.gsnEffects?.burst(window.innerWidth / 2, window.innerHeight / 2, { count: 42, colors: ["#2ca66f", "#f7c948", "#ffffff"], speed: 6 });
      this.elements.quizFeedback.textContent = `Benar! +100 poin, +${this.difficulty.quizTimeBonus} detik, Combo x${this.combo}, dan Shield tim selama ${this.difficulty.shieldDuration} detik.`;
      this.elements.quizFeedback.className = "quiz-feedback correct";
    } else {
      this.changeScore(-10, "Jawaban salah");
      this.combo = 0;
      this.enemies.forEach((enemy) => enemy.increaseSpeed(this.difficulty.wrongSpeedMultiplier));
      window.gsnAudio?.play("wrong");
      this.pulseArena("danger");
      window.gsnEffects?.burst(window.innerWidth / 2, window.innerHeight / 2, { count: 22, colors: ["#e84444", "#172033"], speed: 4, gravity: 0.24 });
      this.elements.quizFeedback.textContent = `Belum tepat. Jawaban benar: ${result.question.choices[result.correctIndex]}. Penjaga menjadi lebih cepat.`;
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
    const shieldActive = this.players.some((player) => player.hasShield());
    if (shieldActive) window.gsnAudio?.play("shield");
    this.setMessage(shieldActive ? "Shield tim aktif—gunakan kesempatan ini!" : "Checkpoint terbuka. Tetap waspada!", 2.4);
    this.setStatus(this.activeTrip === "return" ? "Jalur pulang terbuka. Lanjut menuju START." : "Jalur pergi terbuka. Lanjut menuju bendera.");
    this.updateButtons();
    this.canvas.focus();
  }

  hideQuiz() {
    this.elements.quizLayer?.classList.remove("show");
    this.elements.quizLayer?.setAttribute("aria-hidden", "true");
  }

  changeScore(amount, reason = "Perubahan skor") {
    const previous = this.score;
    this.score = Math.max(0, this.score + amount);
    const actualChange = this.score - previous;
    if (!actualChange) return;

    if (this.elements.scoreEvent) {
      const positive = actualChange > 0;
      this.elements.scoreEvent.textContent = `${positive ? "+" : ""}${actualChange.toLocaleString("id-ID")} poin · ${reason}`;
      this.elements.scoreEvent.className = `score-event show ${positive ? "positive" : "negative"}`;
      window.clearTimeout(this.scoreEventTimer);
      this.scoreEventTimer = window.setTimeout(() => {
        this.elements.scoreEvent?.classList.remove("show");
      }, 1550);
    }
    this.updateHud();
  }

  checkFlagCollection() {
    if (this.flag.carrierId !== null) return;
    const collector = this.players.find((player) => this.circleCollision(player.getCircle(), this.flag));
    if (!collector) return;

    const missingOutbound = this.checkpoints.filter((checkpoint) => !checkpoint.outboundAsked).length;
    if (missingOutbound > 0) {
      if (this.messageTimer <= 0) {
        this.setMessage(`Masih ada ${missingOutbound} checkpoint pergi. Kembali dan jawab soalnya.`, 2.4);
        this.setStatus("Bendera belum dapat diambil sebelum seluruh soal perjalanan pergi selesai.");
      }
      return;
    }

    this.flag.carrierId = collector.playerNumber;
    collector.hasFlag = true;
    this.returnStartedAt = this.elapsedActiveTime;
    this.setEnemyReturnPhase(true);
    this.changeScore(250, "Bendera diambil");
    window.gsnAudio?.play("flag");
    this.effectAtGamePoint(collector.x, collector.y, { count: 44, colors: [this.level.colors.accent, "#f7c948", "#ffffff"], speed: 6 });
    const returnIncrease = Math.round((this.difficulty.returnSpeedMultiplier - 1) * 100);
    this.setMessage(`P${collector.playerNumber} membawa bendera—penjaga +${returnIncrease}%! Kembali ke START!`, 3);
    this.setStatus(`Bendera diambil Pemain ${collector.playerNumber}. Perjalanan pulang kini ${returnIncrease}% lebih cepat.`);
  }

  checkEnemyCollisions() {
    for (const player of this.players) {
      if (player.isInvulnerable() || player.hasShield()) continue;
      const hit = this.enemies.some((enemy) => this.circleRectCollision(player.getCircle(), enemy.getRect()));
      if (!hit) continue;

      this.collisions += 1;
      this.combo = 0;
      window.gsnAudio?.play("collision");
      this.pulseArena("danger");
      this.effectAtGamePoint(player.x, player.y, { count: 30, colors: ["#e84444", "#f7c948", "#172033"], speed: 5, gravity: 0.22 });
      const wasCarrier = this.flag.carrierId === player.playerNumber;
      if (wasCarrier) this.dropFlag();

      const carrier = this.players.find((candidate) => candidate.playerNumber === this.flag.carrierId);
      const teamworkSave = this.mode === "Co-op" && !wasCarrier && Boolean(carrier);
      if (teamworkSave) carrier.activateShield(1.5);

      player.reset({ keepFlag: false });
      if (!this.settings.practiceMode) {
        this.lives -= 1;
        this.changeScore(-50, "Tertangkap penjaga");
      }

      if (!this.settings.practiceMode && this.lives <= 0) {
        this.finish(false, "Semua nyawa tim habis. Amati ritme penjaga lalu coba lagi.");
        return;
      }

      if (teamworkSave) {
        this.setMessage(`Pemain ${player.playerNumber} mengalihkan penjaga—pembawa bendera mendapat Shield!`, 2.8);
      } else if (wasCarrier) {
        this.setMessage("Pembawa tertangkap! Bendera kembali ke tujuan.", 2.5);
      } else {
        this.setMessage(this.settings.practiceMode ? "Mode Latihan: tidak ada nyawa berkurang." : `Pemain ${player.playerNumber} tertangkap!`, 2.3);
      }
      this.setStatus(this.settings.practiceMode ? "Tersentuh penjaga tanpa penalti nyawa." : `Sisa nyawa tim ${this.lives}.`);
    }
  }

  dropFlag() {
    const carrier = this.players.find((player) => player.playerNumber === this.flag.carrierId);
    if (carrier) carrier.hasFlag = false;
    this.flag.carrierId = null;
    this.returnStartedAt = null;
    this.setEnemyReturnPhase(false);
  }

  checkWinCondition() {
    if (this.flag.carrierId === null) return;
    const carrier = this.players.find((player) => player.playerNumber === this.flag.carrierId);
    if (!carrier) return;
    const insideStart = carrier.x - carrier.radius <= this.startZone.x + this.startZone.width;
    if (!insideStart) return;

    const missingReturn = this.checkpoints.filter((checkpoint) => !checkpoint.returnAsked).length;
    if (missingReturn > 0) {
      const now = performance.now();
      if (now - this.returnGateNoticeAt > 1600) {
        this.returnGateNoticeAt = now;
        this.setMessage(`Belum selesai: jawab ${missingReturn} soal perjalanan pulang.`, 2.2);
        this.setStatus("START belum terbuka sebelum seluruh soal perjalanan pulang dijawab.");
      }
      return;
    }

    if (this.returnStartedAt !== null) this.returnDuration = Math.max(0, this.elapsedActiveTime - this.returnStartedAt);
    const modeBonus = this.mode === "Co-op" ? 300 : 0;
    const lifeBonus = this.settings.practiceMode ? 0 : this.lives * 100;
    const rawFinishBonus = 1000 + Math.floor(this.remainingTime * 10) + lifeBonus + this.maxCombo * 25 + modeBonus;
    const finishBonus = Math.round(rawFinishBonus * this.difficulty.finishScoreMultiplier);
    this.changeScore(finishBonus, `Bendera kembali · bonus ${this.difficulty.label}`);
    this.finish(true, `Bendera kembali melalui Pemain ${carrier.playerNumber}${this.settings.practiceMode ? " dalam Mode Latihan" : ` dengan ${this.lives} nyawa tim tersisa`}.`);
  }

  finish(won, detail) {
    if ([GAME_STATES.WON, GAME_STATES.LOST].includes(this.state)) return;
    this.state = won ? GAME_STATES.WON : GAME_STATES.LOST;
    if (this.returnStartedAt !== null && this.returnDuration === null) {
      this.returnDuration = Math.max(0, this.elapsedActiveTime - this.returnStartedAt);
    }
    this.roundResult = won ? "Menang" : "Belum menang";
    this.input.clear();

    const report = this.quiz.getSessionReport();
    const wasCompleted = this.mapProgress.data.completed.includes(this.level.id);
    if (won) {
      this.mapProgress.complete(this.level.id);
      if (!wasCompleted) this.newIsland = this.mapProgress.getNewlyUnlockedAfter(this.level.id);
    }
    const roundAchievementUnlocks = this.gamification.recordRound({
      won,
      levelId: this.level.id,
      mode: this.mode,
      remainingTime: this.remainingTime,
      collisions: this.collisions,
      correct: report.correct,
      total: report.total
    });
    this.roundUnlocks = [...new Set([...this.pendingUnlocks, ...roundAchievementUnlocks])];
    this.pendingUnlocks = [];
    this.recordPlaytest(won, report);

    window.gsnAudio?.stopMusic();
    window.gsnAudio?.play(won ? "win" : "lose");
    if (won) window.gsnEffects?.confetti({ count: 150 });
    else window.gsnEffects?.burst(window.innerWidth / 2, Math.min(window.innerHeight * 0.45, 390), { count: 34, colors: ["#e84444", "#2775d8", "#172033"], speed: 5 });
    if (this.roundUnlocks.length) window.setTimeout(() => window.gsnAudio?.play("achievement"), 520);

    this.renderMap();
    this.updateStreakDisplay();
    this.updateHud();
    this.renderReport();
    this.showResultOverlay(won, detail);
    this.setStatus(won ? `Menang di ${this.level.name}. Skor akhir ${this.score}.` : `Ronde selesai. ${detail}`);
    this.updateButtons();

    // Kirim ringkasan ke Portal. Listener portal akan menyinkronkan ke Supabase
    // bila pengguna sudah login; game tetap berfungsi penuh dalam mode lokal.
    window.dispatchEvent(new CustomEvent("ppn:game-finished", { detail: {
      gameSlug: "gobak-sodor",
      score: this.score,
      accuracy: report.accuracy,
      result: won ? "won" : "lost",
      mode: this.mode,
      difficulty: this.difficulty.label,
      levelId: this.level.id,
      durationSeconds: Number(this.elapsedActiveTime.toFixed(2)),
      correctCount: report.correct,
      questionCount: report.total,
      assignmentId: new URLSearchParams(location.search).get("assignment") || null,
      metadata: {
        collisions: this.collisions,
        livesRemaining: this.settings.practiceMode ? null : Math.max(0, this.lives),
        practiceMode: this.settings.practiceMode,
        questionSet: report.set.name,
        gameVersion: "1.2.3",
        clientSessionId: this.roundId
      }
    }}));
  }

  renderReport() {
    const report = this.quiz.getSessionReport();
    this.elements.report.hidden = false;
    this.elements.reportAccuracy.textContent = `${report.accuracy}%`;
    this.elements.reportSummary.textContent = `${report.correct}/${report.total} benar · Combo terbaik x${this.maxCombo} · ${this.mode} · ${this.difficulty.label} · ${report.set.name}.`;
    this.renderPlaytestSummary(report);
    this.elements.reportGrid.innerHTML = report.categories.map((item) => {
      const accuracy = item.accuracy ?? 0;
      const label = item.total ? `${item.correct}/${item.total} benar` : "Belum muncul";
      return `<article class="report-subject ${item.total ? "attempted" : ""}"><div class="report-subject-head"><strong>${item.category}</strong><span>${item.accuracy ?? "—"}${item.accuracy === null ? "" : "%"}</span></div><div class="subject-progress" role="progressbar" aria-label="Akurasi ${item.category}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${accuracy}"><span style="width:${accuracy}%"></span></div><small>${label}</small></article>`;
    }).join("");
    this.renderRoundUnlocks();
  }

  renderRoundUnlocks() {
    if (!this.elements.roundUnlocks) return;
    const achievementItems = this.roundUnlocks.map((id) => ACHIEVEMENTS.find((item) => item.id === id)).filter(Boolean);
    const pieces = [];
    if (this.state === GAME_STATES.WON) {
      pieces.push(`<article><i class="fa-solid fa-landmark"></i><div><strong>Fakta ${this.level.name}</strong><span>${this.escapeHtml(this.level.fact)}</span></div></article>`);
    }
    if (this.newIsland) {
      pieces.push(`<article><i class="fa-solid fa-lock-open"></i><div><strong>${this.newIsland.name} terbuka!</strong><span>Petualangan ${this.newIsland.title} kini dapat dipilih pada peta.</span></div></article>`);
    }
    achievementItems.forEach((item) => {
      pieces.push(`<article><i class="fa-solid ${item.icon}"></i><div><strong>Achievement: ${item.name}</strong><span>${item.description}</span></div></article>`);
    });
    this.elements.roundUnlocks.hidden = pieces.length === 0;
    this.elements.roundUnlocks.innerHTML = pieces.join("");
  }

  openReport() {
    this.hideOverlay();
    this.elements.report.hidden = false;
    this.elements.report.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  hideReport() {
    if (this.elements.report) this.elements.report.hidden = true;
    if (this.elements.roundUnlocks) {
      this.elements.roundUnlocks.hidden = true;
      this.elements.roundUnlocks.innerHTML = "";
    }
  }

  saveScore(event) {
    event.preventDefault();
    if (![GAME_STATES.WON, GAME_STATES.LOST].includes(this.state)) return;
    if (this.roundSaved) return this.setSaveFeedback("Skor ronde ini sudah tersimpan.", "success");

    const formData = new FormData(this.elements.scoreForm);
    const name = String(formData.get("playerName") || "").trim().replace(/\s+/g, " ").slice(0, 20);
    if (name.length < 2) return this.setSaveFeedback("Nama harus terdiri dari minimal 2 karakter.", "error");

    const report = this.quiz.getSessionReport();
    const current = this.readLeaderboard();
    current.push({
      id: this.roundId,
      name,
      score: this.score,
      date: new Date().toISOString(),
      level: this.level.name,
      levelId: this.level.id,
      mode: this.mode,
      difficulty: this.difficulty.label,
      difficultyId: this.difficulty.id,
      practice: this.settings.practiceMode,
      result: this.roundResult,
      accuracy: report.accuracy,
      correct: report.correct,
      total: report.total,
      maxCombo: this.maxCombo,
      collisions: this.collisions,
      questionSet: report.set.name
    });
    const sorted = current.sort((a, b) => {
        if (Boolean(a.practice) !== Boolean(b.practice)) return a.practice ? 1 : -1;
        return b.score - a.score || new Date(b.date) - new Date(a.date);
      }).slice(0, 50);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(sorted));
    this.roundSaved = true;
    this.elements.scoreForm.querySelector("button[type='submit']").disabled = true;
    this.setSaveFeedback(`Skor ${this.score.toLocaleString("id-ID")} atas nama ${name} berhasil disimpan.`, "success", true);
  }

  readPlaytestData() {
    try {
      const data = JSON.parse(localStorage.getItem(PLAYTEST_KEY) || "[]");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  recordPlaytest(won, report) {
    if (this.playtestRecorded) return;
    const records = this.readPlaytestData();
    records.push({
      id: this.roundId,
      date: new Date().toISOString(),
      gameVersion: "1.2.3",
      levelId: this.level.id,
      level: this.level.name,
      difficultyId: this.difficulty.id,
      difficulty: this.difficulty.label,
      mode: this.mode,
      practice: this.settings.practiceMode,
      won,
      score: this.score,
      accuracy: report.accuracy,
      correct: report.correct,
      totalQuestions: report.total,
      questionsAnswered: this.questionAnsweredCount,
      collisions: this.collisions,
      livesRemaining: this.settings.practiceMode ? null : Math.max(0, this.lives),
      activeSeconds: Number(this.elapsedActiveTime.toFixed(2)),
      returnSeconds: this.returnDuration === null ? null : Number(this.returnDuration.toFixed(2)),
      roundTime: this.roundTime,
      enemyCount: this.enemies.length
    });
    localStorage.setItem(PLAYTEST_KEY, JSON.stringify(records.slice(-MAX_PLAYTEST_RECORDS)));
    this.playtestRecorded = true;
    this.updatePlaytestCount();
  }

  renderPlaytestSummary(report) {
    if (!this.elements.playtestSummary) return;
    const returnText = this.returnDuration === null ? "Belum sampai pulang" : `${this.returnDuration.toFixed(1)} detik`;
    const livesText = this.settings.practiceMode ? "Mode Latihan" : `${Math.max(0, this.lives)}/${this.maxLives}`;
    this.elements.playtestSummary.innerHTML = `
      <article><span>Kesulitan</span><strong>${this.difficulty.label}</strong></article>
      <article><span>Durasi aktif</span><strong>${this.elapsedActiveTime.toFixed(1)} dtk</strong></article>
      <article><span>Perjalanan pulang</span><strong>${returnText}</strong></article>
      <article><span>Tertangkap</span><strong>${this.collisions} kali</strong></article>
      <article><span>Nyawa tersisa</span><strong>${livesText}</strong></article>
      <article><span>Akurasi</span><strong>${report.accuracy}%</strong></article>`;
  }

  updatePlaytestCount() {
    const count = this.readPlaytestData().length;
    if (this.elements.playtestCount) this.elements.playtestCount.textContent = `${count} ronde tersimpan`;
    if (this.elements.exportPlaytest) this.elements.exportPlaytest.disabled = count === 0;
    if (this.elements.resetPlaytest) this.elements.resetPlaytest.disabled = count === 0;
  }

  exportPlaytestData() {
    const data = this.readPlaytestData();
    if (!data.length) return this.setStatus("Belum ada data playtest untuk diekspor.");
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), gameVersion: "1.2.3", records: data }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gobak-sodor-playtest-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.setStatus(`${data.length} data ronde berhasil diekspor.`);
  }

  resetPlaytestData() {
    const count = this.readPlaytestData().length;
    if (!count) return;
    if (!window.confirm(`Hapus ${count} catatan playtest pada perangkat ini?`)) return;
    localStorage.removeItem(PLAYTEST_KEY);
    this.updatePlaytestCount();
    this.setStatus("Data playtest lokal telah dihapus.");
  }

  readLeaderboard() {
    try {
      const data = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  clearSaveFeedback() {
    if (!this.elements.saveFeedback) return;
    this.elements.saveFeedback.textContent = "";
    this.elements.saveFeedback.className = "save-feedback";
    const button = this.elements.scoreForm?.querySelector("button[type='submit']");
    if (button) button.disabled = false;
    this.elements.scoreForm?.reset();
  }

  setSaveFeedback(message, type = "", includeLink = false) {
    if (!this.elements.saveFeedback) return;
    this.elements.saveFeedback.className = `save-feedback ${type}`.trim();
    this.elements.saveFeedback.textContent = message;
    if (includeLink) {
      this.elements.saveFeedback.append(" ");
      const link = document.createElement("a");
      link.href = "leaderboard.html";
      link.textContent = "Lihat leaderboard";
      this.elements.saveFeedback.append(link);
    }
  }

  renderMap() {
    if (!this.elements.adventureMap) return;
    this.elements.adventureMap.innerHTML = LEVELS.map((level) => {
      const unlocked = this.mapProgress.isUnlocked(level.id);
      const completed = this.mapProgress.data.completed.includes(level.id);
      const selected = this.level.id === level.id;
      return `<button class="island-node ${selected ? "selected" : ""} ${completed ? "completed" : ""} ${!unlocked ? "locked" : ""}" type="button" data-level-id="${level.id}" ${!unlocked ? "disabled" : ""} aria-pressed="${selected}"><span class="island-order">${completed ? "✓" : level.order}</span><i class="fa-solid ${unlocked ? "fa-location-dot" : "fa-lock"}"></i><strong>${level.name}</strong><small>${level.title}</small></button>`;
    }).join('<span class="map-path" aria-hidden="true"><i class="fa-solid fa-arrow-right"></i></span>');
    this.updateLevelFact();
  }

  updateLevelFact() {
    if (this.elements.levelRegion) this.elements.levelRegion.textContent = this.level.region;
    if (this.elements.levelTitle) this.elements.levelTitle.textContent = `${this.level.title} · ${this.level.name}`;
    if (this.elements.levelFact) this.elements.levelFact.textContent = this.level.fact;
    this.updateStreakDisplay();
  }

  updateStreakDisplay() {
    const summary = this.gamification.getSummary();
    if (this.elements.currentStreak) this.elements.currentStreak.textContent = `${summary.streak} hari`;
  }

  populateQuestionSets() {
    if (!this.elements.questionSet) return;
    const sets = this.quiz.getAvailableSets();
    this.elements.questionSet.innerHTML = sets.map((set) => `<option value="${set.id}">${this.escapeHtml(set.name)} · ${set.count} soal</option>`).join("");
    this.elements.questionSet.value = this.quiz.activeSetId;
    this.updateQuestionPoolInfo();
  }

  updateQuestionPoolInfo() {
    if (!this.elements.questionSetHelp || !this.quizReady) return;
    const pool = this.quiz.getQuestionPoolStatus();
    const minimumForFullJourney = this.level.checkpoints.length * 2 * LEVELS.length;
    const warning = pool.total < minimumForFullJourney
      ? ` Set ini berisi ${pool.total} soal; pengulangan baru mungkin terjadi setelah seluruh soal habis.`
      : "";
    this.elements.questionSetHelp.textContent = `${pool.remaining} dari ${pool.total} soal belum muncul dalam perjalanan tab ini.${warning}`;
  }

  updateControlLabels() {
    const label = (controls) => [controls.up, controls.left, controls.down, controls.right].map(keyLabel).join(" ");
    if (this.elements.p1Controls) this.elements.p1Controls.textContent = label(this.settings.controls.p1);
    if (this.elements.p2Controls) this.elements.p2Controls.textContent = label(this.settings.controls.p2);
  }

  updateSetupText() {
    const icon = this.mode === "Co-op" ? "fa-user-group" : "fa-user";
    if (this.elements.modeBadge) this.elements.modeBadge.innerHTML = `<i class="fa-solid ${icon}"></i> ${this.mode} · ${this.difficulty.label}${this.settings.practiceMode ? " · Latihan" : ""}`;
    if (this.elements.gameTitle) this.elements.gameTitle.textContent = `${this.level.title} · ${this.level.name}`;
    if (this.elements.gameDescription) {
      const lives = this.settings.practiceMode ? "nyawa tanpa batas" : `${this.maxLives} nyawa tim`;
      const checkpointCount = this.checkpoints.length || this.level.checkpoints.length;
      this.elements.gameDescription.textContent = `${this.difficulty.label} · ${lives} · ${this.roundTime} detik · ${this.level.enemies.length} penjaga · ${checkpointCount * 2} soal`;
    }
  }

  syncDifficultyInputs() {
    this.elements.difficultyInputs.forEach((input) => {
      input.checked = input.value === this.difficulty.id;
      input.closest(".difficulty-option")?.classList.toggle("selected", input.checked);
    });
  }

  setEnemyReturnPhase(active) {
    this.enemies.forEach((enemy) => enemy.setReturnPhase(active, this.difficulty.returnSpeedMultiplier));
    if (active) {
      const increase = Math.round((this.difficulty.returnSpeedMultiplier - 1) * 100);
      this.setMessage(`Bendera diambil—ritme pulang naik ${increase}%!`, 2.8);
    }
  }

  getJourneyProgress() {
    if (this.state === GAME_STATES.WON) return 100;
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
    else if (this.state === GAME_STATES.WON) phase = "Bendera kembali";
    else if (this.state === GAME_STATES.LOST) phase = "Ronde selesai";

    if (this.elements.journeyPhase) this.elements.journeyPhase.textContent = phase;
    if (this.elements.journeyQuestions) this.elements.journeyQuestions.textContent = `${this.questionAnsweredCount}/${this.checkpoints.length * 2} soal`;
    if (this.elements.journeyDifficulty) this.elements.journeyDifficulty.textContent = this.difficulty.label;
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

  updateHud() {
    if (this.elements.timer) {
      const totalSeconds = Math.ceil(this.remainingTime);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      this.elements.timer.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
      this.elements.timer.closest(".hud-item")?.classList.toggle("danger", totalSeconds <= 15);
    }
    if (this.elements.lives) {
      this.elements.lives.textContent = this.settings.practiceMode ? "∞ Latihan" : `${Math.max(0, this.lives)} / ${this.maxLives} ♥`;
      this.elements.lives.closest(".hud-item")?.classList.toggle("danger", !this.settings.practiceMode && this.lives <= 1);
    }
    if (this.elements.ruleLives) this.elements.ruleLives.textContent = this.settings.practiceMode ? "Tanpa batas" : `${this.maxLives} nyawa`;
    if (this.elements.ruleFinish) this.elements.ruleFinish.textContent = `Bonus akhir ×${this.difficulty.finishScoreMultiplier.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (this.elements.score) this.elements.score.textContent = `${this.score.toLocaleString("id-ID")} poin`;
    if (this.elements.combo) {
      this.elements.combo.textContent = `x${this.combo}`;
      this.elements.combo.closest(".hud-item")?.classList.toggle("success", this.combo >= 2);
    }
    if (this.elements.shield) {
      const activePlayers = this.players.filter((player) => player.hasShield());
      this.elements.shield.textContent = activePlayers.length ? activePlayers.map((player) => `P${player.playerNumber} ${player.shieldTime.toFixed(1)}s`).join(" · ") : "Nonaktif";
      this.elements.shield.closest(".hud-item")?.classList.toggle("shield-active", activePlayers.length > 0);
    }
    if (this.elements.flag) {
      this.elements.flag.textContent = this.flag.carrierId ? `P${this.flag.carrierId} membawa` : "Belum";
      this.elements.flag.closest(".hud-item")?.classList.toggle("success", this.flag.carrierId !== null);
    }
    if (this.elements.level) this.elements.level.textContent = this.level.name;
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
    const activeRound = [GAME_STATES.COUNTDOWN, GAME_STATES.RUNNING, GAME_STATES.QUIZ, GAME_STATES.PAUSED].includes(this.state);
    if (this.elements.questionSet) this.elements.questionSet.disabled = locked || activeRound;
    if (this.elements.restartButton) this.elements.restartButton.disabled = locked;
    this.elements.difficultyInputs.forEach((input) => {
      input.disabled = locked || [GAME_STATES.COUNTDOWN, GAME_STATES.RUNNING, GAME_STATES.QUIZ, GAME_STATES.PAUSED].includes(this.state);
    });
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
    this.configureOverlay({ icon: "fa-spinner fa-spin", eyebrow: "Menyiapkan permainan", title: "Memuat bank soal dan peta...", text: "Sistem memeriksa soal bawaan serta set buatan guru pada perangkat ini.", primary: "Memuat...", showSecondary: false, disablePrimary: true });
  }

  showReadyOverlay() {
    this.overlayPrimaryAction = "start";
    this.configureOverlay({ icon: this.mode === "Co-op" ? "fa-people-group" : "fa-person-running", eyebrow: `${this.level.title} · ${this.level.name} · ${this.difficulty.label}`, title: `Siap bermain ${this.mode}?`, text: this.mode === "Co-op" ? `P1 dan P2 berbagi ${this.maxLives} nyawa. Saat pulang, penjaga bergerak ${Math.round((this.difficulty.returnSpeedMultiplier - 1) * 100)}% lebih cepat.` : `Jawab enam soal, ambil bendera, lalu kembali. Kesulitan ${this.difficulty.label}: ${this.roundTime} detik dan ${this.maxLives} nyawa.`, primary: `Mulai ${this.mode}`, showSecondary: false });
  }

  showPauseOverlay() {
    this.overlayPrimaryAction = "resume";
    this.overlaySecondaryAction = "restart";
    this.configureOverlay({ icon: "fa-pause", eyebrow: "Permainan dijeda", title: "Atur strategi tim.", text: "Posisi, waktu, skor, dan hasil soal tetap tersimpan. Tekan Lanjut atau tombol P.", primary: "Lanjut", showSecondary: true, secondary: "Ulangi Ronde" });
  }

  showResultOverlay(won, detail) {
    const report = this.quiz.getSessionReport();
    this.overlayPrimaryAction = "report";
    this.overlaySecondaryAction = "restart";
    this.configureOverlay({ icon: won ? "fa-trophy" : "fa-chart-line", eyebrow: won ? `${this.level.name} selesai` : "Ronde belajar selesai", title: won ? "Bendera berhasil dibawa pulang!" : "Gunakan rapor untuk mencoba lebih kuat.", text: `${detail} ${this.difficulty.label} · Skor ${this.score.toLocaleString("id-ID")} · Akurasi ${report.accuracy}%.`, primary: "Lihat Rapor", showSecondary: true, secondary: "Main Lagi", result: won ? "won" : "lost" });
  }

  showErrorOverlay(detail) {
    this.configureOverlay({ icon: "fa-triangle-exclamation", eyebrow: "Bank soal tidak tersedia", title: "Permainan belum dapat dimulai.", text: `${detail} Jalankan folder proyek melalui python -m http.server 8000, lalu buka game.html.`, primary: "Tidak tersedia", showSecondary: false, result: "lost", disablePrimary: true });
  }

  configureOverlay({ icon, eyebrow, title, text, primary, showSecondary, secondary = "Ulangi", result = "", disablePrimary = false }) {
    if (!this.elements.overlay) return;
    this.elements.overlay.className = `game-overlay show ${result}`.trim();
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
  }

  drawArena(ctx) {
    const { start, end, accent, line } = this.level.colors;
    const gradient = ctx.createLinearGradient(0, 0, GAME_WIDTH, GAME_HEIGHT);
    gradient.addColorStop(0, start);
    gradient.addColorStop(1, end);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = line;
    ctx.lineWidth = 2;
    const spacing = 58 + this.level.order * 5;
    for (let x = 18; x < GAME_WIDTH; x += spacing) {
      for (let y = 16; y < GAME_HEIGHT; y += spacing) {
        ctx.beginPath();
        if (this.level.order % 2 === 0) ctx.rect(x - 10, y - 10, 20, 20);
        else ctx.ellipse(x, y, 13, 24, Math.PI / 4, 0, Math.PI * 2);
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
    this.level.checkpoints.forEach((x) => { ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x, GAME_HEIGHT - 40); ctx.stroke(); });
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

    ctx.fillStyle = "rgba(255,255,255,0.86)";
    ctx.font = "800 13px Poppins, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${this.level.title.toUpperCase()} · ${this.level.name.toUpperCase()}`, 925, 528);
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
        ctx.fillStyle = state.done ? "#1ec28b" : this.level.colors.accent;
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
    ctx.fillStyle = `${this.level.colors.accent}48`;
    ctx.beginPath(); ctx.arc(x, y, 42 + Math.sin(performance.now() / 250) * 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#fffdf8";
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x - 6, y + 34); ctx.lineTo(x - 6, y - 35); ctx.stroke();
    ctx.fillStyle = this.level.colors.accent;
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
