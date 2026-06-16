import { getCourses } from "@/lib/db/courses";
import { CoursesTable } from "@/components/courses/courses-table";
import { CreateCourseDialog } from "@/components/courses/create-course-dialog";
import {
  CourseFilters,
} from "@/components/courses/course-filters";
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
      <div>
        <h1 className="mb-6 text-2xl font-bold">Courses</h1>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Courses</h1>
          <p className="text-muted-foreground">Create and manage learning content</p>
        </div>
        <CreateCourseDialog />
      </div>
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
