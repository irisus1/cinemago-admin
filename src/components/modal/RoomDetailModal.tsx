"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { roomService, type Room } from "@/services";

type RoomDetailModalProps = {
  open: boolean;
  room: Room | null;
  onClose: () => void;
  onOpenLayout?: (room: Room) => void;
};

export function RoomDetailModal({
  open,
  room,
  onClose,
  onOpenLayout,
}: RoomDetailModalProps) {
  const [fullRoom, setFullRoom] = useState<Room | null>(room);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !room) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const res = await roomService.getRoomById(room.id);
        if (!cancelled) {
          setFullRoom(res);
        }
      } catch (e) {
        console.error("Failed to load full room detail", e);
        if (!cancelled) {
          setFullRoom(room);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, room]);

  if (!room) return null;

  const r = fullRoom ?? room;

  const createdText = r.createdAt
    ? new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(r.createdAt))
    : "—";

  const hasVip = r.VIP != null && !Number.isNaN(Number(r.VIP));
  const hasCouple = r.COUPLE != null && !Number.isNaN(Number(r.COUPLE));

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Thông tin phòng chiếu</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading && (
            <p className="text-xs text-muted-foreground">
              Đang tải thêm thông tin phòng…
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tên phòng</Label>
              <Input disabled value={r.name ?? ""} />
            </div>

            <div className="space-y-2">
              <Label>Tổng ghế</Label>
              <Input
                disabled
                value={r.totalSeats != null ? String(r.totalSeats) : "Chưa có"}
              />
            </div>

            <div className="space-y-2">
              <Label>Ngày tạo</Label>
              <Input disabled value={createdText} />
            </div>

            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <div>
                <Badge variant={r.isActive ? "default" : "secondary"}>
                  {r.isActive ? "Đang hoạt động" : "Đã ẩn"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Ghế VIP</Label>
              <p className="text-base text-muted-foreground">
                {hasVip
                  ? `Phụ thu: ${new Intl.NumberFormat("vi-VN").format(
                      Number(r.VIP),
                    )} ₫`
                  : "Hiện không có ghế VIP trong phòng này."}
              </p>
            </div>

            <div className="space-y-1">
              <Label>Ghế đôi</Label>
              <p className="text-base text-muted-foreground">
                {hasCouple
                  ? `Phụ thu: ${new Intl.NumberFormat("vi-VN").format(
                      Number(r.COUPLE),
                    )} ₫`
                  : "Hiện không có ghế đôi trong phòng này."}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>

          {onOpenLayout && (
            <Button
              onClick={() => {
                onOpenLayout(r);
              }}
            >
              Xem sơ đồ ghế
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
