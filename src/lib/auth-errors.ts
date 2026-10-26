interface AuthLike {
  message?: string;
  code?: string;
}

export function friendlyAuthError(error: AuthLike): string {
  const code = (error.code ?? "").toLowerCase();
  const text = (error.message ?? "").toLowerCase();
  if (code === "invalid_credentials" || text.includes("invalid login")) return "Email atau sandi salah.";
  if (code === "user_already_exists" || text.includes("already registered")) return "Email ini sudah terdaftar. Coba masuk.";
  if (code === "email_not_confirmed" || text.includes("email not confirmed")) return "Email belum dikonfirmasi. Cek kotak masuk kamu.";
  if (code === "same_password" || text.includes("different from the old")) return "Sandi baru harus berbeda dari sandi lama.";
  if (code === "reauthentication_needed" || text.includes("reauthentication")) return "Demi keamanan, keluar lalu masuk lagi, kemudian ulangi.";
  if (code === "weak_password" || text.includes("weak")) return "Sandi terlalu lemah. Pakai kombinasi huruf, angka, dan simbol.";
  if (code.includes("rate_limit") || text.includes("rate limit") || text.includes("too many")) return "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.";
  if (code === "email_address_invalid" || text.includes("valid email") || text.includes("invalid email")) return "Format email tidak valid.";
  if (text.includes("password")) return "Sandi tidak memenuhi syarat.";
  return "Terjadi kesalahan. Coba lagi.";
}
