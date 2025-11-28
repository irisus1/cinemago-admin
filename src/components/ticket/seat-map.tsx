// "use client";

import React, { useMemo } from "react";
import { type SeatCell, SeatModal } from "@/services";
import { groupSeatsByRow, getSeatStyle } from "./seat-helper";
import { Lock } from "lucide-react";

interface SeatMapProps {
  seatLayout: SeatCell[]; // Vẽ
  seatList: SeatModal[]; // Tra cứu ID
  selectedSeats: string[];
  loading: boolean;
  isSeatDisabled: (seatType: string, isSelected: boolean) => boolean;
  onSeatClick: (seat: SeatModal, nextSeat: SeatModal | null) => void;
  processingSeats: string[];
  heldSeats: string[];
}

export default function SeatMap({
  seatLayout,
  seatList,
  selectedSeats,
  loading,
  isSeatDisabled,
  onSeatClick,
  heldSeats,
  processingSeats,
}: SeatMapProps) {
  const seatsByRow = useMemo(() => groupSeatsByRow(seatLayout), [seatLayout]);

  // Hàm mapping quan trọng: Layout -> Entity
  const findSeatEntity = (row: string, col: number) => {
    const seatLabel = `${row}${col}`; // Ví dụ "A1"
    return seatList.find((s) => s.seatNumber === seatLabel);
  };

  const renderRowSeats = (rowLabel: string, seats: SeatCell[]) => {
    const elements = [];
    for (let i = 0; i < seats.length; i++) {
      const cell = seats[i];
      const nextCell = seats[i + 1];
      const seatEntity = findSeatEntity(cell.row, cell.col);

      if (!seatEntity || cell.type === "EMPTY") {
        elements.push(
          <div
            key={`${cell.row}-${cell.col}`}
            className={getSeatStyle("EMPTY", false, true, false)}
          ></div>
        );
        continue;
      }

      const isSelected = selectedSeats.includes(seatEntity.id);
      const isProcessing = processingSeats.includes(seatEntity.id);

      // [NEW] Kiểm tra ghế có bị người khác giữ không
      const isHeld = heldSeats.includes(seatEntity.id);

      // Nếu bị giữ thì coi như disable luôn
      const disabled = isSeatDisabled(cell.type, isSelected) || isHeld;

      if (cell.type === "COUPLE" && nextCell && nextCell.type === "COUPLE") {
        const nextSeatEntity = findSeatEntity(nextCell.row, nextCell.col);
        if (nextSeatEntity) {
          elements.push(
            <div
              key={seatEntity.id} // Dùng UUID làm key
              className={`${getSeatStyle(
                cell.type,
                isSelected,
                disabled,
                isHeld
              )} relative`}
              onClick={() =>
                !disabled && onSeatClick(seatEntity, nextSeatEntity)
              }
            >
              {cell.col}-{nextCell.col}
            </div>
          );
          i++; // Bỏ qua ghế tiếp theo
        }
      } else {
        elements.push(
          <div
            key={seatEntity.id}
            className={`${getSeatStyle(
              cell.type,
              isSelected,
              disabled,
              isHeld
            )} relative`}
            onClick={() => !disabled && onSeatClick(seatEntity, null)}
          >
            {cell.col}
          </div>
        );
      }
    }
    return elements;
  };

  if (loading)
    return (
      <div className="h-40 flex items-center justify-center text-gray-400">
        Đang tải sơ đồ...
      </div>
    );

  return (
    <div className="border rounded-lg p-4 bg-white min-h-[400px] flex flex-col items-center overflow-x-auto">
      <div className="w-3/4 max-w-[400px] h-2 bg-gray-300 mb-8 rounded-full shadow-[0_10px_20px_-5px_rgba(0,0,0,0.3)] relative mt-3">
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-gray-400 uppercase tracking-widest font-semibold">
          Màn hình
        </span>
      </div>
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
      {/* Legend */}
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
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border border-gray-500 bg-gray-400 rounded flex items-center justify-center">
            <Lock className="h-3 w-3 text-white" />
          </div>
          <span>Đã đặt/Giữ</span>
        </div>
      </div>
    </div>
  );
}
