import { notFound } from "next/navigation";
import { getCourseById, getCourseReviews } from "@/lib/db/courses";
import { getChaptersWithLessons } from "@/lib/db/chapters";
import { getStaffProfiles, getProfiles } from "@/lib/db/profiles";
import { getBatchesWithCounts } from "@/lib/db/batches";
import { getEnrollments } from "@/lib/db/enrollments";
import { CourseDetailsForm } from "@/components/courses/course-details-form";
import { ChaptersLessonsEditor } from "@/components/courses/chapters-lessons-editor";
import { ReviewsList } from "@/components/courses/reviews-list";
import { BatchesManager } from "@/components/batches/batches-manager";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let course;
  let chapters;
  let reviews;
  let instructors;
  let batches;
  let enrollments;
  let users;
  let error: string | null = null;

  try {
    [course, chapters, reviews, instructors, batches, enrollments, users] = await Promise.all([
      getCourseById(id),
      getChaptersWithLessons(id),
      getCourseReviews(id),
      getStaffProfiles(),
      getBatchesWithCounts(id),
      getEnrollments({ courseId: id }),
      getProfiles(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load course";
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  if (!course) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/courses"
        title={course.title}
        description="Edit course content and settings"
      />

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="batches">Batches</TabsTrigger>
          <TabsTrigger value="chapters">Chapters & Lessons</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-6">
          <CourseDetailsForm course={course} instructors={instructors!} />
        </TabsContent>
        <TabsContent value="batches" className="mt-6">
          <BatchesManager
            courseId={id}
            batches={batches!}
            enrollments={enrollments!}
            users={users!}
          />
        </TabsContent>
        <TabsContent value="chapters" className="mt-6">
          <ChaptersLessonsEditor courseId={id} chapters={chapters!} />
        </TabsContent>
        <TabsContent value="reviews" className="mt-6">
          <ReviewsList reviews={reviews!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
