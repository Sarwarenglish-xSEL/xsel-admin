"use client";

import { useState } from "react";
import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import {
  ArrowRightLeft,
  Check,
  Copy,
  History,
  MonitorSmartphone,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import type { DeviceTransferRecord, Profile } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  formatAppVersion,
  summarizeOs,
  truncateMiddle,
} from "@/lib/device-utils";

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

function formatMaybeDate(value?: string | null) {
  if (!value) return null;
  const date = parseISO(value);
  if (!isValid(date)) {
    const fallback = new Date(value);
    if (!isValid(fallback)) return null;
    return fallback;
  }
  return date;
}

function getTransferTimestamp(record: DeviceTransferRecord) {
  return formatMaybeDate(
    (record.transferred_at as string | null | undefined) ??
      (record.created_at as string | null | undefined) ??
      null
  );
}

function getTransferDevice(record: DeviceTransferRecord) {
  return (
    (record.to_device_model as string | null | undefined) ||
    (record.device_model as string | null | undefined) ||
    (record.from_device_model as string | null | undefined) ||
    null
  );
}

function getTransferOs(record: DeviceTransferRecord) {
  return (
    (record.to_os as string | null | undefined) ||
    (record.os as string | null | undefined) ||
    (record.from_os as string | null | undefined) ||
    null
  );
}

function getTransferAppVersion(record: DeviceTransferRecord) {
  return (record.app_version as string | null | undefined) || null;
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

function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 text-brand/40 hover:bg-brand/5 hover:text-brand"
      onClick={copy}
      aria-label={`Copy ${label}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: typeof Smartphone;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-brand/20 bg-brand/[0.04] px-3.5 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-brand/55">
        {label}
      </p>
      <p className="mt-1 truncate font-sans text-sm font-semibold text-brand-dark" title={value}>
        {value}
      </p>
    </div>
  );
}

function DetailField({
  label,
  value,
  mono,
  copyValue,
  helper,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyValue?: string;
  helper?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand/55">
          {label}
        </p>
        {copyValue ? <CopyButton label={label} value={copyValue} /> : null}
      </div>
      <p
        className={
          mono
            ? "break-all font-mono text-xs leading-relaxed text-brand-dark"
            : "font-sans text-sm font-medium leading-snug text-brand-dark"
        }
        title={copyValue || value}
      >
        {value}
      </p>
      {helper ? <p className="text-xs leading-relaxed text-brand/55">{helper}</p> : null}
    </div>
  );
}

export function UserDeviceDialog({
  user,
  open,
  onOpenChange,
}: {
  user: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const history = Array.isArray(user.device_transfer_history)
    ? [...user.device_transfer_history].reverse()
    : [];
  const displayName = user.full_name?.trim() || user.email;
  const hasName = Boolean(user.full_name?.trim());
  const transferCount = user.device_transfer_count ?? 0;

  const model = user.registered_device_model?.trim() || null;
  const osRaw = user.registered_os?.trim() || null;
  const osSummary = summarizeOs(osRaw);
  const appVersion = formatAppVersion(user.registered_app_version);
  const token = user.registered_device_token?.trim() || null;

  const hasDevice = Boolean(model || osRaw || appVersion || token);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-lg">
      <DialogContent
        className="flex max-h-[min(40rem,85vh)] w-full flex-col overflow-hidden p-0"
        onClose={() => onOpenChange(false)}
      >
        <div className="shrink-0 border-b border-brand/15 brand-gradient px-6 py-5 pr-12">
          <DialogHeader className="mb-0">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-8 w-1 shrink-0 rounded-full brand-accent-bar" />
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-xl">Device details</DialogTitle>
                <p className="mt-1 text-sm text-brand/70">
                  Registered hardware and transfer history
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/15 text-sm font-semibold text-brand">
                {getInitials(user)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-sans text-sm font-semibold text-brand-dark">
                  {displayName}
                </p>
                {hasName ? (
                  <p className="truncate text-xs text-brand/60">{user.email}</p>
                ) : null}
              </div>
              <Badge variant="outline" className={`shrink-0 ${ROLE_BADGE_CLASS[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </Badge>
            </div>
          </DialogHeader>
        </div>

        <div className="brand-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section className="space-y-4">
            <SectionLabel icon={Smartphone}>Registered device</SectionLabel>

            {hasDevice ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <StatCard label="Model" value={model || "—"} />
                  <StatCard label="Platform" value={osSummary || "—"} />
                  <StatCard label="App" value={appVersion || "—"} />
                </div>

                <div className="space-y-4 rounded-xl border border-brand/20 bg-white p-4">
                  {osRaw ? (
                    <DetailField
                      label="OS build"
                      value={truncateMiddle(osRaw, 28, 18)}
                      mono
                      copyValue={osRaw}
                      helper="Full Android build fingerprint. Use copy for the complete value."
                    />
                  ) : null}

                  {token ? (
                    <DetailField
                      label="Device token"
                      value={truncateMiddle(token, 14, 12)}
                      mono
                      copyValue={token}
                      helper="Unique device identifier used for registration."
                    />
                  ) : null}

                  {!osRaw && !token ? (
                    <p className="text-sm text-brand/60">No additional device identifiers.</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-brand/15 bg-brand/[0.04] px-4 py-5 text-sm text-brand/70">
                <MonitorSmartphone className="h-5 w-5 shrink-0 text-brand/40" />
                No registered device for this user yet.
              </div>
            )}
          </section>

          <section className="space-y-4 border-t border-brand/15 pt-5">
            <div className="flex items-center justify-between gap-3">
              <SectionLabel icon={ArrowRightLeft}>Device transfers</SectionLabel>
              <span className="inline-flex min-w-[2.75rem] items-center justify-center rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-brand">
                {transferCount}/2
              </span>
            </div>

            {history.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl border border-brand/15 bg-brand/[0.04] px-4 py-5 text-sm text-brand/70">
                <History className="h-5 w-5 shrink-0 text-brand/40" />
                No device transfers recorded for this account.
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((record, index) => {
                  const when = getTransferTimestamp(record);
                  const device = getTransferDevice(record);
                  const os = summarizeOs(getTransferOs(record));
                  const version = formatAppVersion(getTransferAppVersion(record));

                  return (
                    <div
                      key={`${user.id}-transfer-${index}`}
                      className="rounded-xl border border-brand/20 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-sans text-sm font-semibold text-brand-dark">
                            {device || "Device transfer"}
                          </p>
                          <p className="mt-1 truncate text-xs text-brand/60">
                            {[os, version].filter(Boolean).join(" · ") || "Details unavailable"}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 border-brand/20 normal-case text-brand">
                          #{history.length - index}
                        </Badge>
                      </div>

                      {when ? (
                        <p className="mt-3 text-xs text-brand/55">
                          {formatDistanceToNow(when, { addSuffix: true })}
                          <span className="text-brand/25"> · </span>
                          {format(when, "MMM d, yyyy · h:mm a")}
                        </p>
                      ) : null}

                      {record.from_device_model && record.to_device_model ? (
                        <p className="mt-2 text-xs text-brand/60">
                          <span className="text-brand/45">From</span>{" "}
                          {String(record.from_device_model)}
                          <span className="mx-1.5 text-brand/30">→</span>
                          <span className="text-brand/45">To</span>{" "}
                          {String(record.to_device_model)}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
