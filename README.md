# Pandu JKN — Frontend (fe-pandu-jkn)

Frontend React + TypeScript (Vite) untuk API **Pandu JKN** di `../pandu-jkn`.
Tampilan memakai tema gelap dengan aksen oranye, lalu dihubungkan ke seluruh
endpoint backend yang tersedia.

## Menjalankan

1. Jalankan backend lebih dulu:

   ```bash
   cd ../pandu-jkn
   .venv/Scripts/python -m uvicorn app:app --reload --port 8000
   ```

2. Jalankan frontend:

   ```bash
   npm install
   npm run dev
   ```

3. Buka <http://localhost:5173>.

Vite mem-proxy `/api` dan `/health` ke `http://127.0.0.1:8000`, jadi tidak perlu
mengubah apa pun saat development. Ubah target lewat `.env` (lihat `.env.example`).

## Build produksi

```bash
npm run build
npm run preview
```

Untuk produksi, set `VITE_API_BASE_URL` ke URL API lengkap (mis.
`https://api.contoh.id/api`) sebelum build, atau arahkan reverse proxy `/api`
ke backend. Backend sudah mengaktifkan CORS (`FRONTEND_ORIGINS`).

## Integrasi API

| Fitur UI | Endpoint backend |
| --- | --- |
| Masuk | `POST /api/login` |
| Daftar + auto-login | `POST /api/register`, `POST /api/login` |
| Keluar | `POST /api/logout` |
| Profil & data kesehatan | `GET /api/profile`, `PUT /api/profile` |
| Daftar percakapan | `GET /api/sessions` |
| Riwayat pesan | `GET /api/sessions/{id}/messages` |
| Judul otomatis percakapan baru | `PATCH /api/sessions/{id}` |
| Bintang percakapan | `PUT /api/sessions/{id}/star` |
| Kirim pesan + foto (streaming SSE) | `POST /api/chat` |
| Ringkasan untuk dokter | `POST /api/summary` |
| Status kepesertaan | `GET /api/bpjs-status/{nik}` |

Catatan:

- Login backend memakai **email** (bukan nomor HP).
- Registrasi hanya menerima **NIK yang terdaftar di data kepesertaan BPJS**.
- Setelah masuk, pengguna dengan profil belum lengkap akan melihat modal wajib
  "Lengkapi profil Anda" (tanggal lahir, jenis kelamin, tinggi/berat badan).
- Token JWT disimpan di `localStorage` (atau `sessionStorage` bila "Ingat saya"
  tidak dicentang). Respons 401 otomatis mengakhiri sesi dan kembali ke halaman masuk.
- Pesan agen di-stream memakai `fetch` + pembacaan SSE (`data: {...}`), termasuk
  indikator mengetik, lampiran gambar (JPEG/PNG/WEBP, maks. 8 MB), dan judul
  percakapan otomatis dari pesan pertama.

## Struktur

```
src/
  api/          client fetch, SSE, tipe respons
  auth/         AuthProvider (token + profil)
  components/   modal lengkapi profil, ringkasan dokter, field profil
  lib/          validasi & pemetaan profil (Indonesia)
  pages/        Login, Register, Chat, Profil
  ui/           Shell (sidebar/topbar), field, ikon, toast
```
