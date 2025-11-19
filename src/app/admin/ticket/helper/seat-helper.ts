import { type SeatCell, SeatModal } from "@/services";

// --- Types ---
export type TicketType = "standard" | "vip" | "couple";

export const formatVND = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);

export const formatTime = (isoString: string) => {
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
};

// Helper parse "A1" -> {row: "A", col: 1}
export const parseSeatNumber = (seatNum: string) => {
  const match = seatNum.match(/([A-Z]+)(\d+)/);
  if (match) {
    return { row: match[1], col: parseInt(match[2], 10) };
  }
  return { row: "UNK", col: 0 };
};

// Gom nhóm Layout để vẽ
export const groupSeatsByRow = (layout: SeatCell[]) => {
  const groups: Record<string, SeatCell[]> = {};
  layout.forEach((seat) => {
    if (!groups[seat.row]) groups[seat.row] = [];
    groups[seat.row].push(seat);
  });
  Object.keys(groups).forEach((rowKey) => {
    groups[rowKey].sort((a, b) => a.col - b.col);
  });
  return Object.keys(groups)
    .sort()
    .reduce((obj, key) => {
      obj[key] = groups[key];
      return obj;
    }, {} as Record<string, SeatCell[]>);
};

export const getSeatStyle = (
  type: string,
  isSelected: boolean,
  isDisabled: boolean
) => {
  if (type === "EMPTY")
    return "invisible pointer-events-none border-0 w-8 h-8 m-1";

  let baseStyle =
    "flex items-center justify-center rounded text-[10px] font-bold transition-all border select-none";

  if (isDisabled) {
    baseStyle +=
      " cursor-not-allowed opacity-20 bg-gray-100 border-gray-200 text-gray-300 pointer-events-none";
  } else {
    baseStyle += " cursor-pointer hover:scale-110 shadow-sm";
  }

  let sizeStyle = "w-8 h-8 m-1";
  let colorStyle = "bg-white border-gray-300 text-gray-600";

  if (!isDisabled) {
    colorStyle = "hover:border-primary";
    if (type === "VIP")
      colorStyle =
        "border-orange-400 text-orange-600 bg-orange-50 hover:bg-orange-100";
    else if (type === "COUPLE") {
      sizeStyle = "w-[72px] h-8 m-1";
      colorStyle = "border-pink-400 text-pink-600 bg-pink-50 hover:bg-pink-100";
    }

    if (isSelected) {
      if (type === "COUPLE")
        colorStyle = "bg-pink-500 border-pink-500 text-white shadow-md";
      else if (type === "VIP")
        colorStyle = "bg-orange-500 border-orange-500 text-white shadow-md";
      else colorStyle = "bg-primary border-primary text-white shadow-md";
    }
  } else {
    if (type === "COUPLE") sizeStyle = "w-[72px] h-8 m-1";
  }

  return `${baseStyle} ${sizeStyle} ${colorStyle}`;
};

// Đếm số lượng ghế dựa trên ID đã chọn (So khớp với danh sách SeatModel)
export const calculateSeatCounts = (
  selectedSeatIds: string[],
  allSeats: SeatModal[]
) => {
  let countStandard = 0,
    countVip = 0,
    countCouple = 0;

  selectedSeatIds.forEach((id) => {
    const seat = allSeats.find((s) => s.id === id);
    if (seat) {
      if (seat.seatType === "NORMAL") countStandard++;
      else if (seat.seatType === "VIP") countVip++;
      else if (seat.seatType === "COUPLE") countCouple++;
    }
  });

  return {
    standard: countStandard,
    vip: countVip,
    couple: countCouple / 2, // 1 vé Couple = 2 ghế
  };
};
