import { createClient } from "@/lib/supabase/server";
import type { Certificate, CourseEnrollment } from "@/types/database";

export async function getCertificates(): Promise<Certificate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("certificates")
    .select("*, user:profiles(*), course:courses(*)")
    .order("issued_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Certificate[];
}

export async function getEligibleCertificateEnrollments(): Promise<CourseEnrollment[]> {
  const supabase = await createClient();

  const [
    { data: enrollments, error: enrollError },
    { data: certificates, error: certError },
  ] = await Promise.all([
    supabase
      .from("course_enrollments")
      .select("*, user:profiles(*), course:courses(*), batch:course_batches(*)")
      .eq("progress", 100)
      .order("created_at", { ascending: false }),
    supabase.from("certificates").select("user_id, course_id"),
  ]);

  if (enrollError) throw enrollError;
  if (certError) throw certError;

  const issued = new Set(
    (certificates ?? []).map((c) => `${c.user_id}:${c.course_id}`)
  );

  const seen = new Set<string>();
  const eligible: CourseEnrollment[] = [];

  for (const row of (enrollments ?? []) as CourseEnrollment[]) {
    const status = String(row.status);
    if (status === "blocked" || status === "revoked") continue;
    const key = `${row.user_id}:${row.course_id}`;
    if (issued.has(key) || seen.has(key)) continue;
    seen.add(key);
    eligible.push(row);
  }

  return eligible;
}

export async function issueCertificate(
  userId: string,
  courseId: string,
  certificateUrl: string
): Promise<Certificate> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("certificates")
    .upsert(
      {
        user_id: userId,
        course_id: courseId,
        certificate_url: certificateUrl,
        issued_at: new Date().toISOString(),
      },
      { onConflict: "user_id,course_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}
