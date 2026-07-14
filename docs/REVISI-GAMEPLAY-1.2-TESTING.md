# Laporan Pengujian Gobak Sodor Nusantara v1.2

## Ruang lingkup

Pengujian mencakup tingkat kesulitan, konfigurasi pulau, pola penjaga, perjalanan pulang, countdown, progres soal, skor berbobot kesulitan, penyimpanan playtest, struktur halaman, aset PWA, dan bank soal.

## Hasil otomatis

### Struktur dan sintaks

- 7 halaman HTML diperiksa.
- 15 berkas JavaScript termasuk service worker lolos `node --check`.
- Tidak ditemukan ID HTML ganda.
- Tidak ditemukan tautan atau aset lokal yang hilang.
- Semua selector utama `game.js` tersedia pada `game.html`.
- `style.css` dan `game.css` tidak menghasilkan error parser.
- `manifest.json` valid.
- Seluruh item `APP_SHELL` service worker tersedia.
- Cache service worker dinaikkan menjadi `gsn-v5.2.0`.

### Bank soal

- Total: 100 soal.
- ID unik: 100.
- Pengujian pemilihan 30 soal menghasilkan 30 ID berbeda sebelum siklus habis.

### Tingkat kesulitan

- Pilihan default: Normal.
- Pilihan tersimpan dan dapat dipulihkan dari Local Storage.
- Mode Ahli pada Jawa menghasilkan:
  - waktu 66 detik (`78 × 0,85`, dibulatkan);
  - 2 nyawa Solo;
  - kecepatan pemain 220;
  - 3 penjaga;
  - multiplier pulang 1,30.

### Peta dan penjaga

- Jumlah penjaga per pulau: 3, 4, 4, 5, 6.
- Waktu dasar Normal: 78, 74, 70, 66, 62 detik.
- Kecepatan gerak pada fase pulang terverifikasi lebih tinggi daripada fase pergi.
- Pola `fakeout` terverifikasi dapat membalik arah sebelum batas.
- Pantulan batas garis tetap aktif.

### Countdown

Urutan 3 → 2 → 1 terverifikasi, kemudian state berubah dari `COUNTDOWN` ke `RUNNING`. Timer ronde tidak berkurang selama countdown.

### Skor kesulitan

Dengan kondisi finish yang sama pada skenario uji:

- Santai: 1.440 poin finish.
- Normal: 1.700 poin finish.
- Ahli: 2.160 poin finish.

Urutannya sesuai tujuan: tingkat lebih sulit memperoleh bonus akhir lebih besar.

### Playtest

- Satu ronde uji berhasil disimpan ke `gsnPlaytestV1`.
- Versi, pulau, kesulitan, mode, hasil, skor, akurasi, durasi, collision, dan nyawa tersimpan.
- Batas penyimpanan ditetapkan maksimal 120 ronde.

## Batas pengujian lingkungan

Chromium headless tidak dapat menyelesaikan pengambilan screenshot karena pembatasan DBus, inotify, dan network namespace pada lingkungan eksekusi. Karena itu, pengujian visual/interaksi akhir harus dilakukan pada browser pengguna atau GitHub Pages.

## Checklist uji manual

1. Pilih Santai, mulai Solo, dan pastikan waktu serta nyawa lebih tinggi.
2. Pilih Normal, amati countdown 3–2–1.
3. Lewati tiga checkpoint pergi dan lihat progres soal berubah hingga 3/6.
4. Ambil bendera; status harus berubah menjadi **Kembali ke START** dan ritme penjaga meningkat.
5. Lewati tiga checkpoint pulang hingga progres soal 6/6.
6. Selesaikan ronde dan buka rapor.
7. Pastikan ringkasan playtest menampilkan durasi, collision, nyawa, dan kesulitan.
8. Mainkan Mode Ahli dan bandingkan waktu, Shield, nyawa, serta ritme penjaga.
9. Klik **Ekspor JSON** dan periksa isi data ronde.
10. Buka Leaderboard dan pastikan tingkat kesulitan tampil pada detail skor.
