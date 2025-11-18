"use client";

import React, { useMemo } from "react";
import { type SeatCell } from "@/services";
// [FIX] Dùng đường dẫn tương đối để tránh lỗi alias
import { groupSeatsByRow, getSeatStyle } from "./seat-helper";

interface SeatMapProps {
  seatLayout: SeatCell[];
  selectedSeats: string[];
  loading: boolean;
  // Hàm check xem ghế có bị disable không (được truyền từ cha)
  isSeatDisabled: (seatType: string, isSelected: boolean) => boolean;
  // Hàm xử lý khi click ghế
  onSeatClick: (seat: SeatCell, nextSeat: SeatCell | null) => void;
}

export default function SeatMap({
  seatLayout,
  selectedSeats,
  loading,
  isSeatDisabled,
  onSeatClick,
}: SeatMapProps) {
  // Gom nhóm data (dùng useMemo để không tính lại mỗi lần render thừa)
  const seatsByRow = useMemo(() => groupSeatsByRow(seatLayout), [seatLayout]);

  // Hàm render từng hàng ghế (Xử lý logic gộp ghế đôi)
  const renderRowSeats = (rowLabel: string, seats: SeatCell[]) => {
    const elements = [];
    for (let i = 0; i < seats.length; i++) {
      const seat = seats[i];
      const nextSeat = seats[i + 1];
      const seatId = `${seat.row}-${seat.col}`;
      const isSelected = selectedSeats.includes(seatId);
      const disabled = isSeatDisabled(seat.type, isSelected);

      // --- XỬ LÝ GHẾ ĐÔI ---
      if (
        seat.type === "COUPLE" &&
        nextSeat &&
        nextSeat.type === "COUPLE" &&
        nextSeat.row === seat.row
      ) {
        elements.push(
          <div
            key={`${seatId}-merged`}
            className={getSeatStyle(seat, isSelected, disabled)}
            onClick={() => !disabled && onSeatClick(seat, nextSeat)}
          >
            {seat.col}-{nextSeat.col}
          </div>
        );
        i++; // Bỏ qua ghế tiếp theo vì đã gộp
      }
      // --- XỬ LÝ GHẾ ĐƠN / EMPTY ---
      else {
        elements.push(
          <div
            key={seatId}
            className={getSeatStyle(seat, isSelected, disabled)}
            onClick={() => !disabled && onSeatClick(seat, null)}
          >
            {seat.type !== "EMPTY" && seat.col}
          </div>
        );
      }
    }
    return elements;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        Đang tải sơ đồ phòng...
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-white min-h-[400px] flex flex-col items-center">
      {/* Màn hình chiếu - Width đã chỉnh lại cho cân đối */}
      <div className="w-2/3 max-w-[500px] h-2 bg-gray-300 mb-8 rounded-full shadow-[0_10px_20px_-5px_rgba(0,0,0,0.3)] relative">
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-gray-400 uppercase tracking-widest font-semibold">
          Màn hình
        </span>
      </div>

      {/* Grid Ghế */}
      <div className="flex flex-col gap-2">
        {Object.entries(seatsByRow).map(([rowLabel, seats]) => (
          <div key={rowLabel} className="flex items-center">
            <span className="w-6 text-center font-bold text-gray-400 text-sm mr-4">
              {rowLabel}
            </span>
            <div className="flex">{renderRowSeats(rowLabel, seats)}</div>
          </div>
        ))}
      </div>

      {/* Chú thích */}
      <SeatLegend />
    </div>
  );
}

// Component con nhỏ cho chú thích
const SeatLegend = () => (
  <div className="flex flex-wrap justify-center gap-6 mt-10 text-sm text-gray-600">
    <div className="flex items-center gap-2">
      <div className="w-5 h-5 border rounded bg-white"></div>
      <span>Thường</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-5 h-5 border border-orange-400 rounded bg-orange-50"></div>
      <span>VIP</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-10 h-5 border border-pink-400 rounded bg-pink-50"></div>
      <span>Couple</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-5 h-5 border border-primary bg-primary rounded"></div>
      <span>Đang chọn</span>
    </div>
  </div>
);
