export const MIN_PASSWORD = 8;

export interface Strength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
}

export function passwordStrength(password: string): Strength {
  if (password.length === 0) return { score: 0, label: "" };
  if (password.length < MIN_PASSWORD) return { score: 1, label: "Terlalu pendek" };
  let points = 0;
  if (password.length >= 12) points += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1;
  if (/\d/.test(password)) points += 1;
  if (/[^A-Za-z0-9]/.test(password)) points += 1;
  if (points >= 3) return { score: 4, label: "Kuat" };
  if (points === 2) return { score: 3, label: "Cukup" };
  return { score: 2, label: "Lemah" };
}

export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD) return `Sandi minimal ${MIN_PASSWORD} karakter.`;
  return null;
}
