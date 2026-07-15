import { supabaseApi } from "../../../shared/js/supabase-api.js";
import { authManager } from "../../../shared/js/auth.js";
import { PortalStore } from "../../../shared/js/store.js";
import { syncQueue } from "../../../shared/js/sync-queue.js";

const portalStore = new PortalStore();

const STOPS = ["Sumatra", "Jawa & Bali", "Kalimantan", "Sulawesi", "Papua & Nusa Tenggara"];
const QUESTION_LIMIT = 10;
const INITIAL_TIME = 180;
const WIN_MIN_CORRECT = 8;
const GAME_VERSION = "1.0.2";

const state = {
  questions: [],
  index: 0,
  score: 0,
  lives: 3,
  correct: 0,
  answered: 0,
  startAt: 0,
  timer: null,
  timeLeft: INITIAL_TIME,
  sessionId: null,
  remote: false,
  locked: false,
  finished: false,
  assignmentId: null,
  clientSessionId: crypto.randomUUID(),
  syncPending: false,
  completionDuration: 0
};

const $ = selector => document.querySelector(selector);

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function prepareQuestion(question, remote = false) {
  const choices = Array.isArray(question.choices) ? question.choices : [];
  const options = shuffle(choices.map((text, sourceIndex) => ({ text, sourceIndex })));
  return {
    id: question.id,
    category: question.category || "Campuran",
    question: question.question || question.prompt || "",
    options,
    answer: remote ? null : Number(question.answer),
    explanation: remote ? "" : (question.explanation || "")
  };
}

function renderMap() {
  const stop = Math.min(4, Math.floor(state.index / 2));
  $("[data-quiz-map]").innerHTML = STOPS.map((name, index) => `
    <div class="quiz-stop ${index < stop ? "done" : index === stop ? "active" : ""}">
      <span>${index < stop ? "✓" : index + 1}</span><strong>${name}</strong>
    </div>
  `).join("");
}

function updateHud() {
  $("[data-score]").textContent = state.score.toLocaleString("id-ID");
  $("[data-lives]").textContent = `${Math.max(0, state.lives)} ♥`;
  $("[data-time]").textContent = state.timeLeft > 0 ? `${state.timeLeft} dtk` : "Habis";
  $("[data-progress]").textContent = `${Math.min(state.index + 1, state.questions.length || QUESTION_LIMIT)}/${state.questions.length || QUESTION_LIMIT}`;
  const mode = $("[data-session-mode]");
  if (mode) mode.textContent = state.remote ? "Tugas terverifikasi" : "Mode lokal";
  renderMap();
}

async function loadRemoteAssignment(assignmentId) {
  if (!supabaseApi.configured || !authManager.authenticated) {
    throw new Error("Login diperlukan untuk mengerjakan tugas guru.");
  }

  const rows = await supabaseApi.select(
    "assignments",
    `select=id,question_set_id,game_id,is_active,games(slug)&id=eq.${encodeURIComponent(assignmentId)}&is_active=eq.true&limit=1`
  );
  const assignment = rows?.[0];
  if (!assignment) throw new Error("Tugas tidak ditemukan atau tidak lagi aktif.");
  if (assignment.games?.slug !== "jelajah-nusantara") throw new Error("Tugas ini bukan untuk Jelajah Nusantara.");
  if (!assignment.question_set_id) throw new Error("Tugas belum memiliki set soal.");

  // Edge Function memilih 10 soal secara server-side dan hanya mengirim pertanyaan tanpa kunci.
  const start = await supabaseApi.invoke("submit-game-session", {
    action: "start",
    gameSlug: "jelajah-nusantara",
    assignmentId,
    metadata: { gameVersion: GAME_VERSION }
  });
  if (!Array.isArray(start.questions) || start.questions.length !== QUESTION_LIMIT) {
    throw new Error("Server tidak mengembalikan paket soal yang lengkap.");
  }

  state.questions = start.questions.map(item => prepareQuestion(item, true));
  state.remote = true;
  state.sessionId = start.sessionId;
}

async function loadQuestions() {
  await authManager.init();
  state.assignmentId = new URLSearchParams(location.search).get("assignment");

  if (state.assignmentId) {
    await loadRemoteAssignment(state.assignmentId);
    return;
  }

  const response = await fetch("data/questions.json");
  if (!response.ok) throw new Error(`Bank soal lokal gagal dimuat (HTTP ${response.status}).`);
  const all = await response.json();
  if (!Array.isArray(all) || all.length < QUESTION_LIMIT) throw new Error("Bank soal lokal belum mencukupi.");
  state.questions = shuffle(all).slice(0, QUESTION_LIMIT).map(item => prepareQuestion(item, false));
  state.remote = false;
  state.sessionId = null;
}

function remoteContinuationNotice() {
  if (!state.remote) return "";
  if (state.lives <= 0 && state.timeLeft <= 0) return "Nyawa dan waktu telah habis. Tetap selesaikan seluruh soal agar tugas dapat dinilai server.";
  if (state.lives <= 0) return "Nyawa telah habis. Tetap selesaikan seluruh soal agar tugas dapat dinilai server.";
  if (state.timeLeft <= 0) return "Waktu telah habis. Tetap selesaikan seluruh soal agar tugas dapat dinilai server.";
  return "";
}

function renderQuestion() {
  if (state.finished) return;
  if (state.index >= state.questions.length) {
    void finish();
    return;
  }
  if (!state.remote && (state.lives <= 0 || state.timeLeft <= 0)) {
    void finish();
    return;
  }

  state.locked = false;
  const question = state.questions[state.index];
  $("[data-category]").textContent = question.category;
  $("[data-question]").textContent = question.question;
  $("[data-feedback]").textContent = remoteContinuationNotice();
  $("[data-feedback]").className = remoteContinuationNotice() ? "form-feedback warning" : "form-feedback";
  $("[data-next]").hidden = true;
  $("[data-next]").textContent = state.index === state.questions.length - 1 ? "Lihat Hasil" : "Lanjut";
  $("[data-options]").innerHTML = question.options.map((option, displayIndex) => `
    <button class="quiz-option" type="button" data-choice="${displayIndex}">
      <strong>${String.fromCharCode(65 + displayIndex)}.</strong> ${escapeHtml(option.text)}
    </button>
  `).join("");
  updateHud();
}

async function answer(displayIndex) {
  if (state.locked || state.finished) return;
  const question = state.questions[state.index];
  const option = question?.options?.[displayIndex];
  if (!question || !option) return;

  state.locked = true;
  const buttons = [...document.querySelectorAll("[data-choice]")];
  buttons.forEach(button => { button.disabled = true; });
  let correct = false;
  let explanation = "";

  try {
    if (state.remote) {
      const result = await supabaseApi.invoke("answer-question", {
        sessionId: state.sessionId,
        questionId: question.id,
        selectedIndex: option.sourceIndex
      });
      correct = Boolean(result.correct);
      explanation = result.explanation || "";
    } else {
      correct = option.sourceIndex === question.answer;
      explanation = question.explanation || "";
    }
  } catch (error) {
    state.locked = false;
    buttons.forEach(button => { button.disabled = false; });
    $("[data-feedback]").textContent = `Jawaban belum tersimpan: ${error.message}`;
    $("[data-feedback]").className = "form-feedback error";
    return;
  }

  state.answered += 1;
  if (correct) {
    state.correct += 1;
    state.score += 1000 + state.timeLeft * 2;
    buttons[displayIndex]?.classList.add("correct");
    $("[data-feedback]").textContent = `Benar! ${explanation}`.trim();
    $("[data-feedback]").className = "form-feedback success";
  } else {
    state.lives = Math.max(0, state.lives - 1);
    state.score = Math.max(0, state.score - 200);
    buttons[displayIndex]?.classList.add("wrong");
    if (!state.remote) {
      const correctDisplayIndex = question.options.findIndex(item => item.sourceIndex === question.answer);
      buttons[correctDisplayIndex]?.classList.add("correct");
    }
    const continueCopy = remoteContinuationNotice();
    $("[data-feedback]").textContent = `Belum tepat. ${explanation}${continueCopy ? ` ${continueCopy}` : ""}`.trim();
    $("[data-feedback]").className = "form-feedback error";
  }

  $("[data-next]").hidden = false;
  updateHud();
}

function next() {
  if (!state.locked || state.finished) return;
  state.index += 1;
  renderQuestion();
}

async function completeRemoteSession() {
  return supabaseApi.invoke("submit-game-session", {
    action: "complete",
    sessionId: state.sessionId,
    metadata: { gameVersion: GAME_VERSION, clientSessionId: state.clientSessionId }
  });
}

function renderResult({ won, syncMessage, verified }) {
  $("[data-question-view]").hidden = true;
  $("[data-result]").hidden = false;
  $("[data-result-icon]").textContent = won ? "🏆" : "🧭";
  $("[data-result-title]").textContent = won ? "Ekspedisi selesai!" : "Perjalanan terhenti";
  $("[data-result-copy]").textContent = `${state.correct}/${state.questions.length} benar · ${state.score.toLocaleString("id-ID")} poin · ${syncMessage}.`;
  const retry = $("[data-retry-sync]");
  if (retry) retry.hidden = !state.syncPending || !state.remote;
  const status = $("[data-result-status]");
  if (status) {
    status.textContent = verified ? "Nilai terverifikasi server" : state.remote ? "Nilai belum tersinkron" : "Hasil lokal/client";
    status.dataset.status = verified ? "verified" : "local";
  }
}

async function finish() {
  if (state.finished) return;
  state.finished = true;
  clearInterval(state.timer);

  state.completionDuration = Math.max(0, Math.round((Date.now() - state.startAt) / 1000));
  const completedAll = state.index >= state.questions.length;
  let won = state.lives > 0 && completedAll && state.timeLeft > 0;
  let verified = false;
  let syncMessage = "hasil lokal/client";
  state.syncPending = false;

  if (state.remote && state.sessionId) {
    try {
      const result = await completeRemoteSession();
      state.score = Number(result.score) || 0;
      verified = Boolean(result.verified);
      won = result.result === "won";
      syncMessage = verified ? "hasil terverifikasi server" : "hasil belum terverifikasi";
    } catch (error) {
      console.warn("Penyelesaian sesi server gagal:", error);
      state.syncPending = true;
      syncMessage = `sinkronisasi gagal: ${error.message}`;
    }
  } else if (authManager.authenticated && supabaseApi.configured) {
    const quickPayload = {
      gameSlug: "jelajah-nusantara",
      score: state.score,
      accuracy: state.questions.length ? Math.round((state.correct / state.questions.length) * 100) : 0,
      result: won ? "won" : "lost",
      mode: "Solo",
      difficulty: "Normal",
      levelId: "nusantara",
      durationSeconds: state.completionDuration,
      correctCount: state.correct,
      questionCount: state.answered,
      metadata: { gameVersion: GAME_VERSION, clientSessionId: state.clientSessionId }
    };
    try {
      if (!navigator.onLine && supabaseApi.backendMode === "supabase") throw new Error("Browser sedang offline");
      await supabaseApi.invoke("submit-game-session", { action: "quick", ...quickPayload });
      syncMessage = supabaseApi.demoMode ? "hasil masuk data demo" : "hasil tersimpan sebagai client/unverified";
    } catch (error) {
      console.warn("Hasil lokal tidak tersinkron:", error);
      syncQueue.enqueue(authManager.user.id, quickPayload, error.message);
      syncMessage = "hasil lokal masuk antrean sinkronisasi";
    }
  }

  if (!state.remote) {
    portalStore.saveJelajahResult({
      id: state.clientSessionId,
      score: state.score,
      correct: state.correct,
      total: state.answered,
      accuracy: state.answered ? Math.round((state.correct / state.answered) * 100) : 0,
      result: won ? "won" : "lost",
      durationSeconds: state.completionDuration
    });
  }

  renderResult({ won, syncMessage, verified });
}

async function retrySync() {
  if (!state.remote || !state.sessionId || !state.syncPending) return;
  const button = $("[data-retry-sync]");
  if (button) button.disabled = true;
  try {
    const result = await completeRemoteSession();
    state.score = Number(result.score) || 0;
    state.syncPending = false;
    renderResult({
      won: result.result === "won",
      syncMessage: result.verified ? "hasil terverifikasi server" : "hasil belum terverifikasi",
      verified: Boolean(result.verified)
    });
  } catch (error) {
    renderResult({ won: false, syncMessage: `sinkronisasi masih gagal: ${error.message}`, verified: false });
  } finally {
    if (button) button.disabled = false;
  }
}

async function start() {
  if (state.startAt || state.finished) return;
  $("[data-start]").disabled = true;
  $("[data-start-error]").textContent = "";
  try {
    await loadQuestions();
  } catch (error) {
    $("[data-start]").disabled = false;
    $("[data-start-error]").textContent = error.message;
    $("[data-start-error]").className = "form-feedback error";
    return;
  }

  $("[data-start-view]").hidden = true;
  $("[data-question-view]").hidden = false;
  state.startAt = Date.now();
  state.timer = setInterval(() => {
    if (state.finished || state.timeLeft <= 0) return;
    state.timeLeft = Math.max(0, state.timeLeft - 1);
    updateHud();
    if (state.timeLeft <= 0) {
      clearInterval(state.timer);
      if (state.remote) {
        const message = remoteContinuationNotice();
        if (!state.locked && message) {
          $("[data-feedback]").textContent = message;
          $("[data-feedback]").className = "form-feedback warning";
        }
      } else {
        void finish();
      }
    }
  }, 1000);
  renderQuestion();
}

function registerPortalServiceWorker() {
  if (!("serviceWorker" in navigator) || !["http:", "https:"].includes(location.protocol)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("../../service-worker.js", { scope: "../../" }).catch(error => {
      console.warn("Service worker portal gagal didaftarkan:", error);
    });
  }, { once: true });
}

document.addEventListener("DOMContentLoaded", () => {
  authManager.init().then(() => authManager.user?.id && syncQueue.flush(authManager.user.id)).catch(console.warn);
  $("[data-start]")?.addEventListener("click", () => { void start(); });
  $("[data-options]")?.addEventListener("click", event => {
    const button = event.target.closest("[data-choice]");
    if (button) void answer(Number(button.dataset.choice));
  });
  $("[data-next]")?.addEventListener("click", next);
  $("[data-retry-sync]")?.addEventListener("click", () => { void retrySync(); });
  $("[data-restart]")?.addEventListener("click", () => location.reload());
  renderMap();
  updateHud();
  registerPortalServiceWorker();
});
