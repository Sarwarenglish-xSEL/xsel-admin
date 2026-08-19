import { createClient } from "@/lib/supabase/server";
import type { CourseChapter, CourseLesson } from "@/types/database";

export async function getChaptersWithLessons(
  batchId: string
): Promise<CourseChapter[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_chapters")
    .select(
      "*, lessons:course_lessons(*, quizzes(id, title, quiz_type, sort_order), assignments(id, title, type, sort_order))"
    )
    .eq("batch_id", batchId)
    .order("sort_order");
  if (error) throw error;

  return (data ?? []).map((ch) => ({
    ...ch,
    lessons: (ch.lessons ?? [])
      .map(
        (
          lesson: CourseLesson & {
            quizzes?: CourseLesson["quizzes"];
            assignments?: CourseLesson["assignments"];
          }
        ) => ({
          ...lesson,
          quizzes: sortByOrder(asArray(lesson.quizzes)),
          assignments: sortByOrder(asArray(lesson.assignments)),
        })
      )
      .sort(
        (a: CourseLesson, b: CourseLesson) => a.sort_order - b.sort_order
      ),
  }));
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function sortByOrder<T extends { sort_order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.sort_order - b.sort_order);
}

export async function createChapter(
  batchId: string,
  courseId: string,
  title: string,
  sortOrder: number
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_chapters")
    .insert({ batch_id: batchId, course_id: courseId, title, sort_order: sortOrder })
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
  live_class_status?: string | null;
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
      "*, chapter:course_chapters(id, title, batch_id, course:courses(id, title), batch:course_batches(id, name))"
    )
    .eq("lesson_type", "live")
    .order("live_start_time");
  if (error) throw error;

  const now = new Date();
  return (data ?? []).filter((lesson) => {
    const startTime = lesson.live_start_time
      ? new Date(lesson.live_start_time)
      : null;

    return (
      (startTime ? startTime >= now : false) ||
      lesson.status === "completed" ||
      lesson.live_class_status === "completed"
    );
  });
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
