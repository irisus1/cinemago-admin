import React from "react";
import type { PaymentIntent } from "@/lib/types";
export default function PaymentQR({
  payment,
  provider,
  setProvider,
  onPay,
  paying,
}: {
  payment: PaymentIntent | null;
  provider: "vnpay" | "momo";
  setProvider: (p: "vnpay" | "momo") => void;
  onPay: () => void;
  paying: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Phương thức thanh toán</div>
      <div className="flex gap-3">
        <label className="flex items-center gap-1">
          <input
            type="radio"
            checked={provider === "vnpay"}
            onChange={() => setProvider("vnpay")}
          />{" "}
          VNPay
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            checked={provider === "momo"}
            onChange={() => setProvider("momo")}
          />{" "}
          MoMo
        </label>
      </div>
      <button
        onClick={onPay}
        className={`px-4 py-2 rounded ${
          paying ? "bg-gray-300" : "bg-black text-white"
        }`}
        disabled={paying}
      >
        {paying ? "Đang tạo QR..." : "Tạo QR & Thanh toán"}
      </button>
      {payment && (
        <div className="mt-3">
          <div className="text-lg font-semibold">
            Quét để thanh toán — {payment.provider.toUpperCase()}
          </div>
          <img src={payment.qr} alt="QR" className="w-64 h-64" />
          <div className="text-sm text-gray-600">
            Số tiền: {payment.amount.toLocaleString()}₫ • Hết hạn:{" "}
            {new Date(payment.expiresAt).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}
