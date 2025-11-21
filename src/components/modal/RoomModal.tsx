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
import { roomService, type Room, RoomUpdate, RoomCreate } from "@/services";

// services tuỳ dự án bạn, đổi tên nếu khác

export type RoomModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  mode: "create" | "edit";
  cinemaId: string;
  room?: Room;
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
  const [saving, setSaving] = useState(false);
  const [loading, setLoadingRoom] = useState(false);

  const [name, setName] = useState(room?.name ?? "");
  const [vipBonus, setVipBonus] = useState<number | "">(room?.VIP ?? 0);
  const [coupleBonus, setCoupleBonus] = useState<number | "">(
    room?.COUPLE ?? 0
  );
  const [hasVipSeat, setHasVipSeat] = useState(false);
  const [hasCoupleSeat, setHasCoupleSeat] = useState(false);

  useEffect(() => {
    if (mode === "create") {
      setName("");
      setVipBonus(0);
      setCoupleBonus(0);
      const layout = makeBaseLayout5x5();
      setHasVipSeat(layout.some((s) => s.type === "VIP"));
      setHasCoupleSeat(layout.some((s) => s.type === "COUPLE"));
    }
  }, [mode]);

  // reset khi mở / đổi room
  useEffect(() => {
    if (!open || !room?.id) return;

    (async () => {
      try {
        setLoadingRoom(true);
        const res = await roomService.getRoomById(room.id); // { data: Room }
        console.log(res);
        setName(res?.name ?? "");
        setVipBonus(Number(res?.VIP ?? 0));
        setCoupleBonus(Number(res?.COUPLE ?? 0));
        if (res?.seatLayout?.length) {
          setHasVipSeat(res.seatLayout.some((s) => s.type === "VIP"));
          setHasCoupleSeat(res.seatLayout.some((s) => s.type === "COUPLE"));
        }
      } catch (e) {
        console.log("Không tải được thông tin phòng");
      } finally {
        setLoadingRoom(false);
      }
    })();
  }, [open, room?.id]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payloadBase = {
        cinemaId,
        name: name.trim(),
        vipPrice: Number(vipBonus || 1),
        couplePrice: Number(coupleBonus || 1),
      };

      console.log("edit create payload: ", payloadBase);

      if (mode === "create") {
        const payloadCreate: RoomCreate = {
          ...payloadBase,
          seatLayout: makeBaseLayout5x5(), // A..E x 1..5, type: EMPTY
        };
        await roomService.createRoom(payloadCreate);
      } else if (room?.id) {
        const payloadUpdate: RoomUpdate = {
          ...payloadBase,
          seatLayout: room.seatLayout, // A..E x 1..5, type: EMPTY
        };
        await roomService.updateRoom(room.id, payloadUpdate); // không đụng layout khi edit metadata
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
                  disabled={!hasVipSeat}
                  className={!hasVipSeat ? "opacity-50 cursor-not-allowed" : ""}
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
                  disabled={!hasCoupleSeat}
                  className={
                    !hasCoupleSeat ? "opacity-50 cursor-not-allowed" : ""
                  }
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
            <Button
              onClick={handleSave}
              disabled={saving || !name.trim() || loading}
            >
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
