# Audit Final Portal Permainan Nusantara v1.0

Tanggal audit: **14 Juli 2026**

## Ruang lingkup final

Portal berisi dua game yang dapat dimainkan:

1. **Gobak Sodor Nusantara v1.2.3** — Solo/Co-op, lima pulau, tiga tingkat kesulitan, enam soal per ronde, progres lokal, dan hasil akun berstatus client/unverified.
2. **Jelajah Nusantara v1.0.2** — mode lokal serta tugas kelas dengan sepuluh soal yang dipilih dan dinilai server.

Portal juga memuat autentikasi, role siswa/guru/admin, kelas, bank soal, tugas, hasil, XP, achievement, leaderboard terverifikasi, PWA, migration SQL, dan dua Edge Function Supabase.

## Perbaikan keamanan terakhir

- Redirect setelah login dibatasi pada halaman internal yang diizinkan.
- Konfigurasi frontend menerima publishable key dan menolak `sb_secret_`/service-role key.
- Role awal selalu siswa; perubahan role melalui RPC admin.
- Kolom role dan XP tidak dapat diubah langsung oleh browser.
- Kunci jawaban dipisahkan ke `question_keys` dan privilege browser dicabut.
- Set soal terbitan dikunci; tugas aktif melindungi set dari perubahan.
- Edge Function memeriksa token pengguna dengan `auth.getUser()`.
- Server memilih sepuluh soal tugas dan menyimpan daftar ID yang sah pada sesi.
- Jawaban hanya diterima bila sesi, tugas, set, dan ID soal saling cocok.
- Durasi, skor, akurasi, status menang, XP, dan achievement tugas dihitung server.
- Penyelesaian sesi serta reward dibuat idempoten.
- Hanya satu hasil terverifikasi per siswa per tugas.
- Leaderboard publik hanya membaca sesi `verified=true`.
- Hasil tamu tidak dimasukkan ke antrean akun lain pada perangkat bersama.
- Perubahan role/status game di dashboard admin memuat ulang data server sehingga UI kembali ke nilai sah bila RPC gagal.

## Hasil pemeriksaan otomatis

| Pemeriksaan | Hasil |
|---|---:|
| Berkas proyek | 113 sebelum pengemasan; seluruh berkas final tersedia |
| Halaman HTML | 23 valid |
| JavaScript frontend | 35 berkas lolos `node --check` |
| Edge Function TypeScript | 2 fungsi lolos pemeriksaan tipe dengan stub lingkungan Deno |
| Migration PostgreSQL | 147 statement berhasil diparse |
| Tabel publik dengan RLS | 14/14 |
| Fungsi `SECURITY DEFINER` terdeteksi | 21; seluruhnya memiliki `search_path` eksplisit |
| JSON | 7 valid |
| CSS | 5 tanpa ketidakseimbangan kurung kurawal |
| Aset cache PWA | 86/86 tersedia dan unik |
| Ikon manifest | 7 tersedia dengan dimensi sesuai deklarasi |
| Soal Gobak Sodor | 100 unik; 20 per kategori |
| Soal Jelajah Nusantara | 30 unik |
| Unit logic | Player, Enemy, difficulty, riwayat kuis, anti-double-answer, siklus soal, XP/progres lintas-game lulus |
| Validator konfigurasi | Publishable key diterima; secret/service-role ditolak |
| Tautan/aset lokal | Tidak ada yang hilang |
| ID HTML ganda | Tidak ditemukan |

## Alur yang telah divalidasi dari kode

### Gobak Sodor

```text
Mulai → countdown 3–2–1 → 3 soal pergi → ambil bendera
→ 3 soal pulang → kembali ke START → rapor/hasil
```

Riwayat pertanyaan disimpan per set soal sehingga soal tidak berulang sampai bank aktif habis. Hasil Gobak Sodor tetap `verified=false` karena simulasi Canvas berlangsung di browser.

### Tugas Jelajah terverifikasi

```text
Siswa anggota kelas membuka tugas
→ Edge Function memilih 10 soal
→ browser menerima pertanyaan tanpa kunci
→ tiap jawaban diverifikasi server
→ server memastikan tepat 10 attempt
→ server menghitung durasi dan skor
→ hasil verified + reward idempoten
```

Syarat menang: minimal **8/10 benar** dan durasi server tidak lebih dari **180 detik**.

## Batas pengujian

Server lokal berhasil melayani halaman dan aset utama dengan HTTP 200. Namun, pengujian visual dan end-to-end pada browser sungguhan belum dapat dijalankan karena Chromium headless macet pada pembatasan Linux/DBus/NETLINK di lingkungan pembuatan paket. Ini bukan bukti bahwa UI pasti bebas masalah runtime.

Karena itu, sebelum publikasi wajib dilakukan smoke test manual berikut setelah Supabase aktif:

1. Daftar tiga akun: admin, calon guru, dan siswa.
2. Set admin pertama melalui SQL Editor.
3. Setujui calon guru.
4. Guru membuat kelas, sepuluh soal, menerbitkan set, lalu membuat tugas Jelajah.
5. Siswa bergabung dan menyelesaikan tugas.
6. Pastikan guru melihat hasil dan leaderboard hanya menampilkan sesi terverifikasi.
7. Mainkan satu ronde penuh Gobak Sodor pada desktop serta ponsel.
8. Uji pemasangan PWA dan offline fallback melalui HTTPS.

Checklist lengkap tersedia di `docs/TESTING.md`.

## Kesimpulan audit

Kode portal layak dijadikan **baseline v1.0 siap konfigurasi dan uji produksi**. Bagian yang belum dapat dilakukan tanpa akun pengguna adalah pembuatan proyek Supabase, pengisian Project URL/publishable key, deployment Edge Functions, serta smoke test lintas-role pada browser nyata.
