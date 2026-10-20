import type { GameSettingsDefinition } from "@/lib/types";

export const SCOREBOARD_KEYS = [
  "title",
  "hero",
  "win",
  "lose",
  "streak",
  "kill",
  "death",
  "assist",
  "ratio",
  "winrate",
  "records",
] as const;
export type ScoreboardKey = (typeof SCOREBOARD_KEYS)[number];
export type ScoreboardSettings = Record<ScoreboardKey, boolean>;

export interface MLSettings {
  scoreboard: ScoreboardSettings;
}

export const SCOREBOARD_LABELS: Record<ScoreboardKey, string> = {
  title: "Judul Mobile Legends",
  hero: "Nama hero",
  win: "Menang (WIN)",
  lose: "Kalah (LOSE)",
  streak: "Streak",
  kill: "Kill (K)",
  death: "Death (D)",
  assist: "Assist (A)",
  ratio: "Rasio KDA",
  winrate: "Bar win rate (WR)",
  records: "Chip rekor (First Blood, dll)",
};

function only(on: readonly ScoreboardKey[]): ScoreboardSettings {
  const has = (key: ScoreboardKey) => on.includes(key);
  return {
    title: has("title"),
    hero: has("hero"),
    win: has("win"),
    lose: has("lose"),
    streak: has("streak"),
    kill: has("kill"),
    death: has("death"),
    assist: has("assist"),
    ratio: has("ratio"),
    winrate: has("winrate"),
    records: has("records"),
  };
}

// PRESET: tambahkan preset baru di array ini
export const SCOREBOARD_PRESETS: readonly { id: string; label: string; values: ScoreboardSettings }[] = [
  { id: "lengkap", label: "Lengkap", values: only(SCOREBOARD_KEYS) },
  { id: "winlose", label: "Win/Lose saja", values: only(["win", "lose"]) },
  { id: "kda", label: "KDA saja", values: only(["kill", "death", "assist", "ratio"]) },
];
// END PRESET

export function defaultMLSettings(): MLSettings {
  return { scoreboard: only(SCOREBOARD_KEYS) };
}

export function sameScoreboard(a: ScoreboardSettings, b: ScoreboardSettings): boolean {
  return SCOREBOARD_KEYS.every((key) => a[key] === b[key]);
}

function parseScoreboard(value: unknown): ScoreboardSettings | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const result = only(SCOREBOARD_KEYS);
  for (const key of SCOREBOARD_KEYS) {
    const item = input[key];
    if (item === undefined) continue;
    if (typeof item !== "boolean") return null;
    result[key] = item;
  }
  return result;
}

export function parseMLSettings(value: unknown): MLSettings | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const scoreboard = parseScoreboard((value as { scoreboard?: unknown }).scoreboard);
  return scoreboard ? { scoreboard } : null;
}

export const mlSettings: GameSettingsDefinition<MLSettings> = {
  initial: defaultMLSettings,
  parse: parseMLSettings,
};
