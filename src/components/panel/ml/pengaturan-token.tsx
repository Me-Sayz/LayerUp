"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, ErrorNote, inputClass } from "@/components/panel/ui";
import { useTokens, type TokenKind } from "@/lib/use-tokens";

const ARM_MS = 4000;
const COPIED_MS = 2000;

function RegenerateButton({ kind, label, onRun }: { kind: TokenKind; label: string; onRun: (kind: TokenKind) => Promise<string | null> }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function click() {
    if (busy) return;
    if (!armed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), ARM_MS);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setArmed(false);
    setBusy(true);
    await onRun(kind);
    setBusy(false);
  }

  return (
    <Button size="sm" tone={armed ? "armed" : "neutral"} disabled={busy} onClick={() => void click()}>
      {busy ? "Memproses..." : armed ? "Yakin? Klik lagi" : label}
    </Button>
  );
}

// SECTION: TOKEN
export function TokenCard() {
  const { tokens, error, regenerate } = useTokens();
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  async function copyWorker() {
    if (!tokens) return;
    try {
      await navigator.clipboard.writeText(tokens.workerToken);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      setReveal(true);
    }
  }

  return (
    <Card title="Token" description="Dipakai worker hotkey dan link overlay. Anggap seperti password: jangan dibagikan atau tampil di layar live.">
      <label className="block text-xs text-panel-muted">
        Token worker (untuk hotkey)
        <div className="mt-1 flex gap-2">
          <input
            readOnly
            type={reveal ? "text" : "password"}
            value={tokens?.workerToken ?? ""}
            placeholder={error ? "Gagal memuat" : "Memuat..."}
            onFocus={(event) => event.currentTarget.select()}
            className={`${inputClass} flex-1 font-mono text-xs`}
          />
          <Button size="sm" disabled={!tokens} onClick={() => setReveal((open) => !open)}>
            {reveal ? "Sembunyikan" : "Lihat"}
          </Button>
          <Button size="sm" tone="accent" disabled={!tokens} onClick={() => void copyWorker()}>
            {copied ? "Tersalin" : "Salin"}
          </Button>
        </div>
      </label>
      <p className="mt-2 text-xs text-panel-muted">
        Taruh token ini di file <span className="font-mono text-panel-text">worker/token.txt</span> (satu baris), atau set{" "}
        <span className="font-mono text-panel-text">LAYERUP_TOKEN</span>.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <RegenerateButton kind="worker" label="Buat ulang token worker" onRun={regenerate} />
        <RegenerateButton kind="overlay" label="Buat ulang token overlay" onRun={regenerate} />
      </div>
      <p className="mt-2 text-xs text-panel-muted">
        Token overlay dibuat ulang kalau link bocor. Semua link overlay lama langsung mati, jadi tempel link baru di LIVE Studio.
      </p>

      {error && (
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
    </Card>
  );
}
// END TOKEN
