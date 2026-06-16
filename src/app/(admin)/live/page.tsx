import { getUpcomingLiveLessons } from "@/lib/db/chapters";
import { LiveSessionsList } from "@/components/live/live-sessions-list";

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
      <div>
        <h1 className="mb-6 text-2xl font-bold">Live Sessions</h1>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Live Sessions</h1>
        <p className="text-muted-foreground">
          Upcoming live lessons across all courses
        </p>
      </div>
      <LiveSessionsList lessons={lessons!} />
    </div>
  );
}
