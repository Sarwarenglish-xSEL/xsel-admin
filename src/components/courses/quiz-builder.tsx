"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import type { Quiz, QuizOption, QuizQuestion } from "@/types/database";
import { saveQuizAction, addQuizQuestionAction, deleteQuizQuestionAction } from "@/app/actions";
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

export function QuizBuilder({ courseId, lessonId, quiz: initialQuiz }: { courseId: string; lessonId: string; quiz: Quiz | null }) {
  const [quiz, setQuiz] = useState(initialQuiz);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { register, handleSubmit } = useForm({ resolver: zodResolver(quizSchema), defaultValues: {
    title: quiz?.title ?? "", passing_marks: quiz?.passing_marks ?? 0, total_marks: quiz?.total_marks ?? 100,
  }});

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Quiz Settings</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(async (values) => {
            setLoading(true);
            try {
              const saved = await saveQuizAction(courseId, lessonId, values);
              setQuiz({ ...saved, questions: quiz?.questions ?? [] });
              toast.success("Quiz saved");
              router.refresh();
            } catch (e) { toast.error(e instanceof Error ? e.message : "Failed");
            } finally { setLoading(false); }
          })} className="grid max-w-md gap-4">
            <div><Label>Title</Label><Input {...register("title")} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Passing Marks</Label><Input type="number" {...register("passing_marks", { valueAsNumber: true })} /></div>
              <div><Label>Total Marks</Label><Input type="number" {...register("total_marks", { valueAsNumber: true })} /></div>
            </div>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Quiz"}</Button>
          </form>
        </CardContent>
      </Card>
      {quiz && <QuestionManager courseId={courseId} lessonId={lessonId} quizId={quiz.id} questions={quiz.questions ?? []} />}
    </div>
  );
}

function QuestionManager({ courseId, lessonId, quizId, questions }: { courseId: string; lessonId: string; quizId: string; questions: QuizQuestion[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const router = useRouter();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Questions ({questions.length})</CardTitle>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> Add</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.map((q, i) => (
          <div key={q.id} className="rounded-lg border border-gray-200 p-4">
            <div className="flex justify-between">
              <p className="font-medium">{i + 1}. {q.question}</p>
              <Button variant="ghost" size="icon" onClick={async () => {
                await deleteQuizQuestionAction(courseId, lessonId, q.id);
                toast.success("Deleted");
                router.refresh();
              }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-sm text-gray-500">
              {(["a","b","c","d"] as const).map((k) => (
                <span key={k} className={q.correct_option === k ? "font-bold text-brand" : ""}>
                  {k.toUpperCase()}: {q[`option_${k}`]}
                </span>
              ))}
            </div>
          </div>
        ))}
        {showAdd && <AddQuestionForm courseId={courseId} lessonId={lessonId} quizId={quizId} sortOrder={questions.length} onDone={() => { setShowAdd(false); router.refresh(); }} />}
      </CardContent>
    </Card>
  );
}

function AddQuestionForm({ courseId, lessonId, quizId, sortOrder, onDone }: { courseId: string; lessonId: string; quizId: string; sortOrder: number; onDone: () => void }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState({ a: "", b: "", c: "", d: "" });
  const [correct, setCorrect] = useState<QuizOption>("a");
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-gray-200 p-4">
      <div><Label>Question</Label><Textarea value={question} onChange={(e) => setQuestion(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        {(["a","b","c","d"] as const).map((k) => (
          <div key={k}><Label>Option {k.toUpperCase()}</Label>
            <Input value={options[k]} onChange={(e) => setOptions({ ...options, [k]: e.target.value })} /></div>
        ))}
      </div>
      <div><Label>Correct</Label>
        <Select value={correct} onChange={(e) => setCorrect(e.target.value as QuizOption)}>
          <option value="a">A</option><option value="b">B</option><option value="c">C</option><option value="d">D</option>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button disabled={loading} onClick={async () => {
          setLoading(true);
          try {
            await addQuizQuestionAction(courseId, lessonId, quizId, { question, option_a: options.a, option_b: options.b, option_c: options.c, option_d: options.d, correct_option: correct, sort_order: sortOrder });
            toast.success("Added");
            onDone();
          } catch (e) { toast.error(e instanceof Error ? e.message : "Failed");
          } finally { setLoading(false); }
        }}>Add Question</Button>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}
