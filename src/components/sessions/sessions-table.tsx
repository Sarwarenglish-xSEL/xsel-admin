"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Copy, Check, MonitorSmartphone } from "lucide-react";
import { toast } from "sonner";
import type { UserSessionWithProfile } from "@/lib/db/sessions";
import {
  deriveSessionPresence,
  formatAppVersion,
  formatDeviceModel,
  formatDeviceOs,
  formatLastSeen,
  shortSessionId,
} from "@/lib/sessions/presence";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
function UserCell({ session }: { session: UserSessionWithProfile }) {
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
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand">
        {initials}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-900">{name || email}</p>
        {name ? (
          <p className="truncate text-xs text-gray-500">{email}</p>
        ) : (
          <p className="truncate text-xs text-gray-400">No profile name</p>
        )}
      </div>
    </div>
  );
}

function DeviceCell({ session }: { session: UserSessionWithProfile }) {
  const device = formatDeviceModel(session.device_model);
  const os = formatDeviceOs(session.os);
  const fullDevice = session.device_model?.trim();
  const fullOs = session.os?.trim();

  if (!fullDevice && !fullOs) {
    return <span className="text-sm text-gray-400">—</span>;
  }

  const title = [fullDevice, fullOs].filter(Boolean).join("\n");

  return (
    <div
      className="flex max-w-[14rem] items-start gap-2"
      title={title.length > device.length + os.length ? title : undefined}
    >
      <MonitorSmartphone className="mt-0.5 h-4 w-4 shrink-0 text-brand/45" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-900">{device}</p>
        <p className="truncate text-xs text-gray-500">{os}</p>
      </div>
    </div>
  );
}

function PresenceBadge({ session }: { session: UserSessionWithProfile }) {
  const presence = deriveSessionPresence(session);

  if (presence === "online") {
    return (
      <Badge variant="success" className="gap-1.5 normal-case">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/40 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
        </span>
        Online
      </Badge>
    );
  }

  if (presence === "recent") {
    return (
      <Badge variant="outline" className="gap-1.5 border-accent/40 bg-accent/10 normal-case text-accent-dark">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        Recently active
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1.5 normal-case text-gray-600">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
      Offline
    </Badge>
  );
}

function LastSeenCell({ session }: { session: UserSessionWithProfile }) {
  const { relative, absolute } = formatLastSeen(session.last_seen_at);
  const presence = deriveSessionPresence(session);

  return (
    <div>
      <p className="text-sm font-medium text-gray-900">{relative}</p>
      <p className="text-xs text-gray-500">{absolute}</p>
      {presence === "offline" && session.is_online ? (
        <p className="mt-0.5 text-[11px] text-amber-700">Stale session flag</p>
      ) : null}
    </div>
  );
}

function SessionIdCell({ sessionId }: { sessionId: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center gap-1.5">
      <code
        className="rounded-md bg-gray-50 px-2 py-1 font-mono text-[11px] text-gray-600"
        title={sessionId}
      >
        {shortSessionId(sessionId)}
      </code>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-7 shrink-0 p-0 text-gray-500"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(sessionId);
            setCopied(true);
            toast.success("Session ID copied");
            window.setTimeout(() => setCopied(false), 2000);
          } catch {
            toast.error("Could not copy");
          }
        }}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

function formatRole(role: string | undefined) {
  if (!role) return null;
  return role.charAt(0).toUpperCase() + role.slice(1);
}

const columns: ColumnDef<UserSessionWithProfile>[] = [
  {
    id: "user",
    header: "User",
    cell: ({ row }) => <UserCell session={row.original} />,
  },
  {
    id: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = formatRole(row.original.user?.role);
      return role ? (
        <Badge variant="outline" className="capitalize">
          {role}
        </Badge>
      ) : (
        <span className="text-sm text-gray-400">—</span>
      );
    },
  },
  {
    id: "device",
    header: "Device",
    cell: ({ row }) => <DeviceCell session={row.original} />,
    meta: { cellClassName: "max-w-[14rem]" },
  },
  {
    id: "app",
    header: "App",
    cell: ({ row }) => {
      const version = formatAppVersion(row.original.app_version);
      return version ? (
        <span className="inline-flex rounded-md bg-gray-50 px-2 py-0.5 font-mono text-xs text-gray-700">
          v{version}
        </span>
      ) : (
        <span className="text-sm text-gray-400">—</span>
      );
    },
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => <PresenceBadge session={row.original} />,
  },
  {
    id: "last_seen",
    header: "Last seen",
    cell: ({ row }) => <LastSeenCell session={row.original} />,
  },
  {
    id: "session_id",
    header: "Session",
    cell: ({ row }) => <SessionIdCell sessionId={row.original.session_id} />,
  },
];

export function SessionsTable({ sessions }: { sessions: UserSessionWithProfile[] }) {
  return (
    <DataTable
      columns={columns}
      data={sessions}
      pageSize={sessions.length || 20}
      hidePagination
      maxHeight="min(70vh, 42rem)"
    />
  );
}
