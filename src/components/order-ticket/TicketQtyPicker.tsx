import React from "react";
import type { Showtime } from "@/lib/types";
export default function TicketQtyPicker({
  showtime,
  qty,
  setQty,
  onNext,
  onBack,
}: {
  showtime: Showtime;
  qty: number;
  setQty: (n: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <button className="text-sm underline" onClick={onBack}>
        ← Back
      </button>
      <div className="text-lg font-semibold">Chọn số vé</div>
      <div className="flex items-center gap-2">
        <button
          className="px-3 py-2 border rounded"
          onClick={() => setQty(Math.max(0, qty - 1))}
        >
          -
        </button>
        <div className="w-12 text-center text-xl">{qty}</div>
        <button
          className="px-3 py-2 border rounded"
          onClick={() => setQty(qty + 1)}
        >
          +
        </button>
        <div className="ml-4 text-sm text-gray-600">
          Giá cơ bản: {showtime.basePrice.toLocaleString()}₫
        </div>
      </div>
      <div className="mt-2 text-sm">
        Tổng tiền vé: <b>{(qty * showtime.basePrice).toLocaleString()}₫</b>
      </div>
      <button
        disabled={qty <= 0}
        onClick={onNext}
        className={`px-4 py-2 rounded ${
          qty > 0 ? "bg-black text-white" : "bg-gray-300"
        }`}
      >
        Tiếp tục
      </button>
    </div>
  );
}
