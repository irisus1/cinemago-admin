"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/components/ticket/seat-helper";
import {
  bookingService,
  showTimeService,
  roomService,
  foodDrinkService,
  type FoodDrink,
  type Booking,
  type ShowTime,
  type SeatModal,
  type Room,
} from "@/services";
import { toast } from "sonner";

// ===== INTERFACES =====

type Status = "loading" | "success" | "failed" | "pending";

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
  const [orderError, setOrderError] = useState<string | null>(null);

  // Dùng ref để kiểm soát việc polling (gọi lại api)
  const pollingCount = useRef(0);
  const maxRetries = 10; // Thử tối đa 10 lần (20s)

  useEffect(() => {
    setPrintedAt(
      new Date().toLocaleString("vi-VN", {
        hour12: false,
      })
    );
  }, []);

  useEffect(() => {
    const checkBookingStatus = async () => {
      const params = Object.fromEntries(searchParams.entries());
      let bookingId = "";
      let methodLabel = "Thanh toán";

      // 1. Lấy Booking ID từ URL params
      if (params.partnerCode === "MOMO") {
        bookingId = params.orderId; // MoMo trả về orderId là bookingId
        methodLabel = "Ví MoMo";
      } else if (params.vnp_TxnRef) {
        bookingId = params.vnp_TxnRef; // VNPay trả về TxnRef là bookingId
        methodLabel = "VNPay QR";
      } else if (params.apptransid) {
        // ZaloPay: apptransid dạng YYMMDD_BookingId
        const parts = params.apptransid.split("_");
        if (parts.length > 1) {
          const rawId = parts[1];

          if (rawId.length === 32) {
            bookingId = `${rawId.slice(0, 8)}-${rawId.slice(
              8,
              12
            )}-${rawId.slice(12, 16)}-${rawId.slice(16, 20)}-${rawId.slice(
              20
            )}`;
          } else {
            // Fallback nếu độ dài không đúng chuẩn UUID (hiếm gặp)
            bookingId = rawId;
          }
        } else {
          bookingId = params.apptransid;
        }
        methodLabel = "ZaloPay";
      } else if (params.bookingId) {
        bookingId = params.bookingId;
      }

      // Fallback: Lấy từ LocalStorage nếu URL không có
      if (!bookingId && typeof window !== "undefined") {
        bookingId = localStorage.getItem("cinemago_lastBookingId") || "";
      }

      if (!bookingId) {
        setStatus("failed");
        setPaymentData({
          orderId: "Unknown",
          amount: 0,
          method: "Unknown",
          message: "Không tìm thấy mã giao dịch.",
        });
        return;
      }

      // Set thông tin cơ bản để hiển thị trong lúc chờ
      setPaymentData((prev) => ({
        orderId: bookingId,
        amount: prev?.amount || 0,
        method: methodLabel,
        message: "Đang kiểm tra trạng thái vé...",
      }));

      try {
        // 2. Gọi API lấy chi tiết Booking từ DB
        const booking = (await bookingService.getBookingById(
          bookingId
        )) as Booking;

        // Cập nhật phương thức thanh toán chuẩn từ DB nếu có
        if (booking.paymentMethod) {
          methodLabel = booking.paymentMethod;
        }

        // 3. Kiểm tra trạng thái trong DB
        // Lưu ý: Chuỗi status này phải khớp với chuỗi Backend bạn lưu (ví dụ: "Đã thanh toán")
        if (
          booking.status === "Đã thanh toán" ||
          booking.status === "SUCCESS" ||
          booking.paymentMethod === "COD"
        ) {
          setStatus("success");
          await fetchOrderDetailData(booking); // Tải chi tiết vé để in
        } else if (
          booking.status === "Thanh toán thất bại" ||
          booking.status === "FAILED"
        ) {
          setStatus("failed");
          setPaymentData((prev) => ({
            ...prev!,
            message: "Giao dịch thất bại hoặc bị hủy.",
          }));
        } else {
          // Trường hợp "Chờ thanh toán" (Pending) -> Webhook chưa tới kịp
          if (pollingCount.current < maxRetries) {
            setStatus("pending");
            pollingCount.current += 1;
            // Gọi lại hàm này sau 2 giây (Polling)
            setTimeout(checkBookingStatus, 2000);
          } else {
            // Hết lượt thử mà vẫn chưa thấy update -> Báo lỗi hoặc yêu cầu khách check lại
            setStatus("failed");
            setPaymentData((prev) => ({
              ...prev!,
              message:
                "Giao dịch đang xử lý lâu hơn dự kiến. Vui lòng kiểm tra lại trong lịch sử vé.",
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching booking:", error);
        // Nếu lỗi mạng hoặc server, thử lại vài lần
        if (pollingCount.current < maxRetries) {
          pollingCount.current += 1;
          setTimeout(checkBookingStatus, 2000);
        } else {
          setStatus("failed");
          setPaymentData((prev) => ({
            ...prev!,
            message: "Không thể tải thông tin vé.",
          }));
        }
      }
    };

    // Hàm tách riêng để xử lý data hiển thị hóa đơn
    const fetchOrderDetailData = async (booking: Booking) => {
      try {
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

        // ... (Logic map ghế giữ nguyên như cũ) ...
        const rawTickets: TicketItem[] = booking.bookingSeats.map((bs) => {
          const seat = seatMap.get(bs.seatId);
          const seatLabel = seat?.seatNumber ?? bs.seatId;
          const seatType = String(seat?.seatType ?? "NORMAL");
          const unitPrice = showtime.price + (seat?.extraPrice ?? 0);
          return { seatLabel, seatType, unitPrice, quantity: 1 };
        });

        const normalTickets = rawTickets.filter((t) => t.seatType !== "COUPLE");
        const coupleSeats = rawTickets
          .filter((t) => t.seatType === "COUPLE")
          .sort((a, b) => {
            /* Logic sort giữ nguyên */
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

        // Cập nhật lại paymentData cho chính xác amount từ DB
        setPaymentData((prev) => ({
          ...prev!,
          amount: booking.totalPrice,
          method: booking.paymentMethod || prev?.method || "Thanh toán",
          message: "Giao dịch thành công",
        }));
      } catch (err) {
        console.error("Error parsing order detail", err);
        setOrderError("Lỗi hiển thị chi tiết vé");
      }
    };

    // Chạy hàm check lần đầu
    checkBookingStatus();

    // Cleanup timeout nếu component unmount
    return () => {
      pollingCount.current = maxRetries + 1; // Stop polling
    };
  }, [searchParams]); // Chỉ chạy khi params thay đổi (lần đầu vào trang)

  // LOGIC IN (GIỮ NGUYÊN)
  useEffect(() => {
    if (status === "success" && orderDetail && typeof window !== "undefined") {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [status, orderDetail]);

  const handleCancelBooking = () => {
    router.push("/admin/ticket");
  };

  const getSeatTypeLabel = (seatType: string) => {
    if (seatType === "VIP") return "Ghế VIP";
    if (seatType === "COUPLE") return "Ghế đôi";
    return "Ghế thường";
  };

  // RENDER LOADING / PENDING
  if (status === "loading" || status === "pending") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-600 font-medium">
          {status === "pending"
            ? "Đang đợi xác nhận từ hệ thống thanh toán..."
            : "Đang tải thông tin vé..."}
        </p>
        {paymentData?.orderId && (
          <p className="text-xs text-gray-400 mt-2">
            Mã đơn: {paymentData.orderId}
          </p>
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

          {/* ... Phần hiển thị Table vé giữ nguyên ... */}
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
                {/* ... Phần hiển thị Food giữ nguyên ... */}
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
