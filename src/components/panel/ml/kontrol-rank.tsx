"use client";

import { MiniPanel } from "@/components/panel/ml/mini-panel";
import { Button } from "@/components/panel/ui";
import { GRADING_SLOTS, MYTHIC_ENTRY_STARS, posLabel } from "@/games/ml/rank";
import type { MLState } from "@/games/ml/state";

type Run = (type: string, payload?: Record<string, unknown>) => Promise<unknown>;

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
  const { rank } = state;
  const grading = rank.grading !== null;
  const locked = grading || rank.pending;
  const label = grading ? `Grading ${rank.grading?.length ?? 0}/${GRADING_SLOTS}` : posLabel(rank.pos);

  return (
    <MiniPanel label={rank.auto ? "Rank" : "Rank (otomatis mati)"} summary={label} storageKey={`rank.${storageKey}`}>
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
    </MiniPanel>
  );
}
// END KONTROL RANK
