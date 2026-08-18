"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileQuestion,
  Layers,
  Pencil,
  Plus,
  Radio,
  Trash2,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import type {
  AssignmentType,
  CourseChapter,
  CourseLesson,
  LessonType,
  QuizOption,
  QuizType,
} from "@/types/database";
import {
  createChapterAction,
  updateChapterAction,
  deleteChapterAction,
  createLessonAction,
  updateLessonAction,
  deleteLessonAction,
  reorderChaptersAction,
  reorderLessonsAction,
  createQuizAction,
  createAssignmentAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function LessonTypeIcon({ type }: { type: LessonType }) {
  const className = "h-3.5 w-3.5";
  if (type === "video") return <Video className={className} />;
  if (type === "live") return <Radio className={className} />;
  if (type === "quiz") return <FileQuestion className={className} />;
  return <ClipboardList className={className} />;
}

export function ChaptersLessonsEditor({
  batchId,
  courseId,
  chapters: initialChapters,
}: {
  batchId: string;
  courseId: string;
  chapters: CourseChapter[];
}) {
  const [chapters, setChapters] = useState(initialChapters);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [lessonDialog, setLessonDialog] = useState<{
    chapterId: string;
    lesson?: CourseLesson;
  } | null>(null);
  const [quizDialog, setQuizDialog] = useState<{
    lessonId: string;
    lessonTitle: string;
    hasVideoQuiz: boolean;
  } | null>(null);
  const [assignmentDialog, setAssignmentDialog] = useState<{
    lessonId: string;
    lessonTitle: string;
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    setChapters(initialChapters);
  }, [initialChapters]);

  function chapterSortOrder(chapterId: string) {
    return chapters.find((c) => c.id === chapterId)?.lessons?.length ?? 0;
  }

  async function addChapter() {
    if (!newChapterTitle.trim()) return;
    try {
      const chapter = await createChapterAction(
        batchId,
        courseId,
        newChapterTitle,
        chapters.length
      );
      setChapters((prev) => [...prev, { ...chapter, lessons: [] }]);
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
      await reorderChaptersAction(batchId, items);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reorder");
    }
  }

  async function moveLesson(
    chapter: CourseChapter,
    lessonIndex: number,
    direction: "up" | "down"
  ) {
    const lessons = chapter.lessons ?? [];
    const newIndex = direction === "up" ? lessonIndex - 1 : lessonIndex + 1;
    if (newIndex < 0 || newIndex >= lessons.length) return;
    const items = lessons.map((l, i) => ({
      id: l.id,
      sort_order:
        i === lessonIndex ? newIndex : i === newIndex ? lessonIndex : i,
    }));
    try {
      await reorderLessonsAction(batchId, items);
      router.refresh();
    } catch {
      toast.error("Failed to reorder");
    }
  }

  const totalLessons = chapters.reduce(
    (sum, ch) => sum + (ch.lessons?.length ?? 0),
    0
  );

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-brand/20">
        <div className="border-b border-brand/20 brand-gradient px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/20 text-brand">
              <Layers className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-brand-dark">
                Course curriculum
              </h3>
              <p className="mt-0.5 text-xs text-brand/70">
                {chapters.length} chapter{chapters.length === 1 ? "" : "s"} ·{" "}
                {totalLessons} lesson{totalLessons === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <Input
            placeholder="New chapter title…"
            value={newChapterTitle}
            onChange={(e) => setNewChapterTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addChapter();
              }
            }}
            className="border-gray-200 bg-white"
          />
          <Button onClick={addChapter} className="shrink-0 sm:w-auto">
            <Plus className="h-4 w-4" />
            Add Chapter
          </Button>
        </CardContent>
      </Card>

      {chapters.length === 0 ? (
        <Card className="border-dashed border-gray-300 bg-white/70">
          <CardContent className="flex flex-col items-center px-6 py-14 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/20 text-brand">
              <BookOpen className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-gray-900">No chapters yet</p>
            <p className="mt-1 max-w-sm text-sm text-gray-500">
              Start building this batch by adding your first chapter, then nest
              lessons, quizzes, and assignments under it.
            </p>
          </CardContent>
        </Card>
      ) : (
        chapters.map((chapter, chapterIndex) => {
          const lessons = chapter.lessons ?? [];

          return (
            <Card
              key={chapter.id}
              className="overflow-hidden border-gray-200/80 shadow-sm"
            >
              <div className="flex items-center gap-3 border-b border-brand/20 brand-gradient px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white shadow-sm shadow-brand/25">
                  {String(chapterIndex + 1).padStart(2, "0")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-brand/70">
                    Chapter
                  </p>
                  <Input
                    defaultValue={chapter.title}
                    onBlur={async (e) => {
                      if (e.target.value !== chapter.title) {
                        try {
                          await updateChapterAction(batchId, chapter.id, {
                            title: e.target.value,
                          });
                          router.refresh();
                        } catch {
                          toast.error("Failed to update chapter");
                        }
                      }
                    }}
                    className="h-9 border-transparent bg-transparent px-0 font-sans text-base font-semibold text-brand-dark shadow-none hover:border-brand/20 hover:bg-white/70 focus:border-brand/20 focus:bg-white"
                  />
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Move chapter up"
                    onClick={() => moveChapter(chapterIndex, "up")}
                    disabled={chapterIndex === 0}
                    className="h-8 w-8"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Move chapter down"
                    onClick={() => moveChapter(chapterIndex, "down")}
                    disabled={chapterIndex === chapters.length - 1}
                    className="h-8 w-8"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Delete chapter"
                    className="h-8 w-8 text-danger hover:bg-danger/10 hover:text-danger"
                    onClick={async () => {
                      if (!confirm("Delete this chapter and all its lessons?"))
                        return;
                      try {
                        await deleteChapterAction(batchId, chapter.id);
                        setChapters((prev) =>
                          prev.filter((ch) => ch.id !== chapter.id)
                        );
                        toast.success("Chapter deleted");
                        router.refresh();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Failed");
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3 bg-surface-muted/40 p-4">
                {lessons.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-white/60 px-4 py-8 text-center">
                    <p className="text-sm font-medium text-gray-700">
                      No lessons in this chapter
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Add a lesson to attach quizzes and assignments.
                    </p>
                  </div>
                ) : (
                  lessons.map((lesson, lessonIndex) => {
                    const quizzes = lesson.quizzes ?? [];
                    const assignments = lesson.assignments ?? [];
                    const hasVideoQuiz = quizzes.some(
                      (q) => q.quiz_type === "video"
                    );

                    return (
                      <div
                        key={lesson.id}
                        className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                      >
                        <div className="flex flex-col gap-3 border-b border-brand/15 brand-gradient px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 space-y-2">
                            <div className="flex items-start gap-2.5">
                              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/25 text-accent-dark">
                                <LessonTypeIcon type={lesson.lesson_type} />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-sans text-sm font-semibold text-brand-dark">
                                  {lesson.title}
                                </p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                  <Badge
                                    variant="outline"
                                    className="gap-1 capitalize"
                                  >
                                    <LessonTypeIcon type={lesson.lesson_type} />
                                    {lesson.lesson_type}
                                  </Badge>
                                  <Badge
                                    variant={
                                      lesson.status === "published"
                                        ? "success"
                                        : "outline"
                                    }
                                  >
                                    {lesson.status}
                                  </Badge>
                                  {quizzes.length > 0 && (
                                    <Badge variant="default">
                                      {quizzes.length} quiz
                                      {quizzes.length === 1 ? "" : "zes"}
                                    </Badge>
                                  )}
                                  {assignments.length > 0 && (
                                    <Badge variant="warning">
                                      {assignments.length} assignment
                                      {assignments.length === 1 ? "" : "s"}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-0.5 self-end sm:self-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setLessonDialog({
                                  chapterId: chapter.id,
                                  lesson,
                                })
                              }
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Move lesson up"
                              className="h-8 w-8"
                              disabled={lessonIndex === 0}
                              onClick={() =>
                                moveLesson(chapter, lessonIndex, "up")
                              }
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Move lesson down"
                              className="h-8 w-8"
                              disabled={lessonIndex === lessons.length - 1}
                              onClick={() =>
                                moveLesson(chapter, lessonIndex, "down")
                              }
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete lesson"
                              className="h-8 w-8 text-danger hover:bg-danger/10 hover:text-danger"
                              onClick={async () => {
                                if (!confirm("Delete this lesson?")) return;
                                try {
                                  await deleteLessonAction(batchId, lesson.id);
                                  setChapters((prev) =>
                                    prev.map((ch) =>
                                      ch.id === chapter.id
                                        ? {
                                            ...ch,
                                            lessons: (ch.lessons ?? []).filter(
                                              (l) => l.id !== lesson.id
                                            ),
                                          }
                                        : ch
                                    )
                                  );
                                  toast.success("Lesson deleted");
                                  router.refresh();
                                } catch (e) {
                                  toast.error(
                                    e instanceof Error ? e.message : "Failed"
                                  );
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid gap-3 border-t border-gray-100 bg-gray-50/80 p-3 sm:grid-cols-2">
                          <div className="rounded-lg border border-gray-200/80 bg-white p-3">
                            <div className="mb-2.5 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <FileQuestion className="h-3.5 w-3.5 text-brand" />
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Quizzes
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-brand hover:bg-brand/10 hover:text-brand-dark"
                                onClick={() =>
                                  setQuizDialog({
                                    lessonId: lesson.id,
                                    lessonTitle: lesson.title,
                                    hasVideoQuiz,
                                  })
                                }
                              >
                                <Plus className="h-3 w-3" />
                                Add
                              </Button>
                            </div>
                            {quizzes.length === 0 ? (
                              <p className="rounded-md bg-gray-50 px-2.5 py-2 text-xs text-gray-400">
                                No quizzes yet
                              </p>
                            ) : (
                              <div className="flex flex-col gap-1.5">
                                {quizzes.map((quiz) => (
                                  <Link
                                    key={quiz.id}
                                    href={`/batches/${batchId}/lessons/${lesson.id}/quiz/${quiz.id}`}
                                    className={cn(
                                      "group flex items-center gap-2 rounded-md border border-gray-200 px-2.5 py-2",
                                      "text-sm text-gray-700 transition-colors hover:border-brand/30 hover:bg-brand/10 hover:text-brand"
                                    )}
                                  >
                                    <FileQuestion className="h-3.5 w-3.5 shrink-0 text-gray-400 group-hover:text-brand" />
                                    <span className="min-w-0 flex-1 truncate font-medium">
                                      {quiz.title}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="shrink-0 capitalize"
                                    >
                                      {quiz.quiz_type}
                                    </Badge>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="rounded-lg border border-gray-200/80 bg-white p-3">
                            <div className="mb-2.5 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <ClipboardList className="h-3.5 w-3.5 text-accent-dark" />
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Assignments
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-brand hover:bg-brand/10 hover:text-brand-dark"
                                onClick={() =>
                                  setAssignmentDialog({
                                    lessonId: lesson.id,
                                    lessonTitle: lesson.title,
                                  })
                                }
                              >
                                <Plus className="h-3 w-3" />
                                Add
                              </Button>
                            </div>
                            {assignments.length === 0 ? (
                              <p className="rounded-md bg-gray-50 px-2.5 py-2 text-xs text-gray-400">
                                No assignments yet
                              </p>
                            ) : (
                              <div className="flex flex-col gap-1.5">
                                {assignments.map((assignment) => (
                                  <Link
                                    key={assignment.id}
                                    href={`/batches/${batchId}/lessons/${lesson.id}/assignment/${assignment.id}`}
                                    className={cn(
                                      "group flex items-center gap-2 rounded-md border border-gray-200 px-2.5 py-2",
                                      "text-sm text-gray-700 transition-colors hover:border-accent/40 hover:bg-accent/5 hover:text-accent-dark"
                                    )}
                                  >
                                    <ClipboardList className="h-3.5 w-3.5 shrink-0 text-gray-400 group-hover:text-accent-dark" />
                                    <span className="min-w-0 flex-1 truncate font-medium">
                                      {assignment.title}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="shrink-0 capitalize"
                                    >
                                      {assignment.type}
                                    </Badge>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                <Button
                  variant="outline"
                  className="w-full border-dashed border-gray-300 bg-white/80 text-gray-700 hover:border-brand/40 hover:bg-brand/10 hover:text-brand"
                  onClick={() => setLessonDialog({ chapterId: chapter.id })}
                >
                  <Plus className="h-4 w-4" />
                  Add Lesson
                </Button>
              </div>
            </Card>
          );
        })
      )}

      {lessonDialog && (
        <LessonDialog
          batchId={batchId}
          chapterId={lessonDialog.chapterId}
          lesson={lessonDialog.lesson}
          sortOrder={chapterSortOrder(lessonDialog.chapterId)}
          onClose={() => setLessonDialog(null)}
          onSaved={(savedLesson, isNew) => {
            setChapters((prev) =>
              prev.map((ch) => {
                if (ch.id !== lessonDialog.chapterId) return ch;
                const lessons = ch.lessons ?? [];
                return {
                  ...ch,
                  lessons: isNew
                    ? [
                        ...lessons,
                        { ...savedLesson, quizzes: [], assignments: [] },
                      ]
                    : lessons.map((l) =>
                        l.id === savedLesson.id ? { ...l, ...savedLesson } : l
                      ),
                };
              })
            );
          }}
        />
      )}

      {quizDialog && (
        <QuizDialog
          batchId={batchId}
          lessonId={quizDialog.lessonId}
          lessonTitle={quizDialog.lessonTitle}
          hasVideoQuiz={quizDialog.hasVideoQuiz}
          onClose={() => setQuizDialog(null)}
          onSaved={(lessonId, quiz) => {
            setChapters((prev) =>
              prev.map((ch) => ({
                ...ch,
                lessons: (ch.lessons ?? []).map((l) =>
                  l.id === lessonId
                    ? {
                        ...l,
                        quizzes: [...(l.quizzes ?? []), quiz].sort(
                          (a, b) => a.sort_order - b.sort_order
                        ),
                      }
                    : l
                ),
              }))
            );
          }}
        />
      )}

      {assignmentDialog && (
        <AssignmentDialog
          batchId={batchId}
          lessonId={assignmentDialog.lessonId}
          lessonTitle={assignmentDialog.lessonTitle}
          onClose={() => setAssignmentDialog(null)}
          onSaved={(lessonId, assignment) => {
            setChapters((prev) =>
              prev.map((ch) => ({
                ...ch,
                lessons: (ch.lessons ?? []).map((l) =>
                  l.id === lessonId
                    ? {
                        ...l,
                        assignments: [...(l.assignments ?? []), assignment].sort(
                          (a, b) => a.sort_order - b.sort_order
                        ),
                      }
                    : l
                ),
              }))
            );
          }}
        />
      )}
    </div>
  );
}

function LessonDialog({
  batchId,
  chapterId,
  lesson,
  sortOrder,
  onClose,
  onSaved,
}: {
  batchId: string;
  chapterId: string;
  lesson?: CourseLesson;
  sortOrder: number;
  onClose: () => void;
  onSaved: (lesson: CourseLesson, isNew: boolean) => void;
}) {
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [lessonType, setLessonType] = useState<"video" | "live">(
    lesson?.lesson_type === "live" ? "live" : "video"
  );
  const [videoUrl, setVideoUrl] = useState(lesson?.video_url ?? "");
  const [liveMeetingUrl, setLiveMeetingUrl] = useState(
    lesson?.live_meeting_url ?? ""
  );
  const [liveStart, setLiveStart] = useState(
    lesson?.live_start_time?.slice(0, 16) ?? ""
  );
  const [liveEnd, setLiveEnd] = useState(
    lesson?.live_end_time?.slice(0, 16) ?? ""
  );
  const [liveClassStatus, setLiveClassStatus] = useState(
    lesson?.live_class_status ?? "pending"
  );
  const [status, setStatus] = useState<CourseLesson["status"]>(
    lesson?.status ?? "draft"
  );
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isLiveCompleted =
    lessonType === "live" && liveClassStatus.toLowerCase() === "completed";

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
      video_url:
        lessonType === "video" || isLiveCompleted ? videoUrl || null : null,
      live_meeting_url:
        lessonType === "live" && !isLiveCompleted
          ? liveMeetingUrl || null
          : lessonType === "live"
            ? lesson?.live_meeting_url ?? null
            : null,
      live_start_time:
        lessonType === "live" && liveStart
          ? new Date(liveStart).toISOString()
          : null,
      live_end_time:
        lessonType === "live" && liveEnd
          ? new Date(liveEnd).toISOString()
          : null,
      live_class_status:
        lessonType === "live"
          ? liveClassStatus.trim()
            ? liveClassStatus.trim().toLowerCase()
            : "pending"
          : null,
      sort_order: lesson?.sort_order ?? sortOrder,
      status,
    };
    try {
      if (lesson) {
        const saved = await updateLessonAction(batchId, lesson.id, payload);
        onSaved(saved as CourseLesson, false);
        toast.success("Lesson updated");
      } else {
        const saved = await createLessonAction(batchId, payload);
        onSaved(saved as CourseLesson, true);
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
            <Select
              value={lessonType}
              onChange={(e) => setLessonType(e.target.value as "video" | "live")}
            >
              <option value="video">Video</option>
              <option value="live">Live</option>
            </Select>
          </div>
          {lessonType === "live" && (
            <div>
              <Label>Live class status</Label>
              <Select
                value={liveClassStatus}
                onChange={(e) => setLiveClassStatus(e.target.value)}
              >
                <option value="pending">pending</option>
                <option value="live">live</option>
                <option value="completed">completed</option>
              </Select>
            </div>
          )}

          {lessonType === "video" ? (
            <div>
              <Label>Bunny Video ID</Label>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="e.g. 0e143fb4-5bf5-4a2b-8871-7f6e05b4b371"
              />
              {lesson?.duration_seconds != null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Current duration: {Math.floor(lesson.duration_seconds / 60)}m{" "}
                  {lesson.duration_seconds % 60}s
                </p>
              )}
            </div>
          ) : null}

          {isLiveCompleted ? (
            <div>
              <Label>Video URL</Label>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Bunny video ID or URL"
              />
              {lesson?.duration_seconds != null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Current duration: {Math.floor(lesson.duration_seconds / 60)}m{" "}
                  {lesson.duration_seconds % 60}s
                </p>
              )}
            </div>
          ) : null}

          {lessonType === "live" && !isLiveCompleted && (
            <div>
              <Label>Meeting URL</Label>
              <Input
                value={liveMeetingUrl}
                onChange={(e) => setLiveMeetingUrl(e.target.value)}
              />
            </div>
          )}

          {lessonType === "live" && (
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
          )}

          <div>
            <Label>Status</Label>
            <Select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as CourseLesson["status"])
              }
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </div>
          <Button onClick={save} disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save Lesson"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type QuizQuestionDraft = {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: QuizOption;
  reason: string;
};

const OPTION_KEYS = ["a", "b", "c", "d"] as const;

function filledOptions(q: QuizQuestionDraft): QuizOption[] {
  return OPTION_KEYS.filter((key) => q[`option_${key}`].trim());
}

const emptyQuestion = (): QuizQuestionDraft => ({
  question: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_option: "a",
  reason: "",
});

function QuizDialog({
  batchId,
  lessonId,
  lessonTitle,
  hasVideoQuiz,
  onClose,
  onSaved,
}: {
  batchId: string;
  lessonId: string;
  lessonTitle: string;
  hasVideoQuiz: boolean;
  onClose: () => void;
  onSaved: (
    lessonId: string,
    quiz: {
      id: string;
      title: string;
      quiz_type: QuizType;
      sort_order: number;
    }
  ) => void;
}) {
  const [title, setTitle] = useState(`${lessonTitle} Quiz`);
  const [quizType, setQuizType] = useState<QuizType>("lesson");
  const [questions, setQuestions] = useState<QuizQuestionDraft[]>([
    emptyQuestion(),
  ]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function updateQuestion(
    index: number,
    field: keyof QuizQuestionDraft,
    value: string
  ) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    );
  }

  async function save() {
    if (!title.trim()) {
      toast.error("Quiz title is required");
      return;
    }
    if (quizType === "video" && hasVideoQuiz) {
      toast.error("This lesson already has a video quiz");
      return;
    }
    for (const [i, q] of questions.entries()) {
      if (!q.question.trim()) {
        toast.error(`Question ${i + 1} is required`);
        return;
      }
      const filled = filledOptions(q);
      if (filled.length < 2) {
        toast.error(`Question ${i + 1} needs at least 2 options`);
        return;
      }
      if (!q[`option_${q.correct_option}`].trim()) {
        toast.error(
          `Correct option for question ${i + 1} must be one of the filled options`
        );
        return;
      }
    }
    setLoading(true);
    try {
      const quiz = await createQuizAction(batchId, lessonId, {
        title,
        questions,
        quiz_type: quizType,
      });
      onSaved(lessonId, quiz);
      toast.success("Quiz created");
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
          <DialogTitle>Add Quiz to &ldquo;{lessonTitle}&rdquo;</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Quiz Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Quiz Type</Label>
            <Select
              value={quizType}
              onChange={(e) => setQuizType(e.target.value as QuizType)}
            >
              <option value="lesson">Lesson</option>
              <option value="video" disabled={hasVideoQuiz}>
                Video{hasVideoQuiz ? " (already exists)" : ""}
              </option>
            </Select>
          </div>

          {questions.map((q, index) => (
            <div
              key={index}
              className="space-y-3 rounded-lg border border-dashed p-4"
            >
              <div className="flex items-center justify-between">
                <Label>Question {index + 1}</Label>
                {questions.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setQuestions((prev) => prev.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
              <Textarea
                value={q.question}
                onChange={(e) =>
                  updateQuestion(index, "question", e.target.value)
                }
                placeholder="Enter the question"
              />
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Fill 2–4 options. Leave unused ones empty.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {OPTION_KEYS.map((key) => (
                    <div key={key}>
                      <Label>
                        Option {key.toUpperCase()}
                        {key === "c" || key === "d" ? (
                          <span className="ml-1 font-normal text-muted-foreground">
                            (optional)
                          </span>
                        ) : null}
                      </Label>
                      <Input
                        value={q[`option_${key}`]}
                        onChange={(e) => {
                          const value = e.target.value;
                          setQuestions((prev) =>
                            prev.map((item, i) => {
                              if (i !== index) return item;
                              const next = { ...item, [`option_${key}`]: value };
                              const filled = filledOptions(next);
                              if (
                                !next[`option_${next.correct_option}`].trim() &&
                                filled.length > 0
                              ) {
                                next.correct_option = filled[0];
                              }
                              return next;
                            })
                          );
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label>Correct Option</Label>
                <Select
                  value={q.correct_option}
                  onChange={(e) =>
                    updateQuestion(
                      index,
                      "correct_option",
                      e.target.value as QuizOption
                    )
                  }
                >
                  {(filledOptions(q).length > 0
                    ? filledOptions(q)
                    : OPTION_KEYS
                  ).map((key) => (
                    <option key={key} value={key}>
                      {key.toUpperCase()}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea
                  value={q.reason}
                  onChange={(e) =>
                    updateQuestion(index, "reason", e.target.value)
                  }
                  placeholder="Explain why the correct answer is correct"
                />
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Another Question
          </Button>

          <Button onClick={save} disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save Quiz"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AssignmentDialog({
  batchId,
  lessonId,
  lessonTitle,
  onClose,
  onSaved,
}: {
  batchId: string;
  lessonId: string;
  lessonTitle: string;
  onClose: () => void;
  onSaved: (
    lessonId: string,
    assignment: {
      id: string;
      title: string;
      type: AssignmentType;
      sort_order: number;
    }
  ) => void;
}) {
  const [title, setTitle] = useState(`${lessonTitle} Assignment`);
  const [type, setType] = useState<AssignmentType>("written");
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [maxMarks, setMaxMarks] = useState(100);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function save() {
    if (!title.trim()) {
      toast.error("Assignment title is required");
      return;
    }
    if (!question.trim()) {
      toast.error("Question is required");
      return;
    }
    if (!Number.isFinite(maxMarks) || maxMarks < 1) {
      toast.error("Max marks must be at least 1");
      return;
    }
    setLoading(true);
    try {
      const assignment = await createAssignmentAction(batchId, lessonId, {
        title,
        question,
        description,
        max_marks: maxMarks,
        type,
      });
      onSaved(lessonId, assignment);
      toast.success("Assignment created");
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
          <DialogTitle>Add Assignment to &ldquo;{lessonTitle}&rdquo;</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Assignment Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Type</Label>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as AssignmentType)}
            >
              <option value="written">Written — students type an answer</option>
              <option value="file">File — students upload a file</option>
            </Select>
          </div>
          <div>
            <Label>Question</Label>
            <Textarea
              rows={4}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter the assignment question"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional instructions or details"
            />
          </div>
          <div>
            <Label>Max Marks</Label>
            <Input
              type="number"
              min={1}
              value={maxMarks}
              onChange={(e) => setMaxMarks(Number(e.target.value))}
            />
          </div>
          <Button onClick={save} disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save Assignment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
