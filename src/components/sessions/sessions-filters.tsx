"use client";

import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { SessionStatusFilter } from "@/lib/db/sessions";
import { ListSearch } from "@/components/list-search";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const PRESENCE_OPTIONS: { value: SessionStatusFilter; label: string }[] = [
  { value: "all", label: "All sessions" },
  { value: "online", label: "Online now" },
  { value: "recent", label: "Recently active" },
  { value: "offline", label: "Offline" },
];

export function SessionsFilters({
  initialQuery,
  initialStatus,
}: {
  initialQuery?: string;
  initialStatus: SessionStatusFilter;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const status = initialStatus;

  function applyStatus(next: SessionStatusFilter) {
    const params = new URLSearchParams();
    if (next !== "all") params.set("status", next);
    if (initialQuery) params.set("q", initialQuery);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const hasFilters = Boolean(initialQuery || status !== "all");

  return (
    <div className="overflow-hidden rounded-xl border border-brand/20 bg-surface shadow-sm">
      <div className="border-b border-brand/10 bg-brand/[0.03] px-4 py-3.5 sm:px-5">
        <ListSearch
          initialQuery={initialQuery}
          placeholder="Search by name or email..."
          preserveParams={{ status: status === "all" ? undefined : status }}
          className="w-full max-w-none sm:max-w-md"
        />
      </div>
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:px-5">
        <div className="min-w-0 space-y-1.5 sm:w-56">
          <Label className="text-xs font-semibold uppercase tracking-wide text-brand/55">
            Presence
          </Label>
          <Select
            className="w-full"
            value={status}
            onChange={(e) => applyStatus(e.target.value as SessionStatusFilter)}
          >
            {PRESENCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        {hasFilters ? (
          <Button variant="outline" className="shrink-0" onClick={() => router.push(pathname)}>
            <X className="h-4 w-4" /> Clear filters
          </Button>
        ) : (
          <p className="text-xs text-brand/55 sm:max-w-md sm:text-right">
            Online = app heartbeat within 5 minutes. Last seen updates when the mobile app
            syncs.
          </p>
        )}
      </div>
    </div>
  );
}
