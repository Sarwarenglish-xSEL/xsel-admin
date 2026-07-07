"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Profile } from "@/types/database";
import { deleteUserAction } from "@/app/actions";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { EditUserDialog } from "@/components/users/edit-user-dialog";

function UserActions({
  user,
  currentUserId,
}: {
  user: Profile;
  currentUserId: string;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();
  const isSelf = user.id === currentUserId;

  return (
    <>
      <DropdownMenu
        trigger={
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        }
      >
        <DropdownMenuItem onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-danger hover:bg-danger/5"
          disabled={isSelf}
          onClick={async () => {
            if (
              !confirm(
                `Delete ${user.email}? This permanently removes the user and related enrollments, purchases, and submissions.`
              )
            ) {
              return;
            }

            try {
              const result = await deleteUserAction(user.id);
              if (!result.ok) {
                toast.error(result.message);
                return;
              }
              toast.success("User deleted");
              router.refresh();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed to delete user");
            }
          }}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenu>
      <EditUserDialog user={user} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}

const columns = (
  isAdmin: boolean,
  currentUserId: string
): ColumnDef<Profile>[] => [
  { accessorKey: "email", header: "Email" },
  {
    accessorKey: "full_name",
    header: "Name",
    cell: ({ row }) => row.original.full_name || "—",
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => <Badge variant="outline">{row.original.role}</Badge>,
  },
  {
    accessorKey: "created_at",
    header: "Joined",
    cell: ({ row }) => format(new Date(row.original.created_at), "MMM d, yyyy"),
  },
  ...(isAdmin
    ? [
        {
          id: "actions",
          cell: ({ row }) => (
            <UserActions user={row.original} currentUserId={currentUserId} />
          ),
        } satisfies ColumnDef<Profile>,
      ]
    : []),
];

export function UsersTable({
  users,
  isAdmin,
  currentUserId,
}: {
  users: Profile[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  return (
    <DataTable
      columns={columns(isAdmin, currentUserId)}
      data={users}
      searchKey="email"
      searchPlaceholder="Search by email..."
    />
  );
}
