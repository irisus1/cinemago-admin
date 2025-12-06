"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LabelList } from "recharts";
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
  CinemaRevenueResponse,
  MovieRevenueItem,
  CinemaRevenueItem,
} from "@/services";

type ChartItem = { name: string; revenue: number };
const PIE_COLORS: string[] = ["#4f46e5", "#22c55e"];

const truncateText = (text: string, maxLength: number = 15) => {
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

export default function Dashboard() {
  // ===== Khoảng thời gian mặc định: hôm nay -> +7 ngày
  const todayISO = new Date().toISOString().slice(0, 10);
  const sevenDaysAfterISO = new Date(Date.now() + 7 * 86400000)
    .toISOString()
    .slice(0, 10);

  const [startDate, setStartDate] = useState<string>(todayISO);
  const [endDate, setEndDate] = useState<string>(sevenDaysAfterISO);

  // ===== State dữ liệu
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const [counts, setCounts] = useState<{
    users: number;
    cinemas: number;
    movies: number;
  }>({ users: 0, cinemas: 0, movies: 0 });

  const [revenue, setRevenue] = useState<{
    total: number;
    fnb: number;
    ticket: number;
  }>({ total: 0, fnb: 0, ticket: 0 });

  const [byMovie, setByMovie] = useState<ChartItem[]>([]);
  const [byCinema, setByCinema] = useState<ChartItem[]>([]);

  // ===== Hàm tiện ích format
  const fmtNumber = (n: number | string): string =>
    new Intl.NumberFormat().format(Number(n) || 0);

  const fmtVND = (n: number | string): string =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(Math.max(0, Math.round(Number(n) || 0)));

  // ===== Map dữ liệu doanh thu theo phim
  const mapMovieRevenue = (
    rbm: MovieRevenueResponse | MovieRevenueItem[] | null | undefined
  ): ChartItem[] => {
    if (!rbm) return [];

    // Trường hợp BE trả [] khi không có booking
    if (Array.isArray(rbm)) {
      return [];
    }

    // Tới đây thì chắc chắn là MovieRevenueResponse
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

  // ===== Map dữ liệu doanh thu theo rạp
  const mapCinemaRevenue = (
    rbc: CinemaRevenueResponse | CinemaRevenueItem[] | null | undefined
  ): ChartItem[] => {
    if (!rbc) return [];

    // Trường hợp BE trả [] khi không có booking
    if (Array.isArray(rbc)) {
      return [];
    }

    const source =
      rbc.sortedCinemas.length > 0 ? rbc.sortedCinemas : rbc.cinemasRevenue;

    const mapped: ChartItem[] = source.map((item) => {
      const name = item.cinema?.name ?? "(Không xác định)";
      return {
        name,
        revenue: Number(item.totalRevenue ?? 0),
      };
    });

    return mapped.sort((a, b) => b.revenue - a.revenue);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // 1) Call các API "core" trước: user/cinema/movie count + tổng doanh thu
      const [usersCount, cinemasCount, moviesCount, rev] = await Promise.all([
        dashboardService.getUserCount(),
        dashboardService.getCinemaCount(),
        dashboardService.getMovieCount(),
        dashboardService.getRevenueByPeriod({ startDate, endDate }),
      ]);

      // ---- Counts
      setCounts({
        users: usersCount,
        cinemas: cinemasCount,
        movies: moviesCount,
      });

      // ---- Revenue period
      const total = Number(rev.totalRevenue ?? 0);
      const fnb = Number(rev.totalRevenueFromFoodDrink ?? 0);
      const ticket = Math.max(0, total - fnb);
      setRevenue({ total, fnb, ticket });

      // 2) Gọi API doanh thu theo phim – nếu lỗi thì chỉ log và để chart rỗng
      try {
        const rbm = await dashboardService.getRevenueByPeriodAndMovie({
          startDate,
          endDate,
        });
        setByMovie(mapMovieRevenue(rbm));
      } catch (e: unknown) {
        console.error("Lỗi getRevenueByPeriodAndMovie:", e);
        setByMovie([]); // tránh giữ data cũ
      }

      // 3) Gọi API doanh thu theo rạp – nếu lỗi thì chỉ log và để chart rỗng
      try {
        const rbc = await dashboardService.getRevenueByPeriodAndCinema({
          startDate,
          endDate,
        });
        setByCinema(mapCinemaRevenue(rbc));
      } catch (e: unknown) {
        console.error("Lỗi getRevenueByPeriodAndCinema:", e);
        setByCinema([]);
      }
    } catch (e: unknown) {
      // Chỉ khi các API "core" lỗi mới show lỗi lớn trên dashboard
      const msg =
        e instanceof Error ? e.message : "Có lỗi xảy ra khi tải dữ liệu.";
      setError(msg);
      // Nếu muốn, có thể reset luôn chart:
      setByMovie([]);
      setByCinema([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // ===== UI
  return (
    <div className="min-h-screen w-full p-6 md:p-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Bảng điều khiển quản trị rạp phim
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[140px]"
            />
            <span className="text-muted-foreground">→</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[140px]"
            />
          </div>
          <Button onClick={refresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Thẻ KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <MetricCard
          title="Tổng doanh thu"
          value={fmtVND(revenue.total)}
          icon={<DollarSign className="h-5 w-5" />}
          loading={loading}
        />
        <MetricCard
          title="Doanh thu đồ ăn & thức uống"
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
          title="Số phim / rạp"
          value={`${fmtNumber(counts.movies)} / ${fmtNumber(counts.cinemas)}`}
          icon={<Building2 className="h-5 w-5" />}
          loading={loading}
        />
      </div>

      {/* Hàng biểu đồ 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="h-[380px] xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              <CardTitle>Cơ cấu doanh thu</CardTitle>
            </div>
            <Badge variant="secondary" className="gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> {startDate} → {endDate}
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
                  <Tooltip
                    formatter={(value: number | string) => fmtVND(value)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

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
                <BarChart
                  data={byCinema}
                  margin={{ top: 12, right: 12, left: 4, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="revenueGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.9}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.4}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fontSize: 15,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  <YAxis
                    tickFormatter={fmtNumber}
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fontSize: 13,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  <Tooltip
                    formatter={(value: number | string) => fmtVND(value)}
                    cursor={{ fill: "rgba(148, 163, 184, 0.18)" }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Bar
                    dataKey="revenue"
                    name="Doanh thu"
                    fill="url(#revenueGradient)"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hàng biểu đồ 2 */}
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
                <BarChart
                  data={byMovie}
                  margin={{ top: 12, right: 12, left: 4, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="revenueGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.9}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.4}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={80}
                    tickFormatter={(value) => truncateText(value)}
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fontSize: 15,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  <YAxis
                    tickFormatter={fmtNumber}
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fontSize: 12,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  <Tooltip
                    formatter={(value: number | string) => fmtVND(value)}
                    cursor={{ fill: "rgba(148, 163, 184, 0.18)" }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Bar
                    dataKey="revenue"
                    name="Doanh thu"
                    fill="url(#revenueGradient)"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={48}
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

type MetricCardProps = {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  loading: boolean;
  delta?: number;
};

function MetricCard({ title, value, icon, loading, delta }: MetricCardProps) {
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
          {typeof delta === "number" && (
            <span
              className={`inline-flex items-center text-xs font-medium ${
                delta >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {delta >= 0 ? "+" : ""}
              {Math.abs(delta)}%
            </span>
          )}
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
