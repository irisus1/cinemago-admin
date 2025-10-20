// components/RoomModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Room } from "@/services/RoomService";
import { cn } from "@/lib/utils";

// services tuỳ dự án bạn, đổi tên nếu khác
import { createRoom, updateRoom } from "@/services/RoomService";

export type RoomModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  mode: "create" | "edit";
  cinemaId: string;
  room?: {
    id: string;
    name: string;
    totalSeat?: number;
    created?: string;
    isActive?: boolean;
    vipPrice?: number | null;
    couplePrice?: number | null;
    seatLayout?: SeatCell[];
  };
};

type SeatCell = {
  row: string;
  col: number;
  type: "EMPTY" | "NORMAL" | "VIP" | "COUPLE";
};

const makeBaseLayout5x5 = (): SeatCell[] => {
  const rows = ["A", "B", "C", "D", "E"];
  const cols = 5;
  const out: SeatCell[] = [];
  for (const r of rows) {
    for (let c = 1; c <= cols; c++)
      out.push({ row: r, col: c, type: "NORMAL" });
  }
  return out;
};

export default function RoomModal({
  open,
  onClose,
  onSuccess,
  mode,
  cinemaId,
  room,
}: RoomModalProps) {
  console.log(room);

  const [saving, setSaving] = useState(false);
  const [showLayout, setShowLayout] = useState(false);

  const [name, setName] = useState(room?.name ?? "");
  const [vipBonus, setVipBonus] = useState<number | "">(room?.vipPrice ?? 0);
  const [coupleBonus, setCoupleBonus] = useState<number | "">(
    room?.couplePrice ?? 0
  );

  // reset khi mở / đổi room
  useEffect(() => {
    if (!open) return;
    setName(room?.name ?? "");
    setVipBonus(room?.vipPrice ?? 0);
    setCoupleBonus(room?.couplePrice ?? 0);
  }, [open, room]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload: Room = {
        cinemaId,
        name: name.trim(),
        vipPrice: Number(vipBonus || 0),
        couplePrice: Number(coupleBonus || 0),
      };

      if (mode === "create") {
        await createRoom({
          ...payload,
          seatLayout: makeBaseLayout5x5(), // base 5x5 A..E x 1..5, type: EMPTY
        });
      } else if (room?.id) {
        await updateRoom(room.id, { ...payload, seatLayout: room.seatLayout }); // không đụng layout khi edit metadata
      }

      onSuccess?.();
    } catch (e) {
      // bạn có thể thay bằng toast
      alert("Lưu phòng thất bại");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Thêm phòng" : "Chỉnh sửa phòng"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tên phòng</Label>
              <Input
                autoFocus
                placeholder="Ví dụ: Phòng 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Giá bonus ghế VIP (VND)</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  step="1000"
                  placeholder="0"
                  value={vipBonus}
                  onChange={(e) =>
                    setVipBonus(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Giá bonus ghế đôi (VND)</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  step="1000"
                  placeholder="0"
                  value={coupleBonus}
                  onChange={(e) =>
                    setCoupleBonus(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving
                ? "Đang lưu..."
                : mode === "create"
                ? "Thêm phòng"
                : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
