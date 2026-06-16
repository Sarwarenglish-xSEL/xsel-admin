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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Create Course</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input {...register("title")} />
              {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
            </div>
            <div>
              <Label>Description</Label>
              <Textarea {...register("description")} />
              {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select {...register("course_type")}>
                  <option value="prerecorded">Pre-recorded</option>
                  <option value="live">Live</option>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select {...register("category")}>
                  <option value="design">Design</option>
                  <option value="coding">Coding</option>
                  <option value="business">Business</option>
                </Select>
              </div>
            </div>
            <div>
              <Label>Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                {...register("price", { valueAsNumber: true })}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create Course"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
