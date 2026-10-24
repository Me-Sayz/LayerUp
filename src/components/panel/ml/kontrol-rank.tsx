"use client";

import { useState } from "react";
import { Button } from "@/components/panel/ui";
import { GRADING_SLOTS, MYTHIC_ENTRY_STARS, posLabel } from "@/games/ml/rank";
import type { MLState } from "@/games/ml/state";

type Run = (type: string, payload?: Record<string, unknown>) => Promise<unknown>;

const STORAGE_PREFIX = "layerup.rank.min.";

function loadMinimized(key: string): boolean {
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key) === "1";
  } catch {
    return false;
  }
}

function saveMinimized(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, value ? "1" : "0");
  } catch {
    return;
  }
}

// SECTION: PROMPT GRADING
export function RankPrompt({ state, run, compact = false }: { state: MLState | null; run: Run; compact?: boolean }) {
  if (!state || !state.rank.pending) return null;
  return (
    <div role="alertdialog" aria-label="Pilihan grading Mythic" className="rounded-lg border border-panel-accent bg-panel-accent/10 p-3">
      <p className="text-sm font-medium text-panel-accent">Legend I bintang penuh dan menang</p>
      <p className="mt-1 text-xs text-panel-muted">
        Naik ke Mythic lewat grading {GRADING_SLOTS} match, atau langsung Mythic dengan {MYTHIC_ENTRY_STARS} bintang? Hasil match berikutnya
        menunggu pilihan ini.
      </p>
      <div className={`mt-3 grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-2"}`}>
        <Button tone="accent" onClick={() => void run("rank_grade", { mode: "grading" })}>
          Grading
        </Button>
        <Button onClick={() => void run("rank_grade", { mode: "skip" })}>Tanpa grading</Button>
      </div>
    </div>
  );
}
// END PROMPT GRADING

// SECTION: KONTROL RANK
export function RankControl({ state, run, storageKey }: { state: MLState; run: Run; storageKey: string }) {
  const [minimized, setMinimized] = useState(() => loadMinimized(storageKey));
  const { rank } = state;
  const grading = rank.grading !== null;
  const locked = grading || rank.pending;
  const label = grading ? `Grading ${rank.grading?.length ?? 0}/${GRADING_SLOTS}` : posLabel(rank.pos);

  function toggle(): void {
    const next = !minimized;
    setMinimized(next);
    saveMinimized(storageKey, next);
  }

  return (
    <div className="rounded-md border border-panel-line bg-panel">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="min-w-0">
          <p className="text-[11px] text-panel-muted">Rank{rank.auto ? "" : " (otomatis mati)"}</p>
          <p className="truncate font-mono text-sm tabular-nums" aria-live="polite">
            {label}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!minimized}
          aria-label={minimized ? "Tampilkan kontrol rank" : "Sembunyikan kontrol rank"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-panel-muted transition-colors hover:bg-panel-hover hover:text-panel-text focus-visible:outline-2 focus-visible:outline-panel-accent"
        >
          <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-transform ${minimized ? "" : "rotate-180"}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
      {!minimized && (
        <div className="border-t border-panel-line px-3 py-2">
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" aria-label="Kurangi bintang" disabled={locked} onClick={() => void run("rank_stars", { delta: -1 })}>
              − Bintang
            </Button>
            <Button size="sm" aria-label="Tambah bintang" disabled={locked} onClick={() => void run("rank_stars", { delta: 1 })}>
              + Bintang
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-panel-muted">
            {grading
              ? "Selama grading, bintang diisi otomatis dari hasil match. Salah tekan? Pakai Undo."
              : rank.pending
                ? "Pilih grading di atas dulu."
                : "Untuk koreksi manual. Ganti tier atau divisi ada di Pengaturan, tab Overlay."}
          </p>
        </div>
      )}
    </div>
  );
}
// END KONTROL RANK
