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

export interface MLState {
  hero: string;
  phase: Phase;
  match: KdaCounts;
  session: SessionStats;
  records: Record<RecordedId, number>;
  lastResultAt: number;
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