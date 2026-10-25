import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_READY } from "@/lib/supabase/env";
import { ConfigError, TOKEN_PATTERN, getStore, type TokenKind } from "@/lib/store";

export type Channel = "session" | "overlay" | "worker";

export interface Tenant {
  userId: string;
  channel: Channel;
}

const CACHE_MS = 60_000;
const holder = globalThis as typeof globalThis & { __layerupTokenCache?: Map<string, { userId: string; expires: number }> };
holder.__layerupTokenCache ??= new Map();
const cache = holder.__layerupTokenCache;

export function forgetTokens(userId: string): void {
  for (const [key, entry] of cache) {
    if (entry.userId === userId) cache.delete(key);
  }
}

async function lookup(kind: TokenKind, token: string): Promise<string | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const key = `${kind}:${token}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.userId;
  const userId = await getStore().findByToken(kind, token);
  if (userId) cache.set(key, { userId, expires: Date.now() + CACHE_MS });
  else cache.delete(key);
  return userId;
}

async function fromSession(): Promise<string | null> {
  if (!SUPABASE_READY) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return typeof sub === "string" && sub !== "" ? sub : null;
}

function bearer(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

function fail(status: number, error: string): Response {
  return Response.json({ ok: false, error }, { status });
}

export async function requireTenant(request: Request, allow: Channel[]): Promise<Tenant | Response> {
  await connection();
  try {
    if (allow.includes("worker")) {
      const token = bearer(request);
      if (token) {
        const userId = await lookup("worker", token);
        return userId ? { userId, channel: "worker" } : fail(401, "Token worker tidak valid");
      }
    }
    if (allow.includes("overlay")) {
      const token = new URL(request.url).searchParams.get("t");
      if (token) {
        const userId = await lookup("overlay", token);
        return userId ? { userId, channel: "overlay" } : fail(401, "Token overlay tidak valid");
      }
    }
    if (allow.includes("session")) {
      const userId = await fromSession();
      if (userId) return { userId, channel: "session" };
    }
    return fail(401, "Belum login");
  } catch (error) {
    if (error instanceof ConfigError) return fail(503, "Server belum dikonfigurasi");
    console.error("[tenant] gagal:", error);
    return fail(500, "Terjadi kesalahan di server");
  }
}
