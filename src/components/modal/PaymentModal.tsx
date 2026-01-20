"use client";

import React from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatVND } from "../ticket/seat-helper";
import { Loader2, Check, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalPrice: number;
  onConfirm: (method: "MOMO" | "VNPAY" | "ZALOPAY" | "COD") => void;
  isProcessing: boolean;
  isPaymentStarted: boolean;
}

const PAYMENT_METHODS = [
  {
    id: "COD",
    name: "Thanh toán tại quầy",
    description: "Thanh toán tiền mặt và in vé trực tiếp",
    icon: <Banknote className="w-6 h-6 text-green-600" />,
    bgColor: "bg-green-500/10",
    textColor: "text-green-600",
    borderColor: "border-green-600",
    hoverBorder: "hover:border-green-600/50",
  },
  {
    id: "MOMO",
    name: "Ví MoMo",
    description: "Thanh toán qua ứng dụng MoMo",
    logo: "/images/payment/momo.webp",
    bgColor: "bg-[#A50064]/10",
    textColor: "text-[#A50064]",
    borderColor: "border-[#A50064]",
    hoverBorder: "hover:border-[#A50064]/50",
  },
  {
    id: "VNPAY",
    name: "VNPay QR",
    description: "Quét mã QR qua ứng dụng ngân hàng",
    logo: "/images/payment/vnpay.webp",
    bgColor: "bg-[#005BAA]/10",
    textColor: "text-[#005BAA]",
    borderColor: "border-[#005BAA]",
    hoverBorder: "hover:border-[#005BAA]/50",
  },
  {
    id: "ZALOPAY",
    name: "ZaloPay",
    description: "Thanh toán qua ví ZaloPay",
    logo: "/images/payment/zalopay.webp",
    bgColor: "bg-[#00BE00]/10",
    textColor: "text-[#00BE00]",
    borderColor: "border-[#00BE00]",
    hoverBorder: "hover:border-[#00BE00]/50",
  },
] as const;

export default function PaymentMethodModal({
  isOpen,
  onClose,
  totalPrice,
  onConfirm,
  isProcessing,
  isPaymentStarted,
}: PaymentMethodModalProps) {
  const [selectedMethod, setSelectedMethod] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    if (isOpen) {
      setSelectedMethod(null);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (selectedMethod) {
      onConfirm(selectedMethod as "MOMO" | "VNPAY" | "ZALOPAY" | "COD");
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !isProcessing && !open && onClose()}
    >
      <DialogContent className="sm:max-w-[500px] bg-white p-0 overflow-hidden gap-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-center text-2xl font-bold text-gray-800">
            Thanh toán
          </DialogTitle>
          <DialogDescription className="text-center text-gray-500">
            Vui lòng chọn phương thức thanh toán
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-2">
          <div className="bg-gray-50 rounded-xl p-5 text-center mb-6 border border-gray-100">
            <p className="text-gray-500 text-sm font-medium mb-1">
              Tổng số tiền cần thanh toán
            </p>
            <p className="text-4xl font-extrabold text-primary tracking-tight">
              {formatVND(totalPrice)}
            </p>
          </div>

          <div className="grid gap-4 mb-6">
            {PAYMENT_METHODS.map((m) => {
              const isSelected = selectedMethod === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => !isProcessing && setSelectedMethod(m.id)}
                  className={cn(
                    "group relative flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                    "bg-white hover:shadow-md",
                    m.hoverBorder,
                    isSelected
                      ? `${m.borderColor} ${m.bgColor} shadow-sm`
                      : "border-gray-200",
                  )}
                >
                  <div className="relative w-12 h-12 flex-shrink-0 mr-4 p-1 bg-white rounded-lg border border-gray-100 flex items-center justify-center">
                    {"icon" in m ? (
                      m.icon
                    ) : (
                      <Image
                        src={m.logo}
                        alt={m.name}
                        width={36}
                        height={36}
                        className="object-contain"
                      />
                    )}
                  </div>

                  <div className="flex-1">
                    <h3
                      className={cn(
                        "font-bold text-lg transition-colors",
                        isSelected
                          ? m.textColor
                          : "text-gray-800 group-hover:text-gray-900",
                      )}
                    >
                      {m.name}
                    </h3>
                    <p className="text-sm text-gray-500">{m.description}</p>
                  </div>

                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center ml-2 transition-all duration-200",
                      isSelected
                        ? `${m.textColor.replace(
                            "text",
                            "bg",
                          )} text-white scale-100 opacity-100`
                        : "bg-gray-100 text-transparent scale-90 opacity-0",
                    )}
                  >
                    <Check className="w-4 h-4" strokeWidth={3} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100">
          {isProcessing ? (
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-gray-700 font-medium">
                Đang khởi tạo giao dịch...
              </p>
              {isPaymentStarted && (
                <p className="mt-2 text-sm text-gray-500 max-w-xs mx-auto">
                  Cổng thanh toán đã được mở trong tab mới. Vui lòng hoàn tất
                  thanh toán ở đó.
                </p>
              )}
            </div>
          ) : (
            <Button
              className="w-full h-14 text-lg font-bold rounded-xl shadow-lg shadow-primary/20"
              onClick={handleConfirm}
              disabled={!selectedMethod || isProcessing}
            >
              Thanh toán ngay
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
