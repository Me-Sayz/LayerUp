import type { SendResult } from "@/lib/send-event";
import type { GameId } from "@/lib/types";

const SETTINGS_URL = "/api/settings";
const TIMEOUT_MS = 5000;

function readError(body: unknown, status: number): string {
  if (typeof body === "object" && body !== null && "error" in body) {
    const { error } = body as { error: unknown };
    if (typeof error === "string" && error) return error;
  }
  return `Server menolak (kode ${status})`;
}

export async function sendSettings(game: GameId, settings: unknown): Promise<SendResult> {
  let response: Response;
  try {
    response = await fetch(SETTINGS_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game, settings }),
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
