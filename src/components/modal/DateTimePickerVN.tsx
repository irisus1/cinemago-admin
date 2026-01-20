"use client";

import React from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { vi } from "date-fns/locale/vi";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";

registerLocale("vi", vi);

interface DateTimePickerVNProps {
  valueISO?: string;
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
          const utcString = date.toISOString();

          onChange?.(utcString);
        }}
        locale="vi"
        showTimeInput
        dateFormat="dd/MM/yyyy h:mm aa"
        timeInputLabel="Thời gian:"
        placeholderText={placeholder}
        shouldCloseOnSelect={false}
        isClearable={false}
        customInput={
          <div className="relative w-full cursor-pointer group">
            <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-gray-400 bg-white hover:border-black transition-colors">
              <span className={selectedDate ? "text-black" : "text-gray-500"}>
                {selectedDate
                  ? format(selectedDate, "dd/MM/yyyy h:mm aa")
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
