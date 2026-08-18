/** Admin portal base URL for web auth redirects (password reset, etc.). */
export function getAdminSiteUrl(): string {
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_SITE_URL?.trim();
  if (adminUrl && isHttpUrl(adminUrl)) {
    return adminUrl.replace(/\/$/, "");
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl && isHttpUrl(siteUrl)) {
    return siteUrl.replace(/\/$/, "");
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** @deprecated Use getAdminSiteUrl */
export function getSiteUrl(): string {
  return getAdminSiteUrl();
}
