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
  type LessonInput,
} from "@/lib/db/chapters";
import { updateUserRole } from "@/lib/db/profiles";
import { approvePurchase, rejectPurchase, createPurchaseRequest } from "@/lib/db/purchases";
import { getCourseById } from "@/lib/db/courses";
import {
  createEnrollment,
  updateEnrollmentStatus,
} from "@/lib/db/enrollments";
import {
  upsertQuiz,
  createQuizQuestion,
  updateQuizQuestion,
  deleteQuizQuestion,
} from "@/lib/db/quizzes";
import { upsertAssignment } from "@/lib/db/assignments";
import { gradeSubmission } from "@/lib/db/submissions";
import { issueCertificate } from "@/lib/db/certificates";
import type { EnrollmentStatus, Profile, QuizOption, UserRole } from "@/types/database";

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
  await createChapter(courseId, title, sortOrder);
  revalidatePath(`/courses/${courseId}/edit`);
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

export async function createLessonAction(
  courseId: string,
  input: LessonInput
) {
  await createLesson(input);
  revalidatePath(`/courses/${courseId}/edit`);
}

export async function updateLessonAction(
  courseId: string,
  id: string,
  input: Partial<LessonInput>
) {
  await updateLesson(id, input);
  revalidatePath(`/courses/${courseId}/edit`);
  revalidatePath("/live");
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

export async function updateUserRoleAction(userId: string, role: Profile["role"]) {
  await updateUserRole(userId, role);
  revalidatePath("/users");
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

export async function createEnrollmentAction(userId: string, courseId: string) {
  await createEnrollment(userId, courseId);
  revalidatePath("/enrollments");
}

export async function updateEnrollmentStatusAction(
  id: string,
  status: EnrollmentStatus
) {
  await updateEnrollmentStatus(id, status);
  revalidatePath("/enrollments");
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
  await upsertAssignment(lessonId, {
    title: input.title,
    description: input.question,
    max_marks: input.max_marks ?? 100,
  });
  revalidatePath(`/courses/${courseId}/edit`);
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}/assignment`);
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
  await createQuizQuestion(quizId, input);
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}/quiz`);
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
  await upsertAssignment(lessonId, input);
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}/assignment`);
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
