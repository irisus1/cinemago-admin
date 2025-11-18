import { type SeatCell } from "@/services";

// --- Types ---
export type TicketType = "standard" | "vip" | "couple";

// --- Helpers ---

export const formatVND = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);

export const formatTime = (isoString: string) => {
  const d = new Date(isoString);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(
    d.getUTCMinutes()
  ).padStart(2, "0")}`;
};

// Hàm gom nhóm ghế theo hàng (A, B, C...)
export const groupSeatsByRow = (layout: SeatCell[]) => {
  const groups: Record<string, SeatCell[]> = {};

  layout.forEach((seat) => {
    if (!groups[seat.row]) {
      groups[seat.row] = [];
    }
    groups[seat.row].push(seat);
  });

  // Sắp xếp các ghế trong hàng theo cột tăng dần
  Object.keys(groups).forEach((rowKey) => {
    groups[rowKey].sort((a, b) => a.col - b.col);
  });

  // Sắp xếp hàng theo thứ tự A, B, C...
  return Object.keys(groups)
    .sort()
    .reduce((obj, key) => {
      obj[key] = groups[key];
      return obj;
    }, {} as Record<string, SeatCell[]>);
};

// Hàm tính toán class CSS cho ghế
export const getSeatStyle = (
  seat: SeatCell,
  isSelected: boolean,
  isDisabled: boolean
) => {
  // Ghế trống (lối đi)
  if (seat.type === "EMPTY") {
    return "invisible pointer-events-none border-0 w-8 h-8 m-1";
  }

  let baseStyle =
    "flex items-center justify-center rounded text-[10px] font-bold transition-all border select-none";

  // Logic Disabled / Cursor
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

    // Màu theo loại ghế
    if (seat.type === "VIP") {
      colorStyle =
        "border-orange-400 text-orange-600 bg-orange-50 hover:bg-orange-100";
    } else if (seat.type === "COUPLE") {
      sizeStyle = "w-[72px] h-8 m-1"; // Kích thước ghế đôi
      colorStyle = "border-pink-400 text-pink-600 bg-pink-50 hover:bg-pink-100";
    }

    // Màu khi được chọn
    if (isSelected) {
      if (seat.type === "COUPLE") {
        colorStyle = "bg-pink-500 border-pink-500 text-white shadow-md";
      } else if (seat.type === "VIP") {
        colorStyle = "bg-orange-500 border-orange-500 text-white shadow-md";
      } else {
        colorStyle = "bg-primary border-primary text-white shadow-md";
      }
    }
  } else {
    // Giữ kích thước cho ghế đôi dù bị disable để không vỡ layout
    if (seat.type === "COUPLE") sizeStyle = "w-[72px] h-8 m-1";
  }

  return `${baseStyle} ${sizeStyle} ${colorStyle}`;
};

export const calculateSeatCounts = (
  selectedSeats: string[],
  seatLayout: SeatCell[]
) => {
  let countStandard = 0,
    countVip = 0,
    countCouple = 0;

  selectedSeats.forEach((seatId) => {
    const [r, c] = seatId.split("-");
    const seatData = seatLayout.find(
      (s) => s.row === r && s.col === parseInt(c)
    );
    if (seatData) {
      if (seatData.type === "NORMAL") countStandard++;
      else if (seatData.type === "VIP") countVip++;
      else if (seatData.type === "COUPLE") countCouple++;
    }
  });

  return {
    standard: countStandard,
    vip: countVip,
    couple: countCouple / 2,
  };
};
