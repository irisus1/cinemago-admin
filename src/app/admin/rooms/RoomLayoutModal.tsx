"use client";

import React, { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"; // Import ShadCN Dialog
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea
import { cn } from "@/lib/utils";
import {
  useSeatLayoutLogic,
  SeatRecord,
  toLetters,
  isLeftHalf,
  isRightHalf,
  LIMIT_MAX,
  SeatTypeKey,
} from "@/hooks/useSeatLayoutLogic";

/* ====================== Constants UI ====================== */
const SEAT_TYPES = [
  {
    key: "normal",
    label: "Thường",
    className: "bg-gray-200 text-gray-900 border-gray-300",
    ring: "ring-gray-400",
  },
  {
    key: "vip",
    label: "Ghế VIP",
    className: "bg-purple-200 text-purple-950 border-purple-300",
    ring: "ring-purple-400",
  },
  {
    key: "couple",
    label: "Ghế Đôi",
    className: "bg-teal-200 text-teal-950 border-teal-300",
    ring: "ring-teal-400",
  },
  {
    key: "empty",
    label: "Lối đi (Trống)",
    className: "bg-red-50 text-red-900 border-red-200",
    ring: "ring-red-400",
  },
] as const;

// Định nghĩa Props khớp với cha gọi
type RoomLayoutModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomName: string;
  initialLayout?: any; // Hoặc SeatLayoutProp nếu bạn đã export
  onSave: (layout: any) => void;
};

export function RoomLayoutModal({
  open,
  onOpenChange,
  roomName,
  initialLayout,
  onSave,
}: RoomLayoutModalProps) {
  // Bridge props để khớp với hook logic cũ của bạn
  // Hook logic cũ đang mong đợi { open, onClose, seatLayout, onSave... }
  // Ta wrap lại các hàm này
  const handleClose = () => onOpenChange(false);

  const {
    cols,
    pendingRows,
    setPendingRows,
    pendingCols,
    setPendingCols,
    selectedType,
    setSelectedType,
    layout,
    loading,
    vipBonus,
    coupleBonus,
    setIsDragging,
    dragNotifiedRef,

    generateLayout,
    handleSave, // Hàm này của hook có thể cần sửa lại xíu để gọi onSave prop
    onSeatMouseDown,
    onSeatMouseEnter,
  } = useSeatLayoutLogic({
    open,
    onClose: handleClose,
    seatLayout: initialLayout, // Truyền layout cũ vào hook
    // Override hàm save của hook để đẩy dữ liệu ra ngoài cho cha
    onCustomSave: onSave,
  } as any);

  const colHeaders = useMemo(
    () => Array.from({ length: cols }, (_, i) => i + 1),
    [cols]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[95vw] max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Cấu hình ghế - {roomName}</DialogTitle>
          <DialogDescription>
            Thiết kế sơ đồ ghế ngồi cho phòng chiếu này. Kéo thả chuột để chọn
            nhiều ghế.
          </DialogDescription>
        </DialogHeader>

        {/* Main Body: Chia thành 2 phần (Trái: Controls, Phải: Grid) hoặc Trên/Dưới */}
        {/* Ở đây tôi chọn layout: Controls ở trên, Grid ở dưới cho rộng */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
          {/* Toolbar Controls */}
          <div className="p-4 bg-white border-b flex flex-wrap gap-4 items-center justify-between shadow-sm z-10">
            {/* Group 1: Chọn loại ghế */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground mr-2">
                Loại ghế:
              </span>
              {SEAT_TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setSelectedType(t.key as SeatTypeKey)}
                  className={cn(
                    "px-3 py-1.5 rounded-md border text-sm font-medium transition-all flex items-center gap-2",
                    t.className,
                    selectedType === (t.key as SeatTypeKey)
                      ? `${t.ring} ring-2 ring-offset-1 font-bold shadow-sm`
                      : "opacity-70 hover:opacity-100"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="h-8 w-[1px] bg-gray-200 mx-2 hidden md:block" />

            {/* Group 2: Kích thước lưới */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap">Hàng:</Label>
                <Input
                  type="number"
                  className="w-16 h-8"
                  value={pendingRows}
                  onChange={(e) => setPendingRows(e.target.value)}
                  min={1}
                  max={LIMIT_MAX}
                />
              </div>
              <span className="text-muted-foreground">x</span>
              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap">Cột:</Label>
                <Input
                  type="number"
                  className="w-16 h-8"
                  value={pendingCols}
                  onChange={(e) => setPendingCols(e.target.value)}
                  min={1}
                  max={LIMIT_MAX}
                />
              </div>
              <Button size="sm" variant="secondary" onClick={generateLayout}>
                Tạo lưới
              </Button>
            </div>
          </div>

          {/* Grid Area - Chiếm phần còn lại và scroll được */}
          <ScrollArea className="flex-1 w-full bg-slate-100 relative">
            <div className="min-h-full min-w-full flex flex-col items-center justify-center p-8">
              {/* Màn hình */}
              <div className="mb-10 w-full max-w-3xl flex flex-col items-center opacity-80">
                <div className="w-full h-1.5 bg-slate-300 rounded-full shadow-sm mb-2" />
                <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                  Màn hình chiếu
                </span>
                <div className="w-full h-12 bg-gradient-to-b from-slate-200/50 to-transparent clip-path-screen" />
              </div>

              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                  Đang tải layout...
                </div>
              ) : (
                <div
                  className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 select-none inline-block"
                  onMouseUp={() => {
                    setIsDragging(false);
                    dragNotifiedRef.current = false;
                  }}
                  onMouseLeave={() => {
                    setIsDragging(false);
                    dragNotifiedRef.current = false;
                  }}
                >
                  {/* Column Headers */}
                  <div
                    className="grid gap-1 mb-2"
                    style={{
                      gridTemplateColumns: `3rem repeat(${cols}, minmax(2.5rem, 1fr))`,
                    }}
                  >
                    <div /> {/* Góc trái trên rỗng */}
                    {colHeaders.map((n) => (
                      <div
                        key={n}
                        className="text-center text-xs font-bold text-slate-400"
                      >
                        {n}
                      </div>
                    ))}
                  </div>

                  {/* Rows */}
                  <div className="grid gap-1">
                    {layout.map((row, rIdx) => (
                      <div
                        key={rIdx}
                        className="grid gap-1 items-center"
                        style={{
                          gridTemplateColumns: `3rem repeat(${cols}, minmax(2.5rem, 1fr))`,
                        }}
                      >
                        {/* Row Header (A, B, C...) */}
                        <div className="text-center font-bold text-slate-500 text-sm">
                          {toLetters(rIdx + 1)}
                        </div>

                        {/* Seats */}
                        {row.map((seat, cIdx) => {
                          const label = `${toLetters(rIdx + 1)}${cIdx + 1}`;

                          // Logic style cho ghế đôi (bo tròn góc trái/phải)
                          const isCouple = seat.type === "couple";
                          const isLeft =
                            isCouple && isLeftHalf(layout, rIdx, cIdx);
                          const isRight =
                            isCouple && isRightHalf(layout, rIdx, cIdx);

                          let roundedClass = "rounded-md";
                          if (isLeft)
                            roundedClass =
                              "rounded-l-md rounded-r-none border-r-0 mr-[1px]";
                          if (isRight)
                            roundedClass =
                              "rounded-r-md rounded-l-none border-l-0 ml-[1px]";

                          // Màu sắc
                          const typeConfig =
                            SEAT_TYPES.find((t) => t.key === seat.type) ||
                            SEAT_TYPES[0];

                          return (
                            <div
                              key={`${rIdx}-${cIdx}`}
                              className="w-full aspect-square relative group"
                              onMouseDown={(e) =>
                                onSeatMouseDown(rIdx, cIdx, e)
                              }
                              onMouseEnter={() => onSeatMouseEnter(rIdx, cIdx)}
                            >
                              <div
                                className={cn(
                                  "w-full h-full flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all border shadow-sm",
                                  roundedClass,
                                  typeConfig.className,
                                  seat.type === "empty"
                                    ? "opacity-30 border-dashed shadow-none"
                                    : "hover:scale-105 hover:shadow-md hover:z-10"
                                )}
                              >
                                {seat.type !== "empty" && label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer Info & Actions */}
          <div className="bg-white border-t p-4 flex items-center justify-between">
            <div className="flex gap-6 text-sm">
              <div className="flex flex-col">
                <span className="text-muted-foreground">Tổng số ghế:</span>
                <span className="font-bold text-lg">
                  {layout.flat().filter((s) => s.type !== "empty").length}
                </span>
              </div>
              <div className="h-10 w-[1px] bg-slate-200" />
              {/* <div className="flex flex-col">
                <span className="text-muted-foreground">Phụ thu VIP:</span>
                <span className="font-medium">{vipBonus} đ</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Phụ thu Đôi:</span>
                <span className="font-medium">{coupleBonus} đ</span>
              </div> */}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose}>
                Hủy bỏ
              </Button>
              <Button
                onClick={handleSave}
                className="px-8 bg-slate-900 text-white hover:bg-slate-800"
              >
                Lưu cấu hình
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
