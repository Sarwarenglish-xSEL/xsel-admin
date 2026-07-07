import { getAssignmentSubmissions, getQuizAttempts } from "@/lib/db/submissions";
import { PageHeader } from "@/components/layout/page-header";
import { SubmissionsView } from "@/components/submissions/submissions-view";

export default async function SubmissionsPage() {
  let submissions;
  let quizAttempts;
  let error: string | null = null;

  try {
    [submissions, quizAttempts] = await Promise.all([
      getAssignmentSubmissions(),
      getQuizAttempts(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load submissions";
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Submissions"
          description="Review assignment submissions and quiz attempts"
        />
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Submissions"
        description="Review assignment submissions and quiz attempts"
      />
      <SubmissionsView submissions={submissions!} quizAttempts={quizAttempts!} />
    </div>
  );
}
