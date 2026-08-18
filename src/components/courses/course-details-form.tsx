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
  Upload,
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
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-brand/20 brand-gradient px-4 py-3">
      <div className="mt-0.5 h-7 w-1 shrink-0 rounded-full brand-accent-bar" />
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-dark">
          <Icon className="h-3.5 w-3.5 text-brand" />
          {children}
        </div>
        {description ? (
          <p className="mt-1 text-xs text-brand/70">{description}</p>
        ) : null}
      </div>
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
    <Card className="overflow-hidden border-brand/20 shadow-sm">
      <SectionHeader
        title="Course details"
        description="Edit the public course information, pricing, and media."
      />
      <CardContent className="p-5 sm:p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
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
                className="min-h-[7rem] resize-none"
                {...register("description")}
                placeholder="What this course covers"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
          </section>

          <section className="space-y-4">
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
                <Label>Fake enrollments</Label>
                <Input
                  type="number"
                  min={0}
                  {...register("fake_enrollments", { valueAsNumber: true })}
                />
                <p className="mt-1.5 text-xs text-brand/60">
                  Shown as enrollment count on the app
                </p>
              </div>
              <div>
                <Label>Status</Label>
                <Select className="w-full" {...register("status")}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </Select>
              </div>
              <div>
                <Label>Instructor</Label>
                <Select
                  className="w-full"
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

          {courseType === "live" && (
            <section className="space-y-4">
              <SectionLabel icon={CalendarDays}>Live schedule</SectionLabel>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Registration deadline</Label>
                  <Input
                    type="datetime-local"
                    {...register("registration_deadline")}
                  />
                  <p className="mt-1.5 text-xs text-brand/60">
                    Last date students can register
                  </p>
                </div>
                <div>
                  <Label>Course start date</Label>
                  <Input type="datetime-local" {...register("course_start_date")} />
                  <p className="mt-1.5 text-xs text-brand/60">
                    When the live course begins
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className="space-y-4">
            <SectionLabel
              icon={ListChecks}
              description="Short benefits shown on the course page."
            >
              Learning outcomes
            </SectionLabel>

            <div className="divide-y divide-brand/10 overflow-hidden rounded-xl border border-brand/20 bg-surface">
              {([0, 1, 2] as const).map((index) => (
                <div key={index} className="space-y-3 p-4 sm:p-5">
                  <span className="text-sm font-semibold text-brand-dark">
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

          <section className="space-y-4">
            <SectionLabel icon={ImageIcon}>Media</SectionLabel>
            <div className="flex flex-col overflow-hidden rounded-xl border border-brand/20 sm:flex-row">
              <div className="flex h-44 w-full shrink-0 items-center justify-center overflow-hidden bg-surface-muted sm:w-64">
                {thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnailUrl}
                    alt="Course thumbnail"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 px-4 text-center">
                    <ImageIcon className="h-7 w-7 text-brand/40" />
                    <p className="font-sans text-xs text-brand/50">No thumbnail yet</p>
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 p-5">
                <p className="font-sans text-sm font-semibold text-brand-dark">
                  Thumbnail image
                </p>
                <input
                  id="course-thumbnail"
                  type="file"
                  accept="image/*"
                  className="sr-only"
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
                      e.target.value = "";
                    }
                  }}
                />
                <label
                  htmlFor="course-thumbnail"
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-brand/30 bg-surface-muted/40 px-4 py-3.5 transition-colors hover:border-brand/50 hover:bg-brand/5 ${
                    uploading ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand">
                    <Upload className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block font-sans text-sm font-medium text-brand-dark">
                      {uploading ? "Uploading…" : "Choose image"}
                    </span>
                    <span className="mt-0.5 block font-sans text-xs text-brand/60">
                      Landscape, at least 1280×720
                    </span>
                  </span>
                </label>
                <p className="font-sans text-xs text-brand/60">
                  PNG or JPG. This image is shown on the course card.
                </p>
              </div>
            </div>
          </section>

          <div className="flex justify-end border-t border-brand/15 pt-6">
            <Button type="submit" disabled={loading} className="min-w-40">
              <Save className="h-4 w-4" />
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
