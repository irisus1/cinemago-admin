import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Clock } from "lucide-react";
import {
    ResponsiveContainer,
    AreaChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Area,
    ReferenceLine
} from "recharts";

import { PeakHourItem } from "@/services";

interface ManagerPeakHoursChartProps {
    peakHours: PeakHourItem[];
    maxPeak: number;
    peakSummary: { totalTickets: number; totalBookings: number };
    loading: boolean;
    selectedMonth: string;
    setSelectedMonth: (val: string) => void;
    selectedYear: string;
    setSelectedYear: (val: string) => void;
    currentYear: number;
}

export function ManagerPeakHoursChart({
    peakHours,
    maxPeak,
    peakSummary,
    loading,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    currentYear,
}: ManagerPeakHoursChartProps) {
    return (
        <Card className="shadow-sm border-0 ring-1 ring-gray-200">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Clock className="w-5 h-5 text-indigo-500" />
                            Khung giờ cao điểm
                        </CardTitle>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                            <span>Tổng vé: <b className="text-gray-900">{peakSummary.totalTickets}</b></span>
                            <span>•</span>
                            <span>Tổng đơn: <b className="text-gray-900">{peakSummary.totalBookings}</b></span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-[100px] h-8 text-xs">
                                <SelectValue placeholder="Tháng" />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                    <SelectItem key={m} value={m.toString()}>Tháng {m}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="w-[80px] h-8 text-xs">
                                <SelectValue placeholder="Năm" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={(currentYear - 1).toString()}>{currentYear - 1}</SelectItem>
                                <SelectItem value={currentYear.toString()}>{currentYear}</SelectItem>
                                <SelectItem value={(currentYear + 1).toString()}>{currentYear + 1}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="h-[320px]">
                {loading ? (
                    <div className="w-full h-full bg-muted/20 animate-pulse rounded-lg" />
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={peakHours}>
                            <defs>
                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="#E5E7EB"
                            />
                            <XAxis
                                dataKey="formattedHour"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#6B7280", fontSize: 12 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#6B7280", fontSize: 12 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: "8px",
                                    border: "none",
                                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="ticketCount"
                                stroke="#6366f1"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorCount)"
                                name="Vé bán ra"
                            />
                            {maxPeak > 0 && (
                                <ReferenceLine
                                    y={maxPeak}
                                    stroke="#EF4444"
                                    strokeDasharray="3 3"
                                    label={{
                                        position: "top",
                                        value: "Cao nhất",
                                        fill: "#EF4444",
                                        fontSize: 12,
                                    }}
                                />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
