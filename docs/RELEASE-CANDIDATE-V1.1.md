# Portal Permainan Nusantara v1.1 — Release Candidate

## Tujuan

Release Candidate ini memungkinkan seluruh alur portal diuji sebelum proyek Supabase tersedia. Ia bukan pengganti backend produksi.

## Perubahan

- Mode Demo untuk siswa, guru, dan admin.
- Data contoh kelas, anggota kelas, bank soal, tugas, sesi, achievement, permintaan guru, dan audit log.
- Setup wizard dengan tiga mode runtime.
- Diagnostik format konfigurasi, status jaringan, dan REST API.
- Antrean sinkronisasi hasil dengan retry dan exponential backoff.
- Status runtime global dan banner demo/offline.
- Validasi role mengarah ke halaman error yang aman.
- Editor soal, dashboard guru, dashboard siswa, dan dashboard admin dapat diuji tanpa Supabase.
- Reference seed dan template admin pertama.
- Mode Guru lama di folder Gobak Sodor dialihkan ke dashboard portal.
- Satu service worker portal dengan cache `ppn-v1.1.0-rc`.

## Batasan yang disengaja

- Data demo hanya berada pada browser yang sama.
- Data demo dapat diubah melalui Developer Tools dan tidak boleh dianggap aman.
- Tugas Jelajah pada Mode Demo meniru pemeriksaan server, bukan menjalankan Edge Function sungguhan.
- Pengujian RLS nyata tetap memerlukan proyek Supabase.
- Pengujian PWA install dan browser lintas perangkat tetap dilakukan setelah deployment HTTPS.

## Kriteria lanjut ke rilis final

- Migration dan seed berhasil dijalankan pada proyek Supabase bersih.
- Tiga role nyata lulus checklist akses.
- Edge Functions menerima token valid dan menolak akses tidak sah.
- Hasil tugas Jelajah terverifikasi masuk leaderboard.
- Hasil Gobak Sodor tetap tidak terverifikasi.
- Queue offline berhasil flush setelah jaringan kembali.
- PWA install dan offline fallback berjalan pada Chrome/Edge serta satu perangkat mobile.
