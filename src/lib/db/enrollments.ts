import { createClient } from "@/lib/supabase/server";
import type { CourseEnrollment, EnrollmentStatus } from "@/types/database";

function normalizeEnrollmentStatus(status: string): EnrollmentStatus {
  if (status === "revoked" || status === "blocked") return "blocked";
  return status as EnrollmentStatus;
}

function enrollmentStatusDbValues(status: EnrollmentStatus): string[] {
  if (status === "blocked") return ["blocked", "revoked"];
  return [status];
}

function mapEnrollmentRow(row: CourseEnrollment): CourseEnrollment {
  return {
    ...row,
    status: normalizeEnrollmentStatus(row.status),
  };
}

export async function getEnrollments(): Promise<CourseEnrollment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_enrollments")
    .select("*, user:profiles(*), course:courses(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as CourseEnrollment[]).map(mapEnrollmentRow);
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
  return mapEnrollmentRow(data as CourseEnrollment);
}

export async function updateEnrollmentStatus(
  id: string,
  status: EnrollmentStatus
): Promise<void> {
  const supabase = await createClient();
  const candidates = enrollmentStatusDbValues(status);
  let lastError: { code?: string; message: string } | null = null;

  for (const dbStatus of candidates) {
    const { error } = await supabase
      .from("course_enrollments")
      .update({ status: dbStatus })
      .eq("id", id);

    if (!error) return;

    // Enum mismatch: try the legacy value (revoked) when blocked is not in DB yet.
    if (error.code === "22P02") {
      lastError = error;
      continue;
    }

    throw error;
  }

  if (lastError) throw lastError;
}
