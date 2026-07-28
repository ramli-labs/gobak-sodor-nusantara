# Simulasi Strategi Gobak Sodor — Versi 1.6.0

Simulasi pembelajaran interdisipliner untuk kelas VII, Hari 3 — Koding dan
Kecerdasan Artifisial (KKA). Fokusnya bukan kompetisi atau petualangan membuka
level, melainkan: **membaca posisi dan target penjaga, menerapkan logika
jika–maka, bekerja sama, mencoba strategi, dan merefleksikan hasil.**
Teknologi berfungsi sebagai media simulasi dan analisis strategi, bukan
pengganti permainan Gobak Sodor nyata yang sudah dilakukan pada pembelajaran
PJOK. Gim ini merupakan **adaptasi** aturan Gobak Sodor/Hadang untuk simulasi
pembelajaran, bukan replika penuh aturan resmi.

## Perubahan versi 1.6.0

Revisi mekanik utama agar lebih sesuai dengan permainan tradisional Gobak
Sodor/Hadang. Sistem soal, hasil belajar, kontrol, event log, Mode Simulasi
Video, dan tampilan dasar dari versi 1.5.0 dipertahankan.

- **Mekanik bendera dihapus sepenuhnya.** Tidak ada lagi objek bendera, status "membawa bendera", atau teks "Pembawa Bendera". Tujuan permainan kini: **lewati seluruh garis penjaga, capai Garis Belakang, lalu kembali ke START tanpa tersentuh.**
- **P1 dan P2 menjadi penyerang yang setara.** Tidak ada lagi jabatan tetap "pembawa" atau "pengalih" — keduanya dapat melewati garis penjaga, mencapai Garis Belakang, dan kembali ke START secara independen, masing-masing dengan progres terpisah (`currentBox`, `highestLineReached`, `status`, dll.). Mengecoh penjaga tetap dapat terjadi, tetapi sebagai strategi yang muncul saat bermain (dicatat lewat event log), bukan peran baku. Mode Satu Pemain: hanya P1 yang bermain dengan aturan yang sama.
- **Arena diberi nama garis eksplisit**: Garis Awal (START), Garis Penjaga 1–3, Garis Belakang, dan Garis Sodor (satu garis membujur di tengah lapangan) — semuanya digambar dan diberi label pada Canvas.
- **Dua jenis penjaga dengan gerak dibatasi garis tugasnya.** Penjaga Garis Melintang (segi delapan, 3 unit) hanya bergerak kiri–kanan menyusuri lebar lapangan pada satu Garis Penjaga tetap. Penjaga Sodor (segi enam, warna berbeda, 1 unit) berdiri di Garis Sodor dan hanya bergerak maju–mundur menyusuri kedalaman lapangan. Tidak ada gerak diagonal maupun pindah garis.
- **Kecerdasan penjaga mempertimbangkan kedua pemain sekaligus**: threat score kini menyertakan sinyal "pemain lain sedang membuka jalur" (`teammateOpening`, berdasarkan kecepatan gerak rekan satu tim) menggantikan sinyal status pembawa bendera. Target lock, histeresis, dan reaction delay tetap dipertahankan dari versi 1.5.0. Penjaga tidak pernah menargetkan pemain yang sudah tertangkap atau selesai.
- **Sekali tertangkap, keluar dari percobaan itu — tanpa dibangkitkan kembali.** Sistem "tiga kali kesempatan" dan modal batas tangkapan dihapus. Pemain yang tertangkap berhenti bergerak dan tercatat (penjaga penangkap, garis, posisi, waktu, fase), sementara pemain lain tetap bermain. Percobaan berakhir ketika seluruh pemain tertangkap/selesai, atau waktu habis. Mode Latihan kini berarti: tertangkap hanya memberi jeda singkat, perjalanan tetap berlanjut.
- **Skor perjalanan per pemain**: +1 saat mencapai Garis Belakang, +1 lagi saat kembali ke START (maksimal 2/pemain). Skor tim adalah jumlah P1 + P2 — dipakai sebagai data pembanding strategi belajar, bukan peringkat.
- **HUD baru**: Waktu, Pemain Aktif, Tertangkap, Sampai Garis Belakang, Kembali ke START, Garis Dilewati, Jawaban, Skor Pemahaman. Indikator Bendera dan Kesempatan dihapus.
- **Pemicu enam soal berbasis tonggak tim** (bukan per-perlintasan individu) agar totalnya selalu tepat enam: dua soal saat tim melewati garis-garis perjalanan pergi, satu soal saat pemain pertama mencapai Garis Belakang, dua soal saat tim melewati garis-garis perjalanan pulang, dan satu soal saat pemain pertama kembali ke START (atau sebagai penutup bila sesi berakhir sebelum ada yang kembali).
- **Halaman Hasil Simulasi diperbarui**: waktu permainan, skor perjalanan P1/P2, jumlah mencapai Garis Belakang, jumlah kembali ke START, jumlah tertangkap, penjaga paling sering menangkap, garis paling sulit dilewati, jawaban benar, skor pemahaman, dan pola gerak berhasil/gagal — seluruh kalimat analisis diturunkan dari event log sesi itu sendiri, bukan teks tetap.
- **Mode Simulasi Video** memakai pintasan adegan baru `&scene=start|quiz1|quiz2|backline|return|result` (menggantikan `scene=flag`); perjalanan pergi berakhir di Garis Belakang, perjalanan pulang berakhir di START, dan kedua jenis penjaga dibedakan jelas lewat bentuk serta warna.
- Cache PWA dinaikkan ke `gsn-v1.6.0`.

## Riwayat versi sebelumnya

### Versi 1.5.0

- **Penjaga mengejar target secara otomatis**, menggantikan pola patroli tetap. Setiap penjaga (`js/enemy.js`) tetap terikat pada garis tugasnya (horizontal/vertikal) tetapi mengejar *proyeksi* posisi pemain pada garis itu, dipilih lewat *threat score* (jarak ke garis, arah gerak, status pembawa bendera, kecepatan gerak) — bukan acak. Target dikunci minimal 1,5 detik dengan histeresis 20% agar tidak bergetar antarpemain, dan bergerak dengan reaction delay ±250–500 ms serta percepatan/perlambatan (bukan lompatan instan).
- **Peran pemain dipisah ketat**: P1 (Pembawa Bendera) satu-satunya yang dapat memicu checkpoint, mengambil bendera, dan menyelesaikan sesi. P2 (Pengalih Penjaga) dapat menarik target penjaga tetapi tidak dapat mengambil bendera atau memicu checkpoint. Mode Satu Pemain: seluruh penjaga otomatis hanya dapat menargetkan P1.
- **Indikator target** tampil di atas setiap penjaga ("Target: P1" / "Target: P2" / "Siaga", bentuk chip berbeda per target agar tidak hanya dibedakan warna) beserta panel ringkas **Fokus Penjaga**. Guru dapat menyembunyikannya lewat Aksesibilitas.
- **Pengalihan penjaga (diversion) hanya dihitung berhasil bila didukung bukti**: penjaga sebelumnya menargetkan P1, berpindah ke P2, dan dalam ≤4 detik P1 melewati checkpoint/mengambil bendera tanpa tertangkap. Jika tidak, dicatat sebagai gagal — tidak pernah diklaim berhasil tanpa data.
- **Sistem tabrakan rinci**: setiap tangkapan mencatat penjaga, garis tugas, pemain, posisi, waktu, dan fase (pergi/pulang) — pesan di layar menyebut penjaga yang menangkap (mis. "P1 tertangkap Penjaga 2"), bukan sekadar checkpoint terdekat.
- **Posisi aman terakhir (`lastSafePosition`)** per pemain, diperbarui setiap checkpoint berhasil dilewati; P1 yang tertangkap kembali ke posisi itu (bukan selalu ke START), dengan invulnerability singkat ±1 detik.
- **Event log pembelajaran** (`js/eventlog.js`) mencatat kejadian penting satu sesi (bukan setiap frame): checkpoint dilewati, bendera diambil, tertangkap, target penjaga berubah, pengalihan dimulai/berhasil/gagal, soal tampil/dijawab, dan sesi selesai — menjadi dasar Hasil Simulasi Strategi dan Data untuk LKPD.
- **Bank soal diganti menjadi 12 soal tetap** (3 KKA, 3 PJOK, 3 IPS, 3 Seni Rupa) berbasis situasi/logika, bukan hafalan fakta. Mode Latihan Kelas mengambil 6 dari 12 secara acak (kuota ≥2 KKA/≥1 PJOK/≥1 IPS/≥1 Seni Rupa + 1 bebas, Fisher–Yates, posisi pilihan A–D ikut diacak per soal). Mode Simulasi Video memakai urutan 6 soal tetap (`demoOrder`) tanpa acak apa pun. Validator kualitas soal (`validateQuestionBank`) berjalan otomatis dan hanya menulis peringatan ke console, tidak pernah ke siswa.
- **Bug inisialisasi diperbaiki**: sesi 6 soal sebelumnya sempat terbentuk sebelum bank soal selesai dimuat; urutan kini mengikuti muat → validasi → `quizReady=true` → bentuk sesi → reset → tampilkan overlay siap.
- **Hasil Simulasi Strategi diperluas**: waktu total/pergi/pulang, jawaban benar, skor pemahaman, tertangkap P1 dan P2 (terpisah), garis dilewati, penjaga paling sering menangkap, garis paling sering gagal, serta jumlah pengalihan berhasil/gagal — plus bagian **Data untuk LKPD** siap salin (tombol "Salin Ringkasan", tanpa backend).
- **Mode Simulasi Video** (`game.html?demo=1`) kini mendukung pintasan adegan `&scene=start|quiz1|quiz2|flag|return|result` untuk memfilmkan tiap segmen tanpa mengulang seluruh alur; parameter teknis tidak pernah ditampilkan ke siswa.
- **`leaderboard.html` dibuat ulang sebagai redirect aman** ke `game.html` (bukan 404) untuk tautan/bookmark lama. Local Storage lama (`gsnLeaderboardV1`, `gsnMapProgressV1`, dll.) dibersihkan otomatis sekali lewat migrasi aman di `js/app.js`.
- Cache PWA dinaikkan ke `gsn-v1.5.0` dan kini mengabaikan string kueri (`ignoreSearch`) agar `game.html?demo=1` tetap dapat dibuka offline.

### Versi 1.4.0 — Simulasi, bukan kompetisi

Leaderboard, penyimpanan skor/nama pemain, peta perjalanan antarpulau, sistem membuka level, streak harian, combo, shield, dan bonus pengali skor dihapus. Layar awal disederhanakan (Tujuan/Tantangan/Tugas Pengamatan + tombol "MULAI SIMULASI"), HUD diganti (Kesempatan, Tertangkap, Garis Dilewati, Jawaban, Skor Pemahaman), dan ditambahkan halaman Hasil Simulasi Strategi serta Refleksi.

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
- Mode Satu Pemain dan Dua Pemain (keyboard atau layar sentuh). Dua Pemain: P1 dan P2 sama-sama penyerang, progres dicatat terpisah — tidak ada jabatan tetap "pembawa" atau "pengalih".
- Satu arena tetap dengan garis bernama: Garis Awal (START), Garis Penjaga 1–3, Garis Belakang, dan Garis Sodor (lihat "Sistem Penjaga" di bawah). Tidak ada objek bendera.
- Pause, restart, "Ulangi Adegan" (Mode Simulasi Video), fullscreen, dan kontrol sentuh P1 dan P2.
- Sekali tertangkap, pemain itu keluar dari percobaan (tidak dibangkitkan kembali) dan pemain lain tetap bermain. Percobaan berakhir saat semua pemain tertangkap/selesai atau waktu habis. Mode Latihan: tertangkap hanya memberi jeda singkat, perjalanan tetap berlanjut.

### 3. Sistem Penjaga (Target-Chasing AI)
- Dua jenis penjaga terikat ketat pada garis tugasnya: **Penjaga Garis Melintang** (3 unit, segi delapan) hanya bergerak kiri–kanan menyusuri lebar lapangan pada satu Garis Penjaga tetap; **Penjaga Sodor** (1 unit, segi enam) berdiri di Garis Sodor dan hanya bergerak maju–mundur menyusuri kedalaman lapangan. Tidak ada gerak diagonal maupun pindah garis.
- Target dipilih dari *threat score* (kedekatan ke garis, arah gerak menuju garis, kecepatan gerak, dan sinyal "pemain lain sedang membuka jalur") — bukan acak — dengan target lock ≥1,5 detik dan histeresis 20% agar tidak bergetar. Penjaga tidak pernah menargetkan pemain yang sudah tertangkap atau selesai.
- Reaction delay ±250–500 ms (tetap ±350 ms pada Mode Simulasi Video) dan gerakan memakai percepatan/perlambatan (steering) dengan jarak berhenti agar tidak bergetar di dekat target.
- Tanpa target dalam radius deteksi, penjaga kembali siaga (goyangan kecil di titik asal, bukan patroli panjang).
- Indikator "Target: P1/P2/Siaga" tampil di atas tiap penjaga plus panel ringkas "Fokus Penjaga"; dapat disembunyikan lewat Aksesibilitas.

### 4. Sistem belajar
- 12 soal tetap (3 KKA, 3 PJOK, 3 IPS, 3 Seni Rupa) berbasis situasi permainan, logika jika–maka, dan analisis — bukan hafalan fakta.
- Mode Latihan Kelas: 6 dari 12 diacak dengan kuota kategori dan posisi pilihan A–D ikut diacak. Mode Simulasi Video: 6 soal urutan tetap, posisi pilihan tidak diacak. Enam soal dipicu berdasarkan tonggak tim (garis-garis perjalanan pergi/pulang, mencapai Garis Belakang, dan kembali ke START), bukan per-perlintasan individu.
- Halaman Hasil Simulasi Strategi: waktu permainan, skor perjalanan P1/P2, jumlah mencapai Garis Belakang, jumlah kembali ke START, jumlah tertangkap, penjaga paling sering menangkap, garis paling sulit dilewati, jawaban benar, skor pemahaman, Analisis Strategi otomatis berbasis event log, Data untuk LKPD siap salin, dan refleksi digital vs. nyata.

### 5. Aksesibilitas
- Mode buta warna berbasis pola dan bentuk (bukan warna semata — termasuk bentuk penjaga), remap delapan tombol, Mode Latihan (tertangkap tidak menghentikan perjalanan pemain), dan toggle sembunyikan indikator target penjaga (untuk guru).
- Target sentuh besar, teks berskala untuk dibaca dari jarak beberapa meter, fokus keyboard pada modal.

### 6. Fitur profesional
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
    eventlog.js
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

- Urutan enam soal, posisi awal pemain/penjaga, reaction delay, dan pemilihan target penjaga selalu sama (tidak ada elemen acak).
- Mode Dua Pemain langsung terpilih; opsi Mode Satu Pemain disembunyikan.
- Tombol kecil **"Ulangi Adegan"** muncul di HUD untuk mengembalikan simulasi ke kondisi awal.
- Parameter `?demo=1` dan `&scene=...` tidak ditampilkan ke pengguna di layar mana pun.

Pintasan adegan (tambahkan `&scene=...` setelah `?demo=1`) untuk memfilmkan tiap segmen tanpa mengulang seluruh alur:

| Pintasan | Kondisi yang ditampilkan |
|---|---|
| `game.html?demo=1&scene=start` | Layar siap, sebelum countdown |
| `game.html?demo=1&scene=quiz1` | Modal soal pertama (Garis Penjaga 1) |
| `game.html?demo=1&scene=quiz2` | Modal soal kedua (Garis Penjaga 2) |
| `game.html?demo=1&scene=backline` | P1 tepat di depan Garis Belakang |
| `game.html?demo=1&scene=return` | P1 sudah mencapai Garis Belakang, perjalanan pulang |
| `game.html?demo=1&scene=result` | Halaman Hasil Simulasi Strategi |

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
- `gsnAccessibilityV1`: mode latihan, mode buta warna, sembunyikan indikator target, dan remap kontrol.
- `gsnTouchControlsV1`: preferensi paksa-tampil kontrol sentuh.
- `gsn-migration-v2-done`: penanda migrasi sekali jalan yang membersihkan kunci lama (`gsnLeaderboardV1`, `gsnMapProgressV1`, `gsnGamificationV1`, `gsnDifficultyV1`, `gsnPlaytestV1`, dll.) dari perangkat yang pernah memakai versi lama.

Setiap simulasi berdiri sendiri (tanpa riwayat lintas sesi/perangkat) — tidak ada lagi profil belajar, set soal guru, progres pulau, streak, atau data playtest yang disimpan permanen. `leaderboard.html` tetap ada sebagai halaman pengalihan aman (redirect) ke `game.html` untuk tautan atau bookmark lama.

## Batasan versi statis

- Tidak ada penyimpanan skor atau peringkat lintas siswa/perangkat — sesuai tujuan simulasi (bukan kompetisi), hasil hanya ditampilkan untuk direfleksikan saat itu juga.
- Font Poppins dan Font Awesome dimuat dari CDN saat pertama kali online. Jika CDN belum pernah masuk cache, mode offline tetap memakai font sistem dan seluruh fungsi utama tetap berjalan.


## Audit final

Lihat `docs/AUDIT-FINAL-1.2.3.md` untuk temuan perbaikan, hasil pengujian, dan checklist verifikasi setelah deployment.
