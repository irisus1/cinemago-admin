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

const LIMIT = 7;
const SEARCH_LIMIT = 7;

export function useMovieLogic() {
  const router = useRouter();

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => { });
  const [globalLoading, setGlobalLoading] = useState(false);

  const [rows, setRows] = useState<Movie[]>([]);
  const [allGenres, setAllGenres] = useState<Genre[]>([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasPrev, setHasPrev] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [loadingPage, setLoadingPage] = useState(false);

  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const [searchAll, setSearchAll] = useState<Movie[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [genreIds, setGenreIds] = useState<string[]>([]);
  const [ratingFrom, setRatingFrom] = useState<number | null>(null);
  const [status, setStatus] = useState<
    "__ALL__" | "COMING_SOON" | "NOW_SHOWING" | "ENDED"
  >("__ALL__");
  const [reloadTick, setReloadTick] = useState(0);

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

  const pageCache = useRef(new Map<number, Movie[]>());
  const metaRef = useRef<PaginationMeta | null>(null);
  const inFlight = useRef(
    new Map<number, Promise<{ data: Movie[]; meta: PaginationMeta }>>()
  );

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
      const hit = pageCache.current.get(p);
      if (hit) {
        const meta = metaRef.current ?? {
          totalItems: hit.length,
          totalPages: 1,
          pageSize: LIMIT,
        };
        return { data: hit, meta };
      }

      const inflight = inFlight.current.get(p);
      if (inflight) return inflight;

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

  useEffect(() => {
    const t = setTimeout(() => {
      setQDebounced(q.trim());
      setPage(1);
      setSearchPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q, genreIds, ratingFrom, status]);

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

  useEffect(() => {
    if (!isSearchMode) return;
    const start = (searchPage - 1) * SEARCH_LIMIT;
    setRows(searchAll.slice(start, start + SEARCH_LIMIT));
  }, [isSearchMode, searchPage, searchAll]);

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

  const handleAddNavigate = () => router.push("/admin/movies/new");
  const handleViewNavigate = (m: Movie) => router.push(`/admin/movies/${m.id}`);
  const handleEditNavigate = (m: Movie) =>
    router.push(`/admin/movies/${m.id}/edit`);

  const applyMoviePatch = (id: Movie["id"], patch: Partial<Movie>) => {
    for (const [k, arr] of pageCache.current.entries()) {
      const idx = arr.findIndex((x) => x.id === id);
      if (idx !== -1) {
        const next = arr.slice();
        next[idx] = { ...next[idx], ...patch };
        pageCache.current.set(k, next);
      }
    }
    setRows((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    setSearchAll((prev) => {
      if (!isSearchMode || !prev?.length) return prev;
      return prev.map((x) => (x.id === id ? { ...x, ...patch } : x));
    });
  };

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

  const handleDelete = (m: Movie) => {
    openConfirm(
      "Xác nhận lưu trữ",
      <>Bạn có chắc chắn muốn lưu trữ phim này không?</>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          await movieService.deleteMovie(m.id);
          applyMoviePatch(m.id, { isActive: false });
          applyMoviePatch(m.id, { isActive: false });
          toast.success("Xóa phim thành công");
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
          applyMoviePatch(m.id, { isActive: true });
          toast.success("Khôi phục phim thành công");
        } catch (err) {
          alert("Thao tác thất bại: " + err);
        }
      }
    );
  };

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
    rows,
    allGenres,
    loadingPage,
    loadingSearch,
    globalLoading,
    isSearchMode,
    canClearFilters,

    page,
    setPage,
    totalPages,
    hasPrev,
    hasNext,
    searchPage,
    setSearchPage,
    searchTotalPages,

    q,
    setQ,
    genreIds,
    setGenreIds,
    ratingFrom,
    setRatingFrom,
    status,
    setStatus,
    clearFilters,

    handleRefresh,
    handleAddNavigate,
    handleViewNavigate,
    handleEditNavigate,
    handleDelete,
    handleRestore,

    selectedIds,
    selectionMode,
    bulkStatus,
    setBulkStatus,
    toggleOne,
    toggleAllOnPage,
    clearSelection,
    handleBulkUpdate,

    isConfirmDialogOpen,
    setIsConfirmDialogOpen,

    dialogTitle,
    dialogMessage,
    onConfirm,
  };
}
