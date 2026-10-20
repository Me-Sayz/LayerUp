# LayerUp hotkey worker

Mendengarkan tombol global dan mengirim event ke LayerUp, jadi jalan walau jendela yang aktif TikTok LIVE Studio atau game.

Default: Ctrl+1 Victory, Ctrl+2 Defeat, Ctrl+3 Undo, Ctrl+4 Match baru.

## Jalankan
1. Pastikan server LayerUp jalan (`npm start`).
2. Klik dua kali `jalankan.bat` (atau `jalankan-admin.bat` kalau LIVE Studio/game jalan sebagai admin).
3. Tekan kombinasi tombol, konsol menulis satu baris per tekanan.

Server di alamat lain: set `LAYERUP_URL`, misalnya `set LAYERUP_URL=http://lvh.me:3000`.

## Catatan
- Tombol diblokir selama worker jalan, jadi Ctrl+1..4 tidak berfungsi di aplikasi lain.
- Tahan tombol tidak mengirim berulang (jeda 0,4 detik).
- Kombinasi dibaca dari pengaturan server tiap 3 detik; kalau belum ada, pakai default.
