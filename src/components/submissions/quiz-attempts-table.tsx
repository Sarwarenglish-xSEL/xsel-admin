"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import type { QuizAttempt } from "@/types/database";
import {
  deleteQuizAttemptAction,
  getQuizAttemptDetailAction,
  updateQuizAttemptAction,
} from "@/app/actions";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function optionLabel(option: string) {
  return option.toUpperCase();
}

function ViewAttemptDialog({
  attempt,
  open,
  onOpenChange,
}: {
  attempt: QuizAttempt;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [detail, setDetail] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setDetail(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getQuizAttemptDetailAction(attempt.id)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load attempt");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, attempt.id]);

  const view = detail ?? attempt;
  const quiz = view.quiz;
  const totalMarks = quiz?.total_marks ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{quiz?.title ?? "Quiz Attempt"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">Student</p>
              <p className="font-medium text-gray-900">
                {view.user?.email ?? view.user_id}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">Score</p>
              <p className="font-medium text-gray-900">
                {view.obtained_marks} / {totalMarks}
              </p>
            </div>
          </div>

          {loading && !detail ? (
            <p className="text-sm text-gray-500">Loading answers...</p>
          ) : error ? (
            <p className="text-sm text-danger">{error}</p>
          ) : (
            <div className="space-y-3">
              {(view.answers ?? []).map((answer, index) => {
                const question = answer.question;
                if (!question) return null;

                const options = {
                  a: question.option_a,
                  b: question.option_b,
                  c: question.option_c,
                  d: question.option_d,
                };

                return (
                  <div
                    key={answer.id}
                    className="rounded-lg border border-gray-200 p-3 text-sm"
                  >
                    <p className="font-medium text-gray-900">
                      {index + 1}. {question.question}
                    </p>
                    <p className="mt-2 text-gray-600">
                      Selected: {optionLabel(answer.selected_option)} —{" "}
                      {options[answer.selected_option]}
                    </p>
                    <p className="mt-1 text-gray-500">
                      Correct: {optionLabel(question.correct_option)} —{" "}
                      {options[question.correct_option]}
                    </p>
                    {question.reason && (
                      <p className="mt-1 text-gray-500">
                        Reason: {question.reason}
                      </p>
                    )}
                    <Badge
                      variant={answer.is_correct ? "success" : "warning"}
                      className="mt-2"
                    >
                      {answer.is_correct ? "Correct" : "Incorrect"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditAttemptDialog({
  attempt,
  open,
  onOpenChange,
}: {
  attempt: QuizAttempt;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [marks, setMarks] = useState(attempt.obtained_marks.toString());
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const totalMarks = attempt.quiz?.total_marks ?? 0;
  const passingMarks = attempt.quiz?.passing_marks ?? 0;

  useEffect(() => {
    if (open) {
      setMarks(attempt.obtained_marks.toString());
    }
  }, [open, attempt.obtained_marks]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Edit Quiz Attempt</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
            <p className="text-xs text-gray-500">Student</p>
            <p className="font-medium text-gray-900">
              {attempt.user?.email ?? attempt.user_id}
            </p>
            <p className="mt-2 text-xs text-gray-500">Quiz</p>
            <p className="font-medium text-gray-900">
              {attempt.quiz?.title ?? attempt.quiz_id}
            </p>
          </div>
          <div>
            <Label>
              Marks{totalMarks > 0 ? ` (max ${totalMarks})` : ""}
            </Label>
            <Input
              type="number"
              min={0}
              max={totalMarks || undefined}
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
            />
            {passingMarks > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                Passing mark: {passingMarks}. Pass status updates automatically.
              </p>
            )}
          </div>
          <Button
            disabled={loading || marks.trim() === ""}
            onClick={async () => {
              setLoading(true);
              try {
                const obtainedMarks = parseInt(marks, 10);
                if (Number.isNaN(obtainedMarks) || obtainedMarks < 0) {
                  toast.error("Enter a valid marks value");
                  return;
                }
                if (totalMarks > 0 && obtainedMarks > totalMarks) {
                  toast.error(`Marks cannot exceed ${totalMarks}`);
                  return;
                }

                await updateQuizAttemptAction(attempt.id, {
                  obtained_marks: obtainedMarks,
                  is_passed: obtainedMarks >= passingMarks,
                });
                toast.success("Quiz attempt updated");
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

function AttemptActions({ attempt }: { attempt: QuizAttempt }) {
  const [viewOpen, setViewOpen] = useState(false);
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
        <DropdownMenuItem onClick={() => setViewOpen(true)}>
          <Eye className="h-4 w-4" /> View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-danger hover:bg-danger/5"
          disabled={deleting}
          onClick={async () => {
            const label =
              attempt.user?.email ?? attempt.quiz?.title ?? "this attempt";
            if (
              !confirm(
                `Delete quiz attempt from ${label}? This permanently removes the attempt and answers.`
              )
            ) {
              return;
            }

            setDeleting(true);
            try {
              await deleteQuizAttemptAction(attempt.id);
              toast.success("Quiz attempt deleted");
              router.refresh();
            } catch (e) {
              toast.error(
                e instanceof Error ? e.message : "Failed to delete quiz attempt"
              );
            } finally {
              setDeleting(false);
            }
          }}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenu>
      <ViewAttemptDialog
        attempt={attempt}
        open={viewOpen}
        onOpenChange={setViewOpen}
      />
      <EditAttemptDialog
        attempt={attempt}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}

const columns: ColumnDef<QuizAttempt>[] = [
  {
    accessorKey: "user",
    header: "Student",
    cell: ({ row }) => row.original.user?.email ?? row.original.user_id,
  },
  {
    id: "quiz",
    header: "Quiz",
    cell: ({ row }) => row.original.quiz?.title ?? row.original.quiz_id,
  },
  {
    id: "marks",
    header: "Marks",
    cell: ({ row }) => {
      const total = row.original.quiz?.total_marks ?? 0;
      return `${row.original.obtained_marks} / ${total}`;
    },
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
    cell: ({ row }) => <AttemptActions attempt={row.original} />,
  },
];

export function QuizAttemptsTable({ attempts }: { attempts: QuizAttempt[] }) {
  return <DataTable columns={columns} data={attempts} pageSize={20} hidePagination />;
}
