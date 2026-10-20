"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, ErrorNote } from "@/components/panel/ui";
import { Scoreboard } from "@/games/ml/hud/scoreboard";
import {
  SCOREBOARD_LABELS,
  SCOREBOARD_PRESETS,
  parseMLSettings,
  sameScoreboard,
  type MLSettings,
  type ScoreboardKey,
  type ScoreboardSettings,
} from "@/games/ml/settings";
import { ML_GAME_ID, initialMLState, type MLState } from "@/games/ml/state";
import { sendSettings } from "@/lib/send-settings";
import { useGameSettings } from "@/lib/use-game-state";

const SAVED_MS = 2000;
const PREVIEW_WIDTH = 440;
const PREVIEW_HEIGHT = 450;

const GROUPS: { title: string; keys: ScoreboardKey[] }[] = [
  { title: "Judul", keys: ["title", "hero"] },
  { title: "Hasil sesi", keys: ["win", "lose", "streak", "winrate"] },
  { title: "Match berjalan", keys: ["kill", "death", "assist", "ratio"] },
  { title: "Lainnya", keys: ["records"] },
];

const SAMPLE: MLState = {
  ...initialMLState(),
  hero: "Gusion",
  match: { k: 7, d: 2, a: 11 },
  session: { wins: 5, losses: 2, streak: 3, best: 4 },
  records: { firstblood: 1, doublekill: 2, triplekill: 1, maniac: 0, savage: 0, legendary: 0, mvp: 1 },
};

// SECTION: SCOREBOARD
function ScoreboardSettingsCard({ saved }: { saved: ScoreboardSettings }) {
  const [draft, setDraft] = useState<ScoreboardSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    [],
  );

  const current = draft ?? saved;
  const dirty = draft !== null && !sameScoreboard(draft, saved);
  const allHidden = Object.values(current).every((value) => !value);

  function choose(next: ScoreboardSettings): void {
    setDraft(next);
    setJustSaved(false);
    setError(null);
  }

  async function save(): Promise<void> {
    if (!draft || saving) return;
    setSaving(true);
    setError(null);
    const result = await sendSettings(ML_GAME_ID, { scoreboard: draft });
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
        ? "Tersimpan. Overlay sudah berubah."
        : "Sama dengan overlay yang tampil";

  return (
    <Card title="Overlay scoreboard" description="Pilih elemen yang tampil. Berlaku ke overlay setelah kamu klik Simpan.">
      <div className="flex flex-wrap gap-6">
        <div className="min-w-64 flex-1 space-y-5">
          <div>
            <p className="mb-2 text-xs text-panel-muted">Preset</p>
            <div className="flex flex-wrap gap-2">
              {SCOREBOARD_PRESETS.map((preset) => {
                const active = sameScoreboard(current, preset.values);
                return (
                  <Button
                    key={preset.id}
                    size="sm"
                    tone={active ? "accent" : "neutral"}
                    aria-pressed={active}
                    onClick={() => choose({ ...preset.values })}
                  >
                    {preset.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {GROUPS.map((group) => (
            <fieldset key={group.title}>
              <legend className="mb-2 text-xs text-panel-muted">{group.title}</legend>
              <div className="space-y-1.5">
                {group.keys.map((key) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={current[key]}
                      onChange={(event) => choose({ ...current, [key]: event.target.checked })}
                      className="h-4 w-4 accent-panel-accent"
                    />
                    {SCOREBOARD_LABELS[key]}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="shrink-0">
          <p className="mb-2 text-xs text-panel-muted">Pratinjau (angka contoh)</p>
          <div className="max-w-full overflow-x-auto rounded-md border border-panel-line bg-panel">
            <div
              aria-label="Pratinjau scoreboard"
              style={{ containerType: "size", width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
            >
              <Scoreboard state={SAMPLE} settings={current} />
            </div>
          </div>
        </div>
      </div>

      {allHidden && (
        <p className="mt-4 rounded-md bg-panel px-3 py-2 text-xs text-panel-muted">
          Semua elemen disembunyikan, jadi overlay scoreboard akan kosong.
        </p>
      )}

      {error && (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-panel-line pt-4">
        <Button tone="accent" disabled={!dirty || saving} onClick={() => void save()}>
          Simpan
        </Button>
        {dirty && (
          <Button disabled={saving} onClick={() => setDraft(null)}>
            Batalkan perubahan
          </Button>
        )}
        <span className={`text-xs ${dirty ? "text-panel-accent" : "text-panel-muted"}`} role="status">
          {status}
        </span>
      </div>

      <p className="mt-4 text-xs text-panel-muted">
        Di LIVE Studio, lebar kartu selalu sama dengan lebar kotak sumber, dan tingginya mengikuti isi. Tarik tepi bawah kotak ke atas
        sampai tidak ada ruang kosong. Sisakan sedikit tinggi kalau chip rekor aktif, karena kartu bertambah tinggi saat chip muncul.
      </p>
    </Card>
  );
}

// PAGE
export function PengaturanForm() {
  const stored = useGameSettings<MLSettings>(ML_GAME_ID);
  const settings = parseMLSettings(stored);

  if (!settings) {
    return (
      <p className="rounded-lg border border-panel-line bg-panel-raised px-4 py-6 text-center text-sm text-panel-muted">
        Menunggu data dari server...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ScoreboardSettingsCard saved={settings.scoreboard} />
    </div>
  );
}
