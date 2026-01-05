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
  AreaChart,
  Area,
  ComposedChart,
  Line,
} from "recharts";

import {
  dashboardService,
  type MovieRevenueItem,
  type CinemaRevenueItem,
  type DailyRevenueGlobal,
  type DailyRevenueBreakdown,
} from "@/services";
import ExportExcelModal from "@/components/modal/ExportExcelModal";

type ChartItem = {
  name: string;
  revenue: number;
  ticketRevenue: number;
  fnbRevenue: number;
  occupancyRate: number;
  dailyBreakdown?: DailyRevenueBreakdown[];
};
const PIE_COLORS: string[] = ["#4f46e5", "#22c55e"];

const truncateText = (text: string, maxLength: number = 15) => {
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ===== Hàm tiện ích format
const fmtNumber = (n: number | string): string =>
  new Intl.NumberFormat().format(Number(n) || 0);

const fmtVND = (n: number | string): string =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(Number(n) || 0)));

// Custom Tooltip Component (Simplified)
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data: ChartItem = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded shadow-lg text-sm max-w-[250px]">
        <p className="font-semibold mb-1 border-b pb-1">{label}</p>
        <p className="text-gray-700">Doanh thu: {fmtVND(data.revenue)}</p>
        <p className="text-blue-600">Vé: {fmtVND(data.ticketRevenue)}</p>
        <p className="text-green-600">F&B: {fmtVND(data.fnbRevenue)}</p>
        {data.occupancyRate !== undefined && (
          <p className="text-orange-600">
            Lấp đầy: {data.occupancyRate}%
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1 italic">
          (Click để xem chi tiết từng ngày)
        </p>
      </div>
    );
  }
  return null;
};

const aggregateByMonth = (data: any[]) => {
  if (!data || data.length === 0) return [];

  const groups: Record<string, any> = {};

  data.forEach((item) => {
    // Cắt chuỗi ngày để lấy YYYY-MM (ví dụ: 2025-12-29 -> 2025-12)
    const monthKey = item.date.substring(0, 7);

    if (!groups[monthKey]) {
      groups[monthKey] = {
        date: monthKey,
        totalRevenue: 0,
        // Xử lý linh động tên biến vì API trả về có thể khác nhau (ticketRevenue vs totalTicketRevenue)
        ticketRevenue: 0,
        totalTicketRevenue: 0,
        foodDrinkRevenue: 0,
        totalFoodDrinkRevenue: 0,
        occupancyRateSum: 0,
        count: 0,
      };
    }

    // Cộng dồn doanh thu
    groups[monthKey].totalRevenue += Number(item.totalRevenue || 0);

    // Cộng dồn vé (xử lý cả 2 trường hợp tên field)
    const tRev = Number(item.ticketRevenue || item.totalTicketRevenue || 0);
    groups[monthKey].ticketRevenue += tRev;
    groups[monthKey].totalTicketRevenue += tRev;

    // Cộng dồn F&B
    const fRev = Number(item.foodDrinkRevenue || item.totalFoodDrinkRevenue || 0);
    groups[monthKey].foodDrinkRevenue += fRev;
    groups[monthKey].totalFoodDrinkRevenue += fRev;

    // Tích lũy occupancy để tính trung bình sau này
    groups[monthKey].occupancyRateSum += Number(item.occupancyRate || 0);
    groups[monthKey].count += 1;
  });

  // Chuyển object về array và tính trung bình
  return Object.values(groups).map((g) => ({
    ...g,
    occupancyRate: g.count > 0 ? Number((g.occupancyRateSum / g.count).toFixed(2)) : 0,
    // Xóa các trường tạm
    occupancyRateSum: undefined,
    count: undefined,
  }));
};

export default function Dashboard() {
  const [selectedItem, setSelectedItem] = useState<ChartItem | null>(null);

  const { user } = useAuth(); // Hooks
  // ===== Date Range Logic
  const DATE_RANGE_OPTIONS = [
    { label: "Hôm nay", value: "today" },
    { label: "Hôm qua", value: "yesterday" },
    { label: "Tuần này", value: "week" },
    { label: "7 ngày qua", value: "last7days" },
    { label: "Tháng này", value: "month" },
    { label: "Tháng trước", value: "lastMonth" },
    { label: "6 tháng qua", value: "last6months" },
    { label: "1 năm", value: "year" },
  ];

  const calculateDateRange = (type: string) => {
    const today = new Date();
    // Helper to format YYYY-MM-DD using local time
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    let start = new Date(today);
    let end = new Date(today);

    switch (type) {
      case "today":
        break;
      case "yesterday":
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;
      case "week":
        // Tuần này: start = Thứ 2, end = Hôm nay
        const day = today.getDay();
        // day=0 (Sun) -> diff = -6 (prev Mon). day=1 (Mon) -> diff=0.
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        break;
      case "last7days":
        start.setDate(today.getDate() - 7);
        break;
      case "month":
        // Tháng này: 1 -> Today
        start.setDate(1);
        break;
      case "lastMonth":
        // Tháng trước: 1st -> Last Day
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        end.setDate(0); // Sets to last day of previous month relative to current 'end' (which is today)
        // Correct check: if today is Jan 5, end is Jan 5. date(0) sets to Dec 31. Correct.
        break;
      case "last6months":
        start.setMonth(today.getMonth() - 6);
        break;
      case "year":
        start.setFullYear(today.getFullYear() - 1);
        break;
      default:
        start.setDate(today.getDate() - 7);
    }
    return { start: formatDate(start), end: formatDate(end) };
  };

  // Initial State
  const initialRange = calculateDateRange("last7days");
  const [startDate, setStartDate] = useState<string>(initialRange.start);
  const [endDate, setEndDate] = useState<string>(initialRange.end);
  const [rangeType, setRangeType] = useState<string>("last7days");
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

  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenueGlobal[]>([]);
  const [byMovie, setByMovie] = useState<ChartItem[]>([]);
  const [byCinema, setByCinema] = useState<ChartItem[]>([]);

  // ===== Map dữ liệu doanh thu theo phim
  // const mapMovieRevenue = (
  //   rbm: MovieRevenueResponse | MovieRevenueItem[] | null | undefined
  // ): ChartItem[] => {
  //   if (!rbm) return [];

  //   let source: MovieRevenueItem[] = [];
  //   if (Array.isArray(rbm)) {
  //     source = rbm;
  //   } else {
  //     source =
  //       rbm.sortedMovies?.length > 0 ? rbm.sortedMovies : rbm.moviesRevenue;
  //   }

  //   const mapped: ChartItem[] = (source || []).map((item) => {
  //     const name = item.movie?.name ?? item.movie?.title ?? "(Không xác định)";
  //     const anyItem = item as any; // Allow checking for mismatched keys

  //     return {
  //       name,
  //       revenue: Number(item.totalRevenue ?? 0),
  //       ticketRevenue: Number(
  //         item.ticketRevenue ?? anyItem.totalTicketRevenue ?? 0
  //       ),
  //       fnbRevenue: Number(
  //         item.foodDrinkRevenue ?? anyItem.totalFoodDrinkRevenue ?? 0
  //       ),
  //       occupancyRate: Number(item.occupancyRate ?? 0),
  //       dailyBreakdown: item.dailyBreakdown,
  //     };
  //   });

  //   return mapped.sort((a, b) => b.revenue - a.revenue).slice(0, 12);
  // };

  // // ===== Map dữ liệu doanh thu theo rạp
  // const mapCinemaRevenue = (
  //   rbc: CinemaRevenueResponse | CinemaRevenueItem[] | null | undefined
  // ): ChartItem[] => {
  //   if (!rbc) return [];

  //   let source: CinemaRevenueItem[] = [];
  //   if (Array.isArray(rbc)) {
  //     source = rbc;
  //   } else {
  //     source =
  //       rbc.sortedCinemas?.length > 0
  //         ? rbc.sortedCinemas
  //         : rbc.cinemasRevenue;
  //   }

  //   const mapped: ChartItem[] = (source || []).map((item) => {
  //     const name = item.cinema?.name ?? "(Không xác định)";
  //     const anyItem = item as any; // Allow checking for mismatched keys

  //     return {
  //       name,
  //       revenue: Number(item.totalRevenue ?? 0),
  //       ticketRevenue: Number(
  //         item.ticketRevenue ?? anyItem.totalTicketRevenue ?? 0
  //       ),
  //       fnbRevenue: Number(
  //         item.foodDrinkRevenue ?? anyItem.totalFoodDrinkRevenue ?? 0
  //       ),
  //       occupancyRate: Number(item.occupancyRate ?? 0),
  //       dailyBreakdown: item.dailyBreakdown,
  //     };
  //   });

  //   return mapped.sort((a, b) => b.revenue - a.revenue);
  // };

  const mapMovieRevenue = (
    rbm: MovieRevenueItem[] | null | undefined,
    shouldAggregate: boolean // <--- Thêm tham số này
  ): ChartItem[] => {
    if (!rbm || !Array.isArray(rbm)) return [];

    const startSource = rbm;

    const mapped: ChartItem[] = startSource.map((item) => {
      const name = item.movie?.name ?? item.movie?.title ?? "(Không xác định)";
      const anyItem = item as any;

      // Xử lý dailyBreakdown
      let breakdown = item.dailyBreakdown || [];
      if (shouldAggregate) {
        breakdown = aggregateByMonth(breakdown);
      }

      return {
        name,
        revenue: Number(item.totalRevenue ?? 0),
        ticketRevenue: Number(item.ticketRevenue ?? anyItem.totalTicketRevenue ?? 0),
        fnbRevenue: Number(item.foodDrinkRevenue ?? anyItem.totalFoodDrinkRevenue ?? 0),
        occupancyRate: Number(item.occupancyRate ?? 0),
        dailyBreakdown: breakdown, // <--- Dữ liệu đã được gộp (hoặc không)
      };
    });

    return mapped.sort((a, b) => b.revenue - a.revenue).slice(0, 12);
  };

  // ===== Map dữ liệu doanh thu theo rạp (Cập nhật tương tự)
  const mapCinemaRevenue = (
    rbc: CinemaRevenueItem[] | null | undefined,
    shouldAggregate: boolean // <--- Thêm tham số này
  ): ChartItem[] => {
    if (!rbc || !Array.isArray(rbc)) return [];

    const startSource = rbc;

    const mapped: ChartItem[] = startSource.map((item) => {
      const name = item.cinema?.name ?? "(Không xác định)";
      const anyItem = item as any;

      let breakdown = item.dailyBreakdown || [];
      if (shouldAggregate) {
        breakdown = aggregateByMonth(breakdown);
      }

      return {
        name,
        revenue: Number(item.totalRevenue ?? 0),
        ticketRevenue: Number(item.ticketRevenue ?? anyItem.totalTicketRevenue ?? 0),
        fnbRevenue: Number(item.foodDrinkRevenue ?? anyItem.totalFoodDrinkRevenue ?? 0),
        occupancyRate: Number(item.occupancyRate ?? 0),
        dailyBreakdown: breakdown,
      };
    });

    return mapped.sort((a, b) => b.revenue - a.revenue);
  };

  // Helper: Convert YYYY-MM-DD (VN) to ISO string (UTC) at 00:00:00 VN
  // VN 00:00 = UTC 17:00 (Previous Day)
  const getVnStartDayInUtc = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const utcMidnight = Date.UTC(y, m - 1, d);
    return new Date(utcMidnight - 7 * 3600 * 1000).toISOString();
  };

  // Helper: Convert YYYY-MM-DD (VN) to ISO string (UTC) at 23:59:59.999 VN
  // VN 23:59:59 = UTC 16:59:59
  const getVnEndDayInUtc = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const utcMidnightNextDay = Date.UTC(y, m - 1, d + 1);
    // VN Start Next Day = UTC Next Midnight - 7h
    // VN End Day = VN Start Next Day - 1ms
    return new Date(utcMidnightNextDay - 7 * 3600 * 1000 - 1).toISOString();
  };

  // const refresh = useCallback(async () => {
  //   setLoading(true);
  //   setError("");

  //   try {
  //     const apiType = type === "all" ? undefined : type;
  //     const formattedStartDate = getVnStartDayInUtc(startDate);
  //     const formattedEndDate = getVnEndDayInUtc(endDate);

  //     const [usersCount, cinemasCount, moviesCount, rev] = await Promise.all([
  //       dashboardService.getUserCount(),
  //       dashboardService.getCinemaCount(),
  //       dashboardService.getMovieCount(),
  //       dashboardService.getRevenueByPeriod({
  //         startDate: formattedStartDate,
  //         endDate: formattedEndDate,
  //         type: apiType,
  //       }),
  //     ]);

  //     setCounts({
  //       users: usersCount,
  //       cinemas: cinemasCount,
  //       movies: moviesCount,
  //     });

  //     // rev structure: { summary: {...}, daily: [...] }
  //     const total = Number(rev.summary.totalRevenue ?? 0);
  //     const fnb = Number(rev.summary.totalFoodDrinkRevenue ?? 0);
  //     const ticket = Number(rev.summary.totalTicketRevenue ?? 0);
  //     setRevenue({ total, fnb, ticket });
  //     setDailyRevenue(rev.daily || []);

  //     try {
  //       const rbm = await dashboardService.getRevenueByPeriodAndMovie({
  //         startDate: formattedStartDate,
  //         endDate: formattedEndDate,
  //         type: apiType,
  //       });
  //       setByMovie(mapMovieRevenue(rbm));
  //     } catch (e: unknown) {
  //       console.error("Lỗi getRevenueByPeriodAndMovie:", e);
  //       setByMovie([]);
  //     }

  //     try {
  //       const rbc = await dashboardService.getRevenueByPeriodAndCinema({
  //         startDate: formattedStartDate,
  //         endDate: formattedEndDate,
  //         type: apiType,
  //       });
  //       setByCinema(mapCinemaRevenue(rbc));
  //     } catch (e: unknown) {
  //       console.error("Lỗi getRevenueByPeriodAndCinema:", e);
  //       setByCinema([]);
  //     }
  //   } catch (e: unknown) {
  //     const msg =
  //       e instanceof Error ? e.message : "Có lỗi xảy ra khi tải dữ liệu.";
  //     setError(msg);
  //     setByMovie([]);
  //     setByCinema([]);
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [startDate, endDate, type]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const apiType = type === "all" ? undefined : type;
      const formattedStartDate = getVnStartDayInUtc(startDate);
      const formattedEndDate = getVnEndDayInUtc(endDate);

      // Kiểm tra xem có cần gộp theo tháng không
      const isLongRange = ["last6months", "year"].includes(rangeType);

      const [usersCount, cinemasCount, moviesCount, rev] = await Promise.all([
        dashboardService.getUserCount(),
        dashboardService.getCinemaCount(),
        dashboardService.getMovieCount(),
        dashboardService.getRevenueByPeriod({
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          type: apiType,
        }),
      ]);

      setCounts({
        users: usersCount,
        cinemas: cinemasCount,
        movies: moviesCount,
      });

      const total = Number(rev.summary.totalRevenue ?? 0);
      const fnb = Number(rev.summary.totalFoodDrinkRevenue ?? 0);
      const ticket = Number(rev.summary.totalTicketRevenue ?? 0);
      setRevenue({ total, fnb, ticket });

      // --- XỬ LÝ BIỂU ĐỒ DOANH THU TỔNG (AREA CHART) ---
      let processedDaily = rev.daily || [];
      if (isLongRange) {
        processedDaily = aggregateByMonth(processedDaily);
      }
      setDailyRevenue(processedDaily);

      // --- XỬ LÝ DATA PHIM ---
      try {
        const rbm = await dashboardService.getRevenueByPeriodAndMovie({
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          type: apiType,
        });
        // Truyền biến isLongRange vào hàm map
        setByMovie(mapMovieRevenue(rbm, isLongRange));
      } catch (e: unknown) {
        console.error("Lỗi getRevenueByPeriodAndMovie:", e);
        setByMovie([]);
      }

      // --- XỬ LÝ DATA RẠP ---
      try {
        const rbc = await dashboardService.getRevenueByPeriodAndCinema({
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          type: apiType,
        });
        // Truyền biến isLongRange vào hàm map
        setByCinema(mapCinemaRevenue(rbc, isLongRange));
      } catch (e: unknown) {
        console.error("Lỗi getRevenueByPeriodAndCinema:", e);
        setByCinema([]);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Có lỗi xảy ra khi tải dữ liệu.";
      setError(msg);
      setByMovie([]);
      setByCinema([]);
    } finally {
      setLoading(false);
    }
    // Cần thêm rangeType vào dependency array
  }, [startDate, endDate, type, rangeType]);

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
            {/* Date Range Select */}
            <Select
              value={rangeType}
              onValueChange={(val) => {
                setRangeType(val);
                const { start, end } = calculateDateRange(val);
                setStartDate(start);
                setEndDate(end);
              }}
            >
              <SelectTrigger className="w-[180px] bg-white border">
                <SelectValue placeholder="Chọn thời gian" />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
        initialRangeType={rangeType}
        fixedCinemaId={
          user?.role === "MANAGER" ? user.cinemaId : undefined
        }
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
          title="Phim đang chiếu / Rạp hoạt động" // Clarified Label
          value={`${fmtNumber(counts.movies)} / ${fmtNumber(counts.cinemas)}`}
          icon={<Building2 className="h-5 w-5" />}
          loading={loading}
        />
      </div>

      {/* Row 0: Daily Revenue Trend (New) */}
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
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#colorTotal)"
                />
                <Area
                  type="monotone"
                  dataKey="totalTicketRevenue"
                  name="Doanh thu vé"
                  stroke="#22c55e"
                  fill="none" // Line only
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="totalFoodDrinkRevenue"
                  name="F&B"
                  stroke="#eab308"
                  fill="none" // Line only
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Hàng biểu đồ 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* ... Existing Pie Chart can stay ... */}
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
                    margin={{ top: 20, right: 20, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
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
                      tickCount={6}
                      tick={{
                        fontSize: 12,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                    />

                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.18)" }} />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      wrapperStyle={{ fontSize: 12 }}
                    />

                    <Bar
                      yAxisId="left"
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
                      yAxisId="left"
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
                    tickFormatter={(val) =>
                      new Intl.NumberFormat("en", {
                        notation: "compact",
                      }).format(val)
                    }
                    tickLine={false}
                    axisLine={false}
                    tickCount={6}
                    tick={{
                      fontSize: 12,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.18)" }} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Bar
                    dataKey="ticketRevenue"
                    name="Vé"
                    stackId="a"
                    fill="#2563eb"
                    radius={[0, 0, 4, 4]}
                    maxBarSize={60}
                    onClick={(data: any) => setSelectedItem(data)}
                    cursor="pointer"
                  />
                  <Bar
                    dataKey="fnbRevenue"
                    name="F&B"
                    stackId="a"
                    fill="#16a34a"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={60}
                    onClick={(data: any) => setSelectedItem(data)}
                    cursor="pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>


      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-5xl lg:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Chi tiết doanh thu: {selectedItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="h-[60vh] min-h-[400px] w-full mt-4">
            {selectedItem?.dailyBreakdown && selectedItem.dailyBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={selectedItem.dailyBreakdown}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorTotalPopup" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  {/* Note: using 'date' key which is uniform across Breakdown and Global types */}
                  {/* <XAxis
                    dataKey="date"
                    tickFormatter={(val) => {
                      if (!val) return "";
                      const [y, m, d] = val.split("-");
                      return `${d}/${m}`;
                    }}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  /> */}
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => {
                      if (!val) return "";
                      const parts = val.split("-");

                      // Trường hợp gộp tháng: "2025-12" -> parts có 2 phần
                      if (parts.length === 2) {
                        const [y, m] = parts;
                        return `T${m}/${y}`; // Hiển thị: T12/2025
                      }

                      // Trường hợp chi tiết ngày: "2025-12-29" -> parts có 3 phần
                      if (parts.length === 3) {
                        const [y, m, d] = parts;
                        return `${d}/${m}`; // Hiển thị: 29/12
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
                                {entry.name}: {entry.dataKey === 'occupancyRate' ? `${entry.value}%` : fmtVND(entry.value)}
                              </p>
                            ))}
                          </div>
                        )
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
    </div >
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
