/**
 * Peta Petualangan Nusantara.
 * Konfigurasi berikut memakai waktu dasar Mode Normal. Tingkat Santai/Ahli
 * mengubah waktu, nyawa, kecepatan, dan intensitas pola melalui difficulty.js.
 */

export const MAP_PROGRESS_KEY = "gsnMapProgressV1";

export const LEVELS = Object.freeze([
  {
    id: "jawa",
    order: 1,
    name: "Jawa",
    title: "Gobak Sodor",
    region: "Jawa Tengah & Jawa Timur",
    fact: "Gobak Sodor menekankan pembagian peran: penjaga garis dan pelari harus membaca ruang serta bekerja sebagai tim.",
    colors: { start: "#178260", end: "#0c5d4a", accent: "#f7c948", line: "#fff8df" },
    roundTime: 78,
    livesSolo: 3,
    livesCoop: 4,
    checkpoints: [285, 545, 760],
    enemies: [
      { orientation: "horizontal", fixed: 180, min: 130, max: 840, position: 290, speed: 150, direction: 1, label: "H1", behavior: "steady" },
      { orientation: "horizontal", fixed: 395, min: 130, max: 840, position: 670, speed: 142, direction: -1, label: "H2", behavior: "pause", behaviorInterval: 4.8, pauseDuration: 0.42, phase: 1.2 },
      { orientation: "vertical", fixed: 555, min: 75, max: 485, position: 390, speed: 137, direction: -1, label: "V", behavior: "steady" }
    ]
  },
  {
    id: "sumatra",
    order: 2,
    name: "Sumatra",
    title: "Hadang",
    region: "Sumatra",
    fact: "Hadang dikenal sebagai olahraga tradisional beregu. Kecepatan penting, tetapi ketepatan membaca gerak lawan lebih menentukan.",
    colors: { start: "#9a4f24", end: "#5b2d20", accent: "#ffd166", line: "#fff4de" },
    roundTime: 74,
    livesSolo: 3,
    livesCoop: 4,
    checkpoints: [270, 520, 750],
    enemies: [
      { orientation: "horizontal", fixed: 155, min: 115, max: 845, position: 355, speed: 158, direction: -1, label: "H1", behavior: "steady" },
      { orientation: "horizontal", fixed: 405, min: 115, max: 845, position: 665, speed: 148, direction: 1, label: "H2", behavior: "pulse", phase: 0.8 },
      { orientation: "vertical", fixed: 405, min: 70, max: 490, position: 200, speed: 143, direction: 1, label: "V1", behavior: "pause", behaviorInterval: 4.3, pauseDuration: 0.38, phase: 2.1 },
      { orientation: "vertical", fixed: 690, min: 70, max: 490, position: 430, speed: 146, direction: -1, label: "V2", behavior: "steady" }
    ]
  },
  {
    id: "kalimantan",
    order: 3,
    name: "Kalimantan",
    title: "Hadang Rimba",
    region: "Kalimantan",
    fact: "Permainan beregu di ruang terbuka melatih kebugaran, disiplin garis, dan komunikasi singkat saat mengambil keputusan cepat.",
    colors: { start: "#1f6f55", end: "#163e35", accent: "#ffb703", line: "#e9fff7" },
    roundTime: 70,
    livesSolo: 3,
    livesCoop: 4,
    checkpoints: [255, 505, 735],
    enemies: [
      { orientation: "horizontal", fixed: 145, min: 110, max: 850, position: 245, speed: 165, direction: 1, label: "H1", behavior: "pause", behaviorInterval: 4.1, pauseDuration: 0.34, phase: 1.3 },
      { orientation: "horizontal", fixed: 415, min: 110, max: 850, position: 735, speed: 154, direction: -1, label: "H2", behavior: "fakeout", behaviorInterval: 5.2, phase: 2.5 },
      { orientation: "vertical", fixed: 390, min: 70, max: 490, position: 190, speed: 151, direction: 1, label: "V1", behavior: "pulse", phase: 0.4 },
      { orientation: "vertical", fixed: 690, min: 70, max: 490, position: 430, speed: 148, direction: -1, label: "V2", behavior: "steady" }
    ]
  },
  {
    id: "sulawesi",
    order: 4,
    name: "Sulawesi",
    title: "Galah Nusantara",
    region: "Sulawesi",
    fact: "Strategi bergantian antara menyerang dan menjaga menunjukkan bahwa keberhasilan kelompok bergantung pada koordinasi, bukan satu pemain saja.",
    colors: { start: "#1f7a8c", end: "#123c56", accent: "#ffca3a", line: "#edfaff" },
    roundTime: 66,
    livesSolo: 2,
    livesCoop: 3,
    checkpoints: [245, 490, 725],
    enemies: [
      { orientation: "horizontal", fixed: 125, min: 105, max: 855, position: 340, speed: 174, direction: -1, label: "H1", behavior: "surge", surgeMultiplier: 1.24, phase: 0.7 },
      { orientation: "horizontal", fixed: 280, min: 105, max: 855, position: 715, speed: 160, direction: 1, label: "H2", behavior: "pause", behaviorInterval: 3.9, pauseDuration: 0.32, phase: 1.9 },
      { orientation: "horizontal", fixed: 435, min: 105, max: 855, position: 460, speed: 156, direction: -1, label: "H3", behavior: "fakeout", behaviorInterval: 4.8, phase: 3.1 },
      { orientation: "vertical", fixed: 420, min: 65, max: 495, position: 420, speed: 154, direction: -1, label: "V1", behavior: "pulse", phase: 1.1 },
      { orientation: "vertical", fixed: 705, min: 65, max: 495, position: 165, speed: 150, direction: 1, label: "V2", behavior: "steady" }
    ]
  },
  {
    id: "papua",
    order: 5,
    name: "Papua",
    title: "Puncak Persatuan",
    region: "Papua",
    fact: "Tahap akhir menegaskan bahwa perbedaan peran dapat bergerak menuju satu tujuan ketika pemain saling memberi ruang dan perlindungan.",
    colors: { start: "#6a4c93", end: "#2f285f", accent: "#ffd166", line: "#fff8e8" },
    roundTime: 62,
    livesSolo: 2,
    livesCoop: 3,
    checkpoints: [235, 475, 710],
    enemies: [
      { orientation: "horizontal", fixed: 105, min: 100, max: 860, position: 215, speed: 182, direction: 1, label: "H1", behavior: "surge", surgeMultiplier: 1.3, phase: 0.3 },
      { orientation: "horizontal", fixed: 220, min: 100, max: 860, position: 740, speed: 170, direction: -1, label: "H2", behavior: "fakeout", behaviorInterval: 4.5, phase: 1.8 },
      { orientation: "horizontal", fixed: 340, min: 100, max: 860, position: 470, speed: 164, direction: 1, label: "H3", behavior: "pause", behaviorInterval: 3.6, pauseDuration: 0.3, phase: 2.6 },
      { orientation: "horizontal", fixed: 455, min: 100, max: 860, position: 625, speed: 160, direction: -1, label: "H4", behavior: "pulse", phase: 0.9 },
      { orientation: "vertical", fixed: 390, min: 60, max: 500, position: 165, speed: 160, direction: 1, label: "V1", behavior: "pulse", phase: 2.2 },
      { orientation: "vertical", fixed: 690, min: 60, max: 500, position: 435, speed: 158, direction: -1, label: "V2", behavior: "fakeout", behaviorInterval: 5.1, phase: 3.3 }
    ]
  }
]);

function safeParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

export function getLevel(levelId = "jawa") {
  return LEVELS.find((level) => level.id === levelId) ?? LEVELS[0];
}

export class MapProgress {
  constructor(storage = window.localStorage) {
    this.storage = storage;
    this.data = this.load();
  }

  load() {
    const stored = safeParse(this.storage.getItem(MAP_PROGRESS_KEY), {});
    const completed = Array.isArray(stored.completed)
      ? stored.completed.filter((id) => LEVELS.some((level) => level.id === id))
      : [];
    const uniqueCompleted = [...new Set(completed)];
    const candidate = LEVELS.find((level) => level.id === stored.selected) ?? LEVELS[0];
    const previous = LEVELS.find((level) => level.order === candidate.order - 1);
    const selectedIsUnlocked = candidate.order === 1 || Boolean(previous && uniqueCompleted.includes(previous.id));
    return {
      completed: uniqueCompleted,
      selected: selectedIsUnlocked ? candidate.id : "jawa"
    };
  }

  save() {
    this.storage.setItem(MAP_PROGRESS_KEY, JSON.stringify(this.data));
  }

  isUnlocked(levelId) {
    const level = getLevel(levelId);
    if (level.order === 1) return true;
    const previous = LEVELS.find((item) => item.order === level.order - 1);
    return Boolean(previous && this.data.completed.includes(previous.id));
  }

  select(levelId) {
    if (!this.isUnlocked(levelId)) return false;
    this.data.selected = getLevel(levelId).id;
    this.save();
    return true;
  }

  complete(levelId) {
    const validId = getLevel(levelId).id;
    if (!this.data.completed.includes(validId)) this.data.completed.push(validId);
    this.save();
    return this.getNewlyUnlockedAfter(validId);
  }

  getNewlyUnlockedAfter(levelId) {
    const current = getLevel(levelId);
    return LEVELS.find((item) => item.order === current.order + 1) ?? null;
  }

  getSelected() {
    return getLevel(this.data.selected);
  }

  getCompletionCount() {
    return this.data.completed.length;
  }
}
