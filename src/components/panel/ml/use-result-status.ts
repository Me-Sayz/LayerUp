"use client";

import { useSyncExternalStore } from "react";
import { TIMING, type MLState } from "@/games/ml/state";

const TICK_MS = 250;
const MINUTE_MS = 60_000;

function subscribeClock(onChange: () => void): () => void {
  const id = setInterval(onChange, TICK_MS);
  return () => clearInterval(id);
}

export function cooldownSeconds(state: MLState | null, now: number): number {
  if (!state || state.lastResultAt <= 0) return 0;
  const elapsed = now - state.lastResultAt;
  if (elapsed < 0 || elapsed >= TIMING.resultGuardMs) return 0;
  return Math.ceil((TIMING.resultGuardMs - elapsed) / 1000);
}

export function useResultCooldown(state: MLState | null): number {
  return useSyncExternalStore(
    subscribeClock,
    () => cooldownSeconds(state, Date.now()),
    () => 0,
  );
}

function relativeText(minutes: number): string {
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  return `${Math.floor(minutes / 60)} jam lalu`;
}

export function useLastResultText(state: MLState | null): string | null {
  const at = state?.lastResultAt ?? 0;
  const minutes = useSyncExternalStore(
    subscribeClock,
    () => (at > 0 ? Math.max(0, Math.floor((Date.now() - at) / MINUTE_MS)) : -1),
    () => -1,
  );
  const mark = state?.results.at(-1);
  if (minutes < 0 || !mark) return null;
  return `${mark === "W" ? "Victory" : "Defeat"} · ${relativeText(minutes)}`;
}
