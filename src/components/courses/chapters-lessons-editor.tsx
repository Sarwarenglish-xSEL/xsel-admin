"use client";

import { useEffect, useState } from "react";
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
import type { CourseChapter, CourseLesson, QuizOption } from "@/types/database";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export function ChaptersLessonsEditor({
  courseId,
  chapters: initialChapters,
}: {
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
                    setChapters((prev) => prev.filter((ch) => ch.id !== chapter.id));
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
                    {lesson.quiz && (
                      <Badge variant="outline" className="text-xs">
                        Quiz
                      </Badge>
                    )}
                    {lesson.assignment && (
                      <Badge variant="outline" className="text-xs">
                        Assignment
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setLessonDialog({ chapterId: chapter.id, lesson })
                      }
                    >
                      Edit
                    </Button>
                    {lesson.quiz ? (
                      <Link
                        href={`/courses/${courseId}/lessons/${lesson.id}/quiz`}
                      >
                        <Button variant="ghost" size="sm">
                          <FileQuestion className="mr-1 h-3 w-3" />
                          Edit Quiz
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setQuizDialog({
                            lessonId: lesson.id,
                            lessonTitle: lesson.title,
                          })
                        }
                      >
                        <FileQuestion className="mr-1 h-3 w-3" />
                        Add Quiz
                      </Button>
                    )}
                    {lesson.assignment ? (
                      <Link
                        href={`/courses/${courseId}/lessons/${lesson.id}/assignment`}
                      >
                        <Button variant="ghost" size="sm">
                          <ClipboardList className="mr-1 h-3 w-3" />
                          Edit Assignment
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setAssignmentDialog({
                            lessonId: lesson.id,
                            lessonTitle: lesson.title,
                          })
                        }
                      >
                        <ClipboardList className="mr-1 h-3 w-3" />
                        Add Assignment
                      </Button>
                    )}
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
                        { ...savedLesson, quiz: null, assignment: null },
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
          courseId={courseId}
          lessonId={quizDialog.lessonId}
          lessonTitle={quizDialog.lessonTitle}
          onClose={() => setQuizDialog(null)}
          onSaved={(lessonId, quiz) => {
            setChapters((prev) =>
              prev.map((ch) => ({
                ...ch,
                lessons: (ch.lessons ?? []).map((l) =>
                  l.id === lessonId ? { ...l, quiz } : l
                ),
              }))
            );
          }}
        />
      )}

      {assignmentDialog && (
        <AssignmentDialog
          courseId={courseId}
          lessonId={assignmentDialog.lessonId}
          lessonTitle={assignmentDialog.lessonTitle}
          onClose={() => setAssignmentDialog(null)}
          onSaved={(lessonId, assignment) => {
            setChapters((prev) =>
              prev.map((ch) => ({
                ...ch,
                lessons: (ch.lessons ?? []).map((l) =>
                  l.id === lessonId ? { ...l, assignment } : l
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
  courseId,
  chapterId,
  lesson,
  sortOrder,
  onClose,
  onSaved,
}: {
  courseId: string;
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
        const saved = await updateLessonAction(courseId, lesson.id, payload);
        onSaved(saved as CourseLesson, false);
        toast.success("Lesson updated");
      } else {
        const saved = await createLessonAction(courseId, payload);
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

type QuizQuestionDraft = {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: QuizOption;
};

const emptyQuestion = (): QuizQuestionDraft => ({
  question: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_option: "a",
});

function QuizDialog({
  courseId,
  lessonId,
  lessonTitle,
  onClose,
  onSaved,
}: {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  onClose: () => void;
  onSaved: (lessonId: string, quiz: { id: string; title: string }) => void;
}) {
  const [title, setTitle] = useState(`${lessonTitle} Quiz`);
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
    for (const [i, q] of questions.entries()) {
      if (!q.question.trim()) {
        toast.error(`Question ${i + 1} is required`);
        return;
      }
      if (!q.option_a.trim() || !q.option_b.trim() || !q.option_c.trim() || !q.option_d.trim()) {
        toast.error(`All options are required for question ${i + 1}`);
        return;
      }
    }
    setLoading(true);
    try {
      const quiz = await createQuizAction(courseId, lessonId, {
        title,
        questions,
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
              <div className="grid grid-cols-2 gap-3">
                {(["a", "b", "c", "d"] as const).map((key) => (
                  <div key={key}>
                    <Label>Option {key.toUpperCase()}</Label>
                    <Input
                      value={q[`option_${key}`]}
                      onChange={(e) =>
                        updateQuestion(index, `option_${key}`, e.target.value)
                      }
                    />
                  </div>
                ))}
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
                  <option value="a">A</option>
                  <option value="b">B</option>
                  <option value="c">C</option>
                  <option value="d">D</option>
                </Select>
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
  courseId,
  lessonId,
  lessonTitle,
  onClose,
  onSaved,
}: {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  onClose: () => void;
  onSaved: (lessonId: string, assignment: { id: string; title: string }) => void;
}) {
  const [title, setTitle] = useState(`${lessonTitle} Assignment`);
  const [question, setQuestion] = useState("");
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
    setLoading(true);
    try {
      const assignment = await createAssignmentAction(courseId, lessonId, {
        title,
        question,
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
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Add Assignment to &ldquo;{lessonTitle}&rdquo;</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Assignment Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
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
          <Button onClick={save} disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save Assignment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
