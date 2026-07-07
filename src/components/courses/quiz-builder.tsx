"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Quiz, QuizOption, QuizQuestion } from "@/types/database";
import {
  saveQuizAction,
  addQuizQuestionAction,
  updateQuizQuestionAction,
  deleteQuizQuestionAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const quizSchema = z.object({
  title: z.string().min(1),
  passing_marks: z.number().min(0),
  total_marks: z.number().min(1),
});

export function QuizBuilder({
  batchId,
  lessonId,
  quiz: initialQuiz,
}: {
  batchId: string;
  lessonId: string;
  quiz: Quiz | null;
}) {
  const [quiz, setQuiz] = useState(initialQuiz);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setQuiz(initialQuiz);
  }, [initialQuiz]);

  const { register, handleSubmit } = useForm({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: quiz?.title ?? "",
      passing_marks: quiz?.passing_marks ?? 0,
      total_marks: quiz?.total_marks ?? 100,
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quiz Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(async (values) => {
              setLoading(true);
              try {
                const saved = await saveQuizAction(batchId, lessonId, values);
                setQuiz({ ...saved, questions: quiz?.questions ?? [] });
                toast.success("Quiz saved");
                router.refresh();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed");
              } finally {
                setLoading(false);
              }
            })}
            className="grid max-w-md gap-4"
          >
            <div>
              <Label>Title</Label>
              <Input {...register("title")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Passing Marks</Label>
                <Input
                  type="number"
                  {...register("passing_marks", { valueAsNumber: true })}
                />
              </div>
              <div>
                <Label>Total Marks</Label>
                <Input
                  type="number"
                  {...register("total_marks", { valueAsNumber: true })}
                />
              </div>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Quiz"}
            </Button>
          </form>
        </CardContent>
      </Card>
      {quiz && (
        <QuestionManager
          batchId={batchId}
          lessonId={lessonId}
          quizId={quiz.id}
          questions={quiz.questions ?? []}
          onQuestionAdded={(question) => {
            setQuiz((prev) =>
              prev
                ? { ...prev, questions: [...(prev.questions ?? []), question] }
                : prev
            );
          }}
          onQuestionDeleted={(questionId) => {
            setQuiz((prev) =>
              prev
                ? {
                    ...prev,
                    questions: (prev.questions ?? []).filter(
                      (q) => q.id !== questionId
                    ),
                  }
                : prev
            );
          }}
          onQuestionUpdated={(question) => {
            setQuiz((prev) =>
              prev
                ? {
                    ...prev,
                    questions: (prev.questions ?? []).map((q) =>
                      q.id === question.id ? question : q
                    ),
                  }
                : prev
            );
          }}
        />
      )}
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Questions ({questions.length})</CardTitle>
        <Button
          size="sm"
          onClick={() => {
            setEditingId(null);
            setShowAdd(true);
          }}
        >
          <Plus className="h-4 w-4" /> Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
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
            <div key={q.id} className="rounded-lg border border-gray-200 p-4">
              <div className="flex justify-between gap-2">
                <p className="font-medium">
                  {i + 1}. {q.question}
                </p>
                <div className="flex shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
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
                    onClick={async () => {
                      onQuestionDeleted(q.id);
                      try {
                        await deleteQuizQuestionAction(batchId, lessonId, q.id);
                        toast.success("Deleted");
                        router.refresh();
                      } catch (e) {
                        onQuestionAdded(q);
                        toast.error(e instanceof Error ? e.message : "Failed");
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-sm text-gray-500">
                {(["a", "b", "c", "d"] as const).map((k) => (
                  <span
                    key={k}
                    className={q.correct_option === k ? "font-bold text-brand" : ""}
                  >
                    {k.toUpperCase()}: {q[`option_${k}`]}
                  </span>
                ))}
              </div>
              {q.reason && (
                <p className="mt-2 text-sm text-gray-600">
                  <span className="font-medium text-gray-700">Reason:</span>{" "}
                  {q.reason}
                </p>
              )}
            </div>
          )
        )}
        {showAdd && (
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
        )}
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
  const [correct, setCorrect] = useState<QuizOption>(question?.correct_option ?? "a");
  const [reason, setReason] = useState(question?.reason ?? "");
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-gray-200 p-4">
      <div>
        <Label>Question</Label>
        <Textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(["a", "b", "c", "d"] as const).map((k) => (
          <div key={k}>
            <Label>Option {k.toUpperCase()}</Label>
            <Input
              value={options[k]}
              onChange={(e) => setOptions({ ...options, [k]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <div>
        <Label>Correct</Label>
        <Select
          value={correct}
          onChange={(e) => setCorrect(e.target.value as QuizOption)}
        >
          <option value="a">A</option>
          <option value="b">B</option>
          <option value="c">C</option>
          <option value="d">D</option>
        </Select>
      </div>
      <div>
        <Label>Reason</Label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain why the correct answer is correct"
        />
      </div>
      <div className="flex gap-2">
        <Button
          disabled={loading}
          onClick={async () => {
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
                    question.id,
                    payload
                  )
                : await addQuizQuestionAction(batchId, lessonId, quizId, payload);

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
              ? "Save Changes"
              : "Add Question"}
        </Button>
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
