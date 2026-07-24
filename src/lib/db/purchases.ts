import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import type { Purchase, PurchaseStatus } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Prefer service role for public payment flow (no sign-in). */
async function getPaymentDbClient(): Promise<SupabaseClient> {
  const service = createServiceClient();
  if (service) return service;
  return createClient();
}

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

async function getActiveEnrollmentForBatch(
  userId: string,
  batchId: string,
  client?: SupabaseClient
) {
  const supabase = client ?? (await createClient());
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
  courseId: string,
  client?: SupabaseClient
) {
  const supabase = client ?? (await createClient());
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
  courseId: string,
  batchId?: string | null
): Promise<Purchase | null> {
  const supabase = await getPaymentDbClient();

  let query = supabase
    .from("purchases")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (batchId) {
    query = query.eq("batch_id", batchId);
  }

  const { data, error } = await query.maybeSingle();

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
  batchId: string
): Promise<Purchase> {
  if (!userId?.trim()) {
    throw new Error("User ID is required to save a purchase.");
  }
  if (!courseId?.trim()) {
    throw new Error("Course ID is required to save a purchase.");
  }
  if (!batchId?.trim()) {
    throw new Error("Batch ID is required to save a purchase.");
  }
  if (!receiptUrl?.trim()) {
    throw new Error("Receipt is required to save a purchase.");
  }

  const service = createServiceClient();
  if (!service) {
    throw new Error(
      "Saving purchases without sign-in requires SUPABASE_SERVICE_ROLE_KEY in server config."
    );
  }
  const supabase = service;

  const existing = await getUserPurchaseForCourse(userId, courseId, batchId);
  if (existing?.status === "pending") {
    throw new Error("You already have a payment pending review for this batch.");
  }
  if (existing?.status === "approved") {
    throw new Error("You have already purchased this batch.");
  }

  const enrollment = await getActiveEnrollmentForBatch(userId, batchId, supabase);
  if (enrollment) {
    throw new Error("You are already enrolled in this batch.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile) {
    throw new Error("Invalid payment link: user was not found.");
  }

  const { data, error } = await supabase
    .from("purchases")
    .insert({
      user_id: userId,
      course_id: courseId,
      batch_id: batchId,
      amount,
      receipt_url: receiptUrl,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw error;
  return data as Purchase;
}

export async function uploadPurchaseReceipt(
  userId: string,
  courseId: string,
  file: File
): Promise<string> {
  const service = createServiceClient();
  if (!service) {
    throw new Error(
      "Receipt upload requires SUPABASE_SERVICE_ROLE_KEY in server config."
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${userId}/${courseId}/${Date.now()}.${ext}`;
  const { error } = await service.storage
    .from("purchase-receipts")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;

  const { data, error: signedError } = await service.storage
    .from("purchase-receipts")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signedError) throw signedError;
  return data.signedUrl;
}
