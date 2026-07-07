import { notFound } from "next/navigation";
import { getLessonById } from "@/lib/db/chapters";
import { getAssignmentByLessonId } from "@/lib/db/assignments";
import { AssignmentForm } from "@/components/courses/assignment-form";
import { PageHeader } from "@/components/layout/page-header";

export default async function BatchAssignmentPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id: batchId, lessonId } = await params;
  const [lesson, assignment] = await Promise.all([
    getLessonById(lessonId),
    getAssignmentByLessonId(lessonId).catch(() => null),
  ]);
  if (!lesson) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        backHref={`/batches/${batchId}/edit`}
        title="Assignment"
        description={lesson.title}
      />
      <AssignmentForm batchId={batchId} lessonId={lessonId} assignment={assignment} />
    </div>
  );
}
