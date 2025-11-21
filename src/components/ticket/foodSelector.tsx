"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { type FoodDrink } from "@/services";
import { formatVND } from "./seat-helper";
import Image from "next/image";

interface FoodSelectorProps {
  foods: FoodDrink[];
  quantities: Record<string | number, number>;
  onUpdateQuantity: (id: string | number, delta: number) => void;
}

export default function FoodSelector({
  foods,
  quantities,
  onUpdateQuantity,
}: FoodSelectorProps) {
  return (
    <div className="mt-8 border-t pt-6">
      <h4 className="font-bold mb-4 text-gray-700 flex items-center gap-2">
        <span>🍿</span> Chọn Bắp & Nước
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {foods.map((item) => {
          const qty = quantities[item.id] || 0;

          return (
            <div
              key={item.id}
              className={`
                flex border rounded-lg overflow-hidden bg-white transition-all
                ${
                  qty > 0
                    ? "border-primary ring-1 ring-primary shadow-md"
                    : "border-gray-200 shadow-sm"
                }
              `}
            >
              <div className="w-24 h-full bg-gray-100 flex-shrink-0">
                <Image
                  src={item.image}
                  alt={item.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 p-3 flex flex-col justify-between">
                <div>
                  <div
                    className="font-bold text-sm text-gray-800 line-clamp-1"
                    title={item.name}
                  >
                    {item.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2 h-8">
                    {item.description}
                  </div>
                </div>

                <div className="flex items-end justify-between mt-2">
                  <div className="font-bold text-primary text-sm">
                    {formatVND(item.price)}
                  </div>

                  <div className="flex items-center gap-2">
                    {qty > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => onUpdateQuantity(item.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                    )}

                    {qty > 0 && (
                      <span className="text-sm font-bold min-w-[16px] text-center">
                        {qty}
                      </span>
                    )}

                    <Button
                      type="button"
                      variant={qty > 0 ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => onUpdateQuantity(item.id, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
