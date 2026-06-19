"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/layout/page-header";
import type { DashboardChartData } from "@/types/database";

const BRAND = "#0d9488";

const STATUS_COLORS: Record<string, string> = {
  approved: BRAND,
  pending: "#f59e0b",
  rejected: "#ef4444",
  active: BRAND,
  completed: "#6366f1",
  blocked: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  approved: "Approved",
  pending: "Pending",
  rejected: "Rejected",
  active: "Active",
  completed: "Completed",
  blocked: "Blocked",
};

function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  valueFormatter?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-medium text-gray-500">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {valueFormatter ? valueFormatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-gray-400">
      {message}
    </div>
  );
}

export function DashboardCharts({ data }: { data: DashboardChartData }) {
  const hasSignups = data.userSignupsByMonth.some((entry) => entry.count > 0);
  const hasRevenue = data.revenueByMonth.some((entry) => entry.revenue > 0);
  const hasPurchaseTrend = data.purchaseTrendByMonth.some(
    (entry) => entry.approved + entry.pending + entry.rejected > 0
  );
  const hasPurchaseStatus = data.purchaseStatusCounts.some((entry) => entry.count > 0);
  const hasEnrollmentStatus = data.enrollmentStatusCounts.some((entry) => entry.count > 0);

  const purchasePieData = data.purchaseStatusCounts
    .filter((entry) => entry.count > 0)
    .map((entry) => ({
      name: STATUS_LABELS[entry.status] ?? entry.status,
      value: entry.count,
      fill: STATUS_COLORS[entry.status] ?? BRAND,
    }));

  const enrollmentPieData = data.enrollmentStatusCounts
    .filter((entry) => entry.count > 0)
    .map((entry) => ({
      name: STATUS_LABELS[entry.status] ?? entry.status,
      value: entry.count,
      fill: STATUS_COLORS[entry.status] ?? BRAND,
    }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="overflow-hidden">
        <SectionHeader
          title="New Users"
          description="Sign-ups over the last 6 months"
        />
        <CardContent className="pt-4">
          {!hasSignups ? (
            <EmptyChartState message="No new users in this period" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.userSignupsByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={
                    <ChartTooltip valueFormatter={(value) => `${value} users`} />
                  }
                />
                <Bar dataKey="count" name="Users" fill={BRAND} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <SectionHeader
          title="Revenue"
          description="Approved purchase revenue (last 6 months)"
        />
        <CardContent className="pt-4">
          {!hasRevenue ? (
            <EmptyChartState message="No approved revenue in this period" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.revenueByMonth} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BRAND} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={BRAND} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  content={
                    <ChartTooltip valueFormatter={(value) => `$${value.toFixed(2)}`} />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke={BRAND}
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <SectionHeader
          title="Purchase Activity"
          description="Monthly purchase requests by status"
        />
        <CardContent className="pt-4">
          {!hasPurchaseTrend ? (
            <EmptyChartState message="No purchases in this period" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.purchaseTrendByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                />
                <Bar dataKey="approved" name="Approved" fill={STATUS_COLORS.approved} radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill={STATUS_COLORS.pending} radius={[4, 4, 0, 0]} />
                <Bar dataKey="rejected" name="Rejected" fill={STATUS_COLORS.rejected} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <SectionHeader
          title="Platform Overview"
          description="Purchase and enrollment breakdown"
        />
        <CardContent className="pt-4">
          {!hasPurchaseStatus && !hasEnrollmentStatus ? (
            <EmptyChartState message="No purchase or enrollment data yet" />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-brand/70">
                  Purchases
                </p>
                {hasPurchaseStatus ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={purchasePieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={3}
                      >
                        {purchasePieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChartState message="No purchases yet" />
                )}
              </div>
              <div>
                <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-brand/70">
                  Enrollments
                </p>
                {hasEnrollmentStatus ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={enrollmentPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={3}
                      >
                        {enrollmentPieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChartState message="No enrollments yet" />
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
