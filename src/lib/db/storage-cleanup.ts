import { getAdminDataClient } from "@/lib/db/admin-client";

export function storagePathFromUrl(
  fileUrl: string,
  bucket: string
): string | null {
  const trimmed = fileUrl.trim();
  if (!trimmed) return null;

  const publicMarker = `/object/public/${bucket}/`;
  const publicIdx = trimmed.indexOf(publicMarker);
  if (publicIdx !== -1) {
    return decodeURIComponent(
      trimmed.slice(publicIdx + publicMarker.length).split("?")[0]
    );
  }

  const signedMarker = `/object/sign/${bucket}/`;
  const signedIdx = trimmed.indexOf(signedMarker);
  if (signedIdx !== -1) {
    return decodeURIComponent(
      trimmed.slice(signedIdx + signedMarker.length).split("?")[0]
    );
  }

  // Authenticated download URLs sometimes use /object/authenticated/
  const authMarker = `/object/authenticated/${bucket}/`;
  const authIdx = trimmed.indexOf(authMarker);
  if (authIdx !== -1) {
    return decodeURIComponent(
      trimmed.slice(authIdx + authMarker.length).split("?")[0]
    );
  }

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return trimmed.replace(/^\//, "");
  }

  return null;
}

/**
 * Soft-fail storage cleanup so related DB deletes can still succeed.
 */
export async function removeStorageObject(
  bucket: string,
  fileUrl: string | null | undefined
): Promise<void> {
  if (!fileUrl?.trim()) return;
  const path = storagePathFromUrl(fileUrl, bucket);
  if (!path) return;

  const supabase = await getAdminDataClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    console.error(`Failed to remove ${bucket} file:`, error.message);
  }
}

export async function removeStorageObjects(
  bucket: string,
  fileUrls: Array<string | null | undefined>
): Promise<void> {
  const paths = Array.from(
    new Set(
      fileUrls
        .map((url) => (url?.trim() ? storagePathFromUrl(url, bucket) : null))
        .filter((path): path is string => Boolean(path))
    )
  );
  if (paths.length === 0) return;

  const supabase = await getAdminDataClient();
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) {
    console.error(`Failed to remove ${bucket} files:`, error.message);
  }
}
