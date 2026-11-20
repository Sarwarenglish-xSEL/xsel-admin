export const FEEDBACK_AUDIO_MAX_BYTES = 25 * 1024 * 1024;
export const FEEDBACK_AUDIO_MAX_LABEL = "25 MB";

export const FEEDBACK_AUDIO_ACCEPT =
  "audio/mp4,audio/m4a,audio/x-m4a,audio/aac,audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/3gpp,audio/webm,audio/ogg,.m4a,.mp3,.wav,.aac,.ogg,.webm";

const FEEDBACK_AUDIO_MIME_TYPES = new Set([
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/3gpp",
  "audio/webm",
  "audio/ogg",
]);

export function formatFileSizeMb(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isFeedbackAudioPath(path: string | null | undefined): boolean {
  if (!path) return false;
  return /\.(m4a|mp3|wav|aac|3gp|caf|ogg|webm|mp4)$/i.test(path);
}

export function isAllowedFeedbackAudioFile(file: {
  name: string;
  type?: string | null;
}): boolean {
  const baseType = (file.type || "").split(";")[0].trim().toLowerCase();
  return (
    FEEDBACK_AUDIO_MIME_TYPES.has(baseType) || isFeedbackAudioPath(file.name)
  );
}

export function validateFeedbackAudioFile(file: {
  name: string;
  type?: string | null;
  size: number;
}): string | null {
  if (!file || file.size <= 0) {
    return "Please select an audio file for feedback.";
  }
  if (!isAllowedFeedbackAudioFile(file)) {
    return `Unsupported audio type${file.type ? ` (${file.type})` : ""}. Use m4a, mp3, wav, aac, webm, or ogg.`;
  }
  if (file.size > FEEDBACK_AUDIO_MAX_BYTES) {
    return `Audio file is too large (${formatFileSizeMb(file.size)}). Maximum allowed is ${FEEDBACK_AUDIO_MAX_LABEL}.`;
  }
  return null;
}

/** Map opaque Next / Storage failures to admin-readable messages. */
export function feedbackAudioErrorMessage(error: unknown): string {
  const raw =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : error &&
            typeof error === "object" &&
            "message" in error &&
            typeof (error as { message: unknown }).message === "string"
          ? (error as { message: string }).message
          : "";

  const lower = raw.toLowerCase();

  if (
    lower.includes("unexpected response") ||
    lower.includes("body exceeded") ||
    lower.includes("body size") ||
    lower.includes("payload too large") ||
    lower.includes("entity too large") ||
    lower.includes("413")
  ) {
    return `Audio upload failed: file is too large for the server (max ${FEEDBACK_AUDIO_MAX_LABEL}). Use a shorter recording or compress the file.`;
  }

  if (
    lower.includes("mime type") ||
    lower.includes("invalid mime") ||
    lower.includes("not allowed") ||
    lower.includes("unsupported")
  ) {
    return `Audio upload rejected by storage: ${raw || "file type not allowed"}. Use m4a, mp3, wav, aac, webm, or ogg.`;
  }

  if (lower.includes("bucket") || lower.includes("storage")) {
    return `Audio upload failed (storage): ${raw || "unknown storage error"}.`;
  }

  if (lower.includes("service_role") || lower.includes("service role")) {
    return "Audio upload failed: server storage key is missing. Check SUPABASE_SERVICE_ROLE_KEY.";
  }

  return raw.trim() || "Failed to upload feedback audio.";
}
