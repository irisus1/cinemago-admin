import { useState, useEffect, useMemo } from "react";
import {
  showTimeService,
  roomService,
  foodDrinkService,
  paymentService,
  bookingService,
  type Movie,
  SeatCell,
  SeatModal,
  FoodDrink,
  ShowTime,
  Room,
} from "@/services";
import { type TicketType, calculateSeatCounts } from "./seat-helper";
import { type GroupedByRoom } from "./showtimelist";

export interface SelectedShowtimeInfo {
  id: string;
  roomName: string;
  roomId: string;
  basePrice: number;
  vipSurcharge: number;
  coupleSurcharge: number;
}

interface UseBookingLogicProps {
  isOpen: boolean;
  movie: Movie | null;
  cinemaId: string;
  date: string;
}

export const useBookingLogic = ({
  isOpen,
  movie,
  cinemaId,
  date,
}: UseBookingLogicProps) => {
  // --- STATE ---
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groupedData, setGroupedData] = useState<GroupedByRoom[]>([]);
  const [selectedShowtime, setSelectedShowtime] =
    useState<SelectedShowtimeInfo | null>(null);

  const [quantities, setQuantities] = useState<Record<TicketType, number>>({
    standard: 0,
    vip: 0,
    couple: 0,
  });
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [processingSeats, setProcessingSeats] = useState<string[]>([]);
  const [heldSeats, setHeldSeats] = useState<string[]>([]);

  const [seatLayout, setSeatLayout] = useState<SeatCell[]>([]);
  const [seatList, setSeatList] = useState<SeatModal[]>([]);
  const [loadingLayout, setLoadingLayout] = useState(false);

  const [foods, setFoods] = useState<FoodDrink[]>([]);
  const [foodQuantities, setFoodQuantities] = useState<
    Record<string | number, number>
  >({});

  // 1. Reset state khi đóng sheet
  useEffect(() => {
    if (!isOpen) {
      setSelectedShowtime(null);
      setQuantities({ standard: 0, vip: 0, couple: 0 });
      setSelectedSeats([]);
      setSeatList([]);
      setSeatLayout([]);
      setFoodQuantities({});
      setProcessingSeats([]);
      setHeldSeats([]);
    }
  }, [isOpen]);

  // 2. Fetch Showtimes & Foods
  useEffect(() => {
    if (!isOpen || !movie || !cinemaId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const resSt = await showTimeService.getShowTimes({
          startTime: `${date}T00:00:00`,
          endTime: `${date}T23:59:59`,
          cinemaId,
          movieId: movie.id,
        });
        const rawShowtimes = resSt?.data || [];

        const uniqueRoomIds = Array.from(
          new Set(rawShowtimes.map((s: ShowTime) => s.roomId))
        ).filter((id) => id);

        const roomRes = await Promise.all(
          uniqueRoomIds.map((id) => roomService.getRoomById(id))
        );
        const roomInfoMap: Record<string, Room> = {};
        roomRes.forEach((r: Room, index) => {
          console.log(r);

          if (r) roomInfoMap[String(uniqueRoomIds[index])] = r;
        });

        const now = new Date();
        const groups: Record<string, GroupedByRoom> = {};
        rawShowtimes.forEach((item: ShowTime) => {
          const rId = String(item.roomId);
          const fmt = item.format || "2D";
          const rInfo = roomInfoMap[rId] || {
            name: `Phòng ${rId}`,
            VIP: 0,
            COUPLE: 0,
          };

          if (!groups[rId])
            groups[rId] = { roomId: rId, roomName: rInfo.name, formats: {} };
          if (!groups[rId].formats[fmt]) groups[rId].formats[fmt] = [];

          const cleanTime = item.startTime.replace("Z", "");
          const showtimeDate = new Date(cleanTime);
          const isPast = showtimeDate < now;

          groups[rId].formats[fmt].push({
            id: item.id,
            startTime: cleanTime,
            price: Number(item.price) || 0,
            vipPrice: Number(rInfo.VIP) || 0,
            couplePrice: Number(rInfo.COUPLE) || 0,
            isPast,
          });
        });

        const result = Object.values(groups).map((room) => {
          Object.keys(room.formats).forEach((fmtKey) => {
            room.formats[fmtKey].sort(
              (a, b) =>
                new Date(a.startTime).getTime() -
                new Date(b.startTime).getTime()
            );
          });
          return room;
        });
        setGroupedData(result);

        const foodList = await foodDrinkService.getFoodDrinks();
        setFoods(foodList.data || []);
      } catch (error) {
        console.error(error);
        setGroupedData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isOpen, movie, cinemaId, date]);

  // --- HANDLERS ---

  const handleSelectShowtime = async (
    id: string,
    roomName: string,
    roomId: string,
    basePrice: number,
    vipSurcharge: number,
    coupleSurcharge: number
  ) => {
    setQuantities({ standard: 0, vip: 0, couple: 0 });
    setSelectedSeats([]);
    setSeatList([]);
    setFoodQuantities({});
    setSeatLayout([]);
    setProcessingSeats([]);
    setHeldSeats([]);
    setSelectedShowtime({
      id,
      roomName,
      roomId,
      basePrice,
      vipSurcharge,
      coupleSurcharge,
    });

    setLoadingLayout(true);
    try {
      const res = await roomService.getRoomById(roomId);
      setSeatList(Array.isArray(res.seats) ? res.seats : []);
      setSeatLayout(Array.isArray(res.seatLayout) ? res.seatLayout : []);

      const holdRes = await roomService.getHeldSeats(String(id));
      console.log("Held seats:", holdRes);

      const book = await bookingService.getBookedSeats(id);
      console.log("Booked seats:", book);

      // 1. Extract held seat IDs
      const heldIds = Array.isArray(holdRes)
        ? holdRes.map((item) => item.seatId)
        : [];

      // 2. Extract booked seat IDs
      const bookedIds = Array.isArray(book)
        ? book.map((item) => item.seatId)
        : [];

      // 3. Merge + remove duplicates
      const mergedSeatIds = Array.from(new Set([...heldIds, ...bookedIds]));

      setHeldSeats(mergedSeatIds);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingLayout(false);
    }
  };

  const handleToggleSeat = async (
    seat: SeatModal,
    nextSeat: SeatModal | null
  ) => {
    if (!selectedShowtime) return;
    const idsToToggle = [seat.id];
    if (seat.seatType === "COUPLE" && nextSeat) idsToToggle.push(nextSeat.id);
    const isSelecting = !selectedSeats.includes(seat.id);
    setProcessingSeats((prev) => [...prev, ...idsToToggle]);
    try {
      const showtimeIdStr = String(selectedShowtime.id);
      if (isSelecting) {
        await Promise.all(
          idsToToggle.map((id) => roomService.holdSeat(showtimeIdStr, id))
        );
        setSelectedSeats((prev) => [...prev, ...idsToToggle]);
      } else {
        await Promise.all(
          idsToToggle.map((id) => roomService.holdSeat(showtimeIdStr, id))
        );
        setSelectedSeats((prev) =>
          prev.filter((id) => !idsToToggle.includes(id))
        );
      }
    } catch (error) {
      console.error("Seat action failed:", error);
      alert("Ghế này vừa bị người khác chọn!");
    } finally {
      setProcessingSeats((prev) =>
        prev.filter((id) => !idsToToggle.includes(id))
      );
    }
  };

  const updateQuantity = (type: TicketType, delta: number) => {
    setQuantities((prev) => {
      const newValue = prev[type] + delta;
      return newValue < 0 || newValue > 5
        ? prev
        : { ...prev, [type]: newValue };
    });
  };

  const updateFoodQuantity = (id: string | number, delta: number) => {
    setFoodQuantities((prev) => {
      const current = prev[id] || 0;
      const newValue = Math.max(0, current + delta);
      return { ...prev, [id]: newValue };
    });
  };

  const handleOpenPaymentModal = () => {
    if (!selectedShowtime) return;
    setIsPaymentModalOpen(true);
  };

  const handleProcessPayment = async (method: "MOMO" | "VNPAY" | "ZALOPAY") => {
    if (!selectedShowtime) return;
    setIsSubmitting(true);

    try {
      const foodDrinkPayload = Object.entries(foodQuantities)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({
          foodDrinkId: String(id),
          quantity: qty,
        }));

      const bookingData = {
        showtimeId: String(selectedShowtime.id),
        seatIds: selectedSeats,
        foodDrinks: foodDrinkPayload,
      };

      console.log("=== PAYLOAD GỬI ĐI ===", bookingData);

      const res = await roomService.getHeldSeats(selectedShowtime.id);
      console.log(res);

      //   for (const seatId of selectedSeats) {
      //     await roomService.holdSeat(selectedShowtime.id, seatId);
      //   }

      const bookingRes = await bookingService.createBooking(bookingData);
      const { id: bookingId, totalPrice } = bookingRes;

      let paymentRes;
      const paymentPayload = { bookingId, amount: totalPrice };

      if (method === "MOMO") {
        paymentRes = await paymentService.checkoutWithMoMo(paymentPayload);
      } else if (method === "VNPAY") {
        paymentRes = await paymentService.checkoutWithVnPay(paymentPayload);
      } else {
        paymentRes = await paymentService.checkoutWithZaloPay(paymentPayload);
      }

      // 4. Redirect user đến trang thanh toán
      if (paymentRes) {
        window.location.href = paymentRes;
      } else {
        alert("Không nhận được link thanh toán!");
      }
    } catch (error) {
      console.error("Payment Process Error:", error);
      alert("Có lỗi xảy ra trong quá trình xử lý thanh toán.");
      setIsSubmitting(false); // Chỉ tắt loading nếu lỗi, nếu thành công thì trang đã redirect
    }
  };

  const summaryData = useMemo(() => {
    if (!selectedShowtime)
      return {
        totalQty: 0,
        totalPrice: 0,
        isEnoughSeats: false,
        formattedSelectedSeats: "",
        totalFoodPrice: 0,
        formattedFoods: "",
      };

    const qty = quantities.standard + quantities.vip + quantities.couple;
    const ticketPrice =
      quantities.standard * selectedShowtime.basePrice +
      quantities.vip *
        (selectedShowtime.basePrice + selectedShowtime.vipSurcharge) +
      quantities.couple *
        (selectedShowtime.basePrice + selectedShowtime.coupleSurcharge);

    let foodPrice = 0;
    const foodItemsStr: string[] = [];
    Object.entries(foodQuantities).forEach(([id, q]) => {
      if (q > 0) {
        const foodItem = foods.find((f) => String(f.id) === id);
        if (foodItem) {
          foodPrice += foodItem.price * q;
          foodItemsStr.push(`${q}x ${foodItem.name}`);
        }
      }
    });

    const counts = calculateSeatCounts(selectedSeats, seatList);
    const enough =
      counts.standard === quantities.standard &&
      counts.vip === quantities.vip &&
      counts.couple === quantities.couple;

    const seatsStr =
      selectedSeats.length === 0
        ? "Chưa chọn"
        : selectedSeats
            .map((id) => {
              const s = seatList.find((item) => item.id === id);
              return s ? s.seatNumber : "?";
            })
            .sort()
            .join(", ");

    return {
      totalQty: qty,
      totalPrice: ticketPrice + foodPrice,
      totalFoodPrice: foodPrice,
      isEnoughSeats: enough,
      formattedSelectedSeats: seatsStr,
      formattedFoods: foodItemsStr.join(", "),
    };
  }, [
    quantities,
    selectedSeats,
    selectedShowtime,
    seatList,
    foodQuantities,
    foods,
  ]);

  return {
    // State
    loading,
    groupedData,
    selectedShowtime,
    quantities,
    selectedSeats,
    seatList,
    seatLayout,
    loadingLayout,
    foods,
    foodQuantities,
    isPaymentModalOpen,
    isSubmitting,

    heldSeats,
    handleToggleSeat,
    processingSeats,

    // Setters
    setSelectedShowtime,
    setSelectedSeats,
    setIsPaymentModalOpen,

    // Handlers
    handleSelectShowtime,
    updateQuantity,
    updateFoodQuantity,
    handleOpenPaymentModal,
    handleProcessPayment,
    // Computed
    ...summaryData,
  };
};
