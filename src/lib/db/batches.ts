import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import type { BatchStatus, CourseBatch } from "@/types/database";

export type BatchInput = {
  course_id: string;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  registration_deadline?: string | null;
  status?: BatchStatus;
  max_seats?: number | null;
};

export async function getBatchesByCourse(courseId: string): Promise<CourseBatch[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_batches")
    .select("*")
    .eq("course_id", courseId)
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CourseBatch[];
}

export async function getBatchesWithCounts(courseId: string): Promise<CourseBatch[]> {
  const batches = await getBatchesByCourse(courseId);
  if (batches.length === 0) return [];

  const supabase = await createClient();
  const batchIds = batches.map((b) => b.id);
  const { data: enrollments, error } = await supabase
    .from("course_enrollments")
    .select("batch_id, status")
    .in("batch_id", batchIds);
  if (error) throw error;

  const counts = new Map<string, { total: number; active: number }>();
  for (const row of enrollments ?? []) {
    if (!row.batch_id) continue;
    const current = counts.get(row.batch_id) ?? { total: 0, active: 0 };
    current.total += 1;
    if (row.status === "active" || row.status === "completed") {
      current.active += 1;
    }
    counts.set(row.batch_id, current);
  }

  return batches.map((batch) => {
    const c = counts.get(batch.id) ?? { total: 0, active: 0 };
    return {
      ...batch,
      enrollment_count: c.total,
      active_enrollment_count: c.active,
    };
  });
}

export async function getAllBatchesOverview(): Promise<CourseBatch[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_batches")
    .select("*, course:courses(id, title, course_type, category, status, thumbnail_url)")
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  const batches = (data ?? []) as CourseBatch[];
  if (batches.length === 0) return [];

  const batchIds = batches.map((b) => b.id);
  const { data: enrollments, error: enrollError } = await supabase
    .from("course_enrollments")
    .select("batch_id, status")
    .in("batch_id", batchIds);
  if (enrollError) throw enrollError;

  const counts = new Map<string, { total: number; active: number }>();
  for (const row of enrollments ?? []) {
    if (!row.batch_id) continue;
    const current = counts.get(row.batch_id) ?? { total: 0, active: 0 };
    current.total += 1;
    if (row.status === "active" || row.status === "completed") {
      current.active += 1;
    }
    counts.set(row.batch_id, current);
  }

  return batches.map((batch) => {
    const c = counts.get(batch.id) ?? { total: 0, active: 0 };
    return {
      ...batch,
      enrollment_count: c.total,
      active_enrollment_count: c.active,
    };
  });
}

export async function getBatchById(batchId: string): Promise<CourseBatch | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_batches")
    .select("*, course:courses(*)")
    .eq("id", batchId)
    .maybeSingle();
  if (error) throw error;
  return data as CourseBatch | null;
}

/** Public payment page: batch must belong to the given course. */
export async function getBatchForCourse(
  batchId: string,
  courseId: string
): Promise<CourseBatch | null> {
  const service = createServiceClient();
  const supabase = service ?? (await createClient());
  const { data, error } = await supabase
    .from("course_batches")
    .select("*")
    .eq("id", batchId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (error) throw error;
  return data as CourseBatch | null;
}

export async function createBatch(input: BatchInput): Promise<CourseBatch> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_batches")
    .insert({
      course_id: input.course_id,
      name: input.name,
      start_date: input.start_date ?? null,
      end_date: input.end_date ?? null,
      registration_deadline: input.registration_deadline ?? null,
      status: input.status ?? "upcoming",
      max_seats: input.max_seats ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as CourseBatch;
}

export async function updateBatch(
  id: string,
  input: Partial<Omit<BatchInput, "course_id">>
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("course_batches").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteBatch(id: string): Promise<void> {
  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("course_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", id);
  if (countError) throw countError;
  if (count && count > 0) {
    throw new Error("Cannot delete a batch that has enrolled students");
  }

  const { error } = await supabase.from("course_batches").delete().eq("id", id);
  if (error) throw error;
}
