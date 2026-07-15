# Mode Demo

Mode Demo adalah backend lokal yang meniru kontrak Supabase API agar halaman portal dapat diuji sebelum backend produksi dibuat.

## Data yang tersedia

- 5 profil contoh.
- 1 kelas aktif dengan 2 siswa.
- 2 game aktif dan 2 game roadmap.
- 2 set soal.
- 20 soal contoh.
- 2 tugas.
- Hasil Gobak Sodor dan Jelajah Nusantara.
- 1 permintaan akses guru.
- Achievement dan audit log.

## Cara menggunakan

Buka `auth.html` dan pilih Siswa, Guru, atau Admin. Data perubahan bertahan di Local Storage hingga tombol **Reset data demo** pada `setup.html` digunakan.

## Yang dapat diuji

- Siswa bergabung atau keluar kelas.
- Siswa melihat tugas dan hasil.
- Guru membuat kelas, set soal, soal, dan tugas.
- Guru menerbitkan atau mengembalikan set ke draft.
- Admin menyetujui permintaan guru.
- Admin mengubah role dan status game.
- Leaderboard terverifikasi contoh.
- Tugas Jelajah dengan paket soal tanpa kunci pada payload pertanyaan.

## Yang tidak dibuktikan oleh Mode Demo

- Keamanan RLS.
- Ketahanan database.
- Email confirmation.
- Token refresh Supabase.
- Keamanan Edge Functions di jaringan nyata.
- Sinkronisasi lintas perangkat.
