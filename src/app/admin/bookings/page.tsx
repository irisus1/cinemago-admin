"use client";

import React from "react";
import Table, { Column } from "@/components/Table";
import type { Booking } from "@/services";
import { useBookingLogic } from "@/hooks/useBookingLogic";
import BookingDetailModal from "@/components/modal/BookingDetailModal";
import { FiEye } from "react-icons/fi";
import { Button } from "@/components/ui/button";

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
  } = useBookingLogic();

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(val);

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

      {/* Bọc Table và Pagination trong cùng 1 div có shadow và rounded giống bên User */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Table */}
        <div className="overflow-x-auto">
          <Table columns={columns} data={bookings} getRowKey={(r) => r.id} />
        </div>

        {/* Pagination Style chuẩn User */}
        {totalItems > 0 && (
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t">
            {/* Nút Trước */}
            <button
              onClick={() =>
                pagination?.hasPrevPage && setPage((p) => Math.max(1, p - 1))
              }
              disabled={!pagination?.hasPrevPage || loading}
              className="px-4 py-2 text-sm text-gray-600 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Trước
            </button>

            {/* Thông tin trang */}
            <div className="text-sm text-gray-600 font-medium">
              Trang {pagination?.currentPage ?? page} / {totalPages}
            </div>

            {/* Nút Tiếp */}
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

      {/* Modal giữ nguyên */}
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
