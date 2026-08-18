"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  BookOpen,
  Calendar,
  ChevronRight,
  Layers,
  Pencil,
  Radio,
  Users,
  Video,
} from "lucide-react";
import type { BatchStatus, Course, CourseBatch, CourseStatus } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | CourseStatus;

const PAGE_SIZE = 6;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

function batchStatusVariant(
  status: BatchStatus
): "default" | "outline" | "success" | "warning" {
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

type SectionTone = "live" | "prerecorded";

const SECTION_THEME: Record<
  SectionTone,
  {
    icon: typeof Radio;
    iconWrap: string;
    accentBar: string;
    headerBg: string;
    bodyBg: string;
    filterActive: string;
    cardAccent: string;
    emptyBg: string;
  }
> = {
  live: {
    icon: Radio,
    iconWrap: "bg-accent/25 text-accent-dark",
    accentBar: "from-accent to-brand",
    headerBg: "brand-gradient",
    bodyBg: "bg-surface",
    filterActive: "bg-accent-dark text-white shadow-sm shadow-accent/30",
    cardAccent: "from-accent to-brand",
    emptyBg: "bg-surface border-brand/20",
  },
  prerecorded: {
    icon: Video,
    iconWrap: "bg-brand/20 text-brand",
    accentBar: "from-brand to-accent",
    headerBg: "brand-gradient",
    bodyBg: "bg-surface",
    filterActive: "bg-brand text-white shadow-sm shadow-brand/25",
    cardAccent: "from-brand to-accent",
    emptyBg: "bg-surface border-brand/20",
  },
};

function StatusFilterBar({
  value,
  onChange,
  counts,
  tone,
}: {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
  counts: Record<StatusFilter, number>;
  tone: SectionTone;
}) {
  const theme = SECTION_THEME[tone];

  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-brand/20 bg-surface/80 p-1 shadow-sm backdrop-blur-sm">
      {STATUS_FILTERS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === option.value
              ? theme.filterActive
              : "text-gray-500 hover:bg-brand/20 hover:text-brand"
          )}
        >
          {option.label}
          <span
            className={cn(
              "ml-1",
              value === option.value ? "text-white/70" : "text-gray-400"
            )}
          >
            ({counts[option.value]})
          </span>
        </button>
      ))}
    </div>
  );
}

function BatchCard({
  batch,
  tone,
}: {
  batch: CourseBatch;
  tone: SectionTone;
}) {
  const theme = SECTION_THEME[tone];
  const seatLabel =
    batch.max_seats != null
      ? `${batch.enrollment_count ?? 0} / ${batch.max_seats}`
      : String(batch.enrollment_count ?? 0);

  return (
    <div className="group overflow-hidden rounded-xl border border-brand/20 bg-surface shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md hover:shadow-brand/15">
      <div className={cn("h-1 bg-gradient-to-r", theme.cardAccent)} />
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-brand-dark">
              {batch.name}
            </p>
          </div>
          <Badge variant={batchStatusVariant(batch.status)}>{batch.status}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg border border-brand/20 bg-surface px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-brand/60">
              Students
            </p>
            <p className="mt-0.5 flex items-center gap-1 font-semibold text-brand-dark">
              <Users className="h-3.5 w-3.5 text-brand" />
              {seatLabel}
            </p>
          </div>
          <div className="rounded-lg border border-brand/20 bg-surface px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-accent-dark/70">
              Active
            </p>
            <p className="mt-0.5 font-semibold text-accent-dark">
              {batch.active_enrollment_count ?? 0}
            </p>
          </div>
        </div>

        <div className="space-y-1.5 rounded-lg border border-brand/15 bg-surface px-3 py-2 text-xs text-gray-600">
          <p className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-brand" />
            Start: {formatDate(batch.start_date)}
          </p>
          <p className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-accent-dark" />
            Reg. deadline: {formatDate(batch.registration_deadline)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <Link
            href={`/batches/${batch.id}/edit`}
            className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-medium text-white shadow-sm shadow-brand/20 transition-colors hover:bg-brand-dark"
          >
            <Pencil className="h-3.5 w-3.5" />
            Manage
          </Link>
          <Link
            href={`/enrollments?batch=${batch.id}`}
            className="inline-flex items-center gap-1 rounded-lg border border-brand/25 bg-surface px-2.5 py-1.5 text-xs font-medium text-brand transition-colors hover:bg-brand/10"
          >
            Enrollments
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function CourseGroupCard({
  course,
  batches,
  tone,
}: CourseWithBatches & { tone: SectionTone }) {
  const theme = SECTION_THEME[tone];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-brand/20 bg-surface shadow-sm">
      <div className="flex items-center gap-3 border-b border-brand/20 bg-surface px-4 py-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            theme.iconWrap
          )}
        >
          <BookOpen className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <Link
            href={`/courses/${course.id}/edit`}
            className="block truncate text-base font-semibold text-brand-dark hover:text-brand"
          >
            {course.title}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant={course.status === "published" ? "default" : "outline"}>
              {course.status}
            </Badge>
            <Badge variant="warning">
              {batches.length} batch{batches.length === 1 ? "" : "es"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3">
        {batches.length === 0 ? (
          <p
            className={cn(
              "flex flex-1 items-center justify-center rounded-lg border border-dashed px-4 py-8 text-center text-sm text-gray-500",
              theme.emptyBg
            )}
          >
            No batches yet for this course.
          </p>
        ) : (
          batches.map((batch) => (
            <BatchCard key={batch.id} batch={batch} tone={tone} />
          ))
        )}
      </div>
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
  tone,
}: {
  title: string;
  groups: CourseWithBatches[];
  tone: SectionTone;
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);
  const statusCounts = useMemo(() => getStatusCounts(groups), [groups]);
  const theme = SECTION_THEME[tone];
  const Icon = theme.icon;
  const batchCount = groups.reduce((sum, g) => sum + g.batches.length, 0);

  const filteredGroups = useMemo(() => {
    if (statusFilter === "all") return groups;
    return groups.filter((group) => group.course.status === statusFilter);
  }, [groups, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pagedGroups = filteredGroups.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE
  );
  const showingFrom =
    filteredGroups.length === 0 ? 0 : currentPage * PAGE_SIZE + 1;
  const showingTo = Math.min(
    (currentPage + 1) * PAGE_SIZE,
    filteredGroups.length
  );

  function changeFilter(next: StatusFilter) {
    setStatusFilter(next);
    setPage(0);
  }

  return (
    <section className="flex w-full flex-col overflow-hidden rounded-xl border border-brand/20 bg-surface shadow-sm">
      <div className={cn("space-y-3 border-b border-brand/20 px-5 py-4", theme.headerBg)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                theme.iconWrap
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div
                  className={cn("h-5 w-1 rounded-full bg-gradient-to-b", theme.accentBar)}
                />
                <h2 className="text-base font-semibold tracking-tight text-brand-dark">
                  {title}
                </h2>
              </div>
              <p className="mt-1 text-xs text-brand/70">
                {filteredGroups.length} of {groups.length} course
                {groups.length === 1 ? "" : "s"} · {batchCount} batch
                {batchCount === 1 ? "" : "es"}
              </p>
            </div>
          </div>
          <StatusFilterBar
            value={statusFilter}
            onChange={changeFilter}
            counts={statusCounts}
            tone={tone}
          />
        </div>
      </div>

      <div className={cn("p-4", theme.bodyBg)}>
        {groups.length === 0 ? (
          <div
            className={cn(
              "rounded-xl border border-dashed px-4 py-12 text-center text-sm text-gray-500",
              theme.emptyBg
            )}
          >
            No {title.toLowerCase()} found.
          </div>
        ) : filteredGroups.length === 0 ? (
          <div
            className={cn(
              "rounded-xl border border-dashed px-4 py-12 text-center text-sm text-gray-500",
              theme.emptyBg
            )}
          >
            No {statusFilter} courses in this section.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pagedGroups.map(({ course, batches }) => (
                <CourseGroupCard
                  key={course.id}
                  course={course}
                  batches={batches}
                  tone={tone}
                />
              ))}
            </div>

            {filteredGroups.length > PAGE_SIZE && (
              <div className="mt-4 flex flex-col gap-3 border-t border-brand/20 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-brand/70">
                  Showing {showingFrom}–{showingTo} of {filteredGroups.length}{" "}
                  courses
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="min-w-[5.5rem] text-center text-sm font-medium text-brand-dark">
                    Page {currentPage + 1} of {pageCount}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= pageCount - 1}
                    onClick={() =>
                      setPage((p) => Math.min(pageCount - 1, p + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function BatchesSummary({
  courses,
  batches,
}: {
  courses: Course[];
  batches: CourseBatch[];
}) {
  const liveCount = courses.filter((c) => c.course_type === "live").length;
  const prerecordedCount = courses.filter((c) => c.course_type === "prerecorded").length;
  const activeBatches = batches.filter((b) => b.status === "active").length;
  const totalStudents = batches.reduce(
    (sum, b) => sum + (b.enrollment_count ?? 0),
    0
  );

  const cards = [
    {
      label: "Total Batches",
      value: batches.length,
      icon: Layers,
      wrap: "bg-brand/20 text-brand",
      valueClass: "text-brand-dark",
    },
    {
      label: "Live Courses",
      value: liveCount,
      icon: Radio,
      wrap: "bg-accent/25 text-accent-dark",
      valueClass: "text-accent-dark",
    },
    {
      label: "Pre-recorded",
      value: prerecordedCount,
      icon: Video,
      wrap: "bg-brand/20 text-brand",
      valueClass: "text-brand",
    },
    {
      label: "Active Batches",
      value: activeBatches,
      icon: Users,
      wrap: "bg-success/15 text-success",
      valueClass: "text-success",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.label}
          className="overflow-hidden border-brand/20 bg-surface shadow-sm"
        >
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {card.label}
              </p>
              <p className={cn("mt-1 text-2xl font-bold tracking-tight", card.valueClass)}>
                {card.value}
              </p>
              {card.label === "Total Batches" && (
                <p className="mt-0.5 text-xs text-gray-400">
                  {totalStudents} enrolled seat{totalStudents === 1 ? "" : "s"}
                </p>
              )}
            </div>
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                card.wrap
              )}
            >
              <card.icon className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
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
      <Card className="overflow-hidden border-brand/20 border-dashed shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/20 text-brand">
            <BookOpen className="h-5 w-5" />
          </div>
          <p className="font-semibold text-brand-dark">No courses found</p>
          <p className="mt-1 max-w-md text-sm text-gray-500">
            Create a course first, then add batches to manage chapters, lessons, schedule,
            and student enrollment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <BatchesSummary courses={courses} batches={batches} />
      <CourseTypeSection title="Live Courses" groups={liveCourses} tone="live" />
      <CourseTypeSection
        title="Pre-recorded Courses"
        groups={prerecordedCourses}
        tone="prerecorded"
      />
    </div>
  );
}
