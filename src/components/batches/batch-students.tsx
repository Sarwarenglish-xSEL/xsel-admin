"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { CourseEnrollment, Profile } from "@/types/database";
import { createEnrollmentAction, updateEnrollmentStatusAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

function EnrollStudentDialog({
  courseId,
  batchId,
  users,
}: {
  courseId: string;
  batchId: string;
  users: Profile[];
}) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> Enroll Student
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Enroll Student in Batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Student</Label>
              <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="">Select student</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name ? `${u.full_name} (${u.email})` : u.email}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={loading || !userId}
              onClick={async () => {
                setLoading(true);
                try {
                  await createEnrollmentAction(userId, courseId, batchId);
                  toast.success("Student enrolled");
                  setOpen(false);
                  router.refresh();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed to enroll");
                } finally {
                  setLoading(false);
                }
              }}
            >
              {loading ? "Enrolling..." : "Create Enrollment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function BatchStudents({
  courseId,
  batchId,
  enrollments,
  users,
}: {
  courseId: string;
  batchId: string;
  enrollments: CourseEnrollment[];
  users: Profile[];
}) {
  const router = useRouter();

  if (enrollments.length === 0) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-4 py-6">
        <p className="text-sm text-gray-500">No students enrolled in this batch yet.</p>
        <EnrollStudentDialog courseId={courseId} batchId={batchId} users={users} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          {enrollments.length} student{enrollments.length !== 1 ? "s" : ""}
        </p>
        <EnrollStudentDialog courseId={courseId} batchId={batchId} users={users} />
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2.5">Student</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Enrolled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {enrollments.map((enrollment) => (
              <tr key={enrollment.id} className="bg-white">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-gray-900">
                    {enrollment.user?.full_name || enrollment.user?.email}
                  </p>
                  {enrollment.user?.full_name && (
                    <p className="text-xs text-gray-500">{enrollment.user.email}</p>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <Select
                    className="w-28"
                    defaultValue={enrollment.status === "blocked" ? "blocked" : "active"}
                    onChange={async (e) => {
                      try {
                        await updateEnrollmentStatusAction(
                          enrollment.id,
                          e.target.value as "active" | "blocked"
                        );
                        toast.success("Status updated");
                        router.refresh();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Failed");
                      }
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                  </Select>
                </td>
                <td className="px-4 py-2.5 text-gray-600">
                  {format(new Date(enrollment.created_at), "MMM d, yyyy")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
