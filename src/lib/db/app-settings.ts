import { createServiceClient } from "@/lib/supabase/admin";
import type { AppSetting } from "@/types/database";

/** Managed on Dashboard app-status toggle — hide from Settings UI. */
export const HIDDEN_APP_SETTING_KEYS = new Set(["is_course_published"]);

function requireServiceClient() {
  const supabase = createServiceClient();
  if (!supabase) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required to read app_settings."
    );
  }
  return supabase;
}

function normalizeKey(key: string): string {
  return key.trim().toUpperCase();
}

function normalizeValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isHiddenSettingKey(key: string): boolean {
  return HIDDEN_APP_SETTING_KEYS.has(key.trim().toLowerCase());
}

export async function getAppSetting(key: string): Promise<string | null> {
  const settings = await getAppSettings([key]);
  return settings[key] ?? null;
}

export async function getAppSettings(
  keys: string[]
): Promise<Record<string, string | null>> {
  const supabase = requireServiceClient();

  // Read the full table so we can match keys case-insensitively / trimmed.
  // app_settings is a small key/value store, so this is cheap and reliable.
  const { data, error } = await supabase.from("app_settings").select("key, value");
  if (error) throw error;

  const byKey = new Map<string, string | null>();
  for (const row of data ?? []) {
    if (!row?.key) continue;
    byKey.set(normalizeKey(String(row.key)), normalizeValue(row.value));
  }

  const result: Record<string, string | null> = {};
  for (const key of keys) {
    result[key] = byKey.get(normalizeKey(key)) ?? null;
  }
  return result;
}

export async function listAppSettings(): Promise<AppSetting[]> {
  const supabase = requireServiceClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value, description, created_at, updated_at")
    .order("key", { ascending: true });
  if (error) throw error;

  return ((data ?? []) as AppSetting[]).filter(
    (row) => row.key && !isHiddenSettingKey(row.key)
  );
}

export async function upsertAppSetting(
  key: string,
  value: string
): Promise<void> {
  const supabase = requireServiceClient();
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key, value }, { onConflict: "key" });
  if (error) throw error;
}

export async function upsertAppSettings(
  entries: { key: string; value: string }[]
): Promise<void> {
  for (const entry of entries) {
    await upsertAppSetting(entry.key, entry.value);
  }
}
