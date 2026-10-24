"use client";

import { useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Button } from "@/components/panel/ui";
import { HOTKEY_ACTIONS, HOTKEY_LABELS, formatCombo } from "@/games/ml/hotkeys";
import { defaultMLSettings, parseMLSettings, type MLSettings } from "@/games/ml/settings";
import { rankLabel } from "@/games/ml/rank";
import { LIMITS, ML_GAME_ID, type MLState } from "@/games/ml/state";
import { HasilButtons } from "@/components/panel/ml/kontrol-hasil";
import { RankControl, RankPrompt } from "@/components/panel/ml/kontrol-rank";
import { TeksControl } from "@/components/panel/ml/kontrol-teks";
import { useMatchTime } from "@/components/panel/ml/use-match-time";
import { useLastResultText } from "@/components/panel/ml/use-result-status";
import { sendEvent } from "@/lib/send-event";
import { useGameSettings, useGameState, useWorkerStatus } from "@/lib/use-game-state";

const STORAGE_KEY = "layerup.popup.ml";
const WIDTH = 288;
const MARGIN = 8;
const HEADER_MIN = 48;
const ERROR_MS = 4000;
const ARM_MS = 3000;

interface Position {
  x: number;
  y: number;
}

function defaultPosition(): Position {
  return { x: window.innerWidth - WIDTH - 24, y: 80 };
}

function subscribeNever(): () => void {
  return () => {};
}

function loadPosition(): Position | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value === "object" && value !== null) {
      const { x, y } = value as { x?: unknown; y?: unknown };
      if (typeof x === "number" && typeof y === "number") return { x, y };
    }
  } catch {
    return null;
  }
  return null;
}

function savePosition(position: Position): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  } catch {
    return;
  }
}

function clamp(position: Position): Position {
  const maxX = Math.max(MARGIN, window.innerWidth - WIDTH - MARGIN);
  const maxY = Math.max(MARGIN, window.innerHeight - HEADER_MIN);
  return {
    x: Math.min(maxX, Math.max(MARGIN, position.x)),
    y: Math.min(maxY, Math.max(MARGIN, position.y)),
  };
}

function statusLine(state: MLState | null): string {
  if (!state) return "Menunggu data dari server...";
  const { session } = state;
  return `${session.wins}W ${session.losses}L · streak ${session.streak} · ${rankLabel(state.rank)}`;
}

export function KontrolPopup({ onClose }: { onClose: () => void }) {
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  if (!mounted) return null;
  return <PopupBody onClose={onClose} />;
}

function PopupBody({ onClose }: { onClose: () => void }) {
  const state = useGameState<MLState>(ML_GAME_ID);
  const rawSettings = useGameSettings<MLSettings>(ML_GAME_ID);
  const hotkeys = (parseMLSettings(rawSettings) ?? defaultMLSettings()).hotkeys;
  const worker = useWorkerStatus(ML_GAME_ID);
  const matchTime = useMatchTime(state);
  const lastResult = useLastResultText(state);
  const needsStart = state !== null && state.phase === "playing" && state.matchStartedAt === 0;
  const [raw, setRaw] = useState<Position>(() => loadPosition() ?? defaultPosition());
  const [error, setError] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const dragRef = useRef<Position | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const position = clamp(raw);

  useEffect(() => {
    window.addEventListener("resize", rerender);
    return () => {
      window.removeEventListener("resize", rerender);
      if (errorTimer.current) clearTimeout(errorTimer.current);
      if (armTimer.current) clearTimeout(armTimer.current);
    };
  }, []);

  function flash(message: string): void {
    setError(message);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), ERROR_MS);
  }

  async function run(type: string, payload?: Record<string, unknown>): Promise<void> {
    const result = await sendEvent(ML_GAME_ID, type, payload);
    if (!result.ok) flash(result.error);
  }

  function resetSession(): void {
    if (armTimer.current) clearTimeout(armTimer.current);
    if (!armed) {
      setArmed(true);
      armTimer.current = setTimeout(() => setArmed(false), ARM_MS);
      return;
    }
    setArmed(false);
    void run("session_reset");
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>): void {
    if ((event.target as HTMLElement).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX - position.x, y: event.clientY - position.y };
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>): void {
    const offset = dragRef.current;
    if (!offset) return;
    setRaw(clamp({ x: event.clientX - offset.x, y: event.clientY - offset.y }));
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!dragRef.current) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    savePosition(position);
  }

  return (
    <div
      role="dialog"
      aria-label="Kontrol cepat Mobile Legends"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      className="panel-root fixed z-50 rounded-lg border border-panel-line bg-panel-side font-sans text-panel-text shadow-2xl shadow-black/50"
      style={{ left: position.x, top: position.y, width: WIDTH }}
    >
      <div
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="flex cursor-grab touch-none select-none items-center justify-between border-b border-panel-line px-3 py-2.5 active:cursor-grabbing"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-panel-muted" fill="currentColor" aria-hidden>
            <circle cx="9" cy="6" r="1.6" />
            <circle cx="15" cy="6" r="1.6" />
            <circle cx="9" cy="12" r="1.6" />
            <circle cx="15" cy="12" r="1.6" />
            <circle cx="9" cy="18" r="1.6" />
            <circle cx="15" cy="18" r="1.6" />
          </svg>
          Kontrol cepat
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup popup"
          className="flex h-6 w-6 items-center justify-center rounded text-panel-muted transition-colors hover:bg-panel-hover hover:text-panel-text"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <div className="space-y-3 p-3">
        <p className="rounded-md bg-panel px-3 py-2 font-mono text-xs text-panel-muted" aria-live="polite">
          {statusLine(state)}
          {matchTime ? ` · ${matchTime}` : ""}
          {lastResult && <span className="mt-0.5 block text-[11px]">Terakhir: {lastResult}</span>}
        </p>

        <HasilButtons state={state} run={run} />

        <RankPrompt state={state} run={run} compact />

        <div className="grid">
          <Button onClick={() => void run("undo")}>Undo</Button>
        </div>

        {state && <RankControl state={state} run={run} storageKey="popup" />}

        <TeksControl run={run} storageKey="popup" />

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const name = String(new FormData(event.currentTarget).get("hero") ?? "");
            void run("hero", { name });
          }}
        >
          <input
            key={state?.hero ?? ""}
            name="hero"
            defaultValue={state?.hero ?? ""}
            maxLength={LIMITS.heroName}
            placeholder="Nama hero"
            aria-label="Nama hero"
            autoComplete="off"
            className="h-9 min-w-0 flex-1 rounded-md border border-panel-line bg-panel px-3 text-sm text-panel-text placeholder:text-panel-muted focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-panel-accent"
          />
          <Button type="submit">Simpan</Button>
        </form>

        <div className="grid grid-cols-2 gap-2">
          <Button
            tone={needsStart ? "hint" : "neutral"}
            title="Tekan saat game dimulai supaya timer match jalan"
            onClick={() => void run("match_new")}
          >
            Match baru
          </Button>
          <Button tone={armed ? "armed" : "neutral"} onClick={resetSession}>
            {armed ? "Yakin? Klik lagi" : "Reset sesi"}
          </Button>
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-panel-bad/15 px-3 py-2 text-xs text-panel-bad">
            {error}
          </p>
        )}

        <details className="group rounded-md border border-panel-line">
          <summary className="cursor-pointer select-none px-3 py-2 text-xs text-panel-muted hover:text-panel-text">
            {worker?.online ? "Hotkey (worker aktif)" : "Hotkey (worker tidak aktif)"}
          </summary>
          <ul className="space-y-1 border-t border-panel-line px-3 py-2 text-xs">
            {HOTKEY_ACTIONS.map((action) => (
              <li key={action} className="flex items-center justify-between">
                <span className="text-panel-text">{HOTKEY_LABELS[action]}</span>
                <kbd className="rounded border border-panel-line px-1.5 py-0.5 font-mono text-[11px] text-panel-muted">
                  {formatCombo(hotkeys[action])}
                </kbd>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}
