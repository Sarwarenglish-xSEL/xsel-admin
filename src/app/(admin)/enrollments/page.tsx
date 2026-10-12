import { getEnrollments } from "@/lib/db/enrollments";
import {
  getBatchFilterOptions,
  getCourseFilterOptions,
} from "@/lib/db/catalog";
import { parsePageParam } from "@/lib/db/pagination";
import { EnrollmentsTable } from "@/components/enrollments/enrollments-table";
import { ListPagination } from "@/components/list-pagination";
import { PageHeader } from "@/components/layout/page-header";
import { PageEmpty } from "@/components/page-states";

export default async function EnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    course?: string;
    batch?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = parsePageParam(params.page);
  const q = params.q?.trim() || undefined;
  let enrollmentsResult;
  let courses;
  let batches;
  let error: string | null = null;

  try {
    [enrollmentsResult, courses, batches] = await Promise.all([
      getEnrollments({
        courseId: params.course,
        batchId: params.batch,
        search: q,
        page,
        pageSize: 20,
      }),
      getCourseFilterOptions(),
      getBatchFilterOptions(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load enrollments";
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Enrollments" description="View and manage course enrollments" />
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  const filterLabel = params.batch
    ? batches!.find((b) => b.id === params.batch)?.name
    : params.course
      ? courses!.find((c) => c.id === params.course)?.title
      : null;

  const enrollments = enrollmentsResult!.data;
  const hasFilters = Boolean(params.course || params.batch || q);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enrollments"
        description={
          filterLabel
            ? `Showing enrollments for ${filterLabel}`
            : "View and manage course enrollments by batch"
        }
      />
      <div className="space-y-4">
        <EnrollmentsTable
          enrollments={enrollments}
          courses={courses!}
          batches={batches!}
          initialCourseId={params.course}
          initialBatchId={params.batch}
          initialQuery={q}
        />
        {enrollments.length === 0 && page === 1 ? (
          <PageEmpty
            title={hasFilters ? "No enrollments found" : "No enrollments"}
            description={
              hasFilters
                ? "Try a different search term or clear filters."
                : "Enroll users manually from a course batch or approve purchases."
            }
          />
        ) : (
          <ListPagination
            page={enrollmentsResult!.page}
            totalPages={enrollmentsResult!.totalPages}
            total={enrollmentsResult!.total}
            pageSize={enrollmentsResult!.pageSize}
            searchParams={{
              course: params.course,
              batch: params.batch,
              q,
            }}
          />
        )}
      </div>
    </div>
  );
}
