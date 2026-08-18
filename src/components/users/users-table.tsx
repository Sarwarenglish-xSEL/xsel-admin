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
import { formatAppVersion, summarizeOs } from "@/lib/device-utils";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { EditUserDialog } from "@/components/users/edit-user-dialog";
import { UserDeviceDialog } from "@/components/users/user-device-dialog";

function UserActions({
  user,
  currentUserId,
  canManage,
  currentUserRole,
}: {
  user: Profile;
  currentUserId: string;
  canManage: boolean;
  currentUserRole: Profile["role"];
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
        {canManage && (
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Edit
          </DropdownMenuItem>
        )}
        {canManage && (
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
      {canManage && (
        <EditUserDialog
          user={user}
          open={editOpen}
          onOpenChange={setEditOpen}
          currentUserRole={currentUserRole}
        />
      )}
    </>
  );
}

function DeviceCell({ user }: { user: Profile }) {
  const model = user.registered_device_model?.trim();
  const osRaw = user.registered_os?.trim();
  const platform = summarizeOs(osRaw);

  if (!model && !platform) {
    return <span className="text-sm text-gray-400">No device</span>;
  }

  return (
    <div className="min-w-0 max-w-full">
      <p className="truncate text-sm font-medium text-brand-dark" title={model ?? undefined}>
        {model || "Unknown device"}
      </p>
      {platform ? (
        <p className="truncate text-xs text-gray-500" title={osRaw ?? undefined}>
          {platform}
        </p>
      ) : null}
    </div>
  );
}

function getInitials(user: Profile) {
  const name = user.full_name?.trim();
  if (name) {
    return name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return user.email.slice(0, 2).toUpperCase();
}

const ROLE_LABELS: Record<Profile["role"], string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  user: "User",
};

const ROLE_BADGE_CLASS: Record<Profile["role"], string> = {
  superadmin: "border-transparent bg-brand text-white",
  admin: "border-transparent bg-brand/15 text-brand",
  manager: "border-transparent bg-accent/20 text-accent-dark",
  user: "border-brand/20 bg-white text-brand",
};

const columns = (
  canManage: boolean,
  currentUserId: string,
  currentUserRole: Profile["role"]
): ColumnDef<Profile>[] => [
  {
    accessorKey: "email",
    header: "User",
    meta: {
      headerClassName: "w-[26%] max-w-0",
      cellClassName: "max-w-0",
    },
    cell: ({ row }) => {
      const user = row.original;
      const name = user.full_name?.trim();
      return (
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand">
            {getInitials(user)}
          </div>
          <div className="min-w-0 max-w-full">
            <p className="truncate text-sm font-semibold text-brand-dark">
              {name || user.email}
            </p>
            {name ? (
              <p className="truncate text-xs text-brand/60">{user.email}</p>
            ) : null}
          </div>
        </div>
      );
    },
    filterFn: (row, _id, value) => {
      const q = String(value).toLowerCase().trim();
      if (!q) return true;
      const email = row.original.email.toLowerCase();
      const name = (row.original.full_name ?? "").toLowerCase();
      return email.includes(q) || name.includes(q);
    },
  },
  {
    accessorKey: "role",
    header: "Role",
    meta: {
      headerClassName: "w-[10%]",
      cellClassName: "whitespace-nowrap",
    },
    cell: ({ row }) => {
      const role = row.original.role;
      return (
        <Badge variant="outline" className={ROLE_BADGE_CLASS[role]}>
          {ROLE_LABELS[role]}
        </Badge>
      );
    },
  },
  {
    id: "device",
    header: "Device",
    meta: {
      headerClassName: "w-[28%] max-w-0",
      cellClassName: "max-w-0",
    },
    cell: ({ row }) => <DeviceCell user={row.original} />,
  },
  {
    accessorKey: "registered_app_version",
    header: "App",
    meta: {
      headerClassName: "w-[9%]",
      cellClassName: "whitespace-nowrap",
    },
    cell: ({ row }) => {
      const version = formatAppVersion(row.original.registered_app_version);
      return version ? (
        <span className="font-mono text-xs text-gray-700">{version}</span>
      ) : (
        <span className="text-sm text-gray-400">—</span>
      );
    },
  },
  {
    accessorKey: "device_transfer_count",
    header: "Transfers",
    meta: {
      headerClassName: "w-[10%]",
      cellClassName: "whitespace-nowrap",
    },
    cell: ({ row }) => {
      const count = row.original.device_transfer_count ?? 0;
      return (
        <span className="inline-flex min-w-[2.75rem] items-center justify-center rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-brand">
          {count}/2
        </span>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Joined",
    meta: {
      headerClassName: "w-[12%]",
      cellClassName: "whitespace-nowrap text-gray-600",
    },
    cell: ({ row }) => format(new Date(row.original.created_at), "MMM d, yyyy"),
  },
  {
    id: "actions",
    meta: {
      headerClassName: "w-12",
      cellClassName: "w-12",
    },
    cell: ({ row }) => (
      <UserActions
        user={row.original}
        currentUserId={currentUserId}
        canManage={canManage}
        currentUserRole={currentUserRole}
      />
    ),
  },
];

export function UsersTable({
  users,
  canManage,
  currentUserId,
  currentUserRole,
}: {
  users: Profile[];
  canManage: boolean;
  currentUserId: string;
  currentUserRole: Profile["role"];
}) {
  return (
    <DataTable
      columns={columns(canManage, currentUserId, currentUserRole)}
      data={users}
      searchKey="email"
      searchPlaceholder="Search by name or email..."
      fixedLayout
    />
  );
}
