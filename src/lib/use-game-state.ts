"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { AppState, GameEffect, GameId, StreamMessage } from "@/lib/types";

const STREAM_URL = "/api/stream";
const RETRY_MS = 2000;

type Snapshot = { state: AppState | null; connected: boolean };
type EffectListener = (game: GameId, effect: GameEffect) => void;

let snapshot: Snapshot = { state: null, connected: false };
let source: EventSource | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retainers = 0;
const snapshotListeners = new Set<() => void>();
const effectListeners = new Set<EffectListener>();

function setSnapshot(next: Snapshot): void {
  snapshot = next;
  snapshotListeners.forEach((listener) => listener());
}

function parseMessage(raw: string): StreamMessage | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const msg = data as Record<string, unknown>;
  const isObject = (v: unknown) => typeof v === "object" && v !== null;
  if (msg.kind === "state" && isObject(msg.state)) return data as StreamMessage;
  if (msg.kind === "effect" && typeof msg.game === "string" && isObject(msg.effect)) {
    return data as StreamMessage;
  }
  return null;
}

function connect(): void {
  if (source) return;
  const es = new EventSource(STREAM_URL);
  source = es;

  es.onopen = () => {
    if (!snapshot.connected) setSnapshot({ ...snapshot, connected: true });
  };

  es.onerror = () => {
    if (snapshot.connected) setSnapshot({ ...snapshot, connected: false });
    if (es.readyState !== EventSource.CLOSED) return;
    es.close();
    source = null;
    if (retainers > 0 && retryTimer === null) {
      retryTimer = setTimeout(() => {
        retryTimer = null;
        if (retainers > 0) connect();
      }, RETRY_MS);
    }
  };

  es.onmessage = (event) => {
    const msg = parseMessage(String(event.data));
    if (!msg) return;
    if (msg.kind === "state") {
      setSnapshot({ state: msg.state, connected: true });
    } else {
      effectListeners.forEach((listener) => listener(msg.game, msg.effect));
    }
  };
}

function disconnect(): void {
  if (retryTimer !== null) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  source?.close();
  source = null;
  if (snapshot.connected) setSnapshot({ ...snapshot, connected: false });
}

function retain(): () => void {
  retainers += 1;
  connect();
  return () => {
    retainers -= 1;
    if (retainers === 0) disconnect();
  };
}

function subscribeSnapshot(listener: () => void): () => void {
  snapshotListeners.add(listener);
  const release = retain();
  return () => {
    snapshotListeners.delete(listener);
    release();
  };
}

export function useStreamConnected(): boolean {
  return useSyncExternalStore(
    subscribeSnapshot,
    () => snapshot.connected,
    () => false,
  );
}

export function useGameState<S>(game: GameId): S | null {
  const state = useSyncExternalStore(
    subscribeSnapshot,
    () => snapshot.state,
    () => null,
  );
  if (!state) return null;
  return (state.games[game] as S | undefined) ?? null;
}

export function useGameSettings<T>(game: GameId): T | null {
  const state = useSyncExternalStore(
    subscribeSnapshot,
    () => snapshot.state,
    () => null,
  );
  const value = state?.settings?.[game];
  return (value as T | undefined) ?? null;
}

export function useGameEffects(game: GameId, handler: (effect: GameEffect) => void): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const listener: EffectListener = (id, effect) => {
      if (id === game) handlerRef.current(effect);
    };
    effectListeners.add(listener);
    const release = retain();
    return () => {
      effectListeners.delete(listener);
      release();
    };
  }, [game]);
}
