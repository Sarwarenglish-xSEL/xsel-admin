"use client";

import { useState } from "react";
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
      className="text-sm text-brand hover:underline disabled:opacity-50"
    >
      {loading ? "Opening..." : "View submission"}
    </button>
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
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Grade Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>File</Label>
              <ViewSubmissionLink fileUrl={submission.file_url} />
            </div>
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
