import type { GameEvent, GameId } from "@/lib/types";

const EVENTS_URL = "/api/events";
const TIMEOUT_MS = 5000;

export type SendResult = { ok: true } | { ok: false; error: string };

function readError(body: unknown, status: number): string {
  if (typeof body === "object" && body !== null && "error" in body) {
    const { error } = body as { error: unknown };
    if (typeof error === "string" && error) return error;
  }
  return `Server menolak (kode ${status})`;
}

export async function sendEvent(
  game: GameId,
  type: string,
  payload?: Record<string, unknown>,
): Promise<SendResult> {
  const event: GameEvent = { game, type, payload, source: "panel" };

  let response: Response;
  try {
    response = await fetch(EVENTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return { ok: false, error: "Server tidak terjangkau" };
  }

  if (response.ok) return { ok: true };

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { ok: false, error: readError(body, response.status) };
}