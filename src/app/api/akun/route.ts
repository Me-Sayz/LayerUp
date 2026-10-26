import { dropUser } from "@/lib/bus";
import { createAdminClient, ADMIN_READY } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { forgetTokens, requireTenant } from "@/lib/tenant";

function fail(status: number, error: string): Response {
  return Response.json({ ok: false, error }, { status });
}

export async function DELETE(request: Request): Promise<Response> {
  const tenant = await requireTenant(request, ["session"]);
  if (tenant instanceof Response) return tenant;

  let confirm = "";
  try {
    const body = (await request.json()) as { confirm?: unknown };
    if (typeof body.confirm === "string") confirm = body.confirm.trim().toLowerCase();
  } catch {
    return fail(400, "JSON tidak valid");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data.user;
  if (error || !user || user.id !== tenant.userId || !user.email) return fail(401, "Belum login");
  if (confirm !== user.email.toLowerCase()) return fail(400, "Email konfirmasi tidak cocok");
  if (!ADMIN_READY) return fail(503, "Server belum dikonfigurasi");

  const { error: failure } = await createAdminClient().auth.admin.deleteUser(user.id);
  if (failure) {
    console.error("[akun] gagal menghapus:", failure.message);
    return fail(500, "Akun gagal dihapus. Coba lagi.");
  }

  forgetTokens(user.id);
  await dropUser(user.id);
  return Response.json({ ok: true });
}
