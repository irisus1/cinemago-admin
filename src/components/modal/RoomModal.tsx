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
import { LayoutTemplate, Edit } from "lucide-react";
import { type Room, type SeatCell } from "@/services";
import type { RoomFormData } from "@/hooks/useRoomCardLogic";
import { RoomLayoutModal } from "./RoomLayoutModal";

export type RoomModalProps = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  room?: Room | null;
  isSubmitting: boolean;
  onSubmit: (data: RoomFormData & { seatLayout?: SeatCell[] }) => void;
};

export default function RoomModal({
  open,
  onClose,
  mode,
  room,
  isSubmitting,
  onSubmit,
}: RoomModalProps) {
  const [name, setName] = useState("");
  const [vipBonus, setVipBonus] = useState<number | "">("");
  const [coupleBonus, setCoupleBonus] = useState<number | "">("");

  const [seatLayout, setSeatLayout] = useState<SeatCell[] | undefined>(
    undefined,
  );
  const [layoutModalOpen, setLayoutModalOpen] = useState(false);

  const [hasVipSeat, setHasVipSeat] = useState(false);
  const [hasCoupleSeat, setHasCoupleSeat] = useState(false);

  useEffect(() => {
    if (open) {
      if (mode === "create") {
        setName("");
        setVipBonus(0);
        setCoupleBonus(0);
        setSeatLayout(undefined);
        setHasVipSeat(false);
        setHasCoupleSeat(false);
      } else if (room) {
        setName(room.name);
        setVipBonus(Number(room.VIP ?? 0));
        setCoupleBonus(Number(room.COUPLE ?? 0));

        const currentLayout = room.seatLayout || [];
        setSeatLayout(currentLayout);

        if (currentLayout.length > 0) {
          setHasVipSeat(currentLayout.some((s) => s.type === "VIP"));
          setHasCoupleSeat(currentLayout.some((s) => s.type === "COUPLE"));
        } else {
          setHasVipSeat(true);
          setHasCoupleSeat(true);
        }
      }
    }
  }, [open, mode, room]);

  const handleLayoutSave = (newLayout: SeatCell[]) => {
    setSeatLayout(newLayout);
    setLayoutModalOpen(false);

    setHasVipSeat(newLayout.some((s) => s.type === "VIP"));
    setHasCoupleSeat(newLayout.some((s) => s.type === "COUPLE"));
  };

  const handleSave = () => {
    if (!name.trim()) return;

    console.log("Dữ liệu layout chuẩn bị gửi:", seatLayout);

    const formData = {
      name: name.trim(),
      vipPrice: Number(vipBonus || 0),
      couplePrice: Number(coupleBonus || 0),
      seatLayout: seatLayout,
    };

    onSubmit(formData);
  };

  const countRealSeats = (layout: SeatCell[] | undefined) => {
    if (!layout) return 0;
    return layout.filter((s) => s.type !== "EMPTY").length;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-[520px] z-50">
          <DialogHeader>
            <DialogTitle>
              {mode === "create"
                ? "Thêm phòng mới"
                : `Chỉnh sửa: ${room?.name}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                Tên phòng <span className="text-red-500">*</span>
              </Label>
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
                  disabled={!hasVipSeat && seatLayout && seatLayout.length > 0}
                  className={
                    !hasVipSeat && seatLayout && seatLayout.length > 0
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }
                  onChange={(e) =>
                    setVipBonus(
                      e.target.value === "" ? "" : Number(e.target.value),
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
                  disabled={
                    !hasCoupleSeat && seatLayout && seatLayout.length > 0
                  }
                  className={
                    !hasCoupleSeat && seatLayout && seatLayout.length > 0
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }
                  onChange={(e) =>
                    setCoupleBonus(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bố cục phòng</Label>
              <Button
                variant="outline"
                className="w-full justify-center gap-2 border-dashed"
                onClick={() => setLayoutModalOpen(true)}
              >
                {seatLayout && seatLayout.length > 0 ? (
                  <Edit size={16} />
                ) : (
                  <LayoutTemplate size={16} />
                )}
                {seatLayout && seatLayout.length > 0
                  ? "Chỉnh sửa sơ đồ ghế"
                  : "Cấu hình sơ đồ ghế"}
              </Button>
              {seatLayout && seatLayout.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Đã cấu hình {countRealSeats(seatLayout)} ghế
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting
                ? "Đang lưu..."
                : mode === "create"
                  ? "Tạo phòng"
                  : "Cập nhật"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {layoutModalOpen && (
        <RoomLayoutModal
          open={layoutModalOpen}
          onOpenChange={setLayoutModalOpen}
          roomName={name || "Phòng mới"}
          initialLayout={seatLayout}
          onSave={handleLayoutSave}
        />
      )}
    </>
  );
}
