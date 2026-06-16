import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getLessonById } from "@/lib/db/chapters";
import { getQuizByLessonId } from "@/lib/db/quizzes";
import { QuizBuilder } from "@/components/courses/quiz-builder";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id: courseId, lessonId } = await params;
  const [lesson, quiz] = await Promise.all([
    getLessonById(lessonId),
    getQuizByLessonId(lessonId).catch(() => null),
  ]);
  if (!lesson || lesson.lesson_type !== "quiz") notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/courses/${courseId}/edit`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Quiz Builder</h1>
          <p className="text-muted-foreground">{lesson.title}</p>
        </div>
      </div>
      <QuizBuilder courseId={courseId} lessonId={lessonId} quiz={quiz} />
    </div>
  );
}
