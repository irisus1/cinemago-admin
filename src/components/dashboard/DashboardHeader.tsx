import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Download } from "lucide-react";
import { DATE_RANGE_OPTIONS, calculateDateRange } from "./utils";

interface DashboardHeaderProps {
  rangeType: string;
  setRangeType: (val: string) => void;
  setStartDate: (val: string) => void;
  setEndDate: (val: string) => void;
  type: string;
  setType: (val: string) => void;
  onRefresh: () => void;
  onExport: () => void;
}

export default function DashboardHeader({
  rangeType,
  setRangeType,
  setStartDate,
  setEndDate,
  type,
  setType,
  onRefresh,
  onExport,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Bảng điều khiển quản trị rạp phim
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          {/* Date Range Select */}
          <Select
            value={rangeType}
            onValueChange={(val) => {
              setRangeType(val);
              const { start, end } = calculateDateRange(val);
              setStartDate(start);
              setEndDate(end);
            }}
          >
            <SelectTrigger className="w-[180px] bg-white border">
              <SelectValue placeholder="Chọn thời gian" />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[150px] border bg-white">
              <SelectValue placeholder="Loại đơn" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="online">Đặt qua web</SelectItem>
              <SelectItem value="offline">Đặt tại quầy</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={onRefresh} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Làm mới
        </Button>
        <Button variant="outline" onClick={onExport} className="gap-2">
          <Download className="h-4 w-4" />
          Xuất Excel
        </Button>
      </div>
    </div>
  );
}
