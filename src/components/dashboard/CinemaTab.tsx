import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    BarChart,
    Bar,
} from "recharts";
import {
    DollarSign,
    Utensils,
    PieChart as PieChartIcon,
    Building2,
} from "lucide-react";
import MetricCard from "./MetricCard";
import CustomTooltip from "./ChartTooltip";
import {
    fmtVND,
    truncateText,
    ChartItem,
} from "./utils";
import { Cinema, DailyRevenueGlobal } from "@/services";

interface CinemaTabProps {
    cinemas: Cinema[];
    selectedCinemaId: string;
    setSelectedCinemaId: (id: string) => void;
    revenue: { total: number; fnb: number; ticket: number };
    dailyRevenue: DailyRevenueGlobal[];
    byMovie: ChartItem[];
    loading: boolean;
    setSelectedItem: (item: ChartItem | null) => void;
}

export default function CinemaTab({
    cinemas,
    selectedCinemaId,
    setSelectedCinemaId,
    revenue,
    dailyRevenue,
    byMovie,
    loading,
    setSelectedItem,
}: CinemaTabProps) {
    return (
        <div className="space-y-4">
            {/* Cinema Selector */}
            <div className="flex items-center gap-2 bg-white p-3 rounded-lg border shadow-sm">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium text-sm">Chọn rạp chiếu:</span>
                <Select value={selectedCinemaId} onValueChange={setSelectedCinemaId}>
                    <SelectTrigger className="w-[300px]">
                        <SelectValue placeholder="Chọn rạp để xem báo cáo" />
                    </SelectTrigger>
                    <SelectContent>
                        {cinemas.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                                {c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* KPI Cards (Cinema Specific) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                    title="Tổng doanh thu"
                    value={fmtVND(revenue.total)}
                    icon={<DollarSign className="h-5 w-5" />}
                    loading={loading}
                />
                <MetricCard
                    title="Doanh thu vé"
                    value={fmtVND(revenue.ticket)}
                    icon={<PieChartIcon className="h-5 w-5" />}
                    loading={loading}
                />
                <MetricCard
                    title="Doanh thu F&B"
                    value={fmtVND(revenue.fnb)}
                    icon={<Utensils className="h-5 w-5" />}
                    loading={loading}
                />
            </div>

            {/* Daily Trend (Cinema Specific) */}
            <Card className="h-[400px]">
                <CardHeader>
                    <CardTitle>Biểu đồ doanh thu theo thời gian</CardTitle>
                </CardHeader>
                <CardContent className="h-[320px] pt-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={dailyRevenue}
                            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorTotalCinema" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
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
                                tickFormatter={(val) =>
                                    new Intl.NumberFormat("en", { notation: "compact" }).format(
                                        val
                                    )
                                }
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                            />
                            <Tooltip
                                formatter={(value: number) => fmtVND(value)}
                                labelFormatter={(label) => {
                                    const parts = label.split("-");
                                    if (parts.length === 2) {
                                        const [y, m] = parts;
                                        return `Tháng ${m}/${y}`;
                                    }
                                    if (parts.length === 3) {
                                        const [y, m, d] = parts;
                                        return `${d}-${m}-${y}`;
                                    }
                                    return label;
                                }}
                            />
                            <Legend verticalAlign="top" height={36} />
                            <Area
                                type="monotone"
                                dataKey="totalRevenue"
                                name="Tổng doanh thu"
                                stroke="#2563eb"
                                fillOpacity={1}
                                fill="url(#colorTotalCinema)"
                            />
                            <Area
                                type="monotone"
                                dataKey="totalTicketRevenue"
                                name="Doanh thu vé"
                                stroke="#22c55e"
                                fill="none"
                                strokeWidth={2}
                            />
                            <Area
                                type="monotone"
                                dataKey="totalFoodDrinkRevenue"
                                name="F&B"
                                stroke="#eab308"
                                fill="none"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Top Movies (Cinema Specific) */}
            <Card className="h-[420px]">
                <CardHeader>
                    <CardTitle>Top phim tại rạp</CardTitle>
                </CardHeader>
                <CardContent className="h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={byMovie}
                            margin={{ top: 12, right: 12, left: 4, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="name"
                                interval={0}
                                angle={-20}
                                textAnchor="end"
                                height={80}
                                tickFormatter={(value) => truncateText(value)}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 15, fill: "hsl(var(--muted-foreground))" }}
                            />
                            <YAxis
                                tickFormatter={(val) =>
                                    new Intl.NumberFormat("en", { notation: "compact" }).format(
                                        val
                                    )
                                }
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 12 }} />
                            {/* Updated to show stacked or just separate bars. Previous was just 'revenue' in Cinema View.
                   But to be consistent with improvements, let's use Ticket + F&B stack if data available.
                   The 'byMovie' data has 'ticketRevenue' and 'fnbRevenue'.
                   The previous code in CinemaTab for chart was:
                   <Bar dataKey="revenue" name="Doanh thu" ... />
                   But 'byMovie' in page.tsx IS mapped with ticket/fnb.
                   Let's upgrade it to Stacked like Overview.
               */}
                            <Bar dataKey="ticketRevenue" name="Vé" stackId="a" fill="#2563eb" radius={[0, 0, 4, 4]} maxBarSize={60} onClick={(data: any) => setSelectedItem(data)} cursor="pointer" />
                            <Bar dataKey="fnbRevenue" name="F&B" stackId="a" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={60} onClick={(data: any) => setSelectedItem(data)} cursor="pointer" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
