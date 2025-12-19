import React from "react";
import { Button } from "@/components/ui/button";
import { Clock, Ticket, Maximize2 } from "lucide-react";

interface FloatingIndicatorProps {
    count: number;
    movieName?: string;
    formattedTime: string;
    onReopen: () => void;
}

export function FloatingIndicator({
    count,
    movieName,
    formattedTime,
    onReopen,
}: FloatingIndicatorProps) {
    return (
        <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-white border rounded-lg shadow-xl p-3 flex flex-col gap-2 min-w-[220px]">
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2 text-primary font-bold">
                        <Ticket className="w-4 h-4" />
                        <span className="text-sm">Đang giữ vé</span>
                    </div>
                    <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-xs font-mono font-bold">
                        <Clock className="w-3 h-3" />
                        {formattedTime}
                    </div>
                </div>

                {/* Info */}
                <div className="flex flex-col gap-1">
                    <h4 className="text-xs font-medium text-gray-500 line-clamp-1">{movieName}</h4>
                    <div className="text-sm font-semibold">
                        Đang chọn: <span className="text-primary">{count}</span> ghế
                    </div>
                </div>

                {/* Action */}
                <Button size="sm" onClick={onReopen} className="w-full mt-1 gap-2">
                    <Maximize2 className="w-3 h-3" />
                    Mở lại
                </Button>
            </div>
        </div>
    );
}
