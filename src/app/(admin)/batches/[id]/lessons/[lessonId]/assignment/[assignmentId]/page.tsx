import { notFound } from "next/navigation";
import { getLessonById } from "@/lib/db/chapters";
import { getAssignmentById } from "@/lib/db/assignments";
import { AssignmentForm } from "@/components/courses/assignment-form";
import { PageHeader } from "@/components/layout/page-header";

export default async function BatchAssignmentPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string; assignmentId: string }>;
}) {
  const { id: batchId, lessonId, assignmentId } = await params;
  const [lesson, assignment] = await Promise.all([
    getLessonById(lessonId),
    getAssignmentById(assignmentId),
  ]);
  if (!lesson || !assignment || assignment.lesson_id !== lessonId) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        backHref={`/batches/${batchId}/edit`}
        title="Assignment"
        description={`${lesson.title} · ${assignment.title}`}
      />
      <AssignmentForm
        batchId={batchId}
        lessonId={lessonId}
        assignment={assignment}
      />
    </div>
  );
}
