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
} from "@/services";

// 1. Cập nhật Interface Props để nhận các Map
interface Props {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  userMap: Record<string, User>;
  roomMap: Record<string, Room>;
  cinemaMap: Record<string, Cinema>;
  showTimeMap: Record<string, ShowTime>;
}

interface DisplaySeat {
  displayName: string; // "A1" hoặc "J10-J11"
  type: string; // "NORMAL", "VIP", "COUPLE"
  price: number; // Tổng giá
  isMerged?: boolean; // Đánh dấu là ghế gộp
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
}) => {
  const [details, setDetails] = useState<BookingDetails | null>(null);
  const [loadingFood, setLoadingFood] = useState(false);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(val);

  const processSeats = (
    bookingSeats: { seatId: string }[],
    allRoomSeats: SeatModal[],
    basePrice: number
  ): DisplaySeat[] => {
    // 1. Map từ bookingSeat -> thông tin chi tiết (có tên, loại, giá)
    const rawSeats = bookingSeats
      .map((bs) => {
        const seatDef = allRoomSeats.find((s) => s.id === bs.seatId);
        if (!seatDef) return null;
        return {
          name: seatDef.seatNumber, // Ví dụ: "J10"
          type: seatDef.seatType, // Ví dụ: "COUPLE"
          // Giá = Giá vé gốc + Phụ thu ghế
          price: basePrice + (seatDef.extraPrice || 0),
          row: seatDef.seatNumber.charAt(0), // "J"
          number: parseInt(seatDef.seatNumber.slice(1)) || 0, // 10
        };
      })
      .filter((s): s is NonNullable<typeof s> => !!s);

    // 2. Tách ghế Couple và ghế thường
    const coupleSeats = rawSeats.filter((s) => s.type === "COUPLE");
    const otherSeats = rawSeats.filter((s) => s.type !== "COUPLE");

    // 3. Xử lý gộp ghế Couple liền kề
    // Sắp xếp theo hàng và số ghế: J10, J11, J12...
    coupleSeats.sort((a, b) => {
      if (a.row === b.row) return a.number - b.number;
      return a.row.localeCompare(b.row);
    });

    const mergedCouples: DisplaySeat[] = [];
    const visitedIndices = new Set<number>();

    for (let i = 0; i < coupleSeats.length; i++) {
      if (visitedIndices.has(i)) continue;

      const current = coupleSeats[i];
      // Kiểm tra ghế kế tiếp có phải là cặp đôi của ghế này không (Cùng hàng, số liền kề)
      const nextIndex = i + 1;
      if (nextIndex < coupleSeats.length) {
        const next = coupleSeats[nextIndex];
        if (next.row === current.row && next.number === current.number + 1) {
          // --> Tìm thấy cặp đôi: Gộp lại
          mergedCouples.push({
            displayName: `${current.name}-${next.name}`, // "J10-J11"
            type: "COUPLE",
            price: current.price + next.price, // Cộng dồn giá
            isMerged: true,
          });
          visitedIndices.add(nextIndex); // Đánh dấu đã xử lý ghế sau
          continue;
        }
      }

      // Nếu không tìm thấy cặp (ghế lẻ), cứ push bình thường
      mergedCouples.push({
        displayName: current.name,
        type: "COUPLE",
        price: current.price,
        isMerged: false,
      });
    }

    // 4. Format ghế thường
    const formattedOthers: DisplaySeat[] = otherSeats.map((s) => ({
      displayName: s.name,
      type: s.type,
      price: s.price,
      isMerged: false,
    }));

    // 5. Trả về mảng đã gộp
    return [...formattedOthers, ...mergedCouples];
  };

  useEffect(() => {
    if (isOpen && booking) {
      // --- XỬ LÝ DỮ LIỆU TỪ CACHE (KHÔNG GỌI API) ---

      // 1. Lấy User từ Map
      const user = booking.userId ? userMap[booking.userId] : null;
      const userObj = user
        ? {
            name: user.fullname,
            email: user.email,
            gender: user.gender,
          }
        : null;

      // 2. Lấy Showtime & Room & Cinema từ Map
      const showTime = showTimeMap[booking.showtimeId];
      const room = showTime ? roomMap[showTime.roomId] : null;
      const cinema = showTime ? cinemaMap[showTime.cinemaId] : null;

      const roomName = room?.name || "Phòng ?";
      const cinemaName = cinema?.name || "Rạp ?";
      const basePrice = showTime?.price || 0;

      // 3. Tính toán tên ghế (Dùng room.seats từ cache)
      let displaySeats: DisplaySeat[] = [];
      if (room && room.seats) {
        displaySeats = processSeats(
          booking.bookingSeats,
          room.seats,
          basePrice
        );
      } else {
        // Fallback nếu không có dữ liệu phòng
        displaySeats = booking.bookingSeats.map(() => ({
          displayName: "ID?",
          type: "UNKNOWN",
          price: 0,
        }));
      }

      // 4. Riêng Food: Nếu chưa cache Food thì phải gọi nhẹ, hoặc hiển thị tạm
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

      // 5. Fetch tên món ăn (Lazy load)
      if (booking.bookingFoodDrinks.length > 0) {
        setLoadingFood(true);
        Promise.all(
          booking.bookingFoodDrinks.map(async (item) => {
            try {
              const foodData = await foodDrinkService.getFoodDrinkById(
                item.foodDrinkId
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
          })
        ).then((updatedFoods) => {
          setDetails((prev) =>
            prev ? { ...prev, foodItems: updatedFoods } : null
          );
          setLoadingFood(false);
        });
      }
    } else {
      setDetails(null);
    }
  }, [isOpen, booking, userMap, showTimeMap, roomMap, cinemaMap]);

  const getSeatColor = (type: string) => {
    switch (type) {
      case "VIP":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "COUPLE":
        return "bg-pink-100 text-pink-800 border-pink-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };
  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="bg-white z-10 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
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

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Block 1: Khách & Rạp */}
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

          {/* Block 2: Ghế */}
          <div>
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>Ghế đã đặt</span>
              <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                {booking.bookingSeats.length} vé
                {/* nếu muốn đếm theo displaySeats thì đổi thành:
          {details?.displaySeats.length ?? 0} vé
      */}
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
                Không tìm thấy thông tin ghế.
              </p>
            )}
          </div>

          {/* Block 3: Đồ ăn */}
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

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">
              Tổng thanh toán
            </p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(booking.totalPrice)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-black"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailModal;
