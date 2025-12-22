"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  cinemaService,
  roomService,
  movieService,
  showTimeService,
  type Cinema,
  Room,
  ShowTime,
  Movie,
  ServerPaginated,
} from "@/services";

import { useAuth } from "@/context/AuthContext";

// ===== Helpers (Logic thuần túy) =====
const pad = (n: number) => String(n).padStart(2, "0");

const toIsoUtcFromLocal = (d: string, t: string) => {
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm] = t.split(":").map(Number);
  const local = new Date(y, m - 1, day, hh, mm, 0, 0);
  return local.toISOString();
};

const addMinutesIsoUtc = (isoUtc: string, mins: number) => {
  const dt = new Date(isoUtc);
  if (Number.isNaN(dt.getTime())) return isoUtc;
  dt.setMinutes(dt.getMinutes() + mins);
  return dt.toISOString();
};

type Props = {
  open: boolean;
  mode: "create" | "edit";
  movieId: string;
  showtime?: ShowTime;
  onSuccess?: () => void;
  onClose: () => void;
};

export function useShowtimeFormLogic({
  open,
  mode,
  movieId,
  showtime,
  onSuccess,
  onClose,
}: Props) {
  const { user } = useAuth();
  const isManager = user?.role === "MANAGER";

  const isPreSelected = Boolean(movieId && movieId !== "__ALL__");

  const [loading, setLoading] = useState(false);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [duration, setDuration] = useState<number | null>(null);

  const [movies, setMovies] = useState<Movie[]>([]); // List phim để chọn
  const [selectedMovieId, setSelectedMovieId] = useState<string>(
    isPreSelected ? movieId : ""
  );

  // --- Form State ---
  const [cinemaId, setCinemaId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [price, setPrice] = useState<string>("");
  const [startDate, setStartDate] = useState("");

  // Time slots (cho phép tạo nhiều suất 1 lúc)
  const [timeSlots, setTimeSlots] = useState<string[]>([""]);
  const [timeSlotErrors, setTimeSlotErrors] = useState<string[]>([""]);

  const [language, setLanguage] = useState("English");
  const [format, setFormat] = useState("2D");
  const [subtitle, setSubtitle] = useState(false);

  const handleMovieChange = useCallback(
    (newId: string) => {
      setSelectedMovieId(newId);
      const found = movies.find((m) => m.id === newId);
      setDuration(found?.duration ?? null);
    },
    [movies]
  );

  const handleCinemaChange = (newCinemaId: string) => {
    setCinemaId(newCinemaId);
    setRoomId(""); // Chỉ reset phòng khi người dùng TỰ TAY đổi rạp
    setRooms([]); // Clear tạm danh sách phòng cũ
  };

  useEffect(() => {
    if (!open) return;

    // Reset basics
    setCinemas([]);
    setMovies([]);

    if (isPreSelected) {
      setSelectedMovieId(movieId);
    } else {
      setSelectedMovieId("");
      setDuration(null);
    }

    const fetchData = async () => {
      try {
        let loadedMovies: Movie[] = [];

        if (isManager && user?.cinemaId) {
          const moviesRes = await movieService.getAllMovies();
          loadedMovies = moviesRes.data ?? [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setCinemas([{ id: user.cinemaId, name: (user as any).cinemaName || "Rạp hiện tại" } as any]);
        } else {
          // Chạy song song 2 API lấy list
          const [cinemaRes, moviesRes] = await Promise.all([
            cinemaService.getAllCinemas(),
            movieService.getAllMovies(),
          ]);

          setCinemas(cinemaRes.data ?? []);
          loadedMovies = moviesRes.data ?? [];
        }

        setMovies(loadedMovies);

        // Logic tự động set Duration nếu đã có movie được chọn từ trước (từ props)
        if (isPreSelected) {
          const found = loadedMovies.find((m) => m.id === movieId);
          if (found) {
            setDuration(found.duration ?? null);
          }
        }
      } catch (error) {
        console.error(error);
        toast.error("Lỗi tải dữ liệu ban đầu");
      }
    };


    fetchData();
  }, [open, movieId, isPreSelected]);
  // useEffect(() => {
  //   if (!open) return;

  //   // Reset cinemas & rooms state để tránh flash dữ liệu cũ
  //   setCinemas([]);

  //   (async () => {
  //     try {
  //       // Chạy song song để nhanh hơn
  //       const [movieRes, cinemaRes] = await Promise.all([
  //         movieId ? movieService.getMovieById(movieId) : null,
  //         cinemaService.getAllCinemas(),
  //       ]);

  //       if (movieRes) setDuration(movieRes.duration ?? null);
  //       setCinemas(cinemaRes.data ?? []);
  //     } catch {
  //       toast.error("Lỗi tải dữ liệu ban đầu (Rạp/Phim)");
  //     }
  //   })();
  // }, [open, movieId]);

  useEffect(() => {
    if (!open || !cinemaId) {
      setRooms([]);
      return;
    }
    let active = true;

    (async () => {
      try {
        const res = await roomService.getRooms({ cinemaId });
        if (active) {
          const data = res.data ?? [];
          setRooms(data);
        }
      } catch {
        if (active) toast.error("Không tải được danh sách phòng");
      }
    })();
    return () => {
      active = false;
    };
  }, [open, cinemaId]);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && showtime) {
      if (showtime.movieId) {
        setSelectedMovieId(showtime.movieId);

        const foundMovie = movies.find((m) => m.id === showtime.movieId);
        if (foundMovie) {
          setDuration(foundMovie.duration ?? null);
        }
      }

      console.log(showtime);

      setCinemaId(showtime.cinemaId ?? "");
      setRoomId(showtime.roomId ?? "");
      setPrice(showtime.price != null ? String(showtime.price) : "");

      const s = new Date(showtime.startTime);
      const dateStr = `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(
        s.getDate()
      )}`;
      const timeStr = `${pad(s.getHours())}:${pad(s.getMinutes())}`;

      setStartDate(dateStr);
      setTimeSlots([timeStr]);
      setTimeSlotErrors([""]);

      setLanguage(showtime.language ?? "English");
      setFormat(showtime.format ?? "2D");
      setSubtitle(Boolean(showtime.subtitle));
    } else {
      setCinemaId(isManager && user?.cinemaId ? user.cinemaId : "");
      setRoomId("");
      setPrice("");
      setStartDate("");
      setTimeSlots([""]);
      setTimeSlotErrors([""]);
      setLanguage("English");
      setFormat("2D");
      setSubtitle(false);
    }
  }, [open, mode, showtime]);

  // --- Logic Helpers ---

  const getEndFor = (time: string) => {
    if (!startDate || !time || duration == null) return null;

    const startIsoUtc = toIsoUtcFromLocal(startDate, time);
    const endIsoUtc = addMinutesIsoUtc(startIsoUtc, duration);

    const endLocal = new Date(endIsoUtc);
    const date = `${pad(endLocal.getDate())}-${pad(
      endLocal.getMonth() + 1
    )}-${endLocal.getFullYear()}`;
    const timeStr = `${pad(endLocal.getHours())}:${pad(endLocal.getMinutes())}`;

    return { date, time: timeStr };
  };

  const updateTimeSlot = (index: number, value: string) => {
    const next = [...timeSlots];
    next[index] = value;
    setTimeSlots(next);

    const nextErr = [...timeSlotErrors];
    nextErr[index] = "";
    setTimeSlotErrors(nextErr);
  };

  const addTimeSlot = () => {
    setTimeSlots((p) => [...p, ""]);
    setTimeSlotErrors((p) => [...p, ""]);
  };

  const removeTimeSlot = (index: number) => {
    if (timeSlots.length <= 1) return;
    setTimeSlots((p) => p.filter((_, i) => i !== index));
    setTimeSlotErrors((p) => p.filter((_, i) => i !== index));
  };

  const canSubmit = useMemo(() => {
    if (!selectedMovieId) return false;
    if (!cinemaId || !roomId || !startDate || duration == null) return false;
    if (price !== "" && Number.isNaN(Number(price))) return false;
    const validTimes = timeSlots.filter((t) => t && t.trim() !== "");
    return validTimes.length > 0;
  }, [
    cinemaId,
    roomId,
    startDate,
    duration,
    price,
    timeSlots,
    selectedMovieId,
  ]);

  type SlotMeta = {
    originalIndex: number;
    label: string;
    startIso: string;
    endIso: string;
    startMs: number;
    endMs: number;
  };

  const checkConflictsOnServer = async (
    slotMetas: SlotMeta[],
    params: {
      cinemaId: string;
      roomId: string;
      mode: "create" | "edit";
      currentShowtimeId?: string;
    }
  ): Promise<string[]> => {
    const { cinemaId, roomId, mode, currentShowtimeId } = params;

    if (!cinemaId || !roomId) {
      return Array(slotMetas.length).fill("");
    }

    const errors: string[] = Array(slotMetas.length).fill("");

    type DayBucket = {
      dayStartUtc: string;
      dayEndUtc: string;
      slots: SlotMeta[];
    };
    const buckets = new Map<string, DayBucket>();

    for (const slot of slotMetas) {
      const local = new Date(slot.startIso);
      const y = local.getFullYear();
      const m = local.getMonth();
      const d = local.getDate();

      const dayKey = `${y}-${m + 1}-${d}`;

      let bucket = buckets.get(dayKey);
      if (!bucket) {
        const dayStartLocal = new Date(y, m, d, 0, 0, 0, 0);
        const dayEndLocal = new Date(y, m, d, 23, 59, 59, 999);

        bucket = {
          dayStartUtc: dayStartLocal.toISOString(),
          dayEndUtc: dayEndLocal.toISOString(),
          slots: [],
        };
        buckets.set(dayKey, bucket);
      }

      bucket.slots.push(slot);
    }

    for (const [, bucket] of buckets) {
      const res = await showTimeService.getShowTimes({
        cinemaId,
        startTime: new Date(bucket.dayStartUtc),
        endTime: new Date(bucket.dayEndUtc),
        page: 1,
        limit: 500,
      });

      const list: ShowTime[] = res.data ?? [];

      for (const slot of bucket.slots) {
        const conflict = list.some((st) => {
          if (st.roomId !== roomId) return false;

          if (
            mode === "edit" &&
            currentShowtimeId &&
            st.id === currentShowtimeId
          )
            return false;

          const stStart = new Date(st.startTime).getTime();
          const stEnd = new Date(st.endTime).getTime();

          return slot.startMs < stEnd && slot.endMs > stStart;
        });

        if (conflict) {
          errors[slot.originalIndex] =
            "Giờ này trùng với 1 suất chiếu khác trong phòng.";
        }
      }
    }

    return errors;
  };

  // --- SUBMIT LOGIC ---
  const handleSubmit = async () => {
    if (!canSubmit || duration == null) return;

    if (!selectedMovieId) {
      toast.error("Vui lòng chọn phim trước.");
      return;
    }

    const validTimes = timeSlots.filter((t) => t && t.trim() !== "");
    if (!validTimes.length) return;

    const slotMetas = timeSlots
      .map((raw, originalIndex) => {
        const t = raw.trim();
        if (!t) return null;

        const startIso = toIsoUtcFromLocal(startDate, t);
        const endIso = addMinutesIsoUtc(startIso, duration);

        return {
          originalIndex,
          label: t,
          startIso,
          endIso,
          startMs: new Date(startIso).getTime(),
          endMs: new Date(endIso).getTime(),
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    if (!slotMetas.length) return;

    // 2. Check Chồng Giờ (Local)
    const errorsInBatch: string[] = Array(timeSlots.length).fill("");
    const sorted = [...slotMetas].sort((a, b) => a.startMs - b.startMs);
    const accepted: typeof slotMetas = [];

    for (const slot of sorted) {
      const conflict = accepted.find(
        (s) => slot.startMs < s.endMs && slot.endMs > s.startMs
      );
      if (conflict) {
        errorsInBatch[slot.originalIndex] =
          "Giờ này bị chồng với 1 suất khác trong danh sách.";
      } else {
        accepted.push(slot);
      }
    }

    if (errorsInBatch.some((e) => e)) {
      setTimeSlotErrors(errorsInBatch);
      toast.error("Có suất chiếu bị chồng giờ, vui lòng kiểm tra lại.");
      return;
    }

    // 3. Check Trùng Ca (Database) & Submit
    const errorsBusy: string[] = [...errorsInBatch];

    try {
      setLoading(true);

      //Check busy rooms
      //   for (const slot of slotMetas) {
      //     const busyRes = await roomService.getBusyRooms(
      //       slot.startIso,
      //       slot.endIso
      //     );
      //     // Giả sử API trả mảng ID các phòng bận: string[]
      //     const busyRooms: string[] = busyRes ?? [];

      //     if (busyRooms.includes(roomId)) {
      //       errorsBusy[slot.originalIndex] =
      //         "Giờ này trùng với 1 suất chiếu khác trong phòng.";
      //     }
      //   }

      const errorsBusy = await checkConflictsOnServer(slotMetas, {
        cinemaId,
        roomId,
        mode,
        currentShowtimeId: mode === "edit" ? showtime?.id : undefined,
      });

      if (errorsBusy.some((e) => e)) {
        setTimeSlotErrors(errorsBusy);
        toast.error("Một số giờ chiếu trùng lịch phòng.");
        return;
      }

      setTimeSlotErrors(Array(timeSlots.length).fill(""));

      if (mode === "edit" && showtime?.id) {
        const firstMeta = slotMetas[0];
        const body = {
          roomId,
          movieId: selectedMovieId,
          price: Number(price),
          startTime: firstMeta.startIso,
          endTime: firstMeta.endIso,
          language,
          format,
          subtitle,
        };
        await showTimeService.updateShowTime(showtime.id, body);
        toast.success("Cập nhật suất chiếu thành công");
        onSuccess?.();
        onClose();
      } else {
        for (const slot of slotMetas) {
          const body = {
            roomId,
            movieId: selectedMovieId,
            price: Number(price),
            startTime: slot.startIso,
            endTime: slot.endIso,
            language,
            format,
            subtitle,
          };
          await showTimeService.createShowTime(body);
        }
        toast.success(`Đã tạo ${slotMetas.length} suất chiếu thành công.`);
        onSuccess?.();

        setStartDate("");
        setTimeSlots([""]);
        setTimeSlotErrors([""]);
      }
    } catch (e) {
      console.error(e);
      toast.error(`${mode === "edit" ? "Cập nhật" : "Tạo"} thất bại.`);
    } finally {
      setLoading(false);
    }
  };

  return {
    // State
    loading,
    cinemas,
    rooms,
    movies,
    selectedMovieId,
    setSelectedMovieId,
    // Form Values
    cinemaId,
    setCinemaId,
    roomId,
    setRoomId,
    price,
    setPrice,
    startDate,
    setStartDate,
    timeSlots,
    timeSlotErrors,
    language,
    setLanguage,
    format,
    setFormat,
    subtitle,
    setSubtitle,

    // Computed
    canSubmit,

    // Actions
    getEndFor,
    updateTimeSlot,
    addTimeSlot,
    removeTimeSlot,
    handleSubmit,
    handleMovieChange,

    handleCinemaChange,

    // Auth
    isManager,
  };
}
