"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ClipboardList, Mic, PenLine, Save } from "lucide-react";
import { toast } from "sonner";
import { saveAssignmentAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/layout/page-header";
import {
  ADMIN_ASSIGNMENT_TYPE_OPTIONS,
  type Assignment,
  type AssignmentType,
} from "@/types/database";
import { cn } from "@/lib/utils";

const schema = z.object({
  title: z.string().min(1),
  question: z.string().min(1),
  description: z.string(),
  max_marks: z.number().min(1),
  due_date: z.string().nullable(),
  type: z.enum(["written", "audio", "file"]),
});

type FormValues = z.infer<typeof schema>;

function typeOptionsFor(current?: AssignmentType) {
  if (current === "file") {
    return [
      ...ADMIN_ASSIGNMENT_TYPE_OPTIONS,
      {
        value: "file" as const,
        label: "File — students upload a file",
      },
    ];
  }
  return ADMIN_ASSIGNMENT_TYPE_OPTIONS;
}

function TypeHint({ type }: { type: AssignmentType }) {
  if (type === "audio") {
    return (
      <div className="flex items-start gap-2.5 rounded-lg border border-brand/15 bg-brand/[0.04] px-3 py-2.5 text-sm text-brand/75">
        <Mic className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <p>Students will submit an audio recording for this assignment.</p>
      </div>
    );
  }
  if (type === "file") {
    return (
      <div className="flex items-start gap-2.5 rounded-lg border border-brand/15 bg-brand/[0.04] px-3 py-2.5 text-sm text-brand/75">
        <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <p>Students will upload a file for this assignment.</p>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-brand/15 bg-brand/[0.04] px-3 py-2.5 text-sm text-brand/75">
      <PenLine className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
      <p>Students will type their answer in the app.</p>
    </div>
  );
}

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

  const { register, handleSubmit, reset, watch } = useForm<FormValues>({
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

  const selectedType = watch("type");

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
    <Card className="overflow-hidden border-brand/20 shadow-sm">
      <SectionHeader
        title="Assignment details"
        description="Configure the question, submission type, marks, and due date."
      />
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
      >
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-2">
            <FieldGroup
              title="Basics"
              description="Name the assignment and choose how students submit."
            >
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  {...register("title")}
                  placeholder="e.g. Nouns Basic Assignment"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select className="w-full" {...register("type")}>
                  {typeOptionsFor(assignment.type).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <TypeHint type={selectedType} />
            </FieldGroup>

            <FieldGroup
              title="Scoring & deadline"
              description="Set marks and an optional due date."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Max marks</Label>
                  <Input
                    type="number"
                    min={1}
                    {...register("max_marks", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Due date</Label>
                  <Input type="datetime-local" {...register("due_date")} />
                </div>
              </div>
              <p className="text-xs text-brand/55">
                Leave due date empty if the assignment has no deadline.
              </p>
            </FieldGroup>
          </div>

          <FieldGroup
            title="Prompt"
            description="Write the question students answer and any extra instructions."
          >
            <div className="space-y-1.5">
              <Label>Question</Label>
              <Textarea
                rows={5}
                className="min-h-[8rem] resize-y"
                placeholder="Enter the assignment question"
                {...register("question")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Description{" "}
                <span className="font-normal text-brand/45">(optional)</span>
              </Label>
              <Textarea
                rows={3}
                className="min-h-[5.5rem] resize-y"
                placeholder="Optional instructions, word count, or tips"
                {...register("description")}
              />
            </div>
          </FieldGroup>
        </CardContent>

        <div className="flex shrink-0 items-center justify-end border-t border-brand/15 bg-surface px-5 py-4 sm:px-6">
          <Button type="submit" disabled={loading} className="min-w-44">
            <Save className="h-4 w-4" />
            {loading ? "Saving..." : "Save Assignment"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
