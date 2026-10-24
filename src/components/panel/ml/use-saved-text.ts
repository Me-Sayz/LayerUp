"use client";

import { useSyncExternalStore } from "react";
import { LIMITS } from "@/games/ml/state";

const STORAGE_KEY = "layerup.teks";
const RECENT_MAX = 5;

export interface SavedText {
  text: string;
  recent: string[];
}

const EMPTY: SavedText = { text: "", recent: [] };
const listeners = new Set<() => void>();
let cache: SavedText | null = null;

function clean(value: unknown): SavedText {
  if (typeof value !== "object" || value === null) return EMPTY;
  const input = value as { text?: unknown; recent?: unknown };
  const text = typeof input.text === "string" ? input.text.slice(0, LIMITS.customText) : "";
  const recent = Array.isArray(input.recent)
    ? input.recent.filter((item): item is string => typeof item === "string" && item.trim() !== "").slice(0, RECENT_MAX)
    : [];
  return { text, recent };
}

function load(): SavedText {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? clean(JSON.parse(raw)) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function snapshot(): SavedText {
  cache ??= load();
  return cache;
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

function write(next: SavedText): void {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // penyimpanan diblokir: tetap berfungsi selama halaman terbuka
  }
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSavedText(): SavedText {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

export function setSavedText(text: string): void {
  write({ ...snapshot(), text: text.slice(0, LIMITS.customText) });
}

export function rememberText(text: string): void {
  const value = text.trim().slice(0, LIMITS.customText);
  if (!value) return;
  const current = snapshot();
  const recent = [value, ...current.recent.filter((item) => item !== value)].slice(0, RECENT_MAX);
  write({ text: current.text, recent });
}
