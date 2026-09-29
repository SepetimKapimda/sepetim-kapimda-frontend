// FRONTEND_CHANGES.md §5.1: tüm liste (GET) uçları bu zarfla döner.
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const DEFAULT_PAGE_SIZE = 20;

export function getTotalPages(count: number, pageSize: number = DEFAULT_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(count / pageSize));
}
