"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthField } from "@/components/auth/auth-field";
import { PasswordField } from "@/components/auth/password-field";
import { Button, Card, ErrorNote, inputClass } from "@/components/panel/ui";
import { friendlyAuthError } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";
import { focusFirst, useTouched } from "@/lib/use-touched";
import { confirmProblem, emailProblem, filledProblem, newPasswordProblem, passwordChecks } from "@/lib/validate";

// SECTION: UBAH EMAIL
function EmailCard({ current }: { current: string | null }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ oldEmail: string | null; newEmail: string } | null>(null);
  const field = useTouched();
  const address = email.trim();
  const problem = emailProblem(email) ?? (current !== null && address.toLowerCase() === current.toLowerCase() ? "Itu email kamu yang sekarang." : null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setSent(null);
    field.touchAll();
    if (problem) return focusFirst(["akun-email"]);
    setBusy(true);
    try {
      const { error: failure } = await createClient().auth.updateUser(
        { email: address },
        { emailRedirectTo: `${window.location.origin}/auth/callback?next=/akun` },
      );
      if (failure) return setError(friendlyAuthError(failure));
      setSent({ oldEmail: current, newEmail: address });
      setEmail("");
      field.reset();
    } catch {
      setError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Email" description="Dipakai untuk masuk dan menerima email akun.">
      <p className="text-sm">
        Email sekarang: <span className="font-medium">{current ?? "..."}</span>
      </p>
      <form onSubmit={submit} noValidate className="mt-3 max-w-sm space-y-3">
        <AuthField
          id="akun-email"
          label="Email baru"
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
        <p className="text-xs text-panel-muted">Demi keamanan, kami kirim link konfirmasi ke email lama dan email baru. Klik keduanya.</p>
        <Button type="submit" tone="accent" disabled={busy}>
          {busy ? "Mengirim..." : "Ubah email"}
        </Button>
      </form>
      {sent && (
        <div role="status" className="mt-3 space-y-1 text-xs text-panel-ok">
          <p>Link konfirmasi sudah dikirim ke:</p>
          <ul className="list-disc pl-4">
            {sent.oldEmail && <li>email lama: {sent.oldEmail}</li>}
            <li>email baru: {sent.newEmail}</li>
          </ul>
          <p>Klik link di kedua email itu (buka di browser ini). Email baru baru berlaku setelah dua-duanya diklik.</p>
        </div>
      )}
      {error && (
        <div className="mt-2">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
    </Card>
  );
}
// END UBAH EMAIL

// SECTION: UBAH SANDI
function PasswordCard({ current }: { current: string | null }) {
  const [old, setOld] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oldWrong, setOldWrong] = useState(false);
  const [done, setDone] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const field = useTouched();

  const errors = {
    old: oldWrong ? "Sandi saat ini salah." : filledProblem(old, "Sandi saat ini"),
    password: newPasswordProblem(password, "Sandi baru") ?? (old !== "" && password === old ? "Sandi baru harus berbeda dari sandi saat ini." : null),
    confirm: confirmProblem(password, confirm),
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setDone(false);
    field.touchAll();
    if (errors.old) return focusFirst(["akun-old"]);
    if (errors.password) return focusFirst(["akun-password"]);
    if (errors.confirm) return focusFirst(["akun-confirm"]);
    if (current === null) return setError("Email akun belum termuat. Muat ulang halaman.");
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: wrong } = await supabase.auth.signInWithPassword({ email: current, password: old });
      if (wrong) {
        if (wrong.code === "invalid_credentials") {
          setOldWrong(true);
          return focusFirst(["akun-old"]);
        }
        return setError(friendlyAuthError(wrong));
      }
      const { error: failure } = await supabase.auth.updateUser({ password });
      if (failure) return setError(friendlyAuthError(failure));
      setDone(true);
      setOld("");
      setPassword("");
      setConfirm("");
      field.reset();
    } catch {
      setError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function sendReset() {
    if (resetBusy || current === null) return;
    setResetBusy(true);
    setError(null);
    try {
      const { error: failure } = await createClient().auth.resetPasswordForEmail(current, {
        redirectTo: `${window.location.origin}/auth/callback?next=/atur-sandi`,
      });
      if (failure) return setError(friendlyAuthError(failure));
      setResetSent(true);
    } catch {
      setError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <Card title="Sandi" description="Pakai sandi yang unik, minimal 8 karakter.">
      <form onSubmit={submit} noValidate className="max-w-sm space-y-3">
        <PasswordField
          id="akun-old"
          label="Sandi saat ini"
          value={old}
          onChange={(value) => {
            setOld(value);
            setOldWrong(false);
            setError(null);
          }}
          onBlur={() => field.touch("old")}
          error={field.show("old") ? errors.old : null}
          autoComplete="current-password"
          aside={
            <button
              type="button"
              onClick={() => void sendReset()}
              disabled={resetBusy || current === null}
              className="text-xs text-panel-accent underline-offset-2 hover:underline disabled:opacity-50"
            >
              Lupa sandi saat ini?
            </button>
          }
        />
        {resetSent && current && (
          <p role="status" className="text-xs text-panel-ok">
            Link reset sandi dikirim ke {current}. Buka di browser ini untuk membuat sandi baru tanpa sandi lama.
          </p>
        )}
        <PasswordField
          id="akun-password"
          label="Sandi baru"
          value={password}
          onChange={setPassword}
          onBlur={() => field.touch("password")}
          error={field.show("password") ? errors.password : null}
          autoComplete="new-password"
          strength
          checks={passwordChecks(password, confirm)}
        />
        <PasswordField
          id="akun-confirm"
          label="Ulangi sandi baru"
          value={confirm}
          onChange={setConfirm}
          onBlur={() => field.touch("confirm")}
          error={field.show("confirm") || confirm !== "" ? errors.confirm : null}
          autoComplete="new-password"
        />
        {error && <ErrorNote>{error}</ErrorNote>}
        {done && (
          <p role="status" className="text-xs text-panel-ok">
            Sandi diubah.
          </p>
        )}
        <Button type="submit" tone="accent" disabled={busy}>
          {busy ? "Menyimpan..." : "Simpan sandi"}
        </Button>
      </form>
    </Card>
  );
}
// END UBAH SANDI

// SECTION: HAPUS AKUN
function DeleteCard({ current }: { current: string | null }) {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = current !== null && typed.trim().toLowerCase() === current.toLowerCase();

  async function remove() {
    if (!matches || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/akun", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: typed }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        return setError(body?.error ?? `Server menolak (kode ${response.status})`);
      }
      await createClient().auth.signOut({ scope: "local" });
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Hapus akun" description="Menghapus akun beserta semua datanya. Tidak bisa dibatalkan.">
      <p className="text-xs text-panel-muted">
        Yang ikut terhapus: skor, rank, riwayat sesi, pengaturan, dan token. Link overlay dan hotkey worker berhenti bekerja.
      </p>
      <label className="mt-3 block text-xs text-panel-muted">
        Ketik email akunmu untuk konfirmasi
        <input
          type="email"
          autoComplete="off"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          className={`${inputClass} mt-1 block w-full max-w-sm`}
        />
      </label>
      {error && (
        <div className="mt-2">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
      <div className="mt-3">
        <Button tone="armed" disabled={!matches || busy} onClick={() => void remove()}>
          {busy ? "Menghapus..." : "Hapus akun permanen"}
        </Button>
      </div>
    </Card>
  );
}
// END HAPUS AKUN

export function AkunForm() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (alive) setEmail(data.user?.email ?? null);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <EmailCard current={email} />
      <PasswordCard current={email} />
      <DeleteCard current={email} />
    </div>
  );
}
