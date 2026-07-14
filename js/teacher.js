/**
 * Mode Guru — editor set soal tanpa menyentuh kode.
 * Mendukung tambah/edit/hapus, aktivasi set, ekspor JSON, dan impor JSON.
 */
import { CATEGORIES, QUESTION_SETS_KEY, ACTIVE_QUESTION_SET_KEY, MIN_PLAYABLE_QUESTIONS } from "./quiz.js";

function safeParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanText(value, maxLength = 500) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

class TeacherEditor {
  constructor() {
    this.sets = this.readSets();
    this.selectedSetId = this.sets[0]?.id || null;
    this.editingQuestionId = null;
    this.elements = {
      setList: document.querySelector("[data-set-list]"),
      setForm: document.querySelector("[data-set-form]"),
      setId: document.querySelector("[name='setId']"),
      setName: document.querySelector("[name='setName']"),
      setDescription: document.querySelector("[name='setDescription']"),
      setHeading: document.querySelector("[data-set-heading]"),
      questionForm: document.querySelector("[data-question-form]"),
      questionId: document.querySelector("[name='questionId']"),
      category: document.querySelector("[name='category']"),
      question: document.querySelector("[name='question']"),
      answer: document.querySelector("[name='answer']"),
      questionList: document.querySelector("[data-question-list]"),
      questionEmpty: document.querySelector("[data-question-empty]"),
      newSet: document.querySelector("[data-new-set]"),
      deleteSet: document.querySelector("[data-delete-set]"),
      activateSet: document.querySelector("[data-activate-set]"),
      exportSet: document.querySelector("[data-export-set]"),
      importInput: document.querySelector("[data-import-input]"),
      importTrigger: document.querySelector("[data-import-trigger]"),
      cancelQuestion: document.querySelector("[data-cancel-question]"),
      feedback: document.querySelector("[data-teacher-feedback]"),
      totalSets: document.querySelector("[data-total-sets]"),
      totalQuestions: document.querySelector("[data-total-questions]"),
      activeName: document.querySelector("[data-active-set-name]")
    };
  }

  init() {
    if (!this.elements.setForm) return;
    this.populateCategories();
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    this.elements.setForm.addEventListener("submit", (event) => this.saveSet(event));
    this.elements.questionForm.addEventListener("submit", (event) => this.saveQuestion(event));
    this.elements.newSet.addEventListener("click", () => this.prepareNewSet());
    this.elements.deleteSet.addEventListener("click", () => this.deleteSet());
    this.elements.activateSet.addEventListener("click", () => this.activateSet());
    this.elements.exportSet.addEventListener("click", () => this.exportSet());
    this.elements.importTrigger.addEventListener("click", () => this.elements.importInput.click());
    this.elements.importInput.addEventListener("change", (event) => this.importSet(event));
    this.elements.cancelQuestion.addEventListener("click", () => this.resetQuestionForm());

    this.elements.setList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-select-set]");
      if (!button) return;
      this.selectedSetId = button.dataset.selectSet;
      this.resetQuestionForm();
      this.render();
    });

    this.elements.questionList.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-edit-question]");
      const deleteButton = event.target.closest("[data-delete-question]");
      if (editButton) this.editQuestion(editButton.dataset.editQuestion);
      if (deleteButton) this.deleteQuestion(deleteButton.dataset.deleteQuestion);
    });
  }

  readSets() {
    const data = safeParse(localStorage.getItem(QUESTION_SETS_KEY), []);
    return Array.isArray(data) ? data.filter((set) => this.validateSet(set, { silent: true })) : [];
  }

  persist() {
    localStorage.setItem(QUESTION_SETS_KEY, JSON.stringify(this.sets));
    window.dispatchEvent(new CustomEvent("gsn:question-sets-change"));
  }

  getSelectedSet() {
    return this.sets.find((set) => set.id === this.selectedSetId) || null;
  }

  populateCategories() {
    this.elements.category.innerHTML = CATEGORIES.map((category) => `<option value="${category}">${category}</option>`).join("");
  }

  prepareNewSet() {
    this.selectedSetId = null;
    this.elements.setForm.reset();
    this.elements.setId.value = "";
    this.elements.setHeading.textContent = "Buat set soal baru";
    this.resetQuestionForm();
    this.renderSetList();
    this.updateControls();
    this.elements.setName.focus();
  }

  saveSet(event) {
    event.preventDefault();
    const name = cleanText(this.elements.setName.value, 80);
    const description = cleanText(this.elements.setDescription.value, 240);
    if (name.length < 3) return this.showFeedback("Nama set minimal 3 karakter.", "error");

    const current = this.getSelectedSet();
    if (current) {
      current.name = name;
      current.description = description;
      current.updatedAt = new Date().toISOString();
    } else {
      const set = {
        id: createId("set"),
        name,
        description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        questions: []
      };
      this.sets.unshift(set);
      this.selectedSetId = set.id;
    }

    this.persist();
    this.render();
    this.showFeedback("Set soal berhasil disimpan.");
  }

  deleteSet() {
    const set = this.getSelectedSet();
    if (!set) return;
    if (!window.confirm(`Hapus set “${set.name}” beserta ${set.questions.length} soalnya?`)) return;

    this.sets = this.sets.filter((item) => item.id !== set.id);
    if (localStorage.getItem(ACTIVE_QUESTION_SET_KEY) === set.id) localStorage.setItem(ACTIVE_QUESTION_SET_KEY, "default");
    this.selectedSetId = this.sets[0]?.id || null;
    this.persist();
    this.resetQuestionForm();
    this.render();
    this.showFeedback("Set soal dihapus.");
  }

  activateSet() {
    const set = this.getSelectedSet();
    if (!set) return;
    if (set.questions.length < MIN_PLAYABLE_QUESTIONS) {
      return this.showFeedback(`Tambahkan minimal ${MIN_PLAYABLE_QUESTIONS} soal agar satu ronde tidak mengulang pertanyaan. Saat ini baru ${set.questions.length}.`, "error");
    }
    localStorage.setItem(ACTIVE_QUESTION_SET_KEY, set.id);
    this.render();
    this.showFeedback(`“${set.name}” aktif dan akan dipakai pada ronde berikutnya.`);
  }

  saveQuestion(event) {
    event.preventDefault();
    const set = this.getSelectedSet();
    if (!set) return this.showFeedback("Simpan atau pilih set soal terlebih dahulu.", "error");

    const choices = [0, 1, 2, 3].map((index) => cleanText(this.elements.questionForm.elements[`choice${index}`].value, 160));
    const item = {
      id: this.editingQuestionId || createId("q"),
      category: this.elements.category.value,
      question: cleanText(this.elements.question.value, 500),
      choices,
      answer: Number(this.elements.answer.value)
    };

    if (!this.validateQuestion(item)) return;
    const duplicate = set.questions.some((question) => question.id !== item.id && question.question.toLowerCase() === item.question.toLowerCase());
    if (duplicate) return this.showFeedback("Pertanyaan yang sama sudah ada dalam set ini.", "error");

    const existingIndex = set.questions.findIndex((question) => question.id === item.id);
    if (existingIndex >= 0) set.questions[existingIndex] = item;
    else set.questions.push(item);
    set.updatedAt = new Date().toISOString();

    this.persist();
    this.resetQuestionForm();
    this.render();
    this.showFeedback(existingIndex >= 0 ? "Perubahan soal disimpan." : "Soal baru ditambahkan.");
  }

  validateQuestion(question, { silent = false } = {}) {
    const valid = question
      && typeof question.id === "string"
      && CATEGORIES.includes(question.category)
      && typeof question.question === "string" && question.question.length >= 5
      && Array.isArray(question.choices) && question.choices.length === 4
      && question.choices.every((choice) => typeof choice === "string" && choice.length >= 1)
      && Number.isInteger(question.answer) && question.answer >= 0 && question.answer <= 3;
    if (!valid && !silent) this.showFeedback("Lengkapi pertanyaan, empat pilihan, dan jawaban benar.", "error");
    return valid;
  }

  validateSet(set, { silent = false } = {}) {
    const valid = set && typeof set.id === "string" && typeof set.name === "string"
      && Array.isArray(set.questions) && set.questions.every((question) => this.validateQuestion(question, { silent: true }));
    if (!valid && !silent) this.showFeedback("Format set soal tidak valid.", "error");
    return valid;
  }

  editQuestion(questionId) {
    const question = this.getSelectedSet()?.questions.find((item) => item.id === questionId);
    if (!question) return;
    this.editingQuestionId = question.id;
    this.elements.questionId.value = question.id;
    this.elements.category.value = question.category;
    this.elements.question.value = question.question;
    question.choices.forEach((choice, index) => {
      this.elements.questionForm.elements[`choice${index}`].value = choice;
    });
    this.elements.answer.value = String(question.answer);
    this.elements.questionForm.querySelector("[data-question-submit]").innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan Perubahan';
    this.elements.cancelQuestion.hidden = false;
    this.elements.question.scrollIntoView({ behavior: "smooth", block: "center" });
    this.elements.question.focus();
  }

  deleteQuestion(questionId) {
    const set = this.getSelectedSet();
    const question = set?.questions.find((item) => item.id === questionId);
    if (!set || !question) return;
    if (!window.confirm(`Hapus soal “${question.question}”?`)) return;
    set.questions = set.questions.filter((item) => item.id !== questionId);
    set.updatedAt = new Date().toISOString();
    this.persist();
    this.resetQuestionForm();
    this.render();
    this.showFeedback("Soal dihapus.");
  }

  resetQuestionForm() {
    this.editingQuestionId = null;
    this.elements.questionForm.reset();
    this.elements.questionId.value = "";
    this.elements.answer.value = "0";
    this.elements.questionForm.querySelector("[data-question-submit]").innerHTML = '<i class="fa-solid fa-plus"></i> Tambahkan Soal';
    this.elements.cancelQuestion.hidden = true;
  }

  exportSet() {
    const set = this.getSelectedSet();
    if (!set) return;
    const blob = new Blob([JSON.stringify(set, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${set.name.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "set-soal"}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.showFeedback("File JSON berhasil diekspor.");
  }

  async importSet(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      if (!candidates.length || !candidates.every((set) => this.validateSet(set, { silent: true }))) throw new Error("Struktur JSON tidak sesuai.");

      const imported = candidates.map((set) => ({
        ...set,
        id: createId("set"),
        name: `${cleanText(set.name, 70)} (Impor)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        questions: set.questions.map((question) => ({ ...question, id: createId("q") }))
      }));
      this.sets.unshift(...imported);
      this.selectedSetId = imported[0].id;
      this.persist();
      this.render();
      this.showFeedback(`${imported.length} set soal berhasil diimpor.`);
    } catch (error) {
      this.showFeedback(`Impor gagal: ${error.message}`, "error");
    }
  }

  render() {
    this.renderSetList();
    this.renderSelectedSet();
    this.renderQuestions();
    this.renderStats();
    this.updateControls();
  }

  renderSetList() {
    const activeId = localStorage.getItem(ACTIVE_QUESTION_SET_KEY) || "default";
    if (!this.sets.length) {
      this.elements.setList.innerHTML = '<div class="teacher-empty"><i class="fa-solid fa-folder-open"></i><strong>Belum ada set buatan.</strong><span>Tekan “Set Baru” untuk mulai.</span></div>';
      return;
    }
    this.elements.setList.innerHTML = this.sets.map((set) => `
      <button class="set-list-item ${set.id === this.selectedSetId ? "active" : ""}" type="button" data-select-set="${set.id}">
        <span><strong>${this.escapeHtml(set.name)}</strong><small>${set.questions.length} soal · ${set.id === activeId ? "Aktif di game" : "Tersimpan"}</small></span>
        <i class="fa-solid ${set.id === activeId ? "fa-circle-check" : "fa-chevron-right"}"></i>
      </button>
    `).join("");
  }

  renderSelectedSet() {
    const set = this.getSelectedSet();
    if (!set) {
      this.elements.setForm.reset();
      this.elements.setId.value = "";
      this.elements.setHeading.textContent = "Buat set soal baru";
      return;
    }
    this.elements.setId.value = set.id;
    this.elements.setName.value = set.name;
    this.elements.setDescription.value = set.description || "";
    this.elements.setHeading.textContent = "Informasi set soal";
  }

  renderQuestions() {
    const set = this.getSelectedSet();
    const questions = set?.questions || [];
    this.elements.questionEmpty.hidden = questions.length > 0;
    this.elements.questionList.innerHTML = questions.map((question, index) => `
      <article class="teacher-question-card">
        <div class="teacher-question-index">${index + 1}</div>
        <div class="teacher-question-content">
          <span class="badge">${question.category}</span>
          <h3>${this.escapeHtml(question.question)}</h3>
          <ol type="A">${question.choices.map((choice, choiceIndex) => `<li class="${choiceIndex === question.answer ? "correct-answer" : ""}">${this.escapeHtml(choice)}${choiceIndex === question.answer ? " ✓" : ""}</li>`).join("")}</ol>
        </div>
        <div class="teacher-question-actions">
          <button class="icon-button" type="button" data-edit-question="${question.id}" aria-label="Edit soal"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-button danger-button" type="button" data-delete-question="${question.id}" aria-label="Hapus soal"><i class="fa-solid fa-trash"></i></button>
        </div>
      </article>
    `).join("");
  }

  renderStats() {
    const totalQuestions = this.sets.reduce((sum, set) => sum + set.questions.length, 0);
    const activeId = localStorage.getItem(ACTIVE_QUESTION_SET_KEY) || "default";
    const active = this.sets.find((set) => set.id === activeId);
    this.elements.totalSets.textContent = String(this.sets.length);
    this.elements.totalQuestions.textContent = String(totalQuestions);
    this.elements.activeName.textContent = active?.name || "Bank Soal Nusantara";
  }

  updateControls() {
    const hasSet = Boolean(this.getSelectedSet());
    this.elements.questionForm.querySelectorAll("input, select, textarea, button").forEach((element) => {
      if (element === this.elements.cancelQuestion) return;
      element.disabled = !hasSet;
    });
    this.elements.deleteSet.disabled = !hasSet;
    this.elements.activateSet.disabled = !hasSet || this.getSelectedSet().questions.length < MIN_PLAYABLE_QUESTIONS;
    this.elements.activateSet.title = hasSet && this.getSelectedSet().questions.length < MIN_PLAYABLE_QUESTIONS
      ? `Minimal ${MIN_PLAYABLE_QUESTIONS} soal diperlukan`
      : "Aktifkan set untuk permainan";
    this.elements.exportSet.disabled = !hasSet;
  }

  showFeedback(message, type = "success") {
    this.elements.feedback.textContent = message;
    this.elements.feedback.className = `teacher-feedback ${type}`;
  }

  escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
  }
}

document.addEventListener("DOMContentLoaded", () => new TeacherEditor().init());
