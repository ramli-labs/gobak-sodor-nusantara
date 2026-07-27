/**
 * Sistem soal Simulasi Strategi Gobak Sodor.
 * - Bank tunggal berisi 12 soal (3 KKA, 3 PJOK, 3 IPS, 3 Seni Rupa).
 * - Mode Simulasi Video: enam soal tetap sesuai "demoOrder", urutan dan posisi
 *   pilihan tidak diacak agar proses shooting dapat diulang secara konsisten.
 * - Mode Latihan Kelas: enam soal diambil acak dengan kuota kategori
 *   (>=2 KKA, >=1 PJOK, >=1 IPS, >=1 Seni Rupa, +1 bebas), posisi pilihan
 *   diacak per soal, dan tidak ada pengulangan dalam satu sesi.
 * Setiap sesi berdiri sendiri (tanpa riwayat lintas sesi) sehingga tetap sederhana.
 */

export const CATEGORIES = ["KKA", "PJOK", "IPS", "Seni Rupa"];
export const QUESTIONS_PER_SESSION = 6;
export const BANK_SIZE = 12;
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
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

/**
 * Mengacak posisi pilihan A-D pada satu soal sambil tetap menandai kunci
 * jawaban yang benar. Nomor A/B/C/D hanya label tampilan; evaluasi jawaban
 * memakai indeks pilihan yang sudah diacak ini.
 */
function shuffleChoices(question) {
  const pairs = question.choices.map((text, index) => ({ text, correct: index === question.answer }));
  const shuffled = shuffle(pairs);
  return {
    ...question,
    choices: shuffled.map((pair) => pair.text),
    answer: shuffled.findIndex((pair) => pair.correct)
  };
}

/**
 * Validator kualitas soal untuk mode pengembangan. Hanya menulis peringatan
 * ke console — tidak pernah ditampilkan ke siswa dan tidak menghentikan gim.
 */
export function validateQuestionBank(bank) {
  const warnings = [];
  if (!Array.isArray(bank) || bank.length !== BANK_SIZE) {
    warnings.push(`Bank soal seharusnya berisi tepat ${BANK_SIZE} soal (ditemukan ${bank?.length ?? 0}).`);
  }

  const answerCounts = [0, 0, 0, 0];
  bank.forEach((question) => {
    if (!Array.isArray(question.choices) || question.choices.length !== 4) return;
    if (Number.isInteger(question.answer) && question.answer >= 0 && question.answer < 4) {
      answerCounts[question.answer] += 1;
    }

    const lengths = question.choices.map((choice) => choice.length);
    const spread = Math.max(...lengths) - Math.min(...lengths);
    if (spread > 25) {
      warnings.push(`Soal ${question.id}: selisih panjang pilihan cukup mencolok (${spread} karakter).`);
    }

    const correctText = question.choices[question.answer];
    const isLongest = correctText && lengths.every((length, index) => index === question.answer || length <= correctText.length);
    if (isLongest && spread > 10) {
      warnings.push(`Soal ${question.id}: jawaban benar adalah pilihan terpanjang, periksa agar tidak mudah ditebak.`);
    }

    if (!question.explanation || !question.explanation.trim()) {
      warnings.push(`Soal ${question.id}: penjelasan belum tersedia.`);
    }

    const uniqueChoices = new Set(question.choices.map((choice) => choice.trim().toLowerCase()));
    if (uniqueChoices.size !== question.choices.length) {
      warnings.push(`Soal ${question.id}: ada pilihan yang identik.`);
    }
  });

  const maxAnswerCount = Math.max(...answerCounts);
  const minAnswerCount = Math.min(...answerCounts);
  if (maxAnswerCount - minAnswerCount > 2) {
    warnings.push(`Distribusi kunci jawaban tidak seimbang: A/B/C/D = ${answerCounts.join("/")}.`);
  }

  if (warnings.length) {
    console.warn("[validateQuestionBank] Ditemukan potensi masalah kualitas soal:\n" + warnings.map((w) => `- ${w}`).join("\n"));
  }
  return warnings;
}

export class QuizSystem {
  constructor({ source = "data/questions.json" } = {}) {
    this.source = source;
    this.bank = [];
    this.demoOrder = [];
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

    this.validateQuestionList(data.bank, { minimum: BANK_SIZE, label: "bank" });
    if (!Array.isArray(data.demoOrder) || data.demoOrder.length !== QUESTIONS_PER_SESSION) {
      throw new Error(`"demoOrder" harus berupa array berisi ${QUESTIONS_PER_SESSION} ID soal.`);
    }
    const bankIds = new Set(data.bank.map((question) => question.id));
    const missingIds = data.demoOrder.filter((id) => !bankIds.has(id));
    if (missingIds.length) throw new Error(`ID pada "demoOrder" tidak ditemukan di bank: ${missingIds.join(", ")}.`);

    this.bank = data.bank;
    this.demoOrder = data.demoOrder;
    validateQuestionBank(this.bank);
    return { bank: this.bank.length };
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
      this.bank.filter((question) => question.category === category)
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

    const remainingPool = this.bank.filter((question) => !selectedIds.has(question.id));
    const extraNeeded = QUESTIONS_PER_SESSION - selected.length;
    if (extraNeeded > 0) selected.push(...takeRandom(remainingPool, extraNeeded));

    return shuffle(selected)
      .slice(0, QUESTIONS_PER_SESSION)
      .map((question) => shuffleChoices(question));
  }

  buildDemoSession() {
    const byId = new Map(this.bank.map((question) => [question.id, question]));
    // Urutan dan posisi pilihan TIDAK diacak pada mode demo agar pengambilan
    // gambar dapat diulang secara identik setiap kali.
    return this.demoOrder.map((id) => ({ ...byId.get(id) }));
  }

  startSession({ demo = false } = {}) {
    this.sessionQuestions = demo ? this.buildDemoSession() : this.buildRandomSession();
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
