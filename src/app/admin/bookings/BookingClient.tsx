"use client";

import React from "react";
import { useMemo } from "react";
import Table, { Column } from "@/components/Table";
import type { Booking } from "@/services";
import { useBookingLogic } from "@/hooks/useBookingLogic";
import BookingDetailModal from "@/components/modal/BookingDetailModal";
import { FiEye } from "react-icons/fi";
import {
  SearchableCombobox,
  type SelectOption,
} from "@/components/SearchableCombobox";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import RefreshLoader from "@/components/Loading";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { bookingService } from "@/services/booking.service";
import { toast } from "sonner";
import { useState } from "react";

type StatusFilterType =
  | "__ALL__"
  | "Chưa thanh toán"
  | "Đã thanh toán"
  | "Thanh toán thất bại";

export default function BookingsListPage() {
  const {
    bookings,
    userMap,
    showTimeMap,
    movieMap,
    roomMap,
    cinemaMap,

    loading,
    page,
    setPage,
    totalPages,
    totalItems,
    pagination,

    detailOpen,
    setDetailOpen,
    selectedBooking,
    handleViewDetail,

    showtimeFilter,
    setShowtimeFilter,
    typeFilter,
    setTypeFilter,
    clearFilters,
    canClearFilters,
    statusFilter,
    setStatusFilter,
    refresh,

    filterMovies,
    filterShowtimes,
    selectedMovieFilter,
    setSelectedMovieFilter,
  } = useBookingLogic();

  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const eligibleBookings = useMemo(() => {
    return bookings.filter(
      (b) => b.paymentMethod === "COD" && b.status === "Chưa thanh toán",
    );
  }, [bookings]);

  const isAllSelected =
    eligibleBookings.length > 0 &&
    eligibleBookings.every((b) => selectedIds.has(b.id));
  const isIndeterminate =
    !isAllSelected && eligibleBookings.some((b) => selectedIds.has(b.id));

  const handleToggleSelect = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedIds(next);
  };

  const handleSelectAll = (checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) {
      eligibleBookings.forEach((b) => next.add(b.id));
    } else {
      eligibleBookings.forEach((b) => next.delete(b.id));
    }
    setSelectedIds(next);
  };

  const handleBulkUpdate = async (targetStatus: string) => {
    if (selectedIds.size === 0) return;
    setIsUpdating(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await bookingService.updateBookingStatus(id, targetStatus);
      }
      toast.success(
        `Đã cập nhật ${selectedIds.size} đơn hàng sang "${targetStatus}"`,
      );
      await refresh();
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
      toast.error("Có lỗi khi cập nhật hàng loạt");
    } finally {
      setIsUpdating(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(val);

  const movieOptions: SelectOption[] = useMemo(() => {
    return filterMovies.map((m) => ({
      value: m.id,
      label: m.title,
    }));
  }, [filterMovies]);

  const filteredShowtimeOptions: SelectOption[] = useMemo(() => {
    return filterShowtimes.map((st) => {
      const room = roomMap[st.roomId];

      console.log(room);

      return {
        value: st.id,
        label: `${new Date(st.startTime).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        })} - ${room ? room.name : "Phòng ?"}`,
        meta: new Date(st.startTime).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
        }),
      };
    });
  }, [filterShowtimes, roomMap]);

  const { user: currentUser } = useAuth();

  const columns: Column<Booking>[] = [
    {
      header: (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              isAllSelected || (isIndeterminate ? "indeterminate" : false)
            }
            onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
            disabled={eligibleBookings.length === 0}
          />
        </div>
      ),
      key: "select",
      headerClassName: "w-[50px] px-2",
      className: "px-2",
      render: (_, r) => {
        const isEligible =
          r.paymentMethod === "COD" &&
          (r.status === "Chờ thanh toán" || r.status === "Chưa thanh toán");
        return (
          <div
            className="flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {isEligible && (
              <Checkbox
                checked={selectedIds.has(r.id)}
                onCheckedChange={(checked) =>
                  handleToggleSelect(r.id, checked as boolean)
                }
              />
            )}
          </div>
        );
      },
    },
    {
      header: "Mã đơn",
      key: "id",
      render: (_, r) => (
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs">{r.id.slice(0, 8)}...</span>
        </div>
      ),
    },
    {
      header: "Khách hàng",
      key: "userId",
      render: (_, r) => {
        if (!r.userId)
          return <span className="text-gray-400 italic">Khách vãng lai</span>;

        const bookingUser = userMap[r.userId];
        if (!bookingUser)
          return <span className="text-xs animate-pulse">Đang tải...</span>;

        if (currentUser && bookingUser.email === currentUser.email) {
          return (
            <span className="text-gray-500 italic">
              Khách vãng lai (Tại quầy)
            </span>
          );
        }

        return (
          <div>
            <div className="font-medium text-sm">{bookingUser.fullname}</div>
            <div className="text-xs text-gray-500">{bookingUser.email}</div>
          </div>
        );
      },
    },
    {
      header: "Suất chiếu / Phim",
      key: "showtimeId",
      render: (_, r) => {
        const st = showTimeMap[r.showtimeId];
        if (!st)
          return (
            <span className="text-xs animate-pulse">Checking info...</span>
          );

        const movie = movieMap[st.movieId];
        const room = roomMap[st.roomId];
        console.log("showtime ở page: ", st);

        return (
          <div className="max-w-[200px]">
            <div
              className="font-bold text-blue-700 truncate"
              title={movie?.title}
            >
              {movie ? movie.title : "Đang tải tên phim..."}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              <span>{room ? room.name : "Phòng ?"}</span> •
              <span>
                {" "}
                {new Date(st.startTime).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      header: "Rạp phim",
      key: "showtimeId",
      render: (_, r) => {
        const st = showTimeMap[r.showtimeId];
        if (!st)
          return (
            <span className="text-xs animate-pulse">Checking info...</span>
          );

        const cinema = cinemaMap[st.cinemaId];

        return (
          <div className="max-w-[220px]">
            <div className="text-sm font-bold text-gray-500 mb-1">
              {cinema ? cinema.name : "Rạp ?"}
            </div>
          </div>
        );
      },
    },
    {
      header: "Hình thức",
      key: "type",
    },
    {
      header: "Tổng tiền",
      key: "totalPrice",
      render: (_, r) => (
        <b className="text-green-600">{formatCurrency(r.totalPrice)}</b>
      ),
    },
    {
      header: "Đã sử dụng",
      key: "isUsed",
      render: (_, r) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold border ${r.isUsed
            ? "bg-blue-100 text-blue-800 border-blue-200"
            : "bg-gray-100 text-gray-500 border-gray-200"
            }`}
        >
          {r.isUsed ? "Đã sử dụng" : "Chưa sử dụng"}
        </span>
      ),
    },
    {
      header: "PT Thanh toán",
      key: "paymentMethod",
      render: (_, r) => (
        <Badge variant="outline" className="whitespace-nowrap">
          {r.paymentMethod || "UNKNOWN"}
        </Badge>
      ),
    },
    {
      header: "Trạng thái",
      key: "status",
      render: (_, r) => {
        let color = "bg-gray-100 text-gray-800";
        if (r.status === "Đã thanh toán") {
          color = "bg-green-100 text-green-800 border-green-200";
        } else if (r.status === "Chưa thanh toán") {
          color = "bg-yellow-100 text-yellow-800 border-yellow-200";
        } else if (r.status === "Thanh toán thất bại") {
          color = "bg-red-100 text-red-800 border-red-200";
        }
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold border ${color} whitespace-nowrap`}
          >
            {r.status || "Chưa thanh toán"}
          </span>
        );
      },
    },
    {
      header: "Ngày đặt",
      key: "createdAt",
      render: (_, r) => (
        <span className="text-sm">
          {new Date(r.createdAt).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      header: "",
      key: "actions",
      render: (_, r) => (
        <button
          onClick={() => handleViewDetail(r)}
          className="text-blue-600 hover:bg-blue-50 p-2 rounded"
        >
          <FiEye size={18} />
        </button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Quản lý Đặt vé</h2>

      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* 1. Select Movie */}
          <SearchableCombobox
            value={selectedMovieFilter || ""}
            onChange={(val) => setSelectedMovieFilter(val)}
            options={movieOptions}
            placeholder="Chọn phim..."
            searchPlaceholder="Tìm tên phim..."
          />

          {/* 2. Select Showtime (Dependent) */}
          <Select
            value={showtimeFilter}
            onValueChange={(val) => setShowtimeFilter(val)}
            disabled={!selectedMovieFilter}
          >
            <SelectTrigger className="h-10 w-[220px] rounded-lg border border-gray-300 bg-gray-50">
              <SelectValue
                placeholder={
                  !selectedMovieFilter
                    ? "Chọn phim trước..."
                    : "Chọn suất chiếu"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Tất cả suất chiếu</SelectItem>
              {filteredShowtimeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}{" "}
                  <span className="text-xs text-gray-400 ml-2">
                    ({opt.meta})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={typeFilter}
            onValueChange={(val) =>
              setTypeFilter(val as "__ALL__" | "online" | "offline")
            }
          >
            <SelectTrigger className="h-10 w-[200px] rounded-lg border border-gray-300 bg-gray-50">
              <SelectValue placeholder="Tất cả loại đặt vé" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Tất cả loại đặt vé</SelectItem>
              <SelectItem value="online">Đặt online</SelectItem>
              <SelectItem value="offline">Đặt tại quầy</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val as StatusFilterType)}
          >
            <SelectTrigger className="h-10 w-[180px] rounded-lg border border-gray-300 bg-gray-50">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Tất cả trạng thái</SelectItem>
              <SelectItem value="Chưa thanh toán">Chưa thanh toán</SelectItem>
              <SelectItem value="Đã thanh toán">Đã thanh toán</SelectItem>
              <SelectItem value="Thanh toán thất bại">
                Thanh toán thất bại
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white shadow-xl border border-gray-200 p-4 rounded-xl flex items-center gap-4 animate-in slide-in-from-bottom-4 fade-in">
            <span className="text-sm font-semibold">
              {selectedIds.size} đơn hàng đã chọn
            </span>
            <div className="h-4 w-px bg-gray-300"></div>
            <Button
              size="sm"
              variant="default"
              className="bg-green-600 hover:bg-green-700 cursor-pointer"
              onClick={() => handleBulkUpdate("Đã thanh toán")}
            >
              Đã thanh toán
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="cursor-pointer hover:bg-red-800"
              onClick={() => handleBulkUpdate("Thanh toán thất bại")}
            >
              Thất bại
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="cursor-pointer hover:bg-gray-200"
              onClick={() => setSelectedIds(new Set())}
            >
              Hủy
            </Button>
          </div>
        )}

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
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table columns={columns} data={bookings} getRowKey={(r) => r.id} />
        </div>

        {totalItems > 0 && (
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t">
            <button
              onClick={() =>
                pagination?.hasPrevPage && setPage((p) => Math.max(1, p - 1))
              }
              disabled={!pagination?.hasPrevPage || loading}
              className="px-4 py-2 text-sm text-gray-600 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Trước
            </button>

            <div className="text-sm text-gray-600 font-medium">
              Trang {pagination?.currentPage ?? page} / {totalPages}
            </div>

            <button
              onClick={() => pagination?.hasNextPage && setPage((p) => p + 1)}
              disabled={!pagination?.hasNextPage || loading}
              className="px-4 py-2 text-sm text-gray-600 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Tiếp
            </button>
          </div>
        )}
      </div>

      <BookingDetailModal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        booking={selectedBooking}
        userMap={userMap}
        roomMap={roomMap}
        cinemaMap={cinemaMap}
        showTimeMap={showTimeMap}
        movieMap={movieMap}
      />

      <RefreshLoader isOpen={loading || isUpdating} />
    </div>
  );
}
