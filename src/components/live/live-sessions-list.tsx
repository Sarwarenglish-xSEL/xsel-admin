"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { updateLessonAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageEmpty } from "@/components/page-states";

type LiveLesson = {
  id: string;
  title: string;
  live_meeting_url: string | null;
  live_start_time: string | null;
  live_end_time: string | null;
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
        description="Schedule live lessons in course editor."
      />
    );
  }

  return (
    <div className="grid gap-4">
      {lessons.map((lesson) => (
        <LiveSessionCard key={lesson.id} lesson={lesson} onSaved={() => router.refresh()} />
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
  const [loading, setLoading] = useState(false);

  const courseId = lesson.chapter?.course?.id;

  async function save() {
    if (!courseId) return;
    setLoading(true);
    try {
      await updateLessonAction(courseId, lesson.id, {
        live_meeting_url: meetingUrl || null,
        live_start_time: startTime ? new Date(startTime).toISOString() : null,
        live_end_time: endTime ? new Date(endTime).toISOString() : null,
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-lg">{lesson.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {lesson.chapter?.course?.title} · {lesson.chapter?.title}
          </p>
        </div>
        <div className="flex gap-2">
          {isLiveNow && <Badge className="bg-red-500">Live Now</Badge>}
          <Badge variant="outline" className="capitalize">
            {lesson.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Meeting URL</label>
              <Input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Start</label>
                <Input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End</label>
                <Input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={loading} size="sm">
                {loading ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {lesson.live_start_time && (
                <span>
                  {format(new Date(lesson.live_start_time), "MMM d, yyyy h:mm a")}
                  {lesson.live_end_time &&
                    ` – ${format(new Date(lesson.live_end_time), "h:mm a")}`}
                </span>
              )}
              {lesson.live_meeting_url && (
                <a
                  href={lesson.live_meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-4 text-brand hover:underline"
                >
                  Join meeting
                </a>
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
