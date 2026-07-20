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
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
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
  let stats, chartData, purchases, error: string | null = null;
  try {
    [stats, chartData, purchases] = await Promise.all([
      getDashboardStats(),
      getDashboardChartData(),
      getRecentPendingPurchases(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load dashboard";
  }

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
      tone: "bg-brand/10 text-brand",
    },
    {
      label: "Total Courses",
      value: stats!.totalCourses,
      icon: BookOpen,
      tone: "bg-accent/15 text-accent-dark",
    },
    {
      label: "Pending Purchases",
      value: stats!.pendingPurchases,
      icon: ShoppingCart,
      tone: "bg-warning/15 text-accent-dark",
    },
    {
      label: "Upcoming Live Lessons",
      value: stats!.upcomingLiveLessons,
      icon: CalendarClock,
      tone: "bg-success/10 text-success",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview of your learning platform"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label} className="overflow-hidden border-brand/10 shadow-sm">
            <CardContent className="flex items-start justify-between gap-3 p-5">
              <div>
                <p className="text-sm font-medium text-gray-500">{card.label}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-brand-dark">
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
      <Card className="overflow-hidden border-brand/10 shadow-sm">
        <SectionHeader
          title="Recent pending purchases"
          description="Purchase requests waiting for review"
          actions={
            <Link
              href="/purchases"
              className="inline-flex h-8 items-center rounded-lg border border-brand/15 bg-white px-3 text-xs font-medium text-brand hover:bg-brand/5"
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
