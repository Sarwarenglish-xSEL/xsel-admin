import { notFound } from "next/navigation";
import { getLessonById } from "@/lib/db/chapters";
import { getQuizByLessonId } from "@/lib/db/quizzes";
import { QuizBuilder } from "@/components/courses/quiz-builder";
import { PageHeader } from "@/components/layout/page-header";

export default async function BatchQuizPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id: batchId, lessonId } = await params;
  const [lesson, quiz] = await Promise.all([
    getLessonById(lessonId),
    getQuizByLessonId(lessonId).catch(() => null),
  ]);
  if (!lesson) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        backHref={`/batches/${batchId}/edit`}
        title="Quiz Builder"
        description={lesson.title}
      />
      <QuizBuilder batchId={batchId} lessonId={lessonId} quiz={quiz} />
    </div>
  );
}
