"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/components/ticket/seat-helper";
import QRCode from "react-qr-code";
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
  bookingId: string;
  showtimeId: string;
}

interface PaymentDataState {
  orderId: string;
  amount: number;
  method: string;
  message: string;
}

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<Status>("loading");
  const [paymentData, setPaymentData] = useState<PaymentDataState | null>(null);
  const [printedAt, setPrintedAt] = useState<string>("");
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  const pollingCount = useRef(0);
  const maxRetries = 10;

  const detectPaymentMethodFromParams = (params: any) => {
    if (params.partnerCode === "MOMO") return "MOMO";
    if (params.vnp_TxnRef) return "VNPAY";
    if (params.apptransid) return "ZALOPAY";
    if (params.method === "COD") return "COD";
    return null;
  };

  useEffect(() => {
    setPrintedAt(
      new Date().toLocaleString("vi-VN", {
        hour12: false,
      }),
    );
  }, []);

  useEffect(() => {
    // Hàm tách riêng để xử lý data hiển thị hóa đơn
    const fetchOrderDetailData = async (booking: Booking) => {
      try {
        const showtime = (await showTimeService.getShowTimeById(
          booking.showtimeId,
        )) as ShowTime;
        const room = (await roomService.getRoomById(showtime.roomId)) as Room;

        const bookingFoodDrinks = booking.bookingFoodDrinks || [];

        const foodIds = Array.from(
          new Set(bookingFoodDrinks.map((fd) => fd.foodDrinkId)),
        );

        let foodDrinksMaster: FoodDrink[] = [];
        if (foodIds.length > 0) {
          const fetched = await foodDrinkService.getFoodDrinkByIds(foodIds);
          foodDrinksMaster = fetched as unknown as FoodDrink[];
        }

        const seatMap = new Map<string, SeatModal>(
          room.seats.map((s) => [s.id, s]),
        );
        const foodMap = new Map<string, FoodDrink>(
          foodDrinksMaster.map((f) => [f.id, f]),
        );

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
            const parse = (s: string) => {
              const row = s[0];
              const num = Number(s.slice(1)) || 0;
              return { row, num };
            };
            if (!a.seatLabel || !b.seatLabel) return 0;
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

        const foodDrinks: FoodDrinkItem[] = bookingFoodDrinks.map((fd) => {
          const master = foodMap.get(fd.foodDrinkId);
          const name = master?.name ?? fd.foodDrinkId;
          const qty = Math.max(fd.quantity, 1);
          const unitPrice = master?.price ?? fd.totalPrice / qty;
          return {
            name,
            quantity: fd.quantity,
            unitPrice,
            totalPrice: fd.totalPrice,
          };
        });

        setOrderDetail({
          tickets,
          foodDrinks,
          totalAmount: booking.totalPrice,
          bookingId: booking.id,
          showtimeId: booking.showtimeId,
        });

        setPaymentData((prev) => ({
          ...(prev as PaymentDataState),
          amount: booking.totalPrice,
          method: booking.paymentMethod || prev?.method || "Thanh toán",
          message: "Giao dịch thành công",
        }));
      } catch (err: any) {
        console.error("Error parsing order detail", err);
        setOrderError(
          `Lỗi hiển thị chi tiết: ${err?.message || "Không xác định"}`,
        );
        setStatus("failed");
        setPaymentData((prev) =>
          prev
            ? {
              ...prev,
              message: `Lỗi xử lý dữ liệu vé: ${err?.message}`,
            }
            : null,
        );
      }
    };

    const checkBookingStatus = async () => {
      const params = Object.fromEntries(searchParams.entries()) as Record<
        string,
        string
      >;

      let bookingId = "";
      const detectedMethod = detectPaymentMethodFromParams(params);
      let methodLabel = "Thanh toán";

      if (detectedMethod === "MOMO") {
        bookingId = params.orderId;
        methodLabel = "Ví MoMo";
      } else if (detectedMethod === "VNPAY") {
        bookingId = params.vnp_TxnRef;
        methodLabel = "VNPay QR";
      } else if (detectedMethod === "ZALOPAY") {
        const parts = params.apptransid.split("_");
        if (parts.length > 1) {
          const rawId = parts[1];
          bookingId =
            rawId.length === 32
              ? `${rawId.slice(0, 8)}-${rawId.slice(8, 12)}-${rawId.slice(12, 16)}-${rawId.slice(16, 20)}-${rawId.slice(20)}`
              : rawId;
        } else {
          bookingId = params.apptransid;
        }
        methodLabel = "ZaloPay";
      } else if (params.bookingId) {
        bookingId = params.bookingId;
      }

      // Fallback localStorage
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

      // Set trạng thái ban đầu
      setPaymentData((prev) => ({
        orderId: bookingId,
        amount: prev?.amount || 0,
        method: methodLabel,
        message: "Đang kiểm tra kết quả thanh toán...",
      }));

      try {
        const booking = (await bookingService.getBookingById(
          bookingId,
        )) as Booking;

        const finalMethod =
          booking.paymentMethod && booking.paymentMethod !== "COD"
            ? booking.paymentMethod
            : detectedMethod || "COD";

        const isDbSuccess =
          booking.status === "Đã thanh toán" ||
          booking.status === "SUCCESS" ||
          (booking.paymentMethod === "COD" &&
            detectedMethod !== "MOMO" &&
            detectedMethod !== "VNPAY" &&
            detectedMethod !== "ZALOPAY");

        if (isDbSuccess) {
          setStatus("success");
          await fetchOrderDetailData(booking);
          return;
        }

        let isManualSuccess = false;

        if (
          booking.status === "Thanh toán thất bại" ||
          booking.status === "FAILED"
        ) {
          setStatus("failed");
          setPaymentData((prev) =>
            prev ? { ...prev, message: "Giao dịch đã bị hủy." } : null,
          );
          return;
        }

        try {
          console.log(`Checking manual status for method: ${detectedMethod}`);

          if (detectedMethod === "MOMO") {
            const paymentId =
              params.requestId ||
              (typeof window !== "undefined"
                ? window.localStorage.getItem("cinemago_lastPaymentId")
                : "");

            if (paymentId) {
              const momoRes = await paymentService.checkStatusMoMo(paymentId);
              if (momoRes && momoRes.resultCode === 0) {
                isManualSuccess = true;
              }
            } else if (params.resultCode === "0") {
              isManualSuccess = true;
            }
          } else if (detectedMethod === "ZALOPAY") {
            const zaloRes = await paymentService.checkStatusZaloPay(
              params.apptransid,
            );
            if (zaloRes && zaloRes.return_code === 1) {
              isManualSuccess = true;
            }
          } else if (detectedMethod === "VNPAY") {
            try {
              // const vnpRes = await paymentService.checkStatusVnPay(params);
              if (params.vnp_ResponseCode === "00") {
                isManualSuccess = true;
              }
            } catch (e) {
              if (params.vnp_ResponseCode === "00") {
                isManualSuccess = true;
              }
            }
          }
        } catch (manualErr) {
          console.error("Manual check error:", manualErr);
        }

        if (isManualSuccess) {
          setStatus("success");

          const updatedBooking = {
            ...booking,
            status: "Đã thanh toán",
            paymentMethod: finalMethod,
          };

          await fetchOrderDetailData(updatedBooking);
          return;
        }

        if (pollingCount.current < maxRetries) {
          setStatus("pending");
          pollingCount.current += 1;
          setTimeout(checkBookingStatus, 2000);
        } else {
          setStatus("failed");
          setPaymentData((prev) =>
            prev
              ? {
                ...prev,
                message: "Giao dịch chưa hoàn tất hoặc đang xử lý.",
              }
              : null,
          );
        }
      } catch (error) {
        console.error("Error flow:", error);
        setStatus("failed");
      }
    };

    checkBookingStatus();

    return () => {
      pollingCount.current = maxRetries + 1;
    };
  }, [searchParams]);

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
  if (
    status === "loading" ||
    status === "pending" ||
    (status === "success" && !orderDetail)
  ) {
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
      0,
    );
    const foodTotal = orderDetail.foodDrinks.reduce(
      (sum, f) => sum + f.totalPrice,
      0,
    );

    return (
      <div className="min-h-screen bg-gray-100 flex justify-center py-10 px-4 print:p-0 print:bg-white">
        <div className="w-full max-w-[320px] bg-white p-4 text-sm text-black shadow-lg print:shadow-none print:w-auto print:max-w-none">
          <div className="text-center mb-4">
            <h1 className="font-bold text-xl uppercase">PHIẾU THANH TOÁN</h1>
            <p className="text-xs mt-1 font-semibold">CinemaGo</p>
            <p className="text-[10px] mt-1 print:text-[10px]">{printedAt}</p>
            <p className="text-[10px]">
              Mã GD: <span className="font-medium">{paymentData?.orderId}</span>
            </p>
          </div>

          <div className="border-t border-dashed border-black my-2" />

          {/* Vé xem phim */}
          <div className="mb-2">
            <h2 className="font-bold mb-1 text-sm text-center uppercase border-b border-black inline-block">
              Vé xem phim
            </h2>
            <div className="flex flex-col gap-2 mt-2">
              {orderDetail.tickets.map((t, idx) => (
                <div key={idx} className="text-xs">
                  <div className="flex justify-between font-bold">
                    <span>
                      {t.seatLabel} ({getSeatTypeLabel(t.seatType)})
                    </span>
                    <span>{formatVND(t.unitPrice)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {orderDetail.foodDrinks.length > 0 && (
            <>
              <div className="border-t border-dashed border-black my-2" />
              <div className="mb-2">
                <h2 className="font-bold mb-1 text-sm text-center uppercase border-b border-black inline-block">
                  Bắp nước
                </h2>
                <div className="flex flex-col gap-2 mt-2">
                  {orderDetail.foodDrinks.map((f, idx) => (
                    <div key={idx} className="text-xs">
                      <div className="flex justify-between">
                        <span>
                          {f.name} (x{f.quantity})
                        </span>
                        <span className="font-bold">
                          {formatVND(f.totalPrice)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="border-t border-dashed border-black my-2" />

          <div className="space-y-1 text-xs font-bold">
            <div className="flex justify-between">
              <span>Tổng vé:</span>
              <span>{formatVND(ticketTotal)}</span>
            </div>
            {foodTotal > 0 && (
              <div className="flex justify-between">
                <span>Tổng bắp nước:</span>
                <span>{formatVND(foodTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-base mt-2 pt-2 border-t border-black">
              <span>TỔNG CỘNG:</span>
              <span>{formatVND(orderDetail.totalAmount)}</span>
            </div>
            <div className="flex justify-between font-normal italic text-[10px] mt-1">
              <span>{paymentData?.method}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-black my-4" />

          {/* QR Code */}
          <div className="flex flex-col items-center justify-center mb-4">
            <QRCode
              value={JSON.stringify({
                id: orderDetail.bookingId,
                showtimeId: orderDetail.showtimeId,
              })}
              size={100}
              style={{ height: "auto", maxWidth: "100%", width: "80%" }}
              viewBox={`0 0 256 256`}
            />
            <p className="text-[10px] font-mono mt-1">
              {orderDetail.bookingId.slice(0, 8).toUpperCase()}
            </p>
          </div>

          <div className="text-center text-[10px]">
            <p className="font-semibold">Cảm ơn quý khách!</p>
            <p>Hẹn gặp lại tại CinemaGo</p>
            <p className="italic mt-1 text-[8px] print:hidden">
              (Hóa đơn này chỉ có giá trị trong ngày)
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2 print:hidden">
            <Button
              className="w-full bg-black hover:bg-gray-800 text-white"
              onClick={() => window.print()}
            >
              In hóa đơn
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/admin/ticket")}
            >
              Đóng & Quay lại
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // RENDER FAILED
  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center px-4">
      <div className="w-full max-w-[320px] border border-red-300 bg-white p-6 text-center shadow-lg rounded-lg">
        <div className="mb-4 flex justify-center">
          <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-xl text-red-600">✕</span>
          </div>
        </div>
        <h1 className="font-bold text-lg text-red-600 mb-2">
          Thanh toán thất bại
        </h1>
        <p className="text-xs text-gray-700 mb-4">
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
