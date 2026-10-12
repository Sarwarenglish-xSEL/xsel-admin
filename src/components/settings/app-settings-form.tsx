"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Film,
  KeyRound,
  Mail,
  Plus,
  Save,
  Settings2,
  Shield,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { AppSetting } from "@/types/database";
import { updateAppSettingsAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/layout/page-header";
import { PageEmpty } from "@/components/page-states";
import { cn } from "@/lib/utils";

const BUNNY_KEYS = new Set([
  "BUNNY_CDN_TOKEN_KEY",
  "BUNNY_STREAM_API_KEY",
  "BUNNY_STREAM_LIBRARY_ID",
]);

const EMAIL_LIST_KEYS = new Set(["DEVICE_BINDING_SKIP_EMAILS"]);

const SETTING_META: Record<
  string,
  { title: string; hint?: string }
> = {
  BUNNY_CDN_TOKEN_KEY: {
    title: "Bunny CDN token",
    hint: "CDN token key used for signed playback URLs.",
  },
  BUNNY_STREAM_API_KEY: {
    title: "Bunny Stream API key",
    hint: "Stream library API key for video.bunnycdn.com requests.",
  },
  BUNNY_STREAM_LIBRARY_ID: {
    title: "Bunny Stream library ID",
    hint: "Numeric library ID for your Bunny Stream account.",
  },
  DEVICE_BINDING_SKIP_EMAILS: {
    title: "Device binding skip emails",
    hint: "These emails skip one-device binding and can sign in on any device.",
  },
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmailList(value: string): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const part of value.split(/[,;\n]+/)) {
    const email = part.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  return emails;
}

function serializeEmailList(emails: string[]): string {
  return emails.join(",");
}

function isSecretKey(key: string) {
  const upper = key.toUpperCase();
  return (
    upper.includes("KEY") ||
    upper.includes("TOKEN") ||
    upper.includes("SECRET") ||
    upper.includes("PASSWORD")
  );
}

function humanizeKey(key: string) {
  return key
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function SectionLabel({
  icon: Icon,
  children,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-brand/20 brand-gradient px-4 py-3">
      <div className="mt-0.5 h-7 w-1 shrink-0 rounded-full brand-accent-bar" />
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-dark">
          <Icon className="h-3.5 w-3.5 text-brand" />
          {children}
        </div>
        {description ? (
          <p className="mt-1 text-xs text-brand/70">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

function EmailListEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const emails = parseEmailList(value);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function addEmail() {
    const email = draft.trim().toLowerCase();
    if (!email) {
      setError("Enter an email address");
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      setError("Enter a valid email address");
      return;
    }
    if (emails.includes(email)) {
      setError("This email is already in the list");
      return;
    }
    onChange(serializeEmailList([...emails, email]));
    setDraft("");
    setError(null);
  }

  function removeEmail(email: string) {
    onChange(serializeEmailList(emails.filter((item) => item !== email)));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand/35" />
          <Input
            type="email"
            autoComplete="off"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addEmail();
              }
            }}
            placeholder="name@example.com"
            className="pl-9"
          />
        </div>
        <Button type="button" onClick={addEmail} className="shrink-0 sm:min-w-28">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}

      {emails.length === 0 ? (
        <div className="rounded-lg border border-dashed border-brand/20 bg-brand/[0.02] px-4 py-6 text-center">
          <p className="text-sm font-medium text-brand-dark">No emails yet</p>
          <p className="mt-1 text-xs text-brand/55">
            Add an email above to skip device binding for that account.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-brand/10 overflow-hidden rounded-lg border border-brand/15 bg-brand/[0.02]">
          {emails.map((email) => (
            <li
              key={email}
              className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-brand/[0.04]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Mail className="h-3.5 w-3.5" />
              </div>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand-dark">
                {email}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeEmail(email)}
                className="shrink-0 text-danger hover:bg-danger/10 hover:text-danger"
                aria-label={`Remove ${email}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SettingField({
  setting,
  value,
  revealed,
  dirty,
  onChange,
  onToggleReveal,
}: {
  setting: AppSetting;
  value: string;
  revealed: boolean;
  dirty: boolean;
  onChange: (value: string) => void;
  onToggleReveal: () => void;
}) {
  const secret = isSecretKey(setting.key) && !EMAIL_LIST_KEYS.has(setting.key.toUpperCase());
  const isEmailList = EMAIL_LIST_KEYS.has(setting.key.toUpperCase());
  const emailCount = isEmailList ? parseEmailList(value).length : 0;
  const meta = SETTING_META[setting.key] ?? SETTING_META[setting.key.toUpperCase()];
  const title = meta?.title ?? humanizeKey(setting.key);
  const hint = setting.description?.trim() || meta?.hint;

  return (
    <div
      className={cn(
        "group relative space-y-3 rounded-xl border bg-surface p-4 transition-colors sm:p-5",
        dirty
          ? "border-brand/40 shadow-sm shadow-brand/10"
          : "border-brand/15 hover:border-brand/25"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-sm font-semibold text-brand-dark">{title}</Label>
            {secret ? (
              <Badge variant="outline" className="normal-case">
                <Shield className="mr-1 h-3 w-3" />
                Secret
              </Badge>
            ) : null}
            {isEmailList ? (
              <Badge variant="outline" className="normal-case">
                {emailCount} email{emailCount === 1 ? "" : "s"}
              </Badge>
            ) : null}
            {dirty ? (
              <Badge variant="warning" className="normal-case">
                Unsaved
              </Badge>
            ) : null}
          </div>
          <p className="font-mono text-[11px] tracking-wide text-brand/45">
            {setting.key}
          </p>
          {hint ? <p className="text-xs leading-relaxed text-brand/60">{hint}</p> : null}
        </div>
      </div>

      {isEmailList ? (
        <EmailListEditor value={value} onChange={onChange} />
      ) : (
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand/35" />
          <Input
            type={secret && !revealed ? "password" : "text"}
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${title.toLowerCase()}`}
            className={cn("pl-9 font-mono text-[13px]", secret && "pr-11")}
          />
          {secret ? (
            <button
              type="button"
              onClick={onToggleReveal}
              aria-label={revealed ? `Hide ${title}` : `Show ${title}`}
              className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-brand/45 transition-colors hover:bg-brand/5 hover:text-brand"
            >
              {revealed ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function AppSettingsForm({ settings }: { settings: AppSetting[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(settings.map((row) => [row.key, row.value ?? ""]))
  );
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setValues(
      Object.fromEntries(settings.map((row) => [row.key, row.value ?? ""]))
    );
  }, [settings]);

  const initialValues = useMemo(
    () => Object.fromEntries(settings.map((row) => [row.key, row.value ?? ""])),
    [settings]
  );

  const dirtyKeys = useMemo(
    () =>
      settings
        .filter((row) => {
          const current = values[row.key] ?? "";
          const initial = initialValues[row.key] ?? "";
          if (EMAIL_LIST_KEYS.has(row.key.toUpperCase())) {
            return (
              serializeEmailList(parseEmailList(current)) !==
              serializeEmailList(parseEmailList(initial))
            );
          }
          return current !== initial;
        })
        .map((row) => row.key),
    [settings, values, initialValues]
  );

  const isDirty = dirtyKeys.length > 0;

  const bunnySettings = settings.filter((row) =>
    BUNNY_KEYS.has(row.key.toUpperCase())
  );
  const otherSettings = settings.filter(
    (row) => !BUNNY_KEYS.has(row.key.toUpperCase())
  );

  if (settings.length === 0) {
    return (
      <PageEmpty
        title="No settings found"
        description="Add rows to the app_settings table in Supabase to manage them here."
      />
    );
  }

  async function onSave() {
    setLoading(true);
    try {
      const result = await updateAppSettingsAction(
        settings.map((row) => {
          const raw = values[row.key] ?? "";
          return {
            key: row.key,
            value: EMAIL_LIST_KEYS.has(row.key.toUpperCase())
              ? serializeEmailList(parseEmailList(raw))
              : raw,
          };
        })
      );
      if (!result.ok) {
        toast.error(result.message ?? "Failed to save settings");
        return;
      }
      toast.success("Settings saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  function renderGroup(rows: AppSetting[]) {
    return (
      <div className="grid gap-3">
        {rows.map((row) => (
          <SettingField
            key={row.key}
            setting={row}
            value={values[row.key] ?? ""}
            revealed={Boolean(revealed[row.key])}
            dirty={dirtyKeys.includes(row.key)}
            onChange={(next) =>
              setValues((prev) => ({ ...prev, [row.key]: next }))
            }
            onToggleReveal={() =>
              setRevealed((prev) => ({
                ...prev,
                [row.key]: !prev[row.key],
              }))
            }
          />
        ))}
      </div>
    );
  }

  return (
    <Card className="overflow-hidden border-brand/20 shadow-sm">
      <SectionHeader
        title="App settings"
        description="Configure integrations and runtime keys used across admin and mobile."
        actions={
          <div className="flex items-center gap-2 text-xs text-brand/60">
            <span className="rounded-md bg-brand/10 px-2 py-1 font-medium text-brand">
              {settings.length} keys
            </span>
            {isDirty ? (
              <span className="rounded-md bg-accent/20 px-2 py-1 font-medium text-accent-dark">
                {dirtyKeys.length} unsaved
              </span>
            ) : null}
          </div>
        }
      />
      <CardContent className="p-5 sm:p-6">
        <form
          className="space-y-8"
          onSubmit={(e) => {
            e.preventDefault();
            void onSave();
          }}
        >
          {bunnySettings.length > 0 ? (
            <section className="space-y-4">
              <SectionLabel
                icon={Film}
                description="Video streaming credentials for Bunny CDN / Stream."
              >
                Bunny Stream
              </SectionLabel>
              {renderGroup(bunnySettings)}
            </section>
          ) : null}

          {otherSettings.length > 0 ? (
            <section className="space-y-4">
              <SectionLabel
                icon={Settings2}
                description="Other application configuration values."
              >
                General
              </SectionLabel>
              {renderGroup(otherSettings)}
            </section>
          ) : null}

          <div className="sticky bottom-0 z-10 -mx-5 border-t border-brand/15 bg-surface/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-brand/55">
                {isDirty
                  ? "You have unsaved changes. Secrets stay masked until you reveal them."
                  : "All changes are saved."}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!isDirty || loading}
                  onClick={() => {
                    setValues(initialValues);
                    setRevealed({});
                  }}
                >
                  Reset
                </Button>
                <Button type="submit" disabled={!isDirty || loading} className="min-w-40">
                  <Save className="h-4 w-4" />
                  {loading ? "Saving..." : "Save settings"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
