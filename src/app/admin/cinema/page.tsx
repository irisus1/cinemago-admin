"use client";

import React from "react";
import Table, { Column } from "@/components/Table";
import { FiEdit2, FiTrash2, FiEye } from "react-icons/fi";
import { BiRefresh } from "react-icons/bi";

import RefreshLoader from "@/components/Loading";
import { Modal } from "@/components/Modal";
import CinemaModal from "@/components/modal/CinemaModal";
import { type Cinema } from "@/services";
import { useCinemaLogic } from "@/hooks/useCinemaLogic";

const CinemasListPage: React.FC = () => {
  const {
    mode,
    displayRows,
    loading,
    page,
    setPage,
    pagination,
    clientTotalPages,
    temp,
    setTemp,
    cityKw,
    setCityKw,
    addrKw,
    setAddrKw,
    clearFilters,
    handleRefresh,
    handleAddOpen,
    handleEditOpen,
    handleViewNavigate,
    handleDelete,
    handleRestore,
    handleSubmitCinema,
    open,
    setOpen,
    editCinema,
    isConfirmDialogOpen,
    setIsConfirmDialogOpen,
    isSuccessDialogOpen,
    setIsSuccessDialogOpen,
    isErrorDialogOpen,
    setIsErrorDialogOpen,
    dialogTitle,
    dialogMessage,
    onConfirm,
  } = useCinemaLogic();

  const columns: Column<Cinema>[] = [
    { header: "Tên rạp phim", key: "name" },
    { header: "Thành phố", key: "city" },
    { header: "Địa chỉ", key: "address" },
    {
      header: "Kinh độ",
      key: "longitude",
      render: (v) => (v == null ? "Chưa có" : Number(v).toFixed(6)),
    },
    {
      header: "Vĩ độ",
      key: "latitude",
      render: (v) => (v == null ? "Chưa có" : Number(v).toFixed(6)),
    },
    {
      header: "Hành động",
      className: "text-right w-[120px]",
      key: "actions",
      render: (_: unknown, row: Cinema) => (
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
          Danh sách rạp phim
        </h2>

        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
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

            <div className="basis-[240px]">
              <input
                type="text"
                placeholder="Tên rạp"
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
                className="w-full px-4 py-2 rounded-lg focus:outline-none border"
              />
            </div>

            <div className="basis-[200px]">
              <input
                type="text"
                placeholder="Thành phố"
                value={cityKw}
                onChange={(e) => setCityKw(e.target.value)}
                className="w-full px-4 py-2 rounded-lg focus:outline-none border"
              />
            </div>

            <div className="basis-[260px]">
              <input
                type="text"
                placeholder="Địa chỉ"
                value={addrKw}
                onChange={(e) => setAddrKw(e.target.value)}
                className="w-full px-4 py-2 rounded-lg focus:outline-none border"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
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
              Thêm rạp phim +
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <Table<Cinema>
          columns={columns}
          data={displayRows}
          getRowKey={(r) => r.id}
        />

        {mode === "server" && pagination && (
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50">
            <button
              onClick={() =>
                pagination.hasPrevPage && setPage((p) => Math.max(1, p - 1))
              }
              disabled={!pagination.hasPrevPage || loading}
              className="px-4 py-2 text-sm text-gray-600 bg-white rounded-lg shadow-sm disabled:opacity-50"
            >
              Trước
            </button>
            <span className="text-sm text-gray-600">
              Trang {pagination.currentPage} / {pagination.totalPages}
            </span>
            <button
              onClick={() => pagination.hasNextPage && setPage((p) => p + 1)}
              disabled={!pagination.hasNextPage || loading}
              className="px-4 py-2 text-sm text-gray-600 bg-white rounded-lg shadow-sm disabled:opacity-50"
            >
              Tiếp
            </button>
          </div>
        )}

        {mode === "client" && (
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-4 py-2 text-sm text-gray-600 bg-white rounded-lg shadow-sm disabled:opacity-50"
            >
              Trước
            </button>
            <span className="text-sm text-gray-600">
              Trang {page} / {clientTotalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(clientTotalPages, p + 1))}
              disabled={page === clientTotalPages || loading}
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

      <CinemaModal
        open={open}
        onClose={() => setOpen(false)}
        mode={editCinema ? "edit" : "create"}
        cinema={editCinema ?? undefined}
        onSubmit={handleSubmitCinema}
      />

      <RefreshLoader isOpen={loading} />
    </div>
  );
};

export default CinemasListPage;
