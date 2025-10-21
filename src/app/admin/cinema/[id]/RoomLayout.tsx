import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Seat types
const SEAT_TYPES = [
  {
    key: "regular",
    label: "Thường",
    className: "bg-gray-200 text-gray-900",
    ring: "ring-gray-400",
  },
  {
    key: "vip",
    label: "VIP",
    className: "bg-purple-200 text-purple-950",
    ring: "ring-purple-400",
  },
  {
    key: "double",
    label: "Double",
    className: "bg-teal-200 text-teal-950",
    ring: "ring-teal-400",
  },
  {
    key: "block",
    label: "Block",
    className: "bg-red-200 text-red-950",
    ring: "ring-red-400",
  },
] as const;

// Helpers
const toLetters = (n) => {
  let s = "",
    num = n;
  while (num > 0) {
    const r = (num - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
};
const defaultRows = 5;
const defaultCols = 8;
const makeEmptyLayout = (r, c) =>
  Array.from({ length: r }, () =>
    Array.from({ length: c }, () => ({ type: "regular" }))
  );

// Chuẩn hóa seatLayout về ma trận “đều cột”
const normalizeGrid = (grid) => {
  if (!Array.isArray(grid) || grid.length === 0)
    return makeEmptyLayout(defaultRows, defaultCols);
  const maxC = grid.reduce(
    (m, row) => Math.max(m, Array.isArray(row) ? row.length : 0),
    0
  );
  return grid.map((row) => {
    const r = Array.isArray(row) ? row.slice() : [];
    while (r.length < maxC) r.push({ type: "regular" });
    return r;
  });
};

// ✅ CHỈNH: nhận layout từ room
export default function SeatLayoutBuilder({
  seatLayout, // 2D array: [[{type, pairId?}, ...], ...]
  onChange, // optional: nhận data khi bấm Lưu
}) {
  const [rows, setRows] = useState(defaultRows);
  const [cols, setCols] = useState(defaultCols);
  const [pendingRows, setPendingRows] = useState(String(defaultRows));
  const [pendingCols, setPendingCols] = useState(String(defaultCols));
  const [selectedType, setSelectedType] = useState("regular");
  const [layout, setLayout] = useState(() =>
    makeEmptyLayout(defaultRows, defaultCols)
  );

  // ✅ Hydrate khi seatLayout (từ room) thay đổi
  useEffect(() => {
    if (!seatLayout) return;
    console.log(seatLayout);

    const grid = normalizeGrid(seatLayout);
    const rr = grid.length;
    const cc = grid.reduce((m, r) => Math.max(m, r.length), 0);
    setLayout(grid);
    setRows(rr);
    setCols(cc);
    setPendingRows(String(rr));
    setPendingCols(String(cc));
  }, [seatLayout]);

  const colHeaders = useMemo(
    () => Array.from({ length: cols }, (_, i) => toLetters(i + 1)),
    [cols]
  );

  // ✅ Resize nhưng giữ các ghế đã set (không reset toàn bộ)
  const generateLayout = () => {
    const r = Math.max(1, Math.min(40, parseInt(pendingRows || "1", 10)));
    const c = Math.max(1, Math.min(52, parseInt(pendingCols || "1", 10)));
    setRows(r);
    setCols(c);
    setLayout((prev) =>
      Array.from({ length: r }, (_, i) =>
        Array.from({ length: c }, (_, j) =>
          prev[i]?.[j] ? { ...prev[i][j] } : { type: "regular" }
        )
      )
    );
  };

  const unpairIfNeeded = (grid, rIdx, cIdx) => {
    const cell = grid[rIdx][cIdx];
    if (!cell?.pairId) return;
    const left = cIdx > 0 ? grid[rIdx][cIdx - 1] : null;
    const right =
      cIdx < (grid[rIdx]?.length ?? 0) - 1 ? grid[rIdx][cIdx + 1] : null;
    if (left && left.pairId === cell.pairId) {
      left.pairId = undefined;
      if (left.type === "double") left.type = "regular";
    } else if (right && right.pairId === cell.pairId) {
      right.pairId = undefined;
      if (right.type === "double") right.type = "regular";
    }
    cell.pairId = undefined;
    if (cell.type === "double") cell.type = "regular";
  };

  const tryPairDouble = (grid, rIdx, cIdx) => {
    const cell = grid[rIdx][cIdx];
    if (cell.type === "block") return false;
    if (cell.pairId) return true;

    const canUse = (rr, cc) =>
      rr >= 0 &&
      cc >= 0 &&
      rr < grid.length &&
      cc < grid[rr].length &&
      !grid[rr][cc].pairId &&
      grid[rr][cc].type !== "block";

    // Ưu tiên bên trái
    if (canUse(rIdx, cIdx - 1)) {
      const pid = `R${rIdx + 1}C${cIdx - 1}-${cIdx}`;
      grid[rIdx][cIdx - 1].pairId = pid;
      grid[rIdx][cIdx - 1].type = "double";
      cell.pairId = pid;
      cell.type = "double";
      return true;
    }
    // Sau đó bên phải
    if (canUse(rIdx, cIdx + 1)) {
      const pid = `R${rIdx + 1}C${cIdx}-${cIdx + 1}`;
      grid[rIdx][cIdx + 1].pairId = pid;
      grid[rIdx][cIdx + 1].type = "double";
      cell.pairId = pid;
      cell.type = "double";
      return true;
    }
    return false;
  };

  const applySeat = (rIdx, cIdx) => {
    setLayout((prev) => {
      const next = prev.map((row) => row.map((x) => ({ ...x })));
      const cell = next[rIdx][cIdx];

      if (selectedType === "double") {
        if (!cell.pairId) {
          const ok = tryPairDouble(next, rIdx, cIdx);
          if (!ok && typeof window !== "undefined")
            window.alert(
              "Không thể tạo ghế đôi (không có ghế trống liền kề trái/phải)."
            );
        }
        return next;
      }

      if (cell.pairId) unpairIfNeeded(next, rIdx, cIdx);
      next[rIdx][cIdx].type = selectedType;
      return next;
    });
  };

  const resetChanges = () => {
    setRows(defaultRows);
    setCols(defaultCols);
    setPendingRows(String(defaultRows));
    setPendingCols(String(defaultCols));
    setLayout(makeEmptyLayout(defaultRows, defaultCols));
    setSelectedType("regular");
  };

  const handleSave = () => {
    const data = {
      rows,
      cols,
      seats: layout
        .map((row, r) =>
          row.map((t, c) => ({
            row: r + 1,
            col: toLetters(c + 1),
            type: t.type,
            pairId: t.pairId || null,
          }))
        )
        .flat(),
      grid: layout,
    };
    if (onChange) onChange(data); // gửi ra cha nếu cần

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "seat-layout.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const isLeftHalf = (rIdx, cIdx) => {
    const cell = layout[rIdx][cIdx];
    if (!cell?.pairId) return false;
    const right =
      cIdx < layout[rIdx].length - 1 ? layout[rIdx][cIdx + 1] : null;
    return right && right.pairId === cell.pairId;
  };
  const isRightHalf = (rIdx, cIdx) => {
    const cell = layout[rIdx][cIdx];
    if (!cell?.pairId) return false;
    const left = cIdx > 0 ? layout[rIdx][cIdx - 1] : null;
    return left && left.pairId === cell.pairId;
  };

  return (
    <div className="w-full p-6 space-y-6">
      {/* Card 1: loại ghế */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">1) Chọn loại ghế</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {SEAT_TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setSelectedType(t.key)}
                  className={cn(
                    "px-3 py-2 rounded-xl border text-sm font-medium transition-all ring-1",
                    t.className,
                    selectedType === t.key
                      ? `${t.ring} ring-2 scale-[1.02]`
                      : "opacity-80 hover:opacity-100"
                  )}
                  title={`Đang gán: ${t.label}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              Chọn một loại ghế, sau đó bấm vào các ô ghế phía dưới để gán kiểu.{" "}
              <br />
              Gợi ý: <span className="font-medium">Block</span> dùng để đánh dấu
              lối đi / khu vực trống.
            </div>
          </CardContent>
        </Card>

        {/* Card 2: nhập grid */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">2) Nhập kích thước phòng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Rows (1–40)</Label>
                <Input
                  type="number"
                  value={pendingRows}
                  onChange={(e) => setPendingRows(e.target.value)}
                  min={1}
                  max={40}
                  placeholder="VD: 10"
                />
              </div>
              <div className="space-y-2">
                <Label>Cols (1–52)</Label>
                <Input
                  type="number"
                  value={pendingCols}
                  onChange={(e) => setPendingCols(e.target.value)}
                  min={1}
                  max={52}
                  placeholder="VD: 12"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={generateLayout}>Tạo layout</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setPendingRows(String(rows));
                  setPendingCols(String(cols));
                }}
              >
                Khôi phục số hàng/cột
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Lưu/Hủy */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">3) Lưu & Hủy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSave}>Lưu layout (.json)</Button>
              <Button variant="destructive" onClick={resetChanges}>
                Hủy / Reset
              </Button>
            </div>
            <Separator className="my-4" />
            <div className="text-xs text-muted-foreground">
              Lưu ý: Nhấn <span className="font-medium">Lưu</span> để tải về
              JSON cấu hình ghế.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm flex-wrap justify-center">
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded bg-gray-200" />
          Thường
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded bg-purple-200" />
          VIP
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded bg-teal-200" />
          Double
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded bg-red-200" />
          Block
        </div>
      </div>

      {/* Screen */}
      <div className="w-full flex justify-center">
        <div className="w-1/2 max-w-xl h-2 bg-gray-300 rounded-full" />
      </div>
      <div className="text-center text-xs text-muted-foreground">Màn hình</div>

      {/* Grid */}
      <div className="w-full flex justify-center">
        <div className="overflow-auto border rounded-2xl p-4 bg-white shadow-sm">
          <div className="inline-block">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `3rem repeat(${cols}, minmax(2.25rem, 1fr))`,
              }}
            >
              <div />
              {colHeaders.map((h) => (
                <div
                  key={h}
                  className="text-center text-xs font-medium text-muted-foreground py-1"
                >
                  {h}
                </div>
              ))}
            </div>

            <div className="space-y-1">
              {layout.map((row, rIdx) => (
                <div
                  key={rIdx}
                  className="grid items-center"
                  style={{
                    gridTemplateColumns: `3rem repeat(${cols}, minmax(2.25rem, 1fr))`,
                  }}
                >
                  <div className="text-center text-xs font-medium text-muted-foreground">
                    {rIdx + 1}
                  </div>
                  {row.map((t, cIdx) => (
                    <button
                      key={cIdx}
                      onClick={() => applySeat(rIdx, cIdx)}
                      className={cn(
                        "h-8 border flex items-center justify-center text-[10px] font-semibold select-none leading-none transition-all",
                        t.type === "regular" &&
                          "bg-gray-200 border-gray-300 hover:brightness-95",
                        t.type === "vip" &&
                          "bg-purple-200 border-purple-300 hover:brightness-95",
                        t.type === "double" &&
                          "bg-teal-200 border-teal-300 hover:brightness-95",
                        t.type === "block" &&
                          "bg-red-200 border-red-300 hover:brightness-95",
                        t.type !== "double" && "rounded-lg",
                        t.type === "double" &&
                          isLeftHalf(rIdx, cIdx) &&
                          "rounded-l-lg rounded-r-none",
                        t.type === "double" &&
                          isRightHalf(rIdx, cIdx) &&
                          "rounded-r-lg rounded-l-none",
                        t.type === "double" &&
                          !isLeftHalf(rIdx, cIdx) &&
                          !isRightHalf(rIdx, cIdx) &&
                          "rounded-lg"
                      )}
                      title={`Ghế ${toLetters(cIdx + 1)}${rIdx + 1} - ${
                        t.type
                      }${t.pairId ? " (double)" : ""}`}
                    >
                      {`${toLetters(cIdx + 1)}${rIdx + 1}`}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
