"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Purchase, PurchaseStatus } from "@/types/database";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { approvePurchaseAction, rejectPurchaseAction } from "@/app/actions";

function StatusFilter({ status }: { status?: string }) {
  return (
    <Select
      className="w-40"
      defaultValue={status ?? "all"}
      onChange={(e) => {
        const params = new URLSearchParams(window.location.search);
        if (e.target.value === "all") params.delete("status");
        else params.set("status", e.target.value);
        window.location.search = params.toString();
      }}
    >
      <option value="all">All</option>
      <option value="pending">Pending</option>
      <option value="approved">Approved</option>
      <option value="rejected">Rejected</option>
    </Select>
  );
}

function PurchaseActions({ purchase }: { purchase: Purchase }) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (purchase.status !== "pending") return null;

  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={loading} onClick={async () => {
        setLoading(true);
        try {
          await approvePurchaseAction(purchase.id);
          toast.success("Purchase approved");
          router.refresh();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Failed");
        } finally { setLoading(false); }
      }}>Approve</Button>
      <Button size="sm" variant="danger" onClick={() => setRejectOpen(true)}>Reject</Button>
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent onClose={() => setRejectOpen(false)}>
          <DialogHeader><DialogTitle>Reject Purchase</DialogTitle></DialogHeader>
          <Textarea placeholder="Reason..." value={note} onChange={(e) => setNote(e.target.value)} />
          <Button variant="danger" disabled={loading || !note.trim()} onClick={async () => {
            setLoading(true);
            try {
              await rejectPurchaseAction(purchase.id, note);
              toast.success("Rejected");
              setRejectOpen(false);
              router.refresh();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed");
            } finally { setLoading(false); }
          }}>Confirm Reject</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const columns: ColumnDef<Purchase>[] = [
  { accessorKey: "user", header: "User", cell: ({ row }) => row.original.user?.email ?? row.original.user_id },
  { accessorKey: "course", header: "Course", cell: ({ row }) => row.original.course?.title ?? row.original.course_id },
  { accessorKey: "amount", header: "Amount", cell: ({ row }) => `$${Number(row.original.amount).toFixed(2)}` },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge> },
  {
    accessorKey: "receipt_url", header: "Receipt",
    cell: ({ row }) => row.original.receipt_url ? (
      <a href={row.original.receipt_url} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">View</a>
    ) : "—",
  },
  { accessorKey: "created_at", header: "Created", cell: ({ row }) => format(new Date(row.original.created_at), "MMM d, yyyy") },
  { id: "actions", header: "Actions", cell: ({ row }) => <PurchaseActions purchase={row.original} /> },
];

export function PurchasesTable({ purchases, status }: { purchases: Purchase[]; status?: PurchaseStatus }) {
  return (
    <div className="space-y-4">
      <StatusFilter status={status} />
      <DataTable columns={columns} data={purchases} />
    </div>
  );
}
