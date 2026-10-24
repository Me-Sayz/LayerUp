"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorNote, inputClass } from "@/components/panel/ui";
import { createClient } from "@/lib/supabase/client";
import { SUPABASE_READY } from "@/lib/supabase/env";

type Mode = "masuk" | "daftar";

const MIN_PASSWORD = 6;

function friendly(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("invalid login")) return "Email atau password salah.";
  if (text.includes("already registered")) return "Email ini sudah terdaftar. Coba masuk.";
  if (text.includes("email not confirmed")) return "Email belum dikonfirmasi. Cek kotak masuk kamu.";
  if (text.includes("rate limit")) return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
  if (text.includes("password")) return `Password minimal ${MIN_PASSWORD} karakter.`;
  if (text.includes("valid email") || text.includes("invalid email")) return "Format email tidak valid.";
  return "Terjadi kesalahan. Coba lagi.";
}

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("masuk");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const supabase = createClient();
      if (mode === "masuk") {
        const { error: failure } = await supabase.auth.signInWithPassword({ email, password });
        if (failure) return setError(friendly(failure.message));
      } else {
        const { data, error: failure } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (failure) return setError(friendly(failure.message));
        if (!data.session) {
          setNotice("Akun dibuat. Cek email kamu untuk konfirmasi, lalu masuk.");
          setMode("masuk");
          return;
        }
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  const daftar = mode === "daftar";

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">LayerUp</h1>
        <p className="mt-1 text-sm text-panel-muted">Panel dan overlay untuk live TikTok.</p>
      </div>

      <section className="rounded-lg border border-panel-line bg-panel-raised p-5">
        <h2 className="text-sm font-medium">{daftar ? "Buat akun" : "Masuk"}</h2>

        {!SUPABASE_READY && (
          <div className="mt-3">
            <ErrorNote>Supabase belum dikonfigurasi. Isi .env.local lalu jalankan ulang server.</ErrorNote>
          </div>
        )}

        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block text-xs text-panel-muted">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={`${inputClass} mt-1 w-full`}
            />
          </label>
          <label className="block text-xs text-panel-muted">
            Password
            <input
              type="password"
              required
              minLength={MIN_PASSWORD}
              autoComplete={daftar ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={`${inputClass} mt-1 w-full`}
            />
          </label>

          {error && (
            <p role="alert" className="text-xs text-panel-bad">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-xs text-panel-ok">
              {notice}
            </p>
          )}

          <div className="grid">
            <Button type="submit" tone="accent" size="lg" disabled={busy || !SUPABASE_READY}>
              {busy ? "Memproses..." : daftar ? "Daftar" : "Masuk"}
            </Button>
          </div>
        </form>

        <p className="mt-4 text-center text-xs text-panel-muted">
          {daftar ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(daftar ? "masuk" : "daftar");
              setError(null);
              setNotice(null);
            }}
            className="font-medium text-panel-accent hover:underline"
          >
            {daftar ? "Masuk" : "Daftar"}
          </button>
        </p>
      </section>
    </div>
  );
}
