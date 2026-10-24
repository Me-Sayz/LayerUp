import type { GameSettingsDefinition } from "@/lib/types";
import { DEFAULT_HOTKEYS, parseHotkeys, type HotkeySettings } from "./hotkeys";

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
  "history",
  "timer",
  "goalWin",
  "goalStreak",
  "goalLose",
] as const;
export type ScoreboardKey = (typeof SCOREBOARD_KEYS)[number];
export type ScoreboardSettings = Record<ScoreboardKey, boolean>;

export const SESSION_LIMITS = { goalMin: 1, goalMax: 99, historyMin: 3, historyMax: 10 } as const;

export interface SessionSettings {
  goals: { win: number; streak: number; lose: number };
  historyCount: number;
}

export const RANK_KEYS = ["image", "name", "stars", "count"] as const;
export type RankKey = (typeof RANK_KEYS)[number];
export type RankSettings = Record<RankKey, boolean>;

export const RANK_LABELS: Record<RankKey, string> = {
  image: "Gambar rank",
  name: "Nama rank dan angka Romawi",
  stars: "Ikon bintang",
  count: "Jumlah bintang (3/5, atau total di Mythic)",
};

export interface MLSettings {
  scoreboard: ScoreboardSettings;
  session: SessionSettings;
  hotkeys: HotkeySettings;
  rank: RankSettings;
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
  history: "Riwayat match (W/L)",
  timer: "Timer match",
  goalWin: "Target menang",
  goalStreak: "Target streak",
  goalLose: "Batas kalah",
};

const DEFAULT_ON: readonly ScoreboardKey[] = SCOREBOARD_KEYS.slice(0, 11);

function only(on: readonly ScoreboardKey[]): ScoreboardSettings {
  const result = {} as ScoreboardSettings;
  for (const key of SCOREBOARD_KEYS) result[key] = on.includes(key);
  return result;
}

// PRESET: tambahkan preset baru di array ini
export const SCOREBOARD_PRESETS: readonly { id: string; label: string; values: ScoreboardSettings }[] = [
  { id: "standar", label: "Standar", values: only(DEFAULT_ON) },
  { id: "inti", label: "Inti live", values: only(["win", "lose", "streak", "winrate", "history"]) },
  { id: "winlose", label: "Win/Lose saja", values: only(["win", "lose"]) },
  { id: "kda", label: "KDA saja", values: only(["kill", "death", "assist", "ratio"]) },
  { id: "lengkap", label: "Lengkap", values: only(SCOREBOARD_KEYS) },
];
// END PRESET

export const DEFAULT_SESSION: SessionSettings = {
  goals: { win: 5, streak: 3, lose: 3 },
  historyCount: 5,
};

export function defaultRankSettings(): RankSettings {
  return { image: true, name: true, stars: true, count: true };
}

export function sameRankSettings(a: RankSettings, b: RankSettings): boolean {
  return RANK_KEYS.every((key) => a[key] === b[key]);
}

export function defaultMLSettings(): MLSettings {
  return {
    scoreboard: only(DEFAULT_ON),
    session: { goals: { ...DEFAULT_SESSION.goals }, historyCount: DEFAULT_SESSION.historyCount },
    hotkeys: { ...DEFAULT_HOTKEYS },
    rank: defaultRankSettings(),
  };
}

export function sameScoreboard(a: ScoreboardSettings, b: ScoreboardSettings): boolean {
  return SCOREBOARD_KEYS.every((key) => a[key] === b[key]);
}

export function sameSession(a: SessionSettings, b: SessionSettings): boolean {
  return (
    a.historyCount === b.historyCount &&
    a.goals.win === b.goals.win &&
    a.goals.streak === b.goals.streak &&
    a.goals.lose === b.goals.lose
  );
}

function isPlain(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseScoreboard(value: unknown): ScoreboardSettings | null {
  if (!isPlain(value)) return null;
  const result = only(DEFAULT_ON);
  for (const key of SCOREBOARD_KEYS) {
    const item = value[key];
    if (item === undefined) continue;
    if (typeof item !== "boolean") return null;
    result[key] = item;
  }
  return result;
}

function inRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

export function parseSession(value: unknown): SessionSettings | null {
  if (value === undefined) return defaultMLSettings().session;
  if (!isPlain(value)) return null;
  const result = defaultMLSettings().session;

  if (value.historyCount !== undefined) {
    if (!inRange(value.historyCount, SESSION_LIMITS.historyMin, SESSION_LIMITS.historyMax)) return null;
    result.historyCount = value.historyCount;
  }
  if (value.goals !== undefined) {
    if (!isPlain(value.goals)) return null;
    for (const key of ["win", "streak", "lose"] as const) {
      const item = value.goals[key];
      if (item === undefined) continue;
      if (!inRange(item, SESSION_LIMITS.goalMin, SESSION_LIMITS.goalMax)) return null;
      result.goals[key] = item;
    }
  }
  return result;
}

function parseRank(value: unknown): RankSettings | null {
  if (value === undefined) return defaultRankSettings();
  if (!isPlain(value)) return null;
  const result = defaultRankSettings();
  for (const key of RANK_KEYS) {
    const item = value[key];
    if (item === undefined) continue;
    if (typeof item !== "boolean") return null;
    result[key] = item;
  }
  return result;
}

export function parseMLSettings(value: unknown): MLSettings | null {
  if (!isPlain(value)) return null;
  const scoreboard = parseScoreboard(value.scoreboard);
  const session = parseSession(value.session);
  const hotkeys = parseHotkeys(value.hotkeys);
  const rank = parseRank(value.rank);
  return scoreboard && session && hotkeys && rank ? { scoreboard, session, hotkeys, rank } : null;
}

export const mlSettings: GameSettingsDefinition<MLSettings> = {
  initial: defaultMLSettings,
  parse: parseMLSettings,
};
