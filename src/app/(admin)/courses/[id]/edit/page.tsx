import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCourseById, getCourseReviews } from "@/lib/db/courses";
import { getChaptersWithLessons } from "@/lib/db/chapters";
import { getStaffProfiles } from "@/lib/db/profiles";
import { CourseDetailsForm } from "@/components/courses/course-details-form";
import { ChaptersLessonsEditor } from "@/components/courses/chapters-lessons-editor";
import { ReviewsList } from "@/components/courses/reviews-list";
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
  let error: string | null = null;

  try {
    [course, chapters, reviews, instructors] = await Promise.all([
      getCourseById(id),
      getChaptersWithLessons(id),
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
      <div className="flex items-center gap-4">
        <Link
          href="/courses"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-muted-foreground">Edit course content and settings</p>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="chapters">Chapters & Lessons</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-6">
          <CourseDetailsForm course={course} instructors={instructors!} />
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
