import { getPurchases } from "@/lib/db/purchases";
import { parsePageParam } from "@/lib/db/pagination";
import { PageHeader } from "@/components/layout/page-header";
import { PurchasesTable } from "@/components/purchases/purchases-table";
import { ListPagination } from "@/components/list-pagination";
import { PageEmpty } from "@/components/page-states";
import type { PurchaseStatus } from "@/types/database";

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status, page: pageParam } = await searchParams;
  const page = parsePageParam(pageParam);
  const filterStatus =
    status && status !== "all" ? (status as PurchaseStatus) : undefined;

  let result;
  let error: string | null = null;

  try {
    result = await getPurchases(filterStatus, { page });
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

  const purchases = result!.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchases"
        description="Review and approve manual purchase requests"
      />
      {purchases.length === 0 && page === 1 ? (
        <PageEmpty title="No purchases" description="Purchase requests will appear here." />
      ) : (
        <div className="space-y-4">
          <PurchasesTable purchases={purchases} status={filterStatus} />
          <ListPagination
            page={result!.page}
            totalPages={result!.totalPages}
            total={result!.total}
            pageSize={result!.pageSize}
            searchParams={{ status }}
          />
        </div>
      )}
    </div>
  );
}
