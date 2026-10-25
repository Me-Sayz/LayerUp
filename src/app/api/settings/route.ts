import { updateSettings } from "@/lib/bus";
import { requireTenant } from "@/lib/tenant";

const MAX_BODY_BYTES = 16 * 1024;

function fail(status: number, error: string): Response {
  return Response.json({ ok: false, error }, { status });
}

export async function PUT(request: Request): Promise<Response> {
  const tenant = await requireTenant(request, ["session"]);
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

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return fail(400, "Bentuk pengaturan tidak valid");
  }
  const { game, settings } = body as { game?: unknown; settings?: unknown };
  if (typeof game !== "string" || game.length === 0 || game.length > 32) {
    return fail(400, "Game tidak valid");
  }

  const result = await updateSettings(tenant.userId, game, settings);
  if (!result.ok) {
    return fail(result.status, result.error);
  }
  return Response.json({ ok: true });
}
