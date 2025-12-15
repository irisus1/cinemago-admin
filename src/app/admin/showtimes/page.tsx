// app/admin/showtimes/page.tsx
"use client";

import { useState, useMemo } from "react";
import RefreshLoader from "@/components/Loading";
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
import {
  SearchableCombobox,
  type SelectOption,
} from "@/components/SearchableCombobox";
import { DateTimePickerVN } from "@/components/modal/DateTimePickerVN";

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

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const movieSelectOptions: SelectOption[] = [
    { value: "__ALL__", label: "Tất cả phim" },
    ...movieOptions.map((m) => ({
      value: m.id,
      label: m.title,
    })),
  ];

  const filteredCinemaOptions: SelectOption[] = cinemaOptions.map((c) => ({
    value: String(c.id),
    label: c.name,
    meta: c.city ?? undefined,
  }));

  const groupedShowtimes = useMemo(() => {
    const groups: Record<
      string,
      Record<string, Record<string, ShowTime[]>>
    > = {};

    showtimes.forEach((item) => {
      const movieKey =
        movieOptions.find((m) => m.id === item.movieId)?.title ||
        "Unknown Movie";

      const roomKey = `${item.roomName} - ${item.cinemaName}`;

      const formatKey = item.format || "Khác";

      if (!groups[movieKey]) groups[movieKey] = {};
      if (!groups[movieKey][roomKey]) groups[movieKey][roomKey] = {};
      if (!groups[movieKey][roomKey][formatKey])
        groups[movieKey][roomKey][formatKey] = [];

      groups[movieKey][roomKey][formatKey].push(item);
    });

    return groups;
  }, [showtimes, movieOptions]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 pb-6">
          Quản lý suất chiếu
        </h2>

        <div className="grid w-full grid-cols-[1fr_auto] gap-x-4 gap-y-3">
          <div className="flex flex-wrap items-center gap-4 min-w-0">
            <div className="min-w-0 w-[260px]">
              <SearchableCombobox
                options={movieSelectOptions}
                value={movieId}
                onChange={(id) => {
                  setMovieId(id);
                  setPage(1);
                }}
                placeholder="Chọn phim"
                searchPlaceholder="Tìm theo tên phim..."
                widthClass="w-[260px]"
              />
            </div>

            {/* Lọc theo rạp */}
            <div className="min-w-0 w-[260px] ">
              <SearchableCombobox
                options={filteredCinemaOptions}
                value={cinemaId}
                onChange={(id) => {
                  setCinemaId(id);
                  setPage(1);
                }}
                placeholder="Chọn rạp"
                searchPlaceholder="Tìm theo tên rạp / thành phố..."
                widthClass="w-[260px] "
              />
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
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="active">Đang hoạt động</SelectItem>
                  <SelectItem value="inactive">Đã xóa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DateTimePickerVN
              valueISO={startTime}
              onChange={(val) => {
                setStartTime(val); // val trả về chuỗi "YYYY-MM-DDTHH:mm" chuẩn
                setPage(1);
              }}
              className="w-full md:w-[250px]" // Chỉnh width tùy ý
              placeholder="dd/mm/yyyy --:--"
            />
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
        {/* <Table<ShowTime>
          columns={columns}
          data={showtimes}
          getRowKey={(r) => r.id}
        /> */}
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 font-medium border-r">Phim</th>
              <th className="px-6 py-3 font-medium border-r">Phòng / Rạp</th>
              <th className="px-6 py-3 font-medium border-r">Định dạng</th>

              <th className="px-6 py-3 font-medium">Thời gian</th>
              <th className="px-6 py-3 font-medium">Giá vé</th>
              <th className="px-6 py-3 font-medium">Ngôn ngữ</th>
              <th className="px-6 py-3 font-medium">Trạng thái</th>
              <th className="px-6 py-3 font-medium text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {Object.keys(groupedShowtimes).length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              Object.entries(groupedShowtimes).map(([movieName, rooms]) => {
                // 1. Tính tổng rowSpan cho PHIM (tổng tất cả suất chiếu của phim này)
                const totalRowsForMovie = Object.values(rooms).reduce(
                  (accRoom, formats) => {
                    const rowsInRoom = Object.values(formats).reduce(
                      (accFormat, items) => accFormat + items.length,
                      0
                    );
                    return accRoom + rowsInRoom;
                  },
                  0
                );

                return Object.entries(rooms).map(
                  ([roomName, formats], roomIndex) => {
                    // 2. Tính tổng rowSpan cho PHÒNG (tổng suất chiếu trong phòng này)
                    const totalRowsForRoom = Object.values(formats).reduce(
                      (acc, items) => acc + items.length,
                      0
                    );

                    return Object.entries(formats).map(
                      ([formatName, items], formatIndex) => {
                        // items: danh sách suất chiếu cụ thể

                        return items.map((showtime, itemIndex) => {
                          // Logic xác định dòng đầu tiên để render rowSpan
                          const isFirstRowOfMovie =
                            roomIndex === 0 &&
                            formatIndex === 0 &&
                            itemIndex === 0;
                          const isFirstRowOfRoom =
                            formatIndex === 0 && itemIndex === 0;
                          const isFirstRowOfFormat = itemIndex === 0;

                          return (
                            <tr
                              key={showtime.id}
                              className="hover:bg-gray-50 bg-white border-b"
                            >
                              {/* CỘT 1: PHIM */}
                              {isFirstRowOfMovie && (
                                <td
                                  rowSpan={totalRowsForMovie}
                                  className="px-6 py-4 font-medium text-gray-900 border-r align-top bg-white"
                                >
                                  {movieName}
                                </td>
                              )}

                              {/* CỘT 2: PHÒNG / RẠP */}
                              {isFirstRowOfRoom && (
                                <td
                                  rowSpan={totalRowsForRoom}
                                  className="px-6 py-4 border-r align-top bg-gray-50/30"
                                >
                                  <div className="font-medium text-gray-900">
                                    {showtime.roomName}
                                  </div>
                                  <div className="text-gray-500 text-xs mt-1">
                                    {showtime.cinemaName}
                                  </div>
                                </td>
                              )}

                              {/* CỘT 3: ĐỊNH DẠNG (Mới thêm) */}
                              {isFirstRowOfFormat && (
                                <td
                                  rowSpan={items.length} // Span theo số lượng item trong format này
                                  className="px-6 py-4 border-r align-top font-semibold text-gray-700"
                                >
                                  <Badge variant="outline">{formatName}</Badge>
                                </td>
                              )}

                              {/* CÁC CỘT CHI TIẾT */}
                              <td className="px-6 py-4">
                                <div className="font-medium">
                                  {
                                    formatDateTime(showtime.startTime).split(
                                      " "
                                    )[0]
                                  }
                                </div>
                                <div className="text-gray-500 text-xs">
                                  {
                                    formatDateTime(showtime.startTime).split(
                                      " "
                                    )[1]
                                  }
                                </div>
                              </td>

                              <td className="px-6 py-4 font-medium text-gray-900">
                                {new Intl.NumberFormat("vi-VN").format(
                                  Number(showtime.price)
                                )}{" "}
                                đ
                              </td>

                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <span>
                                    {LANGUAGE_LABEL_MAP[showtime.language] ??
                                      showtime.language}
                                  </span>
                                  {showtime.subtitle && (
                                    <Badge
                                      variant="secondary"
                                      className="w-fit text-[10px] px-1 h-5"
                                    >
                                      Phụ đề
                                    </Badge>
                                  )}
                                </div>
                              </td>

                              {/* Cột Định dạng cũ đã xóa khỏi đây */}

                              <td className="px-6 py-4">
                                <Badge
                                  variant="secondary"
                                  className={
                                    showtime.isActive
                                      ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-0"
                                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 border-0"
                                  }
                                >
                                  {showtime.isActive ? "Đang chiếu" : "Dừng"}
                                </Badge>
                              </td>

                              <td className="px-6 py-4 text-center">
                                {/* Actions giữ nguyên */}
                                <div className="flex items-center justify-center space-x-3">
                                  {/* ... Code nút bấm của bạn ... */}
                                  {showtime.isActive ? (
                                    <>
                                      <button
                                        onClick={() => {
                                          setViewShowtime(showtime);
                                          setViewOpen(true);
                                        }}
                                        className="text-green-600 hover:text-green-800"
                                      >
                                        <FiEye size={18} />
                                      </button>
                                      <button
                                        onClick={() => handleEditOpen(showtime)}
                                        className="text-blue-600 hover:text-blue-800"
                                      >
                                        <FiEdit2 size={18} />
                                      </button>
                                      {/* <button
                                        onClick={() => handleDelete(showtime)}
                                        className="text-red-600 hover:text-red-800"
                                      >
                                        <FiTrash2 size={18} />
                                      </button> */}
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => handleRestore(showtime)}
                                      className="text-green-600 hover:text-green-800"
                                    >
                                      <BiRestore size={20} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      }
                    );
                  }
                );
              })
            )}
          </tbody>
        </table>

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
        movieId={movieId}
        onSuccess={async () => {
          handleRefresh();
        }}
      />

      <RefreshLoader isOpen={loadingShow} />

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
                <span>
                  {movieOptions.find((m) => m.id === viewShowtime.movieId)
                    ?.title ?? "—"}
                </span>
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
                  {viewShowtime.isActive ? "Đang chiếu" : "Hết suất chiếu"}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
