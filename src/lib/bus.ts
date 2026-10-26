import { getGame, listGames } from "@/games/registry";
import { getStore, takeLegacyState, type GameBlob } from "./store";
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
  userId: string;
  state: AppState;
  listeners: Set<Listener>;
  kicks: Set<() => void>;
  saveTimer: ReturnType<typeof setTimeout> | null;
  saving: Promise<void> | null;
  dirty: boolean;
  dropped: boolean;
  touched: number;
  history: Map<GameId, unknown[]>;
  timers: Map<string, ReturnType<typeof setTimeout>>;
  workerTimers: Map<GameId, ReturnType<typeof setTimeout>>;
}

export interface WorkerReport {
  online: boolean;
  hotkeys?: Record<string, string>;
}

interface Registry {
  buses: Map<string, Bus>;
  loading: Map<string, Promise<Bus>>;
  sweeper: ReturnType<typeof setInterval> | null;
}

const SAVE_DELAY_MS = 1000;
const SAVE_RETRY_MS = 5000;
const HISTORY_LIMIT = 20;
const WORKER_TIMEOUT_MS = 8000;
const IDLE_MS = 10 * 60_000;
const SWEEP_MS = 60_000;

const holder = globalThis as typeof globalThis & { __layerupRegistry?: Registry };

function registry(): Registry {
  holder.__layerupRegistry ??= { buses: new Map(), loading: new Map(), sweeper: null };
  const reg = holder.__layerupRegistry;
  if (reg.sweeper === null) {
    reg.sweeper = setInterval(() => void sweep(reg), SWEEP_MS);
    reg.sweeper.unref?.();
  }
  return reg;
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

function stateFromBlobs(blobs: Record<GameId, GameBlob>): AppState {
  const games: Record<GameId, unknown> = {};
  const settings: Record<GameId, unknown> = {};
  for (const [id, blob] of Object.entries(blobs)) {
    if (blob.state !== null && blob.state !== undefined) games[id] = blob.state;
    if (blob.settings !== null && blob.settings !== undefined) settings[id] = blob.settings;
  }
  return { games: normalizeGames(games), settings: normalizeSettings(settings) };
}

async function loadBus(userId: string): Promise<Bus> {
  const blobs = await getStore().loadGames(userId);
  let imported = false;
  let state: AppState;
  if (Object.keys(blobs).length === 0) {
    const legacy = await takeLegacyState();
    imported = legacy !== null;
    state = legacy
      ? { games: normalizeGames(legacy.games), settings: normalizeSettings(legacy.settings) }
      : { games: normalizeGames({}), settings: normalizeSettings(undefined) };
  } else {
    state = stateFromBlobs(blobs);
  }
  const bus: Bus = {
    userId,
    state,
    listeners: new Set(),
    kicks: new Set(),
    saveTimer: null,
    saving: null,
    dirty: false,
    dropped: false,
    touched: Date.now(),
    history: new Map(),
    timers: new Map(),
    workerTimers: new Map(),
  };
  ensureGames(bus);
  if (imported) markDirty(bus);
  return bus;
}

async function getBus(userId: string): Promise<Bus> {
  const reg = registry();
  const existing = reg.buses.get(userId);
  if (existing) {
    existing.touched = Date.now();
    return existing;
  }
  let pending = reg.loading.get(userId);
  if (!pending) {
    pending = loadBus(userId)
      .then((bus) => {
        reg.buses.set(userId, bus);
        return bus;
      })
      .finally(() => reg.loading.delete(userId));
    reg.loading.set(userId, pending);
  }
  return pending;
}

function ensureGames(bus: Bus): void {
  let games = bus.state.games;
  let settings = bus.state.settings ?? {};
  for (const game of listGames()) {
    if (!(game.id in games)) games = { ...games, [game.id]: game.initialState() };
    if (game.settings && !(game.id in settings)) settings = { ...settings, [game.id]: game.settings.initial() };
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

// SECTION: SIMPAN
async function saveNow(bus: Bus): Promise<void> {
  if (bus.saving) await bus.saving;
  if (!bus.dirty || bus.dropped) return;
  bus.dirty = false;
  const snapshot = bus.state;
  const store = getStore();
  const run = (async () => {
    try {
      for (const game of listGames()) {
        await store.saveGame(bus.userId, game.id, {
          state: snapshot.games[game.id],
          settings: snapshot.settings?.[game.id],
        });
      }
    } catch (error) {
      if (bus.dropped) return;
      bus.dirty = true;
      console.error("[bus] gagal menyimpan state:", error);
      scheduleSave(bus, SAVE_RETRY_MS);
    }
  })();
  bus.saving = run.finally(() => {
    bus.saving = null;
  });
  await run;
}

function scheduleSave(bus: Bus, delay = SAVE_DELAY_MS): void {
  if (bus.saveTimer) clearTimeout(bus.saveTimer);
  bus.saveTimer = setTimeout(() => {
    bus.saveTimer = null;
    void saveNow(bus);
  }, delay);
}

function markDirty(bus: Bus): void {
  bus.dirty = true;
  scheduleSave(bus);
}

async function sweep(reg: Registry): Promise<void> {
  const now = Date.now();
  for (const [userId, bus] of reg.buses) {
    const idle = bus.listeners.size === 0 && bus.timers.size === 0 && bus.workerTimers.size === 0;
    if (!idle || now - bus.touched < IDLE_MS) continue;
    if (bus.saveTimer) {
      clearTimeout(bus.saveTimer);
      bus.saveTimer = null;
    }
    await saveNow(bus);
    const stillIdle = bus.listeners.size === 0 && bus.timers.size === 0 && !bus.dirty && Date.now() - bus.touched >= IDLE_MS;
    if (stillIdle) reg.buses.delete(userId);
  }
}
// END SIMPAN

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
    void dispatch(bus.userId, { ...item.event, game: gameId }, { record: false });
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
  markDirty(bus);
  publish(bus, { kind: "state", state: bus.state });
  return { ok: true };
}

export async function updateSettings(userId: string, gameId: GameId, value: unknown): Promise<DispatchResult> {
  const game = getGame(gameId);
  if (!game) {
    return { ok: false, status: 404, error: `Game tidak dikenal: ${gameId}` };
  }
  if (!game.settings) {
    return { ok: false, status: 404, error: `Game ${gameId} tidak punya pengaturan` };
  }
  const bus = await getBus(userId);
  const current = bus.state.settings?.[gameId];
  const isPlain = (item: unknown): item is Record<string, unknown> =>
    typeof item === "object" && item !== null && !Array.isArray(item);
  const merged = isPlain(value) && isPlain(current) ? { ...current, ...value } : value;
  const parsed = game.settings.parse(merged);
  if (parsed === null) {
    return { ok: false, status: 400, error: "Pengaturan tidak valid" };
  }

  bus.state = { ...bus.state, settings: { ...bus.state.settings, [gameId]: parsed } };
  markDirty(bus);
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

export async function reportWorker(userId: string, gameId: GameId, report: WorkerReport): Promise<DispatchResult> {
  if (!getGame(gameId)) {
    return { ok: false, status: 404, error: `Game tidak dikenal: ${gameId}` };
  }
  const bus = await getBus(userId);

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

export async function getState(userId: string): Promise<AppState> {
  const bus = await getBus(userId);
  return bus.state;
}

export async function subscribe(userId: string, listener: Listener, onKick?: () => void): Promise<() => void> {
  const bus = await getBus(userId);
  bus.listeners.add(listener);
  if (onKick) bus.kicks.add(onKick);
  return () => {
    bus.listeners.delete(listener);
    if (onKick) bus.kicks.delete(onKick);
    bus.touched = Date.now();
  };
}

export async function kickOverlays(userId: string): Promise<void> {
  const bus = registry().buses.get(userId);
  if (!bus) return;
  for (const kick of [...bus.kicks]) kick();
  bus.kicks.clear();
}

export async function dispatch(userId: string, event: GameEvent, options: DispatchOptions = {}): Promise<DispatchResult> {
  const game = getGame(event.game);
  if (!game) {
    return { ok: false, status: 404, error: `Game tidak dikenal: ${event.game}` };
  }

  const bus = await getBus(userId);

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
    if (options.record !== false && result.record !== false) pushHistory(bus, game.id, previous);
    bus.state = { ...bus.state, games: { ...bus.state.games, [game.id]: result.state } };
    markDirty(bus);
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

export async function dropUser(userId: string): Promise<void> {
  const reg = registry();
  const bus = reg.buses.get(userId) ?? (await reg.loading.get(userId)?.catch(() => undefined));
  reg.buses.delete(userId);
  reg.loading.delete(userId);
  if (!bus) return;
  bus.dropped = true;
  bus.dirty = false;
  if (bus.saveTimer) clearTimeout(bus.saveTimer);
  bus.saveTimer = null;
  for (const timer of bus.timers.values()) clearTimeout(timer);
  for (const timer of bus.workerTimers.values()) clearTimeout(timer);
  bus.timers.clear();
  bus.workerTimers.clear();
  for (const kick of [...bus.kicks]) kick();
  bus.kicks.clear();
  bus.listeners.clear();
}
