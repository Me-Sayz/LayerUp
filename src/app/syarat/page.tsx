import type { Metadata } from "next";
import { ContactLine, LegalShell } from "@/components/auth/legal-shell";

export const metadata: Metadata = { title: "Syarat penggunaan - LayerUp" };

export default function TermsPage() {
  return (
    <LegalShell title="Syarat penggunaan" updated="26 Oktober 2026">
      <section>
        <h2>Tentang LayerUp</h2>
        <p>
          LayerUp adalah alat bantu untuk live streaming: panel kontrol dan overlay (scoreboard, banner, rank) yang ditampilkan lewat TikTok LIVE Studio.
          Dengan membuat akun atau memakai LayerUp, kamu setuju dengan syarat di halaman ini.
        </p>
      </section>
      <section>
        <h2>Akun dan keamananmu</h2>
        <ul>
          <li>Kamu bertanggung jawab atas sandi dan token (link overlay serta token worker) milik akunmu.</li>
          <li>Jangan membagikan atau menampilkan link overlay dan token di layar live. Kalau bocor, buat ulang di Pengaturan.</li>
          <li>Satu akun untuk satu orang. Jangan memakai akun orang lain.</li>
        </ul>
      </section>
      <section>
        <h2>Pemakaian yang wajar</h2>
        <ul>
          <li>Jangan membebani layanan dengan sengaja (misalnya mengirim permintaan berlebihan atau otomatis).</li>
          <li>Jangan mencoba mengakses data akun lain atau merusak layanan.</li>
          <li>Teks yang kamu tampilkan di overlay adalah tanggung jawabmu dan harus mengikuti aturan platform tempat kamu live.</li>
        </ul>
      </section>
      <section>
        <h2>Merek dan gambar pihak lain</h2>
        <p>
          LayerUp tidak berafiliasi dengan TikTok, ByteDance, atau Moonton. Nama dan gambar Mobile Legends, termasuk gambar peringkat, adalah milik
          pemiliknya masing-masing dan dipakai hanya sebagai tampilan di overlay milikmu.
        </p>
      </section>
      <section>
        <h2>Layanan apa adanya</h2>
        <p>
          LayerUp diberikan apa adanya. Fitur dapat berubah, dan layanan bisa terganggu atau dihentikan sewaktu-waktu. Kami berusaha menjaga data tetap
          aman dan tersimpan, tetapi tidak menjamin layanan selalu tersedia tanpa gangguan. Gunakan dengan memperhatikan hal ini saat live.
        </p>
      </section>
      <section>
        <h2>Menghapus akun</h2>
        <p>
          Kamu bisa menghapus akun kapan saja dari halaman Akun. Semua data akun (skor, rank, riwayat sesi, pengaturan, dan token) ikut terhapus dan
          tidak bisa dikembalikan. Akun yang melanggar syarat ini dapat dibatasi atau dihapus.
        </p>
      </section>
      <section>
        <h2>Perubahan syarat</h2>
        <p>Syarat ini bisa diperbarui. Tanggal pembaruan terbaru tertulis di bagian atas halaman.</p>
      </section>
      <ContactLine />
    </LegalShell>
  );
}
