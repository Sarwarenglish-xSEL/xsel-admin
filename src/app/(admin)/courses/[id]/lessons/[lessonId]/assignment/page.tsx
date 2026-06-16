import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getLessonById } from "@/lib/db/chapters";
import { getAssignmentByLessonId } from "@/lib/db/assignments";
import { AssignmentForm } from "@/components/courses/assignment-form";

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
  if (!lesson || lesson.lesson_type !== "assignment") notFound();

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
          <h1 className="text-2xl font-bold">Assignment</h1>
          <p className="text-muted-foreground">{lesson.title}</p>
        </div>
      </div>
      <AssignmentForm
        courseId={courseId}
        lessonId={lessonId}
        assignment={assignment}
      />
    </div>
  );
}
