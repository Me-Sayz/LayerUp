import { MIN_PASSWORD } from "@/lib/password";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function emailProblem(value: string): string | null {
  const text = value.trim();
  if (text === "") return "Email belum diisi.";
  if (!EMAIL_PATTERN.test(text)) return "Format email belum benar. Contoh: nama@email.com.";
  return null;
}

export function filledProblem(value: string, label = "Sandi"): string | null {
  return value === "" ? `${label} belum diisi.` : null;
}

export function newPasswordProblem(value: string, label = "Sandi"): string | null {
  if (value === "") return `${label} belum diisi.`;
  if (value.length < MIN_PASSWORD) return `${label} kurang ${MIN_PASSWORD - value.length} karakter lagi (minimal ${MIN_PASSWORD}).`;
  return null;
}

export function confirmProblem(password: string, confirm: string): string | null {
  if (confirm === "") return "Ulangi sandi belum diisi.";
  if (password !== confirm) return "Belum sama dengan sandi di atas.";
  return null;
}

export function passwordChecks(password: string, confirm: string) {
  return [
    { label: `Minimal ${MIN_PASSWORD} karakter`, ok: password.length >= MIN_PASSWORD },
    { label: "Sama dengan ulangi sandi", ok: confirm !== "" && confirm === password },
  ];
}
