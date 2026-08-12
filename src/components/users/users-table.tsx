"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  MoreHorizontal,
  MonitorSmartphone,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { Profile } from "@/types/database";
import { deleteUserAction } from "@/app/actions";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { EditUserDialog } from "@/components/users/edit-user-dialog";
import { UserDeviceDialog } from "@/components/users/user-device-dialog";

function UserActions({
  user,
  currentUserId,
  isAdmin,
}: {
  user: Profile;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deviceOpen, setDeviceOpen] = useState(false);
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
        <DropdownMenuItem onClick={() => setDeviceOpen(true)}>
          <MonitorSmartphone className="h-4 w-4" /> Device details
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Edit
          </DropdownMenuItem>
        )}
        {isAdmin && (
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
        )}
      </DropdownMenu>
      <UserDeviceDialog user={user} open={deviceOpen} onOpenChange={setDeviceOpen} />
      {isAdmin && (
        <EditUserDialog user={user} open={editOpen} onOpenChange={setEditOpen} />
      )}
    </>
  );
}

function DeviceCell({ user }: { user: Profile }) {
  const model = user.registered_device_model?.trim();
  const os = user.registered_os?.trim();

  if (!model && !os) {
    return <span className="text-sm text-gray-400">No device</span>;
  }

  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-gray-900">
        {model || "Unknown device"}
      </p>
      <p className="truncate text-xs text-gray-500">{os || "Unknown OS"}</p>
    </div>
  );
}

const columns = (
  isAdmin: boolean,
  currentUserId: string
): ColumnDef<Profile>[] => [
  {
    accessorKey: "email",
    header: "User",
    cell: ({ row }) => {
      const user = row.original;
      const name = user.full_name?.trim();
      return (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">
            {name || user.email}
          </p>
          {name ? (
            <p className="truncate text-xs text-gray-500">{user.email}</p>
          ) : null}
        </div>
      );
    },
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => <Badge variant="outline">{row.original.role}</Badge>,
  },
  {
    id: "device",
    header: "Device",
    cell: ({ row }) => <DeviceCell user={row.original} />,
  },
  {
    accessorKey: "registered_app_version",
    header: "App",
    cell: ({ row }) =>
      row.original.registered_app_version ? (
        <span className="font-mono text-xs text-gray-700">
          v{row.original.registered_app_version.replace(/^v/i, "")}
        </span>
      ) : (
        <span className="text-sm text-gray-400">—</span>
      ),
  },
  {
    accessorKey: "device_transfer_count",
    header: "Transfers",
    cell: ({ row }) => {
      const count = row.original.device_transfer_count ?? 0;
      return (
        <Badge
          variant={count > 0 ? "warning" : "outline"}
          className="normal-case tabular-nums"
        >
          {count}
        </Badge>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Joined",
    cell: ({ row }) => format(new Date(row.original.created_at), "MMM d, yyyy"),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <UserActions
        user={row.original}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />
    ),
  },
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
