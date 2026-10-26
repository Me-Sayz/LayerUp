import type { Metadata } from "next";
import { ContactLine, LegalShell } from "@/components/auth/legal-shell";

export const metadata: Metadata = { title: "Kebijakan privasi - LayerUp" };

export default function PrivacyPage() {
  return (
    <LegalShell title="Kebijakan privasi" updated="26 Oktober 2026">
      <section>
        <h2>Data yang kami simpan</h2>
        <ul>
          <li>Email dan sandi akunmu. Sandi disimpan dalam bentuk terenkripsi (hash) oleh layanan autentikasi, bukan sebagai teks biasa.</li>
          <li>Data pemakaian aplikasi: skor sesi, rank, riwayat sesi, teks bebas yang kamu kirim, hero, dan pengaturan overlay serta hotkey.</li>
          <li>Token overlay dan token worker milik akunmu.</li>
        </ul>
      </section>
      <section>
        <h2>Untuk apa data dipakai</h2>
        <p>
          Hanya untuk menjalankan LayerUp: masuk ke akun, menampilkan data di panel dan overlay, serta mengirim email yang berkaitan dengan akun
          (konfirmasi, reset sandi, perubahan email). Data tidak dijual dan tidak dipakai untuk iklan.
        </p>
      </section>
      <section>
        <h2>Cookie</h2>
        <p>LayerUp hanya memakai cookie sesi login supaya kamu tetap masuk. Tidak ada cookie iklan atau pelacak pihak ketiga.</p>
      </section>
      <section>
        <h2>Tempat penyimpanan</h2>
        <p>
          Data akun dan data aplikasi disimpan di layanan basis data dan autentikasi Supabase. Pengiriman email akun juga lewat layanan yang kami pakai
          untuk itu. Pihak-pihak ini hanya memproses data untuk menjalankan LayerUp.
        </p>
      </section>
      <section>
        <h2>Kendali ada padamu</h2>
        <ul>
          <li>Ubah email dan sandi kapan saja dari halaman Akun.</li>
          <li>Buat ulang token overlay dan token worker dari Pengaturan kalau perlu.</li>
          <li>Hapus akun dari halaman Akun. Semua datamu ikut terhapus dan tidak bisa dikembalikan.</li>
        </ul>
      </section>
      <section>
        <h2>Perubahan kebijakan</h2>
        <p>Kebijakan ini bisa diperbarui. Tanggal pembaruan terbaru tertulis di bagian atas halaman.</p>
      </section>
      <ContactLine />
    </LegalShell>
  );
}
