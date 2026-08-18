import Link from "next/link";
import { format } from "date-fns";
import {
  BookOpen,
  CalendarClock,
  ShoppingCart,
  Users,
} from "lucide-react";
import { getDashboardStats } from "@/lib/db/courses";
import { getDashboardChartData } from "@/lib/db/dashboard";
import { getRecentPendingPurchases } from "@/lib/db/purchases";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getAppSetting } from "@/lib/db/app-settings";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { AppStatusToggle } from "@/components/dashboard/app-status-toggle";
import { PageHeader, SectionHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageEmpty } from "@/components/page-states";

export default async function DashboardPage() {
  let stats, chartData, purchases, currentProfile, appEnabled;
  let error: string | null = null;
  try {
    [stats, chartData, purchases, currentProfile, appEnabled] = await Promise.all([
      getDashboardStats(),
      getDashboardChartData(),
      getRecentPendingPurchases(),
      getCurrentProfile(),
      getAppSetting("is_course_published").then((v) => v !== "true"),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load dashboard";
  }

  const isSuperadmin = currentProfile?.role === "superadmin";

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Overview of your learning platform" />
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Users",
      value: stats!.totalUsers,
      icon: Users,
      tone: "bg-brand/20 text-brand",
      cardBg: "border-brand/25 bg-gradient-to-br from-brand/20 via-white to-brand/5",
    },
    {
      label: "Total Courses",
      value: stats!.totalCourses,
      icon: BookOpen,
      tone: "bg-teal-500/20 text-teal-700",
      cardBg: "border-teal-400/40 bg-gradient-to-br from-teal-500/22 via-white to-teal-400/8",
    },
    {
      label: "Pending Purchases",
      value: stats!.pendingPurchases,
      icon: ShoppingCart,
      tone: "bg-danger/15 text-danger",
      cardBg: "border-danger/25 bg-gradient-to-br from-danger/16 via-white to-danger/5",
    },
    {
      label: "Upcoming Live Lessons",
      value: stats!.upcomingLiveLessons,
      icon: CalendarClock,
      tone: "bg-success/15 text-success",
      cardBg: "border-success/25 bg-gradient-to-br from-success/16 via-white to-success/5",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview of your learning platform"
        actions={
          isSuperadmin ? (
            <AppStatusToggle initialEnabled={appEnabled ?? false} />
          ) : undefined
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label} className={`overflow-hidden shadow-sm shadow-brand/10 ${card.cardBg}`}>
            <CardContent className="flex items-start justify-between gap-3 p-5">
              <div>
                <p className="font-sans text-sm font-medium text-brand/65">{card.label}</p>
                <p className="mt-2 font-sans text-3xl font-bold tracking-tight text-brand-dark">
                  {card.value}
                </p>
              </div>
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.tone}`}
              >
                <card.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <DashboardCharts data={chartData!} />
      <Card className="overflow-hidden border-brand/20 shadow-sm">
        <SectionHeader
          title="Recent pending purchases"
          description="Purchase requests waiting for review"
          actions={
            <Link
              href="/purchases"
              className="inline-flex h-8 items-center rounded-lg border border-brand/25 bg-white px-3 text-xs font-medium text-brand hover:bg-brand/10"
            >
              View all
            </Link>
          }
        />
        <CardContent className="p-0">
          {purchases!.length === 0 ? (
            <div className="p-6">
              <PageEmpty
                title="No pending purchases"
                description="New purchase requests will appear here."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases!.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.user?.email ?? p.user_id}</TableCell>
                    <TableCell>{p.course?.title ?? p.course_id}</TableCell>
                    <TableCell>${Number(p.amount).toFixed(2)}</TableCell>
                    <TableCell>
                      {format(new Date(p.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
