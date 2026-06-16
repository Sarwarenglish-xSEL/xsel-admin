"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { Certificate, Course, Profile } from "@/types/database";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { issueCertificateAction } from "@/app/actions";

const columns: ColumnDef<Certificate>[] = [
  { accessorKey: "user", header: "User", cell: ({ row }) => row.original.user?.email ?? row.original.user_id },
  { accessorKey: "course", header: "Course", cell: ({ row }) => row.original.course?.title ?? row.original.course_id },
  {
    accessorKey: "certificate_url", header: "Certificate",
    cell: ({ row }) => (
      <a href={row.original.certificate_url} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">View</a>
    ),
  },
  { accessorKey: "issued_at", header: "Issued", cell: ({ row }) => format(new Date(row.original.issued_at), "MMM d, yyyy") },
];

function IssueCertificateDialog({ users, courses }: { users: Profile[]; courses: Course[] }) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Issue Certificate</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader><DialogTitle>Issue Certificate</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>User</Label>
              <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="">Select user</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
              </Select>
            </div>
            <div>
              <Label>Course</Label>
              <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="">Select course</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </Select>
            </div>
            <div>
              <Label>Certificate URL</Label>
              <Input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <Button className="w-full" disabled={loading || !userId || !courseId || !url} onClick={async () => {
              setLoading(true);
              try {
                await issueCertificateAction(userId, courseId, url);
                toast.success("Certificate issued");
                setOpen(false);
                router.refresh();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed");
              } finally { setLoading(false); }
            }}>{loading ? "Issuing..." : "Issue Certificate"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CertificatesTable({ certificates, users, courses }: { certificates: Certificate[]; users: Profile[]; courses: Course[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><IssueCertificateDialog users={users} courses={courses} /></div>
      <DataTable columns={columns} data={certificates} />
    </div>
  );
}
