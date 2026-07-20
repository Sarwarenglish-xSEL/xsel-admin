"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { saveAssignmentAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/layout/page-header";
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
    <Card className="overflow-hidden border-brand/10 shadow-sm">
      <SectionHeader
        title="Assignment details"
        description="Configure the question, submission type, marks, and due date."
      />
      <CardContent className="p-5 sm:p-6">
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
          className="mx-auto max-w-lg space-y-4"
        >
          <div>
            <Label>Title</Label>
            <Input {...register("title")} />
          </div>
          <div>
            <Label>Type</Label>
            <Select {...register("type")}>
              <option value="written">Written — students type an answer</option>
              <option value="file">File — students upload a file</option>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Max Marks</Label>
              <Input
                type="number"
                {...register("max_marks", { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="datetime-local" {...register("due_date")} />
            </div>
          </div>
          <div className="flex justify-end border-t border-gray-100 pt-5">
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4" />
              {loading ? "Saving..." : "Save Assignment"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
