import { format } from "date-fns";
import { notFound } from "next/navigation";
import { getAssignmentSubmissionById } from "@/lib/db/submissions";
import { BackLink } from "@/components/layout/back-link";
import { DownloadAnswerButton } from "@/components/submissions/submission-answer-actions";

export default async function SubmissionAnswerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const submission = await getAssignmentSubmissionById(id);

  if (!submission?.text_answer?.trim()) {
    notFound();
  }

  const assignmentTitle = submission.assignment?.title ?? "Assignment";
  const studentLabel =
    submission.user?.full_name?.trim() ||
    submission.user?.email ||
    submission.user_id;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <BackLink
            href="/submissions"
            className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-surface-muted"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">
              Written answer
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
              {assignmentTitle}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {studentLabel} · Submitted{" "}
              {format(new Date(submission.submitted_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
        <DownloadAnswerButton submission={submission} size="md" />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-gray-800">
          {submission.text_answer}
        </pre>
      </div>
    </div>
  );
}
