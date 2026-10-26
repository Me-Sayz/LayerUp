"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, type KeyboardEvent } from "react";
import { AuthField } from "@/components/auth/auth-field";
import { AuthHeading } from "@/components/auth/auth-shell";
import { PasswordField } from "@/components/auth/password-field";
import { Button, ErrorNote } from "@/components/panel/ui";
import { friendlyAuthError } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";
import { SUPABASE_READY } from "@/lib/supabase/env";
import { useCooldown } from "@/lib/use-cooldown";
import { focusFirst, useTouched } from "@/lib/use-touched";
import { confirmProblem, emailProblem, filledProblem, newPasswordProblem, passwordChecks } from "@/lib/validate";

type Mode = "masuk" | "daftar";

const RESEND_SECONDS = 60;
const MODES: { id: Mode; label: string }[] = [
  { id: "masuk", label: "Masuk" },
  { id: "daftar", label: "Daftar" },
];

// SECTION: CEK EMAIL
function CheckEmail({ email, onBack }: { email: string; onBack: () => void }) {
  const [left, setLeft] = useCooldown();
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    if (left > 0) return;
    setError(null);
    setNote(null);
    const { error: failure } = await createClient().auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (failure) return setError(friendlyAuthError(failure));
    setNote("Email dikirim ulang.");
    setLeft(RESEND_SECONDS);
  }

  return (
    <div>
      <AuthHeading title="Cek email kamu" subtitle={`Kami mengirim link konfirmasi ke ${email}. Klik link itu untuk mengaktifkan akun.`} />
      <p className="text-xs text-panel-muted">Tidak ada? Periksa folder spam, atau kirim ulang.</p>
      {error && (
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
      {note && (
        <p role="status" className="mt-3 text-xs text-panel-ok">
          {note}
        </p>
      )}
      <div className="mt-4 grid gap-2">
        <Button size="lg" disabled={left > 0} onClick={() => void resend()}>
          {left > 0 ? `Kirim ulang (${left} dtk)` : "Kirim ulang email"}
        </Button>
        <Button size="lg" tone="neutral" onClick={onBack}>
          Pakai email lain
        </Button>
      </div>
    </div>
  );
}
// END CEK EMAIL

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>("masuk");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverField, setServerField] = useState<{ field: "email" | "password"; message: string } | null>(null);
  const field = useTouched();
  const expired = params.get("link") === "kedaluwarsa";
  const daftar = mode === "daftar";

  const errors = {
    email: emailProblem(email),
    password: daftar ? newPasswordProblem(password) : filledProblem(password),
    confirm: daftar ? confirmProblem(password, confirm) : null,
    agree: daftar && !agree ? "Centang persetujuan dulu untuk membuat akun." : null,
  };
  const shown = {
    email: (field.show("email") ? errors.email : null) ?? (serverField?.field === "email" ? serverField.message : null),
    password: (field.show("password") ? errors.password : null) ?? (serverField?.field === "password" ? serverField.message : null),
    confirm: field.show("confirm") || confirm !== "" ? errors.confirm : null,
    agree: field.show("agree") ? errors.agree : null,
  };

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setServerField(null);
    setConfirm("");
    setAgree(false);
    field.reset();
  }

  function onTabKey(event: KeyboardEvent) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    switchMode(mode === "masuk" ? "daftar" : "masuk");
  }

  function edit(setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      setError(null);
      setServerField(null);
    };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setServerField(null);
    field.touchAll();
    const order = ["email", "password", "confirm", "agree"] as const;
    const bad = order.find((key) => errors[key] !== null);
    if (bad) return focusFirst([`auth-${bad}`]);
    const address = email.trim();
    setBusy(true);
    try {
      const supabase = createClient();
      if (!daftar) {
        const { error: failure } = await supabase.auth.signInWithPassword({ email: address, password });
        if (failure) {
          if (failure.code === "email_not_confirmed") return setPendingEmail(address);
          if (failure.code === "invalid_credentials") return setServerField({ field: "password", message: "Email atau sandi salah. Periksa lagi, atau pakai Lupa sandi." });
          return setError(friendlyAuthError(failure));
        }
      } else {
        const { data, error: failure } = await supabase.auth.signUp({
          email: address,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (failure) {
          if (failure.code === "user_already_exists") return setServerField({ field: "email", message: "Email ini sudah terdaftar." });
          if (failure.code === "weak_password") return setServerField({ field: "password", message: friendlyAuthError(failure) });
          return setError(friendlyAuthError(failure));
        }
        if (!data.session) return setPendingEmail(address);
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  if (pendingEmail) {
    return <CheckEmail email={pendingEmail} onBack={() => setPendingEmail(null)} />;
  }

  return (
    <div>
      <div role="tablist" aria-label="Masuk atau daftar" onKeyDown={onTabKey} className="mb-5 grid grid-cols-2 rounded-md border border-panel-line bg-panel p-0.5">
        {MODES.map((item) => {
          const active = mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`auth-tab-${item.id}`}
              aria-selected={active}
              aria-controls="auth-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => switchMode(item.id)}
              className={`h-9 rounded text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-panel-accent ${
                active ? "bg-panel-hover text-panel-text" : "text-panel-muted hover:text-panel-text"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div id="auth-panel" role="tabpanel" aria-labelledby={`auth-tab-${mode}`}>
        <AuthHeading
          title={daftar ? "Buat akun LayerUp" : "Masuk ke LayerUp"}
          subtitle={daftar ? "Skor, rank, dan pengaturanmu tersimpan per akun." : "Lanjutkan ke panel kontrol live kamu."}
        />

        {expired && (
          <div className="mb-3">
            <ErrorNote>Link sudah kedaluwarsa atau dibuka di browser lain. Masuk lagi atau minta link baru.</ErrorNote>
          </div>
        )}
        {!SUPABASE_READY && (
          <div className="mb-3">
            <ErrorNote>Supabase belum dikonfigurasi. Isi .env.local lalu jalankan ulang server.</ErrorNote>
          </div>
        )}

        <form onSubmit={submit} noValidate className="space-y-3.5">
          <AuthField
            id="auth-email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={edit(setEmail)}
            onBlur={() => field.touch("email")}
            error={shown.email}
            errorAction={
              serverField?.field === "email" && daftar ? (
                <button type="button" onClick={() => switchMode("masuk")} className="text-panel-accent underline underline-offset-2">
                  Masuk saja
                </button>
              ) : undefined
            }
          />

          <PasswordField
            id="auth-password"
            label="Sandi"
            value={password}
            onChange={edit(setPassword)}
            onBlur={() => field.touch("password")}
            error={shown.password}
            autoComplete={daftar ? "new-password" : "current-password"}
            strength={daftar}
            checks={daftar ? passwordChecks(password, confirm) : undefined}
            aside={
              !daftar && (
                <Link href="/lupa-sandi" className="text-xs text-panel-accent underline-offset-2 hover:underline">
                  Lupa sandi?
                </Link>
              )
            }
          />

          {daftar && (
            <>
              <PasswordField
                id="auth-confirm"
                label="Ulangi sandi"
                value={confirm}
                onChange={setConfirm}
                onBlur={() => field.touch("confirm")}
                error={shown.confirm}
                autoComplete="new-password"
              />
              <div>
                <label className="flex items-start gap-2 text-xs text-panel-muted">
                  <input
                    id="auth-agree"
                    type="checkbox"
                    checked={agree}
                    onChange={(event) => {
                      setAgree(event.target.checked);
                      field.touch("agree");
                    }}
                    aria-invalid={shown.agree ? true : undefined}
                    className="mt-0.5 h-4 w-4 accent-[#f2c14e]"
                  />
                  <span>
                    Saya setuju dengan{" "}
                    <Link href="/syarat" target="_blank" className="text-panel-text underline underline-offset-2">
                      syarat penggunaan
                    </Link>{" "}
                    dan{" "}
                    <Link href="/privasi" target="_blank" className="text-panel-text underline underline-offset-2">
                      kebijakan privasi
                    </Link>
                    .
                  </span>
                </label>
                {shown.agree && <p className="mt-1 text-xs text-panel-bad">{shown.agree}</p>}
              </div>
            </>
          )}

          {error && <ErrorNote>{error}</ErrorNote>}

          <div className="grid pt-1">
            <Button type="submit" tone="accent" size="lg" disabled={busy || !SUPABASE_READY}>
              {busy ? "Memproses..." : daftar ? "Buat akun" : "Masuk"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
