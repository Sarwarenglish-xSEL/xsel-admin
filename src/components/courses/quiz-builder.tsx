"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { FileQuestion, Plus, Pencil, Save, Trash2 } from "lucide-react";
import type { Quiz, QuizOption, QuizQuestion } from "@/types/database";
import {
  saveQuizAction,
  addQuizQuestionAction,
  updateQuizQuestionAction,
  deleteQuizQuestionAction,
} from "@/app/actions";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const quizSchema = z.object({
  title: z.string().min(1),
  passing_marks: z.number().min(0),
  total_marks: z.number().min(1),
  quiz_type: z.enum(["lesson", "video"]),
});

type QuizFormValues = z.infer<typeof quizSchema>;

const OPTION_KEYS = ["a", "b", "c", "d"] as const;

function FieldGroup({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "space-y-4 rounded-xl border border-brand/15 bg-surface p-4 sm:p-5",
        className
      )}
    >
      <div>
        <h3 className="text-sm font-semibold text-brand-dark">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-xs text-brand/60">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function QuizBuilder({
  batchId,
  lessonId,
  quiz: initialQuiz,
}: {
  batchId: string;
  lessonId: string;
  quiz: Quiz;
}) {
  const [quiz, setQuiz] = useState(initialQuiz);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setQuiz(initialQuiz);
  }, [initialQuiz]);

  const { register, handleSubmit, reset } = useForm<QuizFormValues>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: quiz.title,
      passing_marks: quiz.passing_marks,
      total_marks: quiz.total_marks,
      quiz_type: quiz.quiz_type,
    },
  });

  useEffect(() => {
    reset({
      title: initialQuiz.title,
      passing_marks: initialQuiz.passing_marks,
      total_marks: initialQuiz.total_marks,
      quiz_type: initialQuiz.quiz_type,
    });
  }, [initialQuiz, reset]);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-brand/20 shadow-sm">
        <SectionHeader
          title="Quiz settings"
          description="Set the title, type, and scoring for this quiz."
        />
        <form
          onSubmit={handleSubmit(async (values) => {
            setLoading(true);
            try {
              const saved = await saveQuizAction(
                batchId,
                lessonId,
                quiz.id,
                values
              );
              setQuiz({ ...saved, questions: quiz.questions ?? [] });
              toast.success("Quiz saved");
              router.refresh();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed");
            } finally {
              setLoading(false);
            }
          })}
        >
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-2">
              <FieldGroup
                title="Basics"
                description="Name the quiz and choose where it appears."
              >
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input
                    {...register("title")}
                    placeholder="e.g. Nouns Basic Quiz"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Quiz type</Label>
                  <Select className="w-full" {...register("quiz_type")}>
                    <option value="lesson">Lesson</option>
                    <option value="video">Video</option>
                  </Select>
                </div>
              </FieldGroup>

              <FieldGroup
                title="Scoring"
                description="Set passing and total marks for this quiz."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Passing marks</Label>
                    <Input
                      type="number"
                      min={0}
                      {...register("passing_marks", { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Total marks</Label>
                    <Input
                      type="number"
                      min={1}
                      {...register("total_marks", { valueAsNumber: true })}
                    />
                  </div>
                </div>
                <p className="text-xs text-brand/55">
                  Students need at least the passing marks to clear this quiz.
                </p>
              </FieldGroup>
            </div>
          </CardContent>
          <div className="flex shrink-0 items-center justify-end border-t border-brand/15 bg-surface px-5 py-4 sm:px-6">
            <Button type="submit" disabled={loading} className="min-w-44">
              <Save className="h-4 w-4" />
              {loading ? "Saving..." : "Save Quiz"}
            </Button>
          </div>
        </form>
      </Card>

      <QuestionManager
        batchId={batchId}
        lessonId={lessonId}
        quizId={quiz.id}
        questions={quiz.questions ?? []}
        onQuestionAdded={(question) => {
          setQuiz((prev) => ({
            ...prev,
            questions: [...(prev.questions ?? []), question],
          }));
        }}
        onQuestionDeleted={(questionId) => {
          setQuiz((prev) => ({
            ...prev,
            questions: (prev.questions ?? []).filter((q) => q.id !== questionId),
          }));
        }}
        onQuestionUpdated={(question) => {
          setQuiz((prev) => ({
            ...prev,
            questions: (prev.questions ?? []).map((q) =>
              q.id === question.id ? question : q
            ),
          }));
        }}
      />
    </div>
  );
}

function QuestionManager({
  batchId,
  lessonId,
  quizId,
  questions,
  onQuestionAdded,
  onQuestionDeleted,
  onQuestionUpdated,
}: {
  batchId: string;
  lessonId: string;
  quizId: string;
  questions: QuizQuestion[];
  onQuestionAdded: (question: QuizQuestion) => void;
  onQuestionDeleted: (questionId: string) => void;
  onQuestionUpdated: (question: QuizQuestion) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();

  return (
    <Card className="overflow-hidden border-brand/20 shadow-sm">
      <SectionHeader
        title={`Questions (${questions.length})`}
        description="Add multiple-choice questions for this quiz."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditingId(null);
              setShowAdd(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add question
          </Button>
        }
      />
      <CardContent className="space-y-3 p-5 sm:p-6">
        {questions.length === 0 && !showAdd ? (
          <div className="rounded-xl border border-dashed border-brand/25 bg-brand/[0.03] px-4 py-10 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
              <FileQuestion className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-medium text-brand-dark">
              No questions yet
            </p>
            <p className="mt-1 text-xs text-brand/60">
              Add the first multiple-choice question for this quiz.
            </p>
            <Button
              className="mt-4"
              size="sm"
              onClick={() => {
                setEditingId(null);
                setShowAdd(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add question
            </Button>
          </div>
        ) : null}

        {questions.map((q, i) =>
          editingId === q.id ? (
            <QuestionForm
              key={q.id}
              batchId={batchId}
              lessonId={lessonId}
              quizId={quizId}
              question={q}
              sortOrder={q.sort_order}
              onDone={() => setEditingId(null)}
              onSaved={(updated) => {
                onQuestionUpdated(updated);
                setEditingId(null);
                router.refresh();
              }}
            />
          ) : (
            <div
              key={q.id}
              className="rounded-xl border border-brand/15 bg-surface p-4 shadow-sm sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-xs font-semibold text-brand">
                    {i + 1}
                  </span>
                  <div className="min-w-0 space-y-3">
                    <p className="font-medium text-brand-dark">{q.question}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {OPTION_KEYS.map((k) => {
                        const text = q[`option_${k}`]?.trim();
                        if (!text) return null;
                        const isCorrect = q.correct_option === k;
                        return (
                          <div
                            key={k}
                            className={cn(
                              "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                              isCorrect
                                ? "border-brand/30 bg-brand/[0.07] text-brand-dark"
                                : "border-brand/10 bg-brand/[0.02] text-brand/75"
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold",
                                isCorrect
                                  ? "bg-brand text-white"
                                  : "bg-brand/10 text-brand"
                              )}
                            >
                              {k.toUpperCase()}
                            </span>
                            <span className="min-w-0 flex-1 leading-snug">
                              {text}
                            </span>
                            {isCorrect ? (
                              <Badge
                                variant="outline"
                                className="shrink-0 border-brand/25 bg-surface text-[10px] text-brand"
                              >
                                Correct
                              </Badge>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    {q.reason ? (
                      <p className="rounded-lg border border-brand/10 bg-brand/[0.03] px-3 py-2 text-sm text-brand/75">
                        <span className="font-medium text-brand-dark">
                          Reason:
                        </span>{" "}
                        {q.reason}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Edit question"
                    onClick={() => {
                      setShowAdd(false);
                      setEditingId(q.id);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Delete question"
                    className="text-danger hover:bg-danger/10 hover:text-danger"
                    onClick={async () => {
                      if (!confirm("Delete this question?")) return;
                      onQuestionDeleted(q.id);
                      try {
                        await deleteQuizQuestionAction(
                          batchId,
                          lessonId,
                          quizId,
                          q.id
                        );
                        toast.success("Deleted");
                        router.refresh();
                      } catch (e) {
                        onQuestionAdded(q);
                        toast.error(e instanceof Error ? e.message : "Failed");
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )
        )}

        {showAdd ? (
          <QuestionForm
            batchId={batchId}
            lessonId={lessonId}
            quizId={quizId}
            sortOrder={questions.length}
            onDone={() => setShowAdd(false)}
            onSaved={(question) => {
              onQuestionAdded(question);
              setShowAdd(false);
              router.refresh();
            }}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function QuestionForm({
  batchId,
  lessonId,
  quizId,
  question,
  sortOrder,
  onDone,
  onSaved,
}: {
  batchId: string;
  lessonId: string;
  quizId: string;
  question?: QuizQuestion;
  sortOrder: number;
  onDone: () => void;
  onSaved: (question: QuizQuestion) => void;
}) {
  const isEdit = !!question;
  const [questionText, setQuestionText] = useState(question?.question ?? "");
  const [options, setOptions] = useState({
    a: question?.option_a ?? "",
    b: question?.option_b ?? "",
    c: question?.option_c ?? "",
    d: question?.option_d ?? "",
  });
  const [correct, setCorrect] = useState<QuizOption>(
    question?.correct_option ?? "a"
  );
  const [reason, setReason] = useState(question?.reason ?? "");
  const [loading, setLoading] = useState(false);

  const filledOptions = OPTION_KEYS.filter((k) => options[k].trim());

  return (
    <div className="space-y-4 rounded-xl border border-dashed border-brand/30 bg-brand/[0.02] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-dark">
            {isEdit ? "Edit question" : "New question"}
          </p>
          <p className="text-xs text-brand/60">
            Fill at least 2 options and mark the correct one.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Question</Label>
        <Textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="Enter the question"
          className="min-h-[5.5rem] resize-y"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs text-brand/60">
          Fill 2–4 options. Leave unused ones empty.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {OPTION_KEYS.map((k) => (
            <div key={k} className="space-y-1.5">
              <Label>
                Option {k.toUpperCase()}
                {k === "c" || k === "d" ? (
                  <span className="ml-1 font-normal text-brand/45">
                    (optional)
                  </span>
                ) : null}
              </Label>
              <Input
                value={options[k]}
                onChange={(e) => {
                  const next = { ...options, [k]: e.target.value };
                  setOptions(next);
                  const filled = OPTION_KEYS.filter((key) => next[key].trim());
                  if (!next[correct].trim() && filled.length > 0) {
                    setCorrect(filled[0]);
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Correct option</Label>
          <Select
            className="w-full"
            value={correct}
            onChange={(e) => setCorrect(e.target.value as QuizOption)}
          >
            {(filledOptions.length > 0 ? filledOptions : OPTION_KEYS).map(
              (k) => (
                <option key={k} value={k}>
                  {k.toUpperCase()}
                </option>
              )
            )}
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>
          Reason{" "}
          <span className="font-normal text-brand/45">(optional)</span>
        </Label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain why the correct answer is correct"
          className="min-h-[4.5rem] resize-y"
        />
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-brand/10 pt-4">
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button
          disabled={loading}
          onClick={async () => {
            if (!questionText.trim()) {
              toast.error("Question is required");
              return;
            }
            if (filledOptions.length < 2) {
              toast.error("Fill at least 2 options");
              return;
            }
            if (!options[correct].trim()) {
              toast.error("Correct option must be one of the filled options");
              return;
            }

            setLoading(true);
            try {
              const payload = {
                question: questionText,
                option_a: options.a,
                option_b: options.b,
                option_c: options.c,
                option_d: options.d,
                correct_option: correct,
                reason,
                sort_order: sortOrder,
              };

              const saved = isEdit
                ? await updateQuizQuestionAction(
                    batchId,
                    lessonId,
                    quizId,
                    question.id,
                    payload
                  )
                : await addQuizQuestionAction(
                    batchId,
                    lessonId,
                    quizId,
                    payload
                  );

              toast.success(isEdit ? "Updated" : "Added");
              onSaved(saved);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed");
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading
            ? isEdit
              ? "Saving..."
              : "Adding..."
            : isEdit
              ? "Save changes"
              : "Add question"}
        </Button>
      </div>
    </div>
  );
}
