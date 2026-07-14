# Laporan Pengujian Tahap 4

## Pemeriksaan otomatis yang berhasil

- Sintaks seluruh modul JavaScript valid melalui `node --check`.
- Enam halaman HTML tidak memiliki ID ganda.
- Seluruh tautan dan aset lokal yang dirujuk tersedia.
- CSS berhasil diparsing tanpa error.
- `questions.json` berisi tepat 100 soal dengan 100 ID unik.
- Distribusi soal tetap 20 soal per kategori.
- Semua halaman, modul, CSS, dan JSON utama merespons HTTP 200 melalui server lokal.

## Unit test logika

- Lima level peta tersedia.
- Sumatra terkunci sebelum Jawa selesai dan terbuka sesudahnya.
- Pilihan level terkunci dari Local Storage yang dimanipulasi dikembalikan ke Jawa.
- Achievement Co-op, Pelari Hebat, Tak Tersentuh, dan Anak Nusantara terbuka pada kondisi yang benar.
- Pengaturan aksesibilitas tersimpan dan dapat dimuat kembali.
- Set soal guru dapat dibaca sistem kuis.
- Gerak diagonal pemain tetap ternormalisasi.
- Penjaga memantul pada batas jalur.

## Smoke test runtime

- `game.js` berhasil memuat 100 soal dan mencapai status siap.
- `teacher.js` berhasil menginisialisasi editor tanpa exception.
- `leaderboard.js` berhasil menginisialisasi data progres tanpa exception.

## Batas pengujian lingkungan

Chromium headless tidak dapat menyelesaikan navigasi karena pembatasan Linux/DBus pada lingkungan eksekusi. Pengujian visual dan permainan manual tetap disarankan pada Chrome, Edge, atau Firefox melalui server lokal.
