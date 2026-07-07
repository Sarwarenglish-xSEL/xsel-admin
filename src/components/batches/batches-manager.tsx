"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type { BatchStatus, CourseBatch, CourseEnrollment, Profile } from "@/types/database";
import {
  createBatchAction,
  createEnrollmentAction,
  deleteBatchAction,
  updateBatchAction,
  updateEnrollmentStatusAction,
} from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

function batchStatusVariant(status: BatchStatus): "default" | "outline" | "success" | "warning" {
  if (status === "active") return "success";
  if (status === "upcoming") return "default";
  if (status === "completed") return "outline";
  return "warning";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return format(new Date(value), "MMM d, yyyy");
}

type BatchFormValues = {
  name: string;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  status: BatchStatus;
  max_seats: string;
};

const emptyForm: BatchFormValues = {
  name: "",
  start_date: "",
  end_date: "",
  registration_deadline: "",
  status: "upcoming",
  max_seats: "",
};

function BatchForm({
  initial,
  onSubmit,
  loading,
  submitLabel,
}: {
  initial?: BatchFormValues;
  onSubmit: (values: BatchFormValues) => Promise<void>;
  loading: boolean;
  submitLabel: string;
}) {
  const [values, setValues] = useState<BatchFormValues>(initial ?? emptyForm);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(values);
      }}
    >
      <div>
        <Label>Batch Name</Label>
        <Input
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          placeholder="e.g. Batch — Jan 2026"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Start Date</Label>
          <Input
            type="datetime-local"
            value={values.start_date}
            onChange={(e) => setValues((v) => ({ ...v, start_date: e.target.value }))}
          />
        </div>
        <div>
          <Label>End Date</Label>
          <Input
            type="datetime-local"
            value={values.end_date}
            onChange={(e) => setValues((v) => ({ ...v, end_date: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Registration Deadline</Label>
          <Input
            type="datetime-local"
            value={values.registration_deadline}
            onChange={(e) =>
              setValues((v) => ({ ...v, registration_deadline: e.target.value }))
            }
          />
        </div>
        <div>
          <Label>Max Seats</Label>
          <Input
            type="number"
            min={1}
            value={values.max_seats}
            onChange={(e) => setValues((v) => ({ ...v, max_seats: e.target.value }))}
            placeholder="Unlimited"
          />
        </div>
      </div>
      <div>
        <Label>Status</Label>
        <Select
          value={values.status}
          onChange={(e) =>
            setValues((v) => ({ ...v, status: e.target.value as BatchStatus }))
          }
        >
          <option value="upcoming">Upcoming</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={loading || !values.name.trim()}>
        {loading ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}

function toFormValues(batch: CourseBatch): BatchFormValues {
  return {
    name: batch.name,
    start_date: batch.start_date?.slice(0, 16) ?? "",
    end_date: batch.end_date?.slice(0, 16) ?? "",
    registration_deadline: batch.registration_deadline?.slice(0, 16) ?? "",
    status: batch.status,
    max_seats: batch.max_seats != null ? String(batch.max_seats) : "",
  };
}

function toBatchPayload(values: BatchFormValues) {
  return {
    name: values.name.trim(),
    start_date: values.start_date ? new Date(values.start_date).toISOString() : null,
    end_date: values.end_date ? new Date(values.end_date).toISOString() : null,
    registration_deadline: values.registration_deadline
      ? new Date(values.registration_deadline).toISOString()
      : null,
    status: values.status,
    max_seats: values.max_seats ? Number(values.max_seats) : null,
  };
}

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

function BatchStudents({
  enrollments,
  users,
  courseId,
  batchId,
}: {
  enrollments: CourseEnrollment[];
  users: Profile[];
  courseId: string;
  batchId: string;
}) {
  const router = useRouter();
  const batchEnrollments = enrollments.filter((e) => e.batch_id === batchId);

  if (batchEnrollments.length === 0) {
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
          {batchEnrollments.length} student{batchEnrollments.length !== 1 ? "s" : ""}
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
            {batchEnrollments.map((enrollment) => (
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

function BatchCard({
  batch,
  courseId,
  enrollments,
  users,
}: {
  batch: CourseBatch;
  courseId: string;
  enrollments: CourseEnrollment[];
  users: Profile[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const seatLabel =
    batch.max_seats != null
      ? `${batch.active_enrollment_count ?? batch.enrollment_count ?? 0} / ${batch.max_seats}`
      : String(batch.enrollment_count ?? 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="truncate">{batch.name}</CardTitle>
            <Badge variant={batchStatusVariant(batch.status)}>{batch.status}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Start: {formatDate(batch.start_date)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              End: {formatDate(batch.end_date)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {seatLabel} students
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-danger hover:bg-danger/5"
            onClick={async () => {
              if (!confirm(`Delete batch "${batch.name}"?`)) return;
              try {
                await deleteBatchAction(batch.id, courseId);
                toast.success("Batch deleted");
                router.refresh();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed to delete");
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="border-t border-gray-100 pt-4">
          <BatchStudents
            enrollments={enrollments}
            users={users}
            courseId={courseId}
            batchId={batch.id}
          />
        </CardContent>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent onClose={() => setEditOpen(false)}>
          <DialogHeader>
            <DialogTitle>Edit Batch</DialogTitle>
          </DialogHeader>
          <BatchForm
            initial={toFormValues(batch)}
            loading={loading}
            submitLabel="Save Batch"
            onSubmit={async (values) => {
              setLoading(true);
              try {
                await updateBatchAction(batch.id, courseId, toBatchPayload(values));
                toast.success("Batch updated");
                setEditOpen(false);
                router.refresh();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed to update");
              } finally {
                setLoading(false);
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function BatchesManager({
  courseId,
  batches,
  enrollments,
  users,
}: {
  courseId: string;
  batches: CourseBatch[];
  enrollments: CourseEnrollment[];
  users: Profile[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const totalStudents = useMemo(
    () => batches.reduce((sum, b) => sum + (b.enrollment_count ?? 0), 0),
    [batches]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">
            Organize students into batches (cohorts). Each batch tracks its own enrollment,
            schedule, and capacity.
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand/5 px-3 py-1.5 font-medium text-brand">
              <GraduationCap className="h-4 w-4" />
              {batches.length} batch{batches.length !== 1 ? "es" : ""}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 font-medium text-gray-700">
              <Users className="h-4 w-4" />
              {totalStudents} total enrollment{totalStudents !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Batch
        </Button>
      </div>

      {batches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <GraduationCap className="mb-3 h-10 w-10 text-gray-300" />
            <p className="font-medium text-gray-900">No batches yet</p>
            <p className="mt-1 max-w-sm text-sm text-gray-500">
              Create your first batch to start enrolling students for this course.
            </p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create First Batch
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {batches.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              courseId={courseId}
              enrollments={enrollments}
              users={users}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        View all batches across courses on the{" "}
        <Link href="/batches" className="text-brand hover:underline">
          Batches overview
        </Link>{" "}
        page.
      </p>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent onClose={() => setCreateOpen(false)}>
          <DialogHeader>
            <DialogTitle>Create New Batch</DialogTitle>
          </DialogHeader>
          <BatchForm
            loading={loading}
            submitLabel="Create Batch"
            onSubmit={async (values) => {
              setLoading(true);
              try {
                await createBatchAction({
                  course_id: courseId,
                  ...toBatchPayload(values),
                });
                toast.success("Batch created");
                setCreateOpen(false);
                router.refresh();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed to create batch");
              } finally {
                setLoading(false);
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
