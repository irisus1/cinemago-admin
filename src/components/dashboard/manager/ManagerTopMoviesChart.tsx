import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import {
    ResponsiveContainer,
    BarChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    Bar
} from "recharts";
import { ChartItem, fmtVND, fmtPercent, truncateText } from "../utils"; // Check imports

interface ManagerTopMoviesChartProps {
    data: ChartItem[];
    loading: boolean;
}

export function ManagerTopMoviesChart({ data, loading }: ManagerTopMoviesChartProps) {
    return (
        <Card className="shadow-sm border-0 ring-1 ring-gray-200">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="w-5 h-5 text-emerald-500" />
                    Top 5 Phim Doanh Thu Cao
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
                {loading ? (
                    <div className="w-full h-full bg-muted/20 animate-pulse rounded-lg" />
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            layout="vertical"
                            margin={{ left: 40, right: 40 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                horizontal={false}
                                stroke="#E5E7EB"
                            />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={100}
                                tickFormatter={(val: string) => truncateText(val, 10)}
                                tick={{ fontSize: 12 }}
                            />
                            <Tooltip
                                cursor={{ fill: "transparent" }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload as ChartItem;
                                        return (
                                            <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-sm">
                                                <p className="font-bold mb-1">{data.name}</p>
                                                <p>
                                                    Tổng thu:{" "}
                                                    <span className="font-semibold text-emerald-600">
                                                        {fmtVND(data.revenue)}
                                                    </span>
                                                </p>
                                                <div className="text-xs space-y-1 mt-1 text-gray-600">
                                                    <p className="flex justify-between gap-4">
                                                        <span>Vé:</span>
                                                        <span>{fmtVND(data.ticketRevenue)}</span>
                                                    </p>
                                                    <p className="flex justify-between gap-4">
                                                        <span>F&B:</span>
                                                        <span>{fmtVND(data.fnbRevenue)}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Legend />
                            <Bar
                                dataKey="ticketRevenue"
                                name="Doanh thu Vé"
                                stackId="a"
                                fill="#22c55e"
                                radius={[0, 0, 0, 0]}
                                barSize={32}
                            />
                            <Bar
                                dataKey="fnbRevenue"
                                name="Doanh thu F&B"
                                stackId="a"
                                fill="#eab308"
                                radius={[0, 4, 4, 0]}
                                barSize={32}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
