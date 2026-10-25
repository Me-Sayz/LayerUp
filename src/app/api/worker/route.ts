import { reportWorker } from "@/lib/bus";
import { requireTenant } from "@/lib/tenant";

const MAX_BODY_BYTES = 4 * 1024;
const MAX_HOTKEYS = 16;
const MAX_COMBO_LENGTH = 40;

function fail(status: number, error: string): Response {
  return Response.json({ ok: false, error }, { status });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readHotkeys(value: unknown): Record<string, string> | null {
  if (value === undefined) return {};
  if (!isPlainObject(value)) return null;
  const entries = Object.entries(value);
  if (entries.length > MAX_HOTKEYS) return null;
  const result: Record<string, string> = {};
  for (const [action, combo] of entries) {
    if (typeof combo !== "string" || combo.length > MAX_COMBO_LENGTH) return null;
    result[action] = combo;
  }
  return result;
}

export async function POST(request: Request): Promise<Response> {
  const tenant = await requireTenant(request, ["worker"]);
  if (tenant instanceof Response) return tenant;

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return fail(415, "Content-Type harus application/json");
  }

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return fail(413, "Isi terlalu besar");
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return fail(400, "JSON tidak valid");
  }
  if (!isPlainObject(body)) {
    return fail(400, "Bentuk laporan tidak valid");
  }

  const { game, hotkeys, offline } = body;
  if (typeof game !== "string" || game.length === 0 || game.length > 32) {
    return fail(400, "Game tidak valid");
  }
  if (offline !== undefined && typeof offline !== "boolean") {
    return fail(400, "Bentuk laporan tidak valid");
  }
  const parsedHotkeys = readHotkeys(hotkeys);
  if (parsedHotkeys === null) {
    return fail(400, "Hotkey tidak valid");
  }

  const result = await reportWorker(tenant.userId, game, { online: offline !== true, hotkeys: parsedHotkeys });
  if (!result.ok) {
    return fail(result.status, result.error);
  }
  return Response.json({ ok: true });
}
