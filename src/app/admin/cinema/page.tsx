"use client";

import React, { useState } from "react";
import Table, { Column } from "@/components/Table";
import { FiEdit2, FiTrash2, FiEye } from "react-icons/fi";
import { BiRefresh } from "react-icons/bi";
import { Search } from "lucide-react";
import RefreshLoader from "@/components/Loading";
import { Modal } from "@/components/Modal";
import CinemaModal from "@/components/modal/CinemaModal";
import { type Cinema } from "@/services";
import { useCinemaLogic } from "@/hooks/useCinemaLogic";
import { CinemaDetailModal } from "@/components/modal/CinemaDetailModal";

import { SearchableCombobox } from "@/components/SearchableCombobox";
import { VIETNAM_PROVINCES } from "@/constants/vnProvinces";

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
    setCityKw,
    canClearFilters,
    clearFilters,
    handleAddOpen,
    handleEditOpen,
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

  // ===== STATE XEM CHI TIẾT =====
  const [viewOpen, setViewOpen] = useState(false);
  const [viewCinema, setViewCinema] = useState<Cinema | null>(null);
  const [cityId, setCityId] = useState("");

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
      className: "text-right w-[140px]",
      key: "actions",
      render: (_: unknown, row: Cinema) => (
        <div className="flex space-x-3 justify-end">
          {/* Nút xem chi tiết dùng modal */}
          <button
            className="text-green-600 hover:text-green-800"
            onClick={() => {
              setViewCinema(row);
              setViewOpen(true);
            }}
            title="Xem chi tiết"
          >
            <FiEye className="w-4 h-4" />
          </button>

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
          Danh sách rạp phim
        </h2>

        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            <div className="basis-[240px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tên rạp"
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
            </div>

            <div className="min-w-0">
              <SearchableCombobox
                options={VIETNAM_PROVINCES}
                value={cityId}
                onChange={(id) => {
                  setCityId(id);
                  const province = VIETNAM_PROVINCES.find(
                    (p) => p.value === id
                  );
                  setCityKw(province?.label ?? "");
                }}
                placeholder="Chọn thành phố"
                searchPlaceholder="Tìm theo tên tỉnh / thành phố..."
                widthClass="w-[220px]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              className={
                "px-4 h-10 rounded-lg text-sm font-medium transition-colors " +
                (canClearFilters
                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed")
              }
              onClick={() => {
                clearFilters();
                setCityId("");
              }}
              disabled={!canClearFilters}
            >
              Xóa lọc
            </button>
            <button
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              onClick={handleAddOpen}
            >
              + Thêm rạp
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

      {/* Confirm / success / error Modals cũ */}
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

      <CinemaDetailModal
        open={viewOpen}
        cinema={viewCinema}
        onOpenChange={(o) => {
          setViewOpen(o);
          if (!o) setViewCinema(null);
        }}
      />

      <RefreshLoader isOpen={loading} />
    </div>
  );
};

export default CinemasListPage;
