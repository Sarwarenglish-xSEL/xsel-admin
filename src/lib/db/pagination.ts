export const DEFAULT_PAGE_SIZE = 50;

export type PageParams = {
  page?: number;
  pageSize?: number;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function normalizePage(page?: number): number {
  if (!page || Number.isNaN(page) || page < 1) return 1;
  return Math.floor(page);
}

export function normalizePageSize(pageSize?: number): number {
  if (!pageSize || Number.isNaN(pageSize) || pageSize < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.floor(pageSize), 100);
}

export function pageRange(page: number, pageSize: number): { from: number; to: number } {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

export function toPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResult<T> {
  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function parsePageParam(value?: string): number {
  return normalizePage(value ? Number(value) : 1);
}
