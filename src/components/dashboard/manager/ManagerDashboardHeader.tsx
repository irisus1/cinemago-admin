import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Download, RefreshCw } from "lucide-react";
import { DateNativeVN } from "@/components/DateNativeVN";
import { DATE_RANGE_OPTIONS, calculateDateRange } from "../utils";

interface ManagerDashboardHeaderProps {
    rangeType: string;
    setRangeType: (val: string) => void;
    startDate: string;
    setStartDate: (val: string) => void;
    endDate: string;
    setEndDate: (val: string) => void;
    loading: boolean;
    onRefresh: () => void;
    onExport: () => void;
    cinemaName?: string;
    type: string;
    setType: (val: string) => void;
}

export function ManagerDashboardHeader({
    rangeType,
    setRangeType,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    loading,
    onRefresh,
    onExport,
    cinemaName,
    type,
    setType,
}: ManagerDashboardHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
                    Tổng quan: {cinemaName || "Rạp của bạn"}
                </h1>
                <p className="text-gray-500 mt-1">
                    Theo dõi hiệu suất và doanh thu theo thời gian thực
                </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">
                        Khoảng thời gian
                    </label>
                    <Select
                        value={rangeType}
                        onValueChange={(val) => {
                            setRangeType(val);
                            if (val !== "custom") {
                                const { start, end } = calculateDateRange(val);
                                setStartDate(start);
                                setEndDate(end);
                            }
                        }}
                    >
                        <SelectTrigger className="w-[160px] h-9 bg-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {DATE_RANGE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">
                        Loại vé
                    </label>
                    <Select value={type} onValueChange={setType}>
                        <SelectTrigger className="w-[130px] h-9 bg-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="online">Đặt qua website</SelectItem>
                            <SelectItem value="offline">Đặt tại quầy</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">
                        Từ ngày
                    </label>
                    <DateNativeVN
                        valueISO={startDate}
                        onChangeISO={(val) => {
                            setStartDate(val);
                            setRangeType("custom");
                        }}
                        className="h-9"
                        maxDate={new Date()}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">
                        Đến ngày
                    </label>
                    <DateNativeVN
                        valueISO={endDate}
                        onChangeISO={(val) => {
                            setEndDate(val);
                            setRangeType("custom");
                        }}
                        className="h-9"
                        maxDate={new Date()}
                    />
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={onExport}
                        size="sm"
                        variant="outline"
                        className="h-9 gap-2 border-dashed"
                    >
                        <Download className="h-4 w-4" />
                        Xuất báo cáo
                    </Button>
                    <Button
                        onClick={onRefresh}
                        size="icon"
                        variant="outline"
                        className="rounded-lg shadow-sm hover:bg-gray-50 h-9 w-9"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </div>
        </div>
    );
}
