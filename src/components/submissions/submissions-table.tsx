"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { toast } from "sonner";
import type { AssignmentSubmission } from "@/types/database";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { gradeSubmissionAction, getSubmissionFileUrlAction } from "@/app/actions";
import { DownloadAnswerButton } from "@/components/submissions/submission-answer-actions";

function hasAttachment(submission: AssignmentSubmission) {
  return Boolean(submission.file_url?.trim());
}

function hasTextAnswer(submission: AssignmentSubmission) {
  return Boolean(submission.text_answer?.trim());
}

function ViewSubmissionLink({ fileUrl }: { fileUrl: string }) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const url = await getSubmissionFileUrlAction(fileUrl);
          window.open(url, "_blank", "noopener,noreferrer");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Failed to open submission");
        } finally {
          setLoading(false);
        }
      }}
      className="text-sm font-medium text-brand hover:underline disabled:opacity-50"
    >
      {loading ? "Opening..." : "View attachment"}
    </button>
  );
}

function SubmissionContent({ submission }: { submission: AssignmentSubmission }) {
  const showText = hasTextAnswer(submission);
  const showFile = hasAttachment(submission);

  if (!showText && !showFile) {
    return <p className="text-sm text-gray-500">No submission content</p>;
  }

  return (
    <div className="space-y-4">
      {showText && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label className="text-xs uppercase tracking-wide text-gray-500">
              Written answer
            </Label>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/submissions/${submission.id}/answer`}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 transition-colors hover:bg-surface-muted"
              >
                Open full answer
              </Link>
              <DownloadAnswerButton submission={submission} />
            </div>
          </div>
          <div className="mt-1.5 max-h-36 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
              {submission.text_answer}
            </p>
          </div>
        </div>
      )}
      {showFile && (
        <div>
          <Label className="text-xs uppercase tracking-wide text-gray-500">
            Attachment
          </Label>
          <div className="mt-1.5">
            <ViewSubmissionLink fileUrl={submission.file_url!} />
          </div>
        </div>
      )}
    </div>
  );
}

function GradeDialog({ submission }: { submission: AssignmentSubmission }) {
  const [open, setOpen] = useState(false);
  const [marks, setMarks] = useState(submission.obtained_marks?.toString() ?? "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Grade
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Grade Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <SubmissionContent submission={submission} />
            <div>
              <Label>Marks</Label>
              <Input
                type="number"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
              />
            </div>
            <div>
              <Label>Feedback</Label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>
            <Button
              disabled={loading || !marks}
              onClick={async () => {
                setLoading(true);
                try {
                  await gradeSubmissionAction(
                    submission.id,
                    parseInt(marks, 10),
                    feedback
                  );
                  toast.success("Submission graded");
                  setOpen(false);
                  router.refresh();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed");
                } finally {
                  setLoading(false);
                }
              }}
            >
              {loading ? "Saving..." : "Save Grade"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

const columns: ColumnDef<AssignmentSubmission>[] = [
  {
    accessorKey: "user",
    header: "Student",
    cell: ({ row }) => row.original.user?.email ?? row.original.user_id,
  },
  {
    id: "assignment",
    header: "Assignment",
    cell: ({ row }) => {
      const a = row.original.assignment;
      return a?.title ?? row.original.assignment_id;
    },
  },
  {
    accessorKey: "obtained_marks",
    header: "Marks",
    cell: ({ row }) => row.original.obtained_marks ?? "—",
  },
  {
    accessorKey: "submitted_at",
    header: "Submitted",
    cell: ({ row }) =>
      format(new Date(row.original.submitted_at), "MMM d, yyyy"),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <GradeDialog submission={row.original} />,
  },
];

export function SubmissionsTable({
  submissions,
}: {
  submissions: AssignmentSubmission[];
}) {
  return <DataTable columns={columns} data={submissions} />;
}
