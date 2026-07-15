# Setup Supabase — Portal Permainan Nusantara v1.0

## 1. Buat proyek Supabase

Simpan tiga informasi berikut:

- Project URL.
- Publishable key (`sb_publishable_...`).
- Project reference.

Jangan menyalin secret key atau `service_role` ke frontend maupun GitHub.

## 2. Jalankan migration SQL

Buka **SQL Editor → New query**, salin seluruh isi:

```text
supabase/migrations/001_portal_schema.sql
```

Jalankan satu kali pada proyek baru. Migration membuat:

- profil dan role;
- permintaan akses guru;
- kelas dan anggota kelas;
- registry game;
- set soal, pertanyaan, dan kunci jawaban terpisah;
- tugas, sesi game, attempt, achievement, dan audit log;
- trigger validasi;
- Row Level Security;
- RPC aman;
- data awal game dan achievement.

Set terbitan wajib memiliki minimal **10 soal** dan seluruh kunci jawaban. Set yang sedang dipakai tugas aktif tidak dapat dijadikan draft atau diedit.

## 3. Deploy Edge Functions

Instal dan login ke Supabase CLI, lalu dari root proyek jalankan:

```bash
supabase login
supabase init
supabase link --project-ref PROJECT_REF_ANDA
supabase functions deploy answer-question
supabase functions deploy submit-game-session
```

Jangan menggunakan `--no-verify-jwt`. Kedua fungsi memeriksa token pengguna lagi melalui `auth.getUser()`.

Supabase biasanya menyediakan `SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` secara otomatis untuk Edge Functions. Jangan menyalin service role key ke file frontend.

### Fungsi `submit-game-session`

- Memastikan siswa anggota kelas dan tugas masih aktif.
- Memilih 10 soal Jelajah secara server-side.
- Menyimpan daftar soal yang sah pada metadata sesi.
- Menghitung durasi dari waktu mulai server.
- Menghitung skor, akurasi, dan status menang server-side.
- Membatasi satu hasil terverifikasi per siswa per tugas.
- Memberikan XP serta achievement secara idempoten.

### Fungsi `answer-question`

- Memastikan sesi, siswa, tugas, set, dan soal cocok.
- Menolak soal di luar paket sesi.
- Membaca kunci dari tabel yang tidak dapat diakses siswa.
- Mencegah jawaban ganda.

## 4. Isi konfigurasi frontend

Edit:

```text
config/supabase-config.js
```

Contoh:

```js
export const SUPABASE_CONFIG = Object.freeze({
  url: "https://PROJECT_REF.supabase.co",
  publishableKey: "sb_publishable_xxxxxxxxx",
  siteUrl: "https://USERNAME.github.io/portal-permainan-nusantara/"
});
```

Portal menolak key berawalan `sb_secret_`. Proyek lama juga dapat memakai legacy anon JWT dengan claim `role=anon`.

`setup.html` dapat dipakai untuk pengujian pada satu browser, tetapi konfigurasi publik sebaiknya dimasukkan ke file di atas sebelum deployment.

## 5. Atur Authentication URL

Pada **Authentication → URL Configuration**:

**Site URL**

```text
https://USERNAME.github.io/portal-permainan-nusantara/
```

**Redirect URLs**

```text
https://USERNAME.github.io/portal-permainan-nusantara/**
http://localhost:8000/**
```

Email confirmation dapat dinonaktifkan sementara untuk uji cepat. Untuk pemakaian nyata, aktifkan kembali dan uji alur konfirmasi email.

## 6. Buat admin pertama

Daftar akun melalui `auth.html`, lalu jalankan di SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id
  from auth.users
  where email = 'EMAIL_ADMIN_ANDA'
);
```

Logout lalu login kembali.

## 7. Uji tiga role

Gunakan tiga akun berbeda:

1. Admin.
2. Calon guru.
3. Siswa.

Urutan uji:

1. Calon guru mendaftar atau mengirim permintaan guru dari dashboard siswa.
2. Admin menyetujui permintaan.
3. Guru membuat kelas.
4. Siswa bergabung menggunakan kode kelas.
5. Guru membuat set sedikitnya 10 soal.
6. Guru menerbitkan set.
7. Guru membuat tugas Jelajah Nusantara.
8. Siswa mengerjakan seluruh 10 soal.
9. Guru melihat hasil.
10. Leaderboard menampilkan hasil terverifikasi.

Satu siswa hanya dapat memperoleh satu hasil terverifikasi untuk satu tugas. Guru dapat membuat tugas baru bila ingin memberi percobaan tambahan.

## 8. Periksa Database Advisors

Buka **Database → Advisors** dan pastikan:

- seluruh tabel publik memiliki RLS;
- tidak ada policy terlalu luas;
- `question_keys` tidak dapat dipilih siswa;
- fungsi `SECURITY DEFINER` memiliki `search_path` eksplisit;
- secret key tidak berada di repository;
- indeks dan foreign key tidak menampilkan peringatan penting.

## 9. Uji sebelum GitHub Pages

Jalankan portal pada `http://localhost:8000`, lalu selesaikan checklist pada `docs/TESTING.md`.

## Tambahan v1.1 RC — seed dan admin pertama

Setelah migration berhasil, jalankan:

```text
supabase/seed/001_reference_seed.sql
```

File tersebut mengisi registry game dan achievement secara idempotent.

Setelah akun pertama mendaftar dan pernah login, buka:

```text
supabase/seed/002_first_admin.sql.template
```

Salin ke SQL Editor, ganti email placeholder, lalu jalankan. Jangan menyimpan email pribadi ke repository publik.

Sebelum konfigurasi produksi tersedia, seluruh dashboard dapat diuji melalui Mode Demo pada `auth.html`.
