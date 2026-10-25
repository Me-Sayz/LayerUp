import { connection } from "next/server";
import { getState } from "@/lib/bus";
import { requireTenant } from "@/lib/tenant";

export async function GET(request: Request): Promise<Response> {
  await connection();
  const tenant = await requireTenant(request, ["session", "overlay", "worker"]);
  if (tenant instanceof Response) return tenant;
  return Response.json(await getState(tenant.userId), {
    headers: { "Cache-Control": "no-store" },
  });
}
