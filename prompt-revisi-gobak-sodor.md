# Prompt Revisi — Gobak Sodor Nusantara (disesuaikan dengan struktur repo saat ini)

> Salin bagian di bawah ini ke Claude Code. Jalankan dari root repo `gobak-sodor-nusantara`.

---

## KONTEKS

Repo ini adalah **Portal Permainan Nusantara** (HTML/CSS/Vanilla JS, static site untuk GitHub Pages). Game **Gobak Sodor Nusantara v1.2.3** berada di folder `games/gobak-sodor/` — BUKAN di root. File `game.html`, `culture.html`, dan `tutorial.html` di root hanyalah stub redirect ke folder game. Portal punya tiga mode runtime (Lokal / Demo / Supabase) dengan dashboard guru, editor soal, kelas, dan tugas — **infrastruktur portal ini di luar lingkup revisi dan tidak boleh rusak**.

Game akan dipakai sebagai **media pembelajaran interdisipliner** di kelas SMP, dijalankan di **Interactive Flat Panel (IFP)** — layar sentuh besar di depan kelas. Guru mendemonstrasikan, lalu siswa maju bergiliran. Game juga harus tetap nyaman di HP/laptop siswa.

Dua tujuan revisi: (1) **optimasi untuk IFP & multi-perangkat**, (2) **penyelarasan konten dengan empat Tujuan Pembelajaran (TP)** dari empat mata pelajaran. Bank soal bawaan saat ini berisi 5 kategori lama (Informatika, IPS, IPA, Matematika, Bahasa Indonesia — 20 soal per kategori) yang harus diganti.

## PETA KODE (SUDAH DIVERIFIKASI — mulai dari sini, tapi tetap cek ulang sebelum mengubah)

- **Logika kontrol**: `games/gobak-sodor/js/game.js`. Kelas input di bagian atas file sudah punya **D-pad sentuh berbasis pointer events**, tetapi hanya aktif untuk Player 1 (`touchEnabled = playerId === "p1"`, sekitar baris 108). Jadi touch bukan tidak ada — yang kurang adalah zona sentuh Player 2 dan ukuran target.
- **Bank soal bawaan**: `games/gobak-sodor/data/questions.json` — 100 soal, skema `{id, category, question, choices, answer}` **tanpa field penjelasan**.
- **Duplikat lama**: `js/` dan `data/questions.json` di root repo adalah salinan identik peninggalan struktur lama dan tampaknya tidak direferensikan HTML mana pun — verifikasi, lalu hapus atau setidaknya jangan biarkan tidak sinkron.
- **Logika kuis**: `games/gobak-sodor/js/quiz.js`. Selain memuat `questions.json`, kuis juga bisa memakai **set soal kustom** dari portal via localStorage (`gsnQuestionSetsV1`), dengan minimal 6 soal (`MIN_PLAYABLE_QUESTIONS`). Anti-pengulangan soal dalam satu kampanye **sudah ada** (`CAMPAIGN_QUESTION_HISTORY_KEY`) — pertahankan.
- **Skema soal portal** (Supabase `001_portal_schema.sql`, `shared/js/demo-backend.js`, `shared/js/question-editor.js`) **sudah punya field `explanation`** — game belum menampilkannya.
- **Legenda ritme penjaga sudah ada**: `games/gobak-sodor/game.html` (kartu "Legenda ritme": stabil / berhenti singkat Ⅱ / cepat–lambat ~ / lonjakan + / tipuan arah ↔) dan `games/gobak-sodor/js/enemy.js`.
- **"Mode Guru"** di nav/footer game menaut ke `../../teacher.html` — itu **dashboard guru portal** (dilindungi role, dipakai untuk kelas/tugas/soal lintas game). `games/gobak-sodor/teacher.html` hanya redirect stub, dan `games/gobak-sodor/js/teacher.js` adalah kode yatim yang tidak direferensikan HTML mana pun.
- **PWA**: satu `service-worker.js` di root, `CACHE_NAME = "ppn-v1.1.0-rc"`, mem-precache `games/gobak-sodor/data/questions.json` dan halaman game. **Setiap revisi file yang di-precache wajib menaikkan versi cache** agar pengguna lama mendapat konten baru.

## EMPAT MATA PELAJARAN & TUJUAN PEMBELAJARAN (WAJIB DIACU)

1. **IPS** — Memahami dan merefleksikan konsep kehidupan manusia dalam ruang dan waktu (sosial, budaya, ekonomi) serta menerapkannya dalam kehidupan sehari-hari.
   → Soal tentang asal-usul & sebaran nama permainan (galasin/galah asin/hadang), nilai gotong royong, kerja sama, sportivitas, permainan tradisional sebagai warisan budaya.

2. **PJOK** — Mengembangkan strategi gerak untuk keberhasilan keterampilan gerak melintasi berbagai situasi gerak yang menantang.
   → Soal/mekanik tentang strategi menembus barisan, mengatur posisi, memilih waktu bergerak, koordinasi tim penyerang–penjaga.

3. **KKA (Koding & Kecerdasan Artifisial)** — Menerapkan pemecahan masalah sederhana dalam kehidupan masyarakat.
   → Soal berbasis *computational thinking*: membaca pola gerak penjaga, memprediksi posisi, menentukan langkah aman (dekomposisi, pengenalan pola, algoritma sederhana). **Kaitkan langsung dengan legenda ritme yang sudah ada** (stabil / berhenti singkat / cepat–lambat / lonjakan / tipuan arah).

4. **Seni Rupa** — Mengidentifikasi potensi alat & bahan di lingkungan sekitar, lalu menerapkannya untuk berkarya.
   → Soal tentang elemen visual permainan (garis lapangan, penanda, bahan sederhana seperti kapur/tali/batu), serta bagaimana lapangan tradisional dibuat dari bahan sekitar.

## TUGAS 1 — OPTIMASI UNTUK IFP & MULTI-PERANGKAT

Semua perubahan di folder `games/gobak-sodor/` (JS, CSS di `games/gobak-sodor/css/`):

- **Perluas kontrol sentuh yang sudah ada**: D-pad sentuh saat ini hanya untuk P1. Untuk **mode Co-op di IFP**, tambahkan zona kontrol sentuh kedua (kiri layar untuk P1, kanan untuk P2, atau sebaliknya) sambil mempertahankan WASD + panah untuk laptop. Pertimbangkan juga kontrol tap-petak untuk mode solo bila masuk akal dengan grid papan yang ada.
- **Perbesar target sentuh**: tombol D-pad, tombol menu, dan tombol jawaban soal minimal ~64px dengan jarak antar-tombol cukup agar tidak salah tekan di layar besar.
- **Tipografi terbaca dari jarak jauh**: perbesar font soal & status pada layar lebar (media query / `clamp()`) supaya terbaca dari belakang kelas.
- **Responsif penuh**: papan permainan (canvas) harus menyesuaikan dari HP kecil sampai IFP besar tanpa terpotong atau scroll horizontal.
- **Jangan andalkan hover semata** — audit elemen yang hanya memberi umpan balik saat hover (tidak ada hover di layar sentuh).
- Pertahankan dan pastikan tetap berfungsi: tingkat kesulitan (Santai/Normal/Ahli), mode latihan, mode buta warna (`accessibility.js`), audio, dan gamifikasi.

## TUGAS 2 — PENYELARASAN BANK SOAL KE 4 MAPEL

- Ganti isi `games/gobak-sodor/data/questions.json`: kategori lama (Informatika, IPS lama, IPA, Matematika, Bahasa Indonesia) diganti **empat mapel: IPS, PJOK, KKA, Seni Rupa**, minimal **6 soal per mapel** (total ≥24), tingkat SMP, tema gobak sodor, sesuai TP di atas.
- **Tambahkan field `explanation`** (satu kalimat edukatif) pada tiap soal, lalu buat kuis menampilkannya setelah dijawab. Selaraskan dengan skema portal yang sudah memakai `explanation` — bila set soal kustom dari portal dipetakan di `quiz.js`, ikutkan field ini agar soal buatan guru juga tampil penjelasannya.
- Jaga `MIN_PLAYABLE_QUESTIONS` (6) tetap terpenuhi dan mekanik **"3 soal pergi + 3 soal pulang"** tetap jalan. Idealnya satu ronde memunculkan campuran keempat mapel.
- Tampilkan **badge mapel** (IPS/PJOK/KKA/Seni Rupa) pada tiap soal di modal kuis.
- **Anti-pengulangan soal sudah ada** — jangan sampai regresi.
- Rapikan turunannya: hapus/sinkronkan duplikat root `data/questions.json` + `js/`, dan perbarui contoh soal di `shared/js/demo-backend.js` serta seed Supabase (`supabase/seed/`) **hanya jika** masih memuat kategori lama yang tampil ke pengguna — laporkan temuannya, jangan ubah skema database.
- Jika ada "rapor pelajaran" per kategori di gamifikasi/hasil akhir, sesuaikan labelnya ke empat mapel baru.

## TUGAS 3 — LEPASKAN GAME DARI "MODE GURU" & PINDAHKAN INFO KURIKULUM

Penting: tautan "Mode Guru" di game menuju **dashboard guru portal** (`teacher.html` di root) yang juga melayani manajemen kelas, tugas, dan editor soal lintas game. **Jangan hapus dashboard portal itu.** Yang diminta:

- **Hapus tautan "Mode Guru"** dari nav dan footer semua halaman game: `games/gobak-sodor/index.html`, `game.html`, `culture.html`, `tutorial.html`, `leaderboard.html` — termasuk teks promosi "Lihat Mode Guru" dan penyebutan Mode Guru di copy halaman index game. Pastikan tidak ada tautan menggantung.
- Hapus juga file yatim: `games/gobak-sodor/teacher.html` (redirect stub) dan `games/gobak-sodor/js/teacher.js` (tidak direferensikan) — **verifikasi dulu** dengan grep bahwa memang tidak ada yang memakainya, termasuk daftar precache `service-worker.js`.
- **Pindahkan pemetaan kaitan kurikulum** (mekanik/segmen game mana menyentuh TP mapel mana: IPS/PJOK/KKA/Seni Rupa) ke halaman `games/gobak-sodor/culture.html` atau `tutorial.html` sebagai satu bagian ringkas yang bisa ditunjukkan guru di kelas.
- **Leaderboard game** (`games/gobak-sodor/leaderboard.html`) tidak bergantung pada Mode Guru — pertahankan. Ekspor set soal ada di editor soal portal, bukan di game — tidak terdampak. Bila menemukan dependensi lain, laporkan dulu sebelum menghapus.
- Di halaman Budaya, pastikan konten IPS (sejarah, nilai, sebaran nama daerah) cukup untuk mendukung diskusi refleksi.

## BATASAN & GAYA

- Tanpa dependensi baru; tetap static site yang jalan di GitHub Pages dan ketiga mode runtime portal (Lokal/Demo/Supabase) tidak boleh rusak.
- **Naikkan `CACHE_NAME` di `service-worker.js`** dan pastikan daftar precache tetap valid setelah file dihapus/diubah (file yang dihapus harus keluar dari daftar precache).
- Pertahankan identitas visual & struktur navigasi yang ada; perbarui teks versi di footer game bila menyebut fitur yang berubah.
- Setelah selesai, **jelaskan file apa saja yang diubah dan mengapa**, lalu berikan ringkasan cara mengetes cepat di browser (DevTools responsive mode, termasuk simulasi layar besar ~3840×2160 atau zoom-out untuk IFP, dan simulasi touch).

## LANGKAH KERJA YANG DIMINTA

1. Verifikasi peta kode di atas (file bisa saja sudah bergeser); laporkan bila ada yang berbeda sebelum mengubah.
2. Usulkan rencana perubahan singkat, lalu kerjakan.
3. Buat perubahan bertahap dan pastikan game tetap bisa dijalankan di setiap tahap (jalankan lewat server statis lokal, bukan `file://`).
