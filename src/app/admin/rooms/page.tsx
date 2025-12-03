"use client";

import React from "react";
import { Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import { FiEdit2, FiTrash2, FiEye } from "react-icons/fi";
import { BiRefresh } from "react-icons/bi";
import Table, { Column } from "@/components/Table";
import { useState } from "react";
import { Modal } from "@/components/Modal";
import RoomModal from "@/components/modal/RoomModal";
import { RoomDetailModal } from "@/components/modal/RoomDetailModal";
import SeatLayoutBuilder from "./RoomLayout";

import {
  SearchableCombobox,
  type SelectOption,
} from "@/components/SearchableCombobox";
import { type Room } from "@/services";
import { useRoomLogic } from "@/hooks/useRoomCardLogic";

export default function RoomCard() {
  const {
    // Data & State
    displayRows,
    pagination,
    loading,
    setPage,

    filteredCinemaOptions,
    cinemaId,
    setCinemaId,
    searchInput,
    setSearchInput,
    status,
    setStatus,

    canClearFilters,
    open,
    setOpen,
    openLayout,
    setOpenLayout,
    openRoom,
    editRoom,
    isConfirmDialogOpen,
    setIsConfirmDialogOpen,
    isSuccessDialogOpen,
    setIsSuccessDialogOpen,
    isErrorDialogOpen,
    setIsErrorDialogOpen,
    dialogTitle,
    dialogMessage,
    onConfirm,

    // Actions
    clearFilters,
    handleRefresh,
    handleViewLayoutOpen,
    handleAddOpen,
    handleEditOpen,
    handleDelete,
    handleRestore,

    // New Submit Logic
    isSubmitting,
    handleSubmitRoom,
  } = useRoomLogic();

  const [viewOpen, setViewOpen] = useState(false);
  const [viewRoom, setViewRoom] = useState<Room | null>(null);

  // ===== columns =====
  const columns: Column<Room>[] = [
    { header: "Tên phòng", key: "name" },
    {
      header: "Tổng ghế",
      key: "totalSeats",
      render: (v) => (v == null ? "—" : Number(v as number).toString()),
    },
    {
      header: "Ngày tạo",
      key: "createdAt",
      render: (v) =>
        v
          ? Intl.DateTimeFormat("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }).format(new Date(v as string))
          : "—",
    },
    {
      header: "Trạng thái",
      key: "isActive",
      render: (_: unknown, r: Room) => (
        <Badge variant={r.isActive ? "default" : "secondary"}>
          {r.isActive ? "Đang hoạt động" : "Đã ẩn"}
        </Badge>
      ),
    },
    {
      header: "Hành động",
      key: "actions",
      headerClassName: "text-center",
      render: (_: unknown, row: Room) => (
        <div className="flex w-full items-center justify-center space-x-3">
          {row.isActive ? (
            <>
              {/* Xem chi tiết (modal) */}
              <button
                className="text-green-600 hover:text-green-800"
                onClick={() => {
                  setViewRoom(row);
                  setViewOpen(true);
                }}
                title="Xem chi tiết"
              >
                <FiEye className="w-4 h-4" />
              </button>

              {/* Sửa */}
              <button
                className="text-blue-600 hover:text-blue-800"
                onClick={() => handleEditOpen(row)}
                title="Chỉnh sửa"
              >
                <FiEdit2 className="w-4 h-4" />
              </button>

              {/* Xóa */}
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

  const cinemaOptions: SelectOption[] = filteredCinemaOptions.map((c) => ({
    value: String(c.id),
    label: c.name,
    meta: c.city ?? undefined,
  }));
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 pb-6">
          Quản lý phòng chiếu
        </h2>

        <div className="grid w-full grid-cols-[1fr_auto] gap-x-4 gap-y-3">
          <div className="flex flex-wrap items-center gap-4 min-w-0">
            <div className="min-w-0">
              <SearchableCombobox
                options={cinemaOptions}
                value={cinemaId}
                onChange={(id) => {
                  setCinemaId(id);
                  setPage(1);
                  // fetchRooms(1);
                }}
                placeholder="Chọn rạp"
                searchPlaceholder="Tìm rạp theo tên / thành phố..."
                widthClass="w-[260px]"
              />
            </div>

            <div className="relative w-[240px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo tên phòng…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-10 w-full pl-8 pr-3 border-gray-400 rounded-lg border text-sm"
              />
            </div>

            {/* Trạng thái */}
            <div className="min-w-0 w-[200px] border border-gray-400 rounded-lg">
              <Select
                value={status}
                onValueChange={(v: "__ALL__" | "active" | "inactive") => {
                  setStatus(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className=" w-full">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ALL__">Tất cả trạng thái</SelectItem>
                  <SelectItem value="active">Đang hoạt động</SelectItem>
                  <SelectItem value="inactive">Đã ẩn</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* RIGHT: actions */}
          <div className="flex items-center gap-3 justify-self-end self-start">
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
              Thêm phòng
            </Button>
          </div>
        </div>
      </div>

      {/* ===== TABLE + LOADING + PAGINATION (style như showtimes) ===== */}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <Table<Room>
          columns={columns}
          data={displayRows}
          getRowKey={(r) => r.id}
        />

        {loading && (
          <div className="flex items-center gap-2 px-6 py-3 text-sm text-gray-600">
            <span className="inline-block h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
            Đang tải phòng...
          </div>
        )}

        {displayRows.length > 0 && pagination && (
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
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
      </div>

      <RoomDetailModal
        open={viewOpen}
        room={viewRoom}
        onClose={() => {
          setViewOpen(false);
          setViewRoom(null);
        }}
        onOpenLayout={(room) => {
          handleViewLayoutOpen(room);

          setViewOpen(false);
        }}
      />

      <SeatLayoutBuilder
        open={openLayout}
        onClose={() => setOpenLayout(false)}
        room={openRoom ?? undefined}
        seatLayout={openRoom?.seatLayout}
        notify={(msg) => toast.error(msg)}
        onChange={async (seatLayout) => {
          console.log("seatLayout to save:", seatLayout);
          handleRefresh();
          setOpenLayout(false);
        }}
      />

      <RoomModal
        open={open}
        onClose={() => setOpen(false)}
        mode={editRoom ? "edit" : "create"}
        room={editRoom}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmitRoom}
      />

      {/* Dialogs */}
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
    </div>
  );
}
