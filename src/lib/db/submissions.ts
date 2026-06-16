import { createClient } from "@/lib/supabase/server";
import type { AssignmentSubmission } from "@/types/database";

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
