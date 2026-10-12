import { getUserSessions, getUserSessionStats } from "@/lib/db/sessions";
import type { SessionStatusFilter } from "@/lib/db/sessions";
import { parsePageParam } from "@/lib/db/pagination";
import { PageHeader } from "@/components/layout/page-header";
import { PageEmpty } from "@/components/page-states";
import { ListPagination } from "@/components/list-pagination";
import { SessionStats } from "@/components/sessions/session-stats";
import { SessionsFilters } from "@/components/sessions/sessions-filters";
import { SessionsTable } from "@/components/sessions/sessions-table";

function parseStatus(value?: string): SessionStatusFilter {
  if (value === "online" || value === "offline" || value === "recent") return value;
  return "all";
}

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status = parseStatus(params.status);
  const page = parsePageParam(params.page);
  const q = params.q?.trim() || undefined;

  let sessionsResult;
  let stats;
  let error: string | null = null;

  try {
    [sessionsResult, stats] = await Promise.all([
      getUserSessions(status, { page, pageSize: 20, search: q }),
      getUserSessionStats(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load user sessions";
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="User Sessions"
          description="Monitor device activity, presence, and app versions across users"
        />
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  const sessions = sessionsResult!.data;
  const hasFilters = Boolean(q || status !== "all");

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Sessions"
        description="Live presence from the mobile app — online when a heartbeat arrived in the last 5 minutes"
      />

      <SessionStats {...stats!} />

      <div className="space-y-4">
        <SessionsFilters initialQuery={q} initialStatus={status} />

        {sessions.length === 0 ? (
          <PageEmpty
            title={hasFilters ? "No matching sessions" : "No sessions yet"}
            description={
              hasFilters
                ? "Try another name, email, or presence filter."
                : "Sessions appear when users open the app and report device info."
            }
          />
        ) : (
          <>
            <SessionsTable sessions={sessions} />
            <ListPagination
              page={sessionsResult!.page}
              totalPages={sessionsResult!.totalPages}
              total={sessionsResult!.total}
              pageSize={sessionsResult!.pageSize}
              searchParams={{
                status: status === "all" ? undefined : status,
                q,
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
