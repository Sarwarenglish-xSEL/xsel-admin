import {
  countAssignmentSubmissions,
  countQuizAttempts,
  getAssignmentSubmissions,
  getQuizAttempts,
} from "@/lib/db/submissions";
import { parsePageParam } from "@/lib/db/pagination";
import { PageHeader } from "@/components/layout/page-header";
import { ListPagination } from "@/components/list-pagination";
import { ListSearch } from "@/components/list-search";
import { SubmissionsView } from "@/components/submissions/submissions-view";

function parseTab(value?: string): "assignments" | "quizzes" {
  return value === "quizzes" ? "quizzes" : "assignments";
}

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const page = parsePageParam(params.page);
  const q = params.q?.trim() || undefined;
  const tab = parseTab(params.tab);
  const listParams = { page, search: q, pageSize: 20 };
  let submissionsResult;
  let quizResult;
  let assignmentTotal = 0;
  let quizTotal = 0;
  let error: string | null = null;

  try {
    if (tab === "quizzes") {
      [quizResult, assignmentTotal] = await Promise.all([
        getQuizAttempts(listParams),
        countAssignmentSubmissions(q),
      ]);
      quizTotal = quizResult.total;
      submissionsResult = {
        data: [],
        total: assignmentTotal,
        page: 1,
        pageSize: listParams.pageSize,
        totalPages: Math.max(1, Math.ceil(assignmentTotal / listParams.pageSize)),
      };
    } else {
      [submissionsResult, quizTotal] = await Promise.all([
        getAssignmentSubmissions(listParams),
        countQuizAttempts(q),
      ]);
      assignmentTotal = submissionsResult.total;
      quizResult = {
        data: [],
        total: quizTotal,
        page: 1,
        pageSize: listParams.pageSize,
        totalPages: Math.max(1, Math.ceil(quizTotal / listParams.pageSize)),
      };
    }
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

  const activeResult = tab === "quizzes" ? quizResult! : submissionsResult!;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Submissions"
        description="Review assignment submissions and quiz attempts"
      />
      <div className="space-y-4">
        <ListSearch
          initialQuery={q}
          placeholder="Search by student, assignment, or quiz..."
          preserveParams={{ tab: tab === "assignments" ? undefined : tab }}
          suggestScope="submissions"
        />
        <SubmissionsView
          submissions={submissionsResult!.data}
          quizAttempts={quizResult!.data}
          assignmentTotal={assignmentTotal}
          quizTotal={quizTotal}
          activeTab={tab}
          searchQuery={q}
        />
        <ListPagination
          page={activeResult.page}
          totalPages={activeResult.totalPages}
          total={activeResult.total}
          pageSize={activeResult.pageSize}
          searchParams={{
            q,
            tab: tab === "assignments" ? undefined : tab,
          }}
        />
      </div>
    </div>
  );
}
