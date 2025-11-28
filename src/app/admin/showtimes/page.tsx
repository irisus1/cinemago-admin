// app/admin/showtimes/page.tsx
"use client";

import { useState } from "react";
import Table, { Column } from "@/components/Table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LANGUAGE_LABEL_MAP } from "@/constants/showtime";
import { FiEdit2, FiTrash2, FiEye } from "react-icons/fi";
import { BiRefresh as BiRestore } from "react-icons/bi";
import { Plus } from "lucide-react";

import { Modal } from "@/components/Modal";
import ShowtimeModal from "@/components/modal/ShowtimeModal";
import { type ShowTime } from "@/services";
import { useShowtimeLogic } from "@/hooks/useShowtimeLogic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ShowtimesListPage() {
  const {
    // data
    showtimes,
    loadingShow,
    page,
    setPage,
    totalPages,
    movieOptions,
    cinemaOptions,
    movieId,
    setMovieId,
    cinemaId,
    setCinemaId,
    isActive,
    setIsActive,
    startTime,
    setStartTime,
    endTime,
    setEndTime,

    // actions
    handleRefresh,
    handleAddOpen,
    handleEditOpen,
    handleDelete,
    handleRestore,

    clearFilters,
    canClearFilters,

    // modal / dialog
    open,
    setOpen,
    editShowtime,
    isConfirmDialogOpen,
    setIsConfirmDialogOpen,
    isSuccessDialogOpen,
    setIsSuccessDialogOpen,
    isErrorDialogOpen,
    setIsErrorDialogOpen,
    dialogTitle,
    dialogMessage,
    onConfirm,
  } = useShowtimeLogic();

  const [viewOpen, setViewOpen] = useState(false);
  const [viewShowtime, setViewShowtime] = useState<ShowTime | null>(null);

  // helper format datetime
  const formatDateTime = (v?: string | null) => {
    if (!v) return "—";
    try {
      return Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(v));
    } catch {
      return String(v);
    }
  };

  const movieTitle = movieOptions.find((m) => m.id === movieId)?.title ?? "—";

  // ===== COLUMNS =====
  const columns: Column<ShowTime>[] = [
    // { header: "Phim", key: "movieTitle" },
    { header: "Rạp", key: "cinemaName" },
    { header: "Phòng", key: "roomName" },
    {
      header: "Ngôn ngữ",
      key: "language",
      render: (v) => {
        if (!v) return "—";
        const raw = String(v);
        return LANGUAGE_LABEL_MAP[raw] ?? raw;
      },
    },
    { header: "Định dạng", key: "format" },
    {
      header: "Bắt đầu",
      key: "startTime",
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
      header: "Kết thúc",
      key: "endTime",
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
      header: "Giá (VND)",
      key: "price",
      render: (v) =>
        v == null ? "—" : new Intl.NumberFormat("vi-VN").format(Number(v)),
    },
    {
      header: "Phụ đề",
      key: "subtitle",
      render: (_, s) => (
        <Badge variant={s.subtitle ? "default" : "secondary"}>
          {s.subtitle ? "Có" : "Không"}
        </Badge>
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
                onClick={() => {
                  setViewShowtime(row);
                  setViewOpen(true);
                }}
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
              <BiRestore className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 pb-6">
          Quản lý suất chiếu
        </h2>

        <div className="grid w-full grid-cols-[1fr_auto] gap-x-4 gap-y-3">
          <div className="flex flex-wrap items-center gap-4 min-w-0">
            <div className="min-w-0 w-[260px] border border-gray-400 rounded-lg">
              <Select
                value={movieId}
                onValueChange={(v) => {
                  setMovieId(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Chọn phim" />
                </SelectTrigger>
                <SelectContent>
                  {movieOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lọc theo rạp */}
            <div className="min-w-0 w-[220px] border border-gray-400 rounded-lg">
              <Select
                value={cinemaId}
                onValueChange={(v) => {
                  setCinemaId(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Lọc theo rạp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ALL__">Tất cả rạp</SelectItem>
                  {cinemaOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lọc theo trạng thái active */}
            <div className="min-w-0 w-[200px] border border-gray-400 rounded-lg">
              <Select
                value={isActive}
                onValueChange={(v) => {
                  setIsActive(v as "all" | "active" | "inactive");
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="active">Đang hoạt động</SelectItem>
                  <SelectItem value="inactive">Đã xóa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Thời gian bắt đầu / kết thúc */}
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 rounded-lg border border-gray-400"
            />
            {/* <span>đến</span>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => {
                setEndTime(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 rounded-lg border"
            /> */}
          </div>

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
              Thêm suất chiếu
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <Table<ShowTime>
          columns={columns}
          data={showtimes}
          getRowKey={(r) => r.id}
        />

        {loadingShow && (
          <div className="flex items-center gap-2 px-6 py-3 text-sm text-gray-600">
            <span className="inline-block h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
            Đang tải suất chiếu...
          </div>
        )}

        {showtimes.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!canPrev || loadingShow}
              className="px-4 py-2 text-sm text-gray-600 bg-white rounded-lg shadow-sm disabled:opacity-50"
            >
              Trước
            </button>
            <span className="text-sm text-gray-600">
              Trang {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => (canNext ? p + 1 : p))}
              disabled={!canNext || loadingShow}
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

      <ShowtimeModal
        open={open}
        onClose={() => setOpen(false)}
        mode={editShowtime ? "edit" : "create"}
        showtime={editShowtime || undefined}
        movieId={movieId} // vì filter luôn có movieId
        onSuccess={async () => {
          handleRefresh();
        }}
      />

      <Dialog
        open={viewOpen}
        onOpenChange={(o) => {
          setViewOpen(o);
          if (!o) setViewShowtime(null);
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Chi tiết suất chiếu</DialogTitle>
          </DialogHeader>

          {viewShowtime && (
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-semibold">Phim: </span>
                <span>{movieTitle}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-semibold">Rạp: </span>
                  <span>{viewShowtime.cinemaName ?? "—"}</span>
                </div>
                <div>
                  <span className="font-semibold">Phòng: </span>
                  <span>{viewShowtime.roomName ?? "—"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-semibold">Bắt đầu: </span>
                  <span>{formatDateTime(viewShowtime.startTime)}</span>
                </div>
                <div>
                  <span className="font-semibold">Kết thúc: </span>
                  <span>{formatDateTime(viewShowtime.endTime)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-semibold">Ngôn ngữ: </span>
                  <span>
                    {LANGUAGE_LABEL_MAP[viewShowtime.language] ?? "—"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Định dạng: </span>
                  <span>{viewShowtime.format ?? "—"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-semibold">Giá vé: </span>
                  <span>
                    {viewShowtime.price != null
                      ? new Intl.NumberFormat("vi-VN").format(
                          Number(viewShowtime.price)
                        ) + " ₫"
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Phụ đề: </span>
                  <span>{viewShowtime.subtitle ? "Có" : "Không"}</span>
                </div>
              </div>

              <div>
                <span className="font-semibold">Trạng thái: </span>
                <Badge
                  variant={viewShowtime.isActive ? "default" : "secondary"}
                  className={
                    viewShowtime.isActive
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }
                >
                  {viewShowtime.isActive ? "Đang hoạt động" : "Đã xóa"}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
