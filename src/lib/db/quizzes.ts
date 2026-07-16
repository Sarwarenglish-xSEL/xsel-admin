import { createClient } from "@/lib/supabase/server";
import type { Quiz, QuizOption, QuizQuestion, QuizType } from "@/types/database";

export type QuizInput = {
  title: string;
  passing_marks: number;
  total_marks: number;
  quiz_type?: QuizType;
  sort_order?: number;
};

export async function getQuizzesByLessonId(lessonId: string): Promise<Quiz[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quizzes")
    .select("*, questions:quiz_questions(*)")
    .eq("lesson_id", lessonId)
    .order("sort_order");
  if (error) throw error;

  return (data ?? []).map((quiz) => ({
    ...quiz,
    questions: (quiz.questions ?? []).sort(
      (a: QuizQuestion, b: QuizQuestion) => a.sort_order - b.sort_order
    ),
  }));
}

export async function getQuizById(id: string): Promise<Quiz | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quizzes")
    .select("*, questions:quiz_questions(*)")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return {
    ...data,
    questions: (data.questions ?? []).sort(
      (a: QuizQuestion, b: QuizQuestion) => a.sort_order - b.sort_order
    ),
  };
}

export async function createQuiz(
  lessonId: string,
  input: QuizInput
): Promise<Quiz> {
  const supabase = await createClient();
  const sortOrder =
    input.sort_order ?? (await nextQuizSortOrder(lessonId));

  const { data, error } = await supabase
    .from("quizzes")
    .insert({
      lesson_id: lessonId,
      title: input.title,
      passing_marks: input.passing_marks,
      total_marks: input.total_marks,
      quiz_type: input.quiz_type ?? "lesson",
      sort_order: sortOrder,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateQuiz(
  id: string,
  input: Partial<QuizInput>
): Promise<Quiz> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quizzes")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function nextQuizSortOrder(lessonId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quizzes")
    .select("sort_order")
    .eq("lesson_id", lessonId)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0]?.sort_order ?? -1) + 1;
}

export async function createQuizQuestion(
  quizId: string,
  input: Omit<QuizQuestion, "id" | "quiz_id">
): Promise<QuizQuestion> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quiz_questions")
    .insert({ quiz_id: quizId, ...input })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateQuizQuestion(
  id: string,
  input: Partial<Omit<QuizQuestion, "id" | "quiz_id">>
): Promise<QuizQuestion> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quiz_questions")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteQuizQuestion(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("quiz_questions").delete().eq("id", id);
  if (error) throw error;
}

export type { QuizOption };
