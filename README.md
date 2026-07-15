# Portal Permainan Nusantara v1.1 — Release Candidate

Portal game edukasi budaya Indonesia berbasis HTML, CSS, dan Vanilla JavaScript. Frontend dapat diterbitkan di GitHub Pages. Supabase dipakai untuk akun, kelas, soal, tugas, hasil, dan leaderboard lintas perangkat.

Versi **v1.1 RC** menambahkan lapisan pengujian lengkap sebelum Supabase dibuat: Mode Demo siswa/guru/admin, data contoh, setup wizard, diagnostik koneksi, antrean sinkronisasi offline, validasi role, error page, reference seed, dan checklist rilis.

## Game aktif

### Gobak Sodor Nusantara v1.2.3

- Solo dan Co-op satu keyboard.
- Kesulitan Santai, Normal, dan Ahli.
- Tiga soal pergi dan tiga soal pulang.
- Lima pulau, rapor pelajaran, achievement, mode latihan, audio, dan PWA.
- Hasil browser dikirim sebagai `client/unverified` karena gameplay Canvas dihitung di sisi klien.

### Jelajah Nusantara v1.0.2

- Sepuluh soal budaya dan geografi.
- Tiga nyawa dan 180 detik.
- Mode tugas memilih soal dan memeriksa jawaban melalui Edge Functions.
- Tugas yang selesai lewat server dapat menghasilkan sesi `verified=true`.

## Tiga mode runtime

1. **Mode Lokal** — game, profil, dan skor lokal tanpa akun.
2. **Mode Demo** — siswa, guru, admin, kelas, soal, tugas, hasil, dan leaderboard contoh tersimpan di Local Storage.
3. **Mode Supabase** — backend produksi dengan Auth, PostgreSQL, RLS, dan Edge Functions.

Mode Demo tidak mengklaim keamanan produksi. Fungsinya hanya untuk menguji alur dan presentasi sebelum Supabase dikonfigurasi.

### Akun demo

| Role | Email | Password |
|---|---|---|
| Siswa | `siswa@demo.nusantara` | `demo12345` |
| Guru | `guru@demo.nusantara` | `demo12345` |
| Admin | `admin@demo.nusantara` | `demo12345` |

Tombol masuk cepat tersedia di `auth.html` dan `setup.html`.

## Struktur utama

```text
portal-permainan-nusantara/
├── index.html
├── games.html
├── auth.html
├── student.html
├── teacher.html
├── admin.html
├── question-editor.html
├── profile.html
├── leaderboard.html
├── setup.html
├── error.html
├── games/
│   ├── gobak-sodor/
│   └── jelajah-nusantara/
├── shared/
│   ├── css/
│   └── js/
│       ├── demo-backend.js
│       ├── sync-queue.js
│       ├── runtime-status.js
│       └── ...
├── supabase/
│   ├── migrations/001_portal_schema.sql
│   ├── seed/
│   └── functions/
├── tests/
└── docs/
```

## Menjalankan lokal

Jangan membuka file melalui `file://`.

```bash
cd portal-permainan-nusantara
python -m http.server 8000
```

Buka `http://localhost:8000`.

## Urutan pengujian sebelum Supabase

1. Buka `auth.html`.
2. Masuk sebagai Demo Siswa dan periksa kelas, tugas, serta hasil.
3. Masuk sebagai Demo Guru dan buat kelas, set soal, soal, serta tugas.
4. Masuk sebagai Demo Admin dan uji persetujuan guru, perubahan role, dan status game.
5. Buka `setup.html`, periksa status runtime dan diagnostik.
6. Reset data demo untuk mengembalikan kondisi awal.

## Setup produksi

1. Buat proyek Supabase.
2. Jalankan `supabase/migrations/001_portal_schema.sql`.
3. Jalankan `supabase/seed/001_reference_seed.sql`.
4. Deploy Edge Functions `answer-question` dan `submit-game-session`.
5. Isi Project URL serta publishable key melalui `setup.html` atau `config/supabase-config.js`.
6. Daftar akun pertama.
7. Jalankan template `supabase/seed/002_first_admin.sql.template` setelah mengganti email admin.
8. Jalankan checklist pada `docs/TESTING.md`.
9. Baru unggah ke GitHub Pages.

## Keamanan

- Publishable key boleh berada di frontend selama RLS benar.
- Jangan pernah menaruh `service_role`, secret key, password database, JWT secret, atau access token pribadi di repository.
- Mode Demo dan Local Storage bukan sistem otorisasi.
- Kunci jawaban tugas terverifikasi tidak dikirim bersama pertanyaan.
- Dashboard role tetap dilindungi RLS pada mode produksi.

## Pemeriksaan otomatis

```bash
node tests/demo-flow.mjs
python tests/static-audit.py
```

Seluruh JavaScript juga dapat diperiksa dengan `node --check`.

Dokumentasi penting:

- `docs/RELEASE-CANDIDATE-V1.1.md`
- `docs/DEMO-MODE.md`
- `docs/SUPABASE-SETUP.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`
- `docs/DEPLOYMENT.md`

Service worker menggunakan cache `ppn-v1.1.0-rc`.

Hasil pemeriksaan paket: `docs/V1.1-RC-TESTING.md`.

## Deployment Vercel dengan Environment Variables (v1.1.1)

Paket ini membaca konfigurasi Supabase saat build. Atur tiga Environment Variables di Vercel:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `PUBLIC_SITE_URL`

Vercel menjalankan `npm run build` dan menyajikan folder `dist`. File `config/supabase-config.js` di `dist` dibuat otomatis dan tidak perlu diedit manual.
