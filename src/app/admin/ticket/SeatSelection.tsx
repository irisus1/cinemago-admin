"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { type SeatCell, SeatModal } from "@/services";
import {
  formatVND,
  type TicketType,
  calculateSeatCounts,
} from "./helper/seat-helper";
import SeatMap from "./helper/seat-map";

interface SeatSelectionStepProps {
  roomName: string;
  basePrice: number;
  vipSurcharge: number;
  coupleSurcharge: number;
  onBack: () => void;
  seatLayout: SeatCell[];
  seatList: SeatModal[];
  loadingLayout: boolean;
  selectedSeats: string[];
  quantities: Record<TicketType, number>;
  onQuantitiesChange: (type: TicketType, delta: number) => void;
  onSeatsChange: (seats: string[]) => void;
  showtimeId: string | number;
  roomId: string | number;
}

export default function SeatSelectionStep({
  roomName,
  basePrice,
  vipSurcharge,
  coupleSurcharge,
  onBack,
  seatLayout,
  seatList,
  loadingLayout,
  selectedSeats,
  quantities,
  onQuantitiesChange,
  onSeatsChange,
}: SeatSelectionStepProps) {
  const prices = {
    standard: basePrice,
    vip: basePrice + vipSurcharge,
    couple: basePrice + coupleSurcharge,
  };

  const currentCounts = useMemo(
    () => calculateSeatCounts(selectedSeats, seatList),
    [selectedSeats, seatList]
  );

  const checkSeatDisabled = (seatType: string, isSelected: boolean) => {
    if (isSelected) return false;
    if (seatType === "NORMAL")
      return (
        quantities.standard === 0 ||
        currentCounts.standard >= quantities.standard
      );
    if (seatType === "VIP")
      return quantities.vip === 0 || currentCounts.vip >= quantities.vip;
    if (seatType === "COUPLE")
      return (
        quantities.couple === 0 || currentCounts.couple >= quantities.couple
      );
    return false;
  };

  const handleSeatClick = (seat: SeatModal, nextSeat: SeatModal | null) => {
    const idsToToggle = [seat.id];
    if (seat.seatType === "COUPLE" && nextSeat) {
      idsToToggle.push(nextSeat.id);
    }

    let newSelected = [...selectedSeats];
    const isSelected = newSelected.includes(seat.id);

    if (isSelected) {
      newSelected = newSelected.filter((id) => !idsToToggle.includes(id));
    } else {
      newSelected = [...newSelected, ...idsToToggle];
    }
    onSeatsChange(newSelected);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="px-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h3 className="font-bold text-lg">Chọn vé & Ghế</h3>
          <p className="text-sm text-gray-500">{roomName}</p>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h4 className="font-bold mb-2 text-gray-700">1. Số lượng vé</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TicketCounter
            label="Vé Thường"
            type="standard"
            price={prices.standard}
            qty={quantities.standard}
            onUpdate={onQuantitiesChange}
            basePrice={basePrice}
          />
          <TicketCounter
            label="Vé VIP"
            type="vip"
            price={prices.vip}
            qty={quantities.vip}
            onUpdate={onQuantitiesChange}
            basePrice={basePrice}
          />
          <TicketCounter
            label="Vé Đôi"
            type="couple"
            price={prices.couple}
            qty={quantities.couple}
            onUpdate={onQuantitiesChange}
            basePrice={basePrice}
          />
        </div>
      </div>

      <div className="flex-1 min-h-[300px]">
        <h4 className="font-bold mb-3 text-gray-700">2. Sơ đồ ghế</h4>
        <SeatMap
          seatLayout={seatLayout}
          seatList={seatList}
          selectedSeats={selectedSeats}
          loading={loadingLayout}
          isSeatDisabled={checkSeatDisabled}
          onSeatClick={handleSeatClick}
        />
      </div>
    </div>
  );
}

const TicketCounter = ({
  label,
  type,
  price,
  qty,
  onUpdate,
  basePrice,
}: {
  label: string;
  type: TicketType;
  price: number;
  qty: number;
  basePrice: number;
  onUpdate: (t: TicketType, d: number) => void;
}) => (
  <div className="flex flex-col items-center justify-between p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
    <div className="text-center mb-3">
      <div className="font-bold text-gray-800">{label}</div>
      <div className="text-primary font-bold text-lg">{formatVND(price)}</div>
      {type !== "standard" && price > basePrice && (
        <div className="text-[12px] text-gray-400 mt-1">
          (phụ thu + {formatVND(price - basePrice)})
        </div>
      )}
    </div>
    <div className="flex items-center gap-3 w-full justify-center">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={() => onUpdate(type, -1)}
        disabled={qty <= 0}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className="w-6 text-center font-bold text-xl">{qty}</span>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={() => onUpdate(type, 1)}
        disabled={qty >= 5}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  </div>
);
