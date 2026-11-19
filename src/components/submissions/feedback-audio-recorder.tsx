"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const MAX_RECORDING_MS = 5 * 60 * 1000;

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

function extensionForMime(mimeType: string) {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export function FeedbackAudioRecorder({
  disabled = false,
  onRecordingReady,
  onRecordingCleared,
  onRecordingStateChange,
}: {
  disabled?: boolean;
  onRecordingReady: (file: File) => void;
  onRecordingCleared: () => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
}) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionRef = useRef(0);
  const startingRef = useRef(false);
  const mountedRef = useRef(true);

  const onReadyRef = useRef(onRecordingReady);
  const onClearedRef = useRef(onRecordingCleared);
  const onStateRef = useRef(onRecordingStateChange);

  const [supported, setSupported] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [recordedLabel, setRecordedLabel] = useState<string | null>(null);

  useEffect(() => {
    onReadyRef.current = onRecordingReady;
    onClearedRef.current = onRecordingCleared;
    onStateRef.current = onRecordingStateChange;
  }, [onRecordingReady, onRecordingCleared, onRecordingStateChange]);

  const clearTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
  };

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const revokePreview = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      } catch {
        // ignore
      }
    }
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  const setRecordingState = (next: boolean) => {
    setIsRecording(next);
    onStateRef.current?.(next);
  };

  const detachRecorder = () => {
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    if (!recorder) return;

    recorder.ondataavailable = null;
    recorder.onerror = null;
    recorder.onstop = null;

    if (recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // ignore
      }
    }
  };

  const hardReset = (notifyClear: boolean) => {
    sessionRef.current += 1;
    clearTimers();
    detachRecorder();
    chunksRef.current = [];
    stopTracks();
    revokePreview();
    setElapsedMs(0);
    setPreviewUrl(null);
    setRecordedLabel(null);
    setRecordingState(false);
    setIsPreparing(false);

    if (notifyClear) {
      onClearedRef.current();
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    setSupported(
      typeof window !== "undefined" &&
        typeof navigator !== "undefined" &&
        Boolean(navigator.mediaDevices?.getUserMedia) &&
        typeof MediaRecorder !== "undefined"
    );

    return () => {
      mountedRef.current = false;
      hardReset(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount/unmount only
  }, []);

  const stopRecording = () => {
    clearTimers();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        setRecordingState(false);
      }
      return;
    }
    setRecordingState(false);
  };

  const startRecording = async () => {
    if (disabled || isRecording || isPreparing || startingRef.current) return;

    startingRef.current = true;
    setIsPreparing(true);

    const hadPreviousTake = Boolean(previewUrlRef.current || recordedLabel);
    // Drop previous take first so Re-record never keeps old audio/file
    hardReset(true);

    if (hadPreviousTake) {
      await waitForPaint();
    }

    const session = sessionRef.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current || session !== sessionRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (session !== sessionRef.current) return;
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stopTracks();
        if (!mountedRef.current || session !== sessionRef.current) {
          chunksRef.current = [];
          return;
        }

        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        setRecordingState(false);

        if (blob.size === 0) {
          toast.error("Recording was empty. Please try again.");
          return;
        }

        // Ensure any leftover preview URL is gone before attaching the new take
        revokePreview();

        const ext = extensionForMime(type);
        const file = new File(
          [blob],
          `feedback-recording-${Date.now()}.${ext}`,
          { type: type.split(";")[0] || "audio/webm" }
        );
        const url = URL.createObjectURL(blob);
        previewUrlRef.current = url;
        setPreviewKey((key) => key + 1);
        setPreviewUrl(url);
        setRecordedLabel(file.name);
        onReadyRef.current(file);
      };

      recorder.start(250);
      setIsPreparing(false);
      setRecordingState(true);
      setElapsedMs(0);

      const startedAt = Date.now();
      timerRef.current = setInterval(() => {
        if (session !== sessionRef.current) return;
        setElapsedMs(Date.now() - startedAt);
      }, 200);

      autoStopRef.current = setTimeout(() => {
        if (session !== sessionRef.current) return;
        stopRecording();
        toast.message("Recording stopped at 5 minutes.");
      }, MAX_RECORDING_MS);
    } catch (e) {
      if (session === sessionRef.current) {
        stopTracks();
        setRecordingState(false);
        setIsPreparing(false);
        toast.error(
          e instanceof Error
            ? e.message
            : "Microphone permission is required to record feedback."
        );
      }
    } finally {
      startingRef.current = false;
      if (session === sessionRef.current && mountedRef.current) {
        setIsPreparing(false);
      }
    }
  };

  if (!supported) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Live recording is not supported in this browser. Upload an audio file
        instead.
      </p>
    );
  }

  const busy = disabled || isPreparing;
  const hasTake = Boolean(previewUrl);

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {isRecording ? (
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={disabled}
            onClick={stopRecording}
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            Stop
          </Button>
        ) : hasTake ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => hardReset(true)}
          >
            <Trash2 className="h-4 w-4" />
            Clear recording
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={startRecording}
          >
            <Mic className="h-4 w-4" />
            {isPreparing ? "Starting…" : "Record voice"}
          </Button>
        )}

        <span
          className={`text-xs font-medium ${
            isRecording ? "text-danger" : "text-gray-500"
          }`}
        >
          {isPreparing
            ? "Preparing microphone…"
            : isRecording
              ? `Recording… ${formatDuration(elapsedMs)}`
              : hasTake
                ? `Recorded ${formatDuration(elapsedMs)}`
                : "Max 5 minutes"}
        </span>
      </div>

      {isRecording ? (
        <div className="flex items-center gap-2 text-xs text-danger">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-danger" />
          Speak now — your voice is being recorded
        </div>
      ) : null}

      {previewUrl ? (
        <div className="space-y-1.5">
          <audio
            key={`${previewKey}-${previewUrl}`}
            ref={audioRef}
            controls
            preload="metadata"
            className="w-full"
            src={previewUrl}
          >
            Your browser does not support audio playback.
          </audio>
          {recordedLabel ? (
            <p className="text-xs text-gray-600">
              Ready to upload: {recordedLabel}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
