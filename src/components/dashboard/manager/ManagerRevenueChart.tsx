import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import {
    ResponsiveContainer,
    AreaChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    Area
} from "recharts";
import { fmtVND } from "../utils";
import { DailyRevenueGlobal } from "@/services";

interface ManagerRevenueChartProps {
    data: DailyRevenueGlobal[];
    loading: boolean;
}

export function ManagerRevenueChart({ data, loading }: ManagerRevenueChartProps) {
    return (
        <Card className="shadow-sm border-0 ring-1 ring-gray-200">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="w-5 h-5 text-indigo-500" />
                    Biểu đồ doanh thu
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
                {loading ? (
                    <div className="w-full h-full bg-muted/20 animate-pulse rounded-lg" />
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#6B7280", fontSize: 12 }}
                                tickFormatter={(val) => {
                                    if (!val) return "";
                                    const parts = val.split("-");
                                    // YYYY-MM -> MM-YYYY
                                    if (parts.length === 2) return `${parts[1]}-${parts[0]}`;
                                    // YYYY-MM-DD -> DD-MM
                                    if (parts.length === 3) return `${parts[2]}-${parts[1]}`;
                                    return val;
                                }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#6B7280", fontSize: 12 }}
                                tickFormatter={(val) =>
                                    new Intl.NumberFormat("en-US", { notation: "compact" }).format(val)
                                }
                            />
                            <Tooltip
                                formatter={(value: number) => fmtVND(value)}
                                labelFormatter={(label) => {
                                    if (!label) return "";
                                    const parts = label.split("-");
                                    if (parts.length === 3) return `Ngày: ${parts[2]}-${parts[1]}-${parts[0]}`;
                                    if (parts.length === 2) return `Tháng: ${parts[1]}-${parts[0]}`;
                                    return `Thời gian: ${label}`;
                                }}
                            />
                            <Legend />
                            <Area
                                type="monotone"
                                dataKey="totalRevenue"
                                stroke="#4f46e5"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                                name="Tổng"
                            />
                            <Area
                                type="monotone"
                                dataKey="totalTicketRevenue"
                                stroke="#22c55e"
                                strokeWidth={2}
                                fillOpacity={0}
                                fill="url(#colorRevenue)"
                                name="Vé"
                            />
                            <Area
                                type="monotone"
                                dataKey="totalFoodDrinkRevenue"
                                stroke="#eab308"
                                strokeWidth={2}
                                fillOpacity={0}
                                fill="url(#colorRevenue)"
                                name="F&B"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
