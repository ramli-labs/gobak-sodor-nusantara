# Audit Prapush Gobak Sodor Nusantara v1.2.2

## Temuan utama

Paket v1.2.1 memperbaiki elemen countdown, tetapi `game.html`, `tutorial.html`, dan `README.md` di dalam paket tersebut berasal dari versi antarmuka yang lebih lama. Dampaknya, beberapa fitur v1.2 tidak terlihat walaupun logika JavaScript-nya masih ada.

## Perbaikan yang digabungkan

- Countdown 3–2–1 tampil sebelum timer berjalan.
- Pilihan kesulitan Santai, Normal, dan Ahli kembali tampil.
- Informasi nyawa dan aturan poin kembali tampil.
- HUD status perjalanan, progres pergi–pulang, progres 0/6 soal, dan kesulitan kembali tampil.
- Notifikasi perubahan skor kembali tampil di arena.
- Panel ekspor data playtest kembali tampil.
- Tutorial kembali menjelaskan enam langkah: tiga soal pergi dan tiga soal pulang.
- Ikon pelari pada progress bar kini bergerak dan berbalik arah saat membawa bendera pulang.
- Cache service worker dinaikkan menjadi `gsn-v5.2.2`.

## Pemeriksaan otomatis

- Sintaks seluruh JavaScript dan service worker valid.
- Seluruh selector yang digunakan `game.js` tersedia pada `game.html`.
- Tidak ada tautan atau aset lokal yang hilang.
- Tidak ada ID HTML ganda.
- Bank soal berjumlah 100, seluruh ID unik, dan distribusi kategori 20 soal per kategori.
- Soal tidak berulang pada 30 pemilihan pertama dan riwayat tetap terbaca pada sesi tab yang sama.
- Gerak diagonal pemain tetap ternormalisasi.
- Kecepatan perjalanan pulang dan pantulan penjaga berfungsi.
- Kurva jumlah penjaga adalah 3, 4, 4, 5, dan 6.

## Batasan yang belum diselesaikan

- Mode Guru masih halaman publik karena proyek masih memakai GitHub Pages dan Local Storage. Autentikasi guru yang benar akan diterapkan ketika portal dipindahkan ke arsitektur Supabase.
- Leaderboard dan progres belum lintas-perangkat.
- Pengujian visual tetap perlu dilakukan pada browser nyata setelah deployment GitHub Pages.

## File yang harus diunggah

Unggah seluruh isi folder proyek v1.2.2 ke root repository. Jangan hanya mengganti `game.html`, karena service worker, tutorial, README, CSS, dan JavaScript juga sudah diselaraskan.
