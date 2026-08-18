import { createClient } from "@/lib/supabase/server";
import { getAdminDataClient } from "@/lib/db/admin-client";
import type { Profile, UserSession } from "@/types/database";

export type SessionStatusFilter = "all" | "online" | "offline";

export type UserSessionWithProfile = UserSession & {
  user: Profile | null;
};

export async function getUserSessions(
  status: SessionStatusFilter = "all"
): Promise<UserSessionWithProfile[]> {
  const supabase = await getAdminDataClient();

  let query = supabase
    .from("user_sessions")
    .select("*")
    .order("last_seen_at", { ascending: false });

  if (status === "online") query = query.eq("is_online", true);
  if (status === "offline") query = query.eq("is_online", false);

  const { data: sessions, error } = await query;
  if (error) throw error;

  const rows = (sessions ?? []) as UserSession[];
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .in("id", userIds);

  if (profilesError) throw profilesError;

  const profileById = new Map(
    ((profiles ?? []) as Profile[]).map((profile) => [profile.id, profile])
  );

  return rows.map((session) => ({
    ...session,
    user: profileById.get(session.user_id) ?? null,
  }));
}

export async function getUserSessionStats() {
  const supabase = await createClient();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [total, online, recent] = await Promise.all([
    supabase.from("user_sessions").select("user_id", { count: "exact", head: true }),
    supabase
      .from("user_sessions")
      .select("user_id", { count: "exact", head: true })
      .eq("is_online", true),
    supabase
      .from("user_sessions")
      .select("user_id", { count: "exact", head: true })
      .gte("last_seen_at", dayAgo),
  ]);

  if (total.error) throw total.error;
  if (online.error) throw online.error;
  if (recent.error) throw recent.error;

  const totalCount = total.count ?? 0;
  const onlineCount = online.count ?? 0;

  return {
    total: totalCount,
    online: onlineCount,
    offline: Math.max(totalCount - onlineCount, 0),
    activeLast24h: recent.count ?? 0,
  };
}
