import { getAllBatchesOverview } from "@/lib/db/batches";
import { BatchesOverview } from "@/components/batches/batches-overview";
import { PageHeader } from "@/components/layout/page-header";

export default async function BatchesPage() {
  let batches;
  let error: string | null = null;

  try {
    batches = await getAllBatchesOverview();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load batches";
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Batches"
          description="View all course batches and student enrollment by cohort"
        />
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batches"
        description="View all course batches and student enrollment by cohort"
      />
      <BatchesOverview batches={batches!} />
    </div>
  );
}
