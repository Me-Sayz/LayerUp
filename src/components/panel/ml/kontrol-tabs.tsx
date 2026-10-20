"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Button, Card, ErrorNote, Stat, inputClass } from "@/components/panel/ui";
import {
  ANNOUNCE_IDS,
  KDA_EVENTS,
  KDA_FIELD,
  LABELS,
  LIMITS,
  ML_GAME_ID,
  TIMING,
  isRecordedId,
  type KdaEvent,
  type MLState,
} from "@/games/ml/state";
import { sendEvent } from "@/lib/send-event";
import { useGameState } from "@/lib/use-game-state";

const ERROR_MS = 4000;
const ARM_MS = 3000;

const TABS = [
  { id: "match", label: "Match" },
  { id: "announcer", label: "Announcer" },
  { id: "sesi", label: "Sesi" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const KDA_LABELS: Record<KdaEvent, string> = { kill: "Kill", death: "Death", assist: "Assist" };

type Run = (type: string, payload?: Record<string, unknown>) => Promise<boolean>;

interface TabProps {
  state: MLState;
  run: Run;
}

// TAB: MATCH
function MatchTab({ state, run }: TabProps) {
  return (
    <div className="space-y-4">
      <Card
        title="K / D / A"
        description="Tekan + setiap kali terjadi. Angkanya tampil di scoreboard."
        aside={
          <Button size="sm" onClick={() => void run("match_new")}>
            Match baru
          </Button>
        }
      >
        {state.phase === "ended" && (
          <p className="mb-3 rounded-md bg-panel px-3 py-2 text-xs text-panel-muted">
            Match sudah selesai. Angka ini direset otomatis, atau mulai match baru dengan menekan +.
          </p>
        )}
        <ul className="divide-y divide-panel-line">
          {KDA_EVENTS.map((type) => {
            const value = state.match[KDA_FIELD[type]];
            const label = KDA_LABELS[type];
            return (
              <li key={type} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm">{label}</span>
                <div className="flex items-center gap-3">
                  <Button
                    aria-label={`Kurangi ${label}`}
                    disabled={value <= 0}
                    onClick={() => void run(type, { delta: -1 })}
                  >
                    −
                  </Button>
                  <span className="w-10 text-center font-mono text-xl tabular-nums" aria-live="polite">
                    {value}
                  </span>
                  <Button
                    aria-label={`Tambah ${label}`}
                    disabled={value >= LIMITS.kdaMax}
                    onClick={() => void run(type, { delta: 1 })}
                  >
                    +
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="Hero" description="Nama hero yang sedang dimainkan. Tekan Enter untuk menyimpan.">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const name = String(new FormData(event.currentTarget).get("hero") ?? "");
            void run("hero", { name });
          }}
        >
          <input
            key={state.hero}
            name="hero"
            defaultValue={state.hero}
            maxLength={LIMITS.heroName}
            placeholder="Contoh: Gusion"
            aria-label="Nama hero"
            autoComplete="off"
            className={`${inputClass} flex-1`}
          />
          <Button type="submit">Simpan</Button>
        </form>
      </Card>
    </div>
  );
}

// TAB: ANNOUNCER
function AnnouncerTab({ state, run }: TabProps) {
  return (
    <div className="space-y-4">
      <Card title="Banner" description="Tekan untuk memunculkan banner di layar. Angka kecil = jumlah di sesi ini.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ANNOUNCE_IDS.map((id) => (
            <Button key={id} size="lg" onClick={() => void run(id)}>
              {LABELS[id]}
              {isRecordedId(id) && (
                <span className="ml-1.5 font-mono text-xs text-panel-muted">{state.records[id]}</span>
              )}
            </Button>
          ))}
        </div>
      </Card>

      <Card title="Teks bebas" description={`Banner dengan tulisan sendiri, maksimal ${LIMITS.customText} huruf.`}>
        <form
          className="flex gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const text = String(new FormData(form).get("text") ?? "").trim();
            if (!text) return;
            if (await run("custom", { text })) form.reset();
          }}
        >
          <input
            name="text"
            maxLength={LIMITS.customText}
            placeholder="Contoh: Terima kasih sudah nonton!"
            aria-label="Teks banner"
            autoComplete="off"
            className={`${inputClass} flex-1`}
          />
          <Button type="submit">Tampilkan</Button>
        </form>
      </Card>
    </div>
  );
}

// TAB: SESI
function SesiTab({ state, run }: TabProps) {
  const { wins, losses, streak, best } = state.session;
  const total = wins + losses;
  const rate = total > 0 ? `${Math.round((wins / total) * 100)}%` : "-";
  const [armed, setArmed] = useState(false);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (armTimer.current) clearTimeout(armTimer.current);
    },
    [],
  );

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

  return (
    <div className="space-y-4">
      <Card title="Hasil sesi" description="Dihitung sejak sesi terakhir direset.">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Stat label="Menang" value={wins} />
          <Stat label="Kalah" value={losses} />
          <Stat label="Streak" value={streak} />
          <Stat label="Streak terbaik" value={best} />
          <Stat label="Win rate" value={rate} hint={`${total} match`} />
        </dl>
      </Card>

      <Card
        title="Hasil match"
        description={`Hasil kedua dalam ${TIMING.resultGuardMs / 1000} detik diabaikan supaya tidak terhitung dobel. K/D/A direset otomatis ${TIMING.resetDelayMs / 1000} detik setelah hasil.`}
      >
        <div className="grid grid-cols-2 gap-2">
          <Button size="lg" tone="ok" onClick={() => void run("victory")}>
            Victory
          </Button>
          <Button size="lg" tone="bad" onClick={() => void run("defeat")}>
            Defeat
          </Button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button onClick={() => void run("undo")}>Undo</Button>
          <Button onClick={() => void run("match_new")}>Match baru</Button>
        </div>
      </Card>

      <Card title="Reset sesi" description="Menghapus menang, kalah, streak, dan hitungan banner. Nama hero tetap.">
        <Button tone={armed ? "armed" : "neutral"} onClick={resetSession}>
          {armed ? "Yakin? Klik lagi" : "Reset sesi"}
        </Button>
      </Card>
    </div>
  );
}

// TAB BAR
export function KontrolTabs() {
  const state = useGameState<MLState>(ML_GAME_ID);
  const [tab, setTab] = useState<TabId>("match");
  const [error, setError] = useState<string | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (errorTimer.current) clearTimeout(errorTimer.current);
    },
    [],
  );

  const run: Run = async (type, payload) => {
    const result = await sendEvent(ML_GAME_ID, type, payload);
    if (result.ok) {
      setError(null);
      return true;
    }
    setError(result.error);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), ERROR_MS);
    return false;
  };

  function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const index = TABS.findIndex((item) => item.id === tab);
    const next = TABS[(index + step + TABS.length) % TABS.length];
    setTab(next.id);
    event.currentTarget.querySelector<HTMLElement>(`#tab-${next.id}`)?.focus();
  }

  return (
    <div>
      <div role="tablist" aria-label="Kontrol Live" onKeyDown={onTabKeyDown} className="mb-5 flex gap-1 border-b border-panel-line">
        {TABS.map((item) => {
          const active = item.id === tab;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={active}
              aria-controls={`panel-${item.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(item.id)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-panel-accent ${
                active
                  ? "border-panel-accent text-panel-text"
                  : "border-transparent text-panel-muted hover:text-panel-text"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mb-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {!state ? (
          <p className="rounded-lg border border-panel-line bg-panel-raised px-4 py-6 text-center text-sm text-panel-muted">
            Menunggu data dari server...
          </p>
        ) : (
          <>
            {tab === "match" && <MatchTab state={state} run={run} />}
            {tab === "announcer" && <AnnouncerTab state={state} run={run} />}
            {tab === "sesi" && <SesiTab state={state} run={run} />}
          </>
        )}
      </div>
    </div>
  );
}