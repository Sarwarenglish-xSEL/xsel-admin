import { createClient } from "@/lib/supabase/server";
import type { Quiz, QuizOption, QuizQuestion } from "@/types/database";

export async function getQuizByLessonId(lessonId: string): Promise<Quiz | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quizzes")
    .select("*, questions:quiz_questions(*)")
    .eq("lesson_id", lessonId)
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

export async function upsertQuiz(
  lessonId: string,
  input: { title: string; passing_marks: number; total_marks: number }
): Promise<Quiz> {
  const supabase = await createClient();
  const existing = await getQuizByLessonId(lessonId);

  if (existing) {
    const { data, error } = await supabase
      .from("quizzes")
      .update(input)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("quizzes")
    .insert({ lesson_id: lessonId, ...input })
    .select()
    .single();
  if (error) throw error;
  return data;
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
