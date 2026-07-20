import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { getBatchById } from "@/lib/db/batches";
import { getChaptersWithLessons } from "@/lib/db/chapters";
import { getEnrollments } from "@/lib/db/enrollments";
import { getProfiles } from "@/lib/db/profiles";
import { BatchSettingsForm } from "@/components/batches/batch-settings-form";
import { BatchStudents } from "@/components/batches/batch-students";
import { ChaptersLessonsEditor } from "@/components/courses/chapters-lessons-editor";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function EditBatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let batch;
  let chapters;
  let enrollments;
  let users;
  let error: string | null = null;

  try {
    batch = await getBatchById(id);
    if (batch) {
      [chapters, enrollments, users] = await Promise.all([
        getChaptersWithLessons(id),
        getEnrollments({ batchId: id }),
        getProfiles(),
      ]);
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load batch";
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  if (!batch) notFound();

  const course = batch.course;

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/batches"
        title={batch.name}
        description={
          course
            ? `Batch for ${course.title} — manage content, schedule, and students`
            : "Manage batch content, schedule, and students"
        }
      />

      {course && (
        <Card className="border-brand/10 shadow-sm">
          <CardContent className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Parent course
              </p>
              <Link
                href={`/courses/${course.id}/edit`}
                className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
              >
                {course.title}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {course.course_type}
              </Badge>
              <Badge
                variant={course.status === "published" ? "default" : "outline"}
                className="capitalize"
              >
                {course.status}
              </Badge>
              <Badge
                variant={batch.status === "active" ? "success" : "outline"}
                className="capitalize"
              >
                {batch.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Chapters & Lessons</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="mt-6">
          <ChaptersLessonsEditor
            batchId={id}
            courseId={batch.course_id}
            chapters={chapters!}
          />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <BatchSettingsForm batch={batch} />
        </TabsContent>
        <TabsContent value="students" className="mt-6">
          <BatchStudents
            courseId={batch.course_id}
            batchId={id}
            enrollments={enrollments!}
            users={users!}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
