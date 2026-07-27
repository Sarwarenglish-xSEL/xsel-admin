import { createServiceClient } from "@/lib/supabase/admin";

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
