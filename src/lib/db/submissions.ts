import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getAdminDataClient } from "@/lib/db/admin-client";
import {
  removeStorageObject,
  removeStorageObjects,
  storagePathFromUrl,
} from "@/lib/db/storage-cleanup";
import {
  normalizePage,
  normalizePageSize,
  pageRange,
  toPaginatedResult,
  type PaginatedResult,
} from "@/lib/db/pagination";
import {
  feedbackAudioContentType,
  feedbackAudioErrorMessage,
  validateFeedbackAudioFile,
} from "@/lib/feedback-audio";
import type { AssignmentSubmission, QuizAttempt } from "@/types/database";

const ASSIGNMENT_SUBMISSIONS_BUCKET = "assignment-submissions";

export type FeedbackAudioUploadTarget = {
  path: string;
  signedUrl: string;
  token: string;
  contentType: string;
};

const ASSIGNMENT_LIST_SELECT =
  "id, assignment_id, user_id, text_answer, file_url, obtained_marks, feedback, feedback_audio_url, submitted_at, user:profiles(id, email, full_name), assignment:assignments(id, title, type, max_marks, lesson:course_lessons(title, chapter:course_chapters(course:courses(title))))";

/** List view — omits large text_answer bodies; fetch full row when grading. */
const ASSIGNMENT_LIST_SELECT_LIGHT =
  "id, assignment_id, user_id, file_url, obtained_marks, feedback, feedback_audio_url, submitted_at, user:profiles(id, email, full_name), assignment:assignments(id, title, type, max_marks, lesson:course_lessons(title, chapter:course_chapters(course:courses(title))))";

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

export type AssignmentSubmissionUpdate = {
  obtained_marks?: number | null;
  feedback?: string | null;
  feedback_audio_url?: string | null;
  text_answer?: string | null;
};

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function gradeSubmission(
  id: string,
  obtainedMarks: number,
  feedback: string
): Promise<void> {
  await updateAssignmentSubmission(id, {
    obtained_marks: obtainedMarks,
    feedback,
  });
}

export async function updateAssignmentSubmission(
  id: string,
  input: AssignmentSubmissionUpdate
): Promise<void> {
  const supabase = await getAdminDataClient();
  const payload: Record<string, unknown> = {};
  if ("obtained_marks" in input) payload.obtained_marks = input.obtained_marks;
  if ("feedback" in input) payload.feedback = input.feedback;
  if ("feedback_audio_url" in input) {
    payload.feedback_audio_url = input.feedback_audio_url;
  }
  if ("text_answer" in input) payload.text_answer = input.text_answer;

  if (Object.keys(payload).length === 0) return;

  if ("feedback_audio_url" in input) {
    const { data: existing, error: fetchError } = await supabase
      .from("assignment_submissions")
      .select("feedback_audio_url")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw fetchError;

    const previous = existing?.feedback_audio_url as string | null | undefined;
    const next = input.feedback_audio_url ?? null;
    const previousPath = previous
      ? storagePathFromUrl(previous, ASSIGNMENT_SUBMISSIONS_BUCKET)
      : null;
    const nextPath = next
      ? storagePathFromUrl(next, ASSIGNMENT_SUBMISSIONS_BUCKET)
      : null;

    if (previousPath && previousPath !== nextPath) {
      await removeStorageObject(ASSIGNMENT_SUBMISSIONS_BUCKET, previous);
    }
  }

  const { error } = await supabase
    .from("assignment_submissions")
    .update(payload)
    .eq("id", id);
  if (error) throw error;
}

/**
 * Prepare a signed storage upload for staff voice feedback.
 * File bytes upload from the browser (avoids Next Server Action body limits).
 * Path is under the learner folder so mobile RLS can play it with a signed URL.
 */
export async function prepareSubmissionFeedbackAudioUpload(
  submissionId: string,
  fileMeta: { name: string; type?: string | null; size: number }
): Promise<FeedbackAudioUploadTarget> {
  const validationError = validateFeedbackAudioFile(fileMeta);
  if (validationError) throw new Error(validationError);

  const supabase = await getAdminDataClient();
  const { data: submission, error: fetchError } = await supabase
    .from("assignment_submissions")
    .select("id, user_id, assignment_id, feedback_audio_url")
    .eq("id", submissionId)
    .maybeSingle();
  if (fetchError) {
    throw new Error(fetchError.message || "Failed to load submission.");
  }
  if (!submission) throw new Error("Submission not found.");

  const service = createServiceClient();
  if (!service) {
    throw new Error(
      "Audio upload failed: SUPABASE_SERVICE_ROLE_KEY is missing in server config."
    );
  }

  const contentType = feedbackAudioContentType(fileMeta);
  const ext =
    fileMeta.name.split(".").pop()?.toLowerCase() ||
    (contentType.includes("mpeg")
      ? "mp3"
      : contentType.includes("ogg")
        ? "ogg"
        : contentType.includes("webm")
          ? "webm"
          : "m4a");
  const path = `${submission.user_id}/${submission.assignment_id}/feedback/${Date.now()}_${sanitizeFileName(
    fileMeta.name || `feedback.${ext}`
  )}`;

  const { data, error } = await service.storage
    .from(ASSIGNMENT_SUBMISSIONS_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data?.signedUrl || !data?.token) {
    throw new Error(
      feedbackAudioErrorMessage(
        error ?? "Could not create a signed upload URL.",
        fileMeta.size
      )
    );
  }

  return {
    path: data.path || path,
    signedUrl: data.signedUrl,
    token: data.token,
    contentType,
  };
}

export async function finalizeSubmissionFeedbackAudioUpload(
  submissionId: string,
  path: string
): Promise<void> {
  const trimmed = path.trim();
  if (!trimmed) throw new Error("Feedback audio path is required.");
  await updateAssignmentSubmission(submissionId, {
    feedback_audio_url: trimmed,
  });
}

/**
 * Legacy server-side upload path (kept for compatibility). Prefer signed upload.
 */
export async function uploadSubmissionFeedbackAudio(
  submissionId: string,
  file: File
): Promise<string> {
  const validationError = validateFeedbackAudioFile(file);
  if (validationError) throw new Error(validationError);

  const target = await prepareSubmissionFeedbackAudioUpload(submissionId, {
    name: file.name,
    type: file.type,
    size: file.size,
  });

  const service = createServiceClient();
  if (!service) {
    throw new Error(
      "Audio upload failed: SUPABASE_SERVICE_ROLE_KEY is missing in server config."
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await service.storage
    .from(ASSIGNMENT_SUBMISSIONS_BUCKET)
    .uploadToSignedUrl(target.path, target.token, bytes, {
      contentType: target.contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(feedbackAudioErrorMessage(uploadError, file.size));
  }

  return target.path;
}

export async function deleteAssignmentSubmission(id: string): Promise<void> {
  const supabase = await getAdminDataClient();
  const { data, error: fetchError } = await supabase
    .from("assignment_submissions")
    .select("id, file_url, feedback_audio_url")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!data) throw new Error("Submission not found");

  await Promise.all([
    removeStorageObject(ASSIGNMENT_SUBMISSIONS_BUCKET, data.file_url),
    removeStorageObject(
      ASSIGNMENT_SUBMISSIONS_BUCKET,
      data.feedback_audio_url as string | null
    ),
  ]);

  const { error } = await supabase
    .from("assignment_submissions")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/** Remove all submission files for an assignment before cascading DB deletes. */
export async function removeAssignmentSubmissionFiles(
  assignmentId: string
): Promise<void> {
  const supabase = await getAdminDataClient();
  const { data, error } = await supabase
    .from("assignment_submissions")
    .select("file_url, feedback_audio_url")
    .eq("assignment_id", assignmentId);
  if (error) throw error;
  await removeStorageObjects(ASSIGNMENT_SUBMISSIONS_BUCKET, [
    ...(data ?? []).map((row) => row.file_url as string | null),
    ...(data ?? []).map((row) => row.feedback_audio_url as string | null),
  ]);
}

export type QuizAttemptUpdate = {
  obtained_marks: number;
  is_passed: boolean;
};

export async function updateQuizAttempt(
  id: string,
  input: QuizAttemptUpdate
): Promise<void> {
  const supabase = await getAdminDataClient();
  const { error } = await supabase
    .from("quiz_attempts")
    .update({
      obtained_marks: input.obtained_marks,
      is_passed: input.is_passed,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteQuizAttempt(id: string): Promise<void> {
  const supabase = await getAdminDataClient();
  const { error } = await supabase.from("quiz_attempts").delete().eq("id", id);
  if (error) throw error;
}
