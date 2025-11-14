import React from "react";
export default function ReceiptView({
  bookingId,
  onPrint,
}: {
  bookingId: string;
  onPrint: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="text-green-600 font-semibold">Thanh toán thành công!</div>
      <div>
        Mã đặt vé: <b>{bookingId}</b>
      </div>
      <div className="text-sm text-gray-600">
        Bạn có thể bấm In để in ngay hoặc tải PDF bằng hộp thoại trình duyệt.
      </div>
      <button
        onClick={onPrint}
        className="px-4 py-2 rounded bg-black text-white"
      >
        In / Tải PDF
      </button>
    </div>
  );
}
