// import React from 'react'
import { Calendar, X } from "lucide-react";
import DatePicker, { registerLocale } from "react-datepicker";
import { vi } from "date-fns/locale";

const pad = (n: number) => String(n).padStart(2, "0");
const isoToVN = (iso?: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${pad(+d)}/${pad(+m)}/${y}`;
};

export function DateNativeVN({
  valueISO,
  onChangeISO,
  placeholder = "dd/mm/yyyy",
  className = "",
  widthClass = "w-[140px]",
  showClearButton = false,
  minISO,
  minDate,
}: {
  valueISO?: string; // "YYYY-MM-DD"
  onChangeISO?: (iso: string) => void; // trả về ISO
  placeholder?: string;
  className?: string;
  widthClass?: string; // cho phép chỉnh width
  showClearButton?: boolean;
  minISO?: string; // "YYYY-MM-DD"
  minDate?: Date;
}) {
  // const hiddenRef = React.useRef<HTMLInputElement>(null)

  const effectiveMinDate = minDate || (minISO ? new Date(minISO) : undefined);

  // const openPicker = () => {
  //   const el = hiddenRef.current
  //   if (!el) return
  //   // Chrome/Edge hỗ trợ showPicker()
  //   // Safari/Firefox: focus vào input để hiện picker (nếu có)
  //   if (typeof (el as any).showPicker === 'function') {
  //     ;(el as any).showPicker()
  //   } else {
  //     el.focus() // fallback
  //     // Firefox/Safari vẫn mở panel date theo native UI (tuỳ trình duyệt/OS)
  //   }
  // }

  const selectedDate = valueISO ? new Date(valueISO) : null;

  vi.localize.day = (n) => {
    const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    return days[n];
  };

  vi.localize.month = (n) => {
    const months = [
      "Tháng 1 - ",
      "Tháng 2 - ",
      "Tháng 3 - ",
      "Tháng 4 - ",
      "Tháng 5 - ",
      "Tháng 6 - ",
      "Tháng 7 - ",
      "Tháng 8 - ",
      "Tháng 9 - ",
      "Tháng 10 - ",
      "Tháng 11 - ",
      "Tháng 12 - ",
    ];
    return months[n];
  };

  registerLocale("vi", vi);

  return (
    <div className={`relative ${widthClass} ${className}`}>
      <DatePicker
        selected={selectedDate}
        onChange={(date) => {
          if (!date) return;
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, "0");
          const d = String(date.getDate()).padStart(2, "0");
          const iso = `${y}-${m}-${d}`;
          onChangeISO?.(iso);
        }}
        locale="vi"
        dateFormat="dd/MM/yyyy"
        todayButton="Hôm nay"
        minDate={effectiveMinDate}
        showPopperArrow={false}
        customInput={
          <div className="relative">
            <button
              type="button"
              className={`px-3 py-2 pl-9 w-full border border-gray-300 rounded-lg bg-white text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#56b0d2] focus:border-transparent`}
            >
              <span className={valueISO ? "text-gray-900" : "text-gray-400"}>
                {isoToVN(valueISO) || placeholder}
              </span>
              <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </button>
            {showClearButton && valueISO && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation(); // không mở lại popup
                  onChangeISO?.(""); // reset ngày
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                title="Xóa ngày đã chọn"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        }
        wrapperClassName="w-full"
        popperPlacement="bottom-start"
        popperContainer={({ children }) => (
          <div className="z-[9999] fixed   top-0 left-0">{children}</div>
        )}
      />
    </div>
  );
}
