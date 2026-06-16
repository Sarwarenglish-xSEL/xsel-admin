"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Profile } from "@/types/database";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { updateUserRoleAction } from "@/app/actions";

function RoleSelect({ user, isAdmin }: { user: Profile; isAdmin: boolean }) {
  const [loading, setLoading] = useState(false);

  if (!isAdmin) {
    return <Badge variant="outline">{user.role}</Badge>;
  }

  return (
    <Select
      className="w-32"
      defaultValue={user.role}
      disabled={loading}
      onChange={async (e) => {
        setLoading(true);
        try {
          await updateUserRoleAction(user.id, e.target.value as Profile["role"]);
          toast.success("Role updated");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to update role");
        } finally {
          setLoading(false);
        }
      }}
    >
      <option value="admin">Admin</option>
      <option value="manager">Manager</option>
      <option value="user">User</option>
    </Select>
  );
}

const columns = (isAdmin: boolean): ColumnDef<Profile>[] => [
  { accessorKey: "email", header: "Email" },
  {
    accessorKey: "full_name",
    header: "Name",
    cell: ({ row }) => row.original.full_name || "—",
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => <RoleSelect user={row.original} isAdmin={isAdmin} />,
  },
  {
    accessorKey: "created_at",
    header: "Joined",
    cell: ({ row }) => format(new Date(row.original.created_at), "MMM d, yyyy"),
  },
];

export function UsersTable({ users, isAdmin }: { users: Profile[]; isAdmin: boolean }) {
  return (
    <DataTable columns={columns(isAdmin)} data={users} searchKey="email" searchPlaceholder="Search by email..." />
  );
}
