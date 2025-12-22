"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import {
    DollarSign,
    Users,
    Building2,
    RefreshCw,
    BarChart3,
    PieChart as PieChartIcon,
    CalendarDays,
    Utensils,
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
    PieChart,
    Pie,
    Cell,
} from "recharts";

import {
    dashboardService,
    type MovieRevenueResponse,
    MovieRevenueItem,
} from "@/services";
import { DateNativeVN } from "@/components/DateNativeVN";

type ChartItem = { name: string; revenue: number };
const PIE_COLORS: string[] = ["#4f46e5", "#22c55e"];

const truncateText = (text: string, maxLength: number = 15) => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

export default function ManagerDashboard() {
    const { user } = useAuth();
    const todayISO = new Date().toISOString().slice(0, 10);
    const sevenDaysAfterISO = new Date(Date.now() + 7 * 86400000)
        .toISOString()
        .slice(0, 10);

    const [startDate, setStartDate] = useState<string>(todayISO);
    const [endDate, setEndDate] = useState<string>(sevenDaysAfterISO);

    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    const [counts, setCounts] = useState<{
        users: number; // Có thể ẩn nếu không cần thiết
        cinemas: number; // Ẩn với manager?
        movies: number;
    }>({ users: 0, cinemas: 0, movies: 0 });

    const [revenue, setRevenue] = useState<{
        total: number;
        fnb: number;
        ticket: number;
    }>({ total: 0, fnb: 0, ticket: 0 });

    const [byMovie, setByMovie] = useState<ChartItem[]>([]);

    // Helpers
    const fmtNumber = (n: number | string): string =>
        new Intl.NumberFormat().format(Number(n) || 0);

    const fmtVND = (n: number | string): string =>
        new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0,
        }).format(Math.max(0, Math.round(Number(n) || 0)));

    const mapMovieRevenue = (
        rbm: MovieRevenueResponse | MovieRevenueItem[] | null | undefined
    ): ChartItem[] => {
        if (!rbm) return [];
        if (Array.isArray(rbm)) return [];

        const source =
            rbm.sortedMovies.length > 0 ? rbm.sortedMovies : rbm.moviesRevenue;

        const mapped: ChartItem[] = source.map((item) => {
            const name = item.movie?.name ?? item.movie?.title ?? "(Không xác định)";
            return {
                name,
                revenue: Number(item.totalRevenue ?? 0),
            };
        });

        return mapped.sort((a, b) => b.revenue - a.revenue).slice(0, 12);
    };

    const refresh = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError("");

        try {
            // Manager thường chỉ quan tâm đến rạp của mình.
            // Tuy nhiên dashboardService hiện tại có thể gọi API chung.
            // Cần kiểm tra BE có hỗ trợ filter theo CinemaID ở dashboard hay không.
            // Nếu không, API có thể sẽ trả về toàn bộ.
            // GIẢ ĐỊNH: BE tự filter theo user role hoặc API dashboardService cần update.
            // Hiện tại ta cứ gọi như Admin dashboard nhưng Logic hiển thị sẽ hạn chế hơn.

            const [moviesCount, rev] = await Promise.all([
                dashboardService.getMovieCount(), // Số lượng phim đang chiếu (chung)
                dashboardService.getRevenueByPeriod({ startDate, endDate }), // Cần confirm xem API này có filter cinemaId user đang login ko?
            ]);

            const total = Number(rev.totalRevenue ?? 0);
            const fnb = Number(rev.totalRevenueFromFoodDrink ?? 0);
            const ticket = Math.max(0, total - fnb);
            setRevenue({ total, fnb, ticket });
            setCounts((prev) => ({ ...prev, movies: moviesCount }));

            // Revenue by Movie
            try {
                const rbm = await dashboardService.getRevenueByPeriodAndMovie({
                    startDate,
                    endDate,
                });
                setByMovie(mapMovieRevenue(rbm));
            } catch (e) {
                console.error("Lỗi getRevenueByPeriodAndMovie", e);
                setByMovie([]);
            }
        } catch (e: unknown) {
            const msg =
                e instanceof Error ? e.message : "Có lỗi xảy ra khi tải dữ liệu.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, user]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return (
        <div className="min-h-screen w-full p-6 md:p-10 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                        Quản lý rạp - Trang chủ
                    </h1>
                    <p className="text-gray-500">
                        Dành cho quản lý rạp: {user?.cinemaName ?? "Rạp chi nhánh"}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                        <DateNativeVN
                            valueISO={startDate}
                            onChangeISO={setStartDate}
                            widthClass="w-[140px]"
                        />
                        <span className="text-muted-foreground">→</span>
                        <DateNativeVN
                            valueISO={endDate}
                            onChangeISO={setEndDate}
                            widthClass="w-[140px]"
                        />
                    </div>
                    <Button onClick={refresh} className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Làm mới
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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
                <MetricCard
                    title="Phim đang chiếu"
                    value={fmtNumber(counts.movies)}
                    icon={<Building2 className="h-5 w-5" />}
                    loading={loading}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* Pie Chart */}
                <Card className="h-[380px] xl:col-span-1">
                    <CardHeader>
                        <CardTitle>Cơ cấu doanh thu</CardTitle>
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
                                            { name: "F&B", value: revenue.fnb },
                                        ]}
                                        innerRadius={60}
                                        outerRadius={100}
                                    >
                                        <Cell fill={PIE_COLORS[0]} />
                                        <Cell fill={PIE_COLORS[1]} />
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number | string) => fmtVND(value)}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Bar Chart - Top Movies */}
                <Card className="h-[380px] xl:col-span-2">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            <CardTitle>Top phim theo doanh thu</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {loading ? (
                            <div className="h-full w-full animate-pulse rounded-xl bg-muted/40" />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={byMovie}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        tickFormatter={(v) => truncateText(v)}
                                        tickLine={false}
                                        axisLine={false}
                                        interval={0}
                                        angle={-15}
                                        textAnchor="end"
                                        height={60}
                                        tick={{ fontSize: 12 }}
                                    />
                                    <YAxis
                                        tickFormatter={fmtNumber}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fontSize: 12 }}
                                    />
                                    <Tooltip
                                        formatter={(val: number | string) => fmtVND(val)}
                                    />
                                    <Bar
                                        dataKey="revenue"
                                        fill="#4f46e5"
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={50}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// Reused Component
function MetricCard({
    title,
    value,
    icon,
    loading,
}: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    loading: boolean;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <Card className="h-[140px]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {icon}
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="h-8 w-32 rounded bg-muted/40 animate-pulse" />
                    ) : (
                        <div className="text-xl md:text-2xl font-semibold">{value}</div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
