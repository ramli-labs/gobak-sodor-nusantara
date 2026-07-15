# Revisi Gameplay 1.2 — Balancing dan UX

## Tujuan

Versi 1.2 menanggapi masalah bahwa gameplay awal terlalu mudah dan informasi perjalanan belum cukup jelas. Revisi tidak hanya menaikkan kecepatan penjaga, karena peningkatan kecepatan tunggal berisiko membuat game terasa tidak adil. Tantangan sekarang berasal dari kombinasi waktu, jumlah penjaga, pola ritme, perjalanan pulang, nyawa, dan pilihan kesulitan.

## 1. Tingkat kesulitan

| Parameter | Santai | Normal | Ahli |
|---|---:|---:|---:|
| Waktu dasar | 118% | 100% | 85% |
| Perubahan nyawa | +1 | 0 | −1, minimum 2 Solo / 3 Co-op |
| Kecepatan penjaga | 86% | 100% | 118% |
| Kecepatan pemain | 248 | 230 | 220 |
| Kenaikan saat pulang | 5% | 16% | 30% |
| Shield benar | 4 detik | 3 detik | 2,25 detik |
| Bonus waktu benar | 4 detik | 3 detik | 2 detik |
| Penalti kecepatan salah | ×1,08 | ×1,12 | ×1,16 |
| Faktor bonus finish | ×0,80 | ×1,00 | ×1,35 |

Pilihan terakhir tersimpan pada Local Storage dengan kunci `gsnDifficultyV1`.

## 2. Kurva pulau

- Jawa: 3 penjaga, waktu dasar Normal 78 detik.
- Sumatra: 4 penjaga, 74 detik.
- Kalimantan: 4 penjaga, 70 detik.
- Sulawesi: 5 penjaga, 66 detik, nyawa Normal Solo 2.
- Papua: 6 penjaga, 62 detik, nyawa Normal Solo 2.

## 3. Pola penjaga

- `steady`: bergerak stabil pada garis.
- `pause`: berhenti singkat secara berkala lalu lanjut.
- `pulse`: kecepatan naik-turun secara halus.
- `surge`: memperoleh lonjakan kecepatan periodik.
- `fakeout`: berbalik arah sebelum mencapai ujung garis.

Penjaga tetap terikat pada garis masing-masing. Karena itu, variasi pola menambah kebutuhan membaca ritme tanpa mengubah aturan dasar Gobak Sodor.

## 4. Perjalanan pulang

Saat bendera diambil:

- status HUD berubah menjadi **Kembali ke START**;
- progres perjalanan melewati titik tengah 50%;
- penjaga memperoleh multiplier perjalanan pulang;
- pada pola `fakeout`, penjaga dapat langsung melakukan satu perubahan arah di Mode Normal/Ahli;
- pemain tetap harus menjawab tiga soal perjalanan pulang.

## 5. UX permainan

- Countdown 3–2–1 sebelum timer mulai.
- HUD perjalanan menampilkan:
  - status perjalanan;
  - progres pergi dan pulang;
  - jumlah soal selesai dari 6;
  - tingkat kesulitan aktif.
- Rapor menampilkan kesulitan, durasi aktif, durasi pulang, jumlah tertangkap, nyawa tersisa, dan akurasi.

## 6. Data playtest

Setiap ronde selesai otomatis ditambahkan ke `gsnPlaytestV1`, maksimal 120 ronde. Tidak ada nama pemain di data ini. Field yang disimpan:

- versi;
- tanggal;
- pulau;
- kesulitan;
- mode Solo/Co-op;
- status latihan;
- menang/kalah;
- skor;
- akurasi;
- jumlah soal;
- jumlah tertangkap;
- nyawa tersisa;
- durasi aktif;
- durasi perjalanan pulang;
- jumlah penjaga.

Tombol **Ekspor JSON** dapat digunakan untuk menganalisis apakah Normal terlalu mudah atau Ahli terlalu sulit berdasarkan hasil beberapa pemain.

## 7. Kriteria evaluasi awal

Setelah minimal 20 ronde per kesulitan, periksa:

- Santai: target kemenangan sekitar 75–90%.
- Normal: target kemenangan sekitar 45–70%.
- Ahli: target kemenangan sekitar 15–40%.
- Normal tidak ideal bila rata-rata selesai tanpa tertangkap dan sisa waktu lebih dari 25 detik.
- Ahli terlalu keras bila hampir semua ronde berakhir sebelum pemain mengambil bendera.

Angka tersebut adalah target desain awal, bukan fakta universal. Keputusan akhir sebaiknya mengikuti data siswa yang benar-benar memainkan game.
