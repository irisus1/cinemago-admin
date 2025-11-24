"use client";

import React from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { BiRefresh } from "react-icons/bi";

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
    time,
    setTime,
    open,
    setOpen,
    editGenre,
    isConfirmDialogOpen,
    setIsConfirmDialogOpen,
    isSuccessDialogOpen,
    setIsSuccessDialogOpen,
    isErrorDialogOpen,
    setIsErrorDialogOpen,
    dialogTitle,
    dialogMessage,
    onConfirm,
    handleRefresh,
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
        isOpen={isSuccessDialogOpen}
        onClose={() => setIsSuccessDialogOpen(false)}
        type="success"
        title={dialogTitle}
        message={dialogMessage}
        confirmText="Đóng"
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
