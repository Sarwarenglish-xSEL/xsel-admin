"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import type { CourseEnrollment, Profile } from "@/types/database";
import { createEnrollmentAction, updateEnrollmentStatusAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/layout/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        Enroll Student
      </Button>
      <Dialog open={open} onOpenChange={setOpen} className="max-w-lg">
        <DialogContent
          className="flex w-full max-h-[min(40rem,85vh)] flex-col overflow-hidden p-0"
          onClose={() => setOpen(false)}
        >
          <div className="shrink-0 border-b border-brand/15 brand-gradient px-6 py-5 pr-12 sm:px-7">
            <DialogHeader className="mb-0">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-8 w-1 shrink-0 rounded-full brand-accent-bar" />
                <div>
                  <DialogTitle className="text-xl">Enroll Student in Batch</DialogTitle>
                  <p className="mt-1 text-sm text-brand/70">
                    Add a student to this batch
                  </p>
                </div>
              </div>
            </DialogHeader>
          </div>
          <div className="space-y-5 px-6 py-5 sm:px-7">
            <div>
              <Label>Student</Label>
              <Select className="w-full" value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="">Select student</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name ? `${u.full_name} (${u.email})` : u.email}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex shrink-0 justify-end border-t border-brand/15 bg-white px-6 py-4 sm:px-7">
            <Button
              className="min-w-40"
              disabled={loading || !userId}
              onClick={async () => {
                setLoading(true);
                try {
                  await createEnrollmentAction(userId, courseId, batchId);
                  toast.success("Student enrolled");
                  setUserId("");
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
  const activeCount = enrollments.filter((e) => e.status === "active").length;

  return (
    <Card className="overflow-hidden border-brand/20 shadow-sm">
      <SectionHeader
        title="Batch students"
        description={`${enrollments.length} enrolled · ${activeCount} active`}
        actions={
          <EnrollStudentDialog courseId={courseId} batchId={batchId} users={users} />
        }
      />
      <CardContent className="p-0">
        {enrollments.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/20 text-brand">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-gray-900">No students yet</p>
            <p className="mt-1 max-w-sm text-sm text-gray-500">
              Enroll students into this batch to manage access and attendance.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enrolled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/20 text-xs font-semibold text-brand">
                          {(
                            enrollment.user?.full_name?.[0] ||
                            enrollment.user?.email?.[0] ||
                            "?"
                          ).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">
                            {enrollment.user?.full_name || enrollment.user?.email}
                          </p>
                          {enrollment.user?.full_name && (
                            <p className="truncate text-xs text-gray-500">
                              {enrollment.user.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            enrollment.status === "active" ? "success" : "outline"
                          }
                        >
                          {enrollment.status === "blocked" ? "blocked" : "active"}
                        </Badge>
                        <Select
                          className="w-28"
                          defaultValue={
                            enrollment.status === "blocked" ? "blocked" : "active"
                          }
                          onChange={async (e) => {
                            try {
                              await updateEnrollmentStatusAction(
                                enrollment.id,
                                e.target.value as "active" | "blocked"
                              );
                              toast.success("Status updated");
                              router.refresh();
                            } catch (err) {
                              toast.error(
                                err instanceof Error ? err.message : "Failed"
                              );
                            }
                          }}
                        >
                          <option value="active">Active</option>
                          <option value="blocked">Blocked</option>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {format(new Date(enrollment.created_at), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
