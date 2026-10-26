"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthHeading } from "@/components/auth/auth-shell";
import { AuthField } from "@/components/auth/auth-field";
import { Button, ErrorNote } from "@/components/panel/ui";
import { friendlyAuthError } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";
import { SUPABASE_READY } from "@/lib/supabase/env";
import { useCooldown } from "@/lib/use-cooldown";
import { focusFirst, useTouched } from "@/lib/use-touched";
import { emailProblem } from "@/lib/validate";

const RESEND_SECONDS = 60;

export function ForgotForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useCooldown();
  const field = useTouched();
  const problem = emailProblem(email);
  const expired = params.get("link") === "kedaluwarsa";

  async function send(event?: FormEvent) {
    event?.preventDefault();
    if (busy || left > 0) return;
    if (!sentTo && problem) {
      field.touchAll();
      return focusFirst(["forgot-email"]);
    }
    setBusy(true);
    setError(null);
    try {
      const address = sentTo ?? email.trim();
      const { error: failure } = await createClient().auth.resetPasswordForEmail(address, {
        redirectTo: `${window.location.origin}/auth/callback?next=/atur-sandi`,
      });
      if (failure) return setError(friendlyAuthError(failure));
      setSentTo(address);
      setLeft(RESEND_SECONDS);
    } catch {
      setError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AuthHeading
        title="Lupa sandi"
        subtitle={sentTo ? undefined : "Masukkan email akunmu. Kami kirim link untuk membuat sandi baru."}
      />

      {expired && !sentTo && (
        <div className="mb-3">
          <ErrorNote>Link reset sudah kedaluwarsa atau dibuka di browser lain. Minta link baru di bawah.</ErrorNote>
        </div>
      )}

      {sentTo ? (
        <div>
          <p className="text-sm">
            Kalau <span className="font-medium">{sentTo}</span> terdaftar, link reset sandi sudah dikirim. Buka link itu di browser ini.
          </p>
          <p className="mt-2 text-xs text-panel-muted">Tidak ada? Periksa folder spam, atau kirim ulang.</p>
          {error && (
            <div className="mt-3">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}
          <div className="mt-4 grid">
            <Button size="lg" disabled={left > 0 || busy} onClick={() => void send()}>
              {left > 0 ? `Kirim ulang (${left} dtk)` : "Kirim ulang email"}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={send} noValidate className="space-y-3.5">
          <AuthField
            id="forgot-email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(value) => {
              setEmail(value);
              setError(null);
            }}
            onBlur={() => field.touch("email")}
            error={field.show("email") ? problem : null}
          />
          {!SUPABASE_READY && <ErrorNote>Supabase belum dikonfigurasi. Isi .env.local lalu jalankan ulang server.</ErrorNote>}
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="grid">
            <Button type="submit" tone="accent" size="lg" disabled={busy || !SUPABASE_READY}>
              {busy ? "Mengirim..." : "Kirim link reset"}
            </Button>
          </div>
        </form>
      )}

      <p className="mt-4 text-center text-xs text-panel-muted">
        <Link href="/login" className="text-panel-accent underline-offset-2 hover:underline">
          Kembali ke halaman masuk
        </Link>
      </p>
    </div>
  );
}
