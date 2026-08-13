"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createCourse,
  updateCourse,
  getCourseById,
  archiveCourse,
  deleteCourse,
  createCourseReview,
  type CourseInput,
  type CourseReviewInput,
} from "@/lib/db/courses";
import { notifyUsersCoursePublished } from "@/lib/email";
import {
  createChapter,
  updateChapter,
  deleteChapter,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderChapters,
  reorderLessons,
  getLessonById,
  type LessonInput,
} from "@/lib/db/chapters";
import {
  extractBunnyVideoId,
  getBunnyVideoDuration,
} from "@/lib/bunny-stream";
import { createUser, deleteUser, updateUser, updateUserRole } from "@/lib/db/profiles";
import { approvePurchase, rejectPurchase, createPurchaseRequest, uploadPurchaseReceipt } from "@/lib/db/purchases";
import { getPublishedCourseById } from "@/lib/db/courses";
import { RECEIPT_ACCEPT, RECEIPT_MAX_BYTES } from "@/lib/payment-config";
import {
  createEnrollment,
  updateEnrollmentStatus,
} from "@/lib/db/enrollments";
import {
  createBatch,
  updateBatch,
  deleteBatch,
  getBatchForCourse,
  type BatchInput,
} from "@/lib/db/batches";
import {
  createQuiz,
  updateQuiz,
  createQuizQuestion,
  updateQuizQuestion,
  deleteQuizQuestion,
} from "@/lib/db/quizzes";
import { createAssignment, updateAssignment } from "@/lib/db/assignments";
import {
  gradeSubmission,
  getAssignmentSubmissionSignedUrl,
} from "@/lib/db/submissions";
import { issueCertificate } from "@/lib/db/certificates";
import type {
  AssignmentType,
  BatchStatus,
  EnrollmentStatus,
  Profile,
  QuizOption,
  QuizType,
  UserRole,
} from "@/types/database";

type AuthActionResult =
  | { ok: true; needsEmailConfirmation?: boolean }
  | { ok: false; message: string };

function formatAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("email not confirmed")) {
    return "Please confirm your email before signing in. Check your inbox for the confirmation link.";
  }
  return message;
}

export async function signInAction(
  email: string,
  password: string
): Promise<AuthActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    return { ok: false, message: formatAuthError(error.message) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    await supabase.auth.signOut();
    return { ok: false, message: "You are not admin" };
  }

  return { ok: true };
}

export async function signUpAction(
  email: string,
  password: string,
  fullName: string,
  role: UserRole
): Promise<AuthActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role,
      },
    },
  });
  if (error) {
    return { ok: false, message: formatAuthError(error.message) };
  }
  return { ok: true, needsEmailConfirmation: !data.session };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createCourseAction(input: CourseInput) {
  const course = await createCourse(input);
  revalidatePath("/courses");
  return course;
}

export async function updateCourseAction(id: string, input: Partial<CourseInput>) {
  const existing = await getCourseById(id);
  const course = await updateCourse(id, input);

  const becamePublished =
    input.status === "published" && existing?.status !== "published";

  if (becamePublished) {
    // Fire-and-forget: do not block save if Gmail SMTP fails
    void notifyUsersCoursePublished({
      title: course.title,
      description: course.description,
      price: course.price,
      category: course.category,
      course_type: course.course_type,
    }).then((result) => {
      if (result.error) {
        console.error("[updateCourseAction] publish email:", result.error);
      } else if (!result.skipped) {
        console.log(`[updateCourseAction] notified ${result.sent} users`);
      }
    });
  }

  revalidatePath("/courses");
  revalidatePath(`/courses/${id}/edit`);
}

export async function archiveCourseAction(id: string) {
  await archiveCourse(id);
  revalidatePath("/courses");
}

export async function deleteCourseAction(id: string) {
  await deleteCourse(id);
  revalidatePath("/courses");
}

export async function createChapterAction(
  batchId: string,
  courseId: string,
  title: string,
  sortOrder: number
) {
  const chapter = await createChapter(batchId, courseId, title, sortOrder);
  revalidatePath(`/batches/${batchId}/edit`);
  return chapter;
}

export async function updateChapterAction(
  batchId: string,
  id: string,
  input: { title?: string; sort_order?: number }
) {
  await updateChapter(id, input);
  revalidatePath(`/batches/${batchId}/edit`);
}

export async function deleteChapterAction(batchId: string, id: string) {
  await deleteChapter(id);
  revalidatePath(`/batches/${batchId}/edit`);
}

export async function reorderChaptersAction(
  batchId: string,
  items: { id: string; sort_order: number }[]
) {
  await reorderChapters(items);
  revalidatePath(`/batches/${batchId}/edit`);
}

async function resolveVideoLessonFields(
  input: Partial<LessonInput>,
  existing?: {
    lesson_type?: string;
    video_url?: string | null;
    duration_seconds?: number | null;
  } | null
): Promise<Partial<LessonInput>> {
  const lessonType = input.lesson_type ?? existing?.lesson_type;

  // Keep existing behavior for switching away from video lessons,
  // but still allow resolving `video_url` for live lessons when provided.
  if (lessonType !== "video" && !("video_url" in input)) {
    if (input.lesson_type && input.lesson_type !== "video") {
      return { ...input, duration_seconds: null };
    }
    return input;
  }

  if (!("video_url" in input)) return input;

  const rawVideoUrl = input.video_url?.trim() ?? "";
  if (!rawVideoUrl) {
    return {
      ...input,
      video_url: null,
      duration_seconds: null,
    };
  }

  const videoId = extractBunnyVideoId(rawVideoUrl);
  const videoChanged = existing?.video_url !== videoId;

  if (!videoChanged && existing?.duration_seconds != null) {
    return {
      ...input,
      video_url: videoId,
      duration_seconds: existing.duration_seconds,
    };
  }

  try {
    const duration_seconds = await getBunnyVideoDuration(videoId);
    return {
      ...input,
      video_url: videoId,
      duration_seconds,
    };
  } catch (error) {
    // For completed live lessons, still allow saving the recording URL
    // even if Bunny duration lookup fails.
    if (lessonType === "live") {
      return {
        ...input,
        video_url: videoId,
        duration_seconds: existing?.duration_seconds ?? null,
      };
    }
    throw error;
  }
}

export async function createLessonAction(
  batchId: string,
  input: LessonInput
) {
  const resolved = await resolveVideoLessonFields(input);
  const lesson = await createLesson({ ...input, ...resolved });
  revalidatePath(`/batches/${batchId}/edit`);
  return lesson;
}

export async function updateLessonAction(
  batchId: string,
  id: string,
  input: Partial<LessonInput>
) {
  const existing = await getLessonById(id);
  const resolved = await resolveVideoLessonFields(input, existing);
  const lesson = await updateLesson(id, { ...input, ...resolved });
  revalidatePath(`/batches/${batchId}/edit`);
  revalidatePath("/live");
  return lesson;
}

export async function deleteLessonAction(batchId: string, id: string) {
  await deleteLesson(id);
  revalidatePath(`/batches/${batchId}/edit`);
}

export async function reorderLessonsAction(
  batchId: string,
  items: { id: string; sort_order: number }[]
) {
  await reorderLessons(items);
  revalidatePath(`/batches/${batchId}/edit`);
}

type UserActionResult = { ok: true } | { ok: false; message: string };

export async function updateUserRoleAction(userId: string, role: Profile["role"]) {
  await updateUserRole(userId, role);
  revalidatePath("/users");
}

export async function updateUserAction(
  userId: string,
  fullName: string,
  email: string,
  role: UserRole
): Promise<UserActionResult> {
  const result = await updateUser(userId, {
    full_name: fullName,
    email,
    role,
  });
  if (!result.ok) {
    return { ok: false, message: formatAuthError(result.message) };
  }
  revalidatePath("/users");
  return { ok: true };
}

export async function deleteUserAction(userId: string): Promise<UserActionResult> {
  const result = await deleteUser(userId);
  if (!result.ok) {
    return { ok: false, message: formatAuthError(result.message) };
  }
  revalidatePath("/users");
  return { ok: true };
}

export async function createUserAction(
  email: string,
  fullName: string,
  role: UserRole
): Promise<AuthActionResult> {
  const result = await createUser(email, fullName, role);
  if (!result.ok) {
    return { ok: false, message: formatAuthError(result.message) };
  }
  revalidatePath("/users");
  return { ok: true, needsEmailConfirmation: result.needsEmailConfirmation };
}

export async function approvePurchaseAction(
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await approvePurchase(id);
    revalidatePath("/purchases");
    revalidatePath("/dashboard");
    revalidatePath("/enrollments");
    return { ok: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to approve purchase.";
    return { ok: false, message };
  }
}

export async function rejectPurchaseAction(
  id: string,
  adminNote: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await rejectPurchase(id, adminNote);
    revalidatePath("/purchases");
    revalidatePath("/dashboard");
    revalidatePath("/enrollments");
    return { ok: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to reject purchase.";
    return { ok: false, message };
  }
}

export async function submitPurchaseReceiptAction(
  formData: FormData
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const courseId = String(formData.get("courseId") ?? "").trim();
    const userId = String(formData.get("userId") ?? "").trim();
    const batchId = String(formData.get("batchId") ?? "").trim();
    const file = formData.get("file");

    if (!userId) return { ok: false, message: "User ID is required." };
    if (!courseId) return { ok: false, message: "Course ID is required." };
    if (!batchId) return { ok: false, message: "Batch ID is required." };
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, message: "Please select a receipt to upload." };
    }

    const acceptedTypes = Object.keys(RECEIPT_ACCEPT);
    if (!acceptedTypes.includes(file.type)) {
      return { ok: false, message: "Please upload a JPG, PNG, or PDF file." };
    }
    if (file.size > RECEIPT_MAX_BYTES) {
      return { ok: false, message: "File must be 5MB or smaller." };
    }

    const course = await getPublishedCourseById(courseId);
    if (!course) {
      return {
        ok: false,
        message: "Course not found or not available for purchase.",
      };
    }

    const batch = await getBatchForCourse(batchId, courseId);
    if (!batch) {
      return {
        ok: false,
        message: "Batch not found for this course.",
      };
    }

    const receiptUrl = await uploadPurchaseReceipt(userId, courseId, file);
    await createPurchaseRequest(
      userId,
      courseId,
      Number(course.price),
      receiptUrl,
      batchId
    );
    revalidatePath(`/payment/${courseId}`);
    revalidatePath("/purchases");
    return { ok: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to submit payment receipt.";
    return { ok: false, message };
  }
}

export async function createEnrollmentAction(
  userId: string,
  courseId: string,
  batchId: string
) {
  await createEnrollment(userId, courseId, batchId);
  revalidatePath("/enrollments");
  revalidatePath("/batches");
  revalidatePath(`/batches/${batchId}/edit`);
}

export async function updateEnrollmentStatusAction(
  id: string,
  status: EnrollmentStatus
) {
  await updateEnrollmentStatus(id, status);
  revalidatePath("/enrollments");
  revalidatePath("/batches");
}

export async function createBatchAction(input: BatchInput) {
  const batch = await createBatch(input);
  revalidatePath("/batches");
  return batch;
}

export async function updateBatchAction(
  id: string,
  input: Partial<Omit<BatchInput, "course_id">>
) {
  await updateBatch(id, input);
  revalidatePath("/batches");
  revalidatePath(`/batches/${id}/edit`);
}

export async function deleteBatchAction(id: string) {
  await deleteBatch(id);
  revalidatePath("/batches");
}

export async function createQuizAction(
  batchId: string,
  lessonId: string,
  input: {
    title: string;
    questions: {
      question: string;
      option_a: string;
      option_b: string;
      option_c: string;
      option_d: string;
      correct_option: QuizOption;
      reason?: string;
    }[];
    passing_marks?: number;
    total_marks?: number;
    quiz_type?: QuizType;
  }
) {
  const quiz = await createQuiz(lessonId, {
    title: input.title,
    passing_marks: input.passing_marks ?? 0,
    total_marks: input.total_marks ?? input.questions.length * 10,
    quiz_type: input.quiz_type ?? "lesson",
  });
  for (let i = 0; i < input.questions.length; i++) {
    const q = input.questions[i];
    await createQuizQuestion(quiz.id, {
      ...q,
      reason: q.reason ?? "",
      sort_order: i,
    });
  }
  revalidatePath(`/batches/${batchId}/edit`);
  revalidatePath(`/batches/${batchId}/lessons/${lessonId}/quiz/${quiz.id}`);
  return {
    id: quiz.id,
    title: quiz.title,
    quiz_type: quiz.quiz_type,
    sort_order: quiz.sort_order,
  };
}

export async function createAssignmentAction(
  batchId: string,
  lessonId: string,
  input: {
    title: string;
    question: string;
    description?: string;
    max_marks?: number;
    type?: AssignmentType;
  }
) {
  const assignment = await createAssignment(lessonId, {
    title: input.title,
    question: input.question,
    description: input.description ?? "",
    max_marks: input.max_marks ?? 100,
    type: input.type ?? "written",
  });
  revalidatePath(`/batches/${batchId}/edit`);
  revalidatePath(
    `/batches/${batchId}/lessons/${lessonId}/assignment/${assignment.id}`
  );
  return {
    id: assignment.id,
    title: assignment.title,
    type: assignment.type,
    sort_order: assignment.sort_order,
  };
}

export async function saveQuizAction(
  batchId: string,
  lessonId: string,
  quizId: string,
  input: {
    title: string;
    passing_marks: number;
    total_marks: number;
    quiz_type?: QuizType;
  }
) {
  const quiz = await updateQuiz(quizId, input);
  revalidatePath(`/batches/${batchId}/edit`);
  revalidatePath(`/batches/${batchId}/lessons/${lessonId}/quiz/${quizId}`);
  return quiz;
}

export async function addQuizQuestionAction(
  batchId: string,
  lessonId: string,
  quizId: string,
  input: {
    question: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: QuizOption;
    reason: string;
    sort_order: number;
  }
) {
  const question = await createQuizQuestion(quizId, input);
  revalidatePath(`/batches/${batchId}/lessons/${lessonId}/quiz/${quizId}`);
  return question;
}

export async function updateQuizQuestionAction(
  batchId: string,
  lessonId: string,
  quizId: string,
  questionId: string,
  input: Partial<{
    question: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: QuizOption;
    reason: string;
    sort_order: number;
  }>
) {
  const question = await updateQuizQuestion(questionId, input);
  revalidatePath(`/batches/${batchId}/lessons/${lessonId}/quiz/${quizId}`);
  return question;
}

export async function deleteQuizQuestionAction(
  batchId: string,
  lessonId: string,
  quizId: string,
  questionId: string
) {
  await deleteQuizQuestion(questionId);
  revalidatePath(`/batches/${batchId}/lessons/${lessonId}/quiz/${quizId}`);
}

export async function saveAssignmentAction(
  batchId: string,
  lessonId: string,
  assignmentId: string,
  input: {
    title: string;
    description: string;
    question: string;
    max_marks: number;
    due_date?: string | null;
    type?: AssignmentType;
  }
) {
  const assignment = await updateAssignment(assignmentId, input);
  revalidatePath(`/batches/${batchId}/edit`);
  revalidatePath(
    `/batches/${batchId}/lessons/${lessonId}/assignment/${assignmentId}`
  );
  return assignment;
}

export async function gradeSubmissionAction(
  id: string,
  obtainedMarks: number,
  feedback: string
) {
  await gradeSubmission(id, obtainedMarks, feedback);
  revalidatePath("/submissions");
}

export async function getSubmissionFileUrlAction(fileUrl: string) {
  return getAssignmentSubmissionSignedUrl(fileUrl);
}

export async function issueCertificateAction(
  userId: string,
  courseId: string,
  certificateUrl: string
) {
  await issueCertificate(userId, courseId, certificateUrl);
  revalidatePath("/certificates");
}

export async function createCourseReviewAction(input: CourseReviewInput) {
  await createCourseReview(input);
  revalidatePath(`/courses/${input.course_id}/edit`);
}
