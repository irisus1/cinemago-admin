"use client";

import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { BiRefresh } from "react-icons/bi";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Table, { Column } from "@/components/Table";

import { Modal } from "@/components/Modal";
import ShowtimeModal from "@/components/modal/ShowtimeModal";
import { type ShowTime } from "@/services";
import { useShowtimeLogic } from "@/hooks/useShowtimeLogic";

export default function ShowtimesCard({ movieId }: { movieId: string }) {
  const {
    // Data
    filteredShowtimes,
    loadingShow,
    langOptions,
    filterLang,
    setFilterLang,
    page,
    setPage,
    pageSize,
    totalItems,

    // Actions
    handleRefresh,
    handleAddOpen,
    handleEditOpen,
    handleDelete,
    handleRestore,

    // Modal States
    open,
    setOpen,
    editShowtime,
    // setEditShowtme,
    isConfirmDialogOpen,
    setIsConfirmDialogOpen,
    isSuccessDialogOpen,
    setIsSuccessDialogOpen,
    isErrorDialogOpen,
    setIsErrorDialogOpen,
    dialogTitle,
    dialogMessage,
    onConfirm,
  } = useShowtimeLogic(movieId);

  const columns: Column<ShowTime>[] = useMemo(
    () => [
      { header: "Rạp", key: "cinemaName" },
      { header: "Phòng", key: "roomName" },
      { header: "Ngôn ngữ", key: "language" },
      { header: "Định dạng", key: "format" },
      {
        header: "Bắt đầu",
        key: "startTime",
        render: (v) =>
          v
            ? Intl.DateTimeFormat("vi-VN", {
                // timeZone: "Asia/Ho_Chi_Minh",
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
                // timeZone: "Asia/Ho_Chi_Minh",
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
    ],
    [handleDelete, handleRestore, handleEditOpen]
  );

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <div>
      <Card className="shadow-sm">
        <CardHeader className="border-b space-y-3">
          <CardTitle className="text-2xl">Suất chiếu</CardTitle>

          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            <Select
              value={filterLang}
              onValueChange={(v) =>
                setFilterLang(v === "__ALL__" ? undefined : v)
              }
            >
              <SelectTrigger className="h-9 w-[220px]">
                <SelectValue placeholder="Lọc theo ngôn ngữ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">Tất cả ngôn ngữ</SelectItem>
                {langOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" className="gap-1" onClick={handleAddOpen}>
              <Plus className="h-4 w-4" />
              Thêm suất chiếu
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 overflow-x-auto">
          {loadingShow ? (
            <div className="text-sm text-muted-foreground">
              Đang tải suất chiếu…
            </div>
          ) : (
            <>
              <Table
                columns={columns}
                data={filteredShowtimes}
                getRowKey={(r) => r.id}
              />

              {/* Phân trang */}
              <div className="mt-3 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loadingShow}
                >
                  Trước
                </Button>

                <span className="text-sm">
                  Trang {page} / {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={loadingShow || page >= totalPages}
                >
                  Sau
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
        movieId={movieId}
        onSuccess={async () => {
          handleRefresh();
        }}
      />
    </div>
  );
}
