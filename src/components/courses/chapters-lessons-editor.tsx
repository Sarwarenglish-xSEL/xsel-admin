"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  FileQuestion,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import type { CourseChapter, CourseLesson } from "@/types/database";
import {
  createChapterAction,
  updateChapterAction,
  deleteChapterAction,
  createLessonAction,
  updateLessonAction,
  deleteLessonAction,
  reorderChaptersAction,
  reorderLessonsAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function ChaptersLessonsEditor({
  courseId,
  chapters: initialChapters,
}: {
  courseId: string;
  chapters: CourseChapter[];
}) {
  const [chapters] = useState(initialChapters);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [lessonDialog, setLessonDialog] = useState<{
    chapterId: string;
    lesson?: CourseLesson;
  } | null>(null);
  const router = useRouter();

  async function addChapter() {
    if (!newChapterTitle.trim()) return;
    try {
      await createChapterAction(courseId, newChapterTitle, chapters.length);
      toast.success("Chapter added");
      setNewChapterTitle("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function moveChapter(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= chapters.length) return;
    const items = chapters.map((ch, i) => ({
      id: ch.id,
      sort_order: i === index ? newIndex : i === newIndex ? index : i,
    }));
    try {
      await reorderChaptersAction(courseId, items);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reorder");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Input
          placeholder="New chapter title"
          value={newChapterTitle}
          onChange={(e) => setNewChapterTitle(e.target.value)}
        />
        <Button onClick={addChapter} className="shrink-0">
          <Plus className="mr-1 h-4 w-4" />
          Add Chapter
        </Button>
      </div>

      {chapters.length === 0 ? (
        <p className="text-muted-foreground">No chapters yet. Add one above.</p>
      ) : (
        chapters.map((chapter, chapterIndex) => (
          <div key={chapter.id} className="rounded-lg border p-4">
            <div className="mb-3 flex items-center gap-2">
              <Input
                defaultValue={chapter.title}
                onBlur={async (e) => {
                  if (e.target.value !== chapter.title) {
                    try {
                      await updateChapterAction(courseId, chapter.id, {
                        title: e.target.value,
                      });
                      router.refresh();
                    } catch {
                      toast.error("Failed to update chapter");
                    }
                  }
                }}
                className="font-medium"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => moveChapter(chapterIndex, "up")}
                disabled={chapterIndex === 0}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => moveChapter(chapterIndex, "down")}
                disabled={chapterIndex === chapters.length - 1}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  if (!confirm("Delete this chapter and all its lessons?")) return;
                  try {
                    await deleteChapterAction(courseId, chapter.id);
                    toast.success("Chapter deleted");
                    router.refresh();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  }
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            <div className="space-y-2 pl-4">
              {(chapter.lessons ?? []).map((lesson, lessonIndex) => (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{lesson.title}</span>
                    <Badge variant="outline" className="capitalize text-xs">
                      {lesson.lesson_type}
                    </Badge>
                    <Badge
                      variant={lesson.status === "published" ? "success" : "outline"}
                      className="text-xs capitalize"
                    >
                      {lesson.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {lesson.lesson_type === "quiz" && (
                      <Link
                        href={`/courses/${courseId}/lessons/${lesson.id}/quiz`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
                      >
                        <FileQuestion className="h-4 w-4" />
                      </Link>
                    )}
                    {lesson.lesson_type === "assignment" && (
                      <Link
                        href={`/courses/${courseId}/lessons/${lesson.id}/assignment`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
                      >
                        <ClipboardList className="h-4 w-4" />
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setLessonDialog({ chapterId: chapter.id, lesson })
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        const lessons = chapter.lessons ?? [];
                        const newIndex =
                          lessonIndex > 0 ? lessonIndex - 1 : lessonIndex + 1;
                        if (newIndex < 0 || newIndex >= lessons.length) return;
                        const items = lessons.map((l, i) => ({
                          id: l.id,
                          sort_order:
                            i === lessonIndex
                              ? newIndex
                              : i === newIndex
                                ? lessonIndex
                                : i,
                        }));
                        try {
                          await reorderLessonsAction(courseId, items);
                          router.refresh();
                        } catch {
                          toast.error("Failed to reorder");
                        }
                      }}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        if (!confirm("Delete this lesson?")) return;
                        try {
                          await deleteLessonAction(courseId, lesson.id);
                          toast.success("Lesson deleted");
                          router.refresh();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Failed");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLessonDialog({ chapterId: chapter.id })}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Lesson
              </Button>
            </div>
          </div>
        ))
      )}

      {lessonDialog && (
        <LessonDialog
          courseId={courseId}
          chapterId={lessonDialog.chapterId}
          lesson={lessonDialog.lesson}
          sortOrder={
            chapters
              .find((c) => c.id === lessonDialog.chapterId)
              ?.lessons?.length ?? 0
          }
          onClose={() => setLessonDialog(null)}
        />
      )}
    </div>
  );
}

function LessonDialog({
  courseId,
  chapterId,
  lesson,
  sortOrder,
  onClose,
}: {
  courseId: string;
  chapterId: string;
  lesson?: CourseLesson;
  sortOrder: number;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [lessonType, setLessonType] = useState<CourseLesson["lesson_type"]>(
    lesson?.lesson_type ?? "video"
  );
  const [videoUrl, setVideoUrl] = useState(lesson?.video_url ?? "");
  const [durationSeconds, setDurationSeconds] = useState(
    lesson?.duration_seconds?.toString() ?? ""
  );
  const [liveMeetingUrl, setLiveMeetingUrl] = useState(
    lesson?.live_meeting_url ?? ""
  );
  const [liveStart, setLiveStart] = useState(
    lesson?.live_start_time?.slice(0, 16) ?? ""
  );
  const [liveEnd, setLiveEnd] = useState(
    lesson?.live_end_time?.slice(0, 16) ?? ""
  );
  const [status, setStatus] = useState<CourseLesson["status"]>(
    lesson?.status ?? "draft"
  );
  const [goLive, setGoLive] = useState(
    lesson?.status === "published" &&
      !!lesson?.live_start_time &&
      !!lesson?.live_end_time
  );
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function save() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setLoading(true);
    const payload = {
      chapter_id: chapterId,
      title,
      lesson_type: lessonType,
      video_url: lessonType === "video" ? videoUrl || null : null,
      duration_seconds:
        lessonType === "video" && durationSeconds
          ? parseInt(durationSeconds, 10)
          : null,
      live_meeting_url: lessonType === "live" ? liveMeetingUrl || null : null,
      live_start_time:
        lessonType === "live" && liveStart
          ? new Date(liveStart).toISOString()
          : null,
      live_end_time:
        lessonType === "live" && liveEnd
          ? new Date(liveEnd).toISOString()
          : null,
      sort_order: lesson?.sort_order ?? sortOrder,
      status:
        lessonType === "live" && goLive
          ? ("published" as const)
          : status,
    };
    try {
      if (lesson) {
        await updateLessonAction(courseId, lesson.id, payload);
        toast.success("Lesson updated");
      } else {
        await createLessonAction(courseId, payload);
        toast.success("Lesson created");
      }
      onClose();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{lesson ? "Edit Lesson" : "Add Lesson"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={lessonType} onChange={(e) => setLessonType(e.target.value as CourseLesson["lesson_type"])}>
              <option value="video">Video</option>
              <option value="live">Live</option>
              <option value="quiz">Quiz</option>
              <option value="assignment">Assignment</option>
            </Select>
          </div>
          {lessonType === "video" && (
            <>
              <div>
                <Label>Video URL</Label>
                <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
              </div>
              <div>
                <Label>Duration (seconds)</Label>
                <Input
                  type="number"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(e.target.value)}
                />
              </div>
            </>
          )}
          {lessonType === "live" && (
            <>
              <div>
                <Label>Meeting URL</Label>
                <Input
                  value={liveMeetingUrl}
                  onChange={(e) => setLiveMeetingUrl(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="datetime-local"
                    value={liveStart}
                    onChange={(e) => setLiveStart(e.target.value)}
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="datetime-local"
                    value={liveEnd}
                    onChange={(e) => setLiveEnd(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={goLive} onCheckedChange={setGoLive} />
                <Label>Go Live (publish during session window)</Label>
              </div>
            </>
          )}
          {lessonType !== "live" && (
            <div>
              <Label>Status</Label>
              <Select value={status} onChange={(e) => setStatus(e.target.value as CourseLesson["status"])}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </Select>
            </div>
          )}
          <Button onClick={save} disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save Lesson"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
