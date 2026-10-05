import { getAdminDataClient } from "@/lib/db/admin-client";
import {
  normalizePage,
  normalizePageSize,
  pageRange,
  toPaginatedResult,
  type PaginatedResult,
} from "@/lib/db/pagination";
import type { Certificate, CourseEnrollment } from "@/types/database";

const CERT_LIST_SELECT =
  "id, user_id, course_id, certificate_url, issued_at, user:profiles(id, email, full_name), course:courses(id, title)";

const ELIGIBLE_SELECT =
  "id, user_id, course_id, batch_id, status, progress, created_at, user:profiles(id, email, full_name), course:courses(id, title), batch:course_batches(id, name)";

export async function getCertificates(pageParams?: {
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<Certificate>> {
  const supabase = await getAdminDataClient();
  const page = normalizePage(pageParams?.page);
  const pageSize = normalizePageSize(pageParams?.pageSize);
  const { from, to } = pageRange(page, pageSize);

  const { data, error, count } = await supabase
    .from("certificates")
    .select(CERT_LIST_SELECT, { count: "exact" })
    .order("issued_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return toPaginatedResult(
    (data ?? []) as unknown as Certificate[],
    count ?? 0,
    page,
    pageSize
  );
}

export async function getEligibleCertificateEnrollments(): Promise<CourseEnrollment[]> {
  const supabase = await getAdminDataClient();

  const [
    { data: enrollments, error: enrollError },
    { data: certificates, error: certError },
  ] = await Promise.all([
    supabase
      .from("course_enrollments")
      .select(ELIGIBLE_SELECT)
      .eq("progress", 100)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("certificates").select("user_id, course_id"),
  ]);

  if (enrollError) throw enrollError;
  if (certError) throw certError;

  const issued = new Set(
    (certificates ?? []).map((c) => `${c.user_id}:${c.course_id}`)
  );

  const seen = new Set<string>();
  const eligible: CourseEnrollment[] = [];

  for (const row of (enrollments ?? []) as unknown as CourseEnrollment[]) {
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
  const supabase = await getAdminDataClient();
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
