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

export async function getEnrollments(filters?: {
  courseId?: string;
  batchId?: string;
}): Promise<CourseEnrollment[]> {
  const supabase = await createClient();
  let query = supabase
    .from("course_enrollments")
    .select("*, user:profiles(*), course:courses(*), batch:course_batches(*)")
    .order("created_at", { ascending: false });

  if (filters?.courseId) query = query.eq("course_id", filters.courseId);
  if (filters?.batchId) query = query.eq("batch_id", filters.batchId);

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as CourseEnrollment[]).map(mapEnrollmentRow);
}

export async function getEnrollmentsByBatch(batchId: string): Promise<CourseEnrollment[]> {
  return getEnrollments({ batchId });
}

export async function createEnrollment(
  userId: string,
  courseId: string,
  batchId: string
): Promise<CourseEnrollment> {
  const supabase = await createClient();

  const { data: batch, error: batchError } = await supabase
    .from("course_batches")
    .select("id, course_id, max_seats")
    .eq("id", batchId)
    .single();
  if (batchError) throw batchError;
  if (batch.course_id !== courseId) {
    throw new Error("Batch does not belong to the selected course");
  }

  if (batch.max_seats != null) {
    const { count, error: countError } = await supabase
      .from("course_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("batch_id", batchId)
      .in("status", ["active", "completed"]);
    if (countError) throw countError;
    if (count != null && count >= batch.max_seats) {
      throw new Error("This batch has reached its maximum seat capacity");
    }
  }

  const { data, error } = await supabase
    .from("course_enrollments")
    .insert({
      user_id: userId,
      course_id: courseId,
      batch_id: batchId,
      status: "active",
    })
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

    if (error.code === "22P02") {
      lastError = error;
      continue;
    }

    throw error;
  }

  if (lastError) throw lastError;
}
