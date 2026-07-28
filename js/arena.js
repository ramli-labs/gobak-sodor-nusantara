/**
 * Konfigurasi arena tunggal — adaptasi lapangan Gobak Sodor/Hadang.
 * Tidak ada sistem pulau/level dan tidak ada objek bendera — satu arena yang
 * sama dipakai setiap sesi agar posisi awal pemain dan penjaga selalu
 * konsisten (penting untuk Mode Simulasi Video).
 *
 * Garis lapangan (dari kiri ke kanan): Garis Awal (START) → Garis Penjaga 1
 * → Garis Penjaga 2 → Garis Penjaga 3 → Garis Belakang. Garis Sodor membujur
 * di tengah lebar lapangan, dari Garis Awal hingga Garis Belakang.
 *
 * Dua jenis penjaga (lihat enemy.js):
 * - Penjaga Garis Melintang (3): terikat pada satu Garis Penjaga (X tetap),
 *   bergerak kiri–kanan menyusuri lebar lapangan (Y).
 * - Penjaga Sodor (1): terikat pada Garis Sodor (Y tetap di tengah lapangan),
 *   bergerak maju–mundur menyusuri kedalaman lapangan (X).
 */
const COURT_WIDTH_MIN = 75;
const COURT_WIDTH_MAX = 485;
const SODOR_Y = (COURT_WIDTH_MIN + COURT_WIDTH_MAX) / 2;

export const ARENA = Object.freeze({
  name: "Lapangan Gobak Sodor",
  colors: { start: "#178260", end: "#0c5d4a", accent: "#f7c948", line: "#fff8df" },
  startLineX: 65,
  backLineX: 880,
  courtWidthMin: COURT_WIDTH_MIN,
  courtWidthMax: COURT_WIDTH_MAX,
  sodorLineY: SODOR_Y,
  checkpoints: [
    { id: 1, name: "Garis Penjaga 1", x: 285 },
    { id: 2, name: "Garis Penjaga 2", x: 545 },
    { id: 3, name: "Garis Penjaga 3", x: 760 }
  ],
  enemies: [
    { id: "penjaga-garis-1", name: "Penjaga Garis 1", type: "melintang", orientation: "vertical", fixed: 285, min: COURT_WIDTH_MIN, max: COURT_WIDTH_MAX, position: SODOR_Y, speed: 150, label: "1" },
    { id: "penjaga-garis-2", name: "Penjaga Garis 2", type: "melintang", orientation: "vertical", fixed: 545, min: COURT_WIDTH_MIN, max: COURT_WIDTH_MAX, position: SODOR_Y, speed: 150, label: "2" },
    { id: "penjaga-garis-3", name: "Penjaga Garis 3", type: "melintang", orientation: "vertical", fixed: 760, min: COURT_WIDTH_MIN, max: COURT_WIDTH_MAX, position: SODOR_Y, speed: 150, label: "3" },
    { id: "penjaga-sodor", name: "Penjaga Sodor", type: "sodor", orientation: "horizontal", fixed: SODOR_Y, min: 140, max: 820, position: 400, speed: 145, label: "S" }
  ]
});
