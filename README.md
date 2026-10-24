# LayerUp

Panel kontrol dan overlay untuk live di TikTok LIVE Studio. Saat ini mendukung Mobile Legends.

## Menjalankan

```bash
npm install
npm run dev
```

Buka http://localhost:3000. Data (skor, sesi, pengaturan) tersimpan di folder `data/` dan tidak ikut git.

## Dipakai di TikTok LIVE Studio

1. Buka halaman **Overlay** di panel dan salin link widget yang dibutuhkan (Scoreboard, Banner, Rank).
2. Di LIVE Studio, tambahkan sumber **Link** dan tempel satu link untuk satu widget.
   LIVE Studio menolak `localhost`, jadi pakai alamat berbentuk domain, misalnya `http://lvh.me:3000/...`.
3. Atur skor dan rank dari **Kontrol Live**, atau dari popup **Kontrol cepat**.

## Gambar rank

Taruh gambar di `public/ranks/` dalam format `.webp` dengan nama: `warrior`, `elite`, `master`, `grandmaster`, `epic`, `legend`, `mythic`, `honor`, `glory`, `immortal`, `grading`.
Kalau file belum ada, widget memakai lencana cadangan.

## Hotkey global

Lihat `worker/README.md`.
