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

/** List view — omits large text_answer bodies; fetch full row when grading. */
const ASSIGNMENT_LIST_SELECT_LIGHT =
  "id, assignment_id, user_id, file_url, obtained_marks, feedback, submitted_at, user:profiles(id, email, full_name), assignment:assignments(id, title, max_marks, lesson:course_lessons(title, chapter:course_chapters(course:courses(title))))";

const QUIZ_ATTEMPT_LIST_SELECT =
  "id, quiz_id, user_id, obtained_marks, is_passed, submitted_at, user:profiles(id, email, full_name), quiz:quizzes(id, title, total_marks, passing_marks, lesson:course_lessons(title, chapter:course_chapters(course:courses(title))))";

const QUIZ_ATTEMPT_DETAIL_SELECT =
  "id, quiz_id, user_id, obtained_marks, is_passed, submitted_at, user:profiles(id, email, full_name), quiz:quizzes(id, title, total_marks, passing_marks, lesson:course_lessons(title, chapter:course_chapters(course:courses(title)))), answers:quiz_answers(id, selected_option, is_correct, question:quiz_questions(id, question, option_a, option_b, option_c, option_d, correct_option, reason))";

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

async function findIdsByIlike(
  table: "profiles" | "assignments" | "quizzes",
  columns: string[],
  search: string
): Promise<string[]> {
  const supabase = await getAdminDataClient();
  const term = `%${search.trim()}%`;
  const filter = columns.map((col) => `${col}.ilike.${term}`).join(",");
  const { data, error } = await supabase.from(table).select("id").or(filter);
  if (error) throw error;
  return (data ?? []).map((row) => row.id as string);
}

async function buildSubmissionSearchFilter(search: string): Promise<string[] | null> {
  const [userIds, assignmentIds] = await Promise.all([
    findIdsByIlike("profiles", ["email", "full_name"], search),
    findIdsByIlike("assignments", ["title"], search),
  ]);
  if (userIds.length === 0 && assignmentIds.length === 0) {
    return null;
  }
  const clauses: string[] = [];
  if (userIds.length) clauses.push(`user_id.in.(${userIds.join(",")})`);
  if (assignmentIds.length) {
    clauses.push(`assignment_id.in.(${assignmentIds.join(",")})`);
  }
  return clauses;
}

async function buildQuizSearchFilter(search: string): Promise<string[] | null> {
  const [userIds, quizIds] = await Promise.all([
    findIdsByIlike("profiles", ["email", "full_name"], search),
    findIdsByIlike("quizzes", ["title"], search),
  ]);
  if (userIds.length === 0 && quizIds.length === 0) {
    return null;
  }
  const clauses: string[] = [];
  if (userIds.length) clauses.push(`user_id.in.(${userIds.join(",")})`);
  if (quizIds.length) clauses.push(`quiz_id.in.(${quizIds.join(",")})`);
  return clauses;
}

export async function countAssignmentSubmissions(search?: string): Promise<number> {
  const supabase = await getAdminDataClient();
  const trimmed = search?.trim();

  if (trimmed) {
    const clauses = await buildSubmissionSearchFilter(trimmed);
    if (!clauses) return 0;
    const { count, error } = await supabase
      .from("assignment_submissions")
      .select("id", { count: "exact", head: true })
      .or(clauses.join(","));
    if (error) throw error;
    return count ?? 0;
  }

  const { count, error } = await supabase
    .from("assignment_submissions")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function countQuizAttempts(search?: string): Promise<number> {
  const supabase = await getAdminDataClient();
  const trimmed = search?.trim();

  if (trimmed) {
    const clauses = await buildQuizSearchFilter(trimmed);
    if (!clauses) return 0;
    const { count, error } = await supabase
      .from("quiz_attempts")
      .select("id", { count: "exact", head: true })
      .or(clauses.join(","));
    if (error) throw error;
    return count ?? 0;
  }

  const { count, error } = await supabase
    .from("quiz_attempts")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function getAssignmentSubmissions(pageParams?: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<AssignmentSubmission>> {
  const supabase = await getAdminDataClient();
  const page = normalizePage(pageParams?.page);
  const pageSize = normalizePageSize(pageParams?.pageSize);
  const { from, to } = pageRange(page, pageSize);
  const search = pageParams?.search?.trim();

  let query = supabase
    .from("assignment_submissions")
    .select(ASSIGNMENT_LIST_SELECT_LIGHT, { count: "exact" })
    .order("submitted_at", { ascending: false })
    .range(from, to);

  if (search) {
    const clauses = await buildSubmissionSearchFilter(search);
    if (!clauses) {
      return toPaginatedResult([], 0, page, pageSize);
    }
    query = query.or(clauses.join(","));
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return toPaginatedResult(
    (data ?? []) as unknown as AssignmentSubmission[],
    count ?? 0,
    page,
    pageSize
  );
}

export async function getQuizAttempts(pageParams?: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<QuizAttempt>> {
  const supabase = await getAdminDataClient();
  const page = normalizePage(pageParams?.page);
  const pageSize = normalizePageSize(pageParams?.pageSize);
  const { from, to } = pageRange(page, pageSize);
  const search = pageParams?.search?.trim();

  let query = supabase
    .from("quiz_attempts")
    .select(QUIZ_ATTEMPT_LIST_SELECT, { count: "exact" })
    .order("submitted_at", { ascending: false })
    .range(from, to);

  if (search) {
    const clauses = await buildQuizSearchFilter(search);
    if (!clauses) {
      return toPaginatedResult([], 0, page, pageSize);
    }
    query = query.or(clauses.join(","));
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return toPaginatedResult(
    (data ?? []) as unknown as QuizAttempt[],
    count ?? 0,
    page,
    pageSize
  );
}

export async function getQuizAttemptById(
  id: string
): Promise<QuizAttempt | null> {
  const supabase = await getAdminDataClient();
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select(QUIZ_ATTEMPT_DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as QuizAttempt | null;
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
