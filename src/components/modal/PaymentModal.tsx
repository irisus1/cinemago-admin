"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatVND } from "../ticket/seat-helper";
import { Loader2 } from "lucide-react";

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalPrice: number;
  onConfirm: (method: "MOMO" | "VNPAY" | "ZALOPAY") => void;
  isProcessing: boolean;
}

export default function PaymentMethodModal({
  isOpen,
  onClose,
  totalPrice,
  onConfirm,
  isProcessing,
}: PaymentMethodModalProps) {
  const methods = [
    {
      id: "MOMO",
      name: "Ví MoMo",
      color: "bg-pink-600 hover:bg-pink-700",
      icon: "M",
    },
    {
      id: "VNPAY",
      name: "VNPay QR",
      color: "bg-blue-600 hover:bg-blue-700",
      icon: "V",
    },
    {
      id: "ZALOPAY",
      name: "ZaloPay",
      color: "bg-green-600 hover:bg-green-700",
      icon: "Z",
    },
  ] as const;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !isProcessing && !open && onClose()}
    >
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">
            Thanh toán
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="text-center mb-6">
            <p className="text-gray-500 text-sm">Tổng số tiền cần thanh toán</p>
            <p className="text-3xl font-bold text-primary">
              {formatVND(totalPrice)}
            </p>
          </div>

          <div className="grid gap-3">
            {methods.map((m) => (
              <Button
                key={m.id}
                className={`w-full h-12 text-lg justify-start px-4 ${m.color} text-white transition-colors`}
                onClick={() => onConfirm(m.id)}
                disabled={isProcessing}
              >
                <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mr-3 font-bold">
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    m.icon
                  )}
                </span>
                Thanh toán qua {m.name}
              </Button>
            ))}
          </div>
        </div>

        {isProcessing && (
          <div className="text-center text-sm text-gray-500 pb-2">
            Đang khởi tạo giao dịch, vui lòng chờ...
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
