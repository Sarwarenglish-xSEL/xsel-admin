import { getEnrollments } from "@/lib/db/enrollments";
import { getProfiles } from "@/lib/db/profiles";
import { getCourses } from "@/lib/db/courses";
import { EnrollmentsTable } from "@/components/enrollments/enrollments-table";
import { PageHeader } from "@/components/layout/page-header";
import { PageEmpty } from "@/components/page-states";

export default async function EnrollmentsPage() {
  let enrollments;
  let users;
  let courses;
  let error: string | null = null;

  try {
    [enrollments, users, courses] = await Promise.all([
      getEnrollments(),
      getProfiles(),
      getCourses(),
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enrollments"
        description="View and manage course enrollments"
      />
      {enrollments!.length === 0 ? (
        <PageEmpty
          title="No enrollments"
          description="Enroll users manually or approve purchases."
        />
      ) : (
        <EnrollmentsTable
          enrollments={enrollments!}
          users={users!}
          courses={courses!}
        />
      )}
    </div>
  );
}
