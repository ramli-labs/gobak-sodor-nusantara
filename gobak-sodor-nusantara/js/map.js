/**
 * Peta Petualangan Nusantara.
 * Menyimpan konfigurasi level, fakta budaya, dan progres pulau di Local Storage.
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
    roundTime: 90,
    livesSolo: 3,
    livesCoop: 4,
    checkpoints: [285, 545, 760],
    enemies: [
      { orientation: "horizontal", fixed: 205, min: 145, max: 835, position: 275, speed: 155, direction: 1, label: "H" },
      { orientation: "vertical", fixed: 545, min: 75, max: 485, position: 405, speed: 135, direction: -1, label: "V" }
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
    roundTime: 88,
    livesSolo: 3,
    livesCoop: 4,
    checkpoints: [270, 520, 750],
    enemies: [
      { orientation: "horizontal", fixed: 185, min: 120, max: 840, position: 370, speed: 165, direction: -1, label: "H1" },
      { orientation: "horizontal", fixed: 375, min: 120, max: 840, position: 620, speed: 145, direction: 1, label: "H2" },
      { orientation: "vertical", fixed: 610, min: 75, max: 485, position: 250, speed: 142, direction: 1, label: "V" }
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
    roundTime: 85,
    livesSolo: 3,
    livesCoop: 4,
    checkpoints: [255, 505, 735],
    enemies: [
      { orientation: "horizontal", fixed: 165, min: 115, max: 845, position: 250, speed: 170, direction: 1, label: "H1" },
      { orientation: "horizontal", fixed: 395, min: 115, max: 845, position: 730, speed: 155, direction: -1, label: "H2" },
      { orientation: "vertical", fixed: 480, min: 75, max: 485, position: 205, speed: 150, direction: 1, label: "V" }
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
    roundTime: 82,
    livesSolo: 3,
    livesCoop: 4,
    checkpoints: [245, 490, 725],
    enemies: [
      { orientation: "horizontal", fixed: 150, min: 110, max: 850, position: 360, speed: 180, direction: -1, label: "H1" },
      { orientation: "horizontal", fixed: 410, min: 110, max: 850, position: 650, speed: 165, direction: 1, label: "H2" },
      { orientation: "vertical", fixed: 390, min: 70, max: 490, position: 430, speed: 155, direction: -1, label: "V1" },
      { orientation: "vertical", fixed: 690, min: 70, max: 490, position: 170, speed: 145, direction: 1, label: "V2" }
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
    roundTime: 80,
    livesSolo: 3,
    livesCoop: 5,
    checkpoints: [235, 475, 710],
    enemies: [
      { orientation: "horizontal", fixed: 135, min: 105, max: 855, position: 220, speed: 190, direction: 1, label: "H1" },
      { orientation: "horizontal", fixed: 280, min: 105, max: 855, position: 720, speed: 175, direction: -1, label: "H2" },
      { orientation: "horizontal", fixed: 425, min: 105, max: 855, position: 480, speed: 165, direction: 1, label: "H3" },
      { orientation: "vertical", fixed: 560, min: 70, max: 490, position: 160, speed: 165, direction: 1, label: "V" }
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
