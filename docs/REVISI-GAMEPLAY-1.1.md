# Revisi Gameplay 1.1

## Perubahan utama

1. **Soal dua arah**
   - Tiga soal muncul saat pemain bergerak menuju bendera.
   - Setelah bendera diambil, pembawa bendera harus menjawab tiga soal baru saat kembali menuju START.
   - Indikator checkpoint pada Canvas memiliki tanda arah pergi dan pulang.

2. **Soal tidak berulang antar-pulau**
   - ID soal yang sudah muncul disimpan di `sessionStorage` berdasarkan set soal.
   - Riwayat tetap ada ketika pindah pulau atau memuat ulang halaman pada tab yang sama.
   - Pengulangan baru diizinkan setelah seluruh soal dalam set pernah digunakan.
   - Untuk lima pulau tanpa pengulangan diperlukan minimal 30 soal; bank bawaan memiliki 100 soal.

3. **Informasi nyawa dan poin**
   - HUD menampilkan nyawa secara numerik, misalnya `3 / 3 ♥`.
   - HUD menampilkan skor dengan satuan `poin`.
   - Rincian skor ditampilkan sebelum arena:
     - Jawaban benar: +100 poin
     - Jawaban salah: −10 poin
     - Ambil bendera: +250 poin
     - Tertangkap: −1 nyawa dan −50 poin
     - Bendera kembali ke START: +1.000 poin dasar ditambah bonus
   - Perubahan skor memunculkan notifikasi langsung di arena.

4. **Penyeimbangan**
   - Karena jumlah soal menjadi enam per ronde, bonus benar disesuaikan menjadi tambahan waktu 3 detik dan Shield 3 detik.

## Penyimpanan riwayat soal

Riwayat soal menggunakan key:

```text
gsnCampaignQuestionHistoryV1
```

Penyimpanan memakai `sessionStorage`, sehingga riwayat berlaku selama perjalanan pada tab browser yang sama. Membuka tab baru dianggap sebagai perjalanan baru.
