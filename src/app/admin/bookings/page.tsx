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

const BookingsListPage = () => {
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

    // filters
    showtimeFilter,
    setShowtimeFilter,
    typeFilter,
    setTypeFilter,
    clearFilters,
    canClearFilters,
  } = useBookingLogic();

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(val);

  const showtimeOptions: SelectOption[] = useMemo(() => {
    const ids = Array.from(new Set(bookings.map((b) => b.showtimeId)));

    return ids
      .map((id) => showTimeMap[id])
      .filter(Boolean)
      .map((st) => {
        const movie = movieMap[st.movieId];
        const timeLabel = new Date(st.startTime).toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });

        return {
          value: st.id,
          label: movie ? movie.title : "Phim ?",
          meta: timeLabel,
        };
      });
  }, [bookings, showTimeMap, movieMap]);

  const columns: Column<Booking>[] = [
    {
      header: "Mã đơn",
      key: "id",
      render: (_, r) => (
        <span className="font-mono text-xs">{r.id.slice(0, 8)}...</span>
      ),
    },
    {
      header: "Khách hàng",
      key: "userId",
      render: (_, r) => {
        if (!r.userId)
          return <span className="text-gray-400 italic">Khách vãng lai</span>;
        const user = userMap[r.userId];

        return user ? (
          <div>
            <div className="font-medium text-sm">{user.fullname}</div>
            <div className="text-xs text-gray-500">{user.email}</div>
          </div>
        ) : (
          <span className="text-xs animate-pulse">Đang tải...</span>
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

        // Tra cứu tên phim từ movieMap dựa vào st.movieId
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

        // Tra cứu tên phim từ movieMap dựa vào st.movieId
        const cinema = cinemaMap[st.cinemaId];

        return (
          <div className="max-w-[220px]">
            {/* Tên Rạp (Hiển thị nổi bật vì đa rạp) */}
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
      render: (v) => (
        <b className="text-green-600">{formatCurrency(v as number)}</b>
      ),
    },
    {
      header: "Ngày đặt",
      key: "createdAt",
      render: (v) => (
        <span className="text-sm">
          {new Date(v as string).toLocaleTimeString("vi-VN", {
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
          <SearchableCombobox
            value={showtimeFilter}
            onChange={setShowtimeFilter}
            options={showtimeOptions}
            placeholder="Tất cả suất chiếu"
            searchPlaceholder="Tìm theo phim / thời gian..."
          />
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
      />
    </div>
  );
};

export default BookingsListPage;
