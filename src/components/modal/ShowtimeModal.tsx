"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DateNativeVN } from "../DateNativeVN";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  cinemaService,
  showTimeService,
  roomService,
  movieService,
  type Cinema,
  ShowTime,
  Room,
} from "@/services";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  movieId: string;
  showtime?: ShowTime; // dùng khi edit
  onSuccess?: () => void; // callback sau khi lưu OK
};

// ===== Helpers =====
const pad = (n: number) => String(n).padStart(2, "0");
const toIsoLocal = (d: string, t: string) => {
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm] = t.split(":").map(Number);
  const dt = new Date(y, m - 1, day, hh, mm, 0, 0);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(
    dt.getDate()
  )}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00`;
};
const addMinutesIsoLocal = (iso: string, mins: number) => {
  const [datePart, timePart] = iso.split("T");
  const [Y, M, D] = datePart.split("-").map(Number);
  const [H, Min] = timePart.split(":").map(Number);
  const dt = new Date(Y, M - 1, D, H, Min, 0, 0);
  dt.setMinutes(dt.getMinutes() + mins);
  const y = dt.getFullYear();
  const m = pad(dt.getMonth() + 1);
  const d2 = pad(dt.getDate());
  const h2 = pad(dt.getHours());
  const mi2 = pad(dt.getMinutes());
  return { date: `${y}-${m}-${d2}`, time: `${h2}:${mi2}` };
};

export default function ShowtimeModal({
  open,
  onClose,
  mode,
  movieId,
  showtime,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [duration, setDuration] = useState<number | null>(null);

  // ----- form state -----
  const [cinemaId, setCinemaId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [price, setPrice] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  // nhiều giờ bắt đầu trong cùng 1 ngày
  const [timeSlots, setTimeSlots] = useState<string[]>([""]);
  const [timeSlotErrors, setTimeSlotErrors] = useState<string[]>([""]);

  const [language, setLanguage] = useState("English");
  const [format, setFormat] = useState("2D");
  const [subtitle, setSubtitle] = useState(false);

  // ===== Helper trong component =====
  const getEndFor = (time: string) => {
    if (!startDate || !time || duration == null) return null;
    const startIso = toIsoLocal(startDate, time);
    const { date, time: endTime } = addMinutesIsoLocal(startIso, duration);
    const [year, month, day] = date.split("-");

    const formattedDate = `${day}-${month}-${year}`;

    return { date: formattedDate, time: endTime };
  };

  const updateTimeSlot = (index: number, value: string) => {
    setTimeSlots((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });

    setTimeSlotErrors((prev) => {
      const next = [...prev];
      next[index] = "";
      return next;
    });
  };

  const addTimeSlot = () => {
    setTimeSlots((prev) => [...prev, ""]);
    setTimeSlotErrors((prev) => [...prev, ""]);
  };

  const removeTimeSlot = (index: number) => {
    setTimeSlots((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });

    setTimeSlotErrors((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  // Load duration theo movieId khi open
  useEffect(() => {
    if (!open || !movieId) return;
    let alive = true;
    (async () => {
      try {
        const m = await movieService.getMovieById(movieId);
        if (alive) setDuration(m?.duration ?? null);
      } catch {
        if (alive) toast.error("Không tải được thời lượng phim");
        setDuration(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, movieId]);

  // Reset/đổ dữ liệu khi mở modal
  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && showtime) {
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
      setLanguage(showtime.language ?? "English");
      setFormat(showtime.format ?? "2D");
      setSubtitle(Boolean(showtime.subtitle));
    } else {
      // create default
      setCinemaId("");
      setRoomId("");
      setRooms([]);
      setPrice("");
      setStartDate("");
      setTimeSlots([""]);
      setTimeSlotErrors([""]);
      setLanguage("English");
      setFormat("2D");
      setSubtitle(false);
    }
  }, [open, mode, showtime]);

  // Load cinemas khi mở modal
  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      try {
        const res = await cinemaService.getAllCinemas();
        const data = res.data ?? [];
        if (alive) setCinemas(data);
      } catch {
        if (alive) toast.error("Không tải được danh sách rạp");
      }
    })();
    return () => {
      alive = false;
    };
  }, [open]);

  // Load rooms theo cinema
  useEffect(() => {
    if (!open || !cinemaId) {
      setRooms([]);
      if (roomId) setRoomId("");
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await roomService.getRooms({ cinemaId });
        const data = res.data ?? [];
        if (!alive) return;
        setRooms(data);
        if (!data.some((r) => r.id === roomId)) setRoomId("");
      } catch {
        if (alive) toast.error("Không tải được danh sách phòng");
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, cinemaId, roomId]);

  const canSubmit = useMemo(() => {
    if (!cinemaId || !roomId) return false;
    if (!startDate) return false;
    if (duration == null) return false;
    if (price !== "" && Number.isNaN(Number(price))) return false;

    const validTimes = timeSlots.filter((t) => t && t.trim() !== "");
    if (!validTimes.length) return false;

    return true;
  }, [cinemaId, roomId, startDate, duration, price, timeSlots]);

  // 1 nút Lưu duy nhất:
  // - create: lưu xong reset start & list time (toast)
  // - edit: lưu xong đóng modal (toast, update 1 suất)
  const submit = useCallback(async () => {
    if (!canSubmit || duration == null) return;

    const validTimes = timeSlots.filter((t) => t && t.trim() !== "");
    if (!validTimes.length) return;

    const slotMetas = timeSlots
      .map((raw, originalIndex) => {
        const t = raw.trim();
        if (!t) return null;

        const startIso = toIsoLocal(startDate, t);
        const endX = addMinutesIsoLocal(startIso, duration);
        const endIso = toIsoLocal(endX.date, endX.time);

        return {
          originalIndex, // index trong timeSlots
          label: t,
          startIso,
          endIso,
          startMs: new Date(startIso).getTime(),
          endMs: new Date(endIso).getTime(),
        };
      })
      .filter(
        (
          m
        ): m is {
          originalIndex: number;
          label: string;
          startIso: string;
          endIso: string;
          startMs: number;
          endMs: number;
        } => m !== null
      );

    if (!slotMetas.length) return;

    // 2) Check CHỒNG GIỜ trong batch hiện tại
    const errorsInBatch: string[] = Array(timeSlots.length).fill("");

    const sorted = [...slotMetas].sort((a, b) => a.startMs - b.startMs);
    const accepted: { startMs: number; endMs: number }[] = [];

    for (const slot of sorted) {
      const conflict = accepted.find(
        (s) => slot.startMs < s.endMs && slot.endMs > s.startMs
      );

      if (conflict) {
        errorsInBatch[slot.originalIndex] =
          "Giờ này bị chồng với 1 suất chiếu khác trong danh sách.";
      } else {
        accepted.push({ startMs: slot.startMs, endMs: slot.endMs });
      }
    }

    if (errorsInBatch.some((e) => e)) {
      setTimeSlotErrors(errorsInBatch);
      toast.error("Có suất chiếu bị chồng giờ, vui lòng kiểm tra lại.");
      return;
    }

    // 3) Check TRÙNG CA trong DB bằng get-busy-rooms
    const errorsBusy: string[] = [...errorsInBatch]; // hiện tại đều "" rồi

    try {
      setLoading(true);

      for (const slot of slotMetas) {
        const res = await roomService.getBusyRooms(slot.startIso, slot.endIso);

        // tuỳ service của bạn, nếu trả về { data: string[] } thì sửa lại:
        // const busyRooms: string[] = res.data ?? [];
        const busyRooms: string[] = res ?? [];

        if (busyRooms.includes(roomId)) {
          errorsBusy[slot.originalIndex] =
            "Giờ này trùng với 1 suất chiếu khác của phòng đã chọn.";
        }
      }

      if (errorsBusy.some((e) => e)) {
        setTimeSlotErrors(errorsBusy);
        toast.error("Một số giờ chiếu trùng với ca khác trong phòng.");
        return;
      }

      // không còn lỗi -> clear
      setTimeSlotErrors(Array(timeSlots.length).fill(""));

      if (mode === "edit" && showtime?.id) {
        // Edit: chỉ dùng time đầu tiên
        const firstTime = validTimes[0];
        const startIso = toIsoLocal(startDate, firstTime);
        const endX = addMinutesIsoLocal(startIso, duration);
        const body = {
          roomId,
          movieId,
          price: Number(price),
          startTime: startIso,
          endTime: toIsoLocal(endX.date, endX.time),
          language,
          format,
          subtitle,
        };

        await showTimeService.updateShowTime(showtime.id, body);
        toast.success("Cập nhật suất chiếu thành công");
        onSuccess?.();
        onClose();
        return;
      }

      // CREATE: tạo nhiều suất theo list giờ
      for (const slot of slotMetas) {
        const body = {
          roomId,
          movieId,
          price: Number(price),
          startTime: slot.startIso,
          endTime: slot.endIso,
          language,
          format,
          subtitle,
        };
        await showTimeService.createShowTime(body);
      }

      toast.success(
        `Tạo ${slotMetas.length} suất chiếu thành công. Bạn có thể tiếp tục thêm mới.`
      );
      onSuccess?.();

      // Giữ nguyên rạp/phòng/…; reset ngày + list giờ để nhập tiếp
      setStartDate("");
      setTimeSlots([""]);
      setTimeSlotErrors([""]);
    } catch {
      toast.error(
        `${mode === "edit" ? "Cập nhật" : "Tạo"} suất chiếu thất bại`
      );
    } finally {
      setLoading(false);
    }
  }, [
    canSubmit,
    duration,
    timeSlots,
    roomId,
    movieId,
    price,
    startDate,
    language,
    format,
    subtitle,
    mode,
    showtime?.id,
    onSuccess,
    onClose,
  ]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Chỉnh sửa suất chiếu" : "Thêm suất chiếu"}
          </DialogTitle>
        </DialogHeader>

        {/* Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1) RẠP — full width */}
          <div className="md:col-span-2 min-w-0">
            <Label>Rạp</Label>
            <Select value={cinemaId} onValueChange={setCinemaId}>
              <SelectTrigger className="mt-1 h-10 w-full">
                <SelectValue placeholder="Chọn rạp…" />
              </SelectTrigger>
              <SelectContent>
                {cinemas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.city ? `  - ${c.city}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2) PHÒNG + GIÁ */}
          <div className="min-w-0 md:col-span-2">
            <Label>Phòng</Label>
            <Select
              value={roomId}
              onValueChange={setRoomId}
              disabled={!cinemaId || rooms.length === 0}
            >
              <SelectTrigger className="mt-1 h-10 w-full">
                <SelectValue
                  placeholder={cinemaId ? "Chọn phòng…" : "Chọn rạp trước"}
                />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                    {r.seats ? ` [${r.seats} chỗ]` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0">
            <Label>Giá (₫)</Label>
            <Input
              className="mt-1 h-10 w-full"
              inputMode="numeric"
              placeholder="Ví dụ: 90000"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
            />
          </div>

          {/* 3) NGÀY + NHIỀU GIỜ BẮT ĐẦU */}

          <div className="min-w-0 ">
            <Label>Ngày chiếu</Label>
            <div className="mt-1 flex gap-2">
              {/* <Input
                className="h-10 w-full"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              /> */}
              <DateNativeVN
                valueISO={startDate}
                onChangeISO={(iso) => {
                  console.log("Ngày chọn:", iso);
                  // setSelectedDate(iso)
                  setStartDate(iso);
                }}
                className="relative "
                widthClass="w-full "
              />
              {mode === "create" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 whitespace-nowrap"
                  onClick={addTimeSlot}
                >
                  + Thêm giờ chiếu
                </Button>
              )}
            </div>
          </div>

          {/* GIỜ BẮT ĐẦU – dùng 2 cột của modal, time1 col1, time2 col2, time3 lại col1 hàng mới */}
          <div className="md:col-span-2 min-w-0">
            <Label>Giờ bắt đầu</Label>
            <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-2">
              {timeSlots.map((t, idx) => {
                const endInfo = getEndFor(t);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Input
                        className="h-10 w-full"
                        type="time"
                        value={t}
                        onChange={(e) => updateTimeSlot(idx, e.target.value)}
                      />
                      {timeSlots.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeTimeSlot(idx)}
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                    {endInfo && (
                      <p className="text-xs text-muted-foreground">
                        Kết thúc:{" "}
                        {endInfo.date === startDate
                          ? endInfo.time
                          : `${endInfo.date} ${endInfo.time}`}
                      </p>
                    )}
                    {timeSlotErrors[idx] && (
                      <p className="text-xs text-red-500">
                        {timeSlotErrors[idx]}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5) NGÔN NGỮ + ĐỊNH DẠNG */}
          <div className="min-w-0">
            <Label>Ngôn ngữ</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="mt-1 h-10 w-full">
                <SelectValue placeholder="Chọn ngôn ngữ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Vietnamese">Vietnamese</SelectItem>
                <SelectItem value="Korean">Korean</SelectItem>
                <SelectItem value="Japanese">Japanese</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0">
            <Label>Định dạng</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="mt-1 h-10 w-full">
                <SelectValue placeholder="Chọn định dạng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2D">2D</SelectItem>
                <SelectItem value="3D">3D</SelectItem>
                <SelectItem value="IMAX">IMAX</SelectItem>
                <SelectItem value="4DX">4DX</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 6) PHỤ ĐỀ */}
          <div className="md:col-span-2">
            <div className="flex w-full items-center justify-between rounded-lg border p-3">
              <div className="min-w-0">
                <div className="font-medium">Phụ đề</div>
                <div className="text-sm text-muted-foreground">
                  Bật phụ đề cho suất chiếu này
                </div>
              </div>
              <Switch
                checked={subtitle}
                onCheckedChange={setSubtitle}
                className="shrink-0"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={!canSubmit || loading}>
            {loading ? "Đang lưu..." : mode === "edit" ? "Cập nhật" : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
