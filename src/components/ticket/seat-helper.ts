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

// --- HÀM STYLE ĐÃ ĐƯỢC SỬA ---
export const getSeatStyle = (
  type: string,
  isSelected: boolean,
  isDisabled: boolean,
  isHeld: boolean
) => {
  // 1. Xử lý ghế trống (không hiển thị)
  if (type === "EMPTY")
    return "invisible pointer-events-none border-0 w-8 h-8 m-1";

  // 2. Base layout (Flex center, font, border...)
  let className =
    "flex items-center justify-center rounded text-[10px] font-bold transition-all border select-none ";

  // 3. QUAN TRỌNG: Xác định KÍCH THƯỚC trước (bất kể trạng thái là gì)
  if (type === "COUPLE") {
    className += "w-[72px] h-8 m-1 "; // Kích thước ghế đôi
  } else {
    className += "w-8 h-8 m-1 "; // Kích thước ghế đơn (Normal/VIP)
  }

  // 4. Xác định MÀU SẮC & CON TRỎ dựa trên mức độ ưu tiên
  // Ưu tiên: Held > Disabled > Selected > Available

  // Trạng thái: Bị giữ (Held / Booked) - Màu xám đậm
  if (isHeld) {
    return (
      className +
      "bg-gray-400 border-gray-500 text-white cursor-not-allowed pointer-events-none opacity-70"
    );
  }

  // Trạng thái: Disabled (Do chưa chọn vé / Hết quota) - Màu xám nhạt
  if (isDisabled) {
    return (
      className +
      "bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed pointer-events-none opacity-50"
    );
  }

  // Trạng thái: Đang chọn (Selected) - Màu theo loại ghế
  if (isSelected) {
    className += "shadow-md cursor-pointer ";
    if (type === "COUPLE")
      return className + "bg-pink-500 border-pink-500 text-white";
    if (type === "VIP")
      return className + "bg-orange-500 border-orange-500 text-white";
    return className + "bg-primary border-primary text-white"; // Normal
  }

  // Trạng thái: Mặc định (Available) - Màu trắng viền màu
  className += "bg-white cursor-pointer hover:scale-110 shadow-sm ";

  if (type === "COUPLE")
    return className + "border-pink-400 text-pink-600 hover:bg-pink-50";
  if (type === "VIP")
    return className + "border-orange-400 text-orange-600 hover:bg-orange-100";

  // Normal
  return (
    className +
    "border-gray-300 text-gray-600 hover:border-primary hover:text-primary"
  );
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
