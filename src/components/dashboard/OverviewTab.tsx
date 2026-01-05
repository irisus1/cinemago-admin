import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
    ComposedChart,
    Bar,
} from "recharts";
import {
    DollarSign,
    Utensils,
    PieChart as PieChartIcon,
    Users,
    Building2,
    BarChart3,
    CalendarDays,
} from "lucide-react";
import MetricCard from "./MetricCard";
import CustomTooltip from "./ChartTooltip";
import {
    fmtVND,
    fmtNumber,
    truncateText,
    PIE_COLORS,
    ChartItem,
} from "./utils";
import { DailyRevenueGlobal } from "@/services";
import { useAuth } from "@/context/AuthContext";

interface OverviewTabProps {
    revenue: { total: number; fnb: number; ticket: number };
    counts: { users: number; cinemas: number; movies: number };
    dailyRevenue: DailyRevenueGlobal[];
    byMovie: ChartItem[];
    byCinema: ChartItem[];
    loading: boolean;
    rangeType: string;
    startDate: string;
    endDate: string;
    setSelectedItem: (item: ChartItem | null) => void;
}

export default function OverviewTab({
    revenue,
    counts,
    dailyRevenue,
    byMovie,
    byCinema,
    loading,
    rangeType,
    startDate,
    endDate,
    setSelectedItem,
}: OverviewTabProps) {
    const { user } = useAuth();

    return (
        <div className="space-y-4">
            {/* KPI Cards Global */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                <MetricCard
                    title="Tổng doanh thu"
                    value={fmtVND(revenue.total)}
                    icon={<DollarSign className="h-5 w-5" />}
                    loading={loading}
                />
                <MetricCard
                    title="Doanh thu F&B"
                    value={fmtVND(revenue.fnb)}
                    icon={<Utensils className="h-5 w-5" />}
                    loading={loading}
                />
                <MetricCard
                    title="Doanh thu vé"
                    value={fmtVND(revenue.ticket)}
                    icon={<PieChartIcon className="h-5 w-5" />}
                    loading={loading}
                />
                <MetricCard
                    title="Số người dùng"
                    value={fmtNumber(counts.users)}
                    icon={<Users className="h-5 w-5" />}
                    loading={loading}
                />
                <MetricCard
                    title="Phim / Rạp"
                    value={`${fmtNumber(counts.movies)} / ${fmtNumber(counts.cinemas)}`}
                    icon={<Building2 className="h-5 w-5" />}
                    loading={loading}
                />
            </div>

            {/* Row 0: Daily Revenue Trend (Global) */}
            <Card className="h-[400px]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        <CardTitle>
                            {["last6months", "year"].includes(rangeType)
                                ? "Biểu đồ doanh thu theo tháng"
                                : "Biểu đồ doanh thu theo ngày"}
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="h-[320px] pt-0">
                    {loading ? (
                        <div className="h-full w-full animate-pulse rounded-xl bg-muted/40" />
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={dailyRevenue}
                                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorTotalOverview" x1="0" y1="0" x2="0" y2="1">
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
                                    stroke="#4f46e5"
                                    fillOpacity={1}
                                    fill="url(#colorTotalOverview)"
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
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* Structure Chart */}
                <Card className="h-[380px] xl:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <PieChartIcon className="h-5 w-5" />
                            <CardTitle>Cơ cấu doanh thu</CardTitle>
                        </div>
                        <Badge variant="secondary" className="gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />{" "}
                            {startDate.split("-").reverse().join("-")} →{" "}
                            {endDate.split("-").reverse().join("-")}
                        </Badge>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {loading ? (
                            <div className="h-full w-full animate-pulse rounded-xl bg-muted/40" />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        dataKey="value"
                                        data={[
                                            { name: "Vé", value: revenue.ticket },
                                            { name: "Đồ ăn & thức uống", value: revenue.fnb },
                                        ]}
                                        innerRadius={60}
                                        outerRadius={100}
                                    >
                                        {["ticket", "fnb"].map((key, index) => (
                                            <Cell key={key} fill={PIE_COLORS[index]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number | string) => fmtVND(value)} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Cinema Revenue Comparison (Only for Admin view) */}
                {user?.role === "ADMIN" && (
                    <Card className="h-[380px] xl:col-span-2">
                        <CardHeader className="flex items-center justify-between flex-row pb-2">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5" />
                                <CardTitle>Doanh thu theo rạp chiếu</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="h-[300px] pt-0">
                            {loading ? (
                                <div className="h-full w-full animate-pulse rounded-xl bg-muted/40" />
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={byCinema} margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                                            interval={0}
                                            angle={-15}
                                            textAnchor="end"
                                            height={60}
                                        />
                                        <YAxis
                                            tickFormatter={(val) => new Intl.NumberFormat("en", { notation: "compact" }).format(val)}
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 12 }} />
                                        <Bar
                                            dataKey="ticketRevenue"
                                            name="Vé"
                                            stackId="a"
                                            fill="#2563eb"
                                            radius={[0, 0, 4, 4]}
                                            onClick={(data: any) => setSelectedItem(data)}
                                            cursor="pointer"
                                            maxBarSize={60}
                                        />
                                        <Bar
                                            dataKey="fnbRevenue"
                                            name="F&B"
                                            stackId="a"
                                            fill="#16a34a"
                                            radius={[4, 4, 0, 0]}
                                            onClick={(data: any) => setSelectedItem(data)}
                                            cursor="pointer"
                                            maxBarSize={60}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Top Movies Chart */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card className="h-[420px] xl:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            <CardTitle>Top phim theo doanh thu</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[340px]">
                        {loading ? (
                            <div className="h-full w-full animate-pulse rounded-xl bg-muted/40" />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={byMovie} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
                                    {/* Note: changed to ComposedChart/BarChart similar to original */}
                                    {/* Original was BarChart. Using BarChart is fine. */}
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={80} tickFormatter={(value) => truncateText(value)} tickLine={false} axisLine={false} tick={{ fontSize: 15, fill: "hsl(var(--muted-foreground))" }} />
                                    <YAxis tickFormatter={(val) => new Intl.NumberFormat("en", { notation: "compact" }).format(val)} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 12 }} />
                                    <Bar dataKey="ticketRevenue" name="Vé" stackId="a" fill="#2563eb" radius={[0, 0, 4, 4]} maxBarSize={60} onClick={(data: any) => setSelectedItem(data)} cursor="pointer" />
                                    <Bar dataKey="fnbRevenue" name="F&B" stackId="a" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={60} onClick={(data: any) => setSelectedItem(data)} cursor="pointer" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
