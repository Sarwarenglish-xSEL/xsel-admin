import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth")
  );
}

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;

  // Payment is a standalone public page — never apply admin portal auth rules.
  if (path.startsWith("/payment")) {
    return response;
  }

  // Auth callback routes must not be redirected away while session is established.
  if (path.startsWith("/auth/callback")) {
    return response;
  }

  const isAuthPage =
    path === "/login" ||
    path === "/signup" ||
    path === "/login/update-password";

  // No session cookie → nothing to refresh; avoids a Supabase round-trip on every login page load.
  if (isAuthPage && !hasSupabaseAuthCookie(request)) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Missing/invalid env on Vercel throws inside createServerClient and surfaces as
  // MIDDLEWARE_INVOCATION_FAILED — fail open so the page can still load.
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
    return response;
  }

  let user = null;
  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const { data, error } = await supabase.auth.getUser();
    if (error) {
      // Invalid/expired session — treat as signed out unless network error below.
      user = null;
    } else {
      user = data.user;
    }
  } catch (err) {
    // Transient network/DNS failures (e.g. EAI_AGAIN) should not 500 the site.
    if (process.env.NODE_ENV === "development") {
      const msg = err instanceof Error ? err.message : "unknown";
      console.warn(
        `[middleware] Supabase auth unreachable (${msg}); continuing without session refresh.`
      );
    }
    return response;
  }

  if (!user && !isAuthPage && path.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage && path !== "/login/update-password") {
    const next = request.nextUrl.searchParams.get("next");
    const url = request.nextUrl.clone();
    url.pathname = next?.startsWith("/payment/") ? next : "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
