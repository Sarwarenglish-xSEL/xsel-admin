"use client";

import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import type { QuizAttempt } from "@/types/database";
import { getQuizAttemptDetailAction } from "@/app/actions";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function optionLabel(option: string) {
  return option.toUpperCase();
}

function ViewAttemptDialog({ attempt }: { attempt: QuizAttempt }) {
  const [open, setOpen] = useState(false);
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
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        View
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)} className="max-h-[85vh] overflow-y-auto">
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
    cell: ({ row }) => <ViewAttemptDialog attempt={row.original} />,
  },
];

export function QuizAttemptsTable({ attempts }: { attempts: QuizAttempt[] }) {
  return <DataTable columns={columns} data={attempts} pageSize={20} hidePagination />;
}
