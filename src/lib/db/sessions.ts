import { getAdminDataClient } from "@/lib/db/admin-client";
import {
  normalizePage,
  normalizePageSize,
  pageRange,
  toPaginatedResult,
  type PaginatedResult,
} from "@/lib/db/pagination";
import { getSessionOnlineCutoffIso } from "@/lib/sessions/presence";
import type { Profile, UserSession } from "@/types/database";

export type SessionStatusFilter = "all" | "online" | "offline" | "recent";

export type UserSessionWithProfile = UserSession & {
  user: Profile | null;
};

async function findUserIdsBySearch(search: string): Promise<string[] | null> {
  const supabase = await getAdminDataClient();
  const term = `%${search.trim()}%`;
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .or(`email.ilike.${term},full_name.ilike.${term}`);
  if (error) throw error;
  const ids = (data ?? []).map((row) => row.id as string);
  return ids.length ? ids : null;
}

export async function getUserSessions(
  status: SessionStatusFilter = "all",
  pageParams?: { page?: number; pageSize?: number; search?: string }
): Promise<PaginatedResult<UserSessionWithProfile>> {
  const supabase = await getAdminDataClient();
  const page = normalizePage(pageParams?.page);
  const pageSize = normalizePageSize(pageParams?.pageSize ?? 20);
  const { from, to } = pageRange(page, pageSize);
  const cutoff = getSessionOnlineCutoffIso();
  const search = pageParams?.search?.trim();

  if (search) {
    const userIds = await findUserIdsBySearch(search);
    if (!userIds) {
      return toPaginatedResult([], 0, page, pageSize);
    }

    let query = supabase
      .from("user_sessions")
      .select("*", { count: "exact" })
      .in("user_id", userIds)
      .order("last_seen_at", { ascending: false })
      .range(from, to);

    if (status === "online") {
      query = query.eq("is_online", true).gte("last_seen_at", cutoff);
    } else if (status === "recent") {
      query = query.eq("is_online", false).gte("last_seen_at", cutoff);
    } else if (status === "offline") {
      query = query.lt("last_seen_at", cutoff);
    }

    const { data: sessions, error, count } = await query;
    if (error) throw error;
    return attachProfiles(supabase, (sessions ?? []) as UserSession[], count ?? 0, page, pageSize);
  }

  let query = supabase
    .from("user_sessions")
    .select("*", { count: "exact" })
    .order("last_seen_at", { ascending: false })
    .range(from, to);

  if (status === "online") {
    query = query.eq("is_online", true).gte("last_seen_at", cutoff);
  } else if (status === "recent") {
    query = query.eq("is_online", false).gte("last_seen_at", cutoff);
  } else if (status === "offline") {
    query = query.lt("last_seen_at", cutoff);
  }

  const { data: sessions, error, count } = await query;
  if (error) throw error;

  return attachProfiles(supabase, (sessions ?? []) as UserSession[], count ?? 0, page, pageSize);
}

async function attachProfiles(
  supabase: Awaited<ReturnType<typeof getAdminDataClient>>,
  rows: UserSession[],
  count: number,
  page: number,
  pageSize: number
): Promise<PaginatedResult<UserSessionWithProfile>> {
  if (rows.length === 0) {
    return toPaginatedResult([], count, page, pageSize);
  }

  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, role, registered_device_model, registered_os, registered_app_version"
    )
    .in("id", userIds);

  if (profilesError) throw profilesError;

  const profileById = new Map(
    ((profiles ?? []) as Profile[]).map((profile) => [profile.id, profile])
  );

  const data = rows.map((session) => ({
    ...session,
    user: profileById.get(session.user_id) ?? null,
  }));

  return toPaginatedResult(data, count, page, pageSize);
}

export async function getUserSessionStats() {
  const supabase = await getAdminDataClient();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const cutoff = getSessionOnlineCutoffIso();

  const [total, online, recent, activeLast24h] = await Promise.all([
    supabase.from("user_sessions").select("user_id", { count: "exact", head: true }),
    supabase
      .from("user_sessions")
      .select("user_id", { count: "exact", head: true })
      .eq("is_online", true)
      .gte("last_seen_at", cutoff),
    supabase
      .from("user_sessions")
      .select("user_id", { count: "exact", head: true })
      .eq("is_online", false)
      .gte("last_seen_at", cutoff),
    supabase
      .from("user_sessions")
      .select("user_id", { count: "exact", head: true })
      .gte("last_seen_at", dayAgo),
  ]);

  if (total.error) throw total.error;
  if (online.error) throw online.error;
  if (recent.error) throw recent.error;
  if (activeLast24h.error) throw activeLast24h.error;

  const totalCount = total.count ?? 0;
  const onlineCount = online.count ?? 0;
  const recentCount = recent.count ?? 0;

  return {
    total: totalCount,
    online: onlineCount,
    recent: recentCount,
    offline: Math.max(totalCount - onlineCount - recentCount, 0),
    activeLast24h: activeLast24h.count ?? 0,
  };
}
