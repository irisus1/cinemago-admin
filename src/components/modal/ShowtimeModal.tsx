"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DateNativeVN } from "../DateNativeVN";
import { LANGUAGE_OPTIONS } from "@/constants/showtime";
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
import { type ShowTime, Movie } from "@/services";
import { useShowtimeFormLogic } from "@/hooks/useShowtimeFormLogic";
import { SearchableCombobox, type SelectOption } from "../SearchableCombobox";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  movieId: string;
  showtime?: ShowTime;
  onSuccess?: () => void;
  disableCinemaSelect?: boolean;
  fixedCinemaId?: string;
};

export default function ShowtimeModal(props: Props) {
  const { open, onClose, mode, disableCinemaSelect } = props;

  // Gọi Hook Logic
  const {
    isManager,
    loading,
    cinemas,
    rooms,
    movies,
    selectedMovieId,
    handleMovieChange,
    handleCinemaChange,

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
    canSubmit,
    getEndFor,
    updateTimeSlot,
    addTimeSlot,
    removeTimeSlot,
    handleSubmit,
  } = useShowtimeFormLogic(props);

  const todayISO = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const movieOptions: SelectOption[] = useMemo(() => {
    return movies.map((m) => ({
      value: m.id,
      label: m.title ?? "Unknown",
      meta: `${m.duration ?? 0} phút`,
    }));
  }, [movies]);
  console.log(roomId);

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 min-w-0 flex flex-col gap-1.5">
            <Label className="font-semibold">Phim</Label>
            <SearchableCombobox
              options={movieOptions}
              value={selectedMovieId}
              onChange={handleMovieChange}
              placeholder="Chọn phim..."
              searchPlaceholder="Tìm tên phim..."
              widthClass="w-full"
            />
          </div>

          <div className="md:col-span-2 min-w-0">
            <Label>Rạp</Label>
            <Select
              value={cinemaId}
              onValueChange={handleCinemaChange}
              disabled={
                disableCinemaSelect || !selectedMovieId || movies.length === 0
              }
            >
              <SelectTrigger className="mt-1 h-10 w-full">
                <SelectValue
                  placeholder={
                    selectedMovieId ? "Chọn rạp…" : "Vui lòng chọn phim trước"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {cinemas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.city ? ` - ${c.city}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          {/* 3) NGÀY + GIỜ */}
          <div className="min-w-0">
            <Label>Ngày chiếu</Label>
            <div className="mt-1 flex gap-2">
              <DateNativeVN
                valueISO={startDate}
                onChangeISO={(iso) => setStartDate(iso)}
                className="relative"
                minISO={todayISO}
                widthClass="w-full"
              />
              {mode === "create" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 whitespace-nowrap"
                  onClick={addTimeSlot}
                >
                  + Thêm giờ
                </Button>
              )}
            </div>
          </div>

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

          {/* 4) SETTING KHÁC */}
          <div className="min-w-0">
            <Label>Ngôn ngữ</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="mt-1 h-10 w-full">
                <SelectValue placeholder="Chọn ngôn ngữ" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0">
            <Label>Định dạng</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="mt-1 h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2D">2D</SelectItem>
                <SelectItem value="3D">3D</SelectItem>
                <SelectItem value="IMAX">IMAX</SelectItem>
                <SelectItem value="4DX">4DX</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
          <Button onClick={handleSubmit} disabled={!canSubmit || loading}>
            {loading ? "Đang lưu..." : mode === "edit" ? "Cập nhật" : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
