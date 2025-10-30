"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  type Cinema,
  ShowTime,
} from "@/services";

// ===== Types =====
type Room = { id: string; name: string; seats?: number };

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

  // ----- form state -----
  const [cinemaId, setCinemaId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [price, setPrice] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [language, setLanguage] = useState("English");
  const [format, setFormat] = useState("2D");
  const [subtitle, setSubtitle] = useState(false);

  // Reset/đổ dữ liệu khi mở modal
  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && showtime) {
      setCinemaId(showtime.cinemaId ?? "");
      setRoomId(showtime.roomId ?? "");
      setPrice(showtime.price != null ? String(showtime.price) : "");
      const s = new Date(showtime.startTime);
      const e = showtime.endTime ? new Date(showtime.endTime) : null;
      setStartDate(
        `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`
      );
      setStartTime(`${pad(s.getHours())}:${pad(s.getMinutes())}`);
      setEndDate(
        e
          ? `${e.getFullYear()}-${pad(e.getMonth() + 1)}-${pad(e.getDate())}`
          : ""
      );
      setEndTime(e ? `${pad(e.getHours())}:${pad(e.getMinutes())}` : "");
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
      setStartTime("");
      setEndDate("");
      setEndTime("");
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
      } catch (e: any) {
        if (alive) toast.error(e?.message || "Không tải được danh sách rạp");
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
        const res = await roomService.getRooms({ cinemaId: cinemaId });
        console.log(res);

        const data = res.data ?? [];
        if (!alive) return;
        setRooms(data);
        if (!data.some((r) => r.id === roomId)) setRoomId("");
      } catch (e) {
        if (alive) toast.error("Không tải được danh sách phòng");
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, cinemaId, roomId]);

  const canSubmit = useMemo(() => {
    if (!cinemaId || !roomId) return false;
    if (!startDate || !startTime || !endDate || !endTime) return false;
    if (price !== "" && Number.isNaN(Number(price))) return false;
    const startIso = toIsoLocal(startDate, startTime);
    const endIso = toIsoLocal(endDate, endTime);
    return new Date(startIso).getTime() < new Date(endIso).getTime();
  }, [cinemaId, roomId, startDate, startTime, endDate, endTime, price]);

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    try {
      setLoading(true);
      const body = {
        roomId,
        movieId,
        price: Number(price),
        startTime: toIsoLocal(startDate, startTime),
        endTime: toIsoLocal(endDate, endTime),
        language,
        format,
        subtitle,
      };

      console.log(body);

      if (mode === "edit" && showtime?.id) {
        await showTimeService.updateShowTime(showtime.id, body);
        toast.success("Cập nhật suất chiếu thành công");
      } else {
        await showTimeService.createShowTime(body);
        toast.success("Tạo suất chiếu thành công");
      }
      onSuccess?.();
      onClose();
    } catch (e) {
      toast.error(
        `${mode === "edit" ? "Cập nhật" : "Tạo"} suất chiếu thất bại`
      );
    } finally {
      setLoading(false);
    }
  }, [
    canSubmit,
    roomId,
    price,
    startDate,
    startTime,
    endDate,
    endTime,
    language,
    format,
    subtitle,
    mode,
    movieId,
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
          <div className="min-w-0">
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

          {/* 3) NGÀY/GIỜ BẮT ĐẦU */}
          <div className="min-w-0">
            <Label>Ngày bắt đầu</Label>
            <Input
              className="mt-1 h-10 w-full"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="min-w-0">
            <Label>Giờ bắt đầu</Label>
            <Input
              className="mt-1 h-10 w-full"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          {/* 4) NGÀY/GIỜ KẾT THÚC */}
          <div className="min-w-0">
            <Label>Ngày kết thúc</Label>
            <Input
              className="mt-1 h-10 w-full"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="min-w-0">
            <Label>Giờ kết thúc</Label>
            <Input
              className="mt-1 h-10 w-full"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
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
            {loading ? "Đang lưu..." : mode === "edit" ? "Cập nhật" : "Tạo mới"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
