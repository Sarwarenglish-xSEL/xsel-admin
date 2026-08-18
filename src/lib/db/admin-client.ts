import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { hasFullModuleAccess } from "@/lib/permissions";
import type { UserRole } from "@/types/database";

/**
 * Returns the service-role client for superadmin/admin so admin pages can read
 * all rows. Profiles RLS in the mobile schema typically only exposes self.
 */
export async function getAdminDataClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return supabase;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile && hasFullModuleAccess(profile.role as UserRole)) {
    const service = createServiceClient();
    if (service) return service;
  }

  return supabase;
}
