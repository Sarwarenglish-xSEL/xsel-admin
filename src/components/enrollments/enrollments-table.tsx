"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import type {
  Course,
  CourseBatch,
  CourseEnrollment,
  CourseType,
  EnrollmentStatus,
  Profile,
} from "@/types/database";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createEnrollmentAction, updateEnrollmentStatusAction } from "@/app/actions";

function formatCourseType(type?: CourseType) {
  if (type === "live") return "Live";
  if (type === "prerecorded") return "Pre-recorded";
  return "—";
}

function StatusSelect({ enrollment }: { enrollment: CourseEnrollment }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  return (
    <Select
      className="w-32"
      defaultValue={enrollment.status === "blocked" ? "blocked" : "active"}
      disabled={loading}
      onChange={async (e) => {
        setLoading(true);
        try {
          await updateEnrollmentStatusAction(
            enrollment.id,
            e.target.value as EnrollmentStatus
          );
          toast.success("Status updated");
          router.refresh();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed");
        } finally {
          setLoading(false);
        }
      }}
    >
      <option value="active">Active</option>
      <option value="blocked">Blocked</option>
    </Select>
  );
}

const columns: ColumnDef<CourseEnrollment>[] = [
  {
    accessorKey: "user",
    header: "User",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.user?.email ?? row.original.user_id}</p>
        {row.original.user?.full_name && (
          <p className="text-xs text-gray-500">{row.original.user.full_name}</p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "course",
    header: "Course",
    cell: ({ row }) => row.original.course?.title ?? row.original.course_id,
  },
  {
    id: "batch",
    header: "Batch",
    cell: ({ row }) => (
      <span className="text-sm text-gray-700">
        {row.original.batch?.name ?? "—"}
      </span>
    ),
  },
  {
    id: "course_type",
    header: "Course Type",
    cell: ({ row }) => (
      <Badge variant="outline">{formatCourseType(row.original.course?.course_type)}</Badge>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusSelect enrollment={row.original} />,
  },
  {
    accessorKey: "created_at",
    header: "Enrolled",
    cell: ({ row }) => format(new Date(row.original.created_at), "MMM d, yyyy"),
  },
];

function EnrollDialog({
  users,
  courses,
  batches,
}: {
  users: Profile[];
  courses: Course[];
  batches: CourseBatch[];
}) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const courseBatches = useMemo(
    () => batches.filter((b) => b.course_id === courseId),
    [batches, courseId]
  );

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Manual Enroll
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Enroll User in Batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>User</Label>
              <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="">Select user</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name ? `${u.full_name} (${u.email})` : u.email}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Course</Label>
              <Select
                value={courseId}
                onChange={(e) => {
                  setCourseId(e.target.value);
                  setBatchId("");
                }}
              >
                <option value="">Select course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Batch</Label>
              <Select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                disabled={!courseId}
              >
                <option value="">
                  {courseId
                    ? courseBatches.length
                      ? "Select batch"
                      : "No batches — create one on the Batches page"
                    : "Select a course first"}
                </option>
                {courseBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.enrollment_count != null ? ` (${b.enrollment_count} enrolled)` : ""}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={loading || !userId || !courseId || !batchId}
              onClick={async () => {
                setLoading(true);
                try {
                  await createEnrollmentAction(userId, courseId, batchId);
                  toast.success("Enrollment created");
                  setOpen(false);
                  router.refresh();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed");
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

function EnrollmentFilters({
  courses,
  batches,
  initialCourseId,
  initialBatchId,
}: {
  courses: Course[];
  batches: CourseBatch[];
  initialCourseId?: string;
  initialBatchId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [courseId, setCourseId] = useState(initialCourseId ?? "");
  const [batchId, setBatchId] = useState(initialBatchId ?? "");

  const courseBatches = useMemo(
    () => batches.filter((b) => !courseId || b.course_id === courseId),
    [batches, courseId]
  );

  function applyFilters(nextCourse: string, nextBatch: string) {
    const params = new URLSearchParams();
    if (nextCourse) params.set("course", nextCourse);
    if (nextBatch) params.set("batch", nextBatch);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const hasFilters = Boolean(courseId || batchId);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-brand/10 bg-white p-4 shadow-sm">
      <div className="min-w-[180px] flex-1">
        <Label>Course</Label>
        <Select
          value={courseId}
          onChange={(e) => {
            const next = e.target.value;
            setCourseId(next);
            setBatchId("");
            applyFilters(next, "");
          }}
        >
          <option value="">All courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </Select>
      </div>
      <div className="min-w-[180px] flex-1">
        <Label>Batch</Label>
        <Select
          value={batchId}
          onChange={(e) => {
            const next = e.target.value;
            setBatchId(next);
            const batch = batches.find((b) => b.id === next);
            const nextCourse = batch?.course_id ?? courseId;
            if (batch) setCourseId(batch.course_id);
            applyFilters(nextCourse, next);
          }}
        >
          <option value="">All batches</option>
          {courseBatches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.course?.title ? `${b.course.title} — ` : ""}
              {b.name}
            </option>
          ))}
        </Select>
      </div>
      {hasFilters && (
        <Button
          variant="outline"
          onClick={() => {
            setCourseId("");
            setBatchId("");
            applyFilters("", "");
          }}
        >
          <X className="h-4 w-4" /> Clear
        </Button>
      )}
    </div>
  );
}

export function EnrollmentsTable({
  enrollments,
  users,
  courses,
  batches,
  initialCourseId,
  initialBatchId,
}: {
  enrollments: CourseEnrollment[];
  users: Profile[];
  courses: Course[];
  batches: CourseBatch[];
  initialCourseId?: string;
  initialBatchId?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <EnrollmentFilters
          courses={courses}
          batches={batches}
          initialCourseId={initialCourseId}
          initialBatchId={initialBatchId}
        />
        <EnrollDialog users={users} courses={courses} batches={batches} />
      </div>
      <DataTable columns={columns} data={enrollments} />
    </div>
  );
}
