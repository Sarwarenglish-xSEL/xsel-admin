import { getUserSessions, getUserSessionStats } from "@/lib/db/sessions";
import type { SessionStatusFilter } from "@/lib/db/sessions";
import { parsePageParam } from "@/lib/db/pagination";
import { PageHeader } from "@/components/layout/page-header";
import { PageEmpty } from "@/components/page-states";
import { ListPagination } from "@/components/list-pagination";
import { SessionStats } from "@/components/sessions/session-stats";
import { SessionsTable } from "@/components/sessions/sessions-table";

function parseStatus(value?: string): SessionStatusFilter {
  if (value === "online" || value === "offline") return value;
  return "all";
}

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status: statusParam, page: pageParam } = await searchParams;
  const status = parseStatus(statusParam);
  const page = parsePageParam(pageParam);

  let sessionsResult;
  let stats;
  let error: string | null = null;

  try {
    [sessionsResult, stats] = await Promise.all([
      getUserSessions(status, { page }),
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Sessions"
        description="Monitor device activity, presence, and app versions across users"
      />

      <SessionStats {...stats!} />

      {sessions.length === 0 && status === "all" && page === 1 ? (
        <PageEmpty
          title="No sessions found"
          description="User sessions will appear here once the app reports device activity."
        />
      ) : (
        <div className="space-y-4">
          <SessionsTable sessions={sessions} status={status} />
          <ListPagination
            page={sessionsResult!.page}
            totalPages={sessionsResult!.totalPages}
            total={sessionsResult!.total}
            pageSize={sessionsResult!.pageSize}
            searchParams={{ status: status === "all" ? undefined : status }}
          />
        </div>
      )}
    </div>
  );
}
