"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format, formatDistanceToNow } from "date-fns";
import { MonitorSmartphone } from "lucide-react";
import type { UserSession } from "@/types/database";
import type { SessionStatusFilter } from "@/lib/db/sessions";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";

function StatusFilter({ status }: { status: SessionStatusFilter }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-xl border border-brand/25 bg-white px-4 py-3 shadow-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-brand">
        Presence
      </span>
      <Select
        className="w-40"
        defaultValue={status}
        onChange={(e) => {
          const params = new URLSearchParams(window.location.search);
          if (e.target.value === "all") params.delete("status");
          else params.set("status", e.target.value);
          window.location.search = params.toString();
        }}
      >
        <option value="all">All users</option>
        <option value="online">Online</option>
        <option value="offline">Offline</option>
      </Select>
    </div>
  );
}

function UserCell({ session }: { session: UserSession }) {
  const name = session.user?.full_name?.trim();
  const email = session.user?.email ?? "Unknown user";
  const initials = (name || email)
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/20 text-xs font-semibold text-brand">
        {initials}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-900">
          {name || email}
        </p>
        {name ? (
          <p className="truncate text-xs text-gray-500">{email}</p>
        ) : (
          <p className="truncate text-xs text-gray-400">No profile name</p>
        )}
      </div>
    </div>
  );
}

function DeviceCell({ session }: { session: UserSession }) {
  const device = session.device_model?.trim();
  const os = session.os?.trim();

  if (!device && !os) {
    return <span className="text-sm text-gray-400">—</span>;
  }

  return (
    <div className="flex items-start gap-2">
      <MonitorSmartphone className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
      <div className="min-w-0">
        <p className="truncate text-sm text-gray-900">{device || "Unknown device"}</p>
        <p className="truncate text-xs text-gray-500">{os || "Unknown OS"}</p>
      </div>
    </div>
  );
}

const columns: ColumnDef<UserSession>[] = [
  {
    id: "user",
    accessorFn: (row) =>
      `${row.user?.full_name ?? ""} ${row.user?.email ?? ""} ${row.user_id}`,
    header: "User",
    cell: ({ row }) => <UserCell session={row.original} />,
  },
  {
    accessorKey: "user.role",
    header: "Role",
    cell: ({ row }) =>
      row.original.user?.role ? (
        <Badge variant="outline">{row.original.user.role}</Badge>
      ) : (
        <span className="text-sm text-gray-400">—</span>
      ),
  },
  {
    id: "device",
    header: "Device",
    cell: ({ row }) => <DeviceCell session={row.original} />,
  },
  {
    accessorKey: "app_version",
    header: "App",
    cell: ({ row }) =>
      row.original.app_version ? (
        <span className="font-mono text-xs text-gray-700">
          v{row.original.app_version.replace(/^v/i, "")}
        </span>
      ) : (
        <span className="text-sm text-gray-400">—</span>
      ),
  },
  {
    accessorKey: "is_online",
    header: "Status",
    cell: ({ row }) =>
      row.original.is_online ? (
        <Badge variant="success" className="gap-1.5 normal-case">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Online
        </Badge>
      ) : (
        <Badge variant="outline" className="gap-1.5 normal-case">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
          Offline
        </Badge>
      ),
  },
  {
    accessorKey: "last_seen_at",
    header: "Last seen",
    cell: ({ row }) => {
      const date = new Date(row.original.last_seen_at);
      return (
        <div>
          <p className="text-sm text-gray-900">
            {formatDistanceToNow(date, { addSuffix: true })}
          </p>
          <p className="text-xs text-gray-500">
            {format(date, "MMM d, yyyy · h:mm a")}
          </p>
        </div>
      );
    },
  },
  {
    accessorKey: "session_id",
    header: "Session",
    cell: ({ row }) => (
      <code className="block max-w-[9rem] truncate rounded-md bg-gray-50 px-2 py-1 font-mono text-[11px] text-gray-600">
        {row.original.session_id}
      </code>
    ),
  },
];

export function SessionsTable({
  sessions,
  status,
}: {
  sessions: UserSession[];
  status: SessionStatusFilter;
}) {
  return (
    <DataTable
      columns={columns}
      data={sessions}
      searchKey="user"
      searchPlaceholder="Search by name or email..."
      toolbar={<StatusFilter status={status} />}
    />
  );
}
