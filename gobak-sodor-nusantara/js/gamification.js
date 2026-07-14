/**
 * Achievement dan streak harian.
 * Data bersifat lokal per browser dan tidak membutuhkan akun.
 */

export const GAMIFICATION_KEY = "gsnGamificationV1";

export const ACHIEVEMENTS = Object.freeze([
  { id: "anak-nusantara", icon: "fa-medal", name: "Anak Nusantara", description: "Menangkan petualangan pulau pertama." },
  { id: "juara-gobak", icon: "fa-trophy", name: "Juara Gobak", description: "Menangkan seluruh lima pulau Nusantara." },
  { id: "master-budaya", icon: "fa-book-open-reader", name: "Master Budaya", description: "Capai akurasi kumulatif minimal 80% dari sedikitnya 10 soal." },
  { id: "pelari-hebat", icon: "fa-bolt", name: "Pelari Hebat", description: "Menang dengan sisa waktu minimal 40 detik." },
  { id: "tak-tersentuh", icon: "fa-shield-heart", name: "Tak Tersentuh", description: "Menangkan ronde tanpa tersentuh penjaga." },
  { id: "rajin-belajar", icon: "fa-calendar-check", name: "Rajin Belajar", description: "Pertahankan streak bermain selama 3 hari." },
  { id: "gotong-royong", icon: "fa-people-group", name: "Gotong Royong", description: "Menangkan satu ronde dalam mode Co-op." }
]);

function safeParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysBetween(a, b) {
  const first = new Date(`${a}T00:00:00`);
  const second = new Date(`${b}T00:00:00`);
  return Math.round((second - first) / 86400000);
}

export class GamificationSystem {
  constructor(storage = window.localStorage) {
    this.storage = storage;
    this.data = this.load();
  }

  load() {
    const stored = safeParse(this.storage.getItem(GAMIFICATION_KEY), {});
    return {
      unlocked: Array.isArray(stored.unlocked) ? [...new Set(stored.unlocked)] : [],
      streak: Math.max(0, Number(stored.streak) || 0),
      longestStreak: Math.max(0, Number(stored.longestStreak) || 0),
      lastPlayed: typeof stored.lastPlayed === "string" ? stored.lastPlayed : "",
      wins: Math.max(0, Number(stored.wins) || 0),
      completedLevels: Array.isArray(stored.completedLevels) ? [...new Set(stored.completedLevels)] : [],
      totalCorrect: Math.max(0, Number(stored.totalCorrect) || 0),
      totalQuestions: Math.max(0, Number(stored.totalQuestions) || 0)
    };
  }

  save() {
    this.storage.setItem(GAMIFICATION_KEY, JSON.stringify(this.data));
  }

  touchDailyStreak(date = new Date()) {
    const today = dateKey(date);
    if (this.data.lastPlayed === today) return [];

    const difference = this.data.lastPlayed ? daysBetween(this.data.lastPlayed, today) : null;
    this.data.streak = difference === 1 ? this.data.streak + 1 : 1;
    this.data.longestStreak = Math.max(this.data.longestStreak, this.data.streak);
    this.data.lastPlayed = today;
    const unlocked = this.evaluate();
    this.save();
    return unlocked;
  }

  recordRound({ won, levelId, mode, remainingTime, collisions, correct, total }) {
    const dailyUnlocks = this.touchDailyStreak();
    this.data.totalCorrect += Math.max(0, Number(correct) || 0);
    this.data.totalQuestions += Math.max(0, Number(total) || 0);

    if (won) {
      this.data.wins += 1;
      if (levelId && !this.data.completedLevels.includes(levelId)) this.data.completedLevels.push(levelId);
    }

    const unlocked = this.evaluate({ won, mode, remainingTime, collisions });
    this.save();
    return [...new Set([...dailyUnlocks, ...unlocked])];
  }

  evaluate(context = {}) {
    const candidates = [];
    if (this.data.completedLevels.length >= 1) candidates.push("anak-nusantara");
    if (this.data.completedLevels.length >= 5) candidates.push("juara-gobak");
    if (this.data.totalQuestions >= 10 && this.data.totalCorrect / this.data.totalQuestions >= 0.8) candidates.push("master-budaya");
    if (context.won && Number(context.remainingTime) >= 40) candidates.push("pelari-hebat");
    if (context.won && Number(context.collisions) === 0) candidates.push("tak-tersentuh");
    if (this.data.streak >= 3) candidates.push("rajin-belajar");
    if (context.won && context.mode === "Co-op") candidates.push("gotong-royong");

    const newlyUnlocked = candidates.filter((id) => !this.data.unlocked.includes(id));
    this.data.unlocked.push(...newlyUnlocked);
    return newlyUnlocked;
  }

  getAchievementItems() {
    return ACHIEVEMENTS.map((item) => ({ ...item, unlocked: this.data.unlocked.includes(item.id) }));
  }

  getSummary() {
    return {
      streak: this.data.streak,
      longestStreak: this.data.longestStreak,
      wins: this.data.wins,
      unlockedCount: this.data.unlocked.length,
      totalAchievements: ACHIEVEMENTS.length
    };
  }
}
