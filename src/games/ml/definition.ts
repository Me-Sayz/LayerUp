import type { GameDefinition, GameEffect, GameEvent, ReduceResult } from "@/lib/types";
import {
  ANNOUNCE_EFFECT,
  KDA_FIELD,
  LIMITS,
  RESULT_HISTORY_MAX,
  SESSION_ARCHIVE_MAX,
  SESSION_COUNT_MAX,
  ML_GAME_ID,
  TIMING,
  initialMLState,
  normalizeMLState,
  isAnnounceId,
  isKdaEvent,
  isRecordedId,
  isResultId,
  type AnnounceId,
  type AnnouncePayload,
  type KdaEvent,
  type MLState,
  type ResultId,
  type SessionRecord,
} from "./state";
import { adjustStars, applyResult, parsePos, resolvePending, setPosition, startGrading, type RankState } from "./rank";
import { mlSettings } from "./settings";

type Result = ReduceResult<MLState>;
type Payload = GameEvent["payload"];

function ignore(state: MLState): Result {
  return { state };
}

function announce(payload: AnnouncePayload): GameEffect {
  return { type: ANNOUNCE_EFFECT, payload: { ...payload } };
}

function readDelta(payload: Payload): number | null {
  const raw = payload?.delta;
  if (raw === undefined) return 1;
  if (typeof raw !== "number" || !Number.isInteger(raw)) return null;
  if (raw === 0 || Math.abs(raw) > LIMITS.kdaMax) return null;
  return raw;
}

function readText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  return value.trim().slice(0, max);
}

function readId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return id.length > 0 && id.length <= 40 ? id : null;
}

function archiveCurrent(state: MLState, at: number): SessionRecord | null {
  const { wins, losses, streak, best } = state.session;
  if (wins + losses === 0) return null;
  const endedAt = state.lastResultAt > 0 ? state.lastResultAt : at;
  let id = endedAt.toString(36);
  while (state.sessions.some((record) => record.id === id)) id += "x";
  return {
    id,
    startedAt: state.sessionStartedAt > 0 ? state.sessionStartedAt : endedAt,
    endedAt,
    wins,
    losses,
    streak,
    best,
    results: state.results,
    rankFrom: state.sessionRankFrom ?? state.rank.pos,
    rankTo: state.rank.pos,
  };
}

function withArchive(sessions: SessionRecord[], record: SessionRecord | null): SessionRecord[] {
  return (record ? [record, ...sessions] : sessions).slice(0, SESSION_ARCHIVE_MAX);
}

function reduceSessionReset(state: MLState, at: number): Result {
  const sessions = withArchive(state.sessions, archiveCurrent(state, at));
  return { state: { ...initialMLState(), hero: state.hero, sessions, rank: state.rank } };
}

function reduceSessionResume(state: MLState, payload: Payload, at: number): Result {
  const id = readId(payload?.id);
  const record = id === null ? undefined : state.sessions.find((item) => item.id === id);
  if (!record) return ignore(state);
  const rest = state.sessions.filter((item) => item.id !== record.id);
  const sessions = withArchive(rest, archiveCurrent({ ...state, sessions: rest }, at));
  return {
    state: {
      ...state,
      phase: "playing",
      match: { k: 0, d: 0, a: 0 },
      session: { wins: record.wins, losses: record.losses, streak: record.streak, best: record.best },
      results: record.results,
      sessionStartedAt: record.startedAt,
      sessionRankFrom: record.rankFrom,
      lastResultAt: record.endedAt,
      matchStartedAt: 0,
      lastDurationMs: 0,
      sessions,
    },
  };
}

function reduceSessionDelete(state: MLState, payload: Payload): Result {
  const id = readId(payload?.id);
  if (id === null || !state.sessions.some((item) => item.id === id)) return ignore(state);
  return { state: { ...state, sessions: state.sessions.filter((item) => item.id !== id) } };
}

function reduceSessionAdjust(state: MLState, payload: Payload, at: number): Result {
  const field = payload?.field;
  if (field !== "wins" && field !== "losses") return ignore(state);
  const delta = readDelta(payload);
  if (delta === null) return ignore(state);
  const next = Math.min(SESSION_COUNT_MAX, Math.max(0, state.session[field] + delta));
  if (next === state.session[field]) return ignore(state);
  const session = { ...state.session, [field]: next };
  const started = state.sessionStartedAt > 0 ? state.sessionStartedAt : at;
  const active = session.wins + session.losses > 0;
  return {
    state: {
      ...state,
      session,
      sessionStartedAt: active ? started : 0,
      sessionRankFrom: active ? (state.sessionRankFrom ?? state.rank.pos) : null,
    },
  };
}

function sameRank(a: RankState, b: RankState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function withRank(state: MLState, rank: RankState, record = true): Result {
  if (sameRank(state.rank, rank)) return ignore(state);
  return { state: { ...state, rank }, record };
}

function reduceRankSet(state: MLState, payload: Payload): Result {
  const pos = parsePos(payload);
  if (!pos) return ignore(state);
  return withRank(state, setPosition(state.rank, pos));
}

function reduceRankStars(state: MLState, payload: Payload): Result {
  const delta = payload?.delta;
  if (delta !== 1 && delta !== -1) return ignore(state);
  return withRank(state, adjustStars(state.rank, delta));
}

function reduceRankGrade(state: MLState, payload: Payload): Result {
  const mode = payload?.mode;
  if (mode === "grading" || mode === "skip") return withRank(state, resolvePending(state.rank, mode));
  if (mode === "start") return withRank(state, startGrading(state.rank));
  if (mode === "cancel") {
    if (!state.rank.grading) return ignore(state);
    return withRank(state, { ...state.rank, grading: null });
  }
  return ignore(state);
}

function reduceRankAuto(state: MLState, payload: Payload): Result {
  const value = payload?.value;
  if (typeof value !== "boolean") return ignore(state);
  return withRank(state, { ...state.rank, auto: value }, false);
}

function reduceKda(state: MLState, type: KdaEvent, payload: Payload): Result {
  const delta = readDelta(payload);
  if (delta === null) return ignore(state);

  const fresh = state.phase === "ended" && delta > 0;
  const base: MLState = fresh
    ? { ...state, phase: "playing", match: { k: 0, d: 0, a: 0 } }
    : state;
  const field = KDA_FIELD[type];
  const next = Math.min(LIMITS.kdaMax, Math.max(0, base.match[field] + delta));
  if (next === base.match[field] && !fresh) return ignore(state);

  return { state: { ...base, match: { ...base.match, [field]: next } } };
}

function reduceResult(state: MLState, id: ResultId, at: number): Result {
  const elapsed = at - state.lastResultAt;
  if (state.lastResultAt > 0 && elapsed >= 0 && elapsed < TIMING.resultGuardMs) {
    return ignore(state);
  }

  const won = id === "victory";
  const streak = won ? state.session.streak + 1 : 0;
  const session = {
    wins: state.session.wins + (won ? 1 : 0),
    losses: state.session.losses + (won ? 0 : 1),
    streak,
    best: Math.max(state.session.best, streak),
  };

  const results = [...state.results, won ? "W" : "L"].slice(-RESULT_HISTORY_MAX) as MLState["results"];
  const lastDurationMs = state.matchStartedAt > 0 ? Math.max(0, at - state.matchStartedAt) : 0;

  return {
    state: {
      ...state,
      phase: "ended",
      session,
      lastResultAt: at,
      results,
      matchStartedAt: 0,
      lastDurationMs,
      sessionStartedAt: state.sessionStartedAt > 0 ? state.sessionStartedAt : at,
      sessionRankFrom: state.sessionStartedAt > 0 ? (state.sessionRankFrom ?? state.rank.pos) : state.rank.pos,
      rank: applyResult(state.rank, won),
    },
    effects: [announce({ id })],
    schedule: [
      {
        key: "reset",
        afterMs: TIMING.resetDelayMs,
        event: { game: ML_GAME_ID, type: "match_new", payload: { onlyIfEnded: true } },
      },
    ],
  };
}

function reduceAnnounce(state: MLState, id: AnnounceId): Result {
  const effects = [announce({ id })];
  if (!isRecordedId(id)) return { state, effects };
  const records = { ...state.records, [id]: state.records[id] + 1 };
  return { state: { ...state, records }, effects };
}

function reduce(state: MLState, event: GameEvent): Result {
  const { type, payload } = event;

  if (isKdaEvent(type)) return reduceKda(state, type, payload);
  if (isResultId(type)) return reduceResult(state, type, event.at ?? Date.now());
  if (isAnnounceId(type)) return reduceAnnounce(state, type);

  switch (type) {
    case "custom": {
      const text = readText(payload?.text, LIMITS.customText);
      if (!text) return ignore(state);
      return { state, effects: [announce({ id: "custom", text })] };
    }
    case "match_new": {
      const fresh = { phase: "playing" as const, match: { k: 0, d: 0, a: 0 }, lastDurationMs: 0 };
      if (payload?.onlyIfEnded === true) {
        if (state.phase !== "ended") return ignore(state);
        return { state: { ...state, ...fresh, matchStartedAt: 0 } };
      }
      return { state: { ...state, ...fresh, matchStartedAt: event.at ?? Date.now() } };
    }
    case "hero": {
      const name = readText(payload?.name, LIMITS.heroName);
      if (name === null || name === state.hero) return ignore(state);
      return { state: { ...state, hero: name } };
    }
    case "session_reset":
      return reduceSessionReset(state, event.at ?? Date.now());
    case "session_resume":
      return reduceSessionResume(state, payload, event.at ?? Date.now());
    case "session_delete":
      return reduceSessionDelete(state, payload);
    case "session_adjust":
      return reduceSessionAdjust(state, payload, event.at ?? Date.now());
    case "rank_set":
      return reduceRankSet(state, payload);
    case "rank_stars":
      return reduceRankStars(state, payload);
    case "rank_grade":
      return reduceRankGrade(state, payload);
    case "rank_auto":
      return reduceRankAuto(state, payload);
    default:
      return ignore(state);
  }
}

export const mlGame: GameDefinition<MLState> = {
  id: ML_GAME_ID,
  name: "Mobile Legends",
  initialState: initialMLState,
  normalize: normalizeMLState,
  reduce,
  settings: mlSettings,
};
