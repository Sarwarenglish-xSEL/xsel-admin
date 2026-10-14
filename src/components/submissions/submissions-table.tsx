"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  deleteAssignmentSubmissionAction,
  getAssignmentSubmissionDetailAction,
  getSubmissionFileUrlAction,
  updateAssignmentSubmissionAction,
} from "@/app/actions";
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

function EditSubmissionDialog({
  submission,
  open,
  onOpenChange,
}: {
  submission: AssignmentSubmission;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [detail, setDetail] = useState<AssignmentSubmission | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [marks, setMarks] = useState(submission.obtained_marks?.toString() ?? "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [textAnswer, setTextAnswer] = useState(submission.text_answer ?? "");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!open) {
      setDetail(null);
      setDetailError(null);
      return;
    }

    setMarks(submission.obtained_marks?.toString() ?? "");
    setFeedback(submission.feedback ?? "");
    setTextAnswer(submission.text_answer ?? "");

    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);

    getAssignmentSubmissionDetailAction(submission.id)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        if (data) {
          setMarks(data.obtained_marks?.toString() ?? "");
          setFeedback(data.feedback ?? "");
          setTextAnswer(data.text_answer ?? "");
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setDetailError(e instanceof Error ? e.message : "Failed to load submission");
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, submission]);

  const view = detail ?? submission;
  const maxMarks = view.assignment?.max_marks;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-2xl">
      <DialogContent onClose={() => onOpenChange(false)} className="w-full">
        <DialogHeader>
          <DialogTitle>Edit Submission</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {detailLoading && !detail ? (
            <p className="text-sm text-gray-500">Loading submission...</p>
          ) : detailError ? (
            <p className="text-sm text-danger">{detailError}</p>
          ) : (
            <>
              <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <p className="text-xs text-gray-500">Student</p>
                <p className="font-medium text-gray-900">
                  {view.user?.email ?? view.user_id}
                </p>
                <p className="mt-2 text-xs text-gray-500">Assignment</p>
                <p className="font-medium text-gray-900">
                  {view.assignment?.title ?? view.assignment_id}
                </p>
              </div>

              {hasAttachment(view) && (
                <div>
                  <Label className="text-xs uppercase tracking-wide text-gray-500">
                    Attachment
                  </Label>
                  <div className="mt-1.5">
                    <ViewSubmissionLink fileUrl={view.file_url!} />
                  </div>
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label>Written answer</Label>
                  {hasTextAnswer(view) && (
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/submissions/${view.id}/answer`}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-200 bg-surface px-3 text-xs font-medium text-gray-700 transition-colors hover:bg-surface-muted"
                      >
                        Open full answer
                      </Link>
                      <DownloadAnswerButton submission={view} />
                    </div>
                  )}
                </div>
                <Textarea
                  className="mt-1.5 min-h-28"
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="No written answer"
                />
              </div>
            </>
          )}

          <div>
            <Label>
              Marks{maxMarks != null ? ` (max ${maxMarks})` : ""}
            </Label>
            <Input
              type="number"
              min={0}
              max={maxMarks ?? undefined}
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
            disabled={loading || detailLoading}
            onClick={async () => {
              setLoading(true);
              try {
                const obtainedMarks =
                  marks.trim() === "" ? null : parseInt(marks, 10);
                if (obtainedMarks != null && Number.isNaN(obtainedMarks)) {
                  toast.error("Enter a valid marks value");
                  return;
                }
                if (
                  obtainedMarks != null &&
                  maxMarks != null &&
                  obtainedMarks > maxMarks
                ) {
                  toast.error(`Marks cannot exceed ${maxMarks}`);
                  return;
                }

                const nextText = textAnswer.trim() || null;
                if (!nextText && !hasAttachment(view)) {
                  toast.error(
                    "Keep a written answer or attachment — submissions cannot be empty"
                  );
                  return;
                }

                await updateAssignmentSubmissionAction(submission.id, {
                  obtained_marks: obtainedMarks,
                  feedback: feedback.trim() || null,
                  text_answer: nextText,
                });
                toast.success("Submission updated");
                onOpenChange(false);
                router.refresh();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed");
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SubmissionActions({ submission }: { submission: AssignmentSubmission }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  return (
    <>
      <DropdownMenu
        trigger={
          <Button variant="ghost" size="icon" disabled={deleting}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        }
      >
        <DropdownMenuItem onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-danger hover:bg-danger/5"
          disabled={deleting}
          onClick={async () => {
            const label =
              submission.user?.email ??
              submission.assignment?.title ??
              "this submission";
            if (
              !confirm(
                `Delete submission from ${label}? This permanently removes the submission and cannot be undone.`
              )
            ) {
              return;
            }

            setDeleting(true);
            try {
              await deleteAssignmentSubmissionAction(submission.id);
              toast.success("Submission deleted");
              router.refresh();
            } catch (e) {
              toast.error(
                e instanceof Error ? e.message : "Failed to delete submission"
              );
            } finally {
              setDeleting(false);
            }
          }}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenu>
      <EditSubmissionDialog
        submission={submission}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
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
    cell: ({ row }) => <SubmissionActions submission={row.original} />,
  },
];

export function SubmissionsTable({
  submissions,
}: {
  submissions: AssignmentSubmission[];
}) {
  return <DataTable columns={columns} data={submissions} pageSize={20} hidePagination />;
}
