import { createClient } from "@/lib/supabase/server";
import type { Assignment, AssignmentType } from "@/types/database";

export type AssignmentInput = {
  title: string;
  description?: string;
  question?: string;
  max_marks: number;
  due_date?: string | null;
  type?: AssignmentType;
  sort_order?: number;
};

export async function getAssignmentsByLessonId(
  lessonId: string
): Promise<Assignment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function getAssignmentById(
  id: string
): Promise<Assignment | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

export async function createAssignment(
  lessonId: string,
  input: AssignmentInput
): Promise<Assignment> {
  const supabase = await createClient();
  const sortOrder =
    input.sort_order ?? (await nextAssignmentSortOrder(lessonId));

  const { data, error } = await supabase
    .from("assignments")
    .insert({
      lesson_id: lessonId,
      title: input.title,
      description: input.description ?? "",
      question: input.question ?? "",
      max_marks: input.max_marks,
      due_date: input.due_date ?? null,
      type: input.type ?? "written",
      sort_order: sortOrder,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAssignment(
  id: string,
  input: Partial<AssignmentInput>
): Promise<Assignment> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignments")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function nextAssignmentSortOrder(lessonId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignments")
    .select("sort_order")
    .eq("lesson_id", lessonId)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0]?.sort_order ?? -1) + 1;
}
