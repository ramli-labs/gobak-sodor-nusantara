/**
 * Konfigurasi arena tunggal Simulasi Strategi Gobak Sodor.
 * Tidak ada sistem pulau/level — satu arena yang sama dipakai setiap sesi
 * agar posisi awal dan pola penjaga selalu konsisten (penting untuk Mode Simulasi Video).
 */
export const ARENA = Object.freeze({
  name: "Lapangan Gobak Sodor",
  colors: { start: "#178260", end: "#0c5d4a", accent: "#f7c948", line: "#fff8df" },
  checkpoints: [285, 545, 760],
  enemies: [
    { orientation: "horizontal", fixed: 180, min: 130, max: 840, position: 290, speed: 150, direction: 1, label: "H1", behavior: "steady" },
    { orientation: "horizontal", fixed: 395, min: 130, max: 840, position: 670, speed: 142, direction: -1, label: "H2", behavior: "pause", behaviorInterval: 4.8, pauseDuration: 0.42, phase: 1.2 },
    { orientation: "vertical", fixed: 555, min: 75, max: 485, position: 390, speed: 137, direction: -1, label: "V", behavior: "steady" }
  ]
});
