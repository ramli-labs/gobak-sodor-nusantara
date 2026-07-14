# Gobak Sodor Nusantara — Versi 1.2.3 (Final Stabil)

## Perbaikan final versi 1.2.3

- Memulihkan seluruh antarmuka v1.2 yang sempat tergantikan oleh halaman versi lama pada paket v1.2.1.
- Countdown 3–2–1 tetap tampil dan timer baru berjalan setelah countdown selesai.
- Pilihan kesulitan, rincian poin/nyawa, progres perjalanan, progres soal, dan panel playtest kembali tampil lengkap.
- Tutorial dikembalikan ke alur enam langkah: tiga soal pergi dan tiga soal pulang.
- Ikon pelari pada progres perjalanan kini bergerak dan berbalik arah saat perjalanan pulang.
- Cache PWA dinaikkan menjadi `gsn-v5.2.3` dan kini memasukkan `difficulty.js` agar pilihan kesulitan tetap bekerja secara offline.
- Kemenangan kini divalidasi hanya setelah 3 soal pergi dan 3 soal pulang selesai.
- Bendera tidak dapat diambil bila checkpoint perjalanan pergi belum lengkap.
- Riwayat soal dipindahkan ke Local Storage sehingga tidak berulang setelah tab ditutup atau pulau dilanjutkan kemudian.
- Set soal guru harus memiliki minimal 6 soal sebelum dapat diaktifkan.
- Double-click jawaban tidak dapat mencatat satu soal dua kali.

## Perubahan versi 1.2

- Tiga tingkat kesulitan yang benar-benar memengaruhi gameplay:
  - **Santai:** waktu lebih panjang, satu nyawa tambahan, penjaga lebih lambat, Shield lebih lama.
  - **Normal:** konfigurasi utama yang seimbang untuk kelas dan demo.
  - **Ahli:** waktu lebih singkat, nyawa terbatas, ritme penjaga agresif, Shield lebih pendek.
- Jumlah penjaga per pulau dinaikkan menjadi 3, 4, 4, 5, dan 6.
- Penjaga mempunyai pola `steady`, `pause`, `pulse`, `surge`, dan `fakeout` dengan ikon ritme pada Canvas.
- Setelah bendera diambil, seluruh penjaga bergerak lebih cepat sesuai kesulitan.
- Countdown 3–2–1 sebelum timer mulai berjalan.
- Indikator selalu tampil untuk status perjalanan, progres pergi–pulang, progres soal, dan tingkat kesulitan.
- Skor akhir diberi faktor kesulitan agar Mode Santai tidak otomatis menguasai leaderboard.
- Setiap ronde otomatis mencatat data playtest lokal: durasi, hasil, kesulitan, jumlah tertangkap, akurasi, nyawa tersisa, dan durasi perjalanan pulang.
- Data playtest dapat diekspor sebagai JSON untuk membantu balancing berdasarkan data nyata.

## Perubahan versi 1.1 yang tetap aktif

- Tiga soal saat menuju bendera dan tiga soal baru saat kembali ke START.
- Soal tidak berulang antar-pulau sebelum seluruh bank soal habis.
- HUD nyawa dan poin numerik serta rincian perolehan skor.


Website game edukasi berbasis **HTML5, CSS3, Vanilla JavaScript ES6, Canvas API, Web Audio API, dan Progressive Web App** tanpa framework atau proses build. Versi ini menyelesaikan seluruh tahap pengembangan dari fondasi hingga versi profesional yang siap dipamerkan dan di-host di GitHub Pages.

## Fitur utama

### 1. Fondasi dan antarmuka
- Enam halaman utama: Beranda, Bermain, Budaya, Cara Main, Leaderboard, dan Mode Guru.
- Navigasi responsif, menu mobile, dark mode, onboarding, transisi halaman, dan ornamen visual Nusantara.
- Tampilan desktop, tablet, dan ponsel.

### 2. Gameplay Canvas
- Mode Solo dan Co-op satu keyboard.
- Pemain, penjaga horizontal/vertikal, checkpoint, bendera, Start, timer, nyawa, skor, Combo, dan Shield.
- Pause, restart, fullscreen, kontrol sentuh Pemain 1, serta kondisi menang/kalah.
- Lima pulau dengan 3–6 penjaga, pola ritmis berbeda, dan perjalanan pulang yang lebih cepat.
- Pilihan kesulitan Santai, Normal, dan Ahli serta countdown sebelum ronde.

### 3. Sistem belajar
- 100 soal JSON: masing-masing 20 soal Informatika, IPS, IPA, Matematika, dan Bahasa Indonesia.
- Soal adaptif berdasarkan kategori yang perlu diperkuat.
- Rapor akhir sesi, profil belajar lokal, bonus jawaban benar, dan penalti jawaban salah.

### 4. Mode Guru, aksesibilitas, dan gamifikasi
- Membuat, mengedit, menghapus, mengaktifkan, mengimpor, serta mengekspor set soal JSON.
- Mode buta warna berbasis pola, remap delapan tombol, dan Mode Latihan tanpa penalti nyawa.
- Leaderboard lokal, streak harian, progres pulau, dan tujuh achievement.

### 5. Fitur profesional
- **Audio prosedural:** musik latar dan efek suara dibuat melalui Web Audio API tanpa file audio eksternal.
- **Mute global:** status suara disimpan di Local Storage.
- **Particle effect dan confetti:** dibuat dengan Canvas tanpa library tambahan.
- **PWA:** manifest, ikon aplikasi, shortcut, install prompt, dan tampilan standalone.
- **Offline Mode:** service worker menyimpan seluruh aset inti dan menyediakan halaman fallback offline.
- **Optimasi:** `requestAnimationFrame`, batas device pixel ratio, penghentian musik saat pause, auto-pause saat tab tidak aktif, lazy reveal, dan dukungan `prefers-reduced-motion`.
- Semua path relatif sehingga cocok untuk GitHub Pages.

## Struktur proyek

```text
gobak-sodor-nusantara/
  index.html
  game.html
  culture.html
  tutorial.html
  leaderboard.html
  teacher.html
  offline.html
  manifest.json
  service-worker.js
  css/
    style.css
    game.css
  js/
    app.js
    audio.js
    effects.js
    game.js
    player.js
    enemy.js
    quiz.js
    map.js
    teacher.js
    accessibility.js
    gamification.js
    difficulty.js
    leaderboard.js
    culture.js
  data/
    questions.json
  assets/
    img/
      icon-32.png
      icon-48.png
      icon-96.png
      icon-144.png
      icon-180.png
      icon-192.png
      icon-256.png
      icon-512.png
      icon-maskable-512.png
      social-preview.png
  docs/
    PROMPT-FINAL.md
    TAHAP-4-TESTING.md
    TAHAP-5-TESTING.md
    REVISI-GAMEPLAY-1.1.md
    REVISI-GAMEPLAY-1.2.md
```

## Menjalankan secara lokal

Game membaca bank soal melalui `fetch` dan service worker membutuhkan origin HTTP/HTTPS. Jangan membuka `game.html` hanya dengan klik ganda.

Dari folder proyek, jalankan:

```bash
python -m http.server 8000
```

Lalu buka:

```text
http://localhost:8000
```

Alternatif Node.js:

```bash
npx serve .
```

## Kontrol standar

- Pemain 1: **W, A, S, D**
- Pemain 2: **Arrow Up, Left, Down, Right**
- Pause/Resume: **P** atau **Escape**
- Kontrol dapat diubah pada panel Aksesibilitas di halaman Bermain.

## Menguji PWA dan Offline Mode

1. Jalankan proyek melalui `localhost` atau deploy ke HTTPS.
2. Buka seluruh halaman minimal satu kali agar aset masuk cache.
3. Buka DevTools → Application → Manifest dan pastikan ikon serta shortcut terbaca.
4. Buka Service Workers dan pastikan `service-worker.js` berstatus aktif.
5. Gunakan tombol **Pasang Aplikasi** apabila browser menampilkan install prompt.
6. Aktifkan mode Offline pada DevTools, lalu muat ulang halaman yang pernah dibuka.
7. Pastikan game, bank soal, Mode Guru, dan leaderboard tetap dapat digunakan.
8. Perubahan pada Local Storage tetap bertahan setelah aplikasi ditutup dan dibuka kembali.

> Service worker hanya aktif pada `localhost` atau HTTPS. GitHub Pages sudah menggunakan HTTPS.

## Deploy ke GitHub Pages

1. Buat repository baru.
2. Unggah isi folder proyek ke root repository.
3. Buka **Settings → Pages**.
4. Pilih **Deploy from a branch**.
5. Pilih branch `main` dan folder `/root`.
6. Setelah situs aktif, buka sekali dalam keadaan online agar cache PWA terbentuk.

Seluruh URL menggunakan path relatif sehingga aman ketika repository diterbitkan pada subfolder GitHub Pages.

## Penyimpanan Local Storage

- `gsn-theme`: tema terang/gelap.
- `gsn-onboarding-seen-v1`: status onboarding.
- `gsn-audio-muted-v1`: status mute.
- `gsnLeaderboardV1`: skor lokal.
- `gsnLearningProfileV1`: profil jawaban adaptif.
- `gsnQuestionSetsV1`: set soal buatan guru.
- `gsnActiveQuestionSetV1`: set soal yang aktif.
- `gsnMapProgressV1`: pulau terpilih dan level selesai.
- `gsnAccessibilityV1`: mode latihan, mode buta warna, dan remap kontrol.
- `gsnGamificationV1`: streak, kemenangan, statistik soal, dan achievement.
- `gsnDifficultyV1`: tingkat kesulitan terakhir yang dipilih.
- `gsnPlaytestV1`: maksimal 120 catatan ronde anonim untuk evaluasi balancing.

## Batasan versi statis

- Leaderboard hanya berlaku pada perangkat/browser yang sama.
- Sinkronisasi lintas siswa memerlukan backend opsional seperti Supabase.
- Font Poppins dan Font Awesome dimuat dari CDN saat pertama kali online. Jika CDN belum pernah masuk cache, mode offline tetap memakai font sistem dan seluruh fungsi utama tetap berjalan.


## Audit final

Lihat `docs/AUDIT-FINAL-1.2.3.md` untuk temuan perbaikan, hasil pengujian, dan checklist verifikasi setelah deployment.
