"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { roomService, type Room, RoomUpdate, SeatType } from "@/services";

export type SeatTypeKey = "normal" | "vip" | "couple" | "empty";
export type SeatCell = { type: SeatTypeKey; pairId?: string | null };
export type LayoutGrid = SeatCell[][];
export type SeatRecord = { row: string; col: number; type: SeatType };
export type SeatLayoutProp = LayoutGrid | SeatRecord[] | undefined;

export const LIMIT_MAX = 15;
export const defaultRows = 10;
export const defaultCols = 10;

const TYPE_MAP: Record<SeatType, SeatTypeKey> = {
  NORMAL: "normal",
  VIP: "vip",
  COUPLE: "couple",
  EMPTY: "empty",
};

export const toLetters = (n: number) => {
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
  if (!list || list.length === 0) {
    return {
      rows: defaultRows,
      cols: defaultCols,
      grid: makeEmptyLayout(defaultRows, defaultCols),
    };
  }

  const maxC = Math.max(1, ...list.map((x) => Number(x.col) || 0));
  const maxR = Math.max(1, ...list.map((x) => lettersToNumber(x.row)));

  const grid = makeEmptyLayout(maxR, maxC);
  for (const s of list) {
    const rIdx = lettersToNumber(s.row) - 1;
    const cIdx = (Number(s.col) || 1) - 1;
    if (rIdx >= 0 && rIdx < maxR && cIdx >= 0 && cIdx < maxC) {
      const t = TYPE_MAP[s.type] || "normal";
      grid[rIdx][cIdx] = { type: t };
    }
  }
  return { rows: maxR, cols: maxC, grid };
};

export function isLeftHalf(grid: LayoutGrid, rIdx: number, cIdx: number) {
  const cell = grid[rIdx]?.[cIdx];
  if (!cell?.pairId) return false;
  const right = grid[rIdx]?.[cIdx + 1];
  return !!(right && right.pairId === cell.pairId);
}

export function isRightHalf(grid: LayoutGrid, rIdx: number, cIdx: number) {
  const cell = grid[rIdx]?.[cIdx];
  if (!cell?.pairId) return false;
  const left = grid[rIdx]?.[cIdx - 1];
  return !!(left && left.pairId === cell.pairId);
}

type UseSeatLayoutProps = {
  open: boolean;
  seatLayout?: SeatLayoutProp;
  room?: Room;
  onChange?: (seatLayout: SeatRecord[]) => void;
  onCustomSave?: (seatLayout: SeatRecord[]) => void;
  notify?: (msg: string) => void;
  onClose: () => void;
};

export function useSeatLayoutLogic({
  open,
  seatLayout,
  room,
  onCustomSave,
  notify,
}: UseSeatLayoutProps) {
  const [cols, setCols] = useState<number>(defaultCols);
  const [pendingRows, setPendingRows] = useState<string>(String(defaultRows));
  const [pendingCols, setPendingCols] = useState<string>(String(defaultCols));
  const [selectedType, setSelectedType] = useState<SeatTypeKey>("normal");
  const [layout, setLayout] = useState<LayoutGrid>(() =>
    makeEmptyLayout(defaultRows, defaultCols)
  );

  const [loading, setLoadingRoom] = useState(false);
  const [vipBonus, setVipBonus] = useState<number | "">(0);
  const [coupleBonus, setCoupleBonus] = useState<number | "">(0);

  const [isDragging, setIsDragging] = useState(false);
  const dragNotifiedRef = useRef(false);

  useEffect(() => {
    const stopDrag = () => {
      setIsDragging(false);
      dragNotifiedRef.current = false;
    };
    window.addEventListener("mouseup", stopDrag);
    return () => window.removeEventListener("mouseup", stopDrag);
  }, []);

  useEffect(() => {
    if (
      !open ||
      !room?.id ||
      room.id.toString().startsWith("temp") ||
      String(room.id).length < 5
    ) {
      if (!room?.id) {
        setVipBonus(0);
        setCoupleBonus(0);
      }
      return;
    }

    (async () => {
      try {
        setLoadingRoom(true);
        const res = await roomService.getRoomById(room.id);
        setVipBonus(Number(res?.VIP ?? 0));
        setCoupleBonus(Number(res?.COUPLE ?? 0));
      } catch (e) {
        console.error("Không tải được thông tin phòng", e);
      } finally {
        setLoadingRoom(false);
      }
    })();
  }, [open, room?.id]);

  useEffect(() => {
    if (!open) return;

    if (!seatLayout || (Array.isArray(seatLayout) && seatLayout.length === 0)) {
      setLayout(makeEmptyLayout(defaultRows, defaultCols));
      setCols(defaultCols);
      setPendingRows(String(defaultRows));
      setPendingCols(String(defaultCols));
      return;
    }

    if (isGrid(seatLayout)) {
      const grid = normalizeGrid(seatLayout);
      const rr = grid.length;
      const cc = grid.reduce((m, r) => Math.max(m, r.length), 0);
      setLayout(grid);
      setCols(cc);
      setPendingRows(String(rr));
      setPendingCols(String(cc));
    } else {
      const { rows: rr, cols: cc, grid } = buildGridFromSeatList(seatLayout);
      setLayout(grid);
      setCols(cc);
      setPendingRows(String(rr));
      setPendingCols(String(cc));
    }
  }, [seatLayout, open]);

  const bound = (val: string, max = LIMIT_MAX) => {
    const n = parseInt(val || "0", 10);
    const clamped = Math.min(Math.max(n || 1, 1), max);
    return { n: n || 1, clamped, adjusted: clamped !== (n || 1) };
  };

  const cleanupDoublePairs = (grid: LayoutGrid) => {
    const R = grid.length;
    const C = R ? grid[0].length : 0;
    const toNormalize: Array<{ r: number; c: number }> = [];

    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        const cell = grid[r][c];
        if (cell.type !== "couple") {
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

        if (leftOk === rightOk) {
          toNormalize.push({ r, c });
          if (leftOk) toNormalize.push({ r, c: c - 1 });
          if (rightOk) toNormalize.push({ r, c: c + 1 });
        }
      }
    }
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
      notify?.(`Kích thước đã chỉnh về ${rB.clamped}×${cB.clamped}.`);
    }

    const r = rB.clamped;
    const c = cB.clamped;
    setCols(c);
    setPendingRows(String(r));
    setPendingCols(String(c));

    setLayout((prev) => {
      const next: LayoutGrid = Array.from({ length: r }, (_, i) =>
        Array.from({ length: c }, (_, j) =>
          prev[i]?.[j] ? { ...prev[i][j] } : { type: "normal" }
        )
      );
      cleanupDoublePairs(next);
      return next;
    });
  };

  const unpairIfNeeded = (grid: LayoutGrid, rIdx: number, cIdx: number) => {
    const cell = grid[rIdx][cIdx];
    const pid = cell.pairId;
    if (!pid) return;

    if (cIdx > 0) {
      const left = grid[rIdx]?.[cIdx - 1];
      if (left && left.pairId === pid) {
        left.pairId = undefined;
        if (left.type === "couple") left.type = "normal";
      }
    }

    if (cIdx < grid[rIdx].length - 1) {
      const right = grid[rIdx]?.[cIdx + 1];
      if (right && right.pairId === pid) {
        right.pairId = undefined;
        if (right.type === "couple") right.type = "normal";
      }
    }

    cell.pairId = undefined;
    if (cell.type === "couple") cell.type = "normal";
  };

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

    if (canUse(rIdx, cIdx - 1)) {
      const pid = `R${rIdx + 1}C${cIdx - 1}-${cIdx}`;
      grid[rIdx][cIdx - 1].pairId = pid;
      grid[rIdx][cIdx - 1].type = "couple";
      cell.pairId = pid;
      cell.type = "couple";
      return true;
    }
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

      if (selectedType === "empty") {
        if (cell.type === "couple" && cell.pairId) {
          unpairIfNeeded(next, rIdx, cIdx);
          next[rIdx][cIdx].type = "empty";
          return next;
        }
        if (cell.pairId) unpairIfNeeded(next, rIdx, cIdx);
        cell.type = cell.type === "empty" ? "normal" : "empty";
        return next;
      }

      if (selectedType === "vip") {
        if (cell.pairId) unpairIfNeeded(next, rIdx, cIdx);
        cell.type = cell.type === "vip" ? "normal" : "vip";
        return next;
      }

      if (selectedType === "couple") {
        if (cell.type === "couple" && cell.pairId) {
          unpairIfNeeded(next, rIdx, cIdx);
          return next;
        }
        if (!tryPaircouple(next, rIdx, cIdx)) {
          if (!dragNotifiedRef.current) {
            toast("Cần 2 ghế Thường liền kề để tạo ghế Đôi");
            dragNotifiedRef.current = true;
          }
        }
        return next;
      }

      if (cell.pairId) unpairIfNeeded(next, rIdx, cIdx);
      cell.type = "normal";
      return next;
    });
  };

  const onSeatMouseDown = (r: number, c: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragNotifiedRef.current = false;
    setIsDragging(true);
    applySeat(r, c);
  };

  const onSeatMouseEnter = (r: number, c: number) => {
    if (isDragging) applySeat(r, c);
  };

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
          row: toLetters(r + 1),
          col: c + 1,
          type: toExternalType(grid[r][c].type),
        });
      }
    }
    return out;
  };

  const handleSave = async () => {
    const seatList = gridToSeatList(layout);

    if (onCustomSave) {
      onCustomSave(seatList);
      toast.success("Đã lưu cấu hình ghế (Local)");
      return;
    }
  };

  const countRealSeats = () => {
    let count = 0;
    layout.forEach((row) => {
      row.forEach((cell) => {
        if (cell.type !== "empty") {
          count++;
        }
      });
    });
    return count;
  };

  return {
    cols,
    pendingRows,
    setPendingRows,
    pendingCols,
    setPendingCols,
    selectedType,
    setSelectedType,
    layout,
    setLayout,
    loading,
    vipBonus,
    coupleBonus,
    isDragging,
    setIsDragging,
    dragNotifiedRef,
    generateLayout,
    applySeat,
    handleSave,
    onSeatMouseDown,
    onSeatMouseEnter,
    countRealSeats,
  };
}
