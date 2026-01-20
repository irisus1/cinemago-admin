"use client";

import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { type Room } from "@/services";

import {
  useSeatLayoutLogic,
  SeatLayoutProp,
  SeatRecord,
  toLetters,
  isLeftHalf,
  isRightHalf,
  LIMIT_MAX,
  SeatTypeKey,
} from "@/hooks/useSeatLayoutLogic";

const SEAT_TYPES = [
  {
    key: "normal",
    label: "Thường",
    className: "bg-gray-200 text-gray-900",
    ring: "ring-gray-400",
  },
  {
    key: "vip",
    label: "Ghế VIP",
    className: "bg-purple-200 text-purple-950",
    ring: "ring-purple-400",
  },
  {
    key: "couple",
    label: "Ghế Đôi",
    className: "bg-teal-200 text-teal-950",
    ring: "ring-teal-400",
  },
  {
    key: "empty",
    label: "Empty",
    className: "bg-red-200 text-red-950",
    ring: "ring-red-400",
  },
] as const;

type Props = {
  open: boolean;
  seatLayout?: SeatLayoutProp;
  onChange?: (seatLayout: SeatRecord[]) => void;
  notify?: (msg: string) => void;
  room?: Room;
  onClose: () => void;
};

export default function SeatLayoutBuilder(props: Props) {
  const { open, onClose } = props;

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
    handleSave,
    onSeatMouseDown,
    onSeatMouseEnter,
  } = useSeatLayoutLogic(props);

  const colHeaders = useMemo(
    () => Array.from({ length: cols }, (_, i) => i + 1),
    [cols],
  );

  if (!open) return null;

  return (
    <div className="w-full p-6 space-y-6">
      {loading ? (
        <div className="h-full w-full animate-pulse rounded-xl bg-muted/40" />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-sm">
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {SEAT_TYPES.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setSelectedType(t.key as SeatTypeKey)}
                      className={cn(
                        "px-3 py-2 rounded-xl border text-sm font-medium transition-all ring-1",
                        t.className,
                        selectedType === (t.key as SeatTypeKey)
                          ? `${t.ring} ring-2 scale-[1.02]`
                          : "opacity-80 hover:opacity-100",
                      )}
                      title={`Đang gán: ${t.label}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <Separator className="my-4" />
                <div className="text-xs text-muted-foreground leading-relaxed">
                  Giữ chuột trái & rê để gán hàng loạt. Empty = lối đi.
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Hàng (1–{LIMIT_MAX})</Label>
                    <Input
                      type="number"
                      value={pendingRows}
                      onChange={(e) => setPendingRows(e.target.value)}
                      min={1}
                      max={LIMIT_MAX}
                      placeholder="VD: 10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cột (1–{LIMIT_MAX})</Label>
                    <Input
                      type="number"
                      value={pendingCols}
                      onChange={(e) => setPendingCols(e.target.value)}
                      min={1}
                      max={LIMIT_MAX}
                      placeholder="VD: 12"
                    />
                  </div>
                </div>
                <div className="mt-4 gap-2 ">
                  <Button className="w-full" onClick={generateLayout}>
                    Tạo layout
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Giá bonus VIP:{" "}
                    <span className="font-semibold text-blue-600">
                      {vipBonus} đ
                    </span>
                  </p>
                  <p className="text-sm font-medium">
                    Giá bonus Ghế đôi:{" "}
                    <span className="font-semibold text-blue-600">
                      {coupleBonus} đ
                    </span>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button className="w-full" onClick={handleSave}>
                    Lưu layout
                  </Button>
                  <Button
                    className="w-full"
                    variant="destructive"
                    onClick={onClose}
                  >
                    Hủy / Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-4 text-sm flex-wrap justify-center">
            {SEAT_TYPES.map((t) => (
              <div key={t.key} className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-block w-4 h-4 rounded",
                    t.className.split(" ")[0],
                  )}
                />
                {t.label}
              </div>
            ))}
          </div>

          <div className="w-full flex justify-center">
            <div className="w-1/2 max-w-xl h-2 bg-gray-300 rounded-full" />
          </div>
          <div className="text-center text-xs text-muted-foreground">
            Màn hình
          </div>

          <div className="w-full flex justify-center">
            <div
              className="overflow-auto border rounded-2xl p-4 bg-white shadow-sm"
              onMouseUp={() => {
                setIsDragging(false);
                dragNotifiedRef.current = false;
              }}
            >
              <div className="inline-block">
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: `3rem repeat(${cols}, minmax(2.25rem, 1fr))`,
                  }}
                >
                  <div />
                  {colHeaders.map((n) => (
                    <div
                      key={n}
                      className="text-center text-xs font-medium text-muted-foreground py-1"
                    >
                      {n}
                    </div>
                  ))}
                </div>

                <div className="space-y-2 mt-1">
                  {layout.map((row, rIdx) => (
                    <div
                      key={rIdx}
                      className="grid items-center gap-2"
                      style={{
                        gridTemplateColumns: `3rem repeat(${cols}, minmax(2.25rem, 1fr))`,
                      }}
                    >
                      <div className="text-center text-xs font-medium text-muted-foreground">
                        {toLetters(rIdx + 1)}
                      </div>

                      {row.map((t, cIdx) => {
                        const label = `${toLetters(rIdx + 1)}${cIdx + 1}`;
                        return (
                          <button
                            key={cIdx}
                            onMouseDown={(e) => onSeatMouseDown(rIdx, cIdx, e)}
                            onMouseEnter={() => onSeatMouseEnter(rIdx, cIdx)}
                            onContextMenu={(e) => e.preventDefault()}
                            className={cn(
                              "h-8 border flex items-center justify-center text-[10px] font-semibold select-none leading-none transition-all",
                              t.type === "normal" &&
                                "bg-gray-200 border-gray-300 hover:brightness-95",
                              t.type === "vip" &&
                                "bg-purple-200 border-purple-300 hover:brightness-95",
                              t.type === "couple" &&
                                "bg-teal-200 border-teal-300 hover:brightness-95",
                              t.type === "empty" &&
                                "bg-red-200 border-red-300 hover:brightness-95",

                              t.type !== "couple" && "rounded-lg",

                              t.type === "couple" &&
                                isLeftHalf(layout, rIdx, cIdx) &&
                                "rounded-l-lg rounded-r-none",
                              t.type === "couple" &&
                                isRightHalf(layout, rIdx, cIdx) &&
                                "rounded-r-lg rounded-l-none",
                              t.type === "couple" &&
                                !isLeftHalf(layout, rIdx, cIdx) &&
                                !isRightHalf(layout, rIdx, cIdx) &&
                                "rounded-lg",
                            )}
                            title={`Ghế ${label} - ${t.type}${
                              t.pairId ? " (couple)" : ""
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
