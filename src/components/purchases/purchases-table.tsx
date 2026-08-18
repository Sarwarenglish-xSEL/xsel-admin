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
import { cn } from "@/lib/utils";

function StatusFilter({ status }: { status?: string }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-xl border border-brand/25 bg-surface px-4 py-3 shadow-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-brand">
        Status
      </span>
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
    </div>
  );
}

function PurchaseActions({ purchase }: { purchase: Purchase }) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const canReview =
    purchase.status === "pending" && purchase.is_enrolled === false;
  const needsEnrollment =
    purchase.status === "approved" && purchase.is_enrolled === false;

  if (!canReview && !needsEnrollment) {
    if (purchase.status === "pending" && purchase.is_enrolled) {
      return (
        <span className="text-xs text-muted-foreground">Already enrolled</span>
      );
    }
    if (purchase.status === "approved") {
      return <span className="text-xs text-muted-foreground">Enrolled</span>;
    }
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          try {
            const result = await approvePurchaseAction(purchase.id);
            if (!result.ok) {
              toast.error(result.message);
              return;
            }
            toast.success(
              needsEnrollment
                ? "User enrolled successfully"
                : "Purchase approved and user enrolled"
            );
            router.refresh();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to approve");
          } finally {
            setLoading(false);
          }
        }}
      >
        {needsEnrollment ? "Enroll" : "Approve"}
      </Button>
      {canReview ? (
        <>
          <Button
            size="sm"
            variant="danger"
            disabled={loading}
            onClick={() => setRejectOpen(true)}
          >
            Reject
          </Button>
          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <DialogContent onClose={() => setRejectOpen(false)}>
              <DialogHeader>
                <DialogTitle>Reject Purchase</DialogTitle>
              </DialogHeader>
              <Textarea
                placeholder="Reason for rejection..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button
                variant="danger"
                disabled={loading || !note.trim()}
                onClick={async () => {
                  setLoading(true);
                  try {
                    const result = await rejectPurchaseAction(purchase.id, note);
                    if (!result.ok) {
                      toast.error(result.message);
                      return;
                    }
                    toast.success("Purchase rejected");
                    setRejectOpen(false);
                    router.refresh();
                  } catch (e) {
                    toast.error(
                      e instanceof Error ? e.message : "Failed to reject"
                    );
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Confirm Reject
              </Button>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  );
}

const columns: ColumnDef<Purchase>[] = [
  {
    accessorKey: "user",
    header: "User",
    cell: ({ row }) => row.original.user?.email ?? row.original.user_id,
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
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => `$${Number(row.original.amount).toFixed(2)}`,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant={
          row.original.status === "approved"
            ? "success"
            : row.original.status === "rejected"
              ? "default"
              : "warning"
        }
        className={cn(
          "capitalize",
          row.original.status === "rejected" && "bg-danger/10 text-danger"
        )}
      >
        {row.original.status}
      </Badge>
    ),
  },
  {
    id: "enrolled",
    header: "Enrolled",
    cell: ({ row }) =>
      row.original.is_enrolled ? (
        <Badge variant="success">Yes</Badge>
      ) : (
        <Badge variant="outline">No</Badge>
      ),
  },
  {
    accessorKey: "receipt_url",
    header: "Receipt",
    cell: ({ row }) =>
      row.original.receipt_url ? (
        <a
          href={row.original.receipt_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand hover:underline"
        >
          View
        </a>
      ) : (
        "—"
      ),
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => format(new Date(row.original.created_at), "MMM d, yyyy"),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <PurchaseActions purchase={row.original} />,
  },
];

export function PurchasesTable({
  purchases,
  status,
}: {
  purchases: Purchase[];
  status?: PurchaseStatus;
}) {
  return (
    <div className="space-y-4">
      <StatusFilter status={status} />
      <div className="overflow-x-auto">
        <DataTable columns={columns} data={purchases} />
      </div>
    </div>
  );
}
