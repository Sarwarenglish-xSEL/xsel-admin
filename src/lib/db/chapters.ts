import { createClient } from "@/lib/supabase/server";
import type { CourseChapter, CourseLesson } from "@/types/database";

export async function getChaptersWithLessons(
  courseId: string
): Promise<CourseChapter[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_chapters")
    .select("*, lessons:course_lessons(*)")
    .eq("course_id", courseId)
    .order("sort_order");
  if (error) throw error;

  return (data ?? []).map((ch) => ({
    ...ch,
    lessons: (ch.lessons ?? []).sort(
      (a: CourseLesson, b: CourseLesson) => a.sort_order - b.sort_order
    ),
  }));
}

export async function createChapter(
  courseId: string,
  title: string,
  sortOrder: number
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_chapters")
    .insert({ course_id: courseId, title, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateChapter(
  id: string,
  input: { title?: string; sort_order?: number }
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_chapters")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteChapter(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("course_chapters").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderChapters(
  items: { id: string; sort_order: number }[]
) {
  const supabase = await createClient();
  for (const item of items) {
    const { error } = await supabase
      .from("course_chapters")
      .update({ sort_order: item.sort_order })
      .eq("id", item.id);
    if (error) throw error;
  }
}

export type LessonInput = {
  chapter_id: string;
  title: string;
  lesson_type: CourseLesson["lesson_type"];
  video_url?: string | null;
  live_meeting_url?: string | null;
  live_start_time?: string | null;
  live_end_time?: string | null;
  duration_seconds?: number | null;
  sort_order: number;
  status: CourseLesson["status"];
};

export async function createLesson(input: LessonInput) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_lessons")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateLesson(id: string, input: Partial<LessonInput>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_lessons")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLesson(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("course_lessons").delete().eq("id", id);
  if (error) throw error;
}

export async function getLessonById(id: string): Promise<CourseLesson | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_lessons")
    .select("*, chapter:course_chapters(*, course:courses(*))")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as CourseLesson;
}

export async function getUpcomingLiveLessons() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_lessons")
    .select(
      "*, chapter:course_chapters(id, title, course:courses(id, title))"
    )
    .eq("lesson_type", "live")
    .gte("live_start_time", new Date().toISOString())
    .order("live_start_time");
  if (error) throw error;
  return data ?? [];
}

export async function reorderLessons(
  items: { id: string; sort_order: number }[]
) {
  const supabase = await createClient();
  for (const item of items) {
    const { error } = await supabase
      .from("course_lessons")
      .update({ sort_order: item.sort_order })
      .eq("id", item.id);
    if (error) throw error;
  }
}
