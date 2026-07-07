"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createCourse,
  updateCourse,
  archiveCourse,
  deleteCourse,
  type CourseInput,
} from "@/lib/db/courses";
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
import { approvePurchase, rejectPurchase, createPurchaseRequest } from "@/lib/db/purchases";
import { getCourseById } from "@/lib/db/courses";
import {
  createEnrollment,
  updateEnrollmentStatus,
} from "@/lib/db/enrollments";
import {
  createBatch,
  updateBatch,
  deleteBatch,
  type BatchInput,
} from "@/lib/db/batches";
import {
  upsertQuiz,
  createQuizQuestion,
  updateQuizQuestion,
  deleteQuizQuestion,
} from "@/lib/db/quizzes";
import { upsertAssignment } from "@/lib/db/assignments";
import { gradeSubmission } from "@/lib/db/submissions";
import { issueCertificate } from "@/lib/db/certificates";
import type { BatchStatus, EnrollmentStatus, Profile, QuizOption, UserRole } from "@/types/database";

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
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, message: formatAuthError(error.message) };
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

export async function paymentSignOutAction(returnTo: string) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(returnTo.startsWith("/payment/") ? returnTo : "/");
}

export async function createCourseAction(input: CourseInput) {
  const course = await createCourse(input);
  revalidatePath("/courses");
  return course;
}

export async function updateCourseAction(id: string, input: Partial<CourseInput>) {
  await updateCourse(id, input);
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
  courseId: string,
  title: string,
  sortOrder: number
) {
  const chapter = await createChapter(courseId, title, sortOrder);
  revalidatePath(`/courses/${courseId}/edit`);
  return chapter;
}

export async function updateChapterAction(
  courseId: string,
  id: string,
  input: { title?: string; sort_order?: number }
) {
  await updateChapter(id, input);
  revalidatePath(`/courses/${courseId}/edit`);
}

export async function deleteChapterAction(courseId: string, id: string) {
  await deleteChapter(id);
  revalidatePath(`/courses/${courseId}/edit`);
}

export async function reorderChaptersAction(
  courseId: string,
  items: { id: string; sort_order: number }[]
) {
  await reorderChapters(items);
  revalidatePath(`/courses/${courseId}/edit`);
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

  if (lessonType !== "video") {
    if (input.lesson_type && input.lesson_type !== "video") {
      return { ...input, duration_seconds: null };
    }
    return input;
  }

  if (!("video_url" in input)) {
    return input;
  }

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

  const duration_seconds = await getBunnyVideoDuration(videoId);
  return {
    ...input,
    video_url: videoId,
    duration_seconds,
  };
}

export async function createLessonAction(
  courseId: string,
  input: LessonInput
) {
  const resolved = await resolveVideoLessonFields(input);
  const lesson = await createLesson({ ...input, ...resolved });
  revalidatePath(`/courses/${courseId}/edit`);
  return lesson;
}

export async function updateLessonAction(
  courseId: string,
  id: string,
  input: Partial<LessonInput>
) {
  const existing = await getLessonById(id);
  const resolved = await resolveVideoLessonFields(input, existing);
  const lesson = await updateLesson(id, { ...input, ...resolved });
  revalidatePath(`/courses/${courseId}/edit`);
  revalidatePath("/live");
  return lesson;
}

export async function deleteLessonAction(courseId: string, id: string) {
  await deleteLesson(id);
  revalidatePath(`/courses/${courseId}/edit`);
}

export async function reorderLessonsAction(
  courseId: string,
  items: { id: string; sort_order: number }[]
) {
  await reorderLessons(items);
  revalidatePath(`/courses/${courseId}/edit`);
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

export async function approvePurchaseAction(id: string) {
  await approvePurchase(id);
  revalidatePath("/purchases");
  revalidatePath("/dashboard");
  revalidatePath("/enrollments");
}

export async function rejectPurchaseAction(id: string, adminNote: string) {
  await rejectPurchase(id, adminNote);
  revalidatePath("/purchases");
  revalidatePath("/dashboard");
  revalidatePath("/enrollments");
}

export async function submitPurchaseReceiptAction(
  courseId: string,
  userId: string,
  receiptUrl: string
) {
  if (!userId?.trim()) {
    throw new Error("User ID is required.");
  }
  if (!courseId?.trim()) {
    throw new Error("Course ID is required.");
  }
  if (!receiptUrl?.trim()) {
    throw new Error("Receipt URL is required.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to submit your payment.");
  if (user.id !== userId) {
    throw new Error("Signed-in user does not match the payment account.");
  }

  const course = await getCourseById(courseId);
  if (!course) throw new Error("Course not found.");
  if (course.status !== "published") {
    throw new Error("This course is not available for purchase.");
  }

  await createPurchaseRequest(
    userId,
    courseId,
    Number(course.price),
    receiptUrl
  );
  revalidatePath(`/payment/${courseId}`);
}

export async function createEnrollmentAction(
  userId: string,
  courseId: string,
  batchId: string
) {
  await createEnrollment(userId, courseId, batchId);
  revalidatePath("/enrollments");
  revalidatePath("/batches");
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
  revalidatePath(`/courses/${input.course_id}/edit`);
  return batch;
}

export async function updateBatchAction(
  id: string,
  courseId: string,
  input: Partial<Omit<BatchInput, "course_id">>
) {
  await updateBatch(id, input);
  revalidatePath("/batches");
  revalidatePath(`/courses/${courseId}/edit`);
}

export async function deleteBatchAction(id: string, courseId: string) {
  await deleteBatch(id);
  revalidatePath("/batches");
  revalidatePath(`/courses/${courseId}/edit`);
}

export async function createQuizAction(
  courseId: string,
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
    }[];
    passing_marks?: number;
    total_marks?: number;
  }
) {
  const quiz = await upsertQuiz(lessonId, {
    title: input.title,
    passing_marks: input.passing_marks ?? 0,
    total_marks: input.total_marks ?? input.questions.length * 10,
  });
  for (let i = 0; i < input.questions.length; i++) {
    await createQuizQuestion(quiz.id, {
      ...input.questions[i],
      sort_order: i,
    });
  }
  revalidatePath(`/courses/${courseId}/edit`);
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}/quiz`);
  return { id: quiz.id, title: quiz.title };
}

export async function createAssignmentAction(
  courseId: string,
  lessonId: string,
  input: {
    title: string;
    question: string;
    max_marks?: number;
  }
) {
  const assignment = await upsertAssignment(lessonId, {
    title: input.title,
    description: input.question,
    max_marks: input.max_marks ?? 100,
  });
  revalidatePath(`/courses/${courseId}/edit`);
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}/assignment`);
  return { id: assignment.id, title: assignment.title };
}

export async function saveQuizAction(
  courseId: string,
  lessonId: string,
  input: { title: string; passing_marks: number; total_marks: number }
) {
  const quiz = await upsertQuiz(lessonId, input);
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}/quiz`);
  return quiz;
}

export async function addQuizQuestionAction(
  courseId: string,
  lessonId: string,
  quizId: string,
  input: {
    question: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: QuizOption;
    sort_order: number;
  }
) {
  const question = await createQuizQuestion(quizId, input);
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}/quiz`);
  return question;
}

export async function updateQuizQuestionAction(
  courseId: string,
  lessonId: string,
  questionId: string,
  input: Partial<{
    question: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: QuizOption;
    sort_order: number;
  }>
) {
  await updateQuizQuestion(questionId, input);
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}/quiz`);
}

export async function deleteQuizQuestionAction(
  courseId: string,
  lessonId: string,
  questionId: string
) {
  await deleteQuizQuestion(questionId);
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}/quiz`);
}

export async function saveAssignmentAction(
  courseId: string,
  lessonId: string,
  input: {
    title: string;
    description: string;
    max_marks: number;
    due_date?: string | null;
  }
) {
  const assignment = await upsertAssignment(lessonId, input);
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}/assignment`);
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

export async function issueCertificateAction(
  userId: string,
  courseId: string,
  certificateUrl: string
) {
  await issueCertificate(userId, courseId, certificateUrl);
  revalidatePath("/certificates");
}
