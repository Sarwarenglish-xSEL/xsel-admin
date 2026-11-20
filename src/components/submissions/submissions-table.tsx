"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Eye, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AssignmentSubmission } from "@/types/database";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  clearSubmissionFeedbackAudioAction,
  deleteAssignmentSubmissionAction,
  getAssignmentSubmissionDetailAction,
  getSubmissionFileUrlAction,
  updateAssignmentSubmissionAction,
  uploadSubmissionFeedbackAudioAction,
} from "@/app/actions";
import { DownloadAnswerButton } from "@/components/submissions/submission-answer-actions";
import { FeedbackAudioRecorder } from "@/components/submissions/feedback-audio-recorder";
import {
  FEEDBACK_AUDIO_ACCEPT,
  FEEDBACK_AUDIO_MAX_LABEL,
  feedbackAudioErrorMessage,
  formatFileSizeMb,
  validateFeedbackAudioFile,
} from "@/lib/feedback-audio";

function hasAttachment(submission: AssignmentSubmission) {
  return Boolean(submission.file_url?.trim());
}

function hasTextAnswer(submission: AssignmentSubmission) {
  return Boolean(submission.text_answer?.trim());
}

function isAudioPath(path: string | null | undefined) {
  if (!path) return false;
  return /\.(m4a|mp3|wav|aac|3gp|caf|ogg|webm|mp4)$/i.test(path);
}

function SubmissionAudioPlayer({
  fileUrl,
  label = "Play audio",
}: {
  fileUrl: string;
  label?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setError(null);
    setLoading(true);

    getSubmissionFileUrlAction(fileUrl)
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load audio");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading {label.toLowerCase()}...</p>;
  }

  if (error) {
    return <p className="text-sm text-danger">{error}</p>;
  }

  if (!src) return null;

  return (
    <audio controls preload="metadata" className="mt-1.5 w-full" src={src}>
      Your browser does not support audio playback.
    </audio>
  );
}

function ViewSubmissionLink({ fileUrl }: { fileUrl: string }) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const url = await getSubmissionFileUrlAction(fileUrl);
          window.open(url, "_blank", "noopener,noreferrer");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Failed to open submission");
        } finally {
          setLoading(false);
        }
      }}
      className="text-sm font-medium text-brand hover:underline disabled:opacity-50"
    >
      {loading ? "Opening..." : "View attachment"}
    </button>
  );
}

function EditSubmissionDialog({
  submission,
  open,
  onOpenChange,
}: {
  submission: AssignmentSubmission;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [detail, setDetail] = useState<AssignmentSubmission | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [marks, setMarks] = useState(submission.obtained_marks?.toString() ?? "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [feedbackAudioUrl, setFeedbackAudioUrl] = useState(
    submission.feedback_audio_url ?? null
  );
  const [feedbackAudioFile, setFeedbackAudioFile] = useState<File | null>(null);
  const [feedbackAudioSource, setFeedbackAudioSource] = useState<
    "upload" | "record" | null
  >(null);
  const [recorderKey, setRecorderKey] = useState(0);
  const [isRecordingFeedback, setIsRecordingFeedback] = useState(false);
  const [removeFeedbackAudio, setRemoveFeedbackAudio] = useState(false);
  const [loading, setLoading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  const clearUploadSelection = () => {
    setFeedbackAudioFile(null);
    setFeedbackAudioSource(null);
    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!open) {
      setDetail(null);
      setDetailError(null);
      setFeedbackAudioFile(null);
      setFeedbackAudioSource(null);
      setIsRecordingFeedback(false);
      setRemoveFeedbackAudio(false);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
      return;
    }

    setMarks(submission.obtained_marks?.toString() ?? "");
    setFeedback(submission.feedback ?? "");
    setFeedbackAudioUrl(submission.feedback_audio_url ?? null);
    setFeedbackAudioFile(null);
    setFeedbackAudioSource(null);
    setIsRecordingFeedback(false);
    setRemoveFeedbackAudio(false);
    setRecorderKey((key) => key + 1);

    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);

    getAssignmentSubmissionDetailAction(submission.id)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        if (data) {
          setMarks(data.obtained_marks?.toString() ?? "");
          setFeedback(data.feedback ?? "");
          setFeedbackAudioUrl(data.feedback_audio_url ?? null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setDetailError(e instanceof Error ? e.message : "Failed to load submission");
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, submission]);

  const view = detail ?? submission;
  const maxMarks = view.assignment?.max_marks;
  const isAudioAssignment =
    view.assignment?.type === "audio" || isAudioPath(view.file_url);
  const showExistingFeedbackAudio =
    Boolean(feedbackAudioUrl) && !removeFeedbackAudio && !feedbackAudioFile;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-2xl">
      <DialogContent onClose={() => onOpenChange(false)} className="w-full">
        <DialogHeader>
          <DialogTitle>View Submission</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {detailLoading && !detail ? (
            <p className="text-sm text-gray-500">Loading submission...</p>
          ) : detailError ? (
            <p className="text-sm text-danger">{detailError}</p>
          ) : (
            <>
              <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <p className="text-xs text-gray-500">Student</p>
                <p className="font-medium text-gray-900">
                  {view.user?.email ?? view.user_id}
                </p>
                <p className="mt-2 text-xs text-gray-500">Assignment</p>
                <p className="font-medium text-gray-900">
                  {view.assignment?.title ?? view.assignment_id}
                  {isAudioAssignment ? (
                    <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                      Audio
                    </span>
                  ) : null}
                </p>
              </div>

              {hasAttachment(view) && (
                <div>
                  <Label className="text-xs uppercase tracking-wide text-gray-500">
                    {isAudioAssignment ? "Student audio" : "Attachment"}
                  </Label>
                  <div className="mt-1.5 space-y-2">
                    {isAudioPath(view.file_url) ? (
                      <SubmissionAudioPlayer
                        fileUrl={view.file_url!}
                        label="Student audio"
                      />
                    ) : null}
                    <ViewSubmissionLink fileUrl={view.file_url!} />
                  </div>
                </div>
              )}

              {/* Student written answer is view-only — admin cannot edit it. */}
              {hasTextAnswer(view) ? (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>Student written answer</Label>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/submissions/${view.id}/answer`}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-200 bg-surface px-3 text-xs font-medium text-gray-700 transition-colors hover:bg-surface-muted"
                      >
                        Open full answer
                      </Link>
                      <DownloadAnswerButton submission={view} />
                    </div>
                  </div>
                  <div className="mt-1.5 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
                    {view.text_answer}
                  </div>
                </div>
              ) : null}
            </>
          )}

          <div>
            <Label>
              Marks{maxMarks != null ? ` (max ${maxMarks})` : ""}
            </Label>
            <Input
              type="number"
              min={0}
              max={maxMarks ?? undefined}
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
            />
          </div>
          <div>
            <Label>{isAudioAssignment ? "Written feedback" : "Feedback"}</Label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Optional written notes for the student"
            />
          </div>
          {isAudioAssignment ? (
            <div>
              <Label>Audio feedback</Label>
              <p className="mt-1 text-xs text-gray-500">
                Optional voice response for the student. Choose either live
                record or file upload — not both. Max 25 MB / 5 min.
              </p>

              {showExistingFeedbackAudio ? (
                <div className="mt-2 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <SubmissionAudioPlayer
                    fileUrl={feedbackAudioUrl!}
                    label="Feedback audio"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRemoveFeedbackAudio(true);
                      clearUploadSelection();
                      setRecorderKey((key) => key + 1);
                    }}
                  >
                    Remove audio feedback
                  </Button>
                </div>
              ) : null}

              <div className="mt-3 space-y-3">
                {removeFeedbackAudio && !feedbackAudioFile ? (
                  <p className="text-xs text-amber-700">
                    Existing audio feedback will be removed on save.
                  </p>
                ) : null}

                {feedbackAudioSource !== "upload" ? (
                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">
                      Record live
                    </p>
                    <FeedbackAudioRecorder
                      key={recorderKey}
                      disabled={loading || detailLoading}
                      onRecordingStateChange={setIsRecordingFeedback}
                      onRecordingReady={(file) => {
                        if (uploadInputRef.current) {
                          uploadInputRef.current.value = "";
                        }
                        setFeedbackAudioFile(file);
                        setFeedbackAudioSource("record");
                        setRemoveFeedbackAudio(false);
                      }}
                      onRecordingCleared={() => {
                        setFeedbackAudioFile(null);
                        setFeedbackAudioSource(null);
                      }}
                    />
                  </div>
                ) : null}

                {!feedbackAudioSource && !isRecordingFeedback ? (
                  <div className="relative flex items-center gap-3">
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-xs text-gray-400">or</span>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>
                ) : null}

                {feedbackAudioSource !== "record" && !isRecordingFeedback ? (
                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">
                      Upload audio file
                    </p>
                    <Input
                      ref={uploadInputRef}
                      type="file"
                      accept={FEEDBACK_AUDIO_ACCEPT}
                      disabled={loading || detailLoading}
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        if (!file) {
                          clearUploadSelection();
                          return;
                        }
                        const validationError = validateFeedbackAudioFile(file);
                        if (validationError) {
                          toast.error(validationError);
                          e.target.value = "";
                          clearUploadSelection();
                          return;
                        }
                        setRecorderKey((key) => key + 1);
                        setFeedbackAudioFile(file);
                        setFeedbackAudioSource("upload");
                        setRemoveFeedbackAudio(false);
                      }}
                    />
                    <p className="mt-1.5 text-xs text-gray-500">
                      Allowed: m4a, mp3, wav, aac, webm, ogg — Max size{" "}
                      {FEEDBACK_AUDIO_MAX_LABEL}
                    </p>
                    {feedbackAudioFile && feedbackAudioSource === "upload" ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <p className="text-xs text-gray-600">
                          Selected: {feedbackAudioFile.name} (
                          {formatFileSizeMb(feedbackAudioFile.size)})
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={loading || detailLoading}
                          onClick={clearUploadSelection}
                        >
                          Clear file
                        </Button>
                      </div>
                    ) : showExistingFeedbackAudio ? (
                      <p className="mt-1 text-xs text-gray-500">
                        Choose a new file to replace the current audio
                        feedback.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          <Button
            disabled={loading || detailLoading || isRecordingFeedback}
            onClick={async () => {
              if (isRecordingFeedback) {
                toast.error("Stop the recording before saving");
                return;
              }
              setLoading(true);
              try {
                const obtainedMarks =
                  marks.trim() === "" ? null : parseInt(marks, 10);
                if (obtainedMarks != null && Number.isNaN(obtainedMarks)) {
                  toast.error("Enter a valid marks value");
                  return;
                }
                if (
                  obtainedMarks != null &&
                  maxMarks != null &&
                  obtainedMarks > maxMarks
                ) {
                  toast.error(`Marks cannot exceed ${maxMarks}`);
                  return;
                }

                if (isAudioAssignment) {
                  if (feedbackAudioFile) {
                    const precheck = validateFeedbackAudioFile(feedbackAudioFile);
                    if (precheck) {
                      toast.error(precheck);
                      return;
                    }
                    const formData = new FormData();
                    formData.set("submissionId", submission.id);
                    formData.set("file", feedbackAudioFile);
                    const uploadResult =
                      await uploadSubmissionFeedbackAudioAction(formData);
                    if (!uploadResult.ok) {
                      toast.error(uploadResult.message);
                      return;
                    }
                  } else if (removeFeedbackAudio && feedbackAudioUrl) {
                    await clearSubmissionFeedbackAudioAction(submission.id);
                  }
                }

                await updateAssignmentSubmissionAction(submission.id, {
                  obtained_marks: obtainedMarks,
                  feedback: feedback.trim() || null,
                });
                toast.success("Submission updated");
                onOpenChange(false);
                router.refresh();
              } catch (e) {
                toast.error(
                  feedbackAudioFile
                    ? feedbackAudioErrorMessage(e)
                    : e instanceof Error
                      ? e.message
                      : "Failed to save submission"
                );
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SubmissionActions({ submission }: { submission: AssignmentSubmission }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  return (
    <>
      <DropdownMenu
        trigger={
          <Button variant="ghost" size="icon" disabled={deleting}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        }
      >
        <DropdownMenuItem onClick={() => setEditOpen(true)}>
          <Eye className="h-4 w-4" /> View
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-danger hover:bg-danger/5"
          disabled={deleting}
          onClick={async () => {
            const label =
              submission.user?.email ??
              submission.assignment?.title ??
              "this submission";
            if (
              !confirm(
                `Delete submission from ${label}? This permanently removes the submission and cannot be undone.`
              )
            ) {
              return;
            }

            setDeleting(true);
            try {
              await deleteAssignmentSubmissionAction(submission.id);
              toast.success("Submission deleted");
              router.refresh();
            } catch (e) {
              toast.error(
                e instanceof Error ? e.message : "Failed to delete submission"
              );
            } finally {
              setDeleting(false);
            }
          }}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenu>
      <EditSubmissionDialog
        submission={submission}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}

const columns: ColumnDef<AssignmentSubmission>[] = [
  {
    accessorKey: "user",
    header: "Student",
    cell: ({ row }) => row.original.user?.email ?? row.original.user_id,
  },
  {
    id: "assignment",
    header: "Assignment",
    cell: ({ row }) => {
      const a = row.original.assignment;
      return a?.title ?? row.original.assignment_id;
    },
  },
  {
    accessorKey: "obtained_marks",
    header: "Marks",
    cell: ({ row }) => row.original.obtained_marks ?? "—",
  },
  {
    accessorKey: "submitted_at",
    header: "Submitted",
    cell: ({ row }) =>
      format(new Date(row.original.submitted_at), "MMM d, yyyy"),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <SubmissionActions submission={row.original} />,
  },
];

export function SubmissionsTable({
  submissions,
}: {
  submissions: AssignmentSubmission[];
}) {
  return <DataTable columns={columns} data={submissions} pageSize={20} hidePagination />;
}
