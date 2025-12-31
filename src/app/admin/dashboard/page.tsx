"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LabelList } from "recharts";
import { useAuth } from "@/context/AuthContext"; // Import useAuth
import {
  DollarSign,
  Users,
  Building2,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  CalendarDays,
  Utensils,
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
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
} from "recharts";

import {
  dashboardService,
  type MovieRevenueResponse,
  CinemaRevenueResponse,
  MovieRevenueItem,
  CinemaRevenueItem,
} from "@/services";
import { DateNativeVN } from "@/components/DateNativeVN";
import ExportExcelModal from "@/components/modal/ExportExcelModal";

type ChartItem = {
  name: string;
  revenue: number;
  ticketRevenue: number;
  fnbRevenue: number;
  occupancyRate: number;
};
const PIE_COLORS: string[] = ["#4f46e5", "#22c55e"];

const truncateText = (text: string, maxLength: number = 15) => {
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

export default function Dashboard() {
  const { user } = useAuth(); // Hooks
  // ===== Khoảng thời gian mặc định: hôm nay -> +7 ngày
  const todayISO = new Date().toISOString().slice(0, 10);
  const sevenDaysAfterISO = new Date(Date.now() + 7 * 86400000)
    .toISOString()
    .slice(0, 10);

  const [startDate, setStartDate] = useState<string>(todayISO);
  const [endDate, setEndDate] = useState<string>(sevenDaysAfterISO);
  const [type, setType] = useState<string>("all");

  // ===== State Export
  const [showExportModal, setShowExportModal] = useState(false);

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
        ticketRevenue: Number(item.ticketRevenue ?? 0),
        fnbRevenue: Number(item.foodDrinkRevenue ?? 0),
        occupancyRate: Number(item.occupancyRate ?? 0),
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
        ticketRevenue: Number(item.ticketRevenue ?? 0),
        fnbRevenue: Number(item.foodDrinkRevenue ?? 0),
        occupancyRate: Number(item.occupancyRate ?? 0),
      };
    });

    return mapped.sort((a, b) => b.revenue - a.revenue);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const apiType = type === "all" ? undefined : type;
      const [usersCount, cinemasCount, moviesCount, rev] = await Promise.all([
        dashboardService.getUserCount(),
        dashboardService.getCinemaCount(),
        dashboardService.getMovieCount(),
        dashboardService.getRevenueByPeriod({
          startDate,
          endDate,
          type: apiType,
        }),
      ]);

      setCounts({
        users: usersCount,
        cinemas: cinemasCount,
        movies: moviesCount,
      });

      const total = Number(rev.totalRevenue ?? 0);
      const fnb = Number(rev.totalFoodDrinkRevenue ?? 0);
      const ticket = Math.max(0, total - fnb);
      setRevenue({ total, fnb, ticket });

      try {
        const rbm = await dashboardService.getRevenueByPeriodAndMovie({
          startDate,
          endDate,
          type: apiType,
        });
        setByMovie(mapMovieRevenue(rbm));
      } catch (e: unknown) {
        console.error("Lỗi getRevenueByPeriodAndMovie:", e);
        setByMovie([]);
      }

      try {
        const rbc = await dashboardService.getRevenueByPeriodAndCinema({
          startDate,
          endDate,
          type: apiType,
        });
        setByCinema(mapCinemaRevenue(rbc));
      } catch (e: unknown) {
        console.error("Lỗi getRevenueByPeriodAndCinema:", e);
        setByCinema([]);
      }
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Có lỗi xảy ra khi tải dữ liệu.";
      setError(msg);
      setByMovie([]);
      setByCinema([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, type]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
            <DateNativeVN
              valueISO={startDate}
              onChangeISO={(iso) => setStartDate(iso)}
              className="relative"
              widthClass="w-[140px]"
              maxISO={endDate}
            />
            <span className="text-muted-foreground">→</span>

            <DateNativeVN
              valueISO={endDate}
              onChangeISO={(iso) => setEndDate(iso)}
              className="relative"
              widthClass="w-[140px]"
              minISO={startDate}
            />

            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[120px] border bg-white">
                <SelectValue placeholder="Loại đơn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={refresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowExportModal(true)}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Xuất Excel
          </Button>
        </div>
      </div>

      <ExportExcelModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        initialStartDate={startDate}
        initialEndDate={endDate}
        initialType={type}
      />

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
                  <ComposedChart
                    data={byCinema}
                    margin={{ top: 12, right: 12, left: 4, bottom: 0 }}
                  >
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
                        fontSize: 12,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={60}
                    />
                    {/* Left Y-Axis for Revenue */}
                    <YAxis
                      yAxisId="left"
                      tickFormatter={(val) =>
                        new Intl.NumberFormat("en", {
                          notation: "compact",
                        }).format(val)
                      }
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fontSize: 12,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                    />
                    {/* Right Y-Axis for Occupancy Rate */}
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      unit="%"
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fontSize: 12,
                        fill: "#f97316", // orange-500
                      }}
                    />

                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === "Tỉ lệ lấp đầy") return `${value}%`;
                        return fmtVND(value);
                      }}
                      cursor={{ fill: "rgba(148, 163, 184, 0.18)" }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      wrapperStyle={{ fontSize: 12 }}
                    />

                    {/* Stacked Bars for Revenue */}
                    <Bar
                      yAxisId="left"
                      dataKey="ticketRevenue"
                      name="Vé"
                      stackId="a"
                      fill="#4f46e5" // indigo-600
                      radius={[0, 0, 4, 4]} // top-rounded only if top? No, stacked.
                      maxBarSize={48}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="fnbRevenue"
                      name="Đồ ăn & nước"
                      stackId="a"
                      fill="#22c55e" // green-500
                      radius={[4, 4, 0, 0]} // Round top of the stack
                      maxBarSize={48}
                    />

                    {/* Line for Occupancy Rate */}
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="occupancyRate"
                      name="Tỉ lệ lấp đầy"
                      stroke="#f97316" // orange-500
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#f97316" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Hàng biểu đồ 2 */}
      < div className="grid grid-cols-1 xl:grid-cols-2 gap-4" >
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
              className={`inline-flex items-center text-xs font-medium ${delta >= 0 ? "text-emerald-600" : "text-rose-600"
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
