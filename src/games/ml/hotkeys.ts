export const HOTKEY_ACTIONS = ["victory", "defeat", "undo", "match_new"] as const;
export type HotkeyAction = (typeof HOTKEY_ACTIONS)[number];
export type HotkeySettings = Record<HotkeyAction, string>;

export const HOTKEY_LABELS: Record<HotkeyAction, string> = {
  victory: "Victory",
  defeat: "Defeat",
  undo: "Undo",
  match_new: "Match baru",
};

export const DEFAULT_HOTKEYS: HotkeySettings = {
  victory: "ctrl+1",
  defeat: "ctrl+2",
  undo: "ctrl+3",
  match_new: "ctrl+4",
};

const MODIFIERS = ["ctrl", "alt", "shift", "windows"] as const;
type Modifier = (typeof MODIFIERS)[number];

const MODIFIER_ALIASES: Record<string, Modifier> = {
  ctrl: "ctrl",
  control: "ctrl",
  alt: "alt",
  shift: "shift",
  windows: "windows",
  win: "windows",
  meta: "windows",
  cmd: "windows",
  super: "windows",
};

const NAMED_KEYS: Record<string, string> = {
  space: "space",
  enter: "enter",
  tab: "tab",
  home: "home",
  end: "end",
  insert: "insert",
  delete: "delete",
  pageup: "page up",
  "page up": "page up",
  pagedown: "page down",
  "page down": "page down",
  up: "up",
  down: "down",
  left: "left",
  right: "right",
};

const TYPING_KEYS = /^[a-z0-9]$|^space$/;
const FUNCTION_KEY = /^f([1-9]|1[0-9]|2[0-4])$/;
const MAX_COMBO_LENGTH = 40;

function normalizeKey(raw: string): string | null {
  if (/^[a-z0-9]$/.test(raw)) return raw;
  if (FUNCTION_KEY.test(raw)) return raw;
  return NAMED_KEYS[raw] ?? null;
}

export function normalizeCombo(input: string): string | null {
  if (input.length > MAX_COMBO_LENGTH) return null;
  const parts = input
    .toLowerCase()
    .split("+")
    .map((part) => part.trim());
  if (parts.length === 0 || parts.some((part) => part === "")) return null;

  const mods = new Set<Modifier>();
  let key: string | null = null;
  for (const part of parts) {
    const modifier = MODIFIER_ALIASES[part];
    if (modifier) {
      if (mods.has(modifier)) return null;
      mods.add(modifier);
      continue;
    }
    if (key !== null) return null;
    key = normalizeKey(part);
    if (key === null) return null;
  }
  if (key === null) return null;

  const isFunction = FUNCTION_KEY.test(key);
  const hasStrongModifier = mods.has("ctrl") || mods.has("alt") || mods.has("windows");
  if (!isFunction && mods.size === 0) return null;
  if (TYPING_KEYS.test(key) && !hasStrongModifier) return null;

  return [...MODIFIERS.filter((modifier) => mods.has(modifier)), key].join("+");
}

export function formatCombo(combo: string): string {
  return combo
    .split("+")
    .map((part) => {
      if (part === "ctrl") return "Ctrl";
      if (part === "alt") return "Alt";
      if (part === "shift") return "Shift";
      if (part === "windows") return "Win";
      return part.length === 1 ? part.toUpperCase() : part.replace(/\b\w/g, (c) => c.toUpperCase());
    })
    .join(" + ");
}

export function findConflict(hotkeys: Record<HotkeyAction, string>): [HotkeyAction, HotkeyAction] | null {
  const seen = new Map<string, HotkeyAction>();
  for (const action of HOTKEY_ACTIONS) {
    const combo = normalizeCombo(hotkeys[action]);
    if (combo === null) continue;
    const other = seen.get(combo);
    if (other) return [other, action];
    seen.set(combo, action);
  }
  return null;
}

export function sameHotkeys(a: HotkeySettings, b: HotkeySettings): boolean {
  return HOTKEY_ACTIONS.every((action) => a[action] === b[action]);
}

export function parseHotkeys(value: unknown): HotkeySettings | null {
  if (value === undefined) return { ...DEFAULT_HOTKEYS };
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const result = { ...DEFAULT_HOTKEYS };
  for (const action of HOTKEY_ACTIONS) {
    const item = input[action];
    if (item === undefined) continue;
    if (typeof item !== "string") return null;
    const combo = normalizeCombo(item);
    if (combo === null) return null;
    result[action] = combo;
  }
  return findConflict(result) ? null : result;
}

export interface KeyLike {
  code: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

const CODE_NAMES: Record<string, string> = {
  Space: "space",
  Enter: "enter",
  Tab: "tab",
  Home: "home",
  End: "end",
  Insert: "insert",
  Delete: "delete",
  PageUp: "page up",
  PageDown: "page down",
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

const MODIFIER_CODES = /^(Control|Alt|Shift|Meta|OS)(Left|Right)$/;

function keyFromCode(code: string): string | null {
  const letter = /^Key([A-Z])$/.exec(code);
  if (letter) return letter[1].toLowerCase();
  const digit = /^Digit([0-9])$/.exec(code);
  if (digit) return digit[1];
  const fn = /^F([0-9]{1,2})$/.exec(code);
  if (fn) return `f${fn[1]}`;
  return CODE_NAMES[code] ?? null;
}

export type CaptureResult = { combo: string } | { error: string } | null;

export function comboFromKeyEvent(event: KeyLike): CaptureResult {
  if (MODIFIER_CODES.test(event.code)) return null;
  const key = keyFromCode(event.code);
  if (key === null) return { error: "Tombol itu belum didukung. Coba huruf, angka, F1-F24, atau panah." };
  const parts: string[] = [];
  if (event.ctrlKey) parts.push("ctrl");
  if (event.altKey) parts.push("alt");
  if (event.shiftKey) parts.push("shift");
  if (event.metaKey) parts.push("windows");
  parts.push(key);
  const combo = normalizeCombo(parts.join("+"));
  if (combo === null) return { error: "Pakai Ctrl, Alt, atau Win bersama tombolnya (F1-F24 boleh sendiri)." };
  return { combo };
}
