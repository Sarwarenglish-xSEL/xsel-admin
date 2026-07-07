"use client";

import Link from "next/link";
import { format } from "date-fns";
import { BookOpen, Calendar, ChevronRight, Pencil, Users } from "lucide-react";
import type { BatchStatus, CourseBatch } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

type CourseGroup = {
  courseId: string;
  courseTitle: string;
  courseType?: string;
  courseStatus?: string;
  batches: CourseBatch[];
  totalStudents: number;
};

export function BatchesOverview({ batches }: { batches: CourseBatch[] }) {
  const groups: CourseGroup[] = [];

  const byCourse = new Map<string, CourseBatch[]>();
  for (const batch of batches) {
    const list = byCourse.get(batch.course_id) ?? [];
    list.push(batch);
    byCourse.set(batch.course_id, list);
  }

  for (const [courseId, courseBatches] of byCourse) {
    const course = courseBatches[0]?.course;
    groups.push({
      courseId,
      courseTitle: course?.title ?? "Unknown Course",
      courseType: course?.course_type,
      courseStatus: course?.status,
      batches: courseBatches,
      totalStudents: courseBatches.reduce((sum, b) => sum + (b.enrollment_count ?? 0), 0),
    });
  }

  groups.sort((a, b) => a.courseTitle.localeCompare(b.courseTitle));

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-900">No batches found</p>
          <p className="mt-1 max-w-md text-sm text-gray-500">
            Create a batch to manage its own chapters, lessons, schedule, and student enrollment.
          </p>
        </CardContent>
      </Card>
    );
  }

  const flatBatches = groups
    .flatMap((group) =>
      group.batches.map((batch) => ({
        batch,
        courseId: group.courseId,
        courseTitle: group.courseTitle,
        courseType: group.courseType,
        courseStatus: group.courseStatus,
      }))
    )
    .sort((a, b) => {
      const byCourse = a.courseTitle.localeCompare(b.courseTitle);
      if (byCourse !== 0) return byCourse;
      return a.batch.name.localeCompare(b.batch.name);
    });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {flatBatches.map(({ batch, courseId, courseTitle, courseType, courseStatus }) => {
        const seatLabel =
          batch.max_seats != null
            ? `${batch.enrollment_count ?? 0} / ${batch.max_seats}`
            : String(batch.enrollment_count ?? 0);

        return (
          <div key={batch.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <Link
                  href={`/courses/${courseId}/edit`}
                  className="block truncate text-lg font-semibold text-gray-900 hover:text-brand"
                >
                  {courseTitle}
                </Link>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  {courseType && <Badge variant="outline">{courseType}</Badge>}
                  {courseStatus && (
                    <Badge variant={courseStatus === "published" ? "default" : "outline"}>
                      {courseStatus}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{batch.name}</CardTitle>
                  <Badge variant={batchStatusVariant(batch.status)}>{batch.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500">Students</p>
                    <p className="mt-0.5 flex items-center gap-1 font-semibold text-gray-900">
                      <Users className="h-3.5 w-3.5 text-brand" />
                      {seatLabel}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500">Active</p>
                    <p className="mt-0.5 font-semibold text-gray-900">
                      {batch.active_enrollment_count ?? 0}
                    </p>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-gray-500">
                  <p className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Start: {formatDate(batch.start_date)}
                  </p>
                  <p className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Reg. deadline: {formatDate(batch.registration_deadline)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Link
                    href={`/batches/${batch.id}/edit`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Manage content
                  </Link>
                  <Link
                    href={`/enrollments?batch=${batch.id}`}
                    className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-brand"
                  >
                    Enrollments <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
