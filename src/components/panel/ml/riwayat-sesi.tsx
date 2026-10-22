"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, ErrorNote } from "@/components/panel/ui";
import { ML_GAME_ID, SESSION_ARCHIVE_MAX, type MLState, type ResultMark, type SessionRecord } from "@/games/ml/state";
import { sendEvent } from "@/lib/send-event";
import { useGameState } from "@/lib/use-game-state";

const ERROR_MS = 4000;
const ARM_MS = 3000;

const DATE_FORMAT = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const TIME_FORMAT = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" });

function winRate(wins: number, losses: number): string {
  const total = wins + losses;
  return total > 0 ? `${Math.round((wins / total) * 100)}%` : "-";
}

function whenText(startedAt: number, endedAt: number): string {
  const end = endedAt > 0 ? endedAt : startedAt;
  if (end <= 0) return "Waktu tidak tercatat";
  const date = DATE_FORMAT.format(end);
  const to = TIME_FORMAT.format(end);
  const from = startedAt > 0 ? TIME_FORMAT.format(startedAt) : to;
  return from === to ? `${date}, ${to}` : `${date}, ${from}-${to}`;
}

// SECTION: STRIP
function Strip({ results }: { results: ResultMark[] }) {
  if (results.length === 0) return null;
  return (
    <span className="flex gap-1" aria-label="Riwayat match">
      {results.map((mark, index) => (
        <span
          key={index}
          className={`inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-semibold ${
            mark === "W" ? "bg-panel-ok/15 text-panel-ok" : "bg-panel-bad/15 text-panel-bad"
          }`}
        >
          {mark}
        </span>
      ))}
    </span>
  );
}
// END STRIP

// SECTION: ITEM
function Summary({
  wins,
  losses,
  best,
  results,
  title,
  hint,
}: {
  wins: number;
  losses: number;
  best: number;
  results: ResultMark[];
  title: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0 flex-1 space-y-1.5">
      <p className="text-sm font-medium">{title}</p>
      <p className="font-mono text-sm tabular-nums">
        <span className="text-panel-ok">{wins}W</span> <span className="text-panel-bad">{losses}L</span>
        <span className="text-panel-muted">
          {" "}
          · WR {winRate(wins, losses)} · streak terbaik {best}
        </span>
      </p>
      <Strip results={results} />
      {hint && <p className="text-xs text-panel-muted">{hint}</p>}
    </div>
  );
}

function Item({
  record,
  armed,
  onResume,
  onDelete,
}: {
  record: SessionRecord;
  armed: boolean;
  onResume: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <Summary
        title={whenText(record.startedAt, record.endedAt)}
        wins={record.wins}
        losses={record.losses}
        best={record.best}
        results={record.results}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={onResume}>
          Lanjutkan
        </Button>
        <Button size="sm" tone={armed ? "armed" : "neutral"} onClick={onDelete}>
          {armed ? "Yakin? Klik lagi" : "Hapus"}
        </Button>
      </div>
    </li>
  );
}
// END ITEM

// PAGE
export function RiwayatSesi() {
  const state = useGameState<MLState>(ML_GAME_ID);
  const [error, setError] = useState<string | null>(null);
  const [armedId, setArmedId] = useState<string | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (errorTimer.current) clearTimeout(errorTimer.current);
      if (armTimer.current) clearTimeout(armTimer.current);
    },
    [],
  );

  if (!state) {
    return (
      <p className="rounded-lg border border-panel-line bg-panel-raised px-4 py-6 text-center text-sm text-panel-muted">
        Menunggu data dari server...
      </p>
    );
  }

  async function run(type: string, payload: Record<string, unknown>): Promise<void> {
    const result = await sendEvent(ML_GAME_ID, type, payload);
    if (result.ok) {
      setError(null);
      return;
    }
    setError(result.error);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), ERROR_MS);
  }

  function remove(id: string): void {
    if (armTimer.current) clearTimeout(armTimer.current);
    if (armedId !== id) {
      setArmedId(id);
      armTimer.current = setTimeout(() => setArmedId(null), ARM_MS);
      return;
    }
    setArmedId(null);
    void run("session_delete", { id });
  }

  const { wins, losses, best } = state.session;
  const hasCurrent = wins + losses > 0;

  return (
    <div className="space-y-4">
      <Card title="Sesi berjalan" description="Saat Reset sesi ditekan, sesi ini otomatis disimpan ke riwayat di bawah.">
        {hasCurrent ? (
          <Summary
            title={whenText(state.sessionStartedAt, state.lastResultAt)}
            wins={wins}
            losses={losses}
            best={best}
            results={state.results}
          />
        ) : (
          <p className="text-sm text-panel-muted">Belum ada hasil di sesi ini.</p>
        )}
      </Card>

      <Card
        title="Riwayat sesi"
        description={`Menyimpan ${SESSION_ARCHIVE_MAX} sesi terakhir. Lanjutkan memulihkan sesi lama sebagai sesi berjalan, dan sesi yang sedang berjalan disimpan dulu.`}
      >
        {state.sessions.length === 0 ? (
          <p className="text-sm text-panel-muted">
            Belum ada sesi tersimpan. Sesi masuk ke sini otomatis saat kamu menekan Reset sesi.
          </p>
        ) : (
          <ul className="divide-y divide-panel-line">
            {state.sessions.map((record) => (
              <Item
                key={record.id}
                record={record}
                armed={armedId === record.id}
                onResume={() => void run("session_resume", { id: record.id })}
                onDelete={() => remove(record.id)}
              />
            ))}
          </ul>
        )}
        {error && (
          <div className="mt-4">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}
      </Card>
    </div>
  );
}
