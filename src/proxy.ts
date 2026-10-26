import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_READY, SUPABASE_URL } from "@/lib/supabase/env";

const PUBLIC_PATHS = new Set(["/login", "/lupa-sandi", "/syarat", "/privasi"]);

function redirectTo(request: NextRequest, path: string, from?: Response) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";
  const response = NextResponse.redirect(url);
  from?.headers.getSetCookie().forEach((cookie) => response.headers.append("set-cookie", cookie));
  return response;
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.has(path);
  if (!SUPABASE_READY) return isPublic ? NextResponse.next() : redirectTo(request, "/login");

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        for (const { name, value } of items) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of items) response.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims);

  if (!loggedIn && !isPublic) return redirectTo(request, "/login", response);
  if (loggedIn && path === "/login") return redirectTo(request, "/", response);
  return response;
}

export const config = {
  matcher: ["/((?!api|overlay|auth|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|webp|jpg|jpeg|ico)$).*)"],
};
