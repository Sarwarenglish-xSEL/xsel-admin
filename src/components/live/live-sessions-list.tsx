"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarClock, Radio } from "lucide-react";
import { toast } from "sonner";
import { updateLessonAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/layout/page-header";
import { PageEmpty } from "@/components/page-states";

type LiveLesson = {
  id: string;
  title: string;
  live_meeting_url: string | null;
  live_start_time: string | null;
  live_end_time: string | null;
  video_url?: string | null;
  live_class_status?: string | null;
  status: string;
  chapter?: {
    title: string;
    course?: { id: string; title: string };
  };
};

export function LiveSessionsList({ lessons }: { lessons: LiveLesson[] }) {
  const router = useRouter();

  if (lessons.length === 0) {
    return (
      <PageEmpty
        title="No upcoming live sessions"
        description="Schedule live lessons in the course editor."
      />
    );
  }

  return (
    <div className="grid gap-4">
      {lessons.map((lesson) => (
        <LiveSessionCard
          key={lesson.id}
          lesson={lesson}
          onSaved={() => router.refresh()}
        />
      ))}
    </div>
  );
}

function LiveSessionCard({
  lesson,
  onSaved,
}: {
  lesson: LiveLesson;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState(lesson.live_meeting_url ?? "");
  const [startTime, setStartTime] = useState(
    lesson.live_start_time?.slice(0, 16) ?? ""
  );
  const [endTime, setEndTime] = useState(
    lesson.live_end_time?.slice(0, 16) ?? ""
  );
  const [liveClassStatus, setLiveClassStatus] = useState(
    lesson.live_class_status ?? "pending"
  );
  const [videoUrl, setVideoUrl] = useState(lesson.video_url ?? "");
  const [loading, setLoading] = useState(false);

  const courseId = lesson.chapter?.course?.id;

  async function save() {
    if (!courseId) return;
    setLoading(true);
    try {
      const trimmed = liveClassStatus.trim();
      const normalizedLiveClassStatus = trimmed ? trimmed.toLowerCase() : null;
      const lessonStatusCompleted = lesson.status?.toLowerCase() === "completed";
      const isCompleted =
        normalizedLiveClassStatus === "completed" ||
        lessonStatusCompleted;
      const liveClassStatusForSave =
        normalizedLiveClassStatus ?? (lessonStatusCompleted ? "completed" : null);

      await updateLessonAction(courseId, lesson.id, {
        live_class_status: liveClassStatusForSave,
        ...(isCompleted
          ? { video_url: videoUrl || null }
          : {
              live_meeting_url: meetingUrl || null,
              live_start_time: startTime ? new Date(startTime).toISOString() : null,
              live_end_time: endTime ? new Date(endTime).toISOString() : null,
            }),
      });
      toast.success("Live session updated");
      setEditing(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  const isLiveNow =
    lesson.live_start_time &&
    lesson.live_end_time &&
    new Date(lesson.live_start_time) <= new Date() &&
    new Date(lesson.live_end_time) >= new Date();

  const isCompleted =
    (liveClassStatus || "").trim().toLowerCase() === "completed" ||
    lesson.status?.toLowerCase() === "completed";

  return (
    <Card className="overflow-hidden border-brand/10 shadow-sm">
      <SectionHeader
        title={lesson.title}
        description={`${lesson.chapter?.course?.title ?? "Course"} · ${lesson.chapter?.title ?? "Chapter"}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isLiveNow && (
              <Badge className="bg-danger text-white hover:bg-danger">Live Now</Badge>
            )}
            <Badge variant="outline" className="capitalize">
              {lesson.status}
            </Badge>
            <Badge
              variant={
                (lesson.live_class_status ?? "pending").toLowerCase() === "completed"
                  ? "default"
                  : "outline"
              }
              className="capitalize"
            >
              {lesson.live_class_status ?? "pending"}
            </Badge>
          </div>
        }
      />
      <CardContent className="p-5">
        {editing ? (
          <div className="space-y-4">
            <div>
              <Label>Live class status</Label>
              <Select
                value={liveClassStatus}
                onChange={(e) => setLiveClassStatus(e.target.value)}
                className="max-w-md"
              >
                <option value="pending">pending</option>
                <option value="live">live</option>
                <option value="completed">completed</option>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                When set to <span className="font-medium">completed</span>, the form
                will switch to upload <span className="font-medium">video_url</span>.
              </p>
            </div>

            {isCompleted ? (
              <div>
                <Label>Video URL</Label>
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="Bunny video ID or URL"
                />
              </div>
            ) : (
              <>
                <div>
                  <Label>Meeting URL</Label>
                  <Input
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Start</Label>
                    <Input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>End</Label>
                    <Input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2">
              <Button onClick={save} disabled={loading} size="sm">
                {loading ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2 text-sm text-gray-600">
              <p className="inline-flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-brand" />
                {lesson.live_start_time ? (
                  <span>
                    {format(new Date(lesson.live_start_time), "MMM d, yyyy h:mm a")}
                    {lesson.live_end_time &&
                      ` – ${format(new Date(lesson.live_end_time), "h:mm a")}`}
                  </span>
                ) : (
                  <span>No schedule set</span>
                )}
              </p>
              {isCompleted ? (
                <div className="inline-flex items-center gap-2 font-medium text-brand">
                  <Radio className="h-4 w-4" />
                  {lesson.video_url ? "Video uploaded" : "Video pending"}
                </div>
              ) : (
                lesson.live_meeting_url && (
                  <a
                    href={lesson.live_meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-medium text-brand hover:underline"
                  >
                    <Radio className="h-4 w-4" />
                    Join meeting
                  </a>
                )
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Quick Edit
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
