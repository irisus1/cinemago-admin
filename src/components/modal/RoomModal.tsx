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
import { type Room } from "@/services";
import type { RoomFormData } from "@/hooks/useRoomCardLogic";

// Định nghĩa Props mới
export type RoomModalProps = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  room?: Room | null; // Cho phép null
  isSubmitting: boolean;
  onSubmit: (data: RoomFormData) => void;
};

export default function RoomModal({
  open,
  onClose,
  mode,
  room,
  isSubmitting,
  onSubmit,
}: RoomModalProps) {
  // Local Form State
  const [name, setName] = useState("");
  const [vipBonus, setVipBonus] = useState<number | "">("");
  const [coupleBonus, setCoupleBonus] = useState<number | "">("");

  // UI Helper State (để disable input nếu phòng không có loại ghế đó)
  const [hasVipSeat, setHasVipSeat] = useState(false);
  const [hasCoupleSeat, setHasCoupleSeat] = useState(false);

  // Reset form khi mở modal hoặc khi room thay đổi
  useEffect(() => {
    if (open) {
      if (mode === "create") {
        setName("");
        setVipBonus(0);
        setCoupleBonus(0);
        // Khi tạo mới, ta giả định layout mặc định có cả 2 loại ghế (hoặc tùy logic bạn)
        setHasVipSeat(false);
        setHasCoupleSeat(false);
      } else if (room) {
        console.log("room modal: ", room);

        setName(room.name);
        setVipBonus(Number(room.VIP ?? 0));
        setCoupleBonus(Number(room.COUPLE ?? 0));

        // Kiểm tra layout có sẵn trong room để enable/disable input
        if (room.seatLayout && room.seatLayout.length > 0) {
          setHasVipSeat(room.seatLayout.some((s) => s.type === "VIP"));
          setHasCoupleSeat(room.seatLayout.some((s) => s.type === "COUPLE"));
        } else {
          // Fallback nếu chưa load được layout
          setHasVipSeat(true);
          setHasCoupleSeat(true);
        }
      }
    }
  }, [open, mode, room]);

  const handleSave = () => {
    if (!name.trim()) return;

    const formData: RoomFormData = {
      name: name.trim(),
      vipPrice: Number(vipBonus || 1),
      couplePrice: Number(coupleBonus || 1),
    };

    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[520px] z-50">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Thêm phòng mới" : `Chỉnh sửa: ${room?.name}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tên phòng</Label>
            <Input
              autoFocus
              placeholder="Ví dụ: Phòng 01"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phụ thu ghế VIP (VNĐ)</Label>
              <Input
                type="number"
                step="1000"
                placeholder="0"
                value={vipBonus}
                disabled={!hasVipSeat}
                className={!hasVipSeat ? "opacity-50 cursor-not-allowed" : ""}
                onChange={(e) =>
                  setVipBonus(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Phụ thu ghế Đôi (VNĐ)</Label>
              <Input
                type="number"
                step="1000"
                placeholder="0"
                value={coupleBonus}
                disabled={!hasCoupleSeat}
                className={
                  !hasCoupleSeat ? "opacity-50 cursor-not-allowed" : ""
                }
                onChange={(e) =>
                  setCoupleBonus(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
