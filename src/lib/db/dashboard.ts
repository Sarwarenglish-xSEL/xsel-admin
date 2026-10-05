import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { getAdminDataClient } from "@/lib/db/admin-client";
import type { DashboardChartData } from "@/types/database";

const MONTHS = 6;

function buildMonthLabels(): string[] {
  return Array.from({ length: MONTHS }, (_, index) =>
    format(subMonths(startOfMonth(new Date()), MONTHS - 1 - index), "MMM yyyy")
  );
}

function emptyChartData(months: string[]): DashboardChartData {
  return {
    userSignupsByMonth: months.map((month) => ({ month, count: 0 })),
    revenueByMonth: months.map((month) => ({ month, revenue: 0 })),
    purchaseTrendByMonth: months.map((month) => ({
      month,
      approved: 0,
      pending: 0,
      rejected: 0,
    })),
    purchaseStatusCounts: [
      { status: "approved", count: 0 },
      { status: "pending", count: 0 },
      { status: "rejected", count: 0 },
    ],
    enrollmentStatusCounts: [
      { status: "active", count: 0 },
      { status: "completed", count: 0 },
      { status: "blocked", count: 0 },
    ],
  };
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

function formatDbError(error: {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}): string {
  const parts = [error.message, error.details, error.hint, error.code]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);
  return parts.join(" — ") || "Database query failed";
}

export async function getDashboardChartData(): Promise<DashboardChartData> {
  const months = buildMonthLabels();

  try {
    const supabase = await getAdminDataClient();
    const since = subMonths(startOfMonth(new Date()), MONTHS - 1).toISOString();

    const [
      profilesRes,
      purchasesRes,
      approvedRes,
      pendingRes,
      rejectedRes,
      activeRes,
      completedRes,
      blockedRes,
    ] = await Promise.all([
      supabase.from("profiles").select("created_at").gte("created_at", since),
      supabase
        .from("purchases")
        .select("created_at, status, amount")
        .gte("created_at", since),
      supabase
        .from("purchases")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved"),
      supabase
        .from("purchases")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("purchases")
        .select("id", { count: "exact", head: true })
        .eq("status", "rejected"),
      supabase
        .from("course_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("course_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed"),
      supabase
        .from("course_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("status", "blocked"),
    ]);

    if (profilesRes.error) {
      console.warn("[dashboard] profiles trend:", formatDbError(profilesRes.error));
    }
    if (purchasesRes.error) {
      console.warn("[dashboard] purchases trend:", formatDbError(purchasesRes.error));
    }

    const warnCount = (
      label: string,
      res: { count: number | null; error: { message?: string; code?: string } | null }
    ) => {
      if (res.error) {
        console.warn(`[dashboard] ${label}:`, formatDbError(res.error));
        return 0;
      }
      return res.count ?? 0;
    };

    const profiles = profilesRes.error ? [] : (profilesRes.data ?? []);
    const purchases = purchasesRes.error ? [] : (purchasesRes.data ?? []);

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

    return {
      userSignupsByMonth,
      revenueByMonth,
      purchaseTrendByMonth,
      purchaseStatusCounts: [
        { status: "approved", count: warnCount("purchases.approved", approvedRes) },
        { status: "pending", count: warnCount("purchases.pending", pendingRes) },
        { status: "rejected", count: warnCount("purchases.rejected", rejectedRes) },
      ],
      enrollmentStatusCounts: [
        { status: "active", count: warnCount("enrollments.active", activeRes) },
        { status: "completed", count: warnCount("enrollments.completed", completedRes) },
        { status: "blocked", count: warnCount("enrollments.blocked", blockedRes) },
      ],
    };
  } catch (err) {
    console.error("[dashboard] chart data failed:", err);
    return emptyChartData(months);
  }
}
