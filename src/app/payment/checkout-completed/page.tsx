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
  type FoodDrink,
  Booking,
  BookingFoodDrink,
  BookingSeat,
  ShowTime,
  SeatModal,
  Room,
} from "@/services"; // chỉnh path nếu khác

// ===== TYPES (chỉ dùng nội bộ trang này) =====

type Status = "loading" | "success" | "failed";

// Dữ liệu để in
interface TicketItem {
  seatLabel: string; // VD: "A5"
  seatType: string; // NORMAL / VIP / COUPLE
  unitPrice: number;
  quantity: number;
}

interface FoodDrinkItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

interface OrderDetail {
  tickets: TicketItem[];
  foodDrinks: FoodDrinkItem[];
  totalAmount: number;
}

// ===== COMPONENT =====

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<Status>("loading");
  const [paymentData, setPaymentData] = useState<{
    orderId: string;
    amount: number;
    method: string;
    message: string;
  } | null>(null);

  const [printedAt, setPrintedAt] = useState<string>("");

  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Thời gian in
  useEffect(() => {
    setPrintedAt(
      new Date().toLocaleString("vi-VN", {
        hour12: false,
      })
    );
  }, []);

  // Đọc kết quả từ cổng thanh toán
  useEffect(() => {
    const params = Object.fromEntries(searchParams.entries());

    // 1. MoMo
    if (params.partnerCode === "MOMO") {
      const isSuccess = params.resultCode === "0";
      setPaymentData({
        orderId: params.orderId,
        amount: Number(params.amount),
        method: "Ví MoMo",
        message: isSuccess
          ? "Giao dịch thành công"
          : "Giao dịch thất bại hoặc bị huỷ",
      });
      setStatus(isSuccess ? "success" : "failed");
      return;
    }

    // 2. VNPay
    if (params.vnp_ResponseCode) {
      const isSuccess = params.vnp_ResponseCode === "00";
      setPaymentData({
        orderId: params.vnp_TxnRef,
        amount: Number(params.vnp_Amount) / 100,
        method: "VNPay QR",
        message: isSuccess ? "Giao dịch thành công" : "Giao dịch thất bại",
      });
      setStatus(isSuccess ? "success" : "failed");
      return;
    }

    // 3. ZaloPay
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

    // Không xác định
    setStatus("failed");
    setPaymentData({
      orderId: "Unknown",
      amount: 0,
      method: "Unknown",
      message: "Không tìm thấy thông tin giao dịch",
    });
  }, [searchParams]);

  // Khi SUCCESS -> gọi các API khác để ghép đủ dữ liệu đơn hàng (ghế + food&drink)
  useEffect(() => {
    const fetchOrderDetail = async () => {
      if (status !== "success") return;

      let bookingId: string | null = null;

      if (typeof window !== "undefined") {
        bookingId = window.localStorage.getItem("cinemago_lastBookingId");
      }

      // fallback: nếu BE có gắn bookingId trên URL thì tận dụng luôn
      if (!bookingId && paymentData?.orderId) {
        bookingId = paymentData.orderId;
      }

      if (!bookingId) {
        setOrderError("Không tìm thấy mã đặt vé trong trình duyệt.");
        setOrderLoading(false);
        return;
      }

      try {
        setOrderLoading(true);
        setOrderError(null);

        // 1. Lấy booking
        const booking = (await bookingService.getBookingById(
          bookingId
        )) as Booking;

        // 2. Lấy showtime để biết roomId + giá base (price)
        const showtime = (await showTimeService.getShowTimeById(
          booking.showtimeId
        )) as ShowTime;

        // 3. Lấy room để biết danh sách seats (seatNumber, seatType, extraPrice)
        const room = (await roomService.getRoomById(showtime.roomId)) as Room;

        // 4. Lấy danh sách món ăn
        const foodDrinksMaster =
          ((await foodDrinkService.getFoodDrinks()).data as FoodDrink[]) ?? [];

        const seatMap = new Map<string, SeatModal>(
          room.seats.map((s) => [s.id, s])
        );
        const foodMap = new Map<string, FoodDrink>(
          foodDrinksMaster.map((f) => [f.id, f])
        );

        // 5. Map ra TicketItem
        const rawTickets: TicketItem[] = booking.bookingSeats.map((bs) => {
          const seat = seatMap.get(bs.seatId);
          const seatLabel = seat?.seatNumber ?? bs.seatId;
          const seatType = String(seat?.seatType ?? "NORMAL");

          // Giá = giá showtime + extraPrice của ghế
          const unitPrice = showtime.price + (seat?.extraPrice ?? 0);

          return {
            seatLabel,
            seatType,
            unitPrice,
            quantity: 1,
          };
        });

        // === GỘP GHẾ ĐÔI ===
        const normalTickets = rawTickets.filter((t) => t.seatType !== "COUPLE");

        // sort ghế đôi theo label để ghép cặp cho đẹp (N1-N2, N3-N4, ...)
        const coupleSeats = rawTickets
          .filter((t) => t.seatType === "COUPLE")
          .sort((a, b) => {
            // tách chữ + số: N10 > N2
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
            // lỡ odd number thì để 1 mình nó
            coupleTicketPairs.push(first);
          } else {
            coupleTicketPairs.push({
              seatLabel: `${first.seatLabel}-${second.seatLabel}`, // N1-N2
              seatType: "COUPLE",
              unitPrice: first.unitPrice, // giá cho cả cặp
              quantity: 1, // 1 ghế đôi
            });
          }
        }

        // Tickets cuối cùng dùng để in
        const tickets = [...normalTickets, ...coupleTicketPairs];

        // 6. Map ra FoodDrinkItem
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
            };
          }
        );

        const detail: OrderDetail = {
          tickets,
          foodDrinks,
          totalAmount: booking.totalPrice, // dùng tổng tiền từ BE
        };

        setOrderDetail(detail);
      } catch (err) {
        console.error("Fetch order detail error", err);
        setOrderError("Không tải được chi tiết đơn hàng.");
      } finally {
        setOrderLoading(false);
      }
    };

    fetchOrderDetail();
  }, [status, paymentData?.orderId]);

  // Khi thanh toán thành công **và** đã có chi tiết đơn -> mở hộp thoại in
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

  // ====== LOADING ======
  if (status === "loading" || !paymentData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Đang xử lý kết quả thanh toán...</p>
      </div>
    );
  }

  // ====== SUCCESS nhưng đang load chi tiết đơn hàng ======
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

  // ====== Giao diện phiếu thanh toán / hóa đơn ======
  if (status === "success" && orderDetail) {
    const ticketTotal = orderDetail.tickets.reduce(
      (sum, t) => sum + t.unitPrice,
      0
    );
    const foodTotal = orderDetail.foodDrinks.reduce(
      (sum, f) => sum + f.unitPrice * f.quantity,
      0
    );
    const grandTotal = orderDetail.totalAmount || ticketTotal + foodTotal;

    const getSeatTypeLabel = (seatType: string) => {
      if (seatType === "VIP") return "Ghế VIP";
      if (seatType === "COUPLE") return "Ghế đôi";
      return "Ghế thường";
    };

    return (
      <div className="min-h-screen bg-white flex justify-center py-10 px-4">
        <div className="w-full max-w-[700px] border border-gray-300 bg-white p-8 text-sm text-black">
          {/* HEADER */}
          <div className="text-center mb-6">
            <h1 className="font-bold text-lg">PHIẾU THANH TOÁN</h1>
            <p className="text-xs mt-1">CinemaGo - Hệ thống đặt vé xem phim</p>
            <p className="text-xs mt-1">
              Thời gian in: <span className="font-medium">{printedAt}</span>
            </p>
            <p className="text-xs">
              Mã đơn hàng:{" "}
              <span className="font-medium">{paymentData.orderId}</span>
            </p>
          </div>

          <hr className="border-gray-300 mb-4" />

          {/* BẢNG VÉ XEM PHIM */}
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

          {/* BẢNG FOOD & DRINK */}
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
                        {formatVND(f.unitPrice * f.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TỔNG KẾT */}
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
                <span>{formatVND(grandTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Phương thức thanh toán:</span>
                <span>{paymentData.method}</span>
              </div>
            </div>
          </div>

          <hr className="border-gray-300 mb-4" />

          {/* FOOTER */}
          <div className="text-center text-xs mb-4">
            <p>Cảm ơn bạn đã sử dụng dịch vụ CinemaGo!</p>
            <p>Phiếu này có giá trị như hóa đơn thanh toán.</p>
          </div>

          {/* Nút điều hướng – chỉ hiển thị trên màn hình, ẩn khi in */}
          <div className="mt-4 flex justify-end print:hidden">
            <Button variant="outline" size="sm" onClick={() => window.close()}>
              Đóng tab
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ====== THẤT BẠI: hiển thị đơn giản ======
  return (
    <div className="min-h-screen bg-white flex justify-center items-center px-4">
      <div className="w-full max-w-md border border-red-300 bg-white p-6 text-center">
        <h1 className="font-bold text-lg text-red-600 mb-2">
          Thanh toán thất bại
        </h1>
        <p className="text-sm text-gray-700 mb-4">{paymentData.message}</p>
        <p className="text-xs text-gray-500 mb-6">
          Mã đơn hàng: {paymentData.orderId}
        </p>
        <div className="print:hidden">
          <Button onClick={() => router.push("/admin/ticket")}>
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
