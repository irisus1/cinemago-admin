import type { PaginationMeta } from "@/services";
export type PageResp<T> = {
  data: T[];
  pagination?: PaginationMeta;
};

export type HasIdName = {
  id: string;
  name: string;
};

export async function fetchNamesFromPaginated(
  ids: Set<string>,
  fetchPage: (page: number, limit: number) => Promise<PageResp<HasIdName>>,
  limit = 10,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  if (ids.size === 0) return result;

  let page = 1;
  let totalPages: number | undefined = undefined;

  while (true) {
    const { data, pagination } = await fetchPage(page, limit);
    const items = data ?? [];

    for (const item of items) {
      const key = String(item.id);
      if (ids.has(key) && !result.has(key)) {
        result.set(key, item.name);
      }
    }

    if (result.size === ids.size) break;

    if (pagination?.totalPages != null) {
      totalPages = pagination.totalPages;
    }

    if (!pagination?.totalPages && items.length < limit) {
      break;
    }

    if (totalPages != null && page >= totalPages) {
      break;
    }

    page += 1;
  }

  return result;
}

export async function fetchAllPaginated<T>(
  fetchPage: (page: number, limit: number) => Promise<PageResp<T>>,
  limit = 10,
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  let totalPages = 1;

  while (true) {
    const { data, pagination } = await fetchPage(page, limit);
    const items = data ?? [];
    all.push(...items);

    if (pagination?.totalPages != null) {
      totalPages = pagination.totalPages;
    } else if (items.length < limit) {
      break;
    }

    if (page >= totalPages) break;
    page += 1;
  }

  return all;
}

const listCache = new Map<string, unknown[]>();

export async function fetchAllPaginatedCached<T>(
  cacheKey: string,
  fetchPage: (page: number, limit: number) => Promise<PageResp<T>>,
  limit = 10,
): Promise<T[]> {
  const cached = listCache.get(cacheKey);
  if (cached) {
    return cached as T[];
  }

  const all = await fetchAllPaginated(fetchPage, limit);
  listCache.set(cacheKey, all);
  return all;
}

export function invalidateListCache(cacheKey?: string) {
  if (cacheKey) {
    listCache.delete(cacheKey);
  } else {
    listCache.clear();
  }
}
