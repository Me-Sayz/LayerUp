"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthHeading } from "@/components/auth/auth-shell";
import { PasswordField } from "@/components/auth/password-field";
import { Button, ErrorNote } from "@/components/panel/ui";
import { friendlyAuthError } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";
import { focusFirst, useTouched } from "@/lib/use-touched";
import { confirmProblem, newPasswordProblem, passwordChecks } from "@/lib/validate";

export function ResetForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = useTouched();
  const errors = { password: newPasswordProblem(password, "Sandi baru"), confirm: confirmProblem(password, confirm) };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    field.touchAll();
    if (errors.password) return focusFirst(["reset-password"]);
    if (errors.confirm) return focusFirst(["reset-confirm"]);
    setBusy(true);
    try {
      const { error: failure } = await createClient().auth.updateUser({ password });
      if (failure) return setError(friendlyAuthError(failure));
      router.replace("/");
      router.refresh();
    } catch {
      setError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AuthHeading title="Buat sandi baru" subtitle="Setelah disimpan, kamu langsung masuk ke panel." />
      <form onSubmit={submit} noValidate className="space-y-3.5">
        <PasswordField
          id="reset-password"
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
          id="reset-confirm"
          label="Ulangi sandi baru"
          value={confirm}
          onChange={setConfirm}
          onBlur={() => field.touch("confirm")}
          error={field.show("confirm") || confirm !== "" ? errors.confirm : null}
          autoComplete="new-password"
        />
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="grid pt-1">
          <Button type="submit" tone="accent" size="lg" disabled={busy}>
            {busy ? "Menyimpan..." : "Simpan sandi"}
          </Button>
        </div>
      </form>
    </div>
  );
}
