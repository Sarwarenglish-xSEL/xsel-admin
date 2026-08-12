import { getUserSessions, getUserSessionStats } from "@/lib/db/sessions";
import type { SessionStatusFilter } from "@/lib/db/sessions";
import { PageHeader } from "@/components/layout/page-header";
import { PageEmpty } from "@/components/page-states";
import { SessionStats } from "@/components/sessions/session-stats";
import { SessionsTable } from "@/components/sessions/sessions-table";

function parseStatus(value?: string): SessionStatusFilter {
  if (value === "online" || value === "offline") return value;
  return "all";
}

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const status = parseStatus(statusParam);

  let sessions;
  let stats;
  let error: string | null = null;

  try {
    [sessions, stats] = await Promise.all([
      getUserSessions(status),
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Sessions"
        description="Monitor device activity, presence, and app versions across users"
      />

      <SessionStats {...stats!} />

      {sessions!.length === 0 && status === "all" ? (
        <PageEmpty
          title="No sessions found"
          description="User sessions will appear here once the app reports device activity."
        />
      ) : (
        <SessionsTable sessions={sessions!} status={status} />
      )}
    </div>
  );
}
