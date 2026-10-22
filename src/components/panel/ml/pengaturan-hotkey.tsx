"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, ErrorNote, inputClass } from "@/components/panel/ui";
import {
  DEFAULT_HOTKEYS,
  HOTKEY_ACTIONS,
  HOTKEY_LABELS,
  comboFromKeyEvent,
  findConflict,
  normalizeCombo,
  sameHotkeys,
  type HotkeyAction,
  type HotkeySettings,
} from "@/games/ml/hotkeys";
import { ML_GAME_ID } from "@/games/ml/state";
import { sendSettings } from "@/lib/send-settings";
import { useWorkerStatus } from "@/lib/use-game-state";

const SAVED_MS = 2000;

type Draft = Record<HotkeyAction, string>;

function normalizedDraft(draft: Draft): HotkeySettings | null {
  const result = { ...DEFAULT_HOTKEYS };
  for (const action of HOTKEY_ACTIONS) {
    const combo = normalizeCombo(draft[action]);
    if (combo === null) return null;
    result[action] = combo;
  }
  return result;
}

// SECTION: WORKER STATUS
function WorkerBadge({ saved }: { saved: HotkeySettings }) {
  const worker = useWorkerStatus(ML_GAME_ID);
  const online = worker?.online === true;
  const applied = online && HOTKEY_ACTIONS.every((action) => worker.hotkeys[action] === saved[action]);

  return (
    <div className="text-right text-xs" role="status">
      <span className={online ? "text-panel-ok" : "text-panel-muted"}>
        {online ? "Worker terhubung" : "Worker tidak aktif"}
      </span>
      {online && !applied && <p className="mt-0.5 text-panel-muted">Menerapkan perubahan...</p>}
    </div>
  );
}
// END WORKER STATUS

// SECTION: HOTKEY
export function HotkeyCard({ saved }: { saved: HotkeySettings }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [recording, setRecording] = useState<HotkeyAction | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef<Draft>(saved);

  const current: Draft = draft ?? saved;

  useEffect(() => {
    draftRef.current = current;
  });

  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (recording === null) return;
    const action = recording;

    function onKeyDown(event: KeyboardEvent): void {
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;
      if (event.code === "Escape") {
        setRecording(null);
        setHint(null);
        return;
      }
      const captured = comboFromKeyEvent(event);
      if (captured === null) return;
      if ("error" in captured) {
        setHint(captured.error);
        return;
      }
      setDraft({ ...draftRef.current, [action]: captured.combo });
      setRecording(null);
      setHint(null);
      setJustSaved(false);
      setError(null);
    }

    function cancel(): void {
      setRecording(null);
      setHint(null);
    }

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("blur", cancel);
    };
  }, [recording]);

  const normalized = normalizedDraft(current);
  const conflict = findConflict(current);
  const valid = normalized !== null && conflict === null;
  const dirty = normalized === null || !sameHotkeys(normalized, saved);
  const isDefault = normalized !== null && sameHotkeys(normalized, DEFAULT_HOTKEYS);

  function edit(action: HotkeyAction, text: string): void {
    setDraft({ ...current, [action]: text });
    setJustSaved(false);
    setError(null);
  }

  function resetDefault(): void {
    setDraft({ ...DEFAULT_HOTKEYS });
    setRecording(null);
    setHint(null);
    setJustSaved(false);
    setError(null);
  }

  async function save(): Promise<void> {
    if (!normalized || !valid || saving) return;
    setSaving(true);
    setError(null);
    const result = await sendSettings(ML_GAME_ID, { hotkeys: normalized });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDraft(null);
    setJustSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setJustSaved(false), SAVED_MS);
  }

  const status = saving
    ? "Menyimpan..."
    : dirty
      ? "Belum disimpan"
      : justSaved
        ? "Tersimpan. Worker memakai tombol baru dalam beberapa detik."
        : "Sama dengan yang dipakai worker";

  return (
    <Card
      title="Hotkey global"
      description="Dibaca oleh worker Python, jadi tetap jalan saat jendela yang aktif TikTok LIVE Studio atau game."
      aside={<WorkerBadge saved={saved} />}
    >
      <ul className="space-y-3">
        {HOTKEY_ACTIONS.map((action) => {
          const text = current[action];
          const invalid = normalizeCombo(text) === null;
          const clash = conflict !== null && conflict.includes(action);
          const isRecording = recording === action;
          const id = `hotkey-${action}`;
          return (
            <li key={action} className="flex flex-wrap items-center gap-2">
              <label htmlFor={id} className="w-28 shrink-0 text-sm">
                {HOTKEY_LABELS[action]}
              </label>
              <input
                id={id}
                value={text}
                onChange={(event) => edit(action, event.target.value)}
                spellCheck={false}
                autoComplete="off"
                aria-invalid={invalid || clash}
                className={`${inputClass} w-44 font-mono`}
              />
              <Button
                size="sm"
                tone={isRecording ? "accent" : "neutral"}
                aria-pressed={isRecording}
                onClick={() => {
                  setHint(null);
                  setRecording(isRecording ? null : action);
                }}
              >
                {isRecording ? "Tekan tombol... (Esc batal)" : "Rekam"}
              </Button>
              {(invalid || clash) && (
                <span className="text-xs text-panel-bad">{invalid ? "Kombinasi tidak valid" : "Bentrok dengan aksi lain"}</span>
              )}
            </li>
          );
        })}
      </ul>

      {hint && (
        <p role="alert" className="mt-3 rounded-md bg-panel px-3 py-2 text-xs text-panel-muted">
          {hint}
        </p>
      )}

      {error && (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-panel-line pt-4">
        <Button tone="accent" disabled={!dirty || !valid || saving} onClick={() => void save()}>
          Simpan
        </Button>
        {dirty && (
          <Button disabled={saving} onClick={() => setDraft(null)}>
            Batalkan perubahan
          </Button>
        )}
        <Button disabled={saving || isDefault} onClick={resetDefault}>
          Reset ke default
        </Button>
        <span className={`text-xs ${dirty ? "text-panel-accent" : "text-panel-muted"}`} role="status">
          {status}
        </span>
      </div>

      <ul className="mt-4 list-disc space-y-1 pl-4 text-xs text-panel-muted">
        <li>Format: ctrl+1, alt+f2, ctrl+shift+u. Huruf dan angka wajib bersama Ctrl, Alt, atau Win. F1-F24 boleh sendiri.</li>
        <li>Selama worker jalan, tombol ini diblokir untuk aplikasi lain, misalnya Ctrl+1 tidak lagi pindah tab Chrome.</li>
        <li>Chrome menahan beberapa kombinasi (Ctrl+T, Ctrl+W, Ctrl+N) sehingga tidak bisa direkam. Ketik manual atau pilih kombinasi lain.</li>
        <li>Jalankan worker lewat worker/jalankan.bat. Kalau LIVE Studio atau game jalan sebagai admin, pakai jalankan-admin.bat.</li>
      </ul>
    </Card>
  );
}
// END HOTKEY
