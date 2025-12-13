import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import axios, { AxiosError } from "axios";
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
  HeldSeatResponse,
  BookingSeat,
} from "@/services";
import { type TicketType, calculateSeatCounts } from "./seat-helper";
import { type GroupedByRoom } from "./showtimelist";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:8000";

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

const pad = (n: number) => String(n).padStart(2, "0");

// dateStr: "2025-11-28" (giờ VN)
// -> startTime, endTime là UTC có Z, bao trọn ngày 28 theo giờ VN
const toUtcDayRangeFromLocal = (dateStr: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { startTime: undefined, endTime: undefined };
  }

  const [y, m, d] = dateStr.split("-").map(Number);

  // m-1 vì JS month 0–11
  const localStart = new Date(y, m - 1, d, 0, 0, 0, 0); // 28/11 00:00 VN
  const localNext = new Date(y, m - 1, d + 1, 0, 0, 0, 0); // 29/11 00:00 VN

  const startTime = localStart.toISOString(); // 27/11 17:00Z
  const endTime = new Date(localNext.getTime() - 1).toISOString(); // 28/11 16:59:59.999Z

  return { startTime, endTime };
};

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
  const [isPaymentStarted, setIsPaymentStarted] = useState(false);
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

  const [blockedSeats, setBlockedSeats] = useState<string[]>([]);

  const [seatLayout, setSeatLayout] = useState<SeatCell[]>([]);
  const [seatList, setSeatList] = useState<SeatModal[]>([]);
  const [loadingLayout, setLoadingLayout] = useState(false);

  const [foods, setFoods] = useState<FoodDrink[]>([]);
  const [foodQuantities, setFoodQuantities] = useState<
    Record<string | number, number>
  >({});

  const socketRef = useRef<Socket | null>(null);

  const [timeLeft, setTimeLeft] = useState<number>(0); // Số giây còn lại
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  //holdseat
  const selectedSeatsRef = useRef<string[]>([]);
  useEffect(() => {
    selectedSeatsRef.current = selectedSeats;
  }, [selectedSeats]);

  const fetchInitialSeatStatus = useCallback(async () => {
    if (!selectedShowtime) return;
    try {
      const id = String(selectedShowtime.id);

      // 1. Lấy danh sách đang giữ (API)
      const holdRes = await roomService.getHeldSeats(id);
      // 2. Lấy danh sách đã bán (API)
      const bookRes = await bookingService.getBookedSeats(id);

      const bookedIds = Array.isArray(bookRes)
        ? bookRes.map((i: BookingSeat) => i.seatId)
        : [];

      const heldIds = Array.isArray(holdRes)
        ? holdRes.map((i: HeldSeatResponse) => i.seatId)
        : [];
      console.log(heldIds);
      // Logic: Ban đầu chưa chọn gì cả, nên TẤT CẢ ghế held từ API đều là blocked
      const allBlocked = new Set([...bookedIds, ...heldIds]);

      setBlockedSeats(Array.from(allBlocked));
    } catch (e) {
      console.error("Failed to fetch initial seat status", e);
    }
  }, [selectedShowtime]);

  const releaseAllSeats = useCallback(async () => {
    const seatsToRelease = selectedSeatsRef.current;
    if (seatsToRelease.length === 0 || !selectedShowtime) return;

    try {
      const showtimeIdStr = String(selectedShowtime.id);
      await Promise.all(
        seatsToRelease.map((id) =>
          roomService.releaseSeat(showtimeIdStr, id).catch(() => null)
        )
      );
      console.log("Released all held seats on cleanup");
    } catch (e) {
      console.error("Error releasing seats:", e);
    }
  }, [selectedShowtime]);

  //time left
  const formattedTime = useMemo(() => {
    if (timeLeft <= 0) return "";
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return `${m}:${pad(s)}`; // pad hàm cũ của bạn: String(n).padStart(2, '0')
  }, [timeLeft]);

  const handleTimeout = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    // Gọi hàm release (đã định nghĩa ở code trước)
    await releaseAllSeats();

    // Reset toàn bộ state
    setSelectedSeats([]);
    setQuantities({ standard: 0, vip: 0, couple: 0 });
    setFoodQuantities({});

    toast.error("Hết thời gian giữ ghế. Vui lòng chọn lại!");

    // Optional: Đóng modal
    // setIsOpen(false);
  }, [releaseAllSeats]);

  useEffect(() => {
    // 1. Nếu không chọn ghế nào -> Reset timer
    if (selectedSeats.length === 0 || isSubmitting || isPaymentStarted) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (selectedSeats.length === 0) setTimeLeft(0);
      return;
    }

    // 2. Set thời gian ban đầu (chỉ chạy khi chưa có timer)
    if (timeLeft === 0 && selectedSeats.length > 0) {
      setTimeLeft(300); // 5 phút
    }

    // 3. Chạy timer
    if (!timerRef.current && selectedSeats.length > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // --- HẾT GIỜ ---
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    selectedSeats.length,
    timeLeft,
    isSubmitting,
    isPaymentStarted,
    handleTimeout,
  ]);

  // 1. Reset state khi đóng sheet
  useEffect(() => {
    if (!isOpen) {
      releaseAllSeats();

      setSelectedShowtime(null);
      setQuantities({ standard: 0, vip: 0, couple: 0 });
      setSelectedSeats([]);
      setSeatList([]);
      setSeatLayout([]);
      setFoodQuantities({});
      setProcessingSeats([]);
      setBlockedSeats([]);
    }
  }, [isOpen, releaseAllSeats]);

  // 2. Fetch Showtimes & Foods
  useEffect(() => {
    if (!isOpen || !movie || !cinemaId) return;
    const { startTime, endTime } = toUtcDayRangeFromLocal(date);
    if (!startTime || !endTime) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const resSt = await showTimeService.getShowTimes({
          startTime, // UTC có Z
          endTime,
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

  //socket
  useEffect(() => {
    if (!selectedShowtime) return;

    // A. Gọi API lấy trạng thái ban đầu (Booked + Held)
    fetchInitialSeatStatus();

    // B. Kết nối Socket
    socketRef.current = io(SOCKET_URL, {
      path: "/socket.io", // Khớp với config BE Gateway
      // transports: ["websocket"],
      withCredentials: true, // Bật nếu BE cần cookie
    });

    // C. Join Room
    socketRef.current.emit("join-showtime", selectedShowtime.id);

    // D. Lắng nghe sự kiện
    socketRef.current.on(
      "seat-update",
      (data: { showtimeId: string; seatId: string; status: string }) => {
        // Chỉ xử lý nếu đúng suất chiếu
        if (data.showtimeId !== selectedShowtime.id) return;

        console.log("⚡ Real-time update:", data);

        // Logic cập nhật blockedSeats
        setBlockedSeats((prevBlocked) => {
          // Nếu là ghế MÌNH đang chọn -> Bỏ qua sự kiện "held" (để không tự block mình)
          if (selectedSeatsRef.current.includes(data.seatId))
            return prevBlocked;

          if (data.status === "held" || data.status === "booked") {
            // Thêm vào danh sách bị block
            if (prevBlocked.includes(data.seatId)) return prevBlocked;
            return [...prevBlocked, data.seatId];
          }

          if (data.status === "released") {
            // Gỡ khỏi danh sách bị block
            return prevBlocked.filter((id) => id !== data.seatId);
          }

          return prevBlocked;
        });
      }
    );

    // E. Cleanup Socket
    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leave-showtime", selectedShowtime.id);
        socketRef.current.disconnect();
      }
    };
  }, [selectedShowtime, fetchInitialSeatStatus]);
  // --- HANDLERS ---

  const handleSelectShowtime = async (
    id: string,
    roomName: string,
    roomId: string,
    basePrice: number,
    vipSurcharge: number,
    coupleSurcharge: number
  ) => {
    if (selectedShowtime && selectedShowtime.id !== id) {
      await releaseAllSeats();
    }

    setQuantities({ standard: 0, vip: 0, couple: 0 });
    setSelectedSeats([]);
    setSeatList([]);
    setFoodQuantities({});
    setSeatLayout([]);
    setProcessingSeats([]);

    setBlockedSeats([]);

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

      // const holdRes = await roomService.getHeldSeats(String(id));
      // console.log("Held seats:", holdRes);

      // const book = await bookingService.getBookedSeats(id);
      // console.log("Booked seats:", book);

      // // 1. Extract held seat IDs
      // const heldIds = Array.isArray(holdRes)
      //   ? holdRes.map((item) => item.seatId)
      //   : [];

      // // 2. Extract booked seat IDs
      // const bookedIds = Array.isArray(book)
      //   ? book.map((item) => item.seatId)
      //   : [];

      // // 3. Merge + remove duplicates
      // const mergedSeatIds = Array.from(new Set([...heldIds, ...bookedIds]));

      // setHeldSeats(mergedSeatIds);
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

    const isBlocked = idsToToggle.some((id) => blockedSeats.includes(id));
    if (isBlocked) {
      toast.error("Ghế này đã có người chọn hoặc đã bán!");
      fetchInitialSeatStatus();
      return;
    }

    // Kiểm tra xem ghế đã chọn chưa
    const isSelecting = !idsToToggle.some((id) => selectedSeats.includes(id));

    // Thêm vào hàng đợi xử lý (để hiện loading trên ghế)
    setProcessingSeats((prev) => {
      // Dùng Set để tránh trùng trong processingSeats
      return Array.from(new Set([...prev, ...idsToToggle]));
    });

    try {
      const showtimeIdStr = String(selectedShowtime.id);
      if (isSelecting) {
        // --- LOGIC CHỌN GHẾ (Hold) ---
        await Promise.all(
          idsToToggle.map((id) => roomService.holdSeat(showtimeIdStr, id))
        );

        // [FIX QUAN TRỌNG]: Dùng Set để đảm bảo ID là duy nhất khi thêm mới
        setSelectedSeats((prev) =>
          Array.from(new Set([...prev, ...idsToToggle]))
        );
      } else {
        // --- LOGIC BỎ CHỌN (Release) ---
        await Promise.all(
          idsToToggle.map((id) => roomService.releaseSeat(showtimeIdStr, id))
        );

        // Lọc bỏ ID ra khỏi danh sách
        setSelectedSeats((prev) =>
          prev.filter((id) => !idsToToggle.includes(id))
        );
      }
    } catch (error: unknown) {
      console.error("Seat action failed:", error);
      // ... (Giữ nguyên phần xử lý lỗi của bạn) ...

      // Sync lại dữ liệu nếu lỗi
      fetchInitialSeatStatus();

      // Nếu lỗi khi đang chọn -> Phải bỏ chọn trong state (rollback UI)
      if (isSelecting) {
        setSelectedSeats((prev) =>
          prev.filter((id) => !idsToToggle.includes(id))
        );
      }
    } finally {
      // Xóa khỏi hàng đợi xử lý
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

    if (selectedSeats.length === 0) {
      toast.warning("Vui lòng chọn ghế trước");
      return;
    }

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

      // const res = await roomService.getHeldSeats(selectedShowtime.id);
      // console.log(res);

      //   for (const seatId of selectedSeats) {
      //     await roomService.holdSeat(selectedShowtime.id, seatId);
      //   }

      const bookingRes = await bookingService.createBooking(bookingData);
      const { id: bookingId, totalPrice } = bookingRes;

      let paymentRes;
      const paymentPayload = { bookingId, amount: totalPrice };

      if (method === "MOMO") {
        const res = await paymentService.checkoutWithMoMo(paymentPayload);
        const paymentId = res.paymentId;
        if (paymentId) {
          window.localStorage.setItem("cinemago_lastPaymentId", paymentId);
        }
        paymentRes = res.URL;
      } else if (method === "VNPAY") {
        paymentRes = await paymentService.checkoutWithVnPay(paymentPayload);
      } else {
        paymentRes = await paymentService.checkoutWithZaloPay(paymentPayload);
      }

      // 4. Redirect user đến trang thanh toán
      if (paymentRes) {
        try {
          window.localStorage.setItem("cinemago_lastBookingId", bookingId);
        } catch (e) {
          console.error("Cannot save bookingId to localStorage", e);
        }
        window.location.href = paymentRes;
        // window.open(paymentRes, "_blank", "noopener,noreferrer");

        // setIsSubmitting(false);
        setIsPaymentStarted(true);
      } else {
        toast.error("Không nhận được link thanh toán!");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Payment Process Error:", error);
      toast.error("Có lỗi xảy ra trong quá trình xử lý thanh toán.");
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
        (selectedShowtime.basePrice * 2 + selectedShowtime.coupleSurcharge * 2);

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

    const uniqueSelectedIds = Array.from(new Set(selectedSeats));

    const seatNames = uniqueSelectedIds
      .map((id) => {
        const s = seatList.find((item) => item.id === id);
        // Ưu tiên hiển thị seatName (vd: E5) hoặc seatNumber nếu name null
        return s ? s.seatNumber : "";
      })
      .filter((name) => name !== ""); // Loại bỏ rỗng

    // Sắp xếp alpha-beta và join
    const seatsStr =
      seatNames.length === 0 ? "Chưa chọn" : seatNames.sort().join(", ");

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
    isPaymentStarted,
    timeLeft,
    formattedTime,

    blockedSeats,

    heldSeats: blockedSeats,
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
