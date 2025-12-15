"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  genreService,
  movieService,
  type Movie,
  type Genre,
  PaginationMeta,
} from "@/services";

// Constants
const LIMIT = 7;
const SEARCH_LIMIT = 7;

export function useMovieLogic() {
  const router = useRouter();

  // ------------ State ------------
  // Dialogs
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => {});
  const [globalLoading, setGlobalLoading] = useState(false);

  // Data & Paging
  const [rows, setRows] = useState<Movie[]>([]);
  const [allGenres, setAllGenres] = useState<Genre[]>([]);

  // Server-side Paging
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasPrev, setHasPrev] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [loadingPage, setLoadingPage] = useState(false);

  // Client-side Search Paging
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const [searchAll, setSearchAll] = useState<Movie[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Filters
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [genreIds, setGenreIds] = useState<string[]>([]);
  const [ratingFrom, setRatingFrom] = useState<number | null>(null);
  const [status, setStatus] = useState<
    "__ALL__" | "COMING_SOON" | "NOW_SHOWING" | "ENDED"
  >("__ALL__");
  const [reloadTick, setReloadTick] = useState(0);

  // Derived State
  const hasAnyFilter =
    qDebounced.length > 0 ||
    genreIds.length > 0 ||
    ratingFrom !== null ||
    status !== "__ALL__";

  const isSearchMode = hasAnyFilter;

  const canClearFilters =
    q.trim().length > 0 ||
    genreIds.length > 0 ||
    ratingFrom !== null ||
    status !== "__ALL__";

  // ------------ Cache Refs ------------
  const pageCache = useRef(new Map<number, Movie[]>());
  const metaRef = useRef<PaginationMeta | null>(null);
  const inFlight = useRef(
    new Map<number, Promise<{ data: Movie[]; meta: PaginationMeta }>>()
  );

  // ------------ Helpers ------------
  function clearCache() {
    pageCache.current.clear();
    metaRef.current = null;
    inFlight.current.clear();
  }

  const fetchPage = useCallback(async (p: number) => {
    const res = await movieService.getAllMovies({ page: p, limit: LIMIT });
    const movies = res.data ?? [];

    return { data: movies, pagination: res.pagination };
  }, []);

  const fetchPageCached = useCallback(
    async (p: number) => {
      // 1) cache hit
      const hit = pageCache.current.get(p);
      if (hit) {
        const meta = metaRef.current ?? {
          totalItems: hit.length,
          totalPages: 1,
          pageSize: LIMIT,
        };
        return { data: hit, meta };
      }

      // 2) in-flight dedup
      const inflight = inFlight.current.get(p);
      if (inflight) return inflight;

      // 3) fetch real
      const req = (async () => {
        const { data, pagination } = await fetchPage(p);
        const meta: PaginationMeta = {
          totalItems: pagination.totalItems,
          totalPages: pagination.totalPages,
          pageSize: pagination.pageSize,
          currentPage: pagination.currentPage,
          hasNextPage: pagination.hasNextPage,
          hasPrevPage: pagination.hasPrevPage,
        };
        pageCache.current.set(p, data);
        metaRef.current = meta;
        return { data, meta };
      })();

      inFlight.current.set(p, req);
      try {
        return await req;
      } finally {
        inFlight.current.delete(p);
      }
    },
    [fetchPage]
  );

  // ------------ Effects ------------

  // 1. Debounce Search
  useEffect(() => {
    const t = setTimeout(() => {
      setQDebounced(q.trim());
      setPage(1);
      setSearchPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q, genreIds, ratingFrom, status]);

  // 2. Fetch Page (Server Mode)
  useEffect(() => {
    if (isSearchMode) return;
    let cancelled = false;

    (async () => {
      try {
        setLoadingPage(true);
        const { data, meta } = await fetchPageCached(page);
        if (cancelled) return;

        setRows(data);
        const tp = meta?.totalPages ?? 1;
        setTotalPages(tp);
        setHasPrev(page > 1);
        setHasNext(page < tp);
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoadingPage(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, isSearchMode, fetchPageCached, reloadTick]);

  // 3. Fetch All & Filter (Search Mode)
  useEffect(() => {
    if (!isSearchMode) return;
    let cancelled = false;

    (async () => {
      try {
        setLoadingSearch(true);
        if (!metaRef.current) await fetchPageCached(1);
        const tp = metaRef.current?.totalPages ?? 1;

        const results = await Promise.all(
          Array.from({ length: tp }, (_, i) => fetchPageCached(i + 1))
        );
        if (cancelled) return;

        const all = results.flatMap((r) => r.data);
        const s = qDebounced.toLowerCase();

        const filtered = all.filter((m) => {
          if (s && !m.title.toLowerCase().includes(s)) return false;
          if (genreIds.length) {
            const ok = m.genres?.some((g) => genreIds.includes(String(g.id)));
            if (!ok) return false;
          }
          if (ratingFrom !== null && (m.rating ?? 0) < ratingFrom) return false;

          if (status !== "__ALL__" && m.status !== status) return false;
          return true;
        });

        setSearchAll(filtered);
        setSearchTotalPages(
          Math.max(1, Math.ceil(filtered.length / SEARCH_LIMIT))
        );
        setRows(filtered.slice(0, SEARCH_LIMIT));
        setTotalPages(1);
        setSearchPage(1);
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setRows([]);
          setSearchAll([]);
        }
      } finally {
        if (!cancelled) setLoadingSearch(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    qDebounced,
    isSearchMode,
    genreIds,
    ratingFrom,
    status,
    fetchPageCached,
    reloadTick,
  ]);

  // 4. Client Pagination for Search results
  useEffect(() => {
    if (!isSearchMode) return;
    const start = (searchPage - 1) * SEARCH_LIMIT;
    setRows(searchAll.slice(start, start + SEARCH_LIMIT));
  }, [isSearchMode, searchPage, searchAll]);

  // 5. Fetch Genres
  useEffect(() => {
    (async () => {
      try {
        const res = await genreService.getAllGenres();
        setAllGenres(res.data ?? []);
      } catch {
        console.log("Không tải được thể loại");
      }
    })();
  }, []);

  // ------------ Actions ------------

  const reloadCurrent = async () => {
    setReloadTick((x) => x + 1);
    if (isSearchMode) setQDebounced((s) => s);
    else setPage((p) => p);
  };

  const handleRefresh = async () => {
    setGlobalLoading(true);
    clearCache();
    await reloadCurrent();
    setGlobalLoading(false);
  };

  const clearFilters = () => {
    setQ("");
    setGenreIds([]);
    setRatingFrom(null);
    setStatus("__ALL__");
    setSearchPage(1);
  };

  // Navigation
  const handleAddNavigate = () => router.push("/admin/movies/new");
  const handleViewNavigate = (m: Movie) => router.push(`/admin/movies/${m.id}`);
  const handleEditNavigate = (m: Movie) =>
    router.push(`/admin/movies/${m.id}/edit`);

  // Optimistic UI Patch
  const applyMoviePatch = (id: Movie["id"], patch: Partial<Movie>) => {
    // Update cache
    for (const [k, arr] of pageCache.current.entries()) {
      const idx = arr.findIndex((x) => x.id === id);
      if (idx !== -1) {
        const next = arr.slice();
        next[idx] = { ...next[idx], ...patch };
        pageCache.current.set(k, next);
      }
    }
    // Update current rows
    setRows((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    // Update search list
    setSearchAll((prev) => {
      if (!isSearchMode || !prev?.length) return prev;
      return prev.map((x) => (x.id === id ? { ...x, ...patch } : x));
    });
  };

  // Dialog Helper
  const openConfirm = (
    title: string,
    message: React.ReactNode,
    action: () => void
  ) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setOnConfirm(() => action);
    setIsConfirmDialogOpen(true);
  };

  // CRUD Actions
  const handleDelete = (m: Movie) => {
    openConfirm(
      "Xác nhận lưu trữ",
      <>Bạn có chắc chắn muốn lưu trữ phim này không?</>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          await movieService.deleteMovie(m.id);
          applyMoviePatch(m.id, { isActive: false });
          setDialogTitle("Thành công");
          setDialogMessage("Xóa phim thành công");
          setIsSuccessDialogOpen(true);
        } catch (err) {
          alert("Thao tác thất bại: " + err);
        }
      }
    );
  };

  const handleRestore = (m: Movie) => {
    openConfirm(
      "Xác nhận khôi phục",
      <>Bạn có chắc chắn muốn khôi phục phim này không?</>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          await movieService.restoreMovie(m.id);
          applyMoviePatch(m.id, { isActive: true });
          setDialogTitle("Thành công");
          setDialogMessage("Khôi phục phim thành công");
          setIsSuccessDialogOpen(true);
        } catch (err) {
          alert("Thao tác thất bại: " + err);
        }
      }
    );
  };

  // Bulk Actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const selectionMode = selectedIds.size > 0;

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (checked) {
        s.add(id);
      } else {
        s.delete(id);
      }
      return s;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const toggleAllOnPage = (checked: boolean) => {
    const pageIds = rows.map((r) => r.id);
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (checked) pageIds.forEach((id) => s.add(id));
      else pageIds.forEach((id) => s.delete(id));
      return s;
    });
  };

  const applyLocalStatus = (ids: string[], nextStatus: string) => {
    const idset = new Set(ids);
    setRows((prev) =>
      prev.map((m) => (idset.has(m.id) ? { ...m, status: nextStatus } : m))
    );
    for (const [p, list] of pageCache.current.entries()) {
      pageCache.current.set(
        p,
        list.map((m) => (idset.has(m.id) ? { ...m, status: nextStatus } : m))
      );
    }
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    try {
      setGlobalLoading(true);
      const ids = Array.from(selectedIds);
      await movieService.updateMovieStatus(ids, bulkStatus);
      applyLocalStatus(ids, bulkStatus);
      clearSelection();
      clearCache();
      await reloadCurrent();
    } catch (e) {
      console.error(e);
      toast.error("Thao tác thất bại");
    } finally {
      setGlobalLoading(false);
    }
  };

  return {
    // Data & Loading
    rows,
    allGenres,
    loadingPage,
    loadingSearch,
    globalLoading,
    isSearchMode,
    canClearFilters,

    // Paging
    page,
    setPage,
    totalPages,
    hasPrev,
    hasNext,
    searchPage,
    setSearchPage,
    searchTotalPages,

    // Filters
    q,
    setQ,
    genreIds,
    setGenreIds,
    ratingFrom,
    setRatingFrom,
    status,
    setStatus,
    clearFilters,

    // Actions
    handleRefresh,
    handleAddNavigate,
    handleViewNavigate,
    handleEditNavigate,
    handleDelete,
    handleRestore,

    // Selection & Bulk
    selectedIds,
    selectionMode,
    bulkStatus,
    setBulkStatus,
    toggleOne,
    toggleAllOnPage,
    clearSelection,
    handleBulkUpdate,

    // Dialogs
    isConfirmDialogOpen,
    setIsConfirmDialogOpen,
    isSuccessDialogOpen,
    setIsSuccessDialogOpen,
    dialogTitle,
    dialogMessage,
    onConfirm,
  };
}
