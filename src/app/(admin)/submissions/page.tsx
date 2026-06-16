import { getAssignmentSubmissions } from "@/lib/db/submissions";
import { SubmissionsTable } from "@/components/submissions/submissions-table";
import { PageEmpty } from "@/components/page-states";

export default async function SubmissionsPage() {
  let submissions;
  let error: string | null = null;

  try {
    submissions = await getAssignmentSubmissions();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load submissions";
  }

  if (error) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">Submissions</h1>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Assignment Submissions</h1>
        <p className="text-muted-foreground">Review and grade student work</p>
      </div>
      {submissions!.length === 0 ? (
        <PageEmpty
          title="No submissions"
          description="Student assignment submissions will appear here."
        />
      ) : (
        <SubmissionsTable submissions={submissions!} />
      )}
    </div>
  );
}
