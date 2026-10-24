"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, ErrorNote, Stat, inputClass } from "@/components/panel/ui";
import { LIMITS, ML_GAME_ID, TIMING, type MLState } from "@/games/ml/state";
import { HasilButtons } from "@/components/panel/ml/kontrol-hasil";
import { RankControl, RankPrompt } from "@/components/panel/ml/kontrol-rank";
import { TeksControl } from "@/components/panel/ml/kontrol-teks";
import { useLastResultText } from "@/components/panel/ml/use-result-status";
import { sendEvent } from "@/lib/send-event";
import { useGameState } from "@/lib/use-game-state";

const ERROR_MS = 4000;
const ARM_MS = 3000;

const ADJUST_FIELDS = [
  { field: "wins", label: "Menang" },
  { field: "losses", label: "Kalah" },
] as const;

type Run = (type: string, payload?: Record<string, unknown>) => Promise<boolean>;

interface BodyProps {
  state: MLState;
  run: Run;
}

// SECTION: SESI
function SesiBody({ state, run }: BodyProps) {
  const { wins, losses, streak, best } = state.session;
  const total = wins + losses;
  const rate = total > 0 ? `${Math.round((wins / total) * 100)}%` : "-";
  const [armed, setArmed] = useState(false);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResult = useLastResultText(state);
  const needsStart = state.phase === "playing" && state.matchStartedAt === 0;

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
        description={`Hasil kedua dalam ${TIMING.resultGuardMs / 1000} detik diabaikan supaya tidak terhitung dobel. Timer dan nama hero di scoreboard hilang otomatis ${TIMING.resetDelayMs / 1000} detik setelah hasil. Tekan Match baru saat game dimulai supaya timer match jalan.`}
      >
        <p className="mb-3 text-xs text-panel-muted" aria-live="polite">
          {lastResult ? `Hasil terakhir: ${lastResult}` : "Belum ada hasil di sesi ini."}
        </p>
        <HasilButtons state={state} run={run} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button onClick={() => void run("undo")}>Undo</Button>
          <Button tone={needsStart ? "hint" : "neutral"} onClick={() => void run("match_new")}>
            Match baru
          </Button>
        </div>
        {needsStart && <p className="mt-2 text-xs text-panel-muted">Tekan Match baru saat game mulai supaya timer jalan.</p>}
      </Card>

      <Card title="Kontrol cepat" description="Rank, teks banner, dan nama hero. Kartu bisa di-minimize kalau tidak dipakai.">
        <div className="space-y-2">
          <RankControl state={state} run={run} storageKey="tab" />
          <TeksControl run={run} storageKey="tab" />
        </div>
        <form
          className="mt-3 flex gap-2"
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
            placeholder="Nama hero, contoh: Gusion"
            aria-label="Nama hero"
            autoComplete="off"
            className={`${inputClass} flex-1`}
          />
          <Button type="submit">Simpan hero</Button>
        </form>
        <p className="mt-1.5 text-[11px] text-panel-muted">Nama hero tampil di scoreboard selama timer match berjalan.</p>
      </Card>

      <Card
        title="Koreksi hasil"
        description="Untuk salah tekan yang sudah lewat batas Undo, atau match yang dimainkan tanpa live. Hanya mengubah angka menang dan kalah; streak dan riwayat W/L tidak ikut berubah."
      >
        <ul className="divide-y divide-panel-line">
          {ADJUST_FIELDS.map(({ field, label }) => {
            const value = state.session[field];
            return (
              <li key={field} className="flex items-center justify-between py-2">
                <span className="text-sm">{label}</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" aria-label={`Kurangi ${label}`} disabled={value === 0} onClick={() => void run("session_adjust", { field, delta: -1 })}>
                    -
                  </Button>
                  <span className="w-10 text-center font-mono text-xl tabular-nums" aria-live="polite">
                    {value}
                  </span>
                  <Button size="sm" aria-label={`Tambah ${label}`} onClick={() => void run("session_adjust", { field, delta: 1 })}>
                    +
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card
        title="Reset sesi"
        description="Menyimpan sesi ini ke Riwayat sesi, lalu mengosongkan menang, kalah, streak, dan hitungan banner. Nama hero tetap."
      >
        <Button tone={armed ? "armed" : "neutral"} onClick={resetSession}>
          {armed ? "Yakin? Klik lagi" : "Reset sesi"}
        </Button>
      </Card>
    </div>
  );
}

// END SESI

// PAGE
export function KontrolSesi() {
  const state = useGameState<MLState>(ML_GAME_ID);
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

  if (!state) {
    return (
      <p className="rounded-lg border border-panel-line bg-panel-raised px-4 py-6 text-center text-sm text-panel-muted">
        Menunggu data dari server...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && <ErrorNote>{error}</ErrorNote>}
      <RankPrompt state={state} run={run} />
      <SesiBody state={state} run={run} />
    </div>
  );
}
