import { createClient } from "@/lib/supabase/server";
import type { AssignmentSubmission, QuizAttempt } from "@/types/database";

const ASSIGNMENT_SUBMISSIONS_BUCKET = "assignment-submissions";

export async function getAssignmentSubmissionSignedUrl(fileUrl: string): Promise<string> {
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    return fileUrl;
  }

  const supabase = await createClient();
  const path = fileUrl.replace(/^\//, "");
  const { data, error } = await supabase.storage
    .from(ASSIGNMENT_SUBMISSIONS_BUCKET)
    .createSignedUrl(path, 3600);

  if (error) throw error;
  return data.signedUrl;
}

export async function getAssignmentSubmissions(): Promise<
  AssignmentSubmission[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignment_submissions")
    .select(
      "*, user:profiles(*), assignment:assignments(*, lesson:course_lessons(title, chapter:course_chapters(course:courses(title))))"
    )
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AssignmentSubmission[];
}

export async function getQuizAttempts(): Promise<QuizAttempt[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select(
      "*, user:profiles(*), quiz:quizzes(*, lesson:course_lessons(title, chapter:course_chapters(course:courses(title)))), answers:quiz_answers(*, question:quiz_questions(*))"
    )
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as QuizAttempt[];
}

export async function gradeSubmission(
  id: string,
  obtainedMarks: number,
  feedback: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("assignment_submissions")
    .update({ obtained_marks: obtainedMarks, feedback })
    .eq("id", id);
  if (error) throw error;
}
