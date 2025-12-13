"use client";

import React from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { vi } from "date-fns/locale/vi";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";

registerLocale("vi", vi);

interface DateTimePickerVNProps {
  valueISO?: string; // "YYYY-MM-DDTHH:mm"
  onChange?: (val: string) => void;
  className?: string;
  placeholder?: string;
}

export function DateTimePickerVN({
  valueISO,
  onChange,
  className = "",
  placeholder = "dd/mm/yyyy --:-- AM",
}: DateTimePickerVNProps) {
  const selectedDate = React.useMemo(() => {
    if (!valueISO) return null;
    const date = parseISO(valueISO);
    return isValid(date) ? date : null;
  }, [valueISO]);

  return (
    <div className={`relative ${className}`}>
      <DatePicker
        selected={selectedDate}
        onChange={(date: Date | null) => {
          if (!date) {
            onChange?.("");
            return;
          }
          // Lưu ý: Dù hiển thị AM/PM nhưng value trả về cho code xử lý
          // vẫn nên là format chuẩn ISO 24h để dễ lưu vào DB/State
          const utcString = date.toISOString();

          onChange?.(utcString);
        }}
        locale="vi"
        // --- CẤU HÌNH MỚI: AM/PM & NHẬP GIỜ LẺ ---
        showTimeInput // Thay vì showTimeSelect (list), dùng showTimeInput (nhập tay)
        dateFormat="dd/MM/yyyy h:mm aa" // Format hiển thị: 01/12/2025 2:30 PM
        timeInputLabel="Thời gian:" // Label cho ô nhập giờ
        // --- UX ---
        placeholderText={placeholder}
        shouldCloseOnSelect={false} // Giữ popup mở để user nhập xong giờ
        isClearable={false}
        // --- Custom Input Interface ---
        customInput={
          <div className="relative w-full cursor-pointer group">
            <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-gray-400 bg-white hover:border-black transition-colors">
              <span className={selectedDate ? "text-black" : "text-gray-500"}>
                {selectedDate
                  ? format(selectedDate, "dd/MM/yyyy h:mm aa") // Hiển thị AM/PM ở input
                  : placeholder}
              </span>
              <CalendarIcon className="w-4 h-4 text-gray-500" />
            </div>
          </div>
        }
        popperPlacement="bottom-start"
        popperClassName="z-[50]"
      />
    </div>
  );
}
