"use client";

import { useSyncExternalStore } from "react";
import { formatDuration } from "@/games/ml/format";
import type { MLState } from "@/games/ml/state";

function subscribeClock(onChange: () => void): () => void {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}

const clockSecond = () => Math.floor(Date.now() / 1000);

export function useMatchTime(state: MLState | null): string | null {
  const nowSecond = useSyncExternalStore(subscribeClock, clockSecond, () => 0);
  if (!state) return null;
  if (state.matchStartedAt > 0) return formatDuration(Math.max(0, nowSecond * 1000 - state.matchStartedAt));
  if (state.lastDurationMs > 0) return formatDuration(state.lastDurationMs);
  return null;
}
