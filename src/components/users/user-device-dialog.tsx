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

/** Turn Android build fingerprints into a short readable label. */
function summarizeOs(os?: string | null) {
  if (!os?.trim()) return null;
  const value = os.trim();

  const androidVersion = value.match(/:(\d+(?:\.\d+)*)\//)?.[1];
  if (androidVersion) {
    const brand = value.split("/")[0];
    return brand ? `${brand} · Android ${androidVersion}` : `Android ${androidVersion}`;
  }

  if (/iphone|ipad|ios/i.test(value)) return value;

  return value.length > 48 ? `${value.slice(0, 48)}…` : value;
}

function formatAppVersion(version?: string | null) {
  if (!version?.trim()) return null;
  return `v${version.replace(/^v/i, "")}`;
}

function truncateMiddle(value: string, start = 10, end = 8) {
  if (value.length <= start + end + 1) return value;
  return `${value.slice(0, start)}…${value.slice(-end)}`;
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
      className="h-7 w-7 shrink-0 text-gray-400 hover:text-brand"
      onClick={copy}
      aria-label={`Copy ${label}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
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
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          {label}
        </p>
        {copyValue ? <CopyButton label={label} value={copyValue} /> : null}
      </div>
      <p
        className={
          mono
            ? "break-all font-mono text-xs leading-relaxed text-gray-700"
            : "text-sm font-medium leading-snug text-gray-900"
        }
        title={copyValue || value}
      >
        {value}
      </p>
      {helper ? <p className="text-xs leading-relaxed text-gray-500">{helper}</p> : null}
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
      <DialogContent className="p-0" onClose={() => onOpenChange(false)}>
        <div className="border-b border-brand/10 brand-gradient px-6 py-5 pr-12">
          <DialogHeader className="mb-0">
            <DialogTitle>Device details</DialogTitle>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
                {getInitials(user)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
                {hasName ? (
                  <p className="truncate text-xs text-gray-500">{user.email}</p>
                ) : null}
              </div>
              <Badge variant="outline" className="ml-auto shrink-0">
                {user.role}
              </Badge>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-6 px-6 py-5">
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <Smartphone className="h-3.5 w-3.5 text-brand" />
              Registered device
            </div>

            {hasDevice ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-gray-100 bg-gray-50/70 px-3.5 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Model
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-gray-900" title={model ?? undefined}>
                      {model || "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/70 px-3.5 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Platform
                    </p>
                    <p
                      className="mt-1 truncate text-sm font-semibold text-gray-900"
                      title={osSummary ?? undefined}
                    >
                      {osSummary || "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/70 px-3.5 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      App
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold text-gray-900">
                      {appVersion || "—"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
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
                    <p className="text-sm text-gray-500">No additional device identifiers.</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-5 text-sm text-gray-500">
                <MonitorSmartphone className="h-5 w-5 shrink-0 text-gray-300" />
                No registered device for this user yet.
              </div>
            )}
          </section>

          <section className="space-y-4 border-t border-gray-100 pt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                <ArrowRightLeft className="h-3.5 w-3.5 text-brand" />
                Device transfers
              </div>
              <Badge
                variant={transferCount > 0 ? "warning" : "outline"}
                className="normal-case tabular-nums"
              >
                {transferCount} total
              </Badge>
            </div>

            {history.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-5 text-sm text-gray-500">
                <History className="h-5 w-5 shrink-0 text-gray-300" />
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
                      className="rounded-xl border border-gray-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {device || "Device transfer"}
                          </p>
                          <p className="mt-1 truncate text-xs text-gray-500">
                            {[os, version].filter(Boolean).join(" · ") || "Details unavailable"}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 normal-case">
                          #{history.length - index}
                        </Badge>
                      </div>

                      {when ? (
                        <p className="mt-3 text-xs text-gray-500">
                          {formatDistanceToNow(when, { addSuffix: true })}
                          <span className="text-gray-300"> · </span>
                          {format(when, "MMM d, yyyy · h:mm a")}
                        </p>
                      ) : null}

                      {record.from_device_model && record.to_device_model ? (
                        <p className="mt-2 text-xs text-gray-500">
                          <span className="text-gray-400">From</span>{" "}
                          {String(record.from_device_model)}
                          <span className="mx-1.5 text-gray-300">→</span>
                          <span className="text-gray-400">To</span>{" "}
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
