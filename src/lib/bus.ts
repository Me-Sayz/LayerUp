import { readFileSync, promises as fs } from "node:fs";
import path from "node:path";
import { getGame, listGames } from "@/games/registry";
import {
  UNDO_EVENT,
  type AppState,
  type GameEvent,
  type GameId,
  type ScheduledEvent,
  type StreamMessage,
  type WorkerStatus,
} from "./types";

type Listener = (message: StreamMessage) => void;

export type DispatchResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export interface DispatchOptions {
  record?: boolean;
}

interface Bus {
  state: AppState;
  listeners: Set<Listener>;
  saveTimer: ReturnType<typeof setTimeout> | null;
  history: Map<GameId, unknown[]>;
  timers: Map<string, ReturnType<typeof setTimeout>>;
  workerTimers: Map<GameId, ReturnType<typeof setTimeout>>;
}

export interface WorkerReport {
  online: boolean;
  hotkeys?: Record<string, string>;
}

const STATE_FILE = path.join(process.cwd(), "data", "state.json");
const SAVE_DELAY_MS = 300;
const HISTORY_LIMIT = 20;
const WORKER_TIMEOUT_MS = 8000;

function isAppState(value: unknown): value is AppState {
  if (typeof value !== "object" || value === null) return false;
  const games = (value as { games?: unknown }).games;
  return typeof games === "object" && games !== null && !Array.isArray(games);
}

function normalizeSettings(stored: Record<GameId, unknown> | undefined): Record<GameId, unknown> {
  const result: Record<GameId, unknown> = {};
  for (const game of listGames()) {
    if (!game.settings) continue;
    result[game.id] = game.settings.parse(stored?.[game.id]) ?? game.settings.initial();
  }
  return result;
}

function normalizeGames(stored: Record<GameId, unknown>): Record<GameId, unknown> {
  const result = { ...stored };
  for (const game of listGames()) {
    if (game.normalize && game.id in result) result[game.id] = game.normalize(result[game.id]);
  }
  return result;
}

function loadInitialState(): AppState {
  let base: AppState = { games: {} };
  try {
    const parsed: unknown = JSON.parse(readFileSync(STATE_FILE, "utf8"));
    if (isAppState(parsed)) base = parsed;
  } catch {
    // file belum ada atau rusak: mulai dari kosong
  }
  return { games: normalizeGames(base.games), settings: normalizeSettings(base.settings) };
}

const holder = globalThis as typeof globalThis & { __overlayBus?: Bus };

function getBus(): Bus {
  const existing = holder.__overlayBus;
  if (existing) {
    existing.history ??= new Map();
    existing.timers ??= new Map();
    existing.workerTimers ??= new Map();
    return existing;
  }
  const bus: Bus = {
    state: loadInitialState(),
    listeners: new Set(),
    saveTimer: null,
    history: new Map(),
    timers: new Map(),
    workerTimers: new Map(),
  };
  holder.__overlayBus = bus;
  return bus;
}

function ensureGames(bus: Bus): void {
  let games = bus.state.games;
  let settings = bus.state.settings ?? {};
  for (const game of listGames()) {
    if (!(game.id in games)) {
      games = { ...games, [game.id]: game.initialState() };
    }
    if (game.settings && !(game.id in settings)) {
      settings = { ...settings, [game.id]: game.settings.initial() };
    }
  }
  if (games !== bus.state.games || settings !== bus.state.settings) {
    bus.state = { ...bus.state, games, settings };
  }
}

function publish(bus: Bus, message: StreamMessage): void {
  for (const listener of bus.listeners) {
    try {
      listener(message);
    } catch (error) {
      console.error("[bus] listener gagal:", error);
    }
  }
}

async function writeState(state: AppState): Promise<void> {
  const tmp = `${STATE_FILE}.tmp`;
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
  await fs.writeFile(tmp, JSON.stringify({ ...state, worker: undefined }));
  await fs.rename(tmp, STATE_FILE);
}

function scheduleSave(bus: Bus): void {
  if (bus.saveTimer) clearTimeout(bus.saveTimer);
  bus.saveTimer = setTimeout(() => {
    bus.saveTimer = null;
    writeState(bus.state).catch((error) => {
      console.error("[bus] gagal menyimpan state:", error);
    });
  }, SAVE_DELAY_MS);
}

function pushHistory(bus: Bus, gameId: GameId, previous: unknown): void {
  const stack = bus.history.get(gameId) ?? [];
  stack.push(previous);
  if (stack.length > HISTORY_LIMIT) stack.shift();
  bus.history.set(gameId, stack);
}

function scheduleEvent(bus: Bus, gameId: GameId, item: ScheduledEvent): void {
  const key = `${gameId}:${item.key}`;
  const existing = bus.timers.get(key);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    bus.timers.delete(key);
    dispatch({ ...item.event, game: gameId }, { record: false });
  }, Math.max(0, item.afterMs));
  bus.timers.set(key, timer);
}

function undo(bus: Bus, gameId: GameId): DispatchResult {
  const stack = bus.history.get(gameId);
  if (!stack || stack.length === 0) {
    return { ok: false, status: 409, error: "Tidak ada yang bisa diurungkan" };
  }
  const previous = stack.pop();
  bus.state = { ...bus.state, games: { ...bus.state.games, [gameId]: previous } };
  scheduleSave(bus);
  publish(bus, { kind: "state", state: bus.state });
  return { ok: true };
}

export function updateSettings(gameId: GameId, value: unknown): DispatchResult {
  const game = getGame(gameId);
  if (!game) {
    return { ok: false, status: 404, error: `Game tidak dikenal: ${gameId}` };
  }
  if (!game.settings) {
    return { ok: false, status: 404, error: `Game ${gameId} tidak punya pengaturan` };
  }
  const bus = getBus();
  ensureGames(bus);
  const current = bus.state.settings?.[gameId];
  const isPlain = (item: unknown): item is Record<string, unknown> =>
    typeof item === "object" && item !== null && !Array.isArray(item);
  const merged = isPlain(value) && isPlain(current) ? { ...current, ...value } : value;
  const parsed = game.settings.parse(merged);
  if (parsed === null) {
    return { ok: false, status: 400, error: "Pengaturan tidak valid" };
  }

  bus.state = { ...bus.state, settings: { ...bus.state.settings, [gameId]: parsed } };
  scheduleSave(bus);
  publish(bus, { kind: "state", state: bus.state });
  return { ok: true };
}

function sameWorker(a: WorkerStatus | undefined, b: WorkerStatus): boolean {
  if (!a || a.online !== b.online) return false;
  const keys = new Set([...Object.keys(a.hotkeys), ...Object.keys(b.hotkeys)]);
  return [...keys].every((key) => a.hotkeys[key] === b.hotkeys[key]);
}

function setWorkerStatus(bus: Bus, gameId: GameId, next: WorkerStatus): void {
  if (sameWorker(bus.state.worker?.[gameId], next)) return;
  bus.state = { ...bus.state, worker: { ...bus.state.worker, [gameId]: next } };
  publish(bus, { kind: "state", state: bus.state });
}

export function reportWorker(gameId: GameId, report: WorkerReport): DispatchResult {
  if (!getGame(gameId)) {
    return { ok: false, status: 404, error: `Game tidak dikenal: ${gameId}` };
  }
  const bus = getBus();
  ensureGames(bus);

  const existing = bus.workerTimers.get(gameId);
  if (existing) clearTimeout(existing);
  bus.workerTimers.delete(gameId);

  if (!report.online) {
    setWorkerStatus(bus, gameId, { online: false, hotkeys: {} });
    return { ok: true };
  }

  setWorkerStatus(bus, gameId, { online: true, hotkeys: report.hotkeys ?? {} });
  bus.workerTimers.set(
    gameId,
    setTimeout(() => {
      bus.workerTimers.delete(gameId);
      setWorkerStatus(bus, gameId, { online: false, hotkeys: {} });
    }, WORKER_TIMEOUT_MS),
  );
  return { ok: true };
}

export function getState(): AppState {
  const bus = getBus();
  ensureGames(bus);
  return bus.state;
}

export function subscribe(listener: Listener): () => void {
  const bus = getBus();
  bus.listeners.add(listener);
  return () => {
    bus.listeners.delete(listener);
  };
}

export function dispatch(event: GameEvent, options: DispatchOptions = {}): DispatchResult {
  const game = getGame(event.game);
  if (!game) {
    return { ok: false, status: 404, error: `Game tidak dikenal: ${event.game}` };
  }

  const bus = getBus();
  ensureGames(bus);

  if (event.type === UNDO_EVENT) return undo(bus, game.id);

  const previous = bus.state.games[game.id];
  let result;
  try {
    result = game.reduce(previous, { ...event, at: Date.now() });
  } catch (error) {
    console.error(`[bus] reducer ${game.id} gagal:`, error);
    return { ok: false, status: 500, error: "Event gagal diproses" };
  }

  if (result.state !== previous) {
    if (options.record !== false) pushHistory(bus, game.id, previous);
    bus.state = { ...bus.state, games: { ...bus.state.games, [game.id]: result.state } };
    scheduleSave(bus);
    publish(bus, { kind: "state", state: bus.state });
  }
  for (const effect of result.effects ?? []) {
    publish(bus, { kind: "effect", game: game.id, effect });
  }
  for (const item of result.schedule ?? []) {
    scheduleEvent(bus, game.id, item);
  }
  return { ok: true };
}
