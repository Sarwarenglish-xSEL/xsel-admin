"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { BookOpen, Calendar, ChevronRight, Pencil, Users } from "lucide-react";
import type { BatchStatus, Course, CourseBatch, CourseStatus } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | CourseStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

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

type CourseWithBatches = {
  course: Course;
  batches: CourseBatch[];
};

function StatusFilterBar({
  value,
  onChange,
  counts,
}: {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
  counts: Record<StatusFilter, number>;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
      {STATUS_FILTERS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === option.value
              ? "bg-white text-brand shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          {option.label}
          <span className="ml-1 text-gray-400">({counts[option.value]})</span>
        </button>
      ))}
    </div>
  );
}

function BatchCard({ batch }: { batch: CourseBatch }) {
  const seatLabel =
    batch.max_seats != null
      ? `${batch.enrollment_count ?? 0} / ${batch.max_seats}`
      : String(batch.enrollment_count ?? 0);

  return (
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
  );
}

function CourseGroupCard({ course, batches }: CourseWithBatches) {
  return (
    <div className="flex h-full flex-col space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <BookOpen className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <Link
            href={`/courses/${course.id}/edit`}
            className="block truncate text-base font-semibold text-gray-900 hover:text-brand"
          >
            {course.title}
          </Link>
          <div className="mt-0.5">
            <Badge variant={course.status === "published" ? "default" : "outline"}>
              {course.status}
            </Badge>
          </div>
        </div>
      </div>

      {batches.length === 0 ? (
        <p className="flex flex-1 items-center justify-center rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
          No batches yet for this course.
        </p>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => (
            <BatchCard key={batch.id} batch={batch} />
          ))}
        </div>
      )}
    </div>
  );
}

function getStatusCounts(groups: CourseWithBatches[]): Record<StatusFilter, number> {
  return {
    all: groups.length,
    published: groups.filter((group) => group.course.status === "published").length,
    draft: groups.filter((group) => group.course.status === "draft").length,
    archived: groups.filter((group) => group.course.status === "archived").length,
  };
}

function CourseTypeSection({
  title,
  groups,
}: {
  title: string;
  groups: CourseWithBatches[];
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const statusCounts = useMemo(() => getStatusCounts(groups), [groups]);

  const filteredGroups = useMemo(() => {
    if (statusFilter === "all") return groups;
    return groups.filter((group) => group.course.status === statusFilter);
  }, [groups, statusFilter]);

  return (
    <section className="flex w-full flex-col rounded-xl border border-gray-200 bg-gray-50/50 p-4">
      <div className="space-y-3 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {filteredGroups.length} of {groups.length} course
            {groups.length === 1 ? "" : "s"}
          </p>
        </div>
        <StatusFilterBar value={statusFilter} onChange={setStatusFilter} counts={statusCounts} />
      </div>

      <div className="mt-4">
        {groups.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-gray-500">
              No {title.toLowerCase()} found.
            </CardContent>
          </Card>
        ) : filteredGroups.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-gray-500">
              No {statusFilter} courses in this section.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredGroups.map(({ course, batches }) => (
              <CourseGroupCard key={course.id} course={course} batches={batches} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function buildCourseGroups(courses: Course[], batches: CourseBatch[]): CourseWithBatches[] {
  const batchesByCourse = new Map<string, CourseBatch[]>();

  for (const batch of batches) {
    const list = batchesByCourse.get(batch.course_id) ?? [];
    list.push(batch);
    batchesByCourse.set(batch.course_id, list);
  }

  return courses
    .map((course) => ({
      course,
      batches: (batchesByCourse.get(course.id) ?? []).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    }))
    .sort((a, b) => a.course.title.localeCompare(b.course.title));
}

export function BatchesOverview({
  batches,
  courses,
}: {
  batches: CourseBatch[];
  courses: Course[];
}) {
  const liveCourses = buildCourseGroups(
    courses.filter((course) => course.course_type === "live"),
    batches
  );
  const prerecordedCourses = buildCourseGroups(
    courses.filter((course) => course.course_type === "prerecorded"),
    batches
  );

  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-900">No courses found</p>
          <p className="mt-1 max-w-md text-sm text-gray-500">
            Create a course first, then add batches to manage chapters, lessons, schedule, and
            student enrollment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <CourseTypeSection title="Live Courses" groups={liveCourses} />
      <CourseTypeSection title="Pre-recorded Courses" groups={prerecordedCourses} />
    </div>
  );
}
