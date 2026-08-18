"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  BookOpen,
  CalendarDays,
  ImageIcon,
  ListChecks,
  Save,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import type { Course, Profile } from "@/types/database";
import { updateCourseAction } from "@/app/actions";
import { DEFAULT_LEARNING_OUTCOMES } from "@/lib/course-defaults";
import { uploadFile } from "@/lib/db/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/layout/page-header";

const learningOutcomeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
});

const schema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  course_type: z.enum(["prerecorded", "live"]),
  category: z.enum(["design", "coding", "business"]),
  price: z.number().min(0),
  fake_enrollments: z.number().int().min(0),
  instructor_id: z.string().nullable(),
  status: z.enum(["draft", "published", "archived"]),
  registration_deadline: z.string().nullable(),
  course_start_date: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
  learning_outcomes: z.tuple([
    learningOutcomeSchema,
    learningOutcomeSchema,
    learningOutcomeSchema,
  ]),
});

type FormValues = z.infer<typeof schema>;

function getLearningOutcomes(course: Course): FormValues["learning_outcomes"] {
  const existing = Array.isArray(course.learning_outcomes)
    ? course.learning_outcomes
    : [];

  return [0, 1, 2].map((index) => ({
    title: existing[index]?.title || DEFAULT_LEARNING_OUTCOMES[index].title,
    description:
      existing[index]?.description || DEFAULT_LEARNING_OUTCOMES[index].description,
  })) as FormValues["learning_outcomes"];
}

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
      <Icon className="h-3.5 w-3.5 text-brand" />
      {children}
    </div>
  );
}

export function CourseDetailsForm({
  course,
  instructors,
}: {
  course: Course;
  instructors: Profile[];
}) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: course.title,
      description: course.description,
      course_type: course.course_type,
      category: course.category,
      price: Number(course.price),
      fake_enrollments: course.fake_enrollments ?? 0,
      instructor_id: course.instructor_id,
      status: course.status,
      registration_deadline: course.registration_deadline?.slice(0, 16) ?? null,
      course_start_date: course.course_start_date?.slice(0, 16) ?? null,
      thumbnail_url: course.thumbnail_url,
      learning_outcomes: getLearningOutcomes(course),
    },
  });

  const courseType = watch("course_type");
  const thumbnailUrl = watch("thumbnail_url");

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      await updateCourseAction(course.id, {
        ...values,
        instructor_id: values.instructor_id || null,
        registration_deadline: values.registration_deadline
          ? new Date(values.registration_deadline).toISOString()
          : null,
        course_start_date: values.course_start_date
          ? new Date(values.course_start_date).toISOString()
          : null,
        learning_outcomes: values.learning_outcomes,
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
    <Card className="overflow-hidden border-brand/10 shadow-sm">
      <SectionHeader
        title="Course details"
        description="Edit the public course information, pricing, and media."
      />
      <CardContent className="p-5 sm:p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-3xl space-y-8">
          {/* Basics */}
          <section className="space-y-4">
            <SectionLabel icon={BookOpen}>Basics</SectionLabel>
            <div>
              <Label>Title</Label>
              <Input {...register("title")} placeholder="Course title" />
              {errors.title && (
                <p className="mt-1 text-xs text-danger">{errors.title.message}</p>
              )}
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={4}
                {...register("description")}
                placeholder="What this course covers"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
          </section>

          {/* Publishing */}
          <section className="space-y-4 border-t border-gray-100 pt-8">
            <SectionLabel icon={Settings2}>Publishing</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  {...register("price", { valueAsNumber: true })}
                />
              </div>
              <div>
                <Label>Fake Enrollments</Label>
                <Input
                  type="number"
                  min={0}
                  {...register("fake_enrollments", { valueAsNumber: true })}
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  Shown as enrollment count on the app
                </p>
              </div>
              <div>
                <Label>Status</Label>
                <Select {...register("status")}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </Select>
              </div>
              <div>
                <Label>Instructor</Label>
                <Select
                  {...register("instructor_id")}
                  defaultValue={course.instructor_id ?? ""}
                >
                  <option value="">No instructor</option>
                  {instructors.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.email}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </section>

          {/* Live schedule */}
          {courseType === "live" && (
            <section className="space-y-4 border-t border-gray-100 pt-8">
              <SectionLabel icon={CalendarDays}>Live schedule</SectionLabel>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Registration deadline</Label>
                  <Input
                    type="datetime-local"
                    {...register("registration_deadline")}
                  />
                  <p className="mt-1.5 text-xs text-gray-500">
                    Last date students can register
                  </p>
                </div>
                <div>
                  <Label>Course start date</Label>
                  <Input type="datetime-local" {...register("course_start_date")} />
                  <p className="mt-1.5 text-xs text-gray-500">
                    When the live course begins
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Learning outcomes */}
          <section className="space-y-4 border-t border-gray-100 pt-8">
            <div>
              <SectionLabel icon={ListChecks}>Learning outcomes</SectionLabel>
              <p className="mt-1.5 text-xs text-gray-500">
                Short benefits shown on the course page.
              </p>
            </div>

            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
              {([0, 1, 2] as const).map((index) => (
                <div key={index} className="space-y-3 p-4 sm:p-5">
                  <span className="text-sm font-medium text-gray-900">
                    Outcome {index + 1}
                  </span>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
                    <div>
                      <Label>Title</Label>
                      <Input
                        {...register(`learning_outcomes.${index}.title`)}
                        placeholder={DEFAULT_LEARNING_OUTCOMES[index].title}
                      />
                      {errors.learning_outcomes?.[index]?.title && (
                        <p className="mt-1 text-xs text-danger">
                          {errors.learning_outcomes[index]?.title?.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input
                        {...register(`learning_outcomes.${index}.description`)}
                        placeholder={DEFAULT_LEARNING_OUTCOMES[index].description}
                      />
                      {errors.learning_outcomes?.[index]?.description && (
                        <p className="mt-1 text-xs text-danger">
                          {errors.learning_outcomes[index]?.description?.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Media */}
          <section className="space-y-4 border-t border-gray-100 pt-8">
            <SectionLabel icon={ImageIcon}>Media</SectionLabel>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-36 w-full max-w-[240px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                {thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnailUrl}
                    alt="Course thumbnail"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 px-4 text-center">
                    <ImageIcon className="h-6 w-6 text-gray-300" />
                    <p className="text-xs text-gray-400">No thumbnail yet</p>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <Label>Thumbnail image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploading(true);
                    try {
                      const url = await uploadFile(
                        "course-thumbnails",
                        `${course.id}/${file.name}`,
                        file
                      );
                      setValue("thumbnail_url", url);
                      toast.success("Thumbnail uploaded");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Upload failed");
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
                <p className="text-xs text-gray-500">
                  {uploading
                    ? "Uploading…"
                    : "Recommended: landscape image, at least 1280×720."}
                </p>
              </div>
            </div>
          </section>

          <div className="flex justify-end border-t border-gray-100 pt-6">
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4" />
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
