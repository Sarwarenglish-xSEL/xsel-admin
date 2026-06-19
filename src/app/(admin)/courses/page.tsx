import { getCourses } from "@/lib/db/courses";
import { CoursesTable } from "@/components/courses/courses-table";
import { CreateCourseDialog } from "@/components/courses/create-course-dialog";
import {
  CourseFilters,
} from "@/components/courses/course-filters";
import { PageHeader } from "@/components/layout/page-header";
import { parseCourseFilters } from "@/lib/course-filters";
import { PageEmpty } from "@/components/page-states";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; category?: string }>;
}) {
  const params = await searchParams;
  const filters = parseCourseFilters(params);
  let courses;
  let error: string | null = null;

  try {
    courses = await getCourses(filters);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load courses";
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Courses" description="Create and manage learning content" />
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses"
        description="Create and manage learning content"
        actions={<CreateCourseDialog />}
      />
      <CourseFilters
        courseType={params.type}
        status={params.status}
        category={params.category}
      />
      {courses!.length === 0 ? (
        <PageEmpty
          title="No courses found"
          description="Create your first course or adjust filters."
        />
      ) : (
        <CoursesTable courses={courses!} />
      )}
    </div>
  );
}
