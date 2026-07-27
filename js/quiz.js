/**
 * Sistem soal Simulasi Strategi Gobak Sodor.
 * - Mode Simulasi Video: enam soal tetap (data/questions.json → "demo"), urutan tidak berubah.
 * - Mode Latihan Kelas: enam soal diambil acak dari bank (≥12 soal) dengan kuota kategori,
 *   tanpa pengulangan dalam satu sesi.
 * Setiap sesi berdiri sendiri (tanpa riwayat lintas sesi/pulau) sehingga tetap sederhana.
 */

export const CATEGORIES = ["KKA", "PJOK", "IPS", "Seni Rupa"];
export const QUESTIONS_PER_SESSION = 6;
export const MIN_CATEGORY_QUOTA = { KKA: 2, PJOK: 1, IPS: 1, "Seni Rupa": 1 };

function shuffle(list) {
  const array = [...list];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function takeRandom(pool, count) {
  const shuffled = shuffle(pool);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export class QuizSystem {
  constructor({ source = "data/questions.json" } = {}) {
    this.source = source;
    this.demoQuestions = [];
    this.bankQuestions = [];
    this.sessionQuestions = [];
    this.cursor = 0;
    this.sessionStats = { correct: 0, total: 0 };
    this.currentQuestion = null;
  }

  async load() {
    const response = await fetch(this.source, { cache: "no-store" });
    if (!response.ok) throw new Error(`Bank soal gagal dimuat (${response.status}).`);

    const data = await response.json();
    if (!data || typeof data !== "object") throw new Error("Format bank soal tidak valid.");

    this.validateQuestionList(data.demo, { minimum: QUESTIONS_PER_SESSION, label: "demo" });
    this.validateQuestionList(data.bank, { minimum: Object.keys(MIN_CATEGORY_QUOTA).length * 3, label: "bank" });
    this.demoQuestions = data.demo.slice(0, QUESTIONS_PER_SESSION);
    this.bankQuestions = data.bank;
    return { demo: this.demoQuestions.length, bank: this.bankQuestions.length };
  }

  validateQuestionList(list, { minimum = 1, label = "soal" } = {}) {
    if (!Array.isArray(list) || list.length < minimum) {
      throw new Error(`Bank soal "${label}" harus berupa array dengan minimal ${minimum} soal.`);
    }

    const ids = new Set();
    list.forEach((question, index) => {
      const valid = question
        && typeof question.id === "string"
        && question.id.trim().length > 0
        && CATEGORIES.includes(question.category)
        && typeof question.question === "string"
        && question.question.trim().length > 0
        && Array.isArray(question.choices)
        && question.choices.length === 4
        && question.choices.every((choice) => typeof choice === "string" && choice.trim().length > 0)
        && Number.isInteger(question.answer)
        && question.answer >= 0
        && question.answer < question.choices.length
        && (question.explanation === undefined || typeof question.explanation === "string");

      if (!valid) throw new Error(`Format soal "${label}" ke-${index + 1} tidak valid.`);
      if (ids.has(question.id)) throw new Error(`ID soal ganda pada "${label}": ${question.id}.`);
      ids.add(question.id);
    });
  }

  buildRandomSession() {
    const pools = Object.fromEntries(CATEGORIES.map((category) => [
      category,
      this.bankQuestions.filter((question) => question.category === category)
    ]));

    const selected = [];
    const selectedIds = new Set();

    CATEGORIES.forEach((category) => {
      const quota = MIN_CATEGORY_QUOTA[category] ?? 0;
      takeRandom(pools[category], quota).forEach((question) => {
        selected.push(question);
        selectedIds.add(question.id);
      });
    });

    const remainingPool = this.bankQuestions.filter((question) => !selectedIds.has(question.id));
    const extraNeeded = QUESTIONS_PER_SESSION - selected.length;
    if (extraNeeded > 0) selected.push(...takeRandom(remainingPool, extraNeeded));

    return shuffle(selected).slice(0, QUESTIONS_PER_SESSION);
  }

  startSession({ demo = false } = {}) {
    this.sessionQuestions = demo ? [...this.demoQuestions] : this.buildRandomSession();
    this.cursor = 0;
    this.sessionStats = { correct: 0, total: 0 };
    this.currentQuestion = null;
    return this.sessionQuestions.length;
  }

  get totalQuestions() {
    return this.sessionQuestions.length;
  }

  hasNext() {
    return this.cursor < this.sessionQuestions.length;
  }

  getNextQuestion() {
    if (!this.hasNext()) throw new Error("Seluruh soal pada sesi ini sudah muncul.");
    const question = this.sessionQuestions[this.cursor];
    this.cursor += 1;
    this.currentQuestion = question;
    return question;
  }

  answer(choiceIndex) {
    if (!this.currentQuestion) throw new Error("Tidak ada soal aktif.");
    const question = this.currentQuestion;
    const isCorrect = choiceIndex === question.answer;
    this.sessionStats.total += 1;
    if (isCorrect) this.sessionStats.correct += 1;
    // Cegah satu soal tercatat dua kali jika terjadi double-click sangat cepat.
    this.currentQuestion = null;
    return { isCorrect, correctIndex: question.answer, selectedIndex: choiceIndex, question };
  }

  getSessionReport() {
    const { correct, total } = this.sessionStats;
    return { correct, total, accuracy: total ? Math.round((correct / total) * 100) : 0 };
  }
}
