"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { roomService, type Room, RoomUpdate, SeatType } from "@/services";

/* ====================== Types ====================== */
export type SeatTypeKey = "normal" | "vip" | "couple" | "empty";
export type SeatCell = { type: SeatTypeKey; pairId?: string | null };
export type LayoutGrid = SeatCell[][];
export type SeatRecord = { row: string; col: number; type: SeatType };
// Cho phép input đầu vào là Grid hoặc mảng danh sách ghế
export type SeatLayoutProp = LayoutGrid | SeatRecord[] | undefined;

/* ====================== Constants ====================== */
export const LIMIT_MAX = 20; // Tăng lên xíu cho thoải mái
export const defaultRows = 10;
export const defaultCols = 10;

const TYPE_MAP: Record<SeatType, SeatTypeKey> = {
  NORMAL: "normal",
  VIP: "vip",
  COUPLE: "couple",
  EMPTY: "empty",
};

/* ====================== Helpers (Pure Functions) ====================== */
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

const isGrid = (v: any): v is LayoutGrid =>
  Array.isArray(v) && (v.length === 0 || Array.isArray(v[0]));

const buildGridFromSeatList = (list: SeatRecord[]) => {
  // [FIX] Thêm fallback xử lý mảng rỗng để tránh lỗi spread ...list.map
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
    // Kiểm tra an toàn biên
    if (rIdx >= 0 && rIdx < maxR && cIdx >= 0 && cIdx < maxC) {
      const t = TYPE_MAP[s.type] || "normal";
      grid[rIdx][cIdx] = { type: t };
    }
  }
  return { rows: maxR, cols: maxC, grid };
};

// UI Helpers
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

/* ====================== Hook Logic ====================== */
type UseSeatLayoutProps = {
  open: boolean;
  seatLayout?: SeatLayoutProp;
  room?: Room; // Có thể undefined khi tạo mới
  onChange?: (seatLayout: SeatRecord[]) => void; // Callback khi API thành công

  // [MỚI] Callback lưu local (không gọi API)
  onCustomSave?: (seatLayout: SeatRecord[]) => void;

  notify?: (msg: string) => void;
  onClose: () => void;
};

export function useSeatLayoutLogic({
  open,
  seatLayout,
  room,
  onChange,
  onCustomSave, // Lấy prop mới
  notify,
  onClose,
}: UseSeatLayoutProps) {
  // State
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

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const dragNotifiedRef = useRef(false);

  // --- Effects ---

  // Drag cleanup
  useEffect(() => {
    const stopDrag = () => {
      setIsDragging(false);
      dragNotifiedRef.current = false;
    };
    window.addEventListener("mouseup", stopDrag);
    return () => window.removeEventListener("mouseup", stopDrag);
  }, []);

  // Fetch Room Detail (Chỉ chạy khi có ID thật, không chạy khi tạo mới)
  useEffect(() => {
    // Nếu không có room ID hoặc là ID tạm (ví dụ: temp-123) thì không gọi API
    if (
      !open ||
      !room?.id ||
      room.id.toString().startsWith("temp") ||
      String(room.id).length < 5
    ) {
      // Nếu tạo mới, có thể reset bonus về 0
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

  // Hydrate Layout from Props (Quan trọng: Xử lý cả Grid và List)
  useEffect(() => {
    if (!open) return; // Chỉ reset khi mở modal

    if (!seatLayout) {
      // Nếu không có layout đầu vào => Reset về mặc định
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
      // Input là mảng SeatRecord[]
      const { rows: rr, cols: cc, grid } = buildGridFromSeatList(seatLayout);
      setLayout(grid);
      setCols(cc);
      setPendingRows(String(rr));
      setPendingCols(String(cc));
    }
  }, [seatLayout, open]);

  // --- Logic Methods ---
  const bound = (val: string, max = LIMIT_MAX) => {
    const n = parseInt(val || "0", 10);
    const clamped = Math.min(Math.max(n || 1, 1), max);
    return { n: n || 1, clamped, adjusted: clamped !== (n || 1) };
  };

  // ... (Giữ nguyên hàm cleanupDoublePairs, generateLayout, unpairIfNeeded, tryPaircouple, applySeat)
  // ... (Phần logic xử lý ma trận ghế này bạn giữ nguyên từ code cũ vì nó chuẩn rồi)

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

  // --- SAVE ---
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

    // [QUAN TRỌNG] Logic mới: Nếu có onCustomSave (Local Save) -> Gọi luôn và thoát
    if (onCustomSave) {
      onCustomSave(seatList);
      toast.success("Đã lưu cấu hình ghế (Local)");
      return; // Dừng tại đây, không gọi API
    }

    // --- Logic Cũ (Edit Room có ID) ---
    const payload: RoomUpdate = {
      name: room?.name,
      cinemaId: room?.cinemaId,
      vipPrice: vipBonus === "" ? 0 : vipBonus,
      couplePrice: coupleBonus === "" ? 0 : coupleBonus,
      seatLayout: seatList,
    };

    try {
      if (!room?.id) throw new Error("Room ID is missing");
      await roomService.updateRoom(room?.id, payload);
      toast.success("Cập nhật layout ghế thành công");
      onChange?.(seatList);
    } catch (e) {
      console.log(e);
      toast.error("Cập nhật phòng thất bại");
    }
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
  };
}
