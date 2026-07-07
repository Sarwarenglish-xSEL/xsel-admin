import { notFound } from "next/navigation";
import { getCourseById, getCourseReviews } from "@/lib/db/courses";
import { getStaffProfiles } from "@/lib/db/profiles";
import { CourseDetailsForm } from "@/components/courses/course-details-form";
import { ReviewsList } from "@/components/courses/reviews-list";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let course;
  let reviews;
  let instructors;
  let error: string | null = null;

  try {
    [course, reviews, instructors] = await Promise.all([
      getCourseById(id),
      getCourseReviews(id),
      getStaffProfiles(),
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
        description="Edit course catalog details. Manage batch content and students from the Batches page."
      />

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-6">
          <CourseDetailsForm course={course} instructors={instructors!} />
        </TabsContent>
        <TabsContent value="reviews" className="mt-6">
          <ReviewsList reviews={reviews!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
