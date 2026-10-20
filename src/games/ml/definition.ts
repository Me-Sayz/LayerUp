import type { GameDefinition, GameEffect, GameEvent, ReduceResult } from "@/lib/types";
import {
  ANNOUNCE_EFFECT,
  KDA_FIELD,
  LIMITS,
  ML_GAME_ID,
  TIMING,
  initialMLState,
  isAnnounceId,
  isKdaEvent,
  isRecordedId,
  isResultId,
  type AnnounceId,
  type AnnouncePayload,
  type KdaEvent,
  type MLState,
  type ResultId,
} from "./state";
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

  return {
    state: { ...state, phase: "ended", session, lastResultAt: at },
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
      if (payload?.onlyIfEnded === true && state.phase !== "ended") return ignore(state);
      const { k, d, a } = state.match;
      if (state.phase === "playing" && k === 0 && d === 0 && a === 0) return ignore(state);
      return { state: { ...state, phase: "playing", match: { k: 0, d: 0, a: 0 } } };
    }
    case "hero": {
      const name = readText(payload?.name, LIMITS.heroName);
      if (name === null || name === state.hero) return ignore(state);
      return { state: { ...state, hero: name } };
    }
    case "session_reset":
      return { state: { ...initialMLState(), hero: state.hero } };
    default:
      return ignore(state);
  }
}

export const mlGame: GameDefinition<MLState> = {
  id: ML_GAME_ID,
  name: "Mobile Legends",
  initialState: initialMLState,
  reduce,
  settings: mlSettings,
};
