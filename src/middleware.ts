import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/signup",
    "/payment/:path*",
    "/dashboard/:path*",
    "/courses/:path*",
    "/users/:path*",
    "/purchases/:path*",
    "/enrollments/:path*",
    "/certificates/:path*",
    "/submissions/:path*",
    "/live/:path*",
  ],
};