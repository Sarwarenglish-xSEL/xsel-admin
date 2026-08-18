"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Certificate, Course, CourseEnrollment, Profile } from "@/types/database";
import { DataTable } from "@/components/data-table";
import { PageEmpty } from "@/components/page-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { issueCertificateAction } from "@/app/actions";

const issuedColumns: ColumnDef<Certificate>[] = [
  {
    accessorKey: "user",
    header: "User",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.user?.email ?? row.original.user_id}</p>
        {row.original.user?.full_name && (
          <p className="text-xs text-gray-500">{row.original.user.full_name}</p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "course",
    header: "Course",
    cell: ({ row }) => row.original.course?.title ?? row.original.course_id,
  },
  {
    accessorKey: "certificate_url",
    header: "Certificate",
    cell: ({ row }) => (
      <a
        href={row.original.certificate_url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand hover:underline"
      >
        View
      </a>
    ),
  },
  {
    accessorKey: "issued_at",
    header: "Issued",
    cell: ({ row }) => format(new Date(row.original.issued_at), "MMM d, yyyy"),
  },
];

type IssueTarget = {
  userId: string;
  courseId: string;
};

function IssueCertificateDialog({
  users,
  courses,
  target,
  open,
  onOpenChange,
}: {
  users: Profile[];
  courses: Course[];
  target: IssueTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const userLabel = users.find((u) => u.id === target?.userId);
  const courseLabel = courses.find((c) => c.id === target?.courseId);

  const reset = () => setUrl("");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      className="max-w-2xl"
    >
      <DialogContent
        className="flex w-full max-h-[min(40rem,85vh)] flex-col overflow-hidden p-0"
        onClose={() => {
          reset();
          onOpenChange(false);
        }}
      >
        <div className="shrink-0 border-b border-brand/15 brand-gradient px-6 py-5 pr-12 sm:px-7">
          <DialogHeader className="mb-0">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-8 w-1 shrink-0 rounded-full brand-accent-bar" />
              <div>
                <DialogTitle className="text-xl">Issue Certificate</DialogTitle>
                <p className="mt-1 text-sm text-brand/70">
                  Attach a certificate URL for this completed enrollment
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>
        <div className="space-y-5 px-6 py-5 sm:px-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-brand/20 bg-brand/[0.03] px-4 py-3">
              <Label>User</Label>
              <p className="mt-1 truncate font-sans text-sm font-semibold text-brand-dark">
                {userLabel?.full_name?.trim() || userLabel?.email || target?.userId}
              </p>
              {userLabel?.full_name?.trim() ? (
                <p className="mt-0.5 truncate text-xs text-brand/60">{userLabel.email}</p>
              ) : null}
            </div>
            <div className="rounded-xl border border-brand/20 bg-brand/[0.03] px-4 py-3">
              <Label>Course</Label>
              <p className="mt-1 font-sans text-sm font-semibold text-brand-dark">
                {courseLabel?.title ?? target?.courseId}
              </p>
            </div>
          </div>
          <div>
            <Label>Certificate URL</Label>
            <Input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        </div>
        <div className="flex shrink-0 justify-end border-t border-brand/15 bg-surface px-6 py-4 sm:px-7">
          <Button
            className="min-w-40"
            disabled={loading || !target?.userId || !target?.courseId || !url}
            onClick={async () => {
              if (!target) return;
              setLoading(true);
              try {
                await issueCertificateAction(target.userId, target.courseId, url);
                toast.success("Certificate issued");
                reset();
                onOpenChange(false);
                router.refresh();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed");
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Issuing..." : "Issue Certificate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CertificatesTable({
  certificates,
  eligible,
  users,
  courses,
}: {
  certificates: Certificate[];
  eligible: CourseEnrollment[];
  users: Profile[];
  courses: Course[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [target, setTarget] = useState<IssueTarget | null>(null);

  const openEligibleIssue = useCallback((enrollment: CourseEnrollment) => {
    setTarget({
      userId: enrollment.user_id,
      courseId: enrollment.course_id,
    });
    setDialogOpen(true);
  }, []);

  const eligibleColumns = useMemo<ColumnDef<CourseEnrollment>[]>(
    () => [
      {
        accessorKey: "user",
        header: "User",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.user?.email ?? row.original.user_id}</p>
            {row.original.user?.full_name && (
              <p className="text-xs text-gray-500">{row.original.user.full_name}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "course",
        header: "Course",
        cell: ({ row }) => row.original.course?.title ?? row.original.course_id,
      },
      {
        id: "batch",
        header: "Batch",
        cell: ({ row }) => row.original.batch?.name ?? "—",
      },
      {
        accessorKey: "progress",
        header: "Progress",
        cell: ({ row }) => (
          <Badge variant="success">{row.original.progress}%</Badge>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Enrolled",
        cell: ({ row }) => format(new Date(row.original.created_at), "MMM d, yyyy"),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button size="sm" onClick={() => openEligibleIssue(row.original)}>
            Issue
          </Button>
        ),
      },
    ],
    [openEligibleIssue]
  );

  return (
    <Card className="overflow-hidden border-brand/20 shadow-sm">
      <CardContent className="p-5 sm:p-6">
        <Tabs defaultValue={eligible.length > 0 ? "eligible" : "issued"}>
          <TabsList>
            <TabsTrigger value="eligible">Eligible ({eligible.length})</TabsTrigger>
            <TabsTrigger value="issued">Issued ({certificates.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="eligible" className="mt-5">
            {eligible.length === 0 ? (
              <PageEmpty
                title="No eligible users"
                description="Users appear here when their course progress reaches 100% and a certificate has not been issued yet."
              />
            ) : (
              <DataTable columns={eligibleColumns} data={eligible} />
            )}
          </TabsContent>

          <TabsContent value="issued" className="mt-5">
            {certificates.length === 0 ? (
              <PageEmpty
                title="No certificates issued"
                description="Issue a certificate from the Eligible tab."
              />
            ) : (
              <DataTable columns={issuedColumns} data={certificates} />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <IssueCertificateDialog
        users={users}
        courses={courses}
        target={target}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </Card>
  );
}
