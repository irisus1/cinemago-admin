"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/components/ticket/seat-helper";
import {
  bookingService,
  showTimeService,
  roomService,
  foodDrinkService,
  paymentService,
  type FoodDrink,
  type Booking,
  type ShowTime,
  type SeatModal,
  type Room,
} from "@/services";
import { toast } from "sonner";
import axios from "axios";

// ===== INTERFACES =====

type Status = "loading" | "verifying" | "success" | "failed";
type PaymentMethodType = "MoMo" | "ZaloPay" | "VnPay" | "COD" | "UNKNOWN";

interface PaymentCheckResponse {
  // MoMo
  resultCode?: number;
  // ZaloPay
  return_code?: number;
  // Chung
  status?: string;
  message?: string;
  bookingId?: string;
  data?: {
    resultCode?: number;
    return_code?: number;
    status?: string;
    message?: string;
    bookingId?: string;
  };
}

interface TicketItem {
  seatLabel: string;
  seatType: string;
  unitPrice: number;
  quantity: number;
}

interface FoodDrinkItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OrderDetail {
  tickets: TicketItem[];
  foodDrinks: FoodDrinkItem[];
  totalAmount: number;
}

interface PaymentDataState {
  orderId: string;
  amount: number;
  method: string;
  message: string;
}

// ===== COMPONENT =====

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<Status>("loading");
  const [paymentData, setPaymentData] = useState<PaymentDataState | null>(null);
  const [printedAt, setPrintedAt] = useState<string>("");
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
    setPrintedAt(
      new Date().toLocaleString("vi-VN", {
        hour12: false,
      })
    );
  }, []);

  // LOGIC CHÍNH: KIỂM TRA TRẠNG THÁI GIAO DỊCH
  useEffect(() => {
    const verifyTransaction = async () => {
      const params = Object.fromEntries(searchParams.entries());

      let paymentIdFromUrl = "";
      let methodLabel = "Thanh toán";
      let amountFromUrl = 0;
      let methodType: PaymentMethodType = "UNKNOWN";

      // 1. PHÂN LOẠI VÍ DỰA TRÊN URL PARAMS
      if (params.partnerCode === "MOMO") {
        paymentIdFromUrl = params.orderId;
        methodLabel = "Ví MoMo";
        methodType = "MoMo";
        amountFromUrl = Number(params.amount);
      } else if (params.vnp_TxnRef) {
        paymentIdFromUrl = params.vnp_TxnRef;
        methodLabel = "VNPay QR";
        methodType = "VnPay";
        amountFromUrl = Number(params.vnp_Amount) / 100;
      } else if (params.apptransid) {
        // ZaloPay: apptransid
        paymentIdFromUrl = params.apptransid;
        methodLabel = "ZaloPay";
        methodType = "ZaloPay";
        amountFromUrl = Number(params.amount);
      } else if (params.method === "COD") {
        paymentIdFromUrl = params.bookingId || "COD-" + Date.now();
        methodLabel = "Thanh toán tại quầy (COD)";
        methodType = "COD";
        amountFromUrl = 0; // Sẽ lấy từ detail sau, hoặc params.amount nếu có
      }

      // Fallback: Lấy từ localStorage nếu URL bị mất param (F5 trang)
      if (!paymentIdFromUrl && typeof window !== "undefined") {
        paymentIdFromUrl = localStorage.getItem("cinemago_lastPaymentId") || "";
      }

      if (!paymentIdFromUrl) {
        setStatus("failed");
        setPaymentData({
          orderId: "Unknown",
          amount: 0,
          method: "Unknown",
          message: "Không tìm thấy mã giao dịch.",
        });
        return;
      }

      setPaymentData({
        orderId: paymentIdFromUrl,
        amount: amountFromUrl,
        method: methodLabel,
        message: "Đang xác thực giao dịch...",
      });
      setStatus("verifying");

      try {
        let res: PaymentCheckResponse;

        // 2. GỌI ĐÚNG API THEO LOẠI VÍ
        switch (methodType) {
          case "MoMo":
            res = (await paymentService.checkStatusMoMo(
              paymentIdFromUrl
            )) as PaymentCheckResponse;
            break;
          case "ZaloPay":
            // Bạn cần đảm bảo service có hàm này. Nếu chưa có, hãy thêm vào service frontend.
            res = (await paymentService.checkStatusZaloPay(
              paymentIdFromUrl
            )) as PaymentCheckResponse;
            break;
          case "VnPay":
            // Tương tự cho VNPay
            res = (await paymentService.checkStatusVnPay(
              paymentIdFromUrl
            )) as PaymentCheckResponse;
            break;
          case "COD":
            res = {
              status: "SUCCESS",
              message: "Thanh toán tại quầy thành công",
              bookingId: params.bookingId
            };
            break;
          default:
            // Trường hợp fallback hoặc local storage không rõ method
            // Thử gọi MoMo hoặc throw error
            console.warn(
              "Không xác định được phương thức, thử gọi MoMo check..."
            );
            res = (await paymentService.checkStatusMoMo(
              paymentIdFromUrl
            )) as PaymentCheckResponse;
            break;
        }

        console.log("Payment Check Response:", res);

        // 3. KIỂM TRA KẾT QUẢ TRẢ VỀ TỪ BACKEND
        const backendStatus = res.status || res.data?.status;
        const backendCode = res.resultCode ?? res.data?.resultCode; // MoMo
        const backendReturnCode = res.return_code ?? res.data?.return_code; // ZaloPay

        // Logic check success tổng hợp
        let isSuccess = false;

        const hasBackendData =
          backendCode !== undefined ||
          backendReturnCode !== undefined ||
          backendStatus !== undefined;

        if (hasBackendData) {
          isSuccess =
            backendCode === 0 || // MoMo thành công
            backendReturnCode === 1 || // ZaloPay thành công (return_code = 1)
            backendStatus === "Đã thanh toán" ||
            backendStatus === "SUCCESS";
        } else {
          // Fallback: Check URL params if backend data is missing
          if (methodType === "MoMo") {
            isSuccess = params.resultCode === "0";
          } else if (methodType === "VnPay") {
            isSuccess = params.vnp_ResponseCode === "00";
          } else if (methodType === "ZaloPay") {
            isSuccess = params.status === "1";
          }
        }

        if (isSuccess) {
          setPaymentData((prev) => ({
            ...prev!,
            message: "Giao dịch thành công",
          }));
          setStatus("success");

          const returnedBookingId = res.bookingId || res.data?.bookingId;
          if (returnedBookingId && typeof window !== "undefined") {
            window.localStorage.setItem(
              "cinemago_lastBookingId",
              returnedBookingId
            );
          }
        } else {
          throw new Error(
            res.message || res.data?.message || "Giao dịch thất bại"
          );
        }
      } catch (error: unknown) {
        console.error("Check status error:", error);
        setStatus("failed");
        let errorMessage = "Giao dịch thất bại hoặc bị hủy.";

        if (axios.isAxiosError(error)) {
          errorMessage = error.response?.data?.message || error.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        setPaymentData((prev) => ({
          ...prev!,
          message: errorMessage,
        }));
      }
    };

    verifyTransaction();
  }, [searchParams]);

  // LOGIC LOAD CHI TIẾT ĐƠN HÀNG (GIỮ NGUYÊN)
  useEffect(() => {
    if (status !== "success") return;

    const fetchOrderDetail = async () => {
      let bookingId: string | null = null;

      if (typeof window !== "undefined") {
        bookingId = window.localStorage.getItem("cinemago_lastBookingId");
      }

      if (!bookingId && paymentData?.orderId) {
        // Fallback tạm, nhưng với ZaloPay orderId là apptransid thì ko dùng làm bookingId được
        // Cần BE trả về bookingId trong hàm checkStatus
      }

      if (!bookingId) {
        setOrderError("Không tìm thấy mã đặt vé (Booking ID).");
        setOrderLoading(false);
        return;
      }

      try {
        setOrderLoading(true);
        setOrderError(null);

        const booking = (await bookingService.getBookingById(
          bookingId
        )) as Booking;

        const showtime = (await showTimeService.getShowTimeById(
          booking.showtimeId
        )) as ShowTime;

        const room = (await roomService.getRoomById(showtime.roomId)) as Room;

        const foodDrinksMaster =
          ((await foodDrinkService.getFoodDrinks()).data as FoodDrink[]) ?? [];

        const seatMap = new Map<string, SeatModal>(
          room.seats.map((s) => [s.id, s])
        );
        const foodMap = new Map<string, FoodDrink>(
          foodDrinksMaster.map((f) => [f.id, f])
        );

        const rawTickets: TicketItem[] = booking.bookingSeats.map((bs) => {
          const seat = seatMap.get(bs.seatId);
          const seatLabel = seat?.seatNumber ?? bs.seatId;
          const seatType = String(seat?.seatType ?? "NORMAL");
          const unitPrice = showtime.price + (seat?.extraPrice ?? 0);

          return {
            seatLabel,
            seatType,
            unitPrice,
            quantity: 1,
          };
        });

        const normalTickets = rawTickets.filter((t) => t.seatType !== "COUPLE");

        const coupleSeats = rawTickets
          .filter((t) => t.seatType === "COUPLE")
          .sort((a, b) => {
            const parse = (s: string) => {
              const row = s[0];
              const num = Number(s.slice(1)) || 0;
              return { row, num };
            };
            const pa = parse(a.seatLabel);
            const pb = parse(b.seatLabel);
            if (pa.row !== pb.row) return pa.row.localeCompare(pb.row);
            return pa.num - pb.num;
          });

        const coupleTicketPairs: TicketItem[] = [];
        for (let i = 0; i < coupleSeats.length; i += 2) {
          const first = coupleSeats[i];
          const second = coupleSeats[i + 1];

          if (!second) {
            coupleTicketPairs.push(first);
          } else {
            // SỬA GIÁ GHẾ ĐÔI: CỘNG ĐƠN GIÁ CỦA 2 GHẾ LẠI
            const couplePrice = first.unitPrice + second.unitPrice;
            coupleTicketPairs.push({
              seatLabel: `${first.seatLabel}-${second.seatLabel}`,
              seatType: "COUPLE",
              unitPrice: couplePrice,
              quantity: 1,
            });
          }
        }

        const tickets = [...normalTickets, ...coupleTicketPairs];

        const foodDrinks: FoodDrinkItem[] = booking.bookingFoodDrinks.map(
          (fd) => {
            const master = foodMap.get(fd.foodDrinkId);
            const name = master?.name ?? fd.foodDrinkId;
            const unitPrice =
              master?.price ?? fd.totalPrice / Math.max(fd.quantity, 1);

            return {
              name,
              quantity: fd.quantity,
              unitPrice,
              totalPrice: fd.totalPrice,
            };
          }
        );

        setOrderDetail({
          tickets,
          foodDrinks,
          totalAmount: booking.totalPrice,
        });
      } catch (err) {
        console.error("Fetch order detail error", err);
        setOrderError("Không tải được chi tiết đơn hàng.");
      } finally {
        setOrderLoading(false);
      }
    };

    fetchOrderDetail();
  }, [status, paymentData?.orderId]);

  // LOGIC IN (GIỮ NGUYÊN)
  useEffect(() => {
    if (
      status === "success" &&
      orderDetail &&
      !orderLoading &&
      typeof window !== "undefined"
    ) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [status, orderDetail, orderLoading]);

  const handleCancelBooking = () => {
    const bookingId =
      window.localStorage.getItem("cinemago_lastBookingId") ||
      paymentData?.orderId;
    if (bookingId) {
      toast.info("Đang chuyển hướng về trang đặt vé...");
    }
    router.push("/admin/ticket");
  };

  const getSeatTypeLabel = (seatType: string) => {
    if (seatType === "VIP") return "Ghế VIP";
    if (seatType === "COUPLE") return "Ghế đôi";
    return "Ghế thường";
  };

  // RENDER LOADING
  if (status === "loading" || status === "verifying") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-600 font-medium">
          {status === "verifying"
            ? "Đang xác thực kết quả thanh toán..."
            : "Đang xử lý..."}
        </p>
        {paymentData?.method && (
          <p className="text-sm text-gray-400 mt-2">
            Phương thức: {paymentData.method}
          </p>
        )}
      </div>
    );
  }

  // RENDER SUCCESS LOADING DETAIL
  if (status === "success" && (!orderDetail || orderLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-gray-500 mb-2">
          Thanh toán thành công, đang tải chi tiết đơn hàng...
        </p>
        {orderError && (
          <p className="text-red-500 text-sm">Lỗi: {orderError}</p>
        )}
      </div>
    );
  }

  // RENDER SUCCESS BILL
  if (status === "success" && orderDetail) {
    const ticketTotal = orderDetail.tickets.reduce(
      (sum, t) => sum + t.unitPrice,
      0
    );
    const foodTotal = orderDetail.foodDrinks.reduce(
      (sum, f) => sum + f.totalPrice,
      0
    );

    return (
      <div className="min-h-screen bg-white flex justify-center py-10 px-4">
        <div className="w-full max-w-[700px] border border-gray-300 bg-white p-8 text-sm text-black shadow-lg">
          <div className="text-center mb-6">
            <h1 className="font-bold text-lg">PHIẾU THANH TOÁN</h1>
            <p className="text-xs mt-1">CinemaGo - Hệ thống đặt vé xem phim</p>
            <p className="text-xs mt-1">
              Thời gian in: <span className="font-medium">{printedAt}</span>
            </p>
            <p className="text-xs">
              Mã giao dịch:{" "}
              <span className="font-medium">{paymentData?.orderId}</span>
            </p>
          </div>

          <hr className="border-gray-300 mb-4" />

          <div className="mb-4">
            <h2 className="font-semibold mb-2 text-sm">Chi tiết vé xem phim</h2>
            <table className="w-full text-xs border-collapse mb-2">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-1">Ghế</th>
                  <th className="text-left py-1">Loại ghế</th>
                  <th className="text-right py-1 w-24">Đơn giá</th>
                  <th className="text-right py-1 w-12">SL</th>
                  <th className="text-right py-1 w-28">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {orderDetail.tickets.map((t, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-1">{t.seatLabel}</td>
                    <td className="py-1">{getSeatTypeLabel(t.seatType)}</td>
                    <td className="py-1 text-right">
                      {formatVND(t.unitPrice)}
                    </td>
                    <td className="py-1 text-right">1</td>
                    <td className="py-1 text-right">
                      {formatVND(t.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {orderDetail.foodDrinks.length > 0 && (
            <div className="mb-4">
              <h2 className="font-semibold mb-2 text-sm">
                Combo Food &amp; Drink
              </h2>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-1">Sản phẩm</th>
                    <th className="text-right py-1 w-12">SL</th>
                    <th className="text-right py-1 w-24">Đơn giá</th>
                    <th className="text-right py-1 w-28">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {orderDetail.foodDrinks.map((f, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-1">{f.name}</td>
                      <td className="py-1 text-right">{f.quantity}</td>
                      <td className="py-1 text-right">
                        {formatVND(f.unitPrice)}
                      </td>
                      <td className="py-1 text-right">
                        {formatVND(f.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end mb-4 text-sm">
            <div className="w-full max-w-xs space-y-1">
              <div className="flex justify-between">
                <span>Tổng vé:</span>
                <span>{formatVND(ticketTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tổng đồ ăn &amp; thức uống:</span>
                <span>{formatVND(foodTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Giảm giá / Khuyến mãi:</span>
                <span>0 đ</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-gray-300 pt-1 mt-1">
                <span>Tổng thanh toán:</span>
                <span>{formatVND(orderDetail.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Phương thức thanh toán:</span>
                <span>{paymentData?.method}</span>
              </div>
            </div>
          </div>

          <hr className="border-gray-300 mb-4" />

          <div className="text-center text-xs mb-4">
            <p>Cảm ơn bạn đã sử dụng dịch vụ CinemaGo!</p>
            <p>Phiếu này có giá trị như hóa đơn thanh toán.</p>
          </div>

          <div className="mt-4 flex justify-end print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/admin/ticket")}
            >
              Đóng tab
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // RENDER FAILED
  return (
    <div className="min-h-screen bg-white flex justify-center items-center px-4">
      <div className="w-full max-w-md border border-red-300 bg-white p-6 text-center shadow-lg rounded-lg">
        <div className="mb-4 flex justify-center">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-3xl text-red-600">✕</span>
          </div>
        </div>
        <h1 className="font-bold text-xl text-red-600 mb-2">
          Thanh toán thất bại
        </h1>
        <p className="text-sm text-gray-700 mb-4">
          {paymentData?.message || "Đã có lỗi xảy ra"}
        </p>
        <div className="bg-gray-50 p-3 rounded mb-6 text-left">
          <p className="text-xs text-gray-500">
            Mã giao dịch:{" "}
            <span className="font-mono text-black">{paymentData?.orderId}</span>
          </p>
          {paymentData?.method && (
            <p className="text-xs text-gray-500 mt-1">
              Phương thức: {paymentData.method}
            </p>
          )}
        </div>
        <div className="print:hidden">
          <Button className="w-full" onClick={handleCancelBooking}>
            Về trang đặt vé
          </Button>
        </div>
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
