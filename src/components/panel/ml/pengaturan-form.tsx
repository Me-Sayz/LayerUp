"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { HotkeyCard } from "@/components/panel/ml/pengaturan-hotkey";
import { RankDisplayCard, RankPositionCard } from "@/components/panel/ml/pengaturan-rank";
import { Button, Card, ErrorNote, inputClass } from "@/components/panel/ui";
import { Scoreboard } from "@/games/ml/hud/scoreboard";
import {
  SCOREBOARD_LABELS,
  SCOREBOARD_PRESETS,
  SESSION_LIMITS,
  parseMLSettings,
  sameScoreboard,
  sameSession,
  type MLSettings,
  type ScoreboardKey,
  type ScoreboardSettings,
  type SessionSettings,
} from "@/games/ml/settings";
import { ML_GAME_ID, initialMLState, type MLState } from "@/games/ml/state";
import { sendSettings } from "@/lib/send-settings";
import { useGameSettings, useGameState } from "@/lib/use-game-state";

const SAVED_MS = 2000;
const PREVIEW_WIDTH = 440;
const PREVIEW_HEIGHT = 560;

const GROUPS: { title: string; keys: ScoreboardKey[] }[] = [
  { title: "Judul", keys: ["title", "hero"] },
  { title: "Hasil sesi", keys: ["win", "lose", "streak", "winrate"] },
  { title: "Riwayat, target, dan timer", keys: ["history", "goalWin", "goalStreak", "goalLose", "timer"] },
];

const GOAL_KEYS = { goalWin: "win", goalStreak: "streak", goalLose: "lose" } as const;
type GoalField = (typeof GOAL_KEYS)[keyof typeof GOAL_KEYS];

const SAMPLE: MLState = {
  ...initialMLState(),
  hero: "Gusion",
  session: { wins: 5, losses: 2, streak: 3, best: 4 },
  results: ["W", "W", "L", "W", "W", "L", "W", "W"],
  lastDurationMs: 754_000,
};

interface Draft {
  flags: ScoreboardSettings;
  goals: Record<GoalField, string>;
  historyCount: number;
}

function toDraft(flags: ScoreboardSettings, session: SessionSettings): Draft {
  return {
    flags,
    goals: { win: String(session.goals.win), streak: String(session.goals.streak), lose: String(session.goals.lose) },
    historyCount: session.historyCount,
  };
}

function toSession(draft: Draft): SessionSettings | null {
  const goals = {} as SessionSettings["goals"];
  for (const field of ["win", "streak", "lose"] as const) {
    const text = draft.goals[field].trim();
    const value = Number(text);
    if (text === "" || !Number.isInteger(value)) return null;
    if (value < SESSION_LIMITS.goalMin || value > SESSION_LIMITS.goalMax) return null;
    goals[field] = value;
  }
  return { goals, historyCount: draft.historyCount };
}

// SECTION: SCOREBOARD
function ScoreboardSettingsCard({ saved, savedSession }: { saved: ScoreboardSettings; savedSession: SessionSettings }) {
  const [draft, setDraft] = useState<Draft | null>(null);
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

  const current = draft ?? toDraft(saved, savedSession);
  const parsedSession = toSession(current);
  const dirty =
    draft !== null && (!sameScoreboard(draft.flags, saved) || parsedSession === null || !sameSession(parsedSession, savedSession));
  const allHidden = Object.values(current.flags).every((value) => !value);

  function change(next: Draft): void {
    setDraft(next);
    setJustSaved(false);
    setError(null);
  }

  async function save(): Promise<void> {
    if (!draft || !parsedSession || saving) return;
    setSaving(true);
    setError(null);
    const result = await sendSettings(ML_GAME_ID, { scoreboard: draft.flags, session: parsedSession });
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
                const active = sameScoreboard(current.flags, preset.values);
                return (
                  <Button
                    key={preset.id}
                    size="sm"
                    tone={active ? "accent" : "neutral"}
                    aria-pressed={active}
                    onClick={() => change({ ...current, flags: { ...preset.values } })}
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
                {group.keys.map((key) => {
                  const goalField = key in GOAL_KEYS ? GOAL_KEYS[key as keyof typeof GOAL_KEYS] : null;
                  const goalInvalid =
                    goalField !== null &&
                    (() => {
                      const value = Number(current.goals[goalField]);
                      return (
                        current.goals[goalField].trim() === "" ||
                        !Number.isInteger(value) ||
                        value < SESSION_LIMITS.goalMin ||
                        value > SESSION_LIMITS.goalMax
                      );
                    })();
                  return (
                    <div key={key} className="flex flex-wrap items-center gap-2.5">
                      <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                        <input
                          type="checkbox"
                          checked={current.flags[key]}
                          onChange={(event) => change({ ...current, flags: { ...current.flags, [key]: event.target.checked } })}
                          className="h-4 w-4 accent-panel-accent"
                        />
                        {SCOREBOARD_LABELS[key]}
                      </label>
                      {goalField !== null && (
                        <>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={SESSION_LIMITS.goalMin}
                            max={SESSION_LIMITS.goalMax}
                            value={current.goals[goalField]}
                            onChange={(event) =>
                              change({ ...current, goals: { ...current.goals, [goalField]: event.target.value } })
                            }
                            aria-label={`Angka ${SCOREBOARD_LABELS[key]}`}
                            aria-invalid={goalInvalid}
                            className={`${inputClass} w-20`}
                          />
                          {goalInvalid && (
                            <span className="text-xs text-panel-bad">
                              {SESSION_LIMITS.goalMin}-{SESSION_LIMITS.goalMax}
                            </span>
                          )}
                        </>
                      )}
                      {key === "history" && (
                        <select
                          value={current.historyCount}
                          onChange={(event) => change({ ...current, historyCount: Number(event.target.value) })}
                          aria-label="Jumlah match di riwayat"
                          className={`${inputClass} w-24`}
                        >
                          {Array.from(
                            { length: SESSION_LIMITS.historyMax - SESSION_LIMITS.historyMin + 1 },
                            (_, index) => SESSION_LIMITS.historyMin + index,
                          ).map((count) => (
                            <option key={count} value={count}>
                              {count} match
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
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
              <Scoreboard state={SAMPLE} settings={current.flags} session={parsedSession ?? savedSession} />
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
        <Button tone="accent" disabled={!dirty || !parsedSession || saving} onClick={() => void save()}>
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
        sampai tidak ada ruang kosong. Sisakan sedikit tinggi kalau riwayat, target, atau timer aktif, karena kartu bertambah tinggi saat isinya muncul.
      </p>
    </Card>
  );
}

// PAGE
const SECTIONS = [
  { id: "umum", label: "Umum" },
  { id: "overlay", label: "Overlay" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

export function PengaturanForm() {
  const stored = useGameSettings<MLSettings>(ML_GAME_ID);
  const state = useGameState<MLState>(ML_GAME_ID);
  const [section, setSection] = useState<SectionId>("overlay");
  const settings = parseMLSettings(stored);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const index = SECTIONS.findIndex((item) => item.id === section);
    const next = SECTIONS[(index + step + SECTIONS.length) % SECTIONS.length];
    setSection(next.id);
    event.currentTarget.querySelector<HTMLElement>(`#pengaturan-tab-${next.id}`)?.focus();
  }

  if (!settings) {
    return (
      <p className="rounded-lg border border-panel-line bg-panel-raised px-4 py-6 text-center text-sm text-panel-muted">
        Menunggu data dari server...
      </p>
    );
  }

  return (
    <div>
      <div role="tablist" aria-label="Pengaturan" onKeyDown={onKeyDown} className="mb-5 flex gap-1 border-b border-panel-line">
        {SECTIONS.map((item) => {
          const active = item.id === section;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`pengaturan-tab-${item.id}`}
              aria-selected={active}
              aria-controls={`pengaturan-panel-${item.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setSection(item.id)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-panel-accent ${
                active ? "border-panel-accent text-panel-text" : "border-transparent text-panel-muted hover:text-panel-text"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`pengaturan-panel-${section}`} aria-labelledby={`pengaturan-tab-${section}`} className="space-y-4">
        {section === "umum" && <HotkeyCard saved={settings.hotkeys} />}
        {section === "overlay" && (
          <>
            <ScoreboardSettingsCard saved={settings.scoreboard} savedSession={settings.session} />
            <RankDisplayCard saved={settings.rank} />
            {state && <RankPositionCard state={state} />}
          </>
        )}
      </div>
    </div>
  );
}
