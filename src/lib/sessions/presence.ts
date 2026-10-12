import { format, formatDistanceToNow } from "date-fns";
import type { UserSession } from "@/types/database";

/** Heartbeat window: app must report within this window to count as online. */
export const SESSION_ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

export type SessionPresence = "online" | "recent" | "offline";

export function getSessionOnlineCutoffIso(now = Date.now()): string {
  return new Date(now - SESSION_ONLINE_THRESHOLD_MS).toISOString();
}

export function isLastSeenFresh(
  lastSeenAt: string,
  now = Date.now()
): boolean {
  const ts = new Date(lastSeenAt).getTime();
  if (Number.isNaN(ts)) return false;
  return now - ts <= SESSION_ONLINE_THRESHOLD_MS;
}

/**
 * Display presence for admin (does not write back to the DB).
 *
 * - **online** — `is_online` from the app AND `last_seen_at` within 5 minutes.
 * - **recent** — seen within 5 minutes but app marked offline (background / closing).
 * - **offline** — no fresh heartbeat, or missing/invalid last seen.
 */
export function deriveSessionPresence(
  session: Pick<UserSession, "is_online" | "last_seen_at">,
  now = Date.now()
): SessionPresence {
  const fresh = isLastSeenFresh(session.last_seen_at, now);
  if (session.is_online && fresh) return "online";
  if (fresh) return "recent";
  return "offline";
}

export function formatLastSeen(
  lastSeenAt: string,
  now = Date.now()
): { relative: string; absolute: string } {
  const date = new Date(lastSeenAt);
  if (Number.isNaN(date.getTime())) {
    return { relative: "Unknown", absolute: "—" };
  }

  const diffMs = now - date.getTime();
  let relative: string;
  if (diffMs < 45_000) relative = "Just now";
  else relative = formatDistanceToNow(date, { addSuffix: true });

  return {
    relative,
    absolute: format(date, "MMM d, yyyy · h:mm a"),
  };
}

/** Shorten noisy manufacturer / build strings for the table. */
export function formatDeviceModel(raw: string | null | undefined): string {
  if (!raw?.trim()) return "Unknown device";
  const cleaned = raw.trim().replace(/\s+/g, " ");
  if (cleaned.length <= 36) return cleaned;

  const tokens = cleaned.split(" ");
  const tail = tokens.slice(-2).join(" ");
  if (tail.length >= 4 && tail.length <= 28) return tail;

  return `${cleaned.slice(0, 33)}…`;
}

export function formatDeviceOs(raw: string | null | undefined): string {
  if (!raw?.trim()) return "Unknown OS";
  const s = raw.trim();

  const android = s.match(/Android\s*(\d+(?:\.\d+)?)/i);
  if (android) return `Android ${android[1]}`;

  const ios = s.match(/iOS\s*(\d+(?:\.\d+)?)/i);
  if (ios) return `iOS ${ios[1]}`;

  if (s.length <= 40) return s;
  return `${s.slice(0, 37)}…`;
}

export function formatAppVersion(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  return raw.trim().replace(/^v/i, "");
}

export function shortSessionId(sessionId: string): string {
  const id = sessionId.trim();
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…`;
}
