import { createClient } from "@/lib/supabase/server";
import type { Purchase, PurchaseStatus } from "@/types/database";

async function attachEnrollmentStatus(
  purchases: Purchase[]
): Promise<Purchase[]> {
  if (purchases.length === 0) return purchases;

  const supabase = await createClient();
  const userIds = [...new Set(purchases.map((p) => p.user_id))];
  const { data: enrollments, error } = await supabase
    .from("course_enrollments")
    .select("user_id, course_id, batch_id")
    .in("user_id", userIds)
    .eq("status", "active");

  if (error) throw error;

  const enrolledByCourse = new Set(
    (enrollments ?? []).map((e) => `${e.user_id}:${e.course_id}`)
  );
  const enrolledByBatch = new Set(
    (enrollments ?? [])
      .filter((e) => e.batch_id)
      .map((e) => `${e.user_id}:${e.batch_id}`)
  );

  return purchases.map((purchase) => ({
    ...purchase,
    is_enrolled: purchase.batch_id
      ? enrolledByBatch.has(`${purchase.user_id}:${purchase.batch_id}`)
      : enrolledByCourse.has(`${purchase.user_id}:${purchase.course_id}`),
  }));
}

async function getActiveEnrollmentForBatch(userId: string, batchId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("batch_id", batchId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getActiveEnrollment(
  userId: string,
  courseId: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPurchases(status?: PurchaseStatus): Promise<Purchase[]> {
  const supabase = await createClient();
  let query = supabase
    .from("purchases")
    .select("*, user:profiles(*), course:courses(*), batch:course_batches(*)")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return attachEnrollmentStatus((data ?? []) as Purchase[]);
}

export async function getRecentPendingPurchases(limit = 5): Promise<Purchase[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchases")
    .select("*, user:profiles(*), course:courses(*), batch:course_batches(*)")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return attachEnrollmentStatus((data ?? []) as Purchase[]);
}

export async function approvePurchase(purchaseId: string): Promise<void> {
  const supabase = await createClient();
  const { data: purchase, error: fetchError } = await supabase
    .from("purchases")
    .select("*")
    .eq("id", purchaseId)
    .single();
  if (fetchError) throw fetchError;
  if (purchase.status !== "pending") {
    throw new Error("Only pending purchases can be approved");
  }

  const existingEnrollment = purchase.batch_id
    ? await getActiveEnrollmentForBatch(purchase.user_id, purchase.batch_id)
    : await getActiveEnrollment(purchase.user_id, purchase.course_id);
  if (existingEnrollment) {
    throw new Error(
      purchase.batch_id
        ? "User is already enrolled in this batch"
        : "User is already enrolled in this course"
    );
  }

  const { error: updateError } = await supabase
    .from("purchases")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", purchaseId)
    .eq("status", "pending");
  if (updateError) throw updateError;

  const enrollmentPayload: {
    user_id: string;
    course_id: string;
    purchase_id: string;
    status: string;
    batch_id?: string;
  } = {
    user_id: purchase.user_id,
    course_id: purchase.course_id,
    purchase_id: purchaseId,
    status: "active",
  };
  if (purchase.batch_id) {
    enrollmentPayload.batch_id = purchase.batch_id;
  }

  const { error: enrollError } = await supabase
    .from("course_enrollments")
    .insert(enrollmentPayload);
  if (enrollError) throw enrollError;
}

export async function rejectPurchase(
  purchaseId: string,
  adminNote: string
): Promise<void> {
  const supabase = await createClient();
  const { data: purchase, error: fetchError } = await supabase
    .from("purchases")
    .select("status, user_id, course_id")
    .eq("id", purchaseId)
    .single();
  if (fetchError) throw fetchError;
  if (purchase.status !== "pending") {
    throw new Error("Only pending purchases can be rejected");
  }

  const existingEnrollment = await getActiveEnrollment(
    purchase.user_id,
    purchase.course_id
  );
  if (existingEnrollment) {
    throw new Error("User is already enrolled in this course");
  }

  const { error } = await supabase
    .from("purchases")
    .update({ status: "rejected", admin_note: adminNote })
    .eq("id", purchaseId)
    .eq("status", "pending");
  if (error) throw error;
}

export async function getUserPurchaseForCourse(
  userId: string,
  courseId: string
): Promise<Purchase | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS: only own purchases or staff can read — skip when anonymous or unauthorized.
  if (!user) return null;

  const { data, error } = await supabase
    .from("purchases")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST116" || error.code === "42501") return null;
    throw error;
  }
  return data as Purchase | null;
}

export async function createPurchaseRequest(
  userId: string,
  courseId: string,
  amount: number,
  receiptUrl: string,
  batchId?: string | null
): Promise<Purchase> {
  if (!userId?.trim()) {
    throw new Error("User ID is required to save a purchase.");
  }
  if (!courseId?.trim()) {
    throw new Error("Course ID is required to save a purchase.");
  }
  if (!receiptUrl?.trim()) {
    throw new Error("Receipt is required to save a purchase.");
  }

  const supabase = await createClient();

  const existing = await getUserPurchaseForCourse(userId, courseId);
  if (existing?.status === "pending") {
    throw new Error("You already have a payment pending review for this course.");
  }
  if (existing?.status === "approved") {
    throw new Error("You have already purchased this course.");
  }

  const enrollment = batchId
    ? await getActiveEnrollmentForBatch(userId, batchId)
    : await getActiveEnrollment(userId, courseId);
  if (enrollment) {
    throw new Error(
      batchId ? "You are already enrolled in this batch." : "You are already enrolled in this course."
    );
  }

  const { data, error } = await supabase
    .from("purchases")
    .insert({
      user_id: userId,
      course_id: courseId,
      batch_id: batchId ?? null,
      amount,
      receipt_url: receiptUrl,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw error;
  return data as Purchase;
}
