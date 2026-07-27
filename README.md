# Simulasi Strategi Gobak Sodor — Versi 1.4.0

Simulasi pembelajaran interdisipliner untuk kelas VII, Hari 3 — Koding dan
Kecerdasan Artifisial (KKA). Fokusnya bukan kompetisi atau petualangan membuka
level, melainkan: **bermain, mengamati pola, menerapkan logika jika–maka,
mencoba strategi, dan merefleksikan hasil.** Teknologi berfungsi sebagai media
simulasi dan analisis strategi, bukan pengganti permainan Gobak Sodor nyata
yang sudah dilakukan pada pembelajaran PJOK.

## Perubahan versi 1.4.0

- **Fokus disederhanakan menjadi simulasi, bukan kompetisi.** Leaderboard, penyimpanan skor/nama pemain, peta perjalanan antarpulau, sistem membuka level, streak harian, combo, shield, dan bonus pengali skor **dihapus seluruhnya**. Skor sesi, waktu bermain, dan jumlah tertangkap tetap dicatat karena diperlukan untuk analisis pembelajaran.
- **Satu arena tunggal** (`js/arena.js` menggantikan `js/map.js`) — tanpa sistem pulau/level, sehingga pola penjaga dan posisi awal selalu konsisten untuk diamati dan diulang.
- **Layar awal disederhanakan**: judul "Simulasi Strategi Gobak Sodor", tiga blok singkat (Tujuan, Tantangan, Tugas Pengamatan), dan satu tombol utama **"MULAI SIMULASI"** (Mode Dua Pemain, paling menonjol) dengan Mode Satu Pemain sebagai pilihan tambahan. Pemilih tingkat kesulitan dan pemilih set soal guru (sudah tidak dapat diisi sejak portal dihapus) ikut dilepas.
- **Peran Dua Pemain eksplisit**: Pemain 1 Pembawa Bendera, Pemain 2 Pengalih Penjaga — sesuai instruksi di layar.
- **Indikator baru** menggantikan HUD lama: Waktu (stopwatch naik, bukan hitung mundur), **Kesempatan** (menggantikan istilah "Nyawa"), Tertangkap, Garis Berhasil Dilewati, Jawaban (x/6), dan Skor Pemahaman.
- **Batas tiga kali tertangkap**: setelah tertangkap tiga kali, muncul pilihan "Coba Lagi dari Posisi Terakhir" atau "Ulangi Simulasi" — sesi tidak langsung berakhir, dan jawaban salah tidak lagi dihukum dengan mempercepat penjaga.
- **Umpan balik kuis** kini memakai ikon + teks (✓ Jawaban Tepat / ! Perlu Ditinjau Kembali) agar tidak hanya mengandalkan warna, dengan penjelasan singkat maksimal dua kalimat.
- **Bank soal berbasis situasi dan logika**, bukan hafalan fakta: enam soal tetap untuk Mode Simulasi Video (`data/questions.json` → `demo`) dan 12 soal (3 per mapel: KKA, PJOK, IPS, Seni Rupa) untuk Mode Latihan Kelas (`bank`) yang diacak dengan kuota kategori setiap sesi.
- **Halaman hasil baru "Hasil Simulasi Strategi"**: waktu penyelesaian, jawaban benar, jumlah tertangkap, garis berhasil dilewati, Analisis Strategi otomatis berbasis data permainan (tanpa peringkat/skor tertinggi), dan tiga pertanyaan **Refleksi** yang membandingkan permainan digital dengan permainan nyata.
- **Mode Simulasi Video** (`game.html?demo=1`): urutan enam soal, posisi awal, dan pola penjaga selalu sama; Mode Dua Pemain langsung terpilih; tombol kecil **"Ulangi Adegan"** mengembalikan simulasi ke kondisi awal untuk pengambilan gambar.
- Cache PWA dinaikkan ke `gsn-v1.4.0`; `js/leaderboard.js`, `js/map.js`, `js/difficulty.js`, `js/gamification.js`, dan `leaderboard.html` dihapus dari repo dan dari precache.

## Riwayat versi sebelumnya

### Versi 1.3.0 — Repo disederhanakan menjadi situs satu game

Portal Permainan Nusantara (beranda portal, login/akun Supabase, dashboard guru/siswa/admin, editor soal, dan game Jelajah Nusantara) dihapus; seluruh berkas Gobak Sodor dipindah ke root repo. Bank soal diganti menjadi empat mata pelajaran (IPS, PJOK, KKA, Seni Rupa), kontrol sentuh dua pemain ditambahkan untuk layar sentuh besar (IFP), dan halaman Beranda dialihkan ke halaman Bermain.

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


Website simulasi edukasi berbasis **HTML5, CSS3, Vanilla JavaScript ES6, Canvas API, Web Audio API, dan Progressive Web App** tanpa framework atau proses build, sehingga tetap ringan untuk GitHub Pages.

## Fitur utama

### 1. Fondasi dan antarmuka
- Tiga halaman utama: Bermain (sekaligus pintu masuk), Budaya, dan Cara Main. Beranda lama dialihkan ke halaman Bermain.
- Navigasi responsif, menu mobile, dark mode, onboarding, transisi halaman.
- Tampilan desktop, tablet, dan layar sentuh besar (PID/IFP) — tanpa horizontal scrolling.

### 2. Gameplay Canvas
- Mode Satu Pemain dan Dua Pemain (keyboard atau layar sentuh). Dua Pemain: Pemain 1 Pembawa Bendera, Pemain 2 Pengalih Penjaga.
- Satu arena tetap: pemain, penjaga horizontal/vertikal dengan lima pola ritme (steady, pause, pulse, surge, fakeout), checkpoint, bendera, dan START.
- Pause, restart, "Ulangi Adegan" (Mode Simulasi Video), fullscreen, dan kontrol sentuh Pemain 1 dan Pemain 2.
- Maksimal tiga kali tertangkap sebelum muncul pilihan lanjut dari posisi aman atau mengulang simulasi.

### 3. Sistem belajar
- Enam soal tetap (Mode Simulasi Video) dan 12 soal acak berkuota kategori (Mode Latihan Kelas), masing-masing berbasis situasi permainan, logika jika–maka, dan analisis — bukan hafalan fakta.
- Empat kategori: KKA, PJOK, IPS, dan Seni Rupa, dengan kalimat penjelasan singkat setelah setiap jawaban.
- Halaman Hasil Simulasi Strategi: waktu, jawaban benar, jumlah tertangkap, garis dilewati, analisis strategi otomatis, dan refleksi digital vs. nyata.

### 4. Aksesibilitas
- Mode buta warna berbasis pola (bukan warna semata), remap delapan tombol, dan Mode Latihan (sesi tidak berhenti karena batas tertangkap).
- Target sentuh besar, teks berskala untuk dibaca dari jarak beberapa meter, fokus keyboard pada modal.

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
    arena.js
    accessibility.js
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

- Pemain 1: **W, A, S, D** atau tombol arah sentuh di kiri bawah arena.
- Pemain 2: **Arrow Up, Left, Down, Right** atau tombol arah sentuh di kanan bawah arena (Mode Dua Pemain).
- Pause/Resume: **P** atau **Escape**.
- Kontrol keyboard dapat diremap pada panel Aksesibilitas di halaman Bermain.

## Mode Simulasi Video

Buka `game.html?demo=1` untuk alur yang konsisten saat pengambilan gambar:

- Urutan enam soal, posisi awal pemain/penjaga, dan pola gerak penjaga selalu sama (tidak ada elemen acak).
- Mode Dua Pemain langsung terpilih; opsi Mode Satu Pemain disembunyikan.
- Tombol kecil **"Ulangi Adegan"** muncul di HUD untuk mengembalikan simulasi ke kondisi awal.
- Parameter `?demo=1` tidak ditampilkan ke pengguna di layar mana pun.

## Menguji PWA dan Offline Mode

1. Jalankan proyek melalui `localhost` atau deploy ke HTTPS.
2. Buka seluruh halaman minimal satu kali agar aset masuk cache.
3. Buka DevTools → Application → Manifest dan pastikan ikon serta shortcut terbaca.
4. Buka Service Workers dan pastikan `service-worker.js` berstatus aktif.
5. Gunakan tombol **Pasang Aplikasi** apabila browser menampilkan install prompt.
6. Aktifkan mode Offline pada DevTools, lalu muat ulang halaman yang pernah dibuka.
7. Pastikan simulasi dan bank soal tetap dapat digunakan secara offline.
8. Perubahan pada Local Storage (tema, audio, aksesibilitas) tetap bertahan setelah aplikasi ditutup dan dibuka kembali.

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
- `gsnAccessibilityV1`: mode latihan, mode buta warna, dan remap kontrol.
- `gsnTouchControlsV1`: preferensi paksa-tampil kontrol sentuh.

Setiap simulasi berdiri sendiri (tanpa riwayat lintas sesi/perangkat) — tidak ada lagi profil belajar, set soal guru, progres pulau, streak, atau data playtest yang disimpan permanen.

## Batasan versi statis

- Tidak ada penyimpanan skor atau peringkat lintas siswa/perangkat — sesuai tujuan simulasi (bukan kompetisi), hasil hanya ditampilkan untuk direfleksikan saat itu juga.
- Font Poppins dan Font Awesome dimuat dari CDN saat pertama kali online. Jika CDN belum pernah masuk cache, mode offline tetap memakai font sistem dan seluruh fungsi utama tetap berjalan.


## Audit final

Lihat `docs/AUDIT-FINAL-1.2.3.md` untuk temuan perbaikan, hasil pengujian, dan checklist verifikasi setelah deployment.
