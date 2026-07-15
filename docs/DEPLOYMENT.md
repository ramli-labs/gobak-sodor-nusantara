# Deployment GitHub Pages

## 1. Selesaikan Supabase terlebih dahulu

Sebelum upload, selesaikan `docs/SUPABASE-SETUP.md` dan isi:

```text
config/supabase-config.js
```

Hanya Project URL dan publishable key yang boleh berada pada frontend.

## 2. Buat repository

Nama yang disarankan:

```text
portal-permainan-nusantara
```

Upload **seluruh isi folder proyek**, bukan folder luarnya. `index.html` harus berada di root repository.

Struktur root minimal:

```text
index.html
manifest.json
service-worker.js
config/
shared/
games/
supabase/
docs/
```

Folder `supabase/` aman dipublikasikan karena hanya berisi migration dan source code Edge Function. Pastikan tidak ada file `.env` atau secret.

## 3. Aktifkan Pages

Pada **Settings → Pages**:

```text
Source: Deploy from a branch
Branch: main
Folder: / (root)
```

## 4. Cocokkan URL Supabase Auth

Alamat portal biasanya:

```text
https://USERNAME.github.io/portal-permainan-nusantara/
```

Alamat tersebut harus sama dengan Site URL/Redirect URL di Supabase.

## 5. Periksa deployment

Tunggu workflow Pages berwarna hijau, lalu lakukan hard refresh:

- Windows/Linux: `Ctrl + Shift + R`
- macOS: `Command + Shift + R`

Bila cache lama masih tampil:

1. Developer Tools → Application.
2. Service Workers → Unregister.
3. Storage → Clear site data.
4. Reload.

Cache final bernama:

```text
ppn-v1.1.0-rc
```

## 6. Smoke test produksi

- Beranda dan katalog terbuka.
- Gobak Sodor dapat dimainkan.
- Jelajah lokal dapat dimainkan.
- Pendaftaran dan login berhasil.
- Role siswa/guru/admin diarahkan ke dashboard yang benar.
- Siswa tidak dapat membuka data guru/admin.
- Guru membuat kelas, set 10 soal, dan tugas.
- Siswa menyelesaikan tugas.
- Hasil muncul di dashboard guru dan leaderboard terverifikasi.
- PWA dapat dipasang melalui HTTPS.
- Setelah halaman pernah dibuka, aset utama tetap tersedia saat offline.

## 7. Update berikutnya

Saat mengubah aset PWA, naikkan `CACHE_NAME` pada `service-worker.js`. Commit perubahan, tunggu deployment, lalu uji hard refresh.

## Catatan Release Candidate v1.1

Sebelum deployment produksi, gunakan Mode Demo untuk menyelesaikan checklist role. Setelah konfigurasi Supabase dimasukkan, buka `setup.html` dan jalankan diagnostik. Pastikan Mode Demo dimatikan sebelum pengujian akun nyata agar hasil tidak tercampur dengan data Local Storage demo.
