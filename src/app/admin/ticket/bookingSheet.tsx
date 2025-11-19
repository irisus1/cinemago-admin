"use client";

import React, { useRef, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { type Movie } from "@/services";
import { formatVND } from "./helper/seat-helper";

// Import Hook Logic
import { useBookingLogic } from "./helper/useBookingSheet";

// Import Component con
import SeatSelectionStep from "./SeatSelection";
import ShowtimeList from "./helper/showtimelist";
import FoodSelector from "./helper/foodSelector";

interface BookingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  movie: Movie | null;
  cinemaId: string;
  date: string;
}

export default function BookingSheet({
  isOpen,
  onClose,
  movie,
  cinemaId,
  date,
}: BookingSheetProps) {
  const {
    loading,
    groupedData,
    selectedShowtime,
    quantities,
    selectedSeats,
    seatLayout,
    seatList,
    loadingLayout,
    foods,
    foodQuantities,
    handleSelectShowtime,
    updateQuantity,
    updateFoodQuantity,
    handleConfirmBooking,
    setSelectedShowtime,
    setSelectedSeats,
    totalQty,
    totalPrice,
    totalFoodPrice,
    isEnoughSeats,
    formattedSelectedSeats,
    formattedFoods,
  } = useBookingLogic({ isOpen, movie, cinemaId, date });

  const seatSelectionRef = useRef<HTMLDivElement>(null);

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

        <div className="px-6 pb-48">
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
                seatList={seatList}
                loadingLayout={loadingLayout}
                selectedSeats={selectedSeats}
                quantities={quantities}
                onQuantitiesChange={updateQuantity}
                onSeatsChange={setSelectedSeats}
                showtimeId={selectedShowtime.id}
                roomId={selectedShowtime.roomId}
              />

              <FoodSelector
                foods={foods}
                quantities={foodQuantities}
                onUpdateQuantity={updateFoodQuantity}
              />
            </div>
          )}
        </div>

        {selectedShowtime && (
          <div className="fixed bottom-0 right-0 w-full sm:max-w-[90vw] border-t bg-white shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.1)] p-4 px-6 z-50">
            <div className="flex justify-between items-end mb-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[60px]">
                    Ghế:
                  </span>
                  <span
                    className="font-bold text-lg text-gray-800 max-w-[200px] truncate"
                    title={formattedSelectedSeats}
                  >
                    {formattedSelectedSeats}
                  </span>
                </div>

                {formattedFoods && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[60px] mt-0.5">
                      Bắp nước:
                    </span>
                    <span
                      className="text-sm font-medium text-gray-700 line-clamp-2 max-w-[300px]"
                      title={formattedFoods}
                    >
                      {formattedFoods}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-right min-w-[120px]">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">
                  Tổng cộng:
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
