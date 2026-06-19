import { notFound } from "next/navigation";
import { getLessonById } from "@/lib/db/chapters";
import { getAssignmentByLessonId } from "@/lib/db/assignments";
import { AssignmentForm } from "@/components/courses/assignment-form";
import { PageHeader } from "@/components/layout/page-header";

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id: courseId, lessonId } = await params;
  const [lesson, assignment] = await Promise.all([
    getLessonById(lessonId),
    getAssignmentByLessonId(lessonId).catch(() => null),
  ]);
  if (!lesson) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        backHref={`/courses/${courseId}/edit`}
        title="Assignment"
        description={lesson.title}
      />
      <AssignmentForm
        courseId={courseId}
        lessonId={lessonId}
        assignment={assignment}
      />
    </div>
  );
}
