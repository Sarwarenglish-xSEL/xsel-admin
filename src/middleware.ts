import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/login/:path*",
    "/signup",
    "/auth/callback",
    "/auth/callback/:path*",
    "/payment/:path*",
    "/dashboard/:path*",
    "/batches/:path*",
    "/courses/:path*",
    "/users/:path*",
    "/sessions/:path*",
    "/purchases/:path*",
    "/enrollments/:path*",
    "/certificates/:path*",
    "/submissions/:path*",
    "/live/:path*",
  ],
};