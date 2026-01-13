"use client";

import React from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { BiRefresh } from "react-icons/bi";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Table, { Column } from "@/components/Table";
import RefreshLoader from "@/components/Loading";
import { Modal } from "@/components/Modal";
import GenreModal from "@/components/modal/GenreModal";
import { type Genre } from "@/services";
import { useGenreLogic } from "@/hooks/useGenreLogic";

const GenresListPage: React.FC = () => {
  const {
    genres,
    loading,
    page,
    setPage,
    pagination,
    totalPages,
    totalItems,
    genre,
    setGenre,
    open,
    setOpen,
    editGenre,
    isConfirmDialogOpen,
    setIsConfirmDialogOpen,

    isErrorDialogOpen,
    setIsErrorDialogOpen,
    dialogTitle,
    dialogMessage,
    onConfirm,
    canClearFilters,

    clearFilters,
    handleAddOpen,
    handleEditOpen,
    handleDelete,
    handleRestore,
    handleSubmitGenre,
  } = useGenreLogic();

  // Định nghĩa cột hiển thị
  const columns: Column<Genre>[] = [
    { header: "Tên thể loại", key: "name" },
    { header: "Mô tả", key: "description" },
    {
      header: "Hành động",
      className: "w-[120px]  text-center",
      key: "actions",
      render: (_: unknown, row: Genre) => (
        <div className="flex w-full  justify-center gap-2 items-center">
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

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          Danh sách thể loại
        </h2>

        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <div className="relative w-[240px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo tên thể loại…"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="h-10 w-full pl-8 pr-3 border-gray-400 rounded-lg border text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              className={
                "px-4 h-10 rounded-lg text-sm font-medium transition-colors " +
                (canClearFilters
                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed")
              }
              onClick={clearFilters}
              disabled={!canClearFilters}
            >
              Xóa lọc
            </button>

            <Button className="h-10 px-4" onClick={handleAddOpen}>
              <Plus className="w-4 h-4 mr-1" />
              Thêm thể loại
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <Table<Genre> columns={columns} data={genres} getRowKey={(r) => r.id} />

        {totalItems > 0 && (
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
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

      <Modal
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        type="info"
        title={dialogTitle}
        message={dialogMessage}
        onCancel={() => {
          setIsConfirmDialogOpen(false);
          setOpen(true);
        }}
        cancelText="Hủy"
        onConfirm={() => {
          onConfirm();
          setIsConfirmDialogOpen(false);
        }}
        confirmText="Xác nhận"
      />



      <Modal
        isOpen={isErrorDialogOpen}
        onClose={() => setIsErrorDialogOpen(false)}
        type="error"
        title={dialogTitle}
        message={dialogMessage}
        confirmText="Đóng"
      />

      <GenreModal
        open={open}
        onClose={() => setOpen(false)}
        mode={editGenre ? "edit" : "create"}
        genre={editGenre ?? undefined}
        onSubmit={handleSubmitGenre}
      />

      <RefreshLoader isOpen={loading} />
    </div>
  );
};

export default GenresListPage;
