"use client";

import Link from "next/link";
import { format } from "date-fns";
import { BookOpen, Calendar, ChevronRight, Users } from "lucide-react";
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
            Create batches from a course edit page to organize students by cohort and track
            enrollment per batch.
          </p>
          <Link
            href="/courses"
            className="mt-4 text-sm font-medium text-brand hover:underline"
          >
            Go to Courses →
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.courseId} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <Link
                  href={`/courses/${group.courseId}/edit`}
                  className="text-lg font-semibold text-gray-900 hover:text-brand"
                >
                  {group.courseTitle}
                </Link>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  {group.courseType && (
                    <Badge variant="outline">{group.courseType}</Badge>
                  )}
                  {group.courseStatus && (
                    <Badge variant={group.courseStatus === "published" ? "default" : "outline"}>
                      {group.courseStatus}
                    </Badge>
                  )}
                  <span>
                    {group.batches.length} batch{group.batches.length !== 1 ? "es" : ""}
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {group.totalStudents} students
                  </span>
                </div>
              </div>
            </div>
            <Link
              href={`/courses/${group.courseId}/edit`}
              className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
            >
              Manage batches <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {group.batches.map((batch) => {
              const seatLabel =
                batch.max_seats != null
                  ? `${batch.enrollment_count ?? 0} / ${batch.max_seats}`
                  : String(batch.enrollment_count ?? 0);

              return (
                <Card key={batch.id} className="transition-shadow hover:shadow-md">
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
                    <Link
                      href={`/enrollments?batch=${batch.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                    >
                      View enrollments <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
