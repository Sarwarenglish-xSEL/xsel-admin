import { getEnrollments } from "@/lib/db/enrollments";
import { getProfiles } from "@/lib/db/profiles";
import { getCourses } from "@/lib/db/courses";
import { getAllBatchesOverview } from "@/lib/db/batches";
import { EnrollmentsTable } from "@/components/enrollments/enrollments-table";
import { PageHeader } from "@/components/layout/page-header";
import { PageEmpty } from "@/components/page-states";

export default async function EnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; batch?: string }>;
}) {
  const params = await searchParams;
  let enrollments;
  let users;
  let courses;
  let batches;
  let error: string | null = null;

  try {
    [enrollments, users, courses, batches] = await Promise.all([
      getEnrollments({
        courseId: params.course,
        batchId: params.batch,
      }),
      getProfiles(),
      getCourses(),
      getAllBatchesOverview(),
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
      {enrollments!.length === 0 ? (
        <PageEmpty
          title="No enrollments"
          description="Enroll users manually from a course batch or approve purchases."
        />
      ) : (
        <EnrollmentsTable
          enrollments={enrollments!}
          users={users!}
          courses={courses!}
          batches={batches!}
          initialCourseId={params.course}
          initialBatchId={params.batch}
        />
      )}
    </div>
  );
}
