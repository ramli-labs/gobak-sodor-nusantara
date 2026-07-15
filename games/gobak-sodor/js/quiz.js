/**
 * Sistem soal adaptif Gobak Sodor Nusantara.
 * - Memuat 100 soal bawaan dari JSON.
 * - Membaca set soal buatan guru dari Local Storage.
 * - Memilih kategori berdasarkan kelemahan belajar yang tersimpan.
 * - Mencatat hasil sesi dan membuat rapor per mata pelajaran.
 */

export const PROFILE_KEY = "gsnLearningProfileV1";
export const QUESTION_SETS_KEY = "gsnQuestionSetsV1";
export const ACTIVE_QUESTION_SET_KEY = "gsnActiveQuestionSetV1";
export const CAMPAIGN_QUESTION_HISTORY_KEY = "gsnCampaignQuestionHistoryV1";
export const MIN_PLAYABLE_QUESTIONS = 6;
export const CATEGORIES = ["Informatika", "IPS", "IPA", "Matematika", "Bahasa Indonesia"];

function emptyCategoryStats() {
  return Object.fromEntries(CATEGORIES.map((category) => [category, { correct: 0, total: 0 }]));
}

function safeParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

function getStorage() {
  return typeof window !== "undefined" ? window.localStorage : null;
}

function getSessionStorage() {
  return typeof window !== "undefined" ? window.sessionStorage : null;
}

export class QuizSystem {
  constructor({ source = "data/questions.json", storage = getStorage(), sessionStorage = getSessionStorage() } = {}) {
    this.source = source;
    this.storage = storage;
    this.sessionStorage = sessionStorage;
    this.baseQuestions = [];
    this.questions = [];
    this.questionSets = [];
    this.activeSetId = "default";
    this.usedQuestionIds = new Set();
    this.questionCycle = 1;
    this.sessionStats = emptyCategoryStats();
    this.profile = this.loadProfile();
    this.currentQuestion = null;
  }

  async load() {
    const response = await fetch(this.source, { cache: "no-store" });
    if (!response.ok) throw new Error(`Bank soal gagal dimuat (${response.status}).`);

    const questions = await response.json();
    this.validateQuestions(questions, { minimum: 100 });
    this.baseQuestions = questions;
    this.reloadQuestionSets();

    const preferred = this.storage?.getItem(ACTIVE_QUESTION_SET_KEY) || "default";
    // Simpan kembali pilihan aktual agar set lama yang sudah tidak layak dimainkan
    // otomatis kembali ke bank soal bawaan.
    this.setActiveSet(preferred, { persist: true });
    return this.questions.length;
  }

  validateQuestions(questions, { minimum = 1 } = {}) {
    if (!Array.isArray(questions) || questions.length < minimum) {
      throw new Error(`Bank soal harus berupa array dengan minimal ${minimum} soal.`);
    }

    const ids = new Set();
    questions.forEach((question, index) => {
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
        && question.answer < question.choices.length;

      if (!valid) throw new Error(`Format soal ke-${index + 1} tidak valid.`);
      if (ids.has(question.id)) throw new Error(`ID soal ganda: ${question.id}.`);
      ids.add(question.id);
    });
  }

  reloadQuestionSets() {
    const stored = safeParse(this.storage?.getItem(QUESTION_SETS_KEY), []);
    this.questionSets = Array.isArray(stored)
      ? stored.filter((set) => {
          try {
            return set && typeof set.id === "string" && typeof set.name === "string"
              && (this.validateQuestions(set.questions, { minimum: 1 }) || true);
          } catch {
            return false;
          }
        })
      : [];
    return this.getAvailableSets();
  }

  getAvailableSets() {
    return [
      { id: "default", name: "Bank Soal Nusantara (100 soal)", count: this.baseQuestions.length, builtIn: true },
      ...this.questionSets
        .filter((set) => set.questions.length >= MIN_PLAYABLE_QUESTIONS)
        .map((set) => ({ id: set.id, name: set.name, count: set.questions.length, builtIn: false }))
    ];
  }

  setActiveSet(setId = "default", { persist = true } = {}) {
    const selected = this.questionSets.find((set) => (
      set.id === setId && set.questions.length >= MIN_PLAYABLE_QUESTIONS
    ));
    this.activeSetId = selected ? selected.id : "default";
    this.questions = selected ? selected.questions.map((question) => ({ ...question })) : [...this.baseQuestions];
    this.usedQuestionIds = this.loadCampaignQuestionHistory(this.activeSetId);
    this.questionCycle = 1;
    this.resetSession({ preserveUsed: true });
    if (persist && this.storage) this.storage.setItem(ACTIVE_QUESTION_SET_KEY, this.activeSetId);
    return this.getActiveSetInfo();
  }

  getActiveSetInfo() {
    return this.getAvailableSets().find((set) => set.id === this.activeSetId) ?? this.getAvailableSets()[0];
  }

  loadCampaignQuestionHistory(setId = this.activeSetId) {
    // Riwayat utama disimpan di Local Storage agar soal tidak kembali muncul
    // setelah siswa menutup tab atau melanjutkan pulau pada hari berikutnya.
    const persistent = safeParse(this.storage?.getItem(CAMPAIGN_QUESTION_HISTORY_KEY), {});
    // Migrasi riwayat versi 1.2.2 yang sebelumnya hanya berada di Session Storage.
    const legacy = safeParse(this.sessionStorage?.getItem(CAMPAIGN_QUESTION_HISTORY_KEY), {});
    const validIds = new Set(this.questions.map((question) => question.id));
    const combined = [
      ...(Array.isArray(persistent[setId]) ? persistent[setId] : []),
      ...(Array.isArray(legacy[setId]) ? legacy[setId] : [])
    ];
    const used = [...new Set(combined)].filter((id) => validIds.has(id));
    if (this.storage) {
      persistent[setId] = used;
      this.storage.setItem(CAMPAIGN_QUESTION_HISTORY_KEY, JSON.stringify(persistent));
    }
    this.sessionStorage?.removeItem(CAMPAIGN_QUESTION_HISTORY_KEY);
    return new Set(used);
  }

  saveCampaignQuestionHistory() {
    if (!this.storage) return;
    const stored = safeParse(this.storage.getItem(CAMPAIGN_QUESTION_HISTORY_KEY), {});
    stored[this.activeSetId] = [...this.usedQuestionIds];
    this.storage.setItem(CAMPAIGN_QUESTION_HISTORY_KEY, JSON.stringify(stored));
  }

  resetSession({ preserveUsed = true } = {}) {
    if (!preserveUsed) {
      this.usedQuestionIds.clear();
      this.questionCycle = 1;
      this.saveCampaignQuestionHistory();
    }
    this.sessionStats = emptyCategoryStats();
    this.currentQuestion = null;
  }

  getQuestionPoolStatus() {
    const total = this.questions.length;
    const used = Math.min(this.usedQuestionIds.size, total);
    return { total, used, remaining: Math.max(0, total - used), cycle: this.questionCycle };
  }

  loadProfile() {
    const stored = safeParse(this.storage?.getItem(PROFILE_KEY), {});
    const stats = emptyCategoryStats();

    CATEGORIES.forEach((category) => {
      const item = stored[category];
      if (!item) return;
      stats[category] = {
        correct: Math.max(0, Number(item.correct) || 0),
        total: Math.max(0, Number(item.total) || 0)
      };
    });
    return stats;
  }

  saveProfile() {
    this.storage?.setItem(PROFILE_KEY, JSON.stringify(this.profile));
  }

  getCategoryWeight(category) {
    const stats = this.profile[category] ?? { correct: 0, total: 0 };
    if (stats.total === 0) return 2.2;
    const errorRate = 1 - stats.correct / stats.total;
    const lowSampleBoost = Math.max(0, (5 - stats.total) * 0.12);
    return 1 + errorRate * 3 + lowSampleBoost;
  }

  weightedCategoryChoice(availableCategories) {
    const weighted = availableCategories.map((category) => ({ category, weight: this.getCategoryWeight(category) }));
    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
    let cursor = Math.random() * totalWeight;
    for (const item of weighted) {
      cursor -= item.weight;
      if (cursor <= 0) return item.category;
    }
    return weighted.at(-1)?.category ?? CATEGORIES[0];
  }

  getNextQuestion() {
    if (!this.questions.length) throw new Error("Bank soal belum dimuat.");

    let available = this.questions.filter((question) => !this.usedQuestionIds.has(question.id));
    if (!available.length) {
      // Pengulangan baru diizinkan setelah seluruh soal dalam set pernah muncul.
      this.usedQuestionIds.clear();
      this.questionCycle += 1;
      this.saveCampaignQuestionHistory();
      available = [...this.questions];
    }

    const categories = [...new Set(available.map((question) => question.category))];
    const selectedCategory = this.weightedCategoryChoice(categories);
    const categoryQuestions = available.filter((question) => question.category === selectedCategory);
    const question = categoryQuestions[Math.floor(Math.random() * categoryQuestions.length)];

    this.usedQuestionIds.add(question.id);
    this.saveCampaignQuestionHistory();
    this.currentQuestion = question;
    return question;
  }

  answer(choiceIndex) {
    if (!this.currentQuestion) throw new Error("Tidak ada soal aktif.");

    const question = this.currentQuestion;
    const isCorrect = choiceIndex === question.answer;
    const category = question.category;
    this.sessionStats[category].total += 1;
    this.profile[category].total += 1;
    if (isCorrect) {
      this.sessionStats[category].correct += 1;
      this.profile[category].correct += 1;
    }
    this.saveProfile();
    // Cegah satu soal tercatat dua kali jika terjadi double-click sangat cepat.
    this.currentQuestion = null;

    return { isCorrect, correctIndex: question.answer, selectedIndex: choiceIndex, question };
  }

  getSessionReport() {
    const categories = CATEGORIES.map((category) => {
      const stats = this.sessionStats[category];
      const accuracy = stats.total ? Math.round((stats.correct / stats.total) * 100) : null;
      return { category, ...stats, accuracy };
    });

    const totals = categories.reduce((result, item) => {
      result.correct += item.correct;
      result.total += item.total;
      return result;
    }, { correct: 0, total: 0 });

    return {
      categories,
      correct: totals.correct,
      total: totals.total,
      accuracy: totals.total ? Math.round((totals.correct / totals.total) * 100) : 0,
      set: this.getActiveSetInfo()
    };
  }
}
