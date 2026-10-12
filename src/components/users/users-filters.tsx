"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { UserRole } from "@/types/database";
import type { ProfileDeviceFilter } from "@/lib/db/profiles";
import { ListSearch } from "@/components/list-search";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "user", label: "User" },
];

export function UsersFilters({
  initialQuery,
  initialRole,
  initialDevice,
}: {
  initialQuery?: string;
  initialRole?: UserRole;
  initialDevice?: ProfileDeviceFilter;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState(initialRole ?? "");
  const [device, setDevice] = useState(initialDevice ?? "");

  useEffect(() => {
    setRole(initialRole ?? "");
    setDevice(initialDevice ?? "");
  }, [initialRole, initialDevice]);

  function applyFilters(nextRole: string, nextDevice: string) {
    const params = new URLSearchParams();
    if (nextRole) params.set("role", nextRole);
    if (nextDevice) params.set("device", nextDevice);
    if (initialQuery) params.set("q", initialQuery);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const hasFilters = Boolean(role || device || initialQuery);

  return (
    <div className="overflow-hidden rounded-xl border border-brand/20 bg-surface shadow-sm">
      <div className="border-b border-brand/10 bg-brand/[0.03] px-4 py-3.5 sm:px-5">
        <ListSearch
          initialQuery={initialQuery}
          placeholder="Search by name or email..."
          preserveParams={{
            role: role || undefined,
            device: device || undefined,
          }}
          suggestScope="users"
          className="w-full max-w-none sm:max-w-md"
        />
      </div>
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-end sm:gap-3 sm:px-5">
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0 space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-brand/55">
              Role
            </Label>
            <Select
              className="w-full"
              value={role}
              onChange={(e) => {
                const next = e.target.value;
                setRole(next);
                applyFilters(next, device);
              }}
            >
              <option value="">All roles</option>
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="min-w-0 space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-brand/55">
              Device
            </Label>
            <Select
              className="w-full"
              value={device}
              onChange={(e) => {
                const next = e.target.value;
                setDevice(next);
                applyFilters(role, next);
              }}
            >
              <option value="">All devices</option>
              <option value="registered">Device registered</option>
              <option value="none">No device</option>
            </Select>
          </div>
        </div>
        {hasFilters ? (
          <Button
            variant="outline"
            className="shrink-0"
            onClick={() => {
              setRole("");
              setDevice("");
              router.push(pathname);
            }}
          >
            <X className="h-4 w-4" /> Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}
