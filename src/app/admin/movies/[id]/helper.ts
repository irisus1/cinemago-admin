export type HasIdName = { id: string; name?: string };
export type PageResp<T extends HasIdName> = {
  data: T[];
  pagination?: {
    totalItems?: number;
    totalPages?: number;
    currentPage?: number;
    pageSize?: number;
    hasNextPage?: boolean;
  };
};

export async function fetchNamesFromPaginated<T extends HasIdName>(
  needIds: Set<string>,
  fetchPage: (page: number, limit: number) => Promise<PageResp<T>>,
  limit = 200,
  maxPages = 1000
): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  if (needIds.size === 0) return found;

  let page = 1;
  while (page <= maxPages && needIds.size > 0) {
    const { data, pagination } = await fetchPage(page, limit);
    for (const item of data) {
      const sid = String(item.id);
      if (needIds.has(sid)) {
        found.set(sid, item.name ?? "");
        needIds.delete(sid);
      }
    }
    const hasNext =
      pagination?.hasNextPage ??
      (pagination?.currentPage && pagination?.totalPages
        ? pagination.currentPage < pagination.totalPages
        : data.length === limit);
    if (!hasNext) break;
    page += 1;
  }
  return found;
}
