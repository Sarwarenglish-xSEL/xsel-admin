import { getPurchases } from "@/lib/db/purchases";
import { PageHeader } from "@/components/layout/page-header";
import { PurchasesTable } from "@/components/purchases/purchases-table";
import { PageEmpty } from "@/components/page-states";
import type { PurchaseStatus } from "@/types/database";

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filterStatus =
    status && status !== "all" ? (status as PurchaseStatus) : undefined;

  let purchases;
  let error: string | null = null;

  try {
    purchases = await getPurchases(filterStatus);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load purchases";
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Purchases" description="Review and approve manual purchase requests" />
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchases"
        description="Review and approve manual purchase requests"
      />
      {purchases!.length === 0 ? (
        <PageEmpty title="No purchases" description="Purchase requests will appear here." />
      ) : (
        <PurchasesTable purchases={purchases!} status={filterStatus} />
      )}
    </div>
  );
}
