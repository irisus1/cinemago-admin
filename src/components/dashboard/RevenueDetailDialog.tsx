import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    ResponsiveContainer,
    ComposedChart,
    Area,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    Line,
} from "recharts";
import { fmtVND, ChartItem } from "./utils";

interface RevenueDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedItem: ChartItem | null;
}

export default function RevenueDetailDialog({
    open,
    onOpenChange,
    selectedItem,
}: RevenueDetailDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] md:max-w-5xl lg:max-w-6xl">
                <DialogHeader>
                    <DialogTitle>Chi tiết doanh thu: {selectedItem?.name}</DialogTitle>
                </DialogHeader>
                <div className="h-[60vh] min-h-[400px] w-full mt-4">
                    {selectedItem?.dailyBreakdown &&
                        selectedItem.dailyBreakdown.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                                data={selectedItem.dailyBreakdown}
                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient
                                        id="colorTotalPopup"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => {
                                        if (!val) return "";
                                        const parts = val.split("-");
                                        if (parts.length === 2) {
                                            const [y, m] = parts;
                                            return `T${m}/${y}`;
                                        }
                                        if (parts.length === 3) {
                                            const [y, m, d] = parts;
                                            return `${d}/${m}`;
                                        }
                                        return val;
                                    }}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                                />
                                <YAxis
                                    yAxisId="left"
                                    tickFormatter={(val) =>
                                        new Intl.NumberFormat("en", { notation: "compact" }).format(
                                            val
                                        )
                                    }
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    unit="%"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12, fill: "#f97316" }}
                                />
                                <Tooltip
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-white p-3 border border-gray-200 rounded shadow-lg text-sm">
                                                    <p className="font-semibold mb-1 border-b pb-1">
                                                        {(() => {
                                                            if (typeof label === "string") {
                                                                const parts = label.split("-");
                                                                if (parts.length === 2) {
                                                                    const [y, m] = parts;
                                                                    return `Tháng ${m}/${y}`;
                                                                }
                                                                if (parts.length === 3) {
                                                                    const [y, m, d] = parts;
                                                                    return `${d}-${m}-${y}`;
                                                                }
                                                            }
                                                            return label;
                                                        })()}
                                                    </p>
                                                    {payload.map((entry: any, index: number) => (
                                                        <p key={index} style={{ color: entry.color }}>
                                                            {entry.name}:{" "}
                                                            {entry.dataKey === "occupancyRate"
                                                                ? `${entry.value}%`
                                                                : fmtVND(entry.value)}
                                                        </p>
                                                    ))}
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Legend verticalAlign="top" height={36} />
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="totalRevenue"
                                    name="Tổng doanh thu"
                                    stroke="#4f46e5"
                                    fillOpacity={1}
                                    fill="url(#colorTotalPopup)"
                                />
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="ticketRevenue"
                                    name="Doanh thu vé"
                                    stroke="#22c55e"
                                    fill="none"
                                    strokeWidth={2}
                                />
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="foodDrinkRevenue"
                                    name="F&B"
                                    stroke="#eab308"
                                    fill="none"
                                    strokeWidth={2}
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="occupancyRate"
                                    name="Lấp đầy"
                                    stroke="#f97316"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            Không có dữ liệu chi tiết theo ngày.
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
