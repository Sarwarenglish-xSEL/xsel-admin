"use client";

import type { AssignmentSubmission } from "@/types/database";
import { Button } from "@/components/ui/button";

export function submissionTextFilename(submission: AssignmentSubmission) {
  const student = submission.user?.email?.split("@")[0] ?? "student";
  const assignment = submission.assignment?.title ?? "assignment";
  return `${student}-${assignment}-answer.txt`.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

export function downloadTextAnswer(submission: AssignmentSubmission) {
  const text = submission.text_answer?.trim() ?? "";
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = submissionTextFilename(submission);
  link.click();
  URL.revokeObjectURL(url);
}

export function DownloadAnswerButton({
  submission,
  size = "sm",
}: {
  submission: AssignmentSubmission;
  size?: "sm" | "md";
}) {
  return (
    <Button
      type="button"
      size={size}
      variant="outline"
      onClick={() => downloadTextAnswer(submission)}
    >
      Download .txt
    </Button>
  );
}
