"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { CourseEnrollment, CourseType, EnrollmentStatus } from "@/types/database";
import type { BatchFilterOption, CourseFilterOption } from "@/lib/db/catalog";
import { useLazyProfileOptions } from "@/components/use-lazy-profile-options";
import { DataTable } from "@/components/data-table";
import { ListSearch } from "@/components/list-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
  courses,
  batches,
}: {
  courses: CourseFilterOption[];
  batches: BatchFilterOption[];
}) {
  const [open, setOpen] = useState(false);
  const { users, loading: usersLoading, error: usersError } =
    useLazyProfileOptions(open);
  const [userId, setUserId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const courseBatches = useMemo(
    () => batches.filter((b) => b.course_id === courseId),
    [batches, courseId]
  );

  const userOptions = useMemo(
    () =>
      users.map((u) => ({
        value: u.id,
        label: u.full_name?.trim() || u.email,
        detail: u.full_name?.trim() ? u.email : undefined,
      })),
    [users]
  );

  function resetForm() {
    setUserId("");
    setCourseId("");
    setBatchId("");
    setLoading(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetForm();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Manual Enroll
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange} className="max-w-xl">
        <DialogContent
          className="flex w-full max-h-[min(40rem,85vh)] flex-col overflow-hidden p-0"
          onClose={() => handleOpenChange(false)}
        >
          <div className="shrink-0 border-b border-brand/15 brand-gradient px-6 py-5 pr-12 sm:px-7">
            <DialogHeader className="mb-0">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-8 w-1 shrink-0 rounded-full brand-accent-bar" />
                <div>
                  <DialogTitle className="text-xl">Enroll User in Batch</DialogTitle>
                  <p className="mt-1 text-sm text-brand/70">
                    Add a student to a course batch
                  </p>
                </div>
              </div>
            </DialogHeader>
          </div>
          <div className="brand-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5 sm:px-7">
            <div className="space-y-2">
              <Label>User</Label>
              {usersError ? (
                <p className="text-sm text-danger">{usersError}</p>
              ) : (
                <SearchableSelect
                  value={userId}
                  onChange={setUserId}
                  options={userOptions}
                  placeholder={usersLoading ? "Loading students..." : "Select a student"}
                  searchPlaceholder="Type a name or email..."
                  emptyText={usersLoading ? "Loading..." : "No students found"}
                  disabled={usersLoading}
                />
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Course</Label>
                <Select
                  className="w-full"
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
              <div className="space-y-2">
                <Label>Batch</Label>
                <Select
                  className="w-full"
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
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 justify-end border-t border-brand/15 bg-surface px-6 py-4 sm:px-7">
            <Button
              className="min-w-40"
              disabled={loading || !userId || !courseId || !batchId}
              onClick={async () => {
                setLoading(true);
                try {
                  await createEnrollmentAction(userId, courseId, batchId);
                  toast.success("Enrollment created");
                  handleOpenChange(false);
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
  initialQuery,
  actions,
}: {
  courses: CourseFilterOption[];
  batches: BatchFilterOption[];
  initialCourseId?: string;
  initialBatchId?: string;
  initialQuery?: string;
  actions?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [courseId, setCourseId] = useState(initialCourseId ?? "");
  const [batchId, setBatchId] = useState(initialBatchId ?? "");

  useEffect(() => {
    setCourseId(initialCourseId ?? "");
    setBatchId(initialBatchId ?? "");
  }, [initialCourseId, initialBatchId]);

  const courseBatches = useMemo(
    () => batches.filter((b) => !courseId || b.course_id === courseId),
    [batches, courseId]
  );

  function applyFilters(nextCourse: string, nextBatch: string) {
    const params = new URLSearchParams();
    if (nextCourse) params.set("course", nextCourse);
    if (nextBatch) params.set("batch", nextBatch);
    if (initialQuery) params.set("q", initialQuery);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const hasFilters = Boolean(courseId || batchId || initialQuery);

  return (
    <div className="overflow-hidden rounded-xl border border-brand/20 bg-surface shadow-sm">
      <div className="flex flex-col gap-3 border-b border-brand/10 bg-brand/[0.03] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
        <ListSearch
          initialQuery={initialQuery}
          placeholder="Search by student, course, or batch..."
          preserveParams={{
            course: courseId || undefined,
            batch: batchId || undefined,
          }}
          suggestScope="enrollments"
          className="w-full max-w-none sm:max-w-md"
        />
        {actions ? (
          <div className="shrink-0 self-stretch sm:self-auto [&_button]:w-full sm:[&_button]:w-auto">
            {actions}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-end sm:gap-3 sm:px-5">
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0 space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-brand/55">
              Course
            </Label>
            <Select
              className="w-full"
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
          <div className="min-w-0 space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-brand/55">
              Batch
            </Label>
            <Select
              className="w-full"
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
        </div>
        {hasFilters ? (
          <Button
            variant="outline"
            className="shrink-0"
            onClick={() => {
              setCourseId("");
              setBatchId("");
              router.push(pathname);
            }}
          >
            <X className="h-4 w-4" /> Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function EnrollmentsTable({
  enrollments,
  courses,
  batches,
  initialCourseId,
  initialBatchId,
  initialQuery,
}: {
  enrollments: CourseEnrollment[];
  courses: CourseFilterOption[];
  batches: BatchFilterOption[];
  initialCourseId?: string;
  initialBatchId?: string;
  initialQuery?: string;
}) {
  return (
    <div className="space-y-4">
      <EnrollmentFilters
        courses={courses}
        batches={batches}
        initialCourseId={initialCourseId}
        initialBatchId={initialBatchId}
        initialQuery={initialQuery}
        actions={<EnrollDialog courses={courses} batches={batches} />}
      />
      {enrollments.length > 0 && (
        <DataTable columns={columns} data={enrollments} pageSize={20} hidePagination />
      )}
    </div>
  );
}
