# PROMPT FINAL — Website Game Edukasi "Gobak Sodor Nusantara"

> Prompt ini ditujukan untuk agen coding (Claude Code / Codex / Gemini CLI).
> Baca seluruh prompt dulu, lalu ikuti **Pendekatan Bertahap** di bagian akhir.
> Jangan bangun semuanya sekaligus.

---

## 1. Ringkasan & Tujuan

Bangun sebuah **website game edukasi modern** berjudul **"Gobak Sodor Nusantara"** yang mengubah permainan tradisional Indonesia menjadi game edukasi berbasis web untuk siswa SMP.

Tiga tujuan yang harus terasa nyata di produk akhir:

1. **Melestarikan budaya** — bukan cuma lewat teks, tapi lewat pengalaman bermain.
2. **Media pembelajaran sungguhan** — layak dipakai guru di kelas minggu depan.
3. **Layak dipamerkan** — profesional untuk festival sekolah / pameran pendidikan.

Seluruh aset visual adalah **ilustrasi orisinal bertema budaya Indonesia** (dilarang menggunakan karakter atau IP berhak cipta). Kode ditulis agar mudah dipahami dan dimodifikasi oleh siswa SMP yang sedang belajar HTML, CSS, dan JavaScript.

---

## 2. Stack Teknologi

- HTML5
- CSS3
- Vanilla JavaScript (ES6, modul terpisah, OOP sederhana dengan `class`)
- Canvas API untuk gameplay
- **Tanpa framework**, tanpa library yang tidak diperlukan
- Responsive (desktop + mobile)
- PWA + Offline Mode
- Mudah di-host di **GitHub Pages** (semua path relatif, tanpa server build)

---

## 3. Filosofi Desain Inti (WAJIB — ini yang membedakan)

**Prinsip utama: mekanik harus mengajarkan nilai, bukan sekadar menyebutkannya.**

Gobak Sodor asli adalah permainan **beregu** yang mengajarkan **gotong royong**. Karena itu, game ini tidak boleh murni solo. Sediakan dua mode:

- **Mode Solo** — satu pemain, untuk latihan dan skor pribadi.
- **Mode Berdua (Co-op, satu keyboard)** — Pemain 1 pakai **WASD**, Pemain 2 pakai **Arrow Keys**. Salah satu pemain bisa "mengorbankan diri" memancing penjaga agar temannya lolos mengambil bendera. Gotong royong dialami, bukan dibaca.

Mode Co-op adalah fitur andalan saat demo (dua siswa main bareng selalu ramai ditonton). Prioritaskan agar terasa seru dan adil.

---

## 4. Struktur Halaman

### 4.1 Home (`index.html`)
- Hero section dengan ilustrasi Gobak Sodor
- Tombol: **Mulai Bermain**, **Belajar Budaya**, **Cara Bermain**, **Leaderboard**, **Mode Guru**
- Background bertema Indonesia dengan ornamen batik modern
- Tutorial singkat saat pertama kali membuka website (onboarding)

### 4.2 Belajar Budaya (`culture.html`)
Berisi konten edukasi:
- Sejarah Gobak Sodor & asal daerah
- **Varian daerah** — permainan yang sama punya banyak nama:
  - **Gobak Sodor** (Jawa Tengah / Jawa Timur)
  - **Galah Asin / Galasin** (Sunda & Betawi)
  - **Hadang** (versi olahraga tradisional resmi)
  - Jelaskan perbedaan nama, aturan, dan konteks daerahnya.
- Nilai budaya & nilai gotong royong
- Cara bermain versi asli
- Video YouTube (placeholder embed)
- Galeri gambar (ilustrasi orisinal)

### 4.3 Cara Bermain (`tutorial.html`)
Animasi sederhana yang menjelaskan: bergerak → menghindari penjaga → mengambil bendera → kembali ke garis awal.

### 4.4 Game (`game.html`)
Detail di bagian 5 & 6.

### 4.5 Leaderboard (`leaderboard.html`)
Detail di bagian 8.

### 4.6 Mode Guru / Kelas (`teacher.html`) — FITUR BARU
Ini yang mengubah proyek dari "keren dilihat" jadi "beneran dipakai":
- **Editor soal berbasis form** (bukan edit JSON manual) — guru/siswa bisa menambah, mengedit, menghapus soal lewat UI. Aman dari merusak kode.
- Buat "set soal" dengan nama & kategori sendiri.
- **Ekspor / Impor** set soal sebagai file `.json` agar bisa dibagikan (lewat "kode kelas" atau berbagi file).
- Simpan set soal buatan sendiri di Local Storage.

---

## 5. Gameplay

Gameplay menggunakan **Canvas**. Arena berbentuk kotak-kotak (grid) seperti lapangan Gobak Sodor / Hadang.

Elemen dalam arena:
- **Player** (1 atau 2, tergantung mode)
- **Penjaga horizontal** & **penjaga vertikal** (bergerak menyusuri garis)
- **Bendera** (tujuan yang harus diambil)
- **Finish / garis Start** (tempat kembali setelah ambil bendera)
- HUD: **Timer, Score, Nyawa, Level, Combo**, tombol **Pause**, indikator **Shield**

Kontrol:
- Player 1: **WASD** · Player 2 (co-op): **Arrow Keys**
- **Tombol bisa diremap** (lihat bagian Aksesibilitas)

Aturan inti:
- Ambil bendera, lalu kembali ke Start untuk menyelesaikan ronde.
- Menyentuh penjaga → **nyawa berkurang** (kecuali sedang Shield).
- Jawaban soal **benar** → dapat **Shield 5 detik**.
- Jawaban soal **salah** → **penjaga bergerak lebih cepat**.

### Peta Petualangan Nusantara — FITUR BARU
Ganti daftar level linear (1–5) menjadi **peta pulau Nusantara**. Pemain "berkelana" antar pulau (Jawa → Sumatra → Sulawesi → dst). Tiap pulau:
- Membuka fakta budaya lokal singkat.
- Menggunakan **tema varian daerah** (nama permainan, ornamen, warna, musik daerah berbeda).

Level tetap ada, tapi dibungkus sebagai perjalanan, bukan angka.

---

## 6. Sistem Soal

Popup soal muncul **sebelum masuk zona berikutnya**.

Kategori: **Informatika, IPS, IPA, Matematika, Bahasa Indonesia**.

Gunakan **JSON** sebagai database soal. Sediakan **minimal 100 soal dummy** yang valid dan tersebar rata di 5 kategori.

Format tiap soal:
```json
{
  "category": "Informatika",
  "question": "Apa kepanjangan CPU?",
  "choices": ["Central Processing Unit", "Computer Personal Unit", "Central Program Unit", "Control Processing Unit"],
  "answer": 0
}
```

### Soal Adaptif + Rapor Mata Pelajaran — FITUR BARU
- Catat pelajaran mana yang siswa **sering salah**, lalu perbanyak soal dari kategori itu.
- Di akhir sesi, tampilkan **rapor kecil** per mata pelajaran (mis. Matematika 80%, IPA 60%).
- Ini menambah dimensi belajar sungguhan dan jadi bahan presentasi yang kuat ("game yang tahu kelemahan siswa").

---

## 7. Level & Reward

| Level | Penjaga | Catatan |
|-------|---------|---------|
| 1 | 2 | Pengenalan, tema daerah 1 |
| 2 | 3 | |
| 3 | 4 | |
| 4 | 5 | |
| 5 | Boss Stage | Penjaga sangat cepat |

Reward & penalti:
- Jawaban benar: **+100 poin**, **Shield**, **bonus waktu**, menambah **Combo**
- Jawaban salah: **-10 poin**, penjaga lebih cepat

---

## 8. Leaderboard & Achievement

**Leaderboard** — gunakan **Local Storage**. Simpan: nama pemain, nilai, tanggal, level.

> Catatan penting: Local Storage hanya tersimpan **per-perangkat**, jadi papan peringkat tidak lintas-siswa. Untuk versi awal ini sudah cukup. Beri komentar `// TODO` di kode yang menandai tempat integrasi backend opsional (mis. Supabase) bila nanti ingin leaderboard bersama tanpa mengorbankan hosting statis.

**Achievement**: Anak Nusantara · Juara Gobak · Master Budaya · Pelari Hebat · Tak Tersentuh · Rajin Belajar.

**Tantangan Harian / Streak** (ala Duolingo) — pakai Local Storage untuk mendorong siswa kembali tiap hari.

---

## 9. Aksesibilitas — FITUR BARU (sering terlewat, penting untuk sekolah)

- **Mode buta warna** — jangan andalkan warna saja untuk membedakan penjaga; tambahkan bentuk/pola/ikon pembeda.
- **Tombol bisa diremap** oleh pemain.
- **Mode Latihan** — tanpa penalti nyawa, untuk siswa yang ingin belajar dulu tanpa tertekan.

---

## 10. Fitur Tambahan

Dark Mode · Progress Bar · Loading Screen · Pause / Resume · Fullscreen · Responsive Mobile · **PWA** · Offline Mode · Install App.

Bonus polish:
- AI sederhana untuk penjaga (pola gerak yang pintar tapi adil)
- Animasi kemenangan + **confetti** saat menang
- Particle effect, transisi halaman halus, tooltip
- Sound effect + background music (dengan tombol mute)

---

## 11. Desain Visual

- Gaya: **Duolingo bertemu Nintendo** — ceria, modern, ramah anak.
- Palet: Merah, Putih, Hijau, Biru, Kuning.
- Animasi halus, ornamen batik modern.
- Google Font: **Poppins**. Ikon: **Font Awesome**.
- Semua ilustrasi orisinal bertema Nusantara.

---

## 12. Struktur Project

```
gobak-sodor/
  index.html
  game.html
  culture.html
  tutorial.html
  leaderboard.html
  teacher.html          # Mode Guru / editor soal (BARU)
  manifest.json         # PWA
  service-worker.js     # Offline mode
  css/
    style.css
    game.css
  js/
    game.js             # loop utama & state
    player.js           # kelas Player (solo + co-op)
    enemy.js            # kelas Enemy + AI penjaga
    quiz.js             # sistem soal + adaptif + rapor
    leaderboard.js
    culture.js
    map.js              # peta petualangan Nusantara (BARU)
    teacher.js          # editor & impor/ekspor soal (BARU)
    accessibility.js    # remap tombol, mode buta warna (BARU)
  assets/
    img/
    audio/
  data/
    questions.json      # minimal 100 soal
```

Pisahkan setiap fitur menjadi modul JavaScript. Pisahkan **logic** dari **UI**.

---

## 13. Standar Kualitas Kode

- Clean Code, komentar lengkap dalam Bahasa Indonesia agar mudah dipelajari siswa SMP.
- OOP sederhana dengan ES6 `class`.
- Tanpa library yang tidak diperlukan. Tidak ada bug JavaScript.
- Optimalkan performa Canvas (gunakan `requestAnimationFrame`, hindari alokasi berlebih di loop).
- Mudah dikembangkan & dimodifikasi.

---

## 14. Pendekatan Bertahap (IKUTI URUTAN INI)

Jangan bangun semuanya sekaligus. Selesaikan dan pastikan tiap tahap berjalan sebelum lanjut:

1. **Tahap 1 — Fondasi.** Struktur proyek, semua halaman, navigasi, layout responsif, dan onboarding. Belum ada gameplay.
2. **Tahap 2 — Gameplay inti.** Arena Canvas, Player (solo), penjaga + gerakannya, bendera, nyawa, timer, kondisi menang/kalah.
3. **Tahap 3 — Sistem belajar.** Sistem soal + JSON 100 soal, skor, level, combo, Shield, leaderboard, rapor adaptif.
4. **Tahap 4 — Kedalaman & polish.** Mode Co-op, peta Nusantara + varian daerah, Mode Guru (editor soal), aksesibilitas, streak harian, achievement.
5. **Tahap 5 — Profesional.** Animasi, confetti, particle, audio, transisi, PWA + offline, optimasi performa, uji lintas perangkat.

Pada akhir tiap tahap, tampilkan ringkasan apa yang sudah dibuat dan cara mengujinya.
