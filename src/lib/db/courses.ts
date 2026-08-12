import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import type {
  Course,
  CourseCategory,
  CourseStatus,
  CourseType,
  DashboardStats,
  LearningOutcome,
} from "@/types/database";
import { DEFAULT_LEARNING_OUTCOMES } from "@/lib/course-defaults";

export interface CourseFilters {
  course_type?: CourseType;
  status?: CourseStatus;
  category?: CourseCategory;
  search?: string;
}

export async function getCourses(filters?: CourseFilters): Promise<Course[]> {
  const supabase = await createClient();
  let query = supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.course_type) query = query.eq("course_type", filters.course_type);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.search?.trim()) {
    query = query.ilike("title", `%${filters.search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Course[];
}

export async function getCourseById(id: string): Promise<Course | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("*, instructor:profiles!courses_instructor_id_fkey(*)")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Course;
}

/** Public payment page — works for anonymous users (published courses only). */
export async function getPublishedCourseById(id: string): Promise<Course | null> {
  const service = createServiceClient();
  const supabase = service ?? (await createClient());
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return data as Course | null;
}

export type CourseInput = {
  title: string;
  description: string;
  course_type: CourseType;
  category: CourseCategory;
  price: number;
  thumbnail_url?: string | null;
  instructor_id?: string | null;
  status: CourseStatus;
  registration_deadline?: string | null;
  course_start_date?: string | null;
  learning_outcomes?: LearningOutcome[];
};

export async function createCourse(input: CourseInput): Promise<Course> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .insert({
      ...input,
      learning_outcomes: input.learning_outcomes ?? DEFAULT_LEARNING_OUTCOMES,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCourse(
  id: string,
  input: Partial<CourseInput>
): Promise<Course> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function archiveCourse(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update({ status: "archived" })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCourse(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) throw error;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  const [users, courses, purchases, liveLessons] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase
      .from("purchases")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("course_lessons")
      .select("id", { count: "exact", head: true })
      .eq("lesson_type", "live")
      .gte("live_start_time", new Date().toISOString()),
  ]);

  return {
    totalUsers: users.count ?? 0,
    totalCourses: courses.count ?? 0,
    pendingPurchases: purchases.count ?? 0,
    upcomingLiveLessons: liveLessons.count ?? 0,
  };
}

export async function getCourseReviews(courseId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_reviews")
    .select("*, user:profiles(*)")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export type CourseReviewInput = {
  course_id: string;
  reviewer_name: string;
  rating: number;
  review: string;
  created_at: string;
};

export async function createCourseReview(input: CourseReviewInput) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_reviews")
    .insert({
      course_id: input.course_id,
      user_id: null,
      reviewer_name: input.reviewer_name.trim(),
      rating: input.rating,
      review: input.review,
      created_at: input.created_at,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
