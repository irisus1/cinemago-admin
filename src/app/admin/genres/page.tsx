// app/(admin)/admin/genres/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Table, { Column } from "@/components/Table";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { BiRefresh } from "react-icons/bi";
import RefreshLoader from "@/components/Loading";
import { Modal } from "@/components/Modal";
import GenreModal from "@/components/GenreModal";
import { genreService, type Genre, PaginationMeta } from "@/services";

// ===== Types =====

const GenresListPage: React.FC = () => {
  // Data & filters
  const [genres, setGenres] = useState<Genre[]>([]);
  const [queryName, setQueryName] = useState("");
  const [time, setTime] = useState("");

  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(7);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal (create/edit)
  const [open, setOpen] = useState(false);
  const [editGenre, setEditGenre] = useState<Genre | null>(null);

  // Confirm/Success dialogs
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState<React.ReactNode>("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => {});

  // ===== Data fetching =====
  const fetchGenres = async (toPage = page) => {
    try {
      setLoading(true);
      const { data, pagination } = await genreService.getAllGenres({
        page: toPage,
        limit: pageSize,
        search: queryName.trim() || undefined,
      });

      console.log(data, pagination);

      setGenres(data ?? []);
      setPagination(pagination ?? null);
      setTotalPages(pagination?.totalPages ?? 1);
      setTotalItems(pagination?.totalItems ?? 0);
      if (pagination?.currentPage && pagination.currentPage !== page) {
        setPage(pagination.currentPage); // đồng bộ nếu backend normalize
      }
      return { items: data ?? [], pagination };
    } catch (e) {
      console.error(e);
      setGenres([]);
      setPagination(null);
      setTotalPages(1);
      setTotalItems(0);
      return { items: [], pagination: null };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGenres();
  }, [page, queryName]);
  useEffect(() => {
    setPage(1);
  }, [queryName]);

  useEffect(() => {
    const t = setTimeout(() => setQueryName(time), 300);
    return () => clearTimeout(t);
  }, [time]);

  // ===== Handlers =====
  const handleAddOpen = () => {
    setEditGenre(null);
    setOpen(true);
  };

  const handleEditOpen = (g: Genre) => {
    setEditGenre(g);
    setOpen(true);
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchGenres();
    setLoading(false);
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

  const handleDelete = (g: Genre) => {
    openConfirm(
      "Xác nhận xóa",
      <>Bạn có chắc muốn xóa thể loại này không ?</>,
      async () => {
        setIsConfirmDialogOpen(false);
        try {
          await genreService.deleteGenre(g.id);
          // flip isActive tại chỗ
          setGenres((prev) =>
            prev.map((it) => (it.id === g.id ? { ...it, isActive: false } : it))
          );
          setDialogTitle("Thành công");
          setDialogMessage("Đã xóa thể loại.");
          setIsSuccessDialogOpen(true);
          // Nếu cần đồng bộ lại tổng số từ server thì gọi thêm: await fetchGenres();
        } catch (err) {
          alert("Thao tác thất bại: " + err);
        }
      }
    );
  };

  const handleRestore = (g: Genre) => {
    openConfirm("Xác nhận khôi phục", <>Khôi phục…</>, async () => {
      setIsConfirmDialogOpen(false);
      try {
        await genreService.restoreGenre(g.id);
        setGenres((prev) =>
          prev.map((it) => (it.id === g.id ? { ...it, isActive: true } : it))
        );
        setDialogTitle("Thành công");
        setDialogMessage("Khôi phục thể loại thành công");
        setIsSuccessDialogOpen(true);
        // cần thì gọi: await fetchGenres();
      } catch (err) {
        alert("Thao tác thất bại: " + err);
      }
    });
  };

  const clearFilters = () => setQueryName("");

  // ===== Table columns =====
  const columns: Column<Genre>[] = [
    { header: "Tên thể loại", key: "name" },
    { header: "Mô tả", key: "description" },
    {
      header: "Hành động",
      className: "w-[120px] text-right",
      key: "actions",
      render: (_: unknown, row: Genre) => (
        <div className="flex gap-2 items-center">
          {row.isActive ? (
            <>
              <button
                className="text-blue-600 hover:text-blue-800"
                onClick={() => handleEditOpen(row)}
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
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          Danh sách thể loại
        </h2>

        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              className="p-3 rounded-full hover:bg-gray-100 transition-all duration-300"
              disabled={loading}
              title="Làm mới"
            >
              <BiRefresh
                className={`text-3xl ${
                  loading
                    ? "animate-spin"
                    : "hover:rotate-180 transition-transform duration-300"
                }`}
              />
            </button>

            <div className="w-[280px]">
              <input
                type="text"
                placeholder="Tên thể loại…"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-2 rounded-lg focus:outline-none border"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              onClick={clearFilters}
            >
              Xóa lọc
            </button>
            <button
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              onClick={handleAddOpen}
            >
              Thêm thể loại +
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <Table<Genre> columns={columns} data={genres} getRowKey={(r) => r.id} />

        {totalItems > 0 && (
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50">
            <button
              onClick={() =>
                pagination?.hasPrevPage && setPage((p) => Math.max(1, p - 1))
              }
              disabled={!pagination?.hasPrevPage || loading}
              className="px-4 py-2 text-sm text-gray-600 bg-white rounded-lg shadow-sm disabled:opacity-50"
            >
              Trước
            </button>

            <div className="text-sm text-gray-600">
              Trang {pagination?.currentPage ?? page} / {totalPages}
            </div>

            <button
              onClick={() => pagination?.hasNextPage && setPage((p) => p + 1)}
              disabled={!pagination?.hasNextPage || loading}
              className="px-4 py-2 text-sm text-gray-600 bg-white rounded-lg shadow-sm disabled:opacity-50"
            >
              Tiếp
            </button>
          </div>
        )}
      </div>

      {/* Confirm & Success */}
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
        onCancel={() => setIsSuccessDialogOpen(false)}
        cancelText="Đóng"
      />

      {/* Modal Thêm/Sửa */}
      <GenreModal
        open={open}
        onClose={() => setOpen(false)}
        mode={editGenre ? "edit" : "create"}
        genre={editGenre ?? undefined}
        onSuccess={async () => {
          setOpen(false);
          setEditGenre(null);
          await fetchGenres(); // reload list
        }}
      />

      <RefreshLoader isOpen={loading} />
    </div>
  );
};

export default GenresListPage;
