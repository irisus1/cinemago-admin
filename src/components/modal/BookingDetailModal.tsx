"use client";

import React, { useEffect, useState } from "react";
import {
  foodDrinkService,
  type Booking,
  User,
  Room,
  Cinema,
  ShowTime,
  SeatModal,
  Movie,
} from "@/services";
import { useAuth } from "@/context/AuthContext";
import QRCode from "react-qr-code";
import { FiPrinter, FiX } from "react-icons/fi";
import { LuQrCode } from "react-icons/lu";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  userMap: Record<string, User>;
  roomMap: Record<string, Room>;
  cinemaMap: Record<string, Cinema>;
  showTimeMap: Record<string, ShowTime>;
  movieMap: Record<string, Movie>;
}

interface DisplaySeat {
  displayName: string;
  type: string;
  price: number;
  isMerged?: boolean;
}

interface BookingDetails {
  userObj: { name: string; email: string; phone?: string } | null;
  cinemaName: string;
  roomName: string;
  displaySeats: DisplaySeat[];
  foodItems: { name: string; quantity: number; price: number }[];
}

const BookingDetailModal: React.FC<Props> = ({
  isOpen,
  onClose,
  booking,
  userMap,
  roomMap,
  cinemaMap,
  showTimeMap,
  movieMap,
}) => {
  const [details, setDetails] = useState<BookingDetails | null>(null);
  const [loadingFood, setLoadingFood] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const { user: currentUser } = useAuth();

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(val);

  const processSeats = (
    bookingSeats: { seatId: string }[],
    allRoomSeats: SeatModal[],
    basePrice: number,
  ): DisplaySeat[] => {
    const rawSeats = bookingSeats
      .map((bs) => {
        const seatDef = allRoomSeats.find((s) => s.id === bs.seatId);
        if (!seatDef) return null;
        return {
          name: seatDef.seatNumber,
          type: seatDef.seatType,
          price: basePrice + (seatDef.extraPrice || 0),
          row: seatDef.seatNumber.charAt(0),
          number: parseInt(seatDef.seatNumber.slice(1)) || 0,
        };
      })
      .filter((s): s is NonNullable<typeof s> => !!s);

    const coupleSeats = rawSeats.filter((s) => s.type === "COUPLE");
    const otherSeats = rawSeats.filter((s) => s.type !== "COUPLE");

    coupleSeats.sort((a, b) => {
      if (a.row === b.row) return a.number - b.number;
      return a.row.localeCompare(b.row);
    });

    const mergedCouples: DisplaySeat[] = [];
    const visitedIndices = new Set<number>();

    for (let i = 0; i < coupleSeats.length; i++) {
      if (visitedIndices.has(i)) continue;

      const current = coupleSeats[i];
      const nextIndex = i + 1;
      if (nextIndex < coupleSeats.length) {
        const next = coupleSeats[nextIndex];
        if (next.row === current.row && next.number === current.number + 1) {
          mergedCouples.push({
            displayName: `${current.name}-${next.name}`,
            type: "COUPLE",
            price: current.price + next.price,
            isMerged: true,
          });
          visitedIndices.add(nextIndex);
          continue;
        }
      }

      mergedCouples.push({
        displayName: current.name,
        type: "COUPLE",
        price: current.price,
        isMerged: false,
      });
    }

    const formattedOthers: DisplaySeat[] = otherSeats.map((s) => ({
      displayName: s.name,
      type: s.type,
      price: s.price,
      isMerged: false,
    }));

    return [...formattedOthers, ...mergedCouples];
  };

  useEffect(() => {
    if (isOpen && booking) {
      const user = booking.userId ? userMap[booking.userId] : null;

      let userObj = null;
      if (user) {
        if (currentUser && user.email === currentUser.email) {
          userObj = {
            name: "Khách vãng lai (Tại quầy)",
            email: "",
          };
        } else {
          userObj = {
            name: user.fullname,
            email: user.email,
          };
        }
      }

      const showTime = showTimeMap[booking.showtimeId];
      const room = showTime ? roomMap[showTime.roomId] : null;
      const cinema = showTime ? cinemaMap[showTime.cinemaId] : null;

      const roomName = room?.name || "Phòng ?";
      const cinemaName = cinema?.name || "Rạp ?";
      const basePrice = showTime?.price || 0;

      let displaySeats: DisplaySeat[] = [];
      if (room && room.seats) {
        displaySeats = processSeats(
          booking.bookingSeats,
          room.seats,
          basePrice,
        );
      } else {
        displaySeats = booking.bookingSeats.map(() => ({
          displayName: "ID?",
          type: "UNKNOWN",
          price: 0,
        }));
      }

      const initialFoodItems = booking.bookingFoodDrinks.map((f) => ({
        name: "Đang tải tên...",
        quantity: f.quantity,
        price: f.totalPrice,
      }));

      setDetails({
        userObj,
        cinemaName,
        roomName,
        displaySeats,
        foodItems: initialFoodItems,
      });

      if (booking.bookingFoodDrinks.length > 0) {
        setLoadingFood(true);
        Promise.all(
          booking.bookingFoodDrinks.map(async (item) => {
            try {
              const foodData = await foodDrinkService.getFoodDrinkById(
                item.foodDrinkId,
              );

              return {
                name: foodData.name || "Món lạ",
                quantity: item.quantity,
                price: item.totalPrice,
              };
            } catch {
              return {
                name: "Món ?",
                quantity: item.quantity,
                price: item.totalPrice,
              };
            }
          }),
        ).then((updatedFoods) => {
          setDetails((prev) =>
            prev ? { ...prev, foodItems: updatedFoods } : null,
          );
          setLoadingFood(false);
        });
      }
    } else {
      setDetails(null);
    }
  }, [isOpen, booking, userMap, showTimeMap, roomMap, cinemaMap]);

  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="bg-white z-10 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              Chi tiết đơn hàng
            </h3>
            <span className="text-sm text-gray-500 font-mono">
              #{booking.id}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <p className="text-xs font-bold uppercase mb-2">Khách hàng</p>
              <p className="font-bold text-gray-800 text-lg">
                {details?.userObj?.name || "Khách vãng lai"}
              </p>
              <p className="text-sm text-gray-600">{details?.userObj?.email}</p>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
              <p className="text-xs font-bold uppercase mb-2">Thông tin rạp</p>
              <p className="font-bold text-gray-800">{details?.cinemaName}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-medium">{details?.roomName}</span>
                <span className="text-sm text-gray-600">
                  {new Date(booking.createdAt).toLocaleDateString("vi-VN")}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>Ghế đã đặt</span>
              <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                {booking.bookingSeats.length} vé
              </span>
            </h4>

            {details?.displaySeats && details.displaySeats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-3 py-2 text-left">Ghế</th>
                      <th className="px-3 py-2 text-left">Loại ghế</th>
                      <th className="px-3 py-2 text-right">Giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.displaySeats.map((seat, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-gray-200 last:border-0"
                      >
                        <td className="px-3 py-2 font-semibold">
                          {seat.displayName}
                        </td>
                        <td className="px-3 py-2 text-[11px] uppercase font-semibold opacity-80">
                          {seat.type === "VIP"
                            ? "Ghế VIP"
                            : seat.type === "COUPLE"
                              ? "Ghế đôi"
                              : "Ghế thường"}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatCurrency(seat.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-400 italic text-sm">
                Không có thông tin ghế.
              </p>
            )}
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>Bắp & Nước</span>
              {loadingFood && (
                <span className="text-xs text-blue-500 animate-pulse">
                  (Đang tải tên...)
                </span>
              )}
            </h4>

            {details?.foodItems && details.foodItems.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-600 font-medium">
                    <tr>
                      <th className="px-4 py-2">Tên món</th>
                      <th className="px-4 py-2 text-center">SL</th>
                      <th className="px-4 py-2 text-right">Tổng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {details.foodItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td
                          className={`px-4 py-2 font-medium ${
                            item.name.includes("Đang tải")
                              ? "text-gray-400 italic"
                              : "text-gray-800"
                          }`}
                        >
                          {item.name}
                        </td>
                        <td className="px-4 py-2 text-center">
                          x{item.quantity}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-600">
                          {formatCurrency(item.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded text-center">
                Không có đồ ăn kèm.
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center print:hidden">
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">
              Tổng thanh toán
            </p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(booking.totalPrice)}
            </p>
          </div>

          <div className="flex gap-3">
            {booking.status === "Đã thanh toán" && (
              <>
                <button
                  onClick={() => window.print()}
                  disabled={booking.isUsed}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    booking.isUsed
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                  }`}
                >
                  <FiPrinter size={18} />
                  <span>In vé</span>
                </button>
                <button
                  onClick={() => setShowQR(true)}
                  disabled={booking.isUsed}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    booking.isUsed
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-200"
                  }`}
                >
                  <LuQrCode size={18} />
                  <span>Mã QR</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 font-medium"
            >
              Đóng
            </button>
          </div>
        </div>

        <div className="hidden print:block p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold uppercase mb-2">Vé Xem Phim</h1>
            <p className="text-sm text-gray-500">{details?.cinemaName}</p>
            <p className="text-sm text-gray-500">{details?.roomName}</p>
          </div>
          <div className="mb-6 border-b pb-4">
            <p className="flex justify-between">
              <span>Mã vé:</span>{" "}
              <span className="font-mono font-bold">
                {booking.id.slice(0, 8).toUpperCase()}
              </span>
            </p>
            <p className="flex justify-between">
              <span>Phim:</span>{" "}
              <span className="font-bold">
                {movieMap[showTimeMap[booking.showtimeId]?.movieId]?.title ||
                  "Unknown"}
              </span>
            </p>
            <p className="flex justify-between">
              <span>Suất chiếu:</span>{" "}
              <span>
                {new Date(
                  showTimeMap[booking.showtimeId]?.startTime,
                ).toLocaleString("vi-VN")}
              </span>
            </p>
          </div>

          <div className="flex justify-center mb-6">
            <QRCode
              value={JSON.stringify({
                id: booking.id,
                showtimeId: booking.showtimeId,
              })}
              size={150}
            />
          </div>
          <p className="text-center text-xs italic">
            Vui lòng đưa mã này cho nhân viên soát vé.
          </p>
        </div>
      </div>

      {showQR && (
        <div className="absolute inset-0 z-50 bg-white/95 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-200 print:hidden">
          <button
            onClick={() => setShowQR(false)}
            className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 rounded-full transition-colors"
          >
            <FiX size={24} />
          </button>

          <div className="bg-white p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 text-center">
            <h3 className="text-xl font-bold text-gray-800 mb-6">
              Mã Vé Vào Rạp
            </h3>
            <div className="p-4 bg-white border-2 border-gray-900 rounded-xl inline-block mb-6">
              <QRCode
                value={JSON.stringify({
                  id: booking.id,
                  showtimeId: booking.showtimeId,
                })}
                size={220}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox={`0 0 256 256`}
              />
            </div>
            <p className="font-mono text-lg font-bold text-gray-600 tracking-wider">
              {booking.id.slice(0, 8).toUpperCase()}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Quét mã này tại quầy soát vé
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingDetailModal;
