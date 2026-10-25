import { kickOverlays } from "@/lib/bus";
import { ConfigError, getStore, type Profile, type TokenKind } from "@/lib/store";
import { forgetTokens, requireTenant } from "@/lib/tenant";

function fail(status: number, error: string): Response {
  return Response.json({ ok: false, error }, { status });
}

function view(profile: Profile): Response {
  return Response.json(
    { ok: true, overlayToken: profile.overlayToken, workerToken: profile.workerToken },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function fromError(error: unknown): Response {
  if (error instanceof ConfigError) return fail(503, "Server belum dikonfigurasi");
  console.error("[token] gagal:", error);
  return fail(500, "Terjadi kesalahan di server");
}

export async function GET(request: Request): Promise<Response> {
  const tenant = await requireTenant(request, ["session"]);
  if (tenant instanceof Response) return tenant;
  try {
    return view(await getStore().ensureProfile(tenant.userId));
  } catch (error) {
    return fromError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  const tenant = await requireTenant(request, ["session"]);
  if (tenant instanceof Response) return tenant;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "JSON tidak valid");
  }
  const kind = typeof body === "object" && body !== null ? (body as { kind?: unknown }).kind : undefined;
  if (kind !== "overlay" && kind !== "worker") return fail(400, "Jenis token tidak valid");

  try {
    const profile = await getStore().regenerate(tenant.userId, kind as TokenKind);
    forgetTokens(tenant.userId);
    if (kind === "overlay") await kickOverlays(tenant.userId);
    return view(profile);
  } catch (error) {
    return fromError(error);
  }
}
