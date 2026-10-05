import { getAssignmentSubmissions, getQuizAttempts } from "@/lib/db/submissions";
import { parsePageParam } from "@/lib/db/pagination";
import { PageHeader } from "@/components/layout/page-header";
import { ListPagination } from "@/components/list-pagination";
import { SubmissionsView } from "@/components/submissions/submissions-view";

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parsePageParam(pageParam);
  let submissionsResult;
  let quizResult;
  let error: string | null = null;

  try {
    [submissionsResult, quizResult] = await Promise.all([
      getAssignmentSubmissions({ page }),
      getQuizAttempts({ page }),
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
      <SubmissionsView
        submissions={submissionsResult!.data}
        quizAttempts={quizResult!.data}
      />
      <ListPagination
        page={Math.max(submissionsResult!.page, quizResult!.page)}
        totalPages={Math.max(submissionsResult!.totalPages, quizResult!.totalPages)}
        total={Math.max(submissionsResult!.total, quizResult!.total)}
        pageSize={submissionsResult!.pageSize}
      />
    </div>
  );
}
