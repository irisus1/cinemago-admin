// app/(admin)/admin/movies/page.tsx
"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Table, { Column } from "@/components/Table";
import { FiEdit2, FiTrash2, FiEye } from "react-icons/fi";
import { BiRefresh } from "react-icons/bi";
import RefreshLoader from "@/components/Loading";
import {
  genreService,
  movieService,
  type Movie,
  Genre,
  PaginationMeta,
} from "@/services";
import GenreMultiSelect from "@/components/GenreMultiSelect";
import { Modal } from "@/components/Modal";

// ===== Types =====

const VI_MOVIE_STATUS = {
  COMING_SOON: "Sắp chiếu",
  NOW_SHOWING: "Đang chiếu",
  ENDED: "Đã kết thúc",
} as const;

const limit = 7; // << CHANGED: kích thước trang cố định

const MoviesListPage: React.FC = () => {
  const router = useRouter();

  // ------------ Dialogs ------------
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => {});
  const [globalLoading, setGlobalLoading] = useState(false);
  const [allGenres, setAllGenres] = useState<Genre[]>([]);

  // ------------ Paging & Search (NEW) ------------
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Movie[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [hasPrev, setHasPrev] = useState(false);
  const [hasNext, setHasNext] = useState(false);

  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [loadingPage, setLoadingPage] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const [searchAll, setSearchAll] = useState<Movie[]>([]);
  const SEARCH_LIMIT = 7; // số mục trên mỗi trang khi search

  //------------ Filter states ------------
  const [genreIds, setGenreIds] = useState<string[]>([]); // nhiều thể loại
  const [ratingFrom, setRatingFrom] = useState<number | "">(""); // điểm tối thiểu
  const [status, setStatus] = useState<string>("");
  const [reloadTick, setReloadTick] = useState(0);

  const hasAnyFilter =
    qDebounced.length > 0 ||
    genreIds.length > 0 ||
    ratingFrom !== "" ||
    !!status;

  const isSearchMode = hasAnyFilter;

  // ------------ cache ------------
  const pageCache = useRef(new Map<number, Movie[]>()); // page -> rows
  const metaRef = useRef<PaginationMeta | null>(null); // meta phân trang mới nhất
  const inFlight = useRef(
    new Map<number, Promise<{ data: Movie[]; meta: PaginationMeta }>>()
  );

  function clearCache() {
    pageCache.current.clear();
    metaRef.current = null;
    inFlight.current.clear();
  }

  const fetchPage = useCallback(async (p: number) => {
    const res = await movieService.getAllMovies({ page: p, limit });
    const { data, pagination } = res;
    console.log(data);

    return { data: data ?? [], pagination };
  }, []);

  const fetchPageCached = useCallback(
    async (p: number) => {
      // 1) cache hit
      const hit = pageCache.current.get(p);
      if (hit) {
        console.log(`[cache] HIT page=${p} size=${hit.length}`);
        const meta = metaRef.current ?? {
          totalItems: hit.length,
          totalPages: 1,
          pageSize: limit,
        };
        return { data: hit, meta };
      }

      // 2) đang có request bay -> tận dụng
      const inflight = inFlight.current.get(p);
      if (inflight) {
        console.log(`[cache] IN-FLIGHT page=${p} (dedup)`);
        return inflight;
      }

      // 3) gọi thật -> lưu cache
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
        console.log(`[cache] STORE page=${p} size=${data.length}`, meta);
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

  // debounce 300ms & reset về trang 1 khi đổi từ khoá
  useEffect(() => {
    const t = setTimeout(() => {
      setQDebounced(q.trim());
      setPage(1);
      setSearchPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q, genreIds, ratingFrom, status]);

  // ----- Không search: tải 1 trang từ server -----
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
          setTotalPages(1);
          setHasPrev(false);
          setHasNext(false);
        }
      } finally {
        if (!cancelled) setLoadingPage(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, isSearchMode, fetchPageCached, reloadTick]);

  // ----- Có search: gom ALL trang & filter client -----
  useEffect(() => {
    if (!isSearchMode) return;
    let cancelled = false;
    console.log(genreIds);

    (async () => {
      try {
        setLoadingSearch(true);

        // đảm bảo đã có meta (nếu chưa có thì lấy trang 1)
        if (!metaRef.current) {
          await fetchPageCached(1);
        }
        const tp = metaRef.current?.totalPages ?? 1;

        // gom dữ liệu từ cache/HTTP cho TẤT CẢ trang
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

          if (ratingFrom !== "" && (m.rating ?? 0) < Number(ratingFrom)) {
            return false;
          }

          if (status && m.status !== status) {
            return false;
          }

          return true;
        });

        setSearchAll(filtered);
        setSearchTotalPages(
          Math.max(1, Math.ceil(filtered.length / SEARCH_LIMIT))
        );
        setRows(filtered.slice(0, SEARCH_LIMIT));
        setTotalPages(1);
        setHasPrev(false);
        setHasNext(false);
        setSearchPage(1);
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setRows([]);
          setSearchAll([]);
          setSearchTotalPages(1);
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

  // ------------ fetchGenre ------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setGlobalLoading(true);

        // Tùy API của bạn: ví dụ trả { data: Genre[] }
        const res = await genreService.getAllGenres();

        const list: Genre[] = res.data ?? [];

        if (!cancelled) setAllGenres(list);
      } catch {
        if (!cancelled) console.log("Không tải được thể loại");
      } finally {
        if (!cancelled) setGlobalLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ------------ Actions ------------
  const reloadCurrent = async () => {
    setReloadTick((x) => x + 1);
    // tải lại theo trạng thái hiện tại (search hay không)
    if (isSearchMode) {
      setQDebounced((s) => s); // kích hoạt lại effect search
    } else {
      setPage((p) => p); // kích hoạt lại effect page
    }
  };

  const handleAddNavigate = () => {
    router.push("/admin/movies/new");
  };

  const handleViewNavigate = (movie: Movie) => {
    router.push(`/admin/movies/${movie.id}`);
  };

  const handleEditNavigate = (movie: Movie) => {
    router.push(`/admin/movies/${movie.id}/edit`);
  };

  const handleRefresh = async () => {
    setGlobalLoading(true);
    clearCache();
    reloadCurrent();
    setGlobalLoading(false);
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

  const applyMoviePatch = (id: Movie["id"], patch: Partial<Movie>) => {
    //Cập nhật toàn bộ pageCache
    for (const [k, arr] of pageCache.current.entries()) {
      const idx = arr.findIndex((x) => x.id === id);
      if (idx !== -1) {
        const next = arr.slice();
        next[idx] = { ...next[idx], ...patch };
        pageCache.current.set(k, next);
      }
    }

    // Cập nhật hàng đang hiển thị
    setRows((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));

    // Nếu đang search: cập nhật searchAll + repaginate theo filter hiện tại
    setSearchAll((prev) => {
      if (!isSearchMode || !prev?.length) return prev;
      const patched = prev.map((x) => (x.id === id ? { ...x, ...patch } : x));

      // re-apply filter hiện tại (nếu bạn đang lọc theo status,…)
      const s = qDebounced.toLowerCase();
      const filtered = patched.filter((m) => {
        if (s && !m.title.toLowerCase().includes(s)) return false;
        if (
          genreIds.length &&
          !m.genres?.some((g) => genreIds.includes(String(g.id)))
        )
          return false;
        if (ratingFrom !== "" && (m.rating ?? 0) < Number(ratingFrom))
          return false;
        if (status && m.status !== status) return false;
        return true;
      });
      const tp = Math.max(1, Math.ceil(filtered.length / SEARCH_LIMIT));
      setSearchTotalPages(tp);
      const start = (searchPage - 1) * SEARCH_LIMIT;
      setRows(filtered.slice(start, start + SEARCH_LIMIT));
      return filtered;
    });
  };

  const handleDelete = (m: Movie) => {
    openConfirm(
      "Xác nhận xóa",
      <>
        Bạn có chắc chắn muốn xóa phim này không?
        <br />
        Việc này không thể trở lại.
      </>,
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

  // === Bulk selection state ===
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

  const pageIds = rows.map((r) => r.id);
  const allChecked =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someChecked = pageIds.some((id) => selectedIds.has(id)) && !allChecked;

  const toggleAllOnPage = (checked: boolean) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (checked) pageIds.forEach((id) => s.add(id));
      else pageIds.forEach((id) => s.delete(id));
      return s;
    });
  };

  const [bulkStatus, setBulkStatus] = useState<string>(""); // trạng thái đích

  async function handleBulkUpdate() {
    if (!bulkStatus || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);

    try {
      setGlobalLoading(true);

      //  gọi API cập nhật
      await movieService.updateMovieStatus(ids, bulkStatus);

      //  cập nhật UI ngay (optimistic)
      applyLocalStatus(ids, bulkStatus);

      //  dọn state chọn & refetch dữ liệu mới
      clearSelection();
      clearCache();
      await reloadCurrent();
    } catch (e) {
      console.error(e);
      toast.error("Thao tác thất bại");
    } finally {
      setGlobalLoading(false);
    }
  }

  function applyLocalStatus(ids: string[], nextStatus: string) {
    const idset = new Set(ids);

    // cập nhật list đang hiển thị
    setRows((prev) =>
      prev.map((m) => (idset.has(m.id) ? { ...m, status: nextStatus } : m))
    );

    // cập nhật cache theo trang (nếu có)
    for (const [p, list] of pageCache.current.entries()) {
      pageCache.current.set(
        p,
        list.map((m) => (idset.has(m.id) ? { ...m, status: nextStatus } : m))
      );
    }
  }

  // ===== Table columns =====
  const columns: Column<Movie>[] = [
    {
      header: (
        // checkbox "chọn tất cả" (indeterminate)
        <input
          type="checkbox"
          aria-label="Chọn tất cả"
          ref={(el) => {
            if (el) el.indeterminate = someChecked;
          }}
          checked={allChecked}
          onChange={(e) => toggleAllOnPage(e.currentTarget.checked)}
        />
      ),
      key: "__select",
      render: (_: unknown, row: Movie) => (
        <input
          type="checkbox"
          aria-label={`Chọn ${row.title}`}
          checked={selectedIds.has(row.id)}
          onChange={(e) => toggleOne(row.id, e.currentTarget.checked)}
        />
      ),
    },
    { header: "Tên phim", key: "title" },
    { header: "Thời lượng", key: "duration" },
    {
      header: "Công chiếu",
      key: "releaseDate",
      render: (_, row) =>
        Intl.DateTimeFormat("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
          .format(new Date(row.releaseDate))
          .replace(/\//g, "-"),
    },
    {
      header: "Thể loại",
      key: "genres",
      render: (value: unknown, row: Movie) => {
        const list = Array.isArray(value)
          ? (value as Genre[])
          : Array.isArray(row.genres)
          ? row.genres
          : undefined;
        return list?.map((g) => g.name).join(", ") ?? "—";
      },
    },
    { header: "Đánh giá", key: "rating" },
    {
      header: "Trạng thái",
      key: "status",
      render: (_: unknown, m: Movie) => (
        <span
          className={
            m.status === "NOW_SHOWING"
              ? "inline-flex rounded-full px-2 py-0.5 bg-emerald-50 text-emerald-700"
              : m.status === "COMING_SOON"
              ? "inline-flex rounded-full px-2 py-0.5 bg-amber-50 text-amber-700"
              : "inline-flex rounded-full px-2 py-0.5 bg-slate-100 text-slate-600"
          }
        >
          {VI_MOVIE_STATUS[m.status as keyof typeof VI_MOVIE_STATUS] ??
            m.status}
        </span>
      ),
    },
    {
      header: "Hành động",
      key: "actions",
      render: (_: unknown, row: Movie) => (
        <div className="flex space-x-3">
          {row.isActive ? (
            <>
              <button
                className="text-green-600 hover:text-green-800"
                onClick={() => handleViewNavigate(row)}
                title="Xem chi tiết"
              >
                <FiEye className="w-4 h-4" />
              </button>
              <button
                className="text-blue-600 hover:text-blue-800"
                onClick={() => handleEditNavigate(row)}
                title="Chỉnh sửa"
              >
                <FiEdit2 className="w-4 h-4" />
              </button>
              <button
                className="text-red-600 hover:text-red-800"
                onClick={() => handleDelete(row)}
                title="Xóa"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              className="text-green-600 hover:text-green-800"
              onClick={() => handleRestore(row)}
              title="Khôi phục"
            >
              <BiRefresh className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // ===== Render =====
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 pb-6">
          Danh sách phim
        </h2>

        <div className="grid w-full grid-cols-[1fr_auto] gap-x-4 gap-y-3">
          {/* LEFT: filters (wrap khi thiếu chỗ) */}
          <div className="flex flex-wrap items-center gap-4 min-w-0">
            <button
              onClick={handleRefresh}
              className="h-10 w-10 grid place-items-center rounded-lg border hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={globalLoading}
              title="Làm mới"
            >
              <BiRefresh
                className={`text-3xl ${
                  globalLoading
                    ? "animate-spin"
                    : "hover:rotate-180 transition-transform duration-300"
                }`}
              />
            </button>

            <div className="min-w-0 w-[280px]">
              <input
                type="text"
                placeholder="Tên phim…"
                disabled={selectionMode}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full h-10 px-4 rounded-lg focus:outline-none border disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div className="min-w-0 w-[320px]">
              <GenreMultiSelect
                options={allGenres}
                value={genreIds}
                onChange={setGenreIds}
                className="w-full" // để full theo wrapper
                disabled={selectionMode}
              />
            </div>

            <input
              type="number"
              min={0}
              max={10}
              step={1}
              placeholder="Đánh giá ≥"
              disabled={selectionMode}
              value={ratingFrom}
              onChange={(e) =>
                setRatingFrom(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              className="w-[120px] h-10 px-3 rounded-lg border disabled:opacity-60 disabled:cursor-not-allowed"
            />

            <select
              value={selectionMode ? bulkStatus : status}
              onChange={(e) => {
                const v = e.target.value as string;
                if (selectionMode) setBulkStatus(v || "");
                else setStatus(v);
              }}
              className="h-10 w-[200px] px-3 rounded-lg border disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label={
                selectionMode
                  ? "Chọn trạng thái cập nhật"
                  : "Lọc theo trạng thái"
              }
            >
              <option value="" disabled={selectionMode}>
                Trạng thái: Tất cả
              </option>
              <option value="COMING_SOON">Sắp chiếu</option>
              <option value="NOW_SHOWING">Đang chiếu</option>
              <option value="ENDED">Đã kết thúc</option>
            </select>
          </div>

          {/* RIGHT: actions (giữ hàng 1, góc phải) */}
          <div className="flex items-center gap-3 justify-self-end self-start">
            <button
              className="px-4 h-10 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              onClick={() => {
                setQ("");
                setGenreIds([]);
                setRatingFrom("");
                setStatus("");
                setSearchPage(1);
              }}
            >
              Xóa lọc
            </button>
            <button
              className="px-4 h-10 bg-black text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              onClick={handleAddNavigate}
            >
              Thêm phim +
            </button>
          </div>
        </div>
      </div>

      {selectionMode && (
        <div className="mt-3 flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
          <span className="text-sm">
            Đã chọn <b>{selectedIds.size}</b> phim
          </span>

          <button
            onClick={handleBulkUpdate}
            disabled={!bulkStatus || globalLoading}
            className="h-10 px-4 rounded-lg bg-black text-white disabled:opacity-50"
          >
            Cập nhật
          </button>

          <button
            onClick={clearSelection}
            className="h-10 px-4 rounded-lg bg-gray-200 hover:bg-gray-300"
          >
            Hủy
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <Table<Movie> columns={columns} data={rows} getRowKey={(r) => r.id} />{" "}
        {(loadingPage || loadingSearch) && (
          <div className="flex items-center gap-2 px-6 py-3 text-sm text-gray-600">
            <span className="inline-block h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
            {isSearchMode
              ? "Đang tìm kiếm trên toàn bộ dữ liệu…"
              : "Đang tải trang…"}
          </div>
        )}
        {/* PHÂN TRANG */}
        {rows.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50">
            {isSearchMode ? (
              <>
                <button
                  onClick={() => setSearchPage((p) => Math.max(1, p - 1))}
                  disabled={searchPage === 1 || loadingSearch}
                  className="px-4 py-2 text-sm text-gray-600 bg-white rounded-lg shadow-sm disabled:opacity-50"
                >
                  Trước
                </button>
                <span className="text-sm text-gray-600">
                  Trang {searchPage} trên {searchTotalPages} (kết quả tìm kiếm)
                </span>
                <button
                  onClick={() =>
                    setSearchPage((p) => Math.min(searchTotalPages, p + 1))
                  }
                  disabled={searchPage === searchTotalPages || loadingSearch}
                  className="px-4 py-2 text-sm text-gray-600 bg-white rounded-lg shadow-sm disabled:opacity-50"
                >
                  Tiếp
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!hasPrev || loadingPage}
                  className="px-4 py-2 text-sm text-gray-600 bg-white rounded-lg shadow-sm disabled:opacity-50"
                >
                  Trước
                </button>
                <span className="text-sm text-gray-600">
                  Trang {page} trên {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => (hasNext ? p + 1 : p))}
                  disabled={!hasNext || loadingPage}
                  className="px-4 py-2 text-sm text-gray-600 bg-white rounded-lg shadow-sm disabled:opacity-50"
                >
                  Tiếp
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        type="info"
        title={dialogTitle}
        message={dialogMessage}
        onCancel={() => setIsConfirmDialogOpen(false)}
        cancelText="Hủy"
        onConfirm={() => {
          onConfirm();
          setIsConfirmDialogOpen(false);
        }}
        confirmText="Xác nhận"
      />

      <Modal
        isOpen={isSuccessDialogOpen}
        onClose={() => setIsSuccessDialogOpen(false)}
        type="success"
        title={dialogTitle}
        message={dialogMessage}
        onConfirm={() => {
          setIsSuccessDialogOpen(false);
          setReloadTick((x) => x + 1);
        }}
        confirmText="Đóng"
      />

      <RefreshLoader isOpen={globalLoading} />
    </div>
  );
};

export default MoviesListPage;
