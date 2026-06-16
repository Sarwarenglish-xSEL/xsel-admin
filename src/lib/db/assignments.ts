import { createClient } from "@/lib/supabase/server";
import type { Assignment } from "@/types/database";

export async function getAssignmentByLessonId(
  lessonId: string
): Promise<Assignment | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("lesson_id", lessonId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

export async function upsertAssignment(
  lessonId: string,
  input: {
    title: string;
    description: string;
    max_marks: number;
    due_date?: string | null;
  }
): Promise<Assignment> {
  const supabase = await createClient();
  const existing = await getAssignmentByLessonId(lessonId);

  if (existing) {
    const { data, error } = await supabase
      .from("assignments")
      .update(input)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("assignments")
    .insert({ lesson_id: lessonId, ...input })
    .select()
    .single();
  if (error) throw error;
  return data;
}
