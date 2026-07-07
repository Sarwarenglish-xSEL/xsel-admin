import { getAllBatchesOverview } from "@/lib/db/batches";
import { getCourses } from "@/lib/db/courses";
import { BatchesOverview } from "@/components/batches/batches-overview";
import { CreateBatchDialog } from "@/components/batches/create-batch-dialog";
import { PageHeader } from "@/components/layout/page-header";

export default async function BatchesPage() {
  let batches;
  let courses;
  let error: string | null = null;

  try {
    [batches, courses] = await Promise.all([
      getAllBatchesOverview(),
      getCourses(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load batches";
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Batches"
          description="Manage course batches, content, and student enrollment by cohort"
        />
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batches"
        description="Each batch has its own chapters, lessons, schedule, and enrolled students"
        actions={<CreateBatchDialog courses={courses!} />}
      />
      <BatchesOverview batches={batches!} />
    </div>
  );
}
