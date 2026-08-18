import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { getAdminDataClient } from "@/lib/db/admin-client";
import type { DashboardChartData } from "@/types/database";

const MONTHS = 6;

function buildMonthLabels(): string[] {
  return Array.from({ length: MONTHS }, (_, index) =>
    format(subMonths(startOfMonth(new Date()), MONTHS - 1 - index), "MMM yyyy")
  );
}

function monthKey(date: string): string {
  return format(startOfMonth(parseISO(date)), "MMM yyyy");
}

function countByMonth(
  dates: string[],
  months: string[]
): { month: string; count: number }[] {
  const counts = new Map(months.map((month) => [month, 0]));

  for (const date of dates) {
    const key = monthKey(date);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return months.map((month) => ({ month, count: counts.get(month) ?? 0 }));
}

function normalizeEnrollmentStatus(status: string): string {
  if (status === "revoked" || status === "blocked") return "blocked";
  return status;
}

export async function getDashboardChartData(): Promise<DashboardChartData> {
  const supabase = await getAdminDataClient();
  const months = buildMonthLabels();
  const since = subMonths(startOfMonth(new Date()), MONTHS - 1).toISOString();

  const [profilesRes, purchasesRes, allPurchasesRes, enrollmentsRes] = await Promise.all([
    supabase.from("profiles").select("created_at").gte("created_at", since),
    supabase.from("purchases").select("created_at, status, amount").gte("created_at", since),
    supabase.from("purchases").select("status"),
    supabase.from("course_enrollments").select("status"),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (purchasesRes.error) throw purchasesRes.error;
  if (allPurchasesRes.error) throw allPurchasesRes.error;
  if (enrollmentsRes.error) throw enrollmentsRes.error;

  const profiles = profilesRes.data ?? [];
  const purchases = purchasesRes.data ?? [];
  const allPurchases = allPurchasesRes.data ?? [];
  const enrollments = enrollmentsRes.data ?? [];

  const userSignupsByMonth = countByMonth(
    profiles.map((profile) => profile.created_at),
    months
  );

  const revenueByMonth = months.map((month) => ({ month, revenue: 0 }));
  const revenueMap = new Map(revenueByMonth.map((entry) => [entry.month, entry]));

  for (const purchase of purchases) {
    if (purchase.status !== "approved") continue;
    const key = monthKey(purchase.created_at);
    const entry = revenueMap.get(key);
    if (entry) {
      entry.revenue += Number(purchase.amount);
    }
  }

  const purchaseTrendByMonth = months.map((month) => ({
    month,
    approved: 0,
    pending: 0,
    rejected: 0,
  }));
  const trendMap = new Map(purchaseTrendByMonth.map((entry) => [entry.month, entry]));

  for (const purchase of purchases) {
    const key = monthKey(purchase.created_at);
    const entry = trendMap.get(key);
    if (!entry) continue;
    if (purchase.status === "approved") entry.approved += 1;
    else if (purchase.status === "pending") entry.pending += 1;
    else if (purchase.status === "rejected") entry.rejected += 1;
  }

  const purchaseStatusMap = new Map<string, number>();
  for (const purchase of allPurchases) {
    purchaseStatusMap.set(
      purchase.status,
      (purchaseStatusMap.get(purchase.status) ?? 0) + 1
    );
  }

  const enrollmentStatusMap = new Map<string, number>();
  for (const enrollment of enrollments) {
    const status = normalizeEnrollmentStatus(enrollment.status);
    enrollmentStatusMap.set(status, (enrollmentStatusMap.get(status) ?? 0) + 1);
  }

  return {
    userSignupsByMonth,
    revenueByMonth,
    purchaseTrendByMonth,
    purchaseStatusCounts: ["approved", "pending", "rejected"].map((status) => ({
      status,
      count: purchaseStatusMap.get(status) ?? 0,
    })),
    enrollmentStatusCounts: ["active", "completed", "blocked"].map((status) => ({
      status,
      count: enrollmentStatusMap.get(status) ?? 0,
    })),
  };
}
