import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import axios, { AxiosError } from "axios";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
  const localStart = new Date(y, m - 1, d, 0, 0, 0, 0);
  const localNext = new Date(y, m - 1, d + 1, 0, 0, 0, 0);

  const startTime = localStart.toISOString();
  const endTime = new Date(localNext.getTime() - 1).toISOString();

  return { startTime, endTime };
};

export const useBookingLogic = ({
  isOpen,
  movie,
  cinemaId,
  date,
}: UseBookingLogicProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

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

  const [timeLeft, setTimeLeft] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  //holdseat
  const selectedSeatsRef = useRef<string[]>([]);
  useEffect(() => {
    selectedSeatsRef.current = selectedSeats;
  }, [selectedSeats]);

  const selectedShowtimeRef = useRef<SelectedShowtimeInfo | null>(null);
  useEffect(() => {
    selectedShowtimeRef.current = selectedShowtime;
  }, [selectedShowtime]);

  // Timestamp hết hạn (absolute time)
  const expiresAtRef = useRef<number | null>(null);

  // --- PERSISTENCE HELPERS ---
  const getStorageKey = (showtimeId: string) => `booking_state_${showtimeId}`;

  // 1. Auto-save State
  useEffect(() => {
    if (!selectedShowtime) return;
    const stateToSave = {
      quantities,
      selectedSeats,
      foodQuantities,
      expiresAt: expiresAtRef.current, // Save expiration time
      timestamp: Date.now(),
    };
    sessionStorage.setItem(
      getStorageKey(String(selectedShowtime.id)),
      JSON.stringify(stateToSave)
    );
  }, [quantities, selectedSeats, foodQuantities, selectedShowtime, timeLeft]); // timeLeft changed -> potentially update storage if needed but relying on ref is better. Added timeLeft for trigger or just rely on other changes.
  // Actually simplest is to save whenever relevant state changes. expiresAtRef doesn't trigger re-render, but selectedSeats changes usually accompany it.

  // -- Helper: Fetch seat status (Safe to call from anywhere) --
  const fetchInitialSeatStatusFn = useCallback(async (showtimeId: string) => {
    try {
      // 1. Lấy danh sách đang giữ (API)
      const holdRes = await roomService.getHeldSeats(showtimeId);
      // 2. Lấy danh sách đã bán (API)
      const bookRes = await bookingService.getBookedSeats(showtimeId);

      const bookedIds = Array.isArray(bookRes)
        ? bookRes.map((i: BookingSeat) => i.seatId)
        : [];

      const heldIds = Array.isArray(holdRes)
        ? holdRes.map((i: HeldSeatResponse) => i.seatId)
        : [];

      // Nếu ghế nằm trong SessionStorage của tôi -> Không coi là Blocked
      let mySavedSeats: string[] = [];
      try {
        const saved = sessionStorage.getItem(getStorageKey(showtimeId));
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.selectedSeats)) {
            mySavedSeats = parsed.selectedSeats;
          }
        }
      } catch (e) {
        console.error("Error reading storage for override", e);
      }

      const allBlocked = new Set([...bookedIds, ...heldIds]);

      mySavedSeats.forEach((id) => allBlocked.delete(id));

      setBlockedSeats(Array.from(allBlocked));
    } catch (e) {
      console.error("Failed to fetch initial seat status", e);
    }
  }, []);

  const fetchInitialSeatStatus = useCallback(() => {
    if (selectedShowtime) fetchInitialSeatStatusFn(String(selectedShowtime.id));
  }, [selectedShowtime, fetchInitialSeatStatusFn]);

  const releaseAllSeats = useCallback(async () => {
    const seatsToRelease = selectedSeatsRef.current;
    const currentShowtime = selectedShowtimeRef.current;

    if (seatsToRelease.length === 0 || !currentShowtime) return;

    try {
      const showtimeIdStr = String(currentShowtime.id);
      await Promise.all(
        seatsToRelease.map((id) =>
          roomService.releaseSeat(showtimeIdStr, id).catch(() => null)
        )
      );

      console.log("Released all held seats on cleanup");
    } catch (e) {
      console.error("Error releasing seats:", e);
    }
  }, []);

  const handleTimeout = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;

    // 1. Explicit Release API Call
    await releaseAllSeats();

    // 2. Clean up Client State AFTER API call
    setSelectedSeats([]);
    setQuantities({ standard: 0, vip: 0, couple: 0 });
    setFoodQuantities({});
    setBlockedSeats([]); // Optional: clear local blocks

    // Clear storage for this session
    if (selectedShowtimeRef.current) {
      sessionStorage.removeItem(
        getStorageKey(String(selectedShowtimeRef.current.id))
      );
    }
    expiresAtRef.current = null;
    setTimeLeft(0);

    toast.error("Hết thời gian giữ ghế. Vui lòng chọn lại!");
  }, [releaseAllSeats]);

  useEffect(() => {
    // 1. Nếu không chọn ghế nào -> Reset timer
    if (selectedSeats.length === 0 || isSubmitting || isPaymentStarted) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      expiresAtRef.current = null;
      if (selectedSeats.length === 0) setTimeLeft(0);
      return;
    }

    // 2. Calculate Expiration (only if not set)
    if (!expiresAtRef.current && selectedSeats.length > 0) {
      // 5 minutes from now
      expiresAtRef.current = Date.now() + 5 * 60 * 1000;
    }

    // 3. Logic Countdown
    if (!timerRef.current && selectedSeats.length > 0) {
      timerRef.current = setInterval(() => {
        if (!expiresAtRef.current) return;

        const now = Date.now();
        const diff = Math.ceil((expiresAtRef.current - now) / 1000);

        if (diff <= 0) {
          // --- HẾT GIỜ ---
          handleTimeout();
        } else {
          setTimeLeft(diff);
        }
      }, 1000);

      // Update immediate UI
      const now = Date.now();
      if (expiresAtRef.current) {
        setTimeLeft(
          Math.max(0, Math.ceil((expiresAtRef.current - now) / 1000))
        );
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [selectedSeats.length, isSubmitting, isPaymentStarted, handleTimeout]);

  const handleSelectShowtime = useCallback(
    async (
      id: string,
      roomName: string,
      roomId: string,
      basePrice: number,
      vipSurcharge: number,
      coupleSurcharge: number
    ) => {
      // Current Check
      const current = selectedShowtimeRef.current;
      if (current && current.id !== id) {
        await releaseAllSeats();
      }

      setQuantities({ standard: 0, vip: 0, couple: 0 });
      setSelectedSeats([]);
      setSeatList([]);
      setFoodQuantities({});
      setSeatLayout([]);
      setProcessingSeats([]);
      setBlockedSeats([]);

      // --- REHYDRATION LOGIC ---
      try {
        const saved = sessionStorage.getItem(getStorageKey(id));
        if (saved) {
          const parsed = JSON.parse(saved);

          // CHECK TIMEOUT
          const savedExpiresAt = parsed.expiresAt;
          const now = Date.now();

          if (savedExpiresAt && now > savedExpiresAt) {
            // EXPIRED while away
            console.log("Found expired session in storage. releasing...");
            if (
              Array.isArray(parsed.selectedSeats) &&
              parsed.selectedSeats.length > 0
            ) {
              // Must release via API
              Promise.all(
                parsed.selectedSeats.map((sid: string) =>
                  roomService.releaseSeat(id, sid).catch(() => null)
                )
              ).then(() => {
                console.log("Cleaned up expired seats from storage");
                toast.error(
                  "Hết thời gian giữ ghế (Refresh). Vui lòng chọn lại!"
                );
              });
            }
            // Clear storage
            sessionStorage.removeItem(getStorageKey(id));
            // Do NOT restore
            setSelectedSeats([]);
            setQuantities({ standard: 0, vip: 0, couple: 0 });
            return; // Stop here
          }

          // VALID
          if (savedExpiresAt) {
            expiresAtRef.current = savedExpiresAt;
          }

          if (parsed.selectedSeats) setSelectedSeats(parsed.selectedSeats);
          if (parsed.quantities) setQuantities(parsed.quantities);
          if (parsed.foodQuantities) setFoodQuantities(parsed.foodQuantities);

          if (
            Array.isArray(parsed.selectedSeats) &&
            parsed.selectedSeats.length > 0
          ) {
            Promise.all(
              parsed.selectedSeats.map((sid: string) =>
                roomService
                  .holdSeat(id, sid)
                  .catch((err) => console.warn("Re-hold failed", sid))
              )
            );
          }
        }
      } catch (err) {
        console.error("Rehydration failed", err);
      }

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
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingLayout(false);
      }
    },
    [releaseAllSeats]
  );

  // 1. Sync State -> URL
  useEffect(() => {
    if (!isOpen) return;

    const params = new URLSearchParams(searchParams.toString());
    const currentShowtimeId = params.get("showtimeId");

    // Nếu INTERNAL state có showtime, mà URL khác -> Cập nhật URL
    if (selectedShowtime && selectedShowtime.id !== currentShowtimeId) {
      params.set("showtimeId", selectedShowtime.id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
    // Nếu INTERNAL state null (đã clear), mà URL còn -> Xoá URL
    else if (!selectedShowtime && currentShowtimeId) {
      params.delete("showtimeId");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [selectedShowtime, isOpen, pathname, router, searchParams]);

  // 2. Fetch Showtimes & Foods & Auto-restore Status
  useEffect(() => {
    if (!isOpen || !movie || !cinemaId) return;
    const { startTime, endTime } = toUtcDayRangeFromLocal(date);
    if (!startTime || !endTime) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const resSt = await showTimeService.getShowTimes({
          startTime,
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
          if (r) roomInfoMap[String(uniqueRoomIds[index])] = r;
        });

        const now = new Date();
        const groups: Record<string, GroupedByRoom> = {};

        let foundShowtimeToRestore:
          | (SelectedShowtimeInfo & {
            price: number;
            vipPrice: number;
            couplePrice: number;
          })
          | null = null;

        const requiredShowtimeId = searchParams.get("showtimeId");

        for (const item of rawShowtimes) {
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

          const stItem = {
            id: item.id,
            startTime: cleanTime,
            price: Number(item.price) || 0,
            vipPrice: Number(rInfo.VIP) || 0,
            couplePrice: Number(rInfo.COUPLE) || 0,
            isPast,
          };

          if (requiredShowtimeId && String(item.id) === requiredShowtimeId) {
            foundShowtimeToRestore = {
              id: stItem.id,
              roomName: rInfo.name,
              roomId: rId,
              basePrice: stItem.price,
              vipSurcharge: stItem.vipPrice,
              coupleSurcharge: stItem.couplePrice,
              price: stItem.price,
              vipPrice: stItem.vipPrice,
              couplePrice: stItem.couplePrice,
            };
          }

          groups[rId].formats[fmt].push(stItem);
        }

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

        let allFoods: any[] = [];
        let currentPage = 1;
        let hasMore = true;
        const LIMIT = 10;

        try {
          while (hasMore) {
            const foodRes = await foodDrinkService.getFoodDrinks({
              page: currentPage,
              limit: LIMIT,
              cinemaId: cinemaId,
            });

            const newItems = foodRes?.data || [];

            allFoods = [...allFoods, ...newItems];

            if (foodRes?.pagination.hasNextPage) {
              currentPage++;
            } else {
              hasMore = false;
            }
          }
        } catch (foodError) {
          console.error("Error fetching foods:", foodError);
        }

        setFoods(allFoods);

        // --- AUTO RESTORE SHOWTIME ---
        if (foundShowtimeToRestore) {
          const st = foundShowtimeToRestore;
          handleSelectShowtime(
            st.id,
            st.roomName,
            st.roomId,
            st.price,
            st.vipPrice,
            st.couplePrice
          );
        }
      } catch (error) {
        console.error(error);
        setGroupedData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, movie, cinemaId, date, handleSelectShowtime]);

  const resetBookingSession = useCallback(async () => {
    await releaseAllSeats();

    if (selectedShowtimeRef.current) {
      sessionStorage.removeItem(
        getStorageKey(String(selectedShowtimeRef.current.id))
      );
    }

    setSelectedShowtime(null);
    setQuantities({ standard: 0, vip: 0, couple: 0 });
    setSelectedSeats([]);
    setSeatList([]);
    setSeatLayout([]);
    setFoodQuantities({});
    setProcessingSeats([]);
    setBlockedSeats([]);
    expiresAtRef.current = null;
    setTimeLeft(0);

    toast.info("Đã hủy phiên đặt vé.");
  }, [releaseAllSeats]);

  // Logic an toàn khi Mở lại (Re-open Guard)
  useEffect(() => {
    if (isOpen && expiresAtRef.current) {
      const now = Date.now();
      if (now > expiresAtRef.current) {
        // Đã hết hạn trong lúc minimize
        resetBookingSession();
        toast.error("Phiên đặt vé đã hết hạn trong lúc ẩn.");
      }
    }
  }, [isOpen, resetBookingSession]);

  //socket
  useEffect(() => {
    if (!selectedShowtime) return;

    fetchInitialSeatStatusFn(String(selectedShowtime.id));

    // B. Kết nối Socket
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        path: "/socket.io",
        // transports: ["websocket"],
        withCredentials: true,
      });
    }

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
        socketRef.current.off("seat-update");

        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [selectedShowtime, fetchInitialSeatStatusFn]);

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

        setSelectedSeats((prev) =>
          Array.from(new Set([...prev, ...idsToToggle]))
        );
      } else {
        await Promise.all(
          idsToToggle.map((id) => roomService.releaseSeat(showtimeIdStr, id))
        );

        setSelectedSeats((prev) =>
          prev.filter((id) => !idsToToggle.includes(id))
        );
      }
    } catch (error: unknown) {
      console.error("Seat action failed:", error);

      fetchInitialSeatStatus();

      if (isSelecting) {
        setSelectedSeats((prev) =>
          prev.filter((id) => !idsToToggle.includes(id))
        );
      }
    } finally {
      setProcessingSeats((prev) =>
        prev.filter((id) => !idsToToggle.includes(id))
      );
    }
  };

  const updateQuantity = async (type: TicketType, delta: number) => {
    const currentQty = quantities[type];
    const newQty = currentQty + delta;

    if (newQty < 0 || newQty > 5) return;

    setQuantities((prev) => ({ ...prev, [type]: newQty }));

    if (delta < 0) {
      const mapType: Record<TicketType, string> = {
        standard: "NORMAL",
        vip: "VIP",
        couple: "COUPLE",
      };
      const targetSeatType = mapType[type];

      const seatsOfType = selectedSeats.filter((id) => {
        const seat = seatList.find((s) => s.id === id);
        return seat?.seatType === targetSeatType;
      });

      const currentSeatCount = seatsOfType.length;
      const multiplier = type === "couple" ? 2 : 1;
      const targetSeatCount = newQty * multiplier;

      if (currentSeatCount > targetSeatCount) {
        const seatsToRemoveCount = currentSeatCount - targetSeatCount;

        const seatsToRemove = seatsOfType.slice(-seatsToRemoveCount);

        if (seatsToRemove.length > 0 && selectedShowtime) {
          console.log(`Auto-releasing ${type} seats (LIFO):`, seatsToRemove);

          setSelectedSeats((prev) =>
            prev.filter((id) => !seatsToRemove.includes(id))
          );
          try {
            const showtimeIdStr = String(selectedShowtime.id);
            await Promise.all(
              seatsToRemove.map((id) =>
                roomService.releaseSeat(showtimeIdStr, id).catch((err) => {
                  console.warn("Failed to release seat", id, err);
                })
              )
            );
          } catch (error) {
            console.error("Auto-release seats failed:", error);
          }
        }
      }
    }
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

    const totalFoodCount = Object.values(foodQuantities).reduce((a, b) => a + b, 0);

    if (selectedSeats.length === 0 && totalFoodCount === 0) {
      toast.warning("Vui lòng chọn ghế hoặc bắp nước");
      return;
    }

    setIsPaymentModalOpen(true);
  };

  const handleProcessPayment = async (
    method: "MOMO" | "VNPAY" | "ZALOPAY" | "COD"
  ) => {
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
        cinemaId: cinemaId,
      };

      console.log("=== PAYLOAD GỬI ĐI ===", bookingData);

      const bookingRes = await bookingService.createBooking(bookingData);
      const { id: bookingId, totalPrice } = bookingRes;

      // --- LOGIC COD: Chuyển thẳng trang hoàn tất ---
      if (method === "COD") {
        // Xóa session storage để khi quay lại không bị dính ghế cũ
        if (selectedShowtimeRef.current) {
          sessionStorage.removeItem(
            getStorageKey(String(selectedShowtimeRef.current.id))
          );
        }
        // Clear timer
        expiresAtRef.current = null;
        if (timerRef.current) clearInterval(timerRef.current);

        // Save ID for checkout page fallback (consistency)
        window.localStorage.setItem("cinemago_lastBookingId", bookingId);

        router.push(
          `/booking-completed?bookingId=${bookingId}&status=success&method=COD`
        );
        return;
      }

      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const returnUrlPath = "/booking-completed";
      const urlCompleted = `${origin}${returnUrlPath}`;

      let paymentRes;
      const paymentPayload = {
        bookingId,
        amount: totalPrice,
        urlCompleted: urlCompleted,
      };

      if (method === "MOMO") {
        const res = await paymentService.checkoutWithMoMo(paymentPayload);
        const paymentId = res.paymentId;
        if (paymentId) {
          window.localStorage.setItem("cinemago_lastPaymentId", paymentId);
        }
        paymentRes = res.URL;
      } else if (method === "VNPAY") {
        const vnpayPayload = {
          ...paymentPayload,
          ipAddr: "127.0.0.1", // VNPAY bắt buộc cần trường này, local để 127.0.0.1 là được
        };

        paymentRes = await paymentService.checkoutWithVnPay(vnpayPayload);
      } else {
        paymentRes = await paymentService.checkoutWithZaloPay(paymentPayload);
      }

      if (paymentRes) {
        // Clear session storage & timers for online payments too
        if (selectedShowtimeRef.current) {
          sessionStorage.removeItem(
            getStorageKey(String(selectedShowtimeRef.current.id))
          );
        }
        expiresAtRef.current = null;
        if (timerRef.current) clearInterval(timerRef.current);

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
      setIsSubmitting(false);
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
        return s ? s.seatNumber : "";
      })
      .filter((name) => name !== "");

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
    resetBookingSession,
  ]);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  }, [timeLeft]);

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
    resetBookingSession,
    // Computed
    ...summaryData,
  };
};
