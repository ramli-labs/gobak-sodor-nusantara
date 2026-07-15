# Laporan Pengujian Tahap 5

## Ruang lingkup

Tahap 5 menambahkan audio, particle effect, confetti, transisi halaman, PWA, offline mode, ikon aplikasi, install prompt, serta optimasi performa dan lintas-perangkat.

## Pengujian otomatis yang berhasil

1. Pemeriksaan sintaks seluruh 13 modul JavaScript dan `service-worker.js` menggunakan `node --check`.
2. Parsing enam halaman utama dan satu halaman offline.
3. Pemeriksaan ID HTML ganda.
4. Pemeriksaan semua tautan, stylesheet, script, dan gambar lokal.
5. Validasi `manifest.json` dan keberadaan seluruh ikon manifest.
6. Parsing `style.css` dan `game.css` tanpa error CSS.
7. Validasi `questions.json`: 100 soal dan ID unik.
8. Pemeriksaan daftar app shell service worker terhadap struktur file proyek.

## Hasil

- Halaman utama: **6**
- Halaman fallback offline: **1**
- Soal: **100**
- Modul JavaScript + service worker yang lolos sintaks: **14**
- Ikon manifest utama: **3**
- Tautan lokal hilang: **0**
- ID HTML ganda: **0**
- Error parser CSS: **0**
- Error JSON: **0**

## Pengujian manual yang wajib dilakukan pada browser

### Audio dan efek

1. Tekan tombol suara pada header.
2. Mulai game dan pastikan musik latar terdengar setelah interaksi pengguna.
3. Jawab benar dan salah untuk membandingkan efek suara dan particle effect.
4. Ambil bendera, tertangkap penjaga, pause, resume, menang, dan kalah.
5. Menang harus memunculkan confetti.
6. Muat ulang halaman dan pastikan status mute tetap tersimpan.

### PWA

1. Jalankan melalui `localhost` atau HTTPS.
2. Periksa manifest pada DevTools.
3. Pastikan service worker terdaftar dan aktif.
4. Pasang aplikasi melalui tombol atau menu browser.
5. Pastikan aplikasi terbuka dalam mode standalone.
6. Periksa shortcut Bermain, Mode Guru, dan Leaderboard apabila browser mendukung.

### Offline Mode

1. Buka seluruh halaman sekali saat online.
2. Aktifkan Offline pada DevTools.
3. Muat ulang halaman Beranda, Game, Budaya, Tutorial, Leaderboard, dan Mode Guru.
4. Pastikan bank soal masih dapat dimuat.
5. Pastikan set soal guru dan skor Local Storage tetap tersedia.
6. Buka URL yang belum pernah dicache dan pastikan `offline.html` ditampilkan.

### Lintas-perangkat

Uji minimum:

- Chrome desktop.
- Edge desktop.
- Firefox desktop untuk fungsi inti; install PWA bergantung dukungan browser.
- Chrome Android.
- Safari iOS untuk tampilan dan Add to Home Screen.
- Lebar 360 px, 768 px, 1024 px, dan 1440 px.

## Catatan lingkungan pengembangan

Lingkungan eksekusi saat penyusunan memblokir proses server lokal menerima koneksi, sehingga uji install PWA dan offline secara langsung tidak dapat dijalankan di sini. Hal tersebut merupakan batasan lingkungan pengujian, bukan error sintaks proyek. Langkah uji browser disediakan di atas agar dapat diverifikasi pada perangkat pengguna.
