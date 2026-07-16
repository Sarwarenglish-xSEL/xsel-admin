"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { saveAssignmentAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import type { Assignment } from "@/types/database";

const schema = z.object({
  title: z.string().min(1),
  question: z.string().min(1),
  description: z.string(),
  max_marks: z.number().min(1),
  due_date: z.string().nullable(),
  type: z.enum(["written", "file"]),
});

export function AssignmentForm({
  batchId,
  lessonId,
  assignment: initialAssignment,
}: {
  batchId: string;
  lessonId: string;
  assignment: Assignment;
}) {
  const [assignment, setAssignment] = useState(initialAssignment);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, reset } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: assignment.title,
      question: assignment.question || assignment.description || "",
      description: assignment.description ?? "",
      max_marks: assignment.max_marks,
      due_date: assignment.due_date?.slice(0, 16) ?? null,
      type: assignment.type ?? "written",
    },
  });

  useEffect(() => {
    setAssignment(initialAssignment);
    reset({
      title: initialAssignment.title,
      question: initialAssignment.question || initialAssignment.description || "",
      description: initialAssignment.description ?? "",
      max_marks: initialAssignment.max_marks,
      due_date: initialAssignment.due_date?.slice(0, 16) ?? null,
      type: initialAssignment.type ?? "written",
    });
  }, [initialAssignment, reset]);

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        setLoading(true);
        try {
          const saved = await saveAssignmentAction(
            batchId,
            lessonId,
            assignment.id,
            {
              ...values,
              due_date: values.due_date
                ? new Date(values.due_date).toISOString()
                : null,
            }
          );
          setAssignment(saved);
          reset({
            title: saved.title,
            question: saved.question,
            description: saved.description,
            max_marks: saved.max_marks,
            due_date: saved.due_date?.slice(0, 16) ?? null,
            type: saved.type,
          });
          toast.success("Assignment saved");
          router.refresh();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Failed");
        } finally {
          setLoading(false);
        }
      })}
      className="max-w-lg space-y-4"
    >
      <div>
        <Label>Title</Label>
        <Input {...register("title")} />
      </div>
      <div>
        <Label>Type</Label>
        <Select {...register("type")}>
          <option value="written">Written</option>
          <option value="file">File</option>
        </Select>
      </div>
      <div>
        <Label>Question</Label>
        <Textarea rows={4} {...register("question")} />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea rows={3} {...register("description")} />
      </div>
      <div>
        <Label>Max Marks</Label>
        <Input type="number" {...register("max_marks", { valueAsNumber: true })} />
      </div>
      <div>
        <Label>Due Date</Label>
        <Input type="datetime-local" {...register("due_date")} />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Assignment"}
      </Button>
    </form>
  );
}
