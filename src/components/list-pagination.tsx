import Link from "next/link";
import { cn } from "@/lib/utils";

const btnClass =
  "inline-flex h-8 items-center justify-center rounded-lg border border-brand/25 bg-surface px-3 text-xs font-medium text-brand transition-colors hover:bg-brand/5 disabled:pointer-events-none disabled:opacity-50";

export function ListPagination({
  page,
  totalPages,
  total,
  pageSize,
  searchParams = {},
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  searchParams?: Record<string, string | undefined>;
}) {
  if (total <= pageSize && totalPages <= 1) return null;

  function hrefFor(nextPage: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value && key !== "page") params.set(key, value);
    }
    if (nextPage > 1) params.set("page", String(nextPage));
    const query = params.toString();
    return query ? `?${query}` : "?";
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs text-gray-500">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className={btnClass}>
            Previous
          </Link>
        ) : (
          <span className={cn(btnClass, "opacity-50")}>Previous</span>
        )}
        <span className="text-sm text-gray-500">
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <Link href={hrefFor(page + 1)} className={btnClass}>
            Next
          </Link>
        ) : (
          <span className={cn(btnClass, "opacity-50")}>Next</span>
        )}
      </div>
    </div>
  );
}
