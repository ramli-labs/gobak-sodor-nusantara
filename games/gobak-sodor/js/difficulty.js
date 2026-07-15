/**
 * Konfigurasi tingkat kesulitan Gobak Sodor Nusantara.
 * Hanya menyimpan pilihan perangkat; seluruh perhitungan tetap dilakukan game.js.
 */

export const DIFFICULTY_KEY = "gsnDifficultyV1";

export const DIFFICULTIES = Object.freeze([
  {
    id: "santai",
    label: "Santai",
    icon: "fa-seedling",
    description: "Waktu lebih panjang, satu nyawa tambahan, dan pola penjaga lebih ringan.",
    timeMultiplier: 1.18,
    livesOffset: 1,
    enemySpeedMultiplier: 0.86,
    playerSpeed: 248,
    returnSpeedMultiplier: 1.05,
    behaviorIntensity: 0.55,
    wrongSpeedMultiplier: 1.08,
    quizTimeBonus: 4,
    shieldDuration: 4,
    finishScoreMultiplier: 0.8
  },
  {
    id: "normal",
    label: "Normal",
    icon: "fa-person-running",
    description: "Kurva utama: pola bervariasi, perjalanan pulang lebih cepat, dan waktu seimbang.",
    timeMultiplier: 1,
    livesOffset: 0,
    enemySpeedMultiplier: 1,
    playerSpeed: 230,
    returnSpeedMultiplier: 1.16,
    behaviorIntensity: 1,
    wrongSpeedMultiplier: 1.12,
    quizTimeBonus: 3,
    shieldDuration: 3,
    finishScoreMultiplier: 1
  },
  {
    id: "ahli",
    label: "Ahli",
    icon: "fa-fire-flame-curved",
    description: "Waktu singkat, nyawa terbatas, penjaga agresif, dan ritme pulang berubah tajam.",
    timeMultiplier: 0.85,
    livesOffset: -1,
    enemySpeedMultiplier: 1.18,
    playerSpeed: 220,
    returnSpeedMultiplier: 1.3,
    behaviorIntensity: 1.28,
    wrongSpeedMultiplier: 1.16,
    quizTimeBonus: 2,
    shieldDuration: 2.25,
    finishScoreMultiplier: 1.35
  }
]);

export function getDifficulty(id = "normal") {
  return DIFFICULTIES.find((item) => item.id === id) ?? DIFFICULTIES[1];
}

export class DifficultySettings {
  constructor(storage = window.localStorage) {
    this.storage = storage;
    this.selected = this.load();
  }

  load() {
    const stored = this.storage.getItem(DIFFICULTY_KEY);
    return getDifficulty(stored).id;
  }

  select(id) {
    this.selected = getDifficulty(id).id;
    this.storage.setItem(DIFFICULTY_KEY, this.selected);
    return this.getSelected();
  }

  getSelected() {
    return getDifficulty(this.selected);
  }
}
