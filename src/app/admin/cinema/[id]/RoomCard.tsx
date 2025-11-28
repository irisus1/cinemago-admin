"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import { Plus } from "lucide-react";
import { FiEdit2, FiTrash2, FiEye } from "react-icons/fi";
import { BiRefresh } from "react-icons/bi";
import Table, { Column } from "@/components/Table";

import { Modal } from "@/components/Modal";
import RoomModal from "@/components/modal/RoomModal";
import SeatLayoutBuilder from "./RoomLayout";

import { type Room } from "@/services";
import { useRoomLogic } from "@/hooks/useRoomCardLogic";

export default function RoomCard({ cinemaId }: { cinemaId: string }) {
  const {
    // Data & State
    displayRows,
    pagination,
    loading,
    setPage,
    searchInput,
    setSearchInput,
    status,
    setStatus,
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
    fetchRooms,
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
  } = useRoomLogic(cinemaId);

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
      render: (_: unknown, row: Room) => (
        <div className="flex space-x-3">
          {row.isActive ? (
            <>
              <button
                className="text-green-600 hover:text-green-800"
                onClick={() => handleViewLayoutOpen(row)}
                title="Xem layout phòng"
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
      <Card className="shadow-sm">
        <CardHeader className="border-b space-y-3">
          <CardTitle className="text-2xl">Phòng chiếu</CardTitle>

          {/* Controls */}
          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Tìm theo tên phòng…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-9 w-[240px] px-3 py-1 rounded-md border"
              />

              <Select
                value={status}
                onValueChange={(v: "__ALL__" | "active" | "inactive") => {
                  setStatus(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ALL__">Tất cả</SelectItem>
                  <SelectItem value="active">Đang hoạt động</SelectItem>
                  <SelectItem value="inactive">Đã ẩn</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="ml-1"
              >
                Xóa lọc
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchRooms()}
                disabled={loading}
                className="gap-1"
                title="Làm mới"
              >
                <BiRefresh
                  className={`h-4 w-4 ${
                    loading ? "animate-spin" : "transition-transform"
                  }`}
                />
                Làm mới
              </Button>

              <Button size="sm" className="gap-1" onClick={handleAddOpen}>
                <Plus className="h-4 w-4" />
                Thêm phòng
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 overflow-x-auto">
          {loading ? (
            <div className="text-sm text-muted-foreground">Đang tải phòng…</div>
          ) : (
            <Table<Room>
              columns={columns}
              data={displayRows}
              getRowKey={(r) => r.id}
            />
          )}
        </CardContent>

        {/* Pagination (server-side) */}
        {pagination && (
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
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
      </Card>

      {/* Modal Layout Builder */}
      <div className="mt-6">
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
      </div>
      {/* Modal Thêm/Sửa phòng */}
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
