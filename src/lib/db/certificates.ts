import { createClient } from "@/lib/supabase/server";
import type { Certificate } from "@/types/database";

export async function getCertificates(): Promise<Certificate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("certificates")
    .select("*, user:profiles(*), course:courses(*)")
    .order("issued_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Certificate[];
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
