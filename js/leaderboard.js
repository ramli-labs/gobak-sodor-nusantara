/**
 * Leaderboard, streak, dan achievement lokal Gobak Sodor Nusantara.
 * TODO: ganti Local Storage dengan backend opsional (misalnya Supabase)
 * apabila sekolah membutuhkan leaderboard lintas-perangkat.
 */
import { GamificationSystem } from "./gamification.js";
import { MapProgress, LEVELS } from "./map.js";

const LEADERBOARD_KEY = "gsnLeaderboardV1";

class LeaderboardPage {
  constructor() {
    this.gamification = new GamificationSystem();
    this.mapProgress = new MapProgress();
    this.elements = {
      body: document.querySelector("[data-leaderboard-body]"),
      resetButton: document.querySelector("[data-reset-leaderboard]"),
      count: document.querySelector("[data-board-count]"),
      best: document.querySelector("[data-board-best]"),
      accuracy: document.querySelector("[data-board-accuracy]"),
      streak: document.querySelector("[data-streak-current]"),
      longest: document.querySelector("[data-streak-longest]"),
      wins: document.querySelector("[data-total-wins]"),
      achievementCount: document.querySelector("[data-achievement-count]"),
      islandCount: document.querySelector("[data-island-count]"),
      achievementGrid: document.querySelector("[data-achievement-grid]")
    };
  }

  init() {
    if (!this.elements.body) return;
    this.render();
    this.elements.resetButton?.addEventListener("click", () => this.resetScores());
    window.addEventListener("storage", () => {
      this.gamification = new GamificationSystem();
      this.mapProgress = new MapProgress();
      this.render();
    });
  }

  read() {
    try {
      const data = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  render() {
    const entries = this.read()
      .filter((entry) => entry && typeof entry.name === "string" && Number.isFinite(Number(entry.score)))
      .sort((a, b) => {
        if (Boolean(a.practice) !== Boolean(b.practice)) return a.practice ? 1 : -1;
        return Number(b.score) - Number(a.score) || new Date(b.date) - new Date(a.date);
      });

    this.renderRows(entries);
    this.renderStats(entries);
    this.renderAchievements();
  }

  renderRows(entries) {
    this.elements.body.replaceChildren();
    if (!entries.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.className = "leaderboard-empty";
      cell.innerHTML = '<i class="fa-solid fa-flag-checkered" aria-hidden="true"></i><strong>Belum ada skor tersimpan.</strong><span>Selesaikan ronde di halaman Bermain, lalu simpan nama pemain atau tim.</span>';
      row.append(cell);
      this.elements.body.append(row);
      return;
    }
    entries.forEach((entry, index) => this.elements.body.append(this.createRow(entry, index)));
  }

  renderStats(entries) {
    const bestScore = entries.length ? Math.max(...entries.map((entry) => Number(entry.score) || 0)) : 0;
    const accuracyEntries = entries.filter((entry) => Number.isFinite(Number(entry.accuracy)));
    const averageAccuracy = accuracyEntries.length
      ? Math.round(accuracyEntries.reduce((sum, entry) => sum + Number(entry.accuracy), 0) / accuracyEntries.length)
      : 0;
    const summary = this.gamification.getSummary();

    this.elements.count.textContent = String(entries.length);
    this.elements.best.textContent = bestScore.toLocaleString("id-ID");
    this.elements.accuracy.textContent = `${averageAccuracy}%`;
    this.elements.resetButton.disabled = entries.length === 0;
    this.elements.streak.textContent = `${summary.streak} hari`;
    this.elements.longest.textContent = `Terpanjang ${summary.longestStreak} hari`;
    this.elements.wins.textContent = String(summary.wins);
    this.elements.achievementCount.textContent = `${summary.unlockedCount}/${summary.totalAchievements}`;
    this.elements.islandCount.textContent = `${this.mapProgress.getCompletionCount()}/${LEVELS.length}`;
  }

  renderAchievements() {
    const items = this.gamification.getAchievementItems();
    this.elements.achievementGrid.innerHTML = items.map((item) => `
      <article class="achievement-card ${item.unlocked ? "unlocked" : "locked"}">
        <div class="achievement-icon"><i class="fa-solid ${item.icon}"></i></div>
        <div><span>${item.unlocked ? "Terbuka" : "Terkunci"}</span><h3>${item.name}</h3><p>${item.description}</p></div>
        <i class="fa-solid ${item.unlocked ? "fa-circle-check" : "fa-lock"} achievement-status"></i>
      </article>
    `).join("");
  }

  createRow(entry, index) {
    const row = document.createElement("tr");
    const rank = document.createElement("td");
    const name = document.createElement("td");
    const score = document.createElement("td");
    const level = document.createElement("td");
    const date = document.createElement("td");

    rank.className = "rank";
    rank.textContent = this.rankLabel(index);
    const strong = document.createElement("strong");
    strong.textContent = entry.name;
    const details = document.createElement("small");
    details.textContent = `${entry.mode || "Solo"} · ${entry.difficulty || "Normal"}${entry.practice ? " · Latihan" : ""} · ${entry.result || "Selesai"} · Akurasi ${Number(entry.accuracy) || 0}% · Combo x${Number(entry.maxCombo) || 0}`;
    name.append(strong, details);
    score.textContent = Number(entry.score).toLocaleString("id-ID");
    level.textContent = entry.level || "Jawa";
    date.textContent = this.formatDate(entry.date);
    row.append(rank, name, score, level, date);
    return row;
  }

  rankLabel(index) {
    if (index === 0) return "🥇 1";
    if (index === 1) return "🥈 2";
    if (index === 2) return "🥉 3";
    return String(index + 1);
  }

  formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  }

  resetScores() {
    const entries = this.read();
    if (!entries.length) return;
    if (!window.confirm(`Hapus seluruh ${entries.length} skor pada perangkat ini? Achievement dan progres pulau tidak ikut dihapus.`)) return;
    localStorage.removeItem(LEADERBOARD_KEY);
    this.render();
  }
}

document.addEventListener("DOMContentLoaded", () => new LeaderboardPage().init());
