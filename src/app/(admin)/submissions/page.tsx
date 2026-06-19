import { getAssignmentSubmissions } from "@/lib/db/submissions";
import { PageHeader } from "@/components/layout/page-header";
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
      <div className="space-y-6">
        <PageHeader
          title="Assignment Submissions"
          description="Review and grade student work"
        />
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignment Submissions"
        description="Review and grade student work"
      />
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
