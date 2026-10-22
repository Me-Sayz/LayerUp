"use client";

import { Button } from "@/components/panel/ui";
import { useResultCooldown } from "@/components/panel/ml/use-result-status";
import type { MLState } from "@/games/ml/state";

type Run = (type: string) => Promise<unknown>;

// SECTION: TOMBOL HASIL
function ResultButton({
  label,
  type,
  tone,
  seconds,
  run,
}: {
  label: string;
  type: "victory" | "defeat";
  tone: "ok" | "bad";
  seconds: number;
  run: Run;
}) {
  const waiting = seconds > 0;
  return (
    <Button
      size="lg"
      tone={waiting ? "neutral" : tone}
      disabled={waiting}
      aria-label={waiting ? `${label}, tersedia lagi ${seconds} detik` : label}
      onClick={() => void run(type)}
    >
      {label}
      {waiting && <span className="ml-2 font-mono tabular-nums">{seconds}</span>}
    </Button>
  );
}

export function HasilButtons({ state, run }: { state: MLState | null; run: Run }) {
  const seconds = useResultCooldown(state);
  return (
    <div className="grid grid-cols-2 gap-2">
      <ResultButton label="Victory" type="victory" tone="ok" seconds={seconds} run={run} />
      <ResultButton label="Defeat" type="defeat" tone="bad" seconds={seconds} run={run} />
    </div>
  );
}
// END TOMBOL HASIL
