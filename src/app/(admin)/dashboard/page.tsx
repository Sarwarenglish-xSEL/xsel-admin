import Link from "next/link";
import { format } from "date-fns";
import { getDashboardStats } from "@/lib/db/courses";
import { getDashboardChartData } from "@/lib/db/dashboard";
import { getRecentPendingPurchases } from "@/lib/db/purchases";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageEmpty } from "@/components/page-states";

export default async function DashboardPage() {
  let stats, chartData, purchases, error: string | null = null;
  try {
    [stats, chartData, purchases] = await Promise.all([
      getDashboardStats(),
      getDashboardChartData(),
      getRecentPendingPurchases(),
    ]);
  } catch (e) { error = e instanceof Error ? e.message : "Failed to load dashboard"; }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Overview of your learning platform" />
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const statCards = [
    { label: "Total Users", value: stats!.totalUsers },
    { label: "Total Courses", value: stats!.totalCourses },
    { label: "Pending Purchases", value: stats!.pendingPurchases },
    { label: "Upcoming Live Lessons", value: stats!.upcomingLiveLessons },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview of your learning platform"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="border-0 pb-0">
              <CardTitle className="text-sm font-medium text-gray-500">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-brand">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <DashboardCharts data={chartData!} />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Pending Purchases</CardTitle>
          <Link href="/purchases" className="inline-flex h-8 items-center rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-700 hover:bg-gray-50">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {purchases!.length === 0 ? (
            <PageEmpty title="No pending purchases" description="New purchase requests will appear here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead><TableHead>Course</TableHead><TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead><TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases!.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.user?.email ?? p.user_id}</TableCell>
                    <TableCell>{p.course?.title ?? p.course_id}</TableCell>
                    <TableCell>${Number(p.amount).toFixed(2)}</TableCell>
                    <TableCell>{format(new Date(p.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
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
