import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/db/current-profile";
import { hasFullModuleAccess } from "@/lib/permissions";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns the service-role client for superadmin/admin so admin pages can read
 * all rows. Profiles RLS in the mobile schema typically only exposes self.
 * Cached per request so auth/role is not re-fetched on every DB helper call.
 */
export const getAdminDataClient = cache(async (): Promise<SupabaseClient> => {
  const profile = await getCurrentProfile();
  if (profile && hasFullModuleAccess(profile.role)) {
    const service = createServiceClient();
    if (service) return service;
  }

  return createClient();
});
