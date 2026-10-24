import { initialRank, normalizeRank, parsePos, type RankPos, type RankState } from "./rank";

export const ML_GAME_ID = "ml";
export const ANNOUNCE_EFFECT = "announce";

export const RESULT_IDS = ["victory", "defeat"] as const;
export type ResultId = (typeof RESULT_IDS)[number];

export const LABELS: Record<ResultId, string> = {
  victory: "Victory",
  defeat: "Defeat",
};

export interface SessionStats {
  wins: number;
  losses: number;
  streak: number;
  best: number;
}

export type Phase = "playing" | "ended";

export const RESULT_MARKS = ["W", "L"] as const;
export type ResultMark = (typeof RESULT_MARKS)[number];
export const RESULT_HISTORY_MAX = 10;

export interface SessionRecord {
  id: string;
  startedAt: number;
  endedAt: number;
  wins: number;
  losses: number;
  streak: number;
  best: number;
  results: ResultMark[];
  rankFrom: RankPos | null;
  rankTo: RankPos | null;
}

export const SESSION_ARCHIVE_MAX = 50;
export const SESSION_COUNT_MAX = 9999;

export interface MLState {
  hero: string;
  phase: Phase;
  session: SessionStats;
  lastResultAt: number;
  results: ResultMark[];
  matchStartedAt: number;
  lastDurationMs: number;
  sessionStartedAt: number;
  sessions: SessionRecord[];
  rank: RankState;
  sessionRankFrom: RankPos | null;
}

export interface AnnouncePayload {
  id: ResultId | "custom";
  text?: string;
}

export const LIMITS = { heroName: 24, customText: 40 } as const;
export const TIMING = { resetDelayMs: 10_000, resultGuardMs: 30_000 } as const;

export function initialMLState(): MLState {
  return {
    hero: "",
    phase: "playing",
    session: { wins: 0, losses: 0, streak: 0, best: 0 },
    lastResultAt: 0,
    results: [],
    matchStartedAt: 0,
    lastDurationMs: 0,
    sessionStartedAt: 0,
    sessions: [],
    rank: initialRank(),
    sessionRankFrom: null,
  };
}

function nonNegative(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? Math.min(value, SESSION_COUNT_MAX) : 0;
}

function marks(value: unknown): ResultMark[] {
  if (!Array.isArray(value)) return [];
  return value.filter((mark): mark is ResultMark => mark === "W" || mark === "L").slice(-RESULT_HISTORY_MAX);
}

function normalizeRecord(raw: unknown): SessionRecord | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const input = raw as Partial<Record<keyof SessionRecord, unknown>>;
  if (typeof input.id !== "string" || input.id.length === 0 || input.id.length > 40) return null;
  const wins = count(input.wins);
  const losses = count(input.losses);
  if (wins + losses === 0) return null;
  return {
    id: input.id,
    startedAt: nonNegative(input.startedAt),
    endedAt: nonNegative(input.endedAt),
    wins,
    losses,
    streak: count(input.streak),
    best: count(input.best),
    results: marks(input.results),
    rankFrom: parsePos(input.rankFrom),
    rankTo: parsePos(input.rankTo),
  };
}

function normalizeSessions(value: unknown): SessionRecord[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: SessionRecord[] = [];
  for (const item of value) {
    const record = normalizeRecord(item);
    if (!record || seen.has(record.id)) continue;
    seen.add(record.id);
    result.push(record);
  }
  return result.slice(0, SESSION_ARCHIVE_MAX);
}

function normalizeSession(value: unknown): SessionStats {
  const base = initialMLState().session;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return base;
  const input = value as Partial<Record<keyof SessionStats, unknown>>;
  return { wins: count(input.wins), losses: count(input.losses), streak: count(input.streak), best: count(input.best) };
}

export function normalizeMLState(raw: unknown): MLState {
  const base = initialMLState();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return base;
  const input = raw as Partial<Record<keyof MLState, unknown>>;
  return {
    hero: typeof input.hero === "string" ? input.hero.slice(0, LIMITS.heroName) : "",
    phase: input.phase === "ended" ? "ended" : "playing",
    session: normalizeSession(input.session),
    lastResultAt: nonNegative(input.lastResultAt),
    results: marks(input.results),
    matchStartedAt: nonNegative(input.matchStartedAt),
    lastDurationMs: nonNegative(input.lastDurationMs),
    sessionStartedAt: nonNegative(input.sessionStartedAt),
    sessions: normalizeSessions(input.sessions),
    rank: normalizeRank(input.rank),
    sessionRankFrom: parsePos(input.sessionRankFrom),
  };
}

export function isResultId(type: string): type is ResultId {
  return (RESULT_IDS as readonly string[]).includes(type);
}
