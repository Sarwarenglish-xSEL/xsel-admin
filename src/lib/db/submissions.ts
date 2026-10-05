import { createClient } from "@/lib/supabase/server";
import { getAdminDataClient } from "@/lib/db/admin-client";
import {
  normalizePage,
  normalizePageSize,
  pageRange,
  toPaginatedResult,
  type PaginatedResult,
} from "@/lib/db/pagination";
import type { AssignmentSubmission, QuizAttempt } from "@/types/database";

const ASSIGNMENT_SUBMISSIONS_BUCKET = "assignment-submissions";

const ASSIGNMENT_LIST_SELECT =
  "id, assignment_id, user_id, text_answer, file_url, obtained_marks, feedback, submitted_at, user:profiles(id, email, full_name), assignment:assignments(id, title, max_marks, lesson:course_lessons(title, chapter:course_chapters(course:courses(title))))";

const QUIZ_ATTEMPT_LIST_SELECT =
  "id, quiz_id, user_id, obtained_marks, is_passed, submitted_at, user:profiles(id, email, full_name), quiz:quizzes(id, title, total_marks, passing_marks, lesson:course_lessons(title, chapter:course_chapters(course:courses(title)))), answers:quiz_answers(id, selected_option, question:quiz_questions(id, question, option_a, option_b, option_c, option_d, correct_option, reason))";

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

export async function getAssignmentSubmissionById(
  id: string
): Promise<AssignmentSubmission | null> {
  const supabase = await getAdminDataClient();
  const { data, error } = await supabase
    .from("assignment_submissions")
    .select(ASSIGNMENT_LIST_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as AssignmentSubmission | null;
}

export async function getAssignmentSubmissions(pageParams?: {
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<AssignmentSubmission>> {
  const supabase = await getAdminDataClient();
  const page = normalizePage(pageParams?.page);
  const pageSize = normalizePageSize(pageParams?.pageSize);
  const { from, to } = pageRange(page, pageSize);

  const { data, error, count } = await supabase
    .from("assignment_submissions")
    .select(ASSIGNMENT_LIST_SELECT, { count: "exact" })
    .order("submitted_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return toPaginatedResult(
    (data ?? []) as unknown as AssignmentSubmission[],
    count ?? 0,
    page,
    pageSize
  );
}

export async function getQuizAttempts(pageParams?: {
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<QuizAttempt>> {
  const supabase = await getAdminDataClient();
  const page = normalizePage(pageParams?.page);
  const pageSize = normalizePageSize(pageParams?.pageSize);
  const { from, to } = pageRange(page, pageSize);

  const { data, error, count } = await supabase
    .from("quiz_attempts")
    .select(QUIZ_ATTEMPT_LIST_SELECT, { count: "exact" })
    .order("submitted_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return toPaginatedResult(
    (data ?? []) as unknown as QuizAttempt[],
    count ?? 0,
    page,
    pageSize
  );
}

export async function gradeSubmission(
  id: string,
  obtainedMarks: number,
  feedback: string
): Promise<void> {
  const supabase = await getAdminDataClient();
  const { error } = await supabase
    .from("assignment_submissions")
    .update({ obtained_marks: obtainedMarks, feedback })
    .eq("id", id);
  if (error) throw error;
}
