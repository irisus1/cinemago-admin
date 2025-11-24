"use client";

import React from "react";
import Table, { Column } from "@/components/Table";
import { FiEdit2, FiTrash2, FiEye } from "react-icons/fi";
import { BiRefresh } from "react-icons/bi";
import RefreshLoader from "@/components/Loading";
import { type Movie, Genre } from "@/services";
import GenreMultiSelect from "@/components/GenreMultiSelect";
import { Modal } from "@/components/Modal";
import { useMovieLogic } from "@/hooks/useMovieLogic";

const VI_MOVIE_STATUS = {
  COMING_SOON: "Sắp chiếu",
  NOW_SHOWING: "Đang chiếu",
  ENDED: "Đã kết thúc",
} as const;

const MoviesListPage: React.FC = () => {
  const {
    rows,
    allGenres,
    loadingPage,
    loadingSearch,
    globalLoading,
    isSearchMode,
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
    isSuccessDialogOpen,
    setIsSuccessDialogOpen,
    dialogTitle,
    dialogMessage,
    onConfirm,
  } = useMovieLogic();

  // Helper cho checkbox "Select All"
  const pageIds = rows.map((r) => r.id);
  const allChecked =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someChecked = pageIds.some((id) => selectedIds.has(id)) && !allChecked;

  // ===== Table Columns =====
  const columns: Column<Movie>[] = [
    {
      header: (
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
      render: (_, row) => (
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
        new Date(row.releaseDate)
          .toLocaleDateString("en-GB")
          .replace(/\//g, "-"),
    },
    {
      header: "Thể loại",
      key: "genres",
      render: (value, row) => {
        const list = Array.isArray(value)
          ? (value as Genre[])
          : (row.genres as Genre[]);
        return list?.map((g) => g.name).join(", ") ?? "—";
      },
    },
    { header: "Đánh giá", key: "rating" },
    {
      header: "Trạng thái",
      key: "status",
      render: (_, m) => (
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
      render: (_, row) => (
        <div className="flex space-x-3">
          {row.isActive ? (
            <>
              <button
                className="text-green-600 hover:text-green-800"
                onClick={() => handleViewNavigate(row)}
                title="Xem"
              >
                <FiEye className="w-4 h-4" />
              </button>
              <button
                className="text-blue-600 hover:text-blue-800"
                onClick={() => handleEditNavigate(row)}
                title="Sửa"
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

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 pb-6">
          Danh sách phim
        </h2>

        <div className="grid w-full grid-cols-[1fr_auto] gap-x-4 gap-y-3">
          {/* LEFT: filters */}
          <div className="flex flex-wrap items-center gap-4 min-w-0">
            <button
              onClick={handleRefresh}
              className="h-10 w-10 grid place-items-center rounded-lg border hover:bg-gray-50 disabled:opacity-60"
              disabled={globalLoading}
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
                className="w-full h-10 px-4 rounded-lg focus:outline-none border disabled:opacity-60"
              />
            </div>

            <div className="min-w-0 w-[320px]">
              <GenreMultiSelect
                options={allGenres}
                value={genreIds}
                onChange={setGenreIds}
                className="w-full"
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
              className="w-[120px] h-10 px-3 rounded-lg border disabled:opacity-60"
            />

            <select
              value={selectionMode ? bulkStatus : status}
              onChange={(e) =>
                selectionMode
                  ? setBulkStatus(e.target.value)
                  : setStatus(e.target.value)
              }
              className="h-10 w-[200px] px-3 rounded-lg border disabled:opacity-60"
            >
              <option value="" disabled={selectionMode}>
                Trạng thái: Tất cả
              </option>
              <option value="COMING_SOON">Sắp chiếu</option>
              <option value="NOW_SHOWING">Đang chiếu</option>
              <option value="ENDED">Đã kết thúc</option>
            </select>
          </div>

          {/* RIGHT: actions */}
          <div className="flex items-center gap-3 justify-self-end self-start">
            <button
              className="px-4 h-10 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              onClick={clearFilters}
            >
              Xóa lọc
            </button>
            <button
              className="px-4 h-10 bg-black text-white rounded-lg hover:bg-blue-700"
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
        <Table<Movie> columns={columns} data={rows} getRowKey={(r) => r.id} />

        {(loadingPage || loadingSearch) && (
          <div className="flex items-center gap-2 px-6 py-3 text-sm text-gray-600">
            <span className="inline-block h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
            {isSearchMode ? "Đang tìm kiếm..." : "Đang tải trang..."}
          </div>
        )}

        {rows.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
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
                  Trang {searchPage} / {searchTotalPages} (kết quả tìm kiếm)
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
                  Trang {page} / {totalPages}
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
          handleRefresh();
        }}
        confirmText="Đóng"
      />
      <RefreshLoader isOpen={globalLoading} />
    </div>
  );
};

export default MoviesListPage;
