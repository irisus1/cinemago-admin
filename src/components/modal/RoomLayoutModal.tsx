"use client";

import React, { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  useSeatLayoutLogic,
  toLetters,
  isLeftHalf,
  isRightHalf,
  LIMIT_MAX,
  SeatTypeKey,
} from "@/hooks/useSeatLayoutLogic";
import { SeatCell } from "@/services";

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

type RoomLayoutModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomName: string;
  initialLayout?: SeatCell[];
  onSave: (layout: SeatCell[]) => void;
};

export function RoomLayoutModal({
  open,
  onOpenChange,
  roomName,
  initialLayout,
  onSave,
}: RoomLayoutModalProps) {
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
    generateLayout,
    onSeatMouseDown,
    onSeatMouseEnter,
    handleSave,
    setIsDragging,
    dragNotifiedRef,
  } = useSeatLayoutLogic({
    open,
    onClose: handleClose,
    seatLayout: initialLayout,
    onCustomSave: onSave,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[95vw] w-[95vw] h-[95vh] flex flex-col p-0 gap-0 focus:outline-none">
        <DialogHeader className="px-6 py-4 border-b bg-white flex-none">
          <DialogTitle>Cấu hình ghế - {roomName}</DialogTitle>
          <DialogDescription>
            Thiết kế sơ đồ ghế ngồi. Kéo thả chuột để chọn nhiều ghế.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-2 border-b bg-slate-50 flex flex-wrap items-center justify-between gap-4 flex-none z-10">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 pr-3">
            <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap py-4">
              Loại ghế:
            </span>
            {SEAT_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setSelectedType(t.key as SeatTypeKey)}
                className={cn(
                  "px-3 py-1.5 rounded-md border text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ",
                  t.className,
                  selectedType === (t.key as SeatTypeKey)
                    ? `${t.ring} ring-2 ring-offset-1 font-bold shadow-sm scale-105`
                    : "opacity-70 hover:opacity-100",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 bg-white p-1.5 rounded-lg border shadow-sm">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground pl-2">
                Hàng:
              </Label>
              <Input
                type="number"
                className="w-14 h-8 text-center"
                value={pendingRows}
                onChange={(e) => setPendingRows(e.target.value)}
                min={1}
                max={LIMIT_MAX}
              />
            </div>
            <span className="text-muted-foreground text-xs">x</span>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Cột:</Label>
              <Input
                type="number"
                className="w-14 h-8 text-center"
                value={pendingCols}
                onChange={(e) => setPendingCols(e.target.value)}
                min={1}
                max={LIMIT_MAX}
              />
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={generateLayout}
              className="h-8"
            >
              Tạo lưới
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-slate-100 relative">
          <div className="w-full h-full overflow-auto p-8 flex flex-col items-center">
            <div className="mb-12 w-[60%] max-w-3xl flex flex-col items-center opacity-80 shrink-0 select-none">
              <div className="w-full h-2 bg-slate-300 rounded-full shadow-sm mb-2" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">
                Màn hình chiếu
              </span>
              <div className="w-full h-16 bg-gradient-to-b from-slate-200/40 to-transparent clip-path-screen pointer-events-none" />
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <p>Đang tải...</p>
              </div>
            ) : (
              <div
                className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 select-none inline-block mb-10"
                onMouseUp={() => {
                  setIsDragging(false);
                  dragNotifiedRef.current = false;
                }}
                onMouseLeave={() => {
                  setIsDragging(false);
                  dragNotifiedRef.current = false;
                }}
              >
                <div
                  className="grid gap-1 mb-2"
                  style={{
                    gridTemplateColumns: `3rem repeat(${cols}, minmax(2.5rem, 1fr))`,
                  }}
                >
                  <div />
                  {Array.from({ length: cols }, (_, i) => i + 1).map((n) => (
                    <div
                      key={n}
                      className="text-center text-xs font-bold text-slate-400"
                    >
                      {n}
                    </div>
                  ))}
                </div>

                <div className="grid gap-1">
                  {layout.map((row, rIdx) => (
                    <div
                      key={rIdx}
                      className="grid gap-1 items-center"
                      style={{
                        gridTemplateColumns: `3rem repeat(${cols}, minmax(2.5rem, 1fr))`,
                      }}
                    >
                      <div className="text-center font-bold text-slate-500 text-sm">
                        {toLetters(rIdx + 1)}
                      </div>
                      {row.map((seat, cIdx) => {
                        const label = `${toLetters(rIdx + 1)}${cIdx + 1}`;
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
                        const typeConfig =
                          SEAT_TYPES.find((t) => t.key === seat.type) ||
                          SEAT_TYPES[0];

                        return (
                          <div
                            key={`${rIdx}-${cIdx}`}
                            className="w-full aspect-square relative group"
                            onMouseDown={(e) => onSeatMouseDown(rIdx, cIdx, e)}
                            onMouseEnter={() => onSeatMouseEnter(rIdx, cIdx)}
                          >
                            <div
                              className={cn(
                                "w-full h-full flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all border shadow-sm",
                                roundedClass,
                                typeConfig.className,
                                seat.type === "empty"
                                  ? "opacity-20 border-dashed shadow-none bg-transparent hover:bg-slate-100 hover:opacity-100"
                                  : "hover:scale-110 hover:shadow-md hover:z-20 hover:brightness-105",
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
        </div>

        <div className="px-6 py-4 bg-white border-t flex-none flex items-center justify-between">
          <div className="flex gap-6 text-sm">
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs uppercase">
                Tổng số ghế
              </span>
              <span className="font-bold text-lg text-slate-800">
                {layout.flat().filter((s) => s.type !== "empty").length}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose}>
              Đóng
            </Button>
            <Button
              onClick={handleSave}
              className="bg-slate-900 text-white hover:bg-slate-800 px-8"
            >
              Lưu cấu hình
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
