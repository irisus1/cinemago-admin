"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DollarSign,
    Users,
    Building2,
    RefreshCw,
    BarChart3,
    CalendarDays,
    Utensils,
    Ticket,
    Clock,
    Download,
} from "lucide-react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    AreaChart,
    Area,
    ReferenceLine,
} from "recharts";

import {
    dashboardService,
    cinemaService,
    type MovieRevenueItem,
    Cinema,
    dashboardService as ds, // Alias for easier usage if needed
} from "@/services";
import { DateNativeVN } from "@/components/DateNativeVN";
import ExportExcelModal from "@/components/modal/ExportExcelModal";

// --- Types ---
type ChartItem = { name: string; revenue: number; occupancy: number };
type PeakHourData = { hour: string; count: number };

const truncateText = (text: string, maxLength: number = 15) => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

// --- Helper Components ---
function MetricCard({
    title,
    value,
    icon,
    loading,
    subtext,
}: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    loading: boolean;
    subtext?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <Card className="h-[140px] shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                        {icon}
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="h-8 w-32 rounded bg-muted/40 animate-pulse" />
                    ) : (
                        <div className="flex flex-col gap-1">
                            <div className="text-2xl font-bold tracking-tight text-primary">
                                {value}
                            </div>
                            {subtext && (
                                <p className="text-xs text-muted-foreground">{subtext}</p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}

// --- Main Page ---
export default function ManagerDashboard() {
    const { user } = useAuth();

    const [cinemaName, setCinemaName] = useState<string>("Rạp của bạn");

    // Date Logic
    const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const startOfMonthISO = useMemo(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().slice(0, 10);
    }, []);

    const [startDate, setStartDate] = useState<string>(startOfMonthISO);
    const [endDate, setEndDate] = useState<string>(todayISO);

    // State Export
    const [showExportModal, setShowExportModal] = useState(false);

    // State
    const [loading, setLoading] = useState<boolean>(true);
    const [summary, setSummary] = useState({
        totalRevenue: 0,
        ticketRevenue: 0,
        fnbRevenue: 0,
        avgOccupancy: 0,
    });

    const [topMovies, setTopMovies] = useState<MovieRevenueItem[]>([]);
    const [peakHours, setPeakHours] = useState<PeakHourData[]>([]);
    const [maxPeak, setMaxPeak] = useState<number>(0);
    const [peakSummary, setPeakSummary] = useState({ totalTickets: 0, totalBookings: 0 });

    const [movieTableData, setMovieTableData] = useState<MovieRevenueItem[]>([]);

    // Helpers
    const fmtVND = (n: number | string) =>
        new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0,
        }).format(Number(n) || 0);

    const fmtPercent = (rate?: number) => `${(rate || 0).toFixed(1)}%`;

    // Fetch Cinema Name (Chạy 1 lần khi có cinemaId)
    useEffect(() => {
        const fetchCinemaInfo = async () => {
            if (user?.cinemaId) {
                try {
                    const res = await cinemaService.getCinemaById(user.cinemaId);

                    const name = res.name || "Rạp không xác định";

                    setCinemaName(name);
                } catch (error) {
                    console.error("Lỗi lấy tên rạp:", error);
                    setCinemaName("Lỗi tải tên rạp");
                }
            }
        };

        fetchCinemaInfo();
    }, [user?.cinemaId]);

    // Peak Data State
    const currentYear = new Date().getFullYear();
    const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
    const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());

    // Fetch Data (Global Revenue)
    const refresh = useCallback(async () => {
        if (!user?.cinemaId) return;
        setLoading(true);

        try {
            const cinemaId = user.cinemaId;

            const [summaryRes, revMovieRes] = await Promise.all([
                dashboardService.getRevenueByPeriod({
                    startDate,
                    endDate,
                    cinemaId,
                }),
                dashboardService.getRevenueByPeriodAndMovie({
                    startDate,
                    endDate,
                    cinemaId,
                }),
            ]);

            setSummary({
                totalRevenue: summaryRes.totalRevenue,
                ticketRevenue: summaryRes.totalTicketRevenue,
                fnbRevenue: summaryRes.totalFoodDrinkRevenue,
                avgOccupancy: summaryRes.occupancyRate || 0,
            });

            // Process Top Movies
            setTopMovies(revMovieRes.sortedMovies.slice(0, 5)); // Top 5 for Chart
            setMovieTableData(revMovieRes.sortedMovies); // All for Table

        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setLoading(false);
        }
    }, [user, startDate, endDate]);

    // Fetch Peak Data (Decoupled)
    useEffect(() => {
        const fetchPeakData = async () => {
            if (!user?.cinemaId) return;
            try {
                const peakRes = await dashboardService.getPeakHoursInMonth({
                    month: Number(selectedMonth),
                    year: Number(selectedYear),
                    cinemaId: user.cinemaId
                });

                const phData = peakRes.allHours.map((h) => ({
                    hour: `${h.hour}h`,
                    count: h.ticketCount,
                }));
                setPeakHours(phData);
                setMaxPeak(peakRes.topPeakHour?.ticketCount || 0);
                setPeakSummary({
                    totalTickets: peakRes.summary?.totalTickets || 0,
                    totalBookings: peakRes.summary?.totalBookings || 0
                });
            } catch (error) {
                console.error("Failed to fetch peak data", error);
            }
        };
        fetchPeakData();
    }, [user?.cinemaId, selectedMonth, selectedYear]);

    useEffect(() => {
        if (user?.role === "MANAGER" && user.cinemaId) {
            void refresh();
        }
    }, [user, refresh]);

    if (!user || user.role !== "MANAGER") {
        return (
            <div className="p-10 text-center">
                Bạn không có quyền truy cập trang này.
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full p-4 md:p-8 space-y-8 bg-gray-50/50">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                        Dashboard Quản lý
                    </h1>
                    <div className="flex items-center gap-2 mt-2 text-gray-500">
                        <Building2 className="w-5 h-5 text-indigo-600" />
                        <span className="font-medium text-indigo-900 bg-indigo-50 px-3 py-1 rounded-full">
                            {cinemaName || "Rạp hiện tại"}
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                        <DateNativeVN
                            valueISO={startDate}
                            onChangeISO={setStartDate}
                            className="w-[130px] border-none shadow-none bg-transparent"
                        />
                        <span className="text-gray-400">→</span>
                        <DateNativeVN
                            valueISO={endDate}
                            onChangeISO={setEndDate}
                            className="w-[130px] border-none shadow-none bg-transparent"
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={() => setShowExportModal(true)}
                            size="sm"
                            variant="outline"
                            className="h-10 gap-2 border-dashed"
                        >
                            <Download className="h-4 w-4" />
                            Xuất báo cáo
                        </Button>
                        <Button
                            onClick={refresh}
                            size="icon"
                            variant="outline"
                            className="rounded-lg shadow-sm hover:bg-gray-50 h-10 w-10"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                </div>
            </div>

            <ExportExcelModal
                open={showExportModal}
                onClose={() => setShowExportModal(false)}
                initialStartDate={startDate}
                initialEndDate={endDate}
                fixedCinemaId={user?.cinemaId}
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <MetricCard
                    title="Tổng doanh thu"
                    value={fmtVND(summary.totalRevenue)}
                    icon={<DollarSign className="w-5 h-5 text-green-600" />}
                    loading={loading}
                />
                <MetricCard
                    title="Doanh thu Vé"
                    value={fmtVND(summary.ticketRevenue)}
                    icon={<Ticket className="w-5 h-5 text-blue-600" />}
                    loading={loading}
                />
                <MetricCard
                    title="Doanh thu F&B"
                    value={fmtVND(summary.fnbRevenue)}
                    icon={<Utensils className="w-5 h-5 text-orange-600" />}
                    loading={loading}
                />
                {/* <MetricCard
                    title="Tỷ lệ lấp đầy TB"
                    value={fmtPercent(summary.avgOccupancy)}
                    icon={<Users className="w-5 h-5 text-purple-600" />}
                    loading={loading}
                    subtext="Trên tổng số ghế rạp"
                /> */}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Peak Hours Chart */}
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
                                        dataKey="hour"
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
                                        dataKey="count"
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

                {/* Top Movies Chart */}
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
                                    data={topMovies}
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
                                        dataKey="movie.title"
                                        type="category"
                                        width={100}
                                        tickFormatter={(val) => truncateText(val, 10)}
                                        tick={{ fontSize: 12 }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: "transparent" }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload as MovieRevenueItem;
                                                return (
                                                    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-sm">
                                                        <p className="font-bold mb-1">{data.movie?.title}</p>
                                                        <p>
                                                            Doanh thu:{" "}
                                                            <span className="font-semibold text-emerald-600">
                                                                {fmtVND(data.totalRevenue)}
                                                            </span>
                                                        </p>
                                                        <p>
                                                            Lấp đầy:{" "}
                                                            <span className="font-semibold text-indigo-600">
                                                                {fmtPercent(data.occupancyRate)}
                                                            </span>
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            ({data.bookedSeats}/{data.totalSeats} ghế)
                                                        </p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar
                                        dataKey="totalRevenue"
                                        fill="#10B981"
                                        radius={[0, 4, 4, 0]}
                                        barSize={32}
                                        background={{ fill: "#F3F4F6" }}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Data Table */}
            <Card className="shadow-sm border-0 ring-1 ring-gray-200 overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b">
                    <CardTitle className="text-lg">Chi tiết hiệu suất phim</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                            <tr>
                                <th className="px-6 py-4">Phim</th>
                                <th className="px-6 py-4 text-right">Doanh thu Vé</th>
                                <th className="px-6 py-4 text-right">F&B</th>
                                <th className="px-6 py-4 text-right">Tổng thu</th>
                                <th className="px-6 py-4 text-center">% Lấp đầy</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                [...Array(3)].map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={5} className="px-6 py-4">
                                            <div className="h-6 w-full bg-muted/20 animate-pulse rounded" />
                                        </td>
                                    </tr>
                                ))
                            ) : movieTableData.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-6 py-8 text-center text-gray-500"
                                    >
                                        Không có dữ liệu trong khoảng thời gian này.
                                    </td>
                                </tr>
                            ) : (
                                movieTableData.map((item, idx) => (
                                    <tr
                                        key={idx}
                                        className="hover:bg-gray-50/50 transition-colors"
                                    >
                                        <td className="px-6 py-4 font-medium text-gray-900 border-l-4 border-transparent hover:border-indigo-500">
                                            {item.movie?.name || item.movie?.title}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-600">
                                            {fmtVND(item.ticketRevenue || 0)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-600">
                                            {fmtVND(item.foodDrinkRevenue || 0)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                            {fmtVND(item.totalRevenue)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge
                                                variant="outline"
                                                className={`
                                          ${(item.occupancyRate || 0) > 50
                                                        ? "bg-green-50 text-green-700 border-green-200"
                                                        : (item.occupancyRate || 0) > 20
                                                            ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                                            : "bg-gray-50 text-gray-600"
                                                    }
                                      `}
                                            >
                                                {fmtPercent(item.occupancyRate)}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div >
    );
}
