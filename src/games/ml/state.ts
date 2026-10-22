export const ML_GAME_ID = "ml";
export const ANNOUNCE_EFFECT = "announce";

export const KDA_EVENTS = ["kill", "death", "assist"] as const;
export type KdaEvent = (typeof KDA_EVENTS)[number];

export const RECORDED_IDS = [
  "firstblood",
  "doublekill",
  "triplekill",
  "maniac",
  "savage",
  "legendary",
  "mvp",
] as const;
export type RecordedId = (typeof RECORDED_IDS)[number];

export const ANNOUNCE_IDS = [...RECORDED_IDS, "shutdown"] as const;
export type AnnounceId = (typeof ANNOUNCE_IDS)[number];

export const RESULT_IDS = ["victory", "defeat"] as const;
export type ResultId = (typeof RESULT_IDS)[number];

export type ShownId = AnnounceId | ResultId;

export const LABELS: Record<ShownId, string> = {
  firstblood: "First Blood",
  doublekill: "Double Kill",
  triplekill: "Triple Kill",
  maniac: "Maniac",
  savage: "Savage",
  legendary: "Legendary",
  mvp: "MVP",
  shutdown: "Shutdown",
  victory: "Victory",
  defeat: "Defeat",
};

export interface KdaCounts {
  k: number;
  d: number;
  a: number;
}

export const KDA_FIELD: Record<KdaEvent, keyof KdaCounts> = {
  kill: "k",
  death: "d",
  assist: "a",
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
}

export const SESSION_ARCHIVE_MAX = 50;
export const SESSION_COUNT_MAX = 9999;

export interface MLState {
  hero: string;
  phase: Phase;
  match: KdaCounts;
  session: SessionStats;
  records: Record<RecordedId, number>;
  lastResultAt: number;
  results: ResultMark[];
  matchStartedAt: number;
  lastDurationMs: number;
  sessionStartedAt: number;
  sessions: SessionRecord[];
}

export interface AnnouncePayload {
  id: ShownId | "custom";
  text?: string;
}

export const LIMITS = { kdaMax: 99, heroName: 24, customText: 40 } as const;
export const TIMING = { resetDelayMs: 10_000, resultGuardMs: 30_000 } as const;

export function initialMLState(): MLState {
  return {
    hero: "",
    phase: "playing",
    match: { k: 0, d: 0, a: 0 },
    session: { wins: 0, losses: 0, streak: 0, best: 0 },
    records: {
      firstblood: 0,
      doublekill: 0,
      triplekill: 0,
      maniac: 0,
      savage: 0,
      legendary: 0,
      mvp: 0,
    },
    lastResultAt: 0,
    results: [],
    matchStartedAt: 0,
    lastDurationMs: 0,
    sessionStartedAt: 0,
    sessions: [],
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

export function normalizeMLState(raw: unknown): MLState {
  const base = initialMLState();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return base;
  const input = raw as Partial<Record<keyof MLState, unknown>>;
  const results = Array.isArray(input.results)
    ? input.results.filter((mark): mark is ResultMark => mark === "W" || mark === "L").slice(-RESULT_HISTORY_MAX)
    : [];
  return {
    ...base,
    ...(raw as Partial<MLState>),
    results,
    matchStartedAt: nonNegative(input.matchStartedAt),
    lastDurationMs: nonNegative(input.lastDurationMs),
    sessionStartedAt: nonNegative(input.sessionStartedAt),
    sessions: normalizeSessions(input.sessions),
  };
}

export function isKdaEvent(type: string): type is KdaEvent {
  return (KDA_EVENTS as readonly string[]).includes(type);
}

export function isAnnounceId(type: string): type is AnnounceId {
  return (ANNOUNCE_IDS as readonly string[]).includes(type);
}

export function isRecordedId(type: string): type is RecordedId {
  return (RECORDED_IDS as readonly string[]).includes(type);
}

export function isResultId(type: string): type is ResultId {
  return (RESULT_IDS as readonly string[]).includes(type);
}