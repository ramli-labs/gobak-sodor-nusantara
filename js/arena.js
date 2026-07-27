/**
 * Konfigurasi arena tunggal Simulasi Strategi Gobak Sodor.
 * Tidak ada sistem pulau/level — satu arena yang sama dipakai setiap sesi
 * agar posisi awal pemain dan penjaga selalu konsisten (penting untuk Mode
 * Simulasi Video). Penjaga mengejar target secara otomatis (lihat enemy.js);
 * di sini hanya didefinisikan garis tugas, kecepatan dasar, dan identitas
 * setiap penjaga untuk pesan tangkapan dan panel Fokus Penjaga.
 */
export const ARENA = Object.freeze({
  name: "Lapangan Gobak Sodor",
  colors: { start: "#178260", end: "#0c5d4a", accent: "#f7c948", line: "#fff8df" },
  checkpoints: [285, 545, 760],
  enemies: [
    { id: "penjaga-1", name: "Penjaga 1", orientation: "horizontal", fixed: 180, min: 130, max: 840, position: 290, speed: 150, label: "1" },
    { id: "penjaga-2", name: "Penjaga 2", orientation: "horizontal", fixed: 395, min: 130, max: 840, position: 670, speed: 148, label: "2" },
    { id: "penjaga-3", name: "Penjaga 3", orientation: "vertical", fixed: 555, min: 75, max: 485, position: 390, speed: 140, label: "3" }
  ]
});
