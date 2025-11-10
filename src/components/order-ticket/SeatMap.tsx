import React from "react";
import type { SeatMap } from "@/lib/types";
export default function SeatMapView({
  seatMap,
  selected,
  setSelected,
  maxSelect,
}: {
  seatMap: SeatMap;
  selected: string[];
  setSelected: (ids: string[]) => void;
  maxSelect: number;
}) {
  const toggle = (id: string) => {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    if (next.length > maxSelect) return;
    setSelected(next);
  };
  return (
    <div className="space-y-2">
      <div className="font-semibold">Chọn ghế — {seatMap.room.name}</div>
      <div className="text-xs text-gray-600">
        Chú thích:{" "}
        <span className="inline-block w-3 h-3 bg-gray-300 mr-1"></span>Trống{" "}
        <span className="inline-block w-3 h-3 bg-yellow-400 mr-1 ml-3"></span>
        Đang chọn{" "}
        <span className="inline-block w-3 h-3 bg-green-500 mr-1 ml-3"></span>Đã
        bán <span className="inline-block w-3 h-3 bg-red-500 mr-1 ml-3"></span>
        Đang giữ
      </div>
      <div className="inline-block border rounded-xl p-4 bg-gray-50">
        <div className="text-center text-xs text-gray-500 mb-2">Màn hình</div>
        <div
          className="grid gap-2"
          style={{
            gridTemplateRows: `repeat(${seatMap.room.rows}, minmax(0,1fr))`,
          }}
        >
          {Array.from({ length: seatMap.room.rows }).map((_, r) => (
            <div key={r} className="flex gap-2 justify-center">
              {Array.from({ length: seatMap.room.cols }).map((__, c) => {
                const seat = seatMap.seats.find(
                  (s) => s.row === r + 1 && s.col === c + 1
                );
                if (!seat) return <div key={c} className="w-6 h-6" />;
                const isSelected = selected.includes(seat.seatId);
                const baseCls =
                  "w-6 h-6 text-[10px] flex items-center justify-center rounded";
                const cls =
                  seat.status === "sold"
                    ? "bg-green-500 text-white"
                    : seat.status === "held"
                    ? "bg-red-500 text-white"
                    : isSelected
                    ? "bg-yellow-400"
                    : "bg-gray-300";
                return (
                  <button
                    key={c}
                    className={`${baseCls} ${cls}`}
                    disabled={seat.status !== "available" && !isSelected}
                    onClick={() => toggle(seat.seatId)}
                    title={seat.label}
                  >
                    {seat.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
