import { createClient } from "@/lib/supabase/server";
import type { Purchase, PurchaseStatus } from "@/types/database";

export async function getPurchases(status?: PurchaseStatus): Promise<Purchase[]> {
  const supabase = await createClient();
  let query = supabase
    .from("purchases")
    .select("*, user:profiles(*), course:courses(*)")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Purchase[];
}

export async function getRecentPendingPurchases(limit = 5): Promise<Purchase[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchases")
    .select("*, user:profiles(*), course:courses(*)")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Purchase[];
}

export async function approvePurchase(purchaseId: string): Promise<void> {
  const supabase = await createClient();
  const { data: purchase, error: fetchError } = await supabase
    .from("purchases")
    .select("*")
    .eq("id", purchaseId)
    .single();
  if (fetchError) throw fetchError;

  const { error: updateError } = await supabase
    .from("purchases")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", purchaseId);
  if (updateError) throw updateError;

  const { error: enrollError } = await supabase
    .from("course_enrollments")
    .upsert(
      {
        user_id: purchase.user_id,
        course_id: purchase.course_id,
        purchase_id: purchaseId,
        status: "active",
      },
      { onConflict: "user_id,course_id" }
    );
  if (enrollError) throw enrollError;
}

export async function rejectPurchase(
  purchaseId: string,
  adminNote: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("purchases")
    .update({ status: "rejected", admin_note: adminNote })
    .eq("id", purchaseId);
  if (error) throw error;
}
