# Checklist Pengujian Portal v1.0

## A. Tanpa Supabase

- [ ] Jalankan melalui `python -m http.server 8000`.
- [ ] Beranda dan katalog terbuka tanpa error console.
- [ ] Gobak Sodor menampilkan countdown 3–2–1.
- [ ] Gobak Sodor mewajibkan 3 soal pergi dan 3 soal pulang.
- [ ] Soal Gobak tidak berulang pada perjalanan lima pulau sebelum bank habis.
- [ ] Nyawa, poin, Shield, Combo, status perjalanan, dan progres soal terlihat.
- [ ] Mode Solo, Co-op, Santai, Normal, Ahli, dan Latihan dapat dimulai.
- [ ] Jelajah lokal memuat 10 dari 30 soal.
- [ ] Jelajah berakhir ketika nyawa/waktu habis atau seluruh soal selesai.
- [ ] Hasil lokal Jelajah muncul pada profil/leaderboard lokal.
- [ ] Profil lokal tersimpan setelah reload.
- [ ] PWA dapat dipasang pada localhost/HTTPS.
- [ ] Request lintas-origin seperti Google Fonts boleh gagal saat offline tanpa merusak game.

## B. Konfigurasi Supabase

- [ ] `config/supabase-config.js` hanya berisi URL dan publishable key.
- [ ] Key `sb_secret_` ditolak oleh halaman setup.
- [ ] Migration SQL selesai tanpa error.
- [ ] Kedua Edge Function ter-deploy tanpa `--no-verify-jwt`.
- [ ] Site URL dan Redirect URLs benar.

## C. Auth

- [ ] Pendaftaran selalu menghasilkan role siswa.
- [ ] Password kurang dari 8 karakter ditolak frontend.
- [ ] Email confirmation berjalan bila diaktifkan.
- [ ] Permintaan guru yang dipilih saat pendaftaran tetap terkirim setelah konfirmasi/login.
- [ ] Login, refresh session, dan logout bekerja.
- [ ] Siswa diarahkan ke `student.html`.
- [ ] Guru diarahkan ke `teacher.html`.
- [ ] Admin diarahkan ke `admin.html`.
- [ ] Redirect eksternal melalui parameter `next` ditolak.

## D. Role dan RLS

- [ ] Siswa gagal membaca `question_keys`.
- [ ] Siswa gagal mengubah `role` dan `xp` melalui REST.
- [ ] Guru hanya melihat kelas miliknya.
- [ ] Guru tidak dapat mengubah set guru lain.
- [ ] Siswa hanya melihat kelas yang diikuti.
- [ ] Admin dapat menyetujui/menolak permintaan guru.
- [ ] Admin tidak dapat menurunkan role akun sendiri melalui RPC.
- [ ] Leaderboard anon hanya menampilkan sesi terverifikasi dan nama depan.

## E. Kelas dan set soal

- [ ] Guru membuat kelas dan menerima kode unik.
- [ ] Siswa bergabung dengan kode.
- [ ] Siswa dapat keluar dari kelas.
- [ ] Set kurang dari 10 soal tidak dapat diterbitkan.
- [ ] Pilihan kosong/duplikat dan indeks jawaban tidak valid ditolak.
- [ ] Setelah set diterbitkan, tombol edit/hapus terkunci.
- [ ] Guru dapat menjadikan set draft bila belum dipakai tugas aktif.
- [ ] Set yang dipakai tugas aktif tidak dapat dijadikan draft atau dihapus.
- [ ] Tugas aktif dengan tenggat masa lalu ditolak.

## F. Tugas Jelajah terverifikasi

- [ ] Siswa bukan anggota kelas tidak dapat memulai tugas.
- [ ] Tugas tidak aktif atau melewati tenggat ditolak.
- [ ] Server, bukan browser, memilih 10 soal.
- [ ] Browser tidak menerima `correct_index`.
- [ ] Soal di luar paket sesi ditolak.
- [ ] Jawaban ganda ditolak.
- [ ] Jika nyawa/waktu habis, siswa tetap dapat menyelesaikan seluruh soal agar tugas dinilai.
- [ ] Penyelesaian sebelum 10 attempt ditolak.
- [ ] Durasi dihitung dari `started_at` server.
- [ ] Status menang hanya jika minimal 8 benar dan durasi ≤180 detik.
- [ ] Retry penyelesaian aman/idempoten.
- [ ] Percobaan kedua pada tugas yang sudah terverifikasi ditolak.
- [ ] XP/achievement diberikan sekali.

## G. Gobak Sodor dan sinkronisasi

- [ ] Hasil Gobak tersimpan sebagai `verified=false`.
- [ ] Hasil Gobak tidak masuk leaderboard publik terverifikasi.
- [ ] Hasil akun yang gagal sinkron saat offline masuk antrean milik akun tersebut.
- [ ] Hasil tamu tidak otomatis tersinkron ke akun lain pada perangkat bersama.

## H. PWA dan deployment

- [ ] Seluruh item `APP_SHELL` tersedia.
- [ ] Request Supabase tidak dicache karena berada pada origin berbeda.
- [ ] Navigasi offline membuka cache atau `offline.html`.
- [ ] Cache lama `ppn-*` dan `gsn-*` dihapus saat aktivasi.
- [ ] GitHub Pages menampilkan versi terbaru setelah hard refresh.

## Checklist Mode Demo v1.1 RC

### Siswa

- Masuk melalui tombol Demo Siswa.
- Kelas `VIII A Nusantara` tampil.
- Dua tugas aktif tampil.
- Hasil sesi dan statistik tampil.
- Tugas Jelajah dapat dibuka dengan parameter assignment.

### Guru

- Masuk melalui tombol Demo Guru.
- Kelas, anggota, set soal, tugas, dan hasil tampil.
- Buat kelas baru.
- Buat set soal dan tambah soal.
- Set dengan minimal 10 soal dapat diterbitkan.
- Buat tugas Jelajah menggunakan set terbitan.

### Admin

- Masuk melalui tombol Demo Admin.
- Permintaan Bu Sari tampil.
- Setujui permintaan dan pastikan role berubah menjadi guru.
- Ubah status game roadmap.
- Audit log bertambah.

### Runtime

- Banner Mode Demo terlihat.
- `setup.html` menandai Mode Demo aktif.
- Reset data demo mengembalikan isi awal.
- Role yang salah diarahkan ke `error.html`.
- Antrean sinkronisasi menampilkan jumlah pending.
