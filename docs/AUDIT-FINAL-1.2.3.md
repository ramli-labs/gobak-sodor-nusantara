# Audit Final Gobak Sodor Nusantara v1.2.3

## Status

Versi ini menjadi baseline final modul Gobak Sodor sebelum proyek diubah menjadi Portal Permainan Nusantara.

## Temuan audit yang diperbaiki

1. **Cache PWA regresi** — `service-worker.js` masih memakai nama cache `gsn-v5.0.0` dan belum menyimpan `difficulty.js`. Diperbaiki menjadi `gsn-v5.2.3` dan seluruh modul impor telah masuk App Shell.
2. **Kemenangan belum memiliki validasi defensif enam soal** — sekarang bendera hanya dapat diambil setelah 3 soal pergi selesai, dan kemenangan hanya diproses setelah 3 soal pulang selesai.
3. **Riwayat soal hanya bertahan dalam satu tab** — sekarang riwayat disimpan di Local Storage, sehingga soal tidak kembali muncul setelah tab ditutup atau perjalanan dilanjutkan kemudian. Riwayat Session Storage versi lama dimigrasikan otomatis.
4. **Set guru terlalu pendek dapat mengulang soal dalam satu ronde** — set baru hanya dapat diaktifkan setelah memiliki minimal 6 soal.
5. **Double-click jawaban** — satu soal sekarang tidak dapat tercatat dua kali.
6. **Reset ronde** — input tertahan dan notifikasi skor lama dibersihkan saat ronde diulang.
7. **Label versi halaman tidak konsisten** — seluruh halaman publik telah ditandai sebagai v1.2.3.

## Hasil pemeriksaan otomatis

- 7 halaman HTML diperiksa.
- Tidak ada ID HTML ganda.
- Tidak ada tautan atau aset lokal yang hilang.
- Seluruh elemen wajib Game, Mode Guru, dan Leaderboard tersedia.
- 14 modul JavaScript dan service worker lolos pemeriksaan sintaks Node.js.
- 2 file CSS lolos parser tanpa error.
- 100 soal valid, ID unik, dan terbagi rata 20 soal per kategori.
- Seluruh impor modul JavaScript tercakup dalam cache offline.
- Manifest dan seluruh ikon PWA valid.
- Gerakan diagonal pemain, pantulan penjaga, multiplier perjalanan pulang, peta level, difficulty persistence, achievement, countdown, dan aturan enam soal lolos unit test.
- 30 soal pertama unik dan pertanyaan ke-31 setelah instance baru tetap tidak mengulang riwayat sebelumnya.
- Set guru dengan 5 soal ditolak; set dengan 6 soal dapat dipakai.

## Uji manual singkat setelah GitHub Pages diperbarui

1. Hard refresh halaman.
2. Pilih Normal lalu klik Mulai Solo.
3. Pastikan countdown 3–2–1 tampil sebelum timer bergerak.
4. Pastikan ada 3 soal saat pergi.
5. Ambil bendera, lalu pastikan ada 3 soal baru saat pulang.
6. Pastikan kemenangan baru muncul setelah soal ke-6 dan pemain kembali ke START.
7. Muat ulang halaman, lanjutkan pulau, dan pastikan soal sebelumnya tidak langsung berulang.
8. Matikan koneksi setelah website pernah dimuat dan pastikan game serta pilihan kesulitan tetap terbuka.

## Batas sistem saat ini

- Mode Guru masih berbasis Local Storage dan belum memakai autentikasi.
- Leaderboard dan progres belum lintas perangkat.
- Batas tersebut akan dipindahkan ke Supabase ketika kerangka portal mulai dibangun.
