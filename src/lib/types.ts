export type GameId = string;

export const UNDO_EVENT = "undo";

export const EVENT_SOURCES = ["panel", "hotkey", "detector", "tiktok"] as const;
export type EventSource = (typeof EVENT_SOURCES)[number];

export interface GameEvent {
  game: GameId;
  type: string;
  payload?: Record<string, unknown>;
  source?: EventSource;
  at?: number;
}

export interface GameEffect {
  type: string;
  payload?: Record<string, unknown>;
}

export interface ScheduledEvent {
  key: string;
  afterMs: number;
  event: GameEvent;
}

export interface ReduceResult<S> {
  state: S;
  effects?: GameEffect[];
  schedule?: ScheduledEvent[];
}

export interface GameSettingsDefinition<T = unknown> {
  initial(): T;
  parse(value: unknown): T | null;
}

export interface GameDefinition<S = unknown> {
  id: GameId;
  name: string;
  initialState(): S;
  normalize?(raw: unknown): S;
  reduce(state: S, event: GameEvent): ReduceResult<S>;
  settings?: GameSettingsDefinition;
}

export interface WorkerStatus {
  online: boolean;
  hotkeys: Record<string, string>;
}

export interface AppState {
  games: Record<GameId, unknown>;
  settings?: Record<GameId, unknown>;
  worker?: Record<GameId, WorkerStatus>;
}

export type StreamMessage =
  | { kind: "state"; state: AppState }
  | { kind: "effect"; game: GameId; effect: GameEffect };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isGameEvent(value: unknown): value is GameEvent {
  if (!isPlainObject(value)) return false;
  const { game, type, payload, source } = value;
  if (typeof game !== "string" || game.length === 0 || game.length > 32) return false;
  if (typeof type !== "string" || type.length === 0 || type.length > 64) return false;
  if (payload !== undefined && !isPlainObject(payload)) return false;
  if (source !== undefined && !EVENT_SOURCES.includes(source as EventSource)) return false;
  return true;
}
