"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserMinus } from "lucide-react";
import { toast } from "sonner";
import type { CourseEnrollment } from "@/types/database";
import { deleteEnrollmentAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function UnenrollButton({
  enrollment,
  showCourse = false,
}: {
  enrollment: CourseEnrollment;
  showCourse?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const studentLabel =
    enrollment.user?.full_name?.trim() ||
    enrollment.user?.email ||
    "this student";
  const courseTitle = enrollment.course?.title;
  const batchName = enrollment.batch?.name;

  async function handleUnenroll() {
    setLoading(true);
    try {
      const result = await deleteEnrollmentAction(enrollment.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Student unenrolled");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to unenroll");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-danger hover:bg-danger/5 hover:text-danger"
        onClick={() => setOpen(true)}
      >
        <UserMinus className="h-3.5 w-3.5" />
        Unenroll
      </Button>

      <Dialog open={open} onOpenChange={setOpen} className="max-w-md">
        <DialogContent onClose={() => setOpen(false)} className="max-w-md">
          <DialogHeader>
            <DialogTitle>Unenroll student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-1 pb-1">
            <p className="text-sm text-gray-600">
              Are you sure you want to unenroll{" "}
              <span className="font-semibold text-brand-dark">{studentLabel}</span>
              {showCourse && courseTitle ? (
                <>
                  {" "}
                  from{" "}
                  <span className="font-semibold text-brand-dark">{courseTitle}</span>
                </>
              ) : null}
              {batchName ? (
                <>
                  {" "}
                  in{" "}
                  <span className="font-semibold text-brand-dark">{batchName}</span>
                </>
              ) : null}
              ? They will lose access to this batch.
            </p>
            <p className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">
              This removes the enrollment permanently. You can enroll them again
              later if needed.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={loading}
                onClick={handleUnenroll}
              >
                <UserMinus className="h-3.5 w-3.5" />
                {loading ? "Unenrolling..." : "Unenroll"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
