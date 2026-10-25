# LayerUp hotkey worker

Mendengarkan tombol global dan mengirim event ke LayerUp, jadi jalan walau jendela yang aktif TikTok LIVE Studio atau game.

Default: Ctrl+1 Victory, Ctrl+2 Defeat, Ctrl+3 Undo, Ctrl+4 Match baru.

## Jalankan
1. Pastikan server LayerUp jalan (`npm start`) dan kamu sudah login di panel.
2. Buka Pengaturan > Umum, salin **token worker**, lalu tempel di file `worker/token.txt` (satu baris). Atau set `LAYERUP_TOKEN`.
3. Klik dua kali `jalankan.bat` (atau `jalankan-admin.bat` kalau LIVE Studio/game jalan sebagai admin).
4. Tekan kombinasi tombol, konsol menulis satu baris per tekanan.

Server di alamat lain: set `LAYERUP_URL`, misalnya `set LAYERUP_URL=http://lvh.me:3000`.

## Catatan
- Token seperti password: jangan dibagikan. Kalau bocor, buat ulang di Pengaturan > Umum lalu ganti isi `token.txt`.
- Tombol diblokir selama worker jalan, jadi Ctrl+1..4 tidak berfungsi di aplikasi lain.
- Tahan tombol tidak mengirim berulang (jeda 0,4 detik).
- Kombinasi dibaca dari pengaturan server tiap 3 detik; kalau belum ada, pakai default.
