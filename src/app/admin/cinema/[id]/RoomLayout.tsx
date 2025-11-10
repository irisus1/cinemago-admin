import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { roomService, type Room, RoomUpdate, SeatType } from "@/services";
import { on } from "events";

/* ====================== Types ====================== */
type SeatTypeKey = "normal" | "vip" | "couple" | "empty";

type SeatCell = { type: SeatTypeKey; pairId?: string | null };
type LayoutGrid = SeatCell[][];

type SeatRecord = { row: string; col: number; type: SeatType };

// CHỈ cần list phẳng hoặc grid 2D
type SeatLayoutProp = LayoutGrid | SeatRecord[];

type Props = {
  open: boolean;
  seatLayout?: SeatLayoutProp;
  onChange?: (seatLayout: SeatRecord[]) => void;
  notify?: (msg: string) => void; // dùng để toast
  room?: Room;
  onClose: () => void;
};

/* ====================== Constants ====================== */
const LIMIT_MAX = 15;
const defaultRows = 5;
const defaultCols = 5;

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

const TYPE_MAP: Record<SeatType, SeatTypeKey> = {
  NORMAL: "normal",
  VIP: "vip",
  COUPLE: "couple",
  EMPTY: "empty",
};

/* ====================== Helpers ====================== */
const toLetters = (n: number) => {
  let s = "",
    num = n;
  while (num > 0) {
    const r = (num - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
};
const lettersToNumber = (s: string) => {
  let n = 0;
  const up = s.toUpperCase().trim();
  for (let i = 0; i < up.length; i++) n = n * 26 + (up.charCodeAt(i) - 64);
  return n || 1;
};

const makeEmptyLayout = (r: number, c: number): LayoutGrid =>
  Array.from({ length: r }, () =>
    Array.from({ length: c }, () => ({ type: "normal" as const }))
  );

const normalizeGrid = (grid: LayoutGrid): LayoutGrid => {
  if (!Array.isArray(grid) || grid.length === 0)
    return makeEmptyLayout(defaultRows, defaultCols);
  const maxC = grid.reduce(
    (m, row) => Math.max(m, Array.isArray(row) ? row.length : 0),
    0
  );
  return grid.map((row) => {
    const r = Array.isArray(row) ? row.slice() : [];
    while (r.length < maxC) r.push({ type: "normal" });
    return r;
  });
};

const isGrid = (v: SeatLayoutProp): v is LayoutGrid =>
  Array.isArray(v) && (v.length === 0 || Array.isArray(v[0]));

const buildGridFromSeatList = (list: SeatRecord[]) => {
  const maxC = Math.max(1, ...list.map((x) => Number(x.col) || 0));
  const maxR = Math.max(1, ...list.map((x) => lettersToNumber(x.row)));
  const grid = makeEmptyLayout(maxR, maxC);
  for (const s of list) {
    const rIdx = lettersToNumber(s.row) - 1;
    const cIdx = (Number(s.col) || 1) - 1;
    const t = TYPE_MAP[s.type];
    if (grid[rIdx] && grid[rIdx][cIdx]) grid[rIdx][cIdx] = { type: t };
  }
  return { rows: maxR, cols: maxC, grid };
};

/* ====================== Component ====================== */
export default function SeatLayoutBuilder({
  seatLayout,
  room,
  onChange,
  notify,
  open,
  onClose,
}: Props) {
  const [rows, setRows] = useState<number>(defaultRows);
  const [cols, setCols] = useState<number>(defaultCols);
  const [pendingRows, setPendingRows] = useState<string>(String(defaultRows));
  const [pendingCols, setPendingCols] = useState<string>(String(defaultCols));
  const [selectedType, setSelectedType] = useState<SeatTypeKey>("normal");
  const [layout, setLayout] = useState<LayoutGrid>(() =>
    makeEmptyLayout(defaultRows, defaultCols)
  );
  const [roomData, setRoomData] = useState<Room | null>(room || null);

  // drag paint
  const [isDragging, setIsDragging] = useState(false);
  const dragNotifiedRef = useRef(false); // tránh spam toast khi kéo

  useEffect(() => {
    const stopDrag = () => {
      setIsDragging(false);
      dragNotifiedRef.current = false;
    };
    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("mouseleave", stopDrag);
    window.addEventListener("blur", stopDrag);
    return () => {
      window.removeEventListener("mouseup", stopDrag);
      window.removeEventListener("mouseleave", stopDrag);
      window.removeEventListener("blur", stopDrag);
    };
  }, []);

  // Hydrate: mảng phẳng hoặc grid 2D
  useEffect(() => {
    if (!seatLayout) return;
    if (isGrid(seatLayout)) {
      const grid = normalizeGrid(seatLayout);
      const rr = grid.length,
        cc = grid.reduce((m, r) => Math.max(m, r.length), 0);
      setLayout(grid);
      setRows(rr);
      setCols(cc);
      setPendingRows(String(rr));
      setPendingCols(String(cc));
    } else {
      const { rows: rr, cols: cc, grid } = buildGridFromSeatList(seatLayout);
      setLayout(grid);
      setRows(rr);
      setCols(cc);
      setPendingRows(String(rr));
      setPendingCols(String(cc));
    }
  }, [seatLayout]);

  // headers cột: số 1..N
  const colHeaders = useMemo(
    () => Array.from({ length: cols }, (_, i) => i + 1),
    [cols]
  );
  if (!open) return null;

  const bound = (val: string, max = LIMIT_MAX) => {
    const n = parseInt(val || "0", 10);
    const clamped = Math.min(Math.max(n || 1, 1), max);
    return { n: n || 1, clamped, adjusted: clamped !== (n || 1) };
  };

  function findCouplePartner(grid: LayoutGrid, rIdx: number, cIdx: number) {
    const cell = grid[rIdx]?.[cIdx];
    if (!cell?.pairId) return null;
    const pid = cell.pairId;

    if (cIdx > 0 && grid[rIdx][cIdx - 1]?.pairId === pid) {
      return { r: rIdx, c: cIdx - 1 };
    }
    if (cIdx < grid[rIdx].length - 1 && grid[rIdx][cIdx + 1]?.pairId === pid) {
      return { r: rIdx, c: cIdx + 1 };
    }
    return null;
  }

  // Quét toàn bộ, chỉ giữ DOUBLE khi còn đúng 1 bạn ngang cùng pairId
  const cleanupDoublePairs = (grid: LayoutGrid) => {
    const R = grid.length;
    const C = R ? grid[0].length : 0;

    // lưu danh sách cell cần trả về normal để không làm rối khi đang lặp
    const toNormalize: Array<{ r: number; c: number }> = [];

    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        const cell = grid[r][c];
        if (cell.type !== "couple") {
          // nếu lỡ còn pairId mà không phải double -> xoá
          if (cell.pairId) cell.pairId = undefined;
          continue;
        }

        const pid = cell.pairId;
        if (!pid) {
          toNormalize.push({ r, c });
          continue;
        }

        const left = c > 0 ? grid[r][c - 1] : undefined;
        const right = c < C - 1 ? grid[r][c + 1] : undefined;

        const leftOk = !!(
          left &&
          left.type === "couple" &&
          left.pairId === pid
        );
        const rightOk = !!(
          right &&
          right.type === "couple" &&
          right.pairId === pid
        );

        // Chỉ hợp lệ khi còn đúng 1 bạn (trái XOR phải)
        if (leftOk === rightOk) {
          // 0 bạn hoặc 2 bạn (dữ liệu lỗi) -> normalize cả mình và hai phía (nếu có)
          toNormalize.push({ r, c });
          if (leftOk) toNormalize.push({ r, c: c - 1 });
          if (rightOk) toNormalize.push({ r, c: c + 1 });
        }
      }
    }

    // thực hiện normalize
    for (const { r, c } of toNormalize) {
      const x = grid[r]?.[c];
      if (!x) continue;
      x.type = "normal";
      x.pairId = undefined;
    }
  };

  const generateLayout = () => {
    const rB = bound(pendingRows);
    const cB = bound(pendingCols);

    if (rB.adjusted || cB.adjusted) {
      notify?.(
        `Kích thước vượt giới hạn (1–${LIMIT_MAX}). Đã chỉnh về ${rB.clamped}×${cB.clamped}.`
      );
    }

    const r = rB.clamped;
    const c = cB.clamped;

    setRows(r);
    setCols(c);
    setPendingRows(String(r));
    setPendingCols(String(c));

    setLayout((prev) => {
      // cắt/expand và giữ ghế cũ
      const next: LayoutGrid = Array.from({ length: r }, (_, i) =>
        Array.from({ length: c }, (_, j) =>
          prev[i]?.[j] ? { ...prev[i][j] } : { type: "normal" }
        )
      );

      //dọn ghế đôi mồ côi sau khi cắt
      cleanupDoublePairs(next);
      return next;
    });
  };

  const unpairIfNeeded = (grid: LayoutGrid, rIdx: number, cIdx: number) => {
    const cell = grid[rIdx][cIdx];
    if (!cell?.pairId) return;
    const left = cIdx > 0 ? grid[rIdx][cIdx - 1] : null;
    const right = cIdx < grid[rIdx].length - 1 ? grid[rIdx][cIdx + 1] : null;
    if (left && left.pairId === cell.pairId) {
      left.pairId = undefined;
      if (left.type === "couple") left.type = "normal";
    } else if (right && right.pairId === cell.pairId) {
      right.pairId = undefined;
      if (right.type === "couple") right.type = "normal";
    }
    cell.pairId = undefined;
    if (cell.type === "couple") cell.type = "normal";
  };

  // GHÉP ĐÔI: chỉ khi cell hiện tại là normal (chưa pair), ưu tiên trái, rồi phải; không ghi đè VIP/couple/EMPTY
  const tryPaircouple = (grid: LayoutGrid, rIdx: number, cIdx: number) => {
    const cell = grid[rIdx][cIdx];
    if (cell.type !== "normal" || cell.pairId) return false;

    const canUse = (rr: number, cc: number) =>
      rr >= 0 &&
      cc >= 0 &&
      rr < grid.length &&
      cc < grid[rr].length &&
      !grid[rr][cc].pairId &&
      grid[rr][cc].type === "normal";

    // trái trước
    if (canUse(rIdx, cIdx - 1)) {
      const pid = `R${rIdx + 1}C${cIdx - 1}-${cIdx}`;
      grid[rIdx][cIdx - 1].pairId = pid;
      grid[rIdx][cIdx - 1].type = "couple";
      cell.pairId = pid;
      cell.type = "couple";
      return true;
    }
    // rồi phải
    if (canUse(rIdx, cIdx + 1)) {
      const pid = `R${rIdx + 1}C${cIdx}-${cIdx + 1}`;
      grid[rIdx][cIdx + 1].pairId = pid;
      grid[rIdx][cIdx + 1].type = "couple";
      cell.pairId = pid;
      cell.type = "couple";
      return true;
    }
    return false;
  };

  const applySeat = (rIdx: number, cIdx: number) => {
    setLayout((prev) => {
      const next = prev.map((row) => row.map((x) => ({ ...x })));
      const cell = next[rIdx][cIdx];

      // ===== EMPTY: nếu click vào 1 nửa couple -> đổi CẢ HAI nửa thành empty
      if (selectedType === "empty") {
        if (cell.type === "couple" && cell.pairId) {
          // unpairIfNeeded sẽ đưa CẢ HAI về normal
          unpairIfNeeded(next, rIdx, cIdx);
          // sau đó ép ô đang click thành empty
          next[rIdx][cIdx].type = "empty";
          return next;
        }

        if (cell.pairId) unpairIfNeeded(next, rIdx, cIdx);
        cell.type = cell.type === "empty" ? "normal" : "empty";
        return next;
      }

      // ===== VIP: toggle vip <-> normal (nếu là couple thì gỡ cặp trước)
      if (selectedType === "vip") {
        if (cell.pairId) unpairIfNeeded(next, rIdx, cIdx);
        cell.type = cell.type === "vip" ? "normal" : "vip";
        return next;
      }

      // ===== COUPLE: nếu đang couple -> bỏ ghép; nếu normal -> thử ghép
      if (selectedType === "couple") {
        if (cell.type === "couple" && cell.pairId) {
          unpairIfNeeded(next, rIdx, cIdx); // trả cả cặp về normal
          return next;
        }
        if (!tryPaircouple(next, rIdx, cIdx)) {
          if (!dragNotifiedRef.current) {
            toast("Không thể tạo ghế đôi: cần 2 ghế liền kề đang là 'Thường'.");
            dragNotifiedRef.current = true;
          }
        }
        return next;
      }

      // ===== NORMAL: luôn đưa về normal (nếu đang couple thì gỡ cặp)
      if (cell.pairId) unpairIfNeeded(next, rIdx, cIdx);
      cell.type = "normal";
      return next;
    });
  };
  // drag paint handlers
  const onSeatMouseDown = (r: number, c: number, e: React.MouseEvent) => {
    if (e.button !== 0) return; // chỉ chuột trái
    e.preventDefault();
    dragNotifiedRef.current = false;
    setIsDragging(true);
    applySeat(r, c);
  };
  const onSeatMouseEnter = (r: number, c: number) => {
    if (isDragging) applySeat(r, c);
  };

  const resetChanges = () => {
    setRows(defaultRows);
    setCols(defaultCols);
    setPendingRows(String(defaultRows));
    setPendingCols(String(defaultCols));
    setLayout(makeEmptyLayout(defaultRows, defaultCols));
    setSelectedType("normal");
  };

  // convert internal SeatTypeKey to external SeatRecordType
  const toExternalType = (t: SeatTypeKey): SeatType => {
    switch (t) {
      case "vip":
        return "VIP";
      case "couple":
        return "COUPLE";
      case "empty":
        return "EMPTY";
      default:
        return "NORMAL";
    }
  };

  const gridToSeatList = (grid: LayoutGrid): SeatRecord[] => {
    const out: SeatRecord[] = [];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        out.push({
          row: toLetters(r + 1), // A, B, C...
          col: c + 1, // 1, 2, 3...
          type: toExternalType(grid[r][c].type),
        });
      }
    }
    return out;
  };

  const handleSave = async () => {
    const seatList = gridToSeatList(layout);

    const vipFromRoom = room?.VIP;

    const coupleFromRoom = room?.COUPLE;
    const payload: RoomUpdate = {
      name: room?.name,
      cinemaId: room?.cinemaId,
      vipPrice: vipFromRoom ?? undefined,
      couplePrice: coupleFromRoom ?? undefined,
      seatLayout: seatList,
    };

    console.log(payload);

    try {
      if (!room?.id) throw new Error("Room ID is missing");
      await roomService.updateRoom(room?.id, payload);

      // Đồng bộ UI

      toast.success("Cập nhật layout ghế thành công");
    } catch (e) {
      console.log(e);

      toast.error("Cập nhật phòng thất bại");
    }

    onChange?.(seatList);
  };

  /* ====================== Render ====================== */
  return (
    <div className="w-full p-6 space-y-6">
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1) Chọn loại ghế */}
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
              Giữ chuột trái & rê để gán hàng loạt. Empty = lối đi.
            </div>
          </CardContent>
        </Card>

        {/* 2) Nhập kích thước (1–15) */}
        <Card className="shadow-sm">
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Hàng (1–15)</Label>
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
                <Label>Cột (1–15)</Label>
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

        {/* 3) Lưu / Hủy */}
        <Card className="shadow-sm">
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button className="w-full" onClick={handleSave}>
                Lưu layout (.json)
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
          couple
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded bg-red-200" />
          Empty
        </div>
      </div>

      {/* Screen */}
      <div className="w-full flex justify-center">
        <div className="w-1/2 max-w-xl h-2 bg-gray-300 rounded-full" />
      </div>
      <div className="text-center text-xs text-muted-foreground">Màn hình</div>

      {/* Grid */}
      <div className="w-full flex justify-center">
        <div
          className="overflow-auto border rounded-2xl p-4 bg-white shadow-sm"
          onMouseUp={() => {
            setIsDragging(false);
            dragNotifiedRef.current = false;
          }}
        >
          <div className="inline-block">
            {/* Column headers: SỐ & có gap */}
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

            {/* Rows: HÀNG = CHỮ, ghế có gap */}
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
                    const label = `${toLetters(rIdx + 1)}${cIdx + 1}`; // A1
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
                            "rounded-lg"
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
    </div>
  );
}

/* ===== helpers for render ===== */
function isLeftHalf(grid: LayoutGrid, rIdx: number, cIdx: number) {
  const cell = grid[rIdx][cIdx];
  if (!cell?.pairId) return false;
  const right = cIdx < grid[rIdx].length - 1 ? grid[rIdx][cIdx + 1] : null;
  return !!(right && right.pairId === cell.pairId);
}
function isRightHalf(grid: LayoutGrid, rIdx: number, cIdx: number) {
  const cell = grid[rIdx][cIdx];
  if (!cell?.pairId) return false;
  const left = cIdx > 0 ? grid[rIdx][cIdx - 1] : null;
  return !!(left && left.pairId === cell.pairId);
}
