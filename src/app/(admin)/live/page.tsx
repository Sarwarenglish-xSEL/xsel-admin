import { getUpcomingLiveLessons } from "@/lib/db/chapters";
import { LiveSessionsList } from "@/components/live/live-sessions-list";
import { PageHeader } from "@/components/layout/page-header";

export default async function LivePage() {
  let lessons;
  let error: string | null = null;

  try {
    lessons = await getUpcomingLiveLessons();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load live sessions";
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Live Sessions"
          description="Upcoming live lessons across all courses"
        />
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Sessions"
        description="Upcoming live lessons across all courses"
      />
      <LiveSessionsList lessons={lessons!} />
    </div>
  );
}
