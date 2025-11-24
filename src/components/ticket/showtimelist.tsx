"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { formatTime } from "./seat-helper";

export interface ShowtimeItem {
  id: string;
  startTime: string;
  price: number;
  vipPrice?: number;
  couplePrice?: number;
  isPast?: boolean;
}

export interface GroupedByRoom {
  roomId: string;
  roomName: string;
  formats: {
    [formatName: string]: ShowtimeItem[];
  };
}

interface ShowtimeListProps {
  groupedData: GroupedByRoom[];
  loading: boolean;
  selectedShowtimeId?: string;
  onSelect: (
    id: string,
    roomName: string,
    roomId: string,
    price: number,
    vipPrice: number,
    couplePrice: number
  ) => void;
}

const formatToVNTime = (isoString: string) => {
  if (!isoString) return "--:--";
  try {
    // 1. Nếu chuỗi chưa có múi giờ (không có Z hoặc +), ta ép nó thành UTC bằng cách thêm Z
    let safeIso = isoString;
    if (!safeIso.endsWith("Z") && !safeIso.includes("+")) {
      safeIso += "Z";
    }

    const date = new Date(safeIso);

    // 2. Kiểm tra nếu ngày không hợp lệ
    if (isNaN(date.getTime())) return "--:--";

    // 3. Format sang múi giờ HCM
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(date);
  } catch (e) {
    return "--:--";
  }
};

export default function ShowtimeList({
  groupedData,
  loading,
  selectedShowtimeId,
  onSelect,
}: ShowtimeListProps) {
  if (loading)
    return (
      <div className="text-center py-10 text-gray-500">
        Đang tải suất chiếu...
      </div>
    );
  if (groupedData.length === 0)
    return (
      <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-md">
        Không có suất chiếu nào.
      </div>
    );

  return (
    <div className="space-y-8">
      {groupedData.map((room) => (
        <div key={room.roomId} className="border-b pb-6 last:border-0">
          <h4 className="font-bold text-xl mb-4 flex items-center gap-2 text-gray-800 pl-4 border-l-4 border-primary">
            {room.roomName}
          </h4>
          <div className="space-y-4 pl-4">
            {Object.entries(room.formats).map(([format, times]) => (
              <div key={format}>
                <h5 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                  {format}
                </h5>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {times.map((st) => {
                    const isActive =
                      String(selectedShowtimeId) === String(st.id);
                    console.log(st.startTime);

                    return (
                      <Button
                        key={st.id}
                        // disabled={st.isPast}
                        variant={isActive ? "default" : "outline"}
                        className={`h-10 transition-all ${
                          isActive
                            ? "ring-2 ring-offset-2 ring-primary scale-105 font-bold"
                            : "hover:bg-primary/10"
                        }`}
                        onClick={() =>
                          // !st.isPast &&
                          onSelect(
                            st.id,
                            room.roomName,
                            room.roomId,
                            st.price,
                            st.vipPrice || 0,
                            st.couplePrice || 0
                          )
                        }
                      >
                        {formatToVNTime(st.startTime)}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
