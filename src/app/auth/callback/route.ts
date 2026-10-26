import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_NEXT = new Set(["/", "/atur-sandi", "/akun"]);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const requested = params.get("next") ?? "/";
  const next = ALLOWED_NEXT.has(requested) ? requested : "/";
  const failPath = next === "/atur-sandi" ? "/lupa-sandi" : "/login";

  const target = request.nextUrl.clone();
  target.search = "";

  const fail = (expired: boolean) => {
    target.pathname = failPath;
    target.search = expired ? "link=kedaluwarsa" : "";
    return NextResponse.redirect(target);
  };

  const code = params.get("code");
  if (params.get("error") || params.get("error_code")) return fail(true);
  if (!code) return fail(false);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail(true);

  target.pathname = next;
  return NextResponse.redirect(target);
}
