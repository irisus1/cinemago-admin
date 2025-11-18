"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  showTimeService,
  roomService,
  type Movie,
  type SeatCell,
  Room,
  ShowTime,
} from "@/services";
import {
  formatVND,
  type TicketType,
  calculateSeatCounts,
} from "./helper/seat-helper";

import SeatSelectionStep from "./SeatSelection";
import ShowtimeList, { type GroupedByRoom } from "./helper/showtimelist";

interface BookingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  movie: Movie | null;
  cinemaId: string;
  date: string;
}

export interface SelectedShowtimeInfo {
  id: string;
  roomName: string;
  roomId: string;
  basePrice: number;
  vipSurcharge: number;
  coupleSurcharge: number;
}

export default function BookingSheet({
  isOpen,
  onClose,
  movie,
  cinemaId,
  date,
}: BookingSheetProps) {
  const [loading, setLoading] = useState(false);
  const [groupedData, setGroupedData] = useState<GroupedByRoom[]>([]);
  const [selectedShowtime, setSelectedShowtime] =
    useState<SelectedShowtimeInfo | null>(null);
  const seatSelectionRef = useRef<HTMLDivElement>(null);

  const [quantities, setQuantities] = useState<Record<TicketType, number>>({
    standard: 0,
    vip: 0,
    couple: 0,
  });
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [seatLayout, setSeatLayout] = useState<SeatCell[]>([]);
  const [loadingLayout, setLoadingLayout] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedShowtime(null);
      setQuantities({ standard: 0, vip: 0, couple: 0 });
      setSelectedSeats([]);
      setSeatLayout([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !movie || !cinemaId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const resSt = await showTimeService.getShowTimes({
          startTime: `${date}T00:00:00`,
          endTime: `${date}T23:59:59`,
          cinemaId,
          movieId: movie.id,
        });
        const rawShowtimes = resSt?.data || [];
        if (rawShowtimes.length === 0) {
          setGroupedData([]);
          return;
        }

        const uniqueRoomIds = Array.from(
          new Set(rawShowtimes.map((s: ShowTime) => s.roomId))
        ).filter((id) => id);
        const roomRes = await Promise.all(
          uniqueRoomIds.map((id) => roomService.getRoomById(id))
        );
        const roomInfoMap: Record<string, Room> = {};
        roomRes.forEach((r: Room, index) => {
          if (r) roomInfoMap[String(uniqueRoomIds[index])] = r;
        });

        const groups: Record<string, GroupedByRoom> = {};
        rawShowtimes.forEach((item: ShowTime) => {
          const rId = String(item.roomId);
          const fmt = item.format || "2D";
          const rInfo = roomInfoMap[rId] || {
            name: `Phòng ${rId}`,
            VIP: 0,
            COUPLE: 0,
          };
          if (!groups[rId])
            groups[rId] = { roomId: rId, roomName: rInfo.name, formats: {} };
          if (!groups[rId].formats[fmt]) groups[rId].formats[fmt] = [];
          groups[rId].formats[fmt].push({
            id: item.id,
            startTime: item.startTime,
            price: Number(item.price) || 0,
            vipPrice: Number(rInfo.VIP) || 0,
            couplePrice: Number(rInfo.COUPLE) || 0,
          });
        });

        const result = Object.values(groups).map((room) => {
          Object.keys(room.formats).forEach((fmtKey) => {
            room.formats[fmtKey].sort(
              (a, b) =>
                new Date(a.startTime).getTime() -
                new Date(b.startTime).getTime()
            );
          });
          return room;
        });
        setGroupedData(result);
      } catch (error) {
        console.error(error);
        setGroupedData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isOpen, movie, cinemaId, date]);

  const handleSelectShowtime = async (
    id: string,
    roomName: string,
    roomId: string,
    basePrice: number,
    vipSurcharge: number,
    coupleSurcharge: number
  ) => {
    setQuantities({ standard: 0, vip: 0, couple: 0 });
    setSelectedSeats([]);
    setSeatLayout([]);
    setSelectedShowtime({
      id,
      roomName,
      roomId,
      basePrice,
      vipSurcharge,
      coupleSurcharge,
    });
    setLoadingLayout(true);
    try {
      const res = await roomService.getRoomById(roomId);
      setSeatLayout(Array.isArray(res.seatLayout) ? res.seatLayout : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingLayout(false);
    }
  };

  useEffect(() => {
    if (selectedShowtime && seatSelectionRef.current) {
      setTimeout(() => {
        seatSelectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [selectedShowtime]);

  const updateQuantity = (type: TicketType, delta: number) => {
    setQuantities((prev) => {
      const newValue = prev[type] + delta;
      return newValue < 0 || newValue > 5
        ? prev
        : { ...prev, [type]: newValue };
    });
  };

  const { totalQty, totalPrice, isEnoughSeats, formattedSelectedSeats } =
    useMemo(() => {
      if (!selectedShowtime)
        return {
          totalQty: 0,
          totalPrice: 0,
          isEnoughSeats: false,
          formattedSelectedSeats: "",
        };
      const qty = quantities.standard + quantities.vip + quantities.couple;
      const price =
        quantities.standard * selectedShowtime.basePrice +
        quantities.vip *
          (selectedShowtime.basePrice + selectedShowtime.vipSurcharge) +
        quantities.couple *
          (selectedShowtime.basePrice + selectedShowtime.coupleSurcharge);
      const counts = calculateSeatCounts(selectedSeats, seatLayout);
      const enough =
        counts.standard === quantities.standard &&
        counts.vip === quantities.vip &&
        counts.couple === quantities.couple;
      const seatsStr =
        selectedSeats.length === 0
          ? "Chưa chọn"
          : [...selectedSeats]
              .sort((a, b) => {
                const [r1, c1] = a.split("-");
                const [r2, c2] = b.split("-");
                return r1 !== r2
                  ? r1.localeCompare(r2)
                  : Number(c1) - Number(c2);
              })
              .map((s) => s.replace("-", ""))
              .join(", ");
      return {
        totalQty: qty,
        totalPrice: price,
        isEnoughSeats: enough,
        formattedSelectedSeats: seatsStr,
      };
    }, [quantities, selectedSeats, selectedShowtime, seatLayout]);

  const handleConfirmBooking = () => {
    alert(
      `ĐÃ XÁC NHẬN ĐẶT VÉ!\n- Phim: ${movie?.title}\n- Suất: ${
        selectedShowtime?.roomName
      }\n- Ghế: ${formattedSelectedSeats}\n- Tổng tiền: ${formatVND(
        totalPrice
      )}`
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        className="w-full sm:max-w-[90vw] overflow-y-auto p-0"
        side="right"
      >
        <SheetHeader className="px-6 pt-6 mb-4">
          <SheetTitle className="text-2xl font-bold text-primary">
            {movie?.title}
          </SheetTitle>
          <SheetDescription>
            Thời lượng: {movie?.duration} phút •{" "}
            {date?.split("-").reverse().join("-")}
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 pb-32">
          <ShowtimeList
            groupedData={groupedData}
            loading={loading}
            selectedShowtimeId={selectedShowtime?.id}
            onSelect={handleSelectShowtime}
          />
          {selectedShowtime && (
            <div
              ref={seatSelectionRef}
              className="mt-8 pt-8 border-t-4 border-gray-100 animation-fade-in"
            >
              <SeatSelectionStep
                roomName={selectedShowtime.roomName}
                basePrice={selectedShowtime.basePrice}
                vipSurcharge={selectedShowtime.vipSurcharge}
                coupleSurcharge={selectedShowtime.coupleSurcharge}
                onBack={() => setSelectedShowtime(null)}
                seatLayout={seatLayout}
                loadingLayout={loadingLayout}
                selectedSeats={selectedSeats}
                quantities={quantities}
                onQuantitiesChange={updateQuantity}
                onSeatsChange={setSelectedSeats}
              />
            </div>
          )}
        </div>

        {selectedShowtime && (
          <div className="fixed bottom-0 right-0 w-full sm:max-w-[90vw] border-t bg-white shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.1)] p-4 px-6 z-50">
            <div className="flex justify-between items-end mb-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Ghế đã chọn:
                </span>
                <span
                  className="font-bold text-lg text-gray-800 max-w-[300px] truncate"
                  title={formattedSelectedSeats}
                >
                  {formattedSelectedSeats}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">
                  Tổng tiền:
                </span>
                <span className="font-bold text-2xl text-primary">
                  {formatVND(totalPrice)}
                </span>
              </div>
            </div>
            <Button
              className="w-full text-lg h-12"
              disabled={totalQty === 0 || !isEnoughSeats}
              onClick={handleConfirmBooking}
            >
              {totalQty === 0
                ? "Vui lòng chọn vé"
                : isEnoughSeats
                ? "Xác nhận đặt vé"
                : "Vui lòng chọn đủ ghế"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
