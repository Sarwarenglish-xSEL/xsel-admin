const BUNNY_API_BASE = "https://video.bunnycdn.com";

function getBunnyConfig() {
  const libraryId =
    process.env.BUNNY_STREAM_LIBRARY_ID ??
    process.env.EXPO_PUBLIC_BUNNY_STREAM_LIBRARY_ID;
  const apiKey =
    process.env.BUNNY_STREAM_API_KEY ??
    process.env.EXPO_PUBLIC_BUNNY_CDN_TOKEN_KEY;

  if (!libraryId || !apiKey) {
    throw new Error(
      "Bunny Stream is not configured. Set BUNNY_STREAM_LIBRARY_ID and BUNNY_STREAM_API_KEY."
    );
  }

  return { libraryId: libraryId.trim(), apiKey: apiKey.trim() };
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
  const { libraryId, apiKey } = getBunnyConfig();
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
        "Bunny Stream authentication failed. Check BUNNY_STREAM_API_KEY."
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
