"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { Course, CourseEnrollment, CourseType, EnrollmentStatus, Profile } from "@/types/database";
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
    cell: ({ row }) => row.original.user?.email ?? row.original.user_id,
  },
  {
    accessorKey: "course",
    header: "Course",
    cell: ({ row }) => row.original.course?.title ?? row.original.course_id,
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
  { accessorKey: "created_at", header: "Enrolled", cell: ({ row }) => format(new Date(row.original.created_at), "MMM d, yyyy") },
];

function EnrollDialog({ users, courses }: { users: Profile[]; courses: Course[] }) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Manual Enroll</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader><DialogTitle>Enroll User in Course</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>User</Label>
              <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="">Select user</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
              </Select>
            </div>
            <div>
              <Label>Course</Label>
              <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="">Select course</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </Select>
            </div>
            <Button className="w-full" disabled={loading || !userId || !courseId} onClick={async () => {
              setLoading(true);
              try {
                await createEnrollmentAction(userId, courseId);
                toast.success("Enrollment created");
                setOpen(false);
                router.refresh();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed");
              } finally { setLoading(false); }
            }}>{loading ? "Enrolling..." : "Create Enrollment"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function EnrollmentsTable({ enrollments, users, courses }: { enrollments: CourseEnrollment[]; users: Profile[]; courses: Course[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><EnrollDialog users={users} courses={courses} /></div>
      <DataTable columns={columns} data={enrollments} />
    </div>
  );
}
