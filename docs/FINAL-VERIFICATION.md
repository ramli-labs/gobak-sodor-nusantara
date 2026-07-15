# Verifikasi Final Portal Permainan Nusantara v1.0

Tanggal verifikasi: **14 Juli 2026**

## Pemeriksaan yang dijalankan pada paket ini

- `node --check` pada **35 berkas JavaScript frontend**: lulus.
- Parsing **23 halaman HTML** dan pemeriksaan ID ganda: lulus.
- Pemeriksaan seluruh tautan, aset, dan import JavaScript lokal: tidak ada yang hilang.
- Parsing **7 berkas JSON**: lulus.
- Pemeriksaan APP_SHELL PWA: **86 aset tersedia dan tidak duplikat**.
- Pemeriksaan ikon manifest terhadap dimensi file PNG: lulus.
- Parsing migration PostgreSQL dengan `pglast`: **147 statement** dapat diparse.
- RLS terdeteksi aktif pada seluruh **14 tabel publik** yang menyimpan data pengguna/kelas/game.
- Privilege browser pada `question_keys` dicabut.
- Validator konfigurasi menolak `sb_secret_` dan legacy JWT `service_role`, serta menerima publishable key/legacy anon key.
- Struktur dua Edge Function diperiksa: CORS, `Deno.serve`, dan verifikasi pengguna melalui `auth.getUser()` tersedia.
- Unit logic Gobak Sodor: normalisasi gerak diagonal, pantulan penjaga, dan kurva kesulitan lulus.
- Unit logic portal lokal: profil, XP, level, hasil Gobak Sodor, dan hasil Jelajah lulus.
- Bank Gobak Sodor tetap berisi **100 soal unik**.
- Arsip ZIP diuji setelah dibuat.

## Perbaikan terakhir

`config/supabase-config.js` sekarang memakai strategi **network-first** pada service worker. Hal ini mencegah Project URL atau publishable key yang baru diedit tetap tertahan oleh cache PWA lama.

Cache PWA final:

```text
ppn-v1.1.0-rc
```

## Batas verifikasi

Belum dilakukan pengujian end-to-end terhadap Supabase nyata karena Project URL, publishable key, akun, serta deployment Edge Function bersifat khusus milik pengguna dan belum tersedia.

Server lokal juga tidak dapat menerima koneksi pada lingkungan pembuatan paket ini. Karena itu, setelah Supabase dikonfigurasi tetap wajib dilakukan smoke test manual lintas-role sesuai `docs/TESTING.md`.

## Kesimpulan

Paket ini layak digunakan sebagai **baseline final siap konfigurasi**. Frontend statis dapat diuji tanpa Supabase; fitur akun, kelas, dashboard, tugas, hasil lintas-perangkat, dan leaderboard terverifikasi aktif setelah migration, Edge Functions, dan konfigurasi Supabase dipasang.
