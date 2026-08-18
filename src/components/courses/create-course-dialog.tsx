"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createCourseAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  course_type: z.enum(["prerecorded", "live"]),
  category: z.enum(["design", "coding", "business"]),
  price: z.number().min(0),
});

type FormValues = z.infer<typeof schema>;

export function CreateCourseDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      course_type: "prerecorded",
      category: "design",
      price: 0,
    },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const course = await createCourseAction({ ...values, status: "draft" });
      toast.success("Course created");
      setOpen(false);
      reset();
      router.refresh();
      router.push(`/courses/${course.id}/edit`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create course");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        New Course
      </Button>
      <Dialog open={open} onOpenChange={setOpen} className="max-w-2xl">
        <DialogContent
          className="flex w-full max-h-[min(40rem,85vh)] flex-col overflow-hidden p-0"
          onClose={() => setOpen(false)}
        >
          <div className="shrink-0 border-b border-brand/15 brand-gradient px-6 py-5 pr-12">
            <DialogHeader className="mb-0">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-8 w-1 shrink-0 rounded-full brand-accent-bar" />
                <div>
                  <DialogTitle className="text-xl">Create Course</DialogTitle>
                  <p className="mt-1 text-sm text-brand/70">
                    Add a new live or pre-recorded course
                  </p>
                </div>
              </div>
            </DialogHeader>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="brand-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5 sm:px-7">
              <div>
                <Label>Title</Label>
                <Input placeholder="Course title" {...register("title")} />
                {errors.title && (
                  <p className="mt-1 text-xs text-danger">{errors.title.message}</p>
                )}
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={4}
                  className="min-h-[6.5rem] resize-none"
                  placeholder="What students will learn in this course"
                  {...register("description")}
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-danger">{errors.description.message}</p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label>Type</Label>
                  <Select className="w-full" {...register("course_type")}>
                    <option value="prerecorded">Pre-recorded</option>
                    <option value="live">Live</option>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select className="w-full" {...register("category")}>
                    <option value="design">Design</option>
                    <option value="coding">Coding</option>
                    <option value="business">Business</option>
                  </Select>
                </div>
                <div>
                  <Label>Price ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    {...register("price", { valueAsNumber: true })}
                  />
                  {errors.price && (
                    <p className="mt-1 text-xs text-danger">{errors.price.message}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 justify-end border-t border-brand/15 bg-surface px-6 py-4 sm:px-7">
              <Button type="submit" disabled={loading} className="min-w-40">
                {loading ? "Creating..." : "Create Course"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
