import React from "react";
import type { Concession } from "@/lib/types";
export default function ConcessionsList({
  items,
  cart,
  setQty,
}: {
  items: Concession[];
  cart: Record<string, number>;
  setQty: (id: string, qty: number) => void;
}) {
  return (
    <div>
      <div className="font-semibold mb-2">
        Đồ ăn & thức uống (không bắt buộc)
      </div>
      <div className="space-y-2">
        {items.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between border rounded p-2"
          >
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-gray-500">{c.type}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-2 border rounded"
                onClick={() => setQty(c.id, Math.max(0, (cart[c.id] || 0) - 1))}
              >
                -
              </button>
              <div className="w-8 text-center">{cart[c.id] || 0}</div>
              <button
                className="px-2 border rounded"
                onClick={() => setQty(c.id, (cart[c.id] || 0) + 1)}
              >
                +
              </button>
              <div className="w-24 text-right">{c.price.toLocaleString()}₫</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
