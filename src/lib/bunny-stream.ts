import { getAppSettings } from "@/lib/db/app-settings";

const BUNNY_API_BASE = "https://video.bunnycdn.com";

async function getBunnyConfig() {
  // Prefer Stream API key for video.bunnycdn.com AccessKey auth.
  // Fall back to CDN token only if Stream API key is absent.
  const settings = await getAppSettings([
    "BUNNY_STREAM_LIBRARY_ID",
    "BUNNY_STREAM_API_KEY",
    "BUNNY_CDN_TOKEN_KEY",
  ]);

  const libraryId =
    settings.BUNNY_STREAM_LIBRARY_ID ??
    process.env.BUNNY_STREAM_LIBRARY_ID?.trim() ??
    process.env.EXPO_PUBLIC_BUNNY_STREAM_LIBRARY_ID?.trim() ??
    null;

  const apiKey =
    settings.BUNNY_STREAM_API_KEY ??
    process.env.BUNNY_STREAM_API_KEY?.trim() ??
    settings.BUNNY_CDN_TOKEN_KEY ??
    process.env.EXPO_PUBLIC_BUNNY_CDN_TOKEN_KEY?.trim() ??
    null;

  if (!libraryId || !apiKey) {
    const missing = [
      !libraryId ? "BUNNY_STREAM_LIBRARY_ID" : null,
      !apiKey ? "BUNNY_STREAM_API_KEY" : null,
    ].filter(Boolean);
    throw new Error(
      `Bunny Stream is not configured. Missing in app_settings: ${missing.join(", ")}.`
    );
  }

  return { libraryId, apiKey };
}

export function extractBunnyVideoId(input: string): string {
  const trimmed = input.trim();
  const uuidMatch = trimmed.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );
  return uuidMatch ? uuidMatch[0] : trimmed;
}

type BunnyVideoResponse = {
  length?: number;
  status?: number;
};

export async function getBunnyVideoDuration(
  videoIdOrUrl: string
): Promise<number> {
  const { libraryId, apiKey } = await getBunnyConfig();
  const videoId = extractBunnyVideoId(videoIdOrUrl);

  const response = await fetch(
    `${BUNNY_API_BASE}/library/${libraryId}/videos/${videoId}`,
    {
      headers: {
        AccessKey: apiKey,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Bunny video not found: ${videoId}`);
    }
    if (response.status === 401) {
      throw new Error(
        "Bunny Stream authentication failed. Check BUNNY_STREAM_API_KEY in app_settings (must be the Stream Library API key, not the CDN token)."
      );
    }
    throw new Error(`Failed to fetch Bunny video (${response.status})`);
  }

  const data = (await response.json()) as BunnyVideoResponse;

  if (typeof data.length !== "number" || data.length <= 0) {
    throw new Error(
      "Bunny video duration is not available yet. The video may still be encoding."
    );
  }

  return Math.round(data.length);
}
