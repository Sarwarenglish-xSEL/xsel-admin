const PRODUCTION_ADMIN_URL = "https://xsel-admin-ten.vercel.app";

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isLocalhostUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

function normalizeUrl(value: string): string {
  return value.replace(/\/$/, "");
}

/**
 * Admin portal base URL for password-reset emails.
 * Prefer the live page origin so Vercel never sends localhost links.
 */
export function getAdminSiteUrl(requestOrigin?: string | null): string {
  const origin = requestOrigin?.trim();
  if (origin && isHttpUrl(origin) && !isLocalhostUrl(origin)) {
    return normalizeUrl(origin);
  }

  const isVercel = Boolean(process.env.VERCEL);
  if (isVercel) {
    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_SITE_URL?.trim();
    if (adminUrl && isHttpUrl(adminUrl) && !isLocalhostUrl(adminUrl)) {
      return normalizeUrl(adminUrl);
    }

    const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
    if (production) return `https://${production.replace(/^https?:\/\//, "")}`;

    return PRODUCTION_ADMIN_URL;
  }

  if (origin && isHttpUrl(origin)) {
    return normalizeUrl(origin);
  }

  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_SITE_URL?.trim();
  if (adminUrl && isHttpUrl(adminUrl)) {
    return normalizeUrl(adminUrl);
  }

  return "http://localhost:3000";
}

/** @deprecated Use getAdminSiteUrl */
export function getSiteUrl(): string {
  return getAdminSiteUrl();
}
