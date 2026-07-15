# Model Keamanan Portal Permainan Nusantara

## Prinsip dasar

Frontend GitHub Pages sepenuhnya dapat dilihat pengguna. Tombol tersembunyi, PIN JavaScript, Local Storage, atau nama file rahasia bukan mekanisme keamanan.

## Batas kepercayaan

### Browser boleh menangani

- tampilan dan input;
- gameplay lokal;
- preferensi perangkat;
- cache offline;
- progres tamu;
- pengiriman token pengguna ke Supabase.

### Browser tidak boleh menentukan

- role pengguna;
- izin kelas;
- kunci jawaban;
- status sesi terverifikasi;
- skor tugas Jelajah;
- XP server;
- leaderboard publik.

## Perlindungan database

1. RLS aktif pada seluruh tabel publik.
2. Role awal selalu `student`.
3. Perubahan role dilakukan melalui RPC admin dan dicatat pada `audit_logs`.
4. Browser hanya memperoleh hak update kolom profil yang aman: nama, sekolah, kelas, dan avatar.
5. XP serta role tidak dapat diubah langsung melalui REST browser.
6. Guru hanya mengelola kelas dan set miliknya; admin dapat mengelola seluruh portal.
7. Kunci jawaban berada pada `question_keys`, tanpa policy atau privilege untuk siswa/guru biasa.
8. Penulisan `game_sessions`, `question_attempts`, dan `user_achievements` dilakukan server.
9. Leaderboard publik hanya membaca `verified=true` dan hanya menampilkan nama depan.

## Integritas tugas Jelajah Nusantara

```text
Siswa membuka tugas
→ Edge Function memeriksa anggota kelas dan tenggat
→ server memilih 10 soal
→ browser menerima pertanyaan tanpa kunci
→ setiap jawaban diverifikasi Edge Function
→ server memastikan soal termasuk paket sesi
→ setelah 10 attempt, server menghitung durasi, skor, akurasi, dan hasil
→ reward diberikan sekali
```

Status menang ditentukan server: minimal 8 dari 10 benar dan selesai dalam 180 detik. Browser tidak menentukan hasil terverifikasi.

## Set soal

- Set baru berstatus draft.
- Minimal 10 soal diperlukan untuk terbit.
- Set terbitan dikunci.
- Guru harus mengubah set menjadi draft sebelum mengedit.
- Set yang dipakai tugas aktif tidak dapat dijadikan draft.
- Set kelas diterbitkan sebagai privat secara bawaan; siswa hanya menerima paket soal melalui Edge Function.

## Skor client/unverified

Gobak Sodor memakai Canvas dan perhitungan gerak di browser. Pemain dapat memodifikasi browser, sehingga hasilnya disimpan sebagai `verified=false`. Hasil Jelajah lokal juga tidak diverifikasi. Data tersebut dapat muncul pada riwayat akun guru/siswa, tetapi tidak masuk leaderboard publik dan tidak memberi XP server.

## Publishable key dan secret

Publishable key memang ditujukan untuk frontend. Key tersebut tidak memberi keamanan tanpa RLS.

Dilarang masuk GitHub:

- `service_role`;
- `sb_secret_...`;
- database password;
- JWT secret;
- personal access token;
- kredensial SMTP.

Validator konfigurasi frontend menolak key `sb_secret_` dan legacy JWT yang bukan role `anon`.

## Perangkat sekolah bersama

Hasil tamu tidak otomatis dimasukkan ke antrean akun. Antrean offline hanya dibuat ketika pengguna sudah login dan setiap item diikat ke ID akun tersebut. Ini mencegah hasil siswa sebelumnya tersinkron ke akun siswa berikutnya pada browser bersama.

## Risiko yang tetap perlu dikelola

- Akun dapat disalahgunakan bila password dibagikan.
- Email confirmation dan kebijakan password harus dikonfigurasi di Supabase.
- Admin perlu meninjau permintaan guru.
- Browser publik harus logout setelah digunakan.
- Backup database dan audit rutin tetap diperlukan.
