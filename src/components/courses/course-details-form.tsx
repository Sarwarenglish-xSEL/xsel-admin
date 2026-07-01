"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { Course, Profile } from "@/types/database";
import { updateCourseAction } from "@/app/actions";
import { uploadFile } from "@/lib/db/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

const schema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  course_type: z.enum(["prerecorded", "live"]),
  category: z.enum(["design", "coding", "business"]),
  price: z.number().min(0),
  instructor_id: z.string().nullable(),
  status: z.enum(["draft", "published", "archived"]),
  registration_deadline: z.string().nullable(),
  course_start_date: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
});

type FormValues = z.infer<typeof schema>;

export function CourseDetailsForm({ course, instructors }: { course: Course; instructors: Profile[] }) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: course.title,
      description: course.description,
      course_type: course.course_type,
      category: course.category,
      price: Number(course.price),
      instructor_id: course.instructor_id,
      status: course.status,
      registration_deadline: course.registration_deadline?.slice(0, 16) ?? null,
      course_start_date: course.course_start_date?.slice(0, 16) ?? null,
      thumbnail_url: course.thumbnail_url,
    },
  });

  const courseType = watch("course_type");
  const thumbnailUrl = watch("thumbnail_url");

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      await updateCourseAction(course.id, {
        ...values,
        registration_deadline: values.registration_deadline
          ? new Date(values.registration_deadline).toISOString()
          : null,
        course_start_date: values.course_start_date
          ? new Date(values.course_start_date).toISOString()
          : null,
      });
      toast.success("Course updated");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-4">
      <div>
        <Label>Title</Label>
        <Input {...register("title")} />
        {errors.title && <p className="mt-1 text-xs text-danger">{errors.title.message}</p>}
      </div>
      <div>
        <Label>Description</Label>
        <Textarea rows={4} {...register("description")} />
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Price ($)</Label>
          <Input type="number" step="0.01" {...register("price", { valueAsNumber: true })} />
        </div>
        <div>
          <Label>Status</Label>
          <Select {...register("status")}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </Select>
        </div>
      </div>
      <div>
        <Label>Instructor</Label>
        <Select {...register("instructor_id")} defaultValue={course.instructor_id ?? ""}>
          <option value="">No instructor</option>
          {instructors.map((p) => (
            <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
          ))}
        </Select>
      </div>
      {courseType === "live" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Registration Deadline</Label>
            <Input type="datetime-local" {...register("registration_deadline")} />
            <p className="mt-1 text-xs text-muted-foreground">
              Last date students can register
            </p>
          </div>
          <div>
            <Label>Course Start Date</Label>
            <Input type="datetime-local" {...register("course_start_date")} />
            <p className="mt-1 text-xs text-muted-foreground">
              When the live course begins
            </p>
          </div>
        </div>
      )}
 
      <div>
        <Label>Thumbnail</Label>
        {thumbnailUrl && (
          <img src={thumbnailUrl} alt="Thumbnail" className="mb-2 h-32 rounded-lg object-cover" />
        )}
        <Input type="file" accept="image/*" disabled={uploading} onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setUploading(true);
          try {
            const url = await uploadFile("course-thumbnails", `${course.id}/${file.name}`, file);
            setValue("thumbnail_url", url);
            toast.success("Thumbnail uploaded");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Upload failed");
          } finally { setUploading(false); }
        }} />
      </div>
      <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
    </form>
  );
}
