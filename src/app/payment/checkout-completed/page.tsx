"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Home, Ticket, Loader2 } from "lucide-react";
import { formatVND } from "@/app/admin/ticket/helper/seat-helper";

// Component con để bọc trong Suspense (Bắt buộc với Next.js App Router khi dùng searchParams)
function PaymentResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "success" | "failed">(
    "loading"
  );
  const [paymentData, setPaymentData] = useState<{
    orderId: string;
    amount: number;
    method: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    // Logic xác định cổng thanh toán và kết quả dựa trên URL Params
    const detectPaymentResult = () => {
      const params = Object.fromEntries(searchParams.entries());

      // 1. Xử lý MoMo
      // URL mẫu: ?partnerCode=MOMO&resultCode=0&orderId=...&amount=...
      if (params.partnerCode === "MOMO") {
        const isSuccess = params.resultCode === "0";
        setPaymentData({
          orderId: params.orderId,
          amount: Number(params.amount),
          method: "Ví MoMo",
          message: isSuccess
            ? "Giao dịch thành công"
            : "Giao dịch thất bại hoặc bị hủy",
        });
        setStatus(isSuccess ? "success" : "failed");
        return;
      }

      // 2. Xử lý VNPay
      // URL mẫu: ?vnp_ResponseCode=00&vnp_TxnRef=...&vnp_Amount=...
      if (params.vnp_ResponseCode) {
        const isSuccess = params.vnp_ResponseCode === "00";
        setPaymentData({
          orderId: params.vnp_TxnRef,
          amount: Number(params.vnp_Amount) / 100, // VNPay nhân 100
          method: "VNPay QR",
          message: isSuccess ? "Giao dịch thành công" : "Giao dịch thất bại",
        });
        setStatus(isSuccess ? "success" : "failed");
        return;
      }

      // 3. Xử lý ZaloPay
      // URL mẫu: ?status=1&apptransid=...&amount=...
      if (params.apptransid || params.status !== undefined) {
        const isSuccess = params.status === "1";
        setPaymentData({
          orderId: params.apptransid,
          amount: Number(params.amount),
          method: "ZaloPay",
          message: isSuccess ? "Giao dịch thành công" : "Giao dịch thất bại",
        });
        setStatus(isSuccess ? "success" : "failed");
        return;
      }

      // Trường hợp không xác định
      setStatus("failed");
      setPaymentData({
        orderId: "Unknown",
        amount: 0,
        method: "Unknown",
        message: "Không tìm thấy thông tin giao dịch",
      });
    };

    detectPaymentResult();
  }, [searchParams]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-gray-500">Đang xử lý kết quả thanh toán...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center animate-fade-in-up">
        {/* Icon Trạng thái */}
        <div className="mb-6 flex justify-center">
          {status === "success" ? (
            <div className="relative">
              <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
              <CheckCircle className="h-24 w-24 text-green-500 relative z-10 bg-white rounded-full" />
            </div>
          ) : (
            <XCircle className="h-24 w-24 text-red-500" />
          )}
        </div>

        {/* Tiêu đề */}
        <h1
          className={`text-2xl font-bold mb-2 ${
            status === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {status === "success"
            ? "Thanh toán thành công!"
            : "Thanh toán thất bại"}
        </h1>
        <p className="text-gray-500 mb-8">{paymentData?.message}</p>

        {/* Chi tiết giao dịch */}
        <div className="bg-gray-50 rounded-lg p-4 mb-8 text-left space-y-3 border border-gray-100">
          <div className="flex justify-between">
            <span className="text-gray-500 text-sm">Phương thức</span>
            <span className="font-medium text-gray-900">
              {paymentData?.method}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 text-sm">Mã đơn hàng</span>
            <span
              className="font-medium text-gray-900 truncate max-w-[200px]"
              title={paymentData?.orderId}
            >
              {paymentData?.orderId}
            </span>
          </div>
          <div className="flex justify-between border-t pt-3 mt-2">
            <span className="text-gray-500 font-medium">Tổng thanh toán</span>
            <span className="font-bold text-xl text-primary">
              {formatVND(paymentData?.amount || 0)}
            </span>
          </div>
        </div>

        {/* Nút điều hướng */}
        <div className="grid gap-3">
          {/* {status === "success" && (
            <Button
              className="w-full h-12 text-lg"
              onClick={() => router.push(`/tickets/${paymentData?.orderId}`)} // Điều hướng về trang vé (tuỳ chỉnh URL)
            >
              <Ticket className="mr-2 h-5 w-5" />
              Xem vé đã đặt
            </Button>
          )} */}

          <Button
            variant="outline"
            className="w-full h-12 text-lg"
            onClick={() => router.push("/admin/ticket")}
          >
            <Home className="mr-2 h-5 w-5" />
            Về trang đặt vé
          </Button>
        </div>
      </div>

      <div className="mt-8 text-sm text-gray-400">
        Cảm ơn bạn đã sử dụng dịch vụ của CinemaGo
      </div>
    </div>
  );
}

export default function CheckoutCompletedPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentResultContent />
    </Suspense>
  );
}
