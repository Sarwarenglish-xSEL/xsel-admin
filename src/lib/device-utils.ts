/** Turn Android build fingerprints into a short readable label. */
export function summarizeOs(os?: string | null) {
  if (!os?.trim()) return null;
  const value = os.trim();

  const androidVersion = value.match(/:(\d+(?:\.\d+)*)\//)?.[1];
  if (androidVersion) {
    const brand = value.split("/")[0];
    return brand ? `${brand} · Android ${androidVersion}` : `Android ${androidVersion}`;
  }

  if (/iphone|ipad|ios/i.test(value)) return value;

  return value.length > 40 ? `${value.slice(0, 40)}…` : value;
}

export function formatAppVersion(version?: string | null) {
  if (!version?.trim()) return null;
  return `v${version.replace(/^v/i, "")}`;
}

export function truncateMiddle(value: string, start = 10, end = 8) {
  if (value.length <= start + end + 1) return value;
  return `${value.slice(0, start)}…${value.slice(-end)}`;
}
