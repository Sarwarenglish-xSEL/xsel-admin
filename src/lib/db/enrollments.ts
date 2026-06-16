import { createClient } from "@/lib/supabase/server";
import type { CourseEnrollment, EnrollmentStatus } from "@/types/database";

export async function getEnrollments(): Promise<CourseEnrollment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_enrollments")
    .select("*, user:profiles(*), course:courses(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CourseEnrollment[];
}

export async function createEnrollment(
  userId: string,
  courseId: string
): Promise<CourseEnrollment> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_enrollments")
    .insert({ user_id: userId, course_id: courseId, status: "active" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEnrollmentStatus(
  id: string,
  status: EnrollmentStatus
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("course_enrollments")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}
