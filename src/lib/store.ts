import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { ADMIN_READY, createAdminClient } from "@/lib/supabase/admin";
import type { AppState, GameId } from "./types";

export type TokenKind = "overlay" | "worker";

export interface Profile {
  userId: string;
  overlayToken: string;
  workerToken: string;
}

export interface GameBlob {
  state: unknown;
  settings: unknown;
}

export interface Store {
  ensureProfile(userId: string): Promise<Profile>;
  findByToken(kind: TokenKind, token: string): Promise<string | null>;
  regenerate(userId: string, kind: TokenKind): Promise<Profile>;
  loadGames(userId: string): Promise<Record<GameId, GameBlob>>;
  saveGame(userId: string, gameId: GameId, blob: GameBlob): Promise<void>;
}

export class ConfigError extends Error {}

export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,64}$/;

const COLUMN: Record<TokenKind, "overlay_token" | "worker_token"> = {
  overlay: "overlay_token",
  worker: "worker_token",
};

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

interface ProfileRow {
  user_id: string;
  overlay_token: string;
  worker_token: string;
}

function toProfile(row: ProfileRow): Profile {
  return { userId: row.user_id, overlayToken: row.overlay_token, workerToken: row.worker_token };
}

// SECTION: STORE SUPABASE
function createSupabaseStore(): Store {
  const db = createAdminClient();

  async function readProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await db.from("profiles").select("*").eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toProfile(data as ProfileRow) : null;
  }

  return {
    async ensureProfile(userId) {
      const existing = await readProfile(userId);
      if (existing) return existing;
      const { error } = await db
        .from("profiles")
        .upsert({ user_id: userId, overlay_token: newToken(), worker_token: newToken() }, { onConflict: "user_id", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
      const created = await readProfile(userId);
      if (!created) throw new Error("Profil gagal dibuat");
      return created;
    },

    async findByToken(kind, token) {
      const { data, error } = await db.from("profiles").select("user_id").eq(COLUMN[kind], token).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? String((data as { user_id: string }).user_id) : null;
    },

    async regenerate(userId, kind) {
      await this.ensureProfile(userId);
      const { data, error } = await db
        .from("profiles")
        .update({ [COLUMN[kind]]: newToken() })
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return toProfile(data as ProfileRow);
    },

    async loadGames(userId) {
      const { data, error } = await db.from("game_data").select("game_id,state,settings").eq("user_id", userId);
      if (error) throw new Error(error.message);
      const result: Record<GameId, GameBlob> = {};
      for (const row of (data ?? []) as { game_id: string; state: unknown; settings: unknown }[]) {
        result[row.game_id] = { state: row.state, settings: row.settings };
      }
      return result;
    },

    async saveGame(userId, gameId, blob) {
      const { error } = await db.from("game_data").upsert(
        { user_id: userId, game_id: gameId, state: blob.state ?? null, settings: blob.settings ?? null, updated_at: new Date().toISOString() },
        { onConflict: "user_id,game_id" },
      );
      if (error) throw new Error(error.message);
    },
  };
}
// END STORE SUPABASE

// SECTION: STORE MEMORI
function createMemoryStore(): Store {
  const profiles = new Map<string, Profile>();
  const games = new Map<string, GameBlob>();

  return {
    async ensureProfile(userId) {
      let profile = profiles.get(userId);
      if (!profile) {
        profile = { userId, overlayToken: newToken(), workerToken: newToken() };
        profiles.set(userId, profile);
      }
      return profile;
    },
    async findByToken(kind, token) {
      for (const profile of profiles.values()) {
        const value = kind === "overlay" ? profile.overlayToken : profile.workerToken;
        if (value === token) return profile.userId;
      }
      return null;
    },
    async regenerate(userId, kind) {
      const profile = await this.ensureProfile(userId);
      const next = { ...profile, ...(kind === "overlay" ? { overlayToken: newToken() } : { workerToken: newToken() }) };
      profiles.set(userId, next);
      return next;
    },
    async loadGames(userId) {
      const result: Record<GameId, GameBlob> = {};
      for (const [key, blob] of games) {
        const [owner, gameId] = key.split("|");
        if (owner === userId) result[gameId] = blob;
      }
      return result;
    },
    async saveGame(userId, gameId, blob) {
      games.set(`${userId}|${gameId}`, JSON.parse(JSON.stringify(blob)) as GameBlob);
    },
  };
}
// END STORE MEMORI

const holder = globalThis as typeof globalThis & { __layerupStore?: Store };

export function getStore(): Store {
  if (holder.__layerupStore) return holder.__layerupStore;
  let store: Store;
  if (process.env.LAYERUP_STORE === "memory") {
    store = createMemoryStore();
  } else if (ADMIN_READY) {
    store = createSupabaseStore();
  } else {
    throw new ConfigError("SUPABASE_SERVICE_ROLE_KEY belum diisi");
  }
  holder.__layerupStore = store;
  return store;
}

// SECTION: IMPOR DATA LAMA
const LEGACY_FILE = path.join(process.cwd(), "data", "state.json");

export async function takeLegacyState(): Promise<AppState | null> {
  if (process.env.LAYERUP_IMPORT_LEGACY !== "1") return null;
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(LEGACY_FILE, "utf8"));
    if (typeof parsed !== "object" || parsed === null) return null;
    const games = (parsed as { games?: unknown }).games;
    if (typeof games !== "object" || games === null || Array.isArray(games)) return null;
    await fs.rename(LEGACY_FILE, `${LEGACY_FILE}.imported`);
    return parsed as AppState;
  } catch {
    return null;
  }
}
// END IMPOR DATA LAMA
