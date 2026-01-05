"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  dashboardService,
  type MovieRevenueItem,
  type CinemaRevenueItem,
  type DailyRevenueGlobal,
  type Cinema,
} from "@/services";
import ExportExcelModal from "@/components/modal/ExportExcelModal";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cinemaService } from "@/services";
import {
  calculateDateRange,
  getVnStartDayInUtc,
  getVnEndDayInUtc,
  ChartItem,
} from "../../../components/dashboard/utils";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import OverviewTab from "@/components/dashboard/OverviewTab";
import CinemaTab from "@/components/dashboard/CinemaTab";
import RevenueDetailDialog from "@/components/dashboard/RevenueDetailDialog";

// ===== Helper Aggregate Function (Keep internal logic helper not shared)
// Actually this can be moved to utils too if generic enough.
// Moving to page scope or keeping here is fine. Let's keep here for now as data logic.

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
        ticketRevenue: 0,
        totalTicketRevenue: 0,
        foodDrinkRevenue: 0,
        totalFoodDrinkRevenue: 0,
        occupancyRateSum: 0,
        count: 0,
      };
    }

    groups[monthKey].totalRevenue += Number(item.totalRevenue || 0);

    const tRev = Number(item.ticketRevenue || item.totalTicketRevenue || 0);
    groups[monthKey].ticketRevenue += tRev;
    groups[monthKey].totalTicketRevenue += tRev;

    const fRev = Number(item.foodDrinkRevenue || item.totalFoodDrinkRevenue || 0);
    groups[monthKey].foodDrinkRevenue += fRev;
    groups[monthKey].totalFoodDrinkRevenue += fRev;

    groups[monthKey].occupancyRateSum += Number(item.occupancyRate || 0);
    groups[monthKey].count += 1;
  });

  return Object.values(groups).map((g) => ({
    ...g,
    occupancyRate: g.count > 0 ? Number((g.occupancyRateSum / g.count).toFixed(2)) : 0,
    occupancyRateSum: undefined,
    count: undefined,
  }));
};

export default function Dashboard() {
  const { user } = useAuth();

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

  // ===== State mới cho Tabs và Cinema Detail
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [selectedCinemaId, setSelectedCinemaId] = useState<string>("");

  const [selectedItem, setSelectedItem] = useState<ChartItem | null>(null);

  useEffect(() => {
    const fetchCinemas = async () => {
      try {
        const res = await cinemaService.getAllCinemas();
        if (res.data) {
          setCinemas(res.data);
          if (res.data.length > 0) setSelectedCinemaId(res.data[0].id);
        }
      } catch (error) {
        console.error("Failed to load cinemas", error);
      }
    };
    fetchCinemas();
  }, []);

  const mapMovieRevenue = (
    rbm: MovieRevenueItem[] | null | undefined,
    shouldAggregate: boolean
  ): ChartItem[] => {
    if (!rbm || !Array.isArray(rbm)) return [];

    const mapped: ChartItem[] = rbm.map((item) => {
      const name = item.movie?.name ?? item.movie?.title ?? "(Không xác định)";
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

    return mapped.sort((a, b) => b.revenue - a.revenue).slice(0, 12);
  };

  const mapCinemaRevenue = (
    rbc: CinemaRevenueItem[] | null | undefined,
    shouldAggregate: boolean
  ): ChartItem[] => {
    if (!rbc || !Array.isArray(rbc)) return [];

    const mapped: ChartItem[] = rbc.map((item) => {
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

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const formattedStartDate = getVnStartDayInUtc(startDate);
      const formattedEndDate = getVnEndDayInUtc(endDate);

      const isLongRange = ["last6months", "year"].includes(rangeType);

      const apiType = type === "all" ? undefined : type;
      const apiCinemaId = activeTab === "cinema" ? selectedCinemaId : undefined;

      if (activeTab === "cinema" && !apiCinemaId) {
        setLoading(false);
        return;
      }

      const fetchCounts = activeTab === "overview"
        ? Promise.all([
          dashboardService.getUserCount(),
          dashboardService.getCinemaCount(),
          dashboardService.getMovieCount(),
        ])
        : Promise.resolve([0, 0, 0]);

      const [usersCount, cinemasCount, moviesCount] = await fetchCounts;

      const rev = await dashboardService.getRevenueByPeriod({
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        type: apiType,
        cinemaId: apiCinemaId
      });

      setCounts({
        users: usersCount,
        cinemas: cinemasCount,
        movies: moviesCount,
      });

      const total = Number(rev.summary.totalRevenue ?? 0);
      const fnb = Number(rev.summary.totalFoodDrinkRevenue ?? 0);
      const ticket = Number(rev.summary.totalTicketRevenue ?? 0);
      setRevenue({ total, fnb, ticket });

      let processedDaily = rev.daily || [];
      if (isLongRange) {
        processedDaily = aggregateByMonth(processedDaily);
      }
      setDailyRevenue(processedDaily);

      try {
        const rbm = await dashboardService.getRevenueByPeriodAndMovie({
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          type: apiType,
          cinemaId: apiCinemaId
        });
        setByMovie(mapMovieRevenue(rbm, isLongRange));
      } catch (e: unknown) {
        console.error("Lỗi getRevenueByPeriodAndMovie:", e);
        setByMovie([]);
      }

      try {
        const rbc = await dashboardService.getRevenueByPeriodAndCinema({
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          type: apiType,
          cinemaId: apiCinemaId
        });
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
  }, [startDate, endDate, type, rangeType, activeTab, selectedCinemaId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="min-h-screen w-full p-6 md:p-10 space-y-6">
      <DashboardHeader
        rangeType={rangeType}
        setRangeType={setRangeType}
        setStartDate={setStartDate}
        setEndDate={setEndDate}
        type={type}
        setType={setType}
        onRefresh={refresh}
        onExport={() => setShowExportModal(true)}
      />

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Tổng quan hệ thống</TabsTrigger>
          <TabsTrigger value="cinema">Chi tiết từng rạp</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            revenue={revenue}
            counts={counts}
            dailyRevenue={dailyRevenue}
            byMovie={byMovie}
            byCinema={byCinema}
            loading={loading}
            rangeType={rangeType}
            startDate={startDate}
            endDate={endDate}
            setSelectedItem={setSelectedItem}
          />
        </TabsContent>

        <TabsContent value="cinema">
          <CinemaTab
            cinemas={cinemas}
            selectedCinemaId={selectedCinemaId}
            setSelectedCinemaId={setSelectedCinemaId}
            revenue={revenue}
            dailyRevenue={dailyRevenue}
            byMovie={byMovie}
            loading={loading}
            setSelectedItem={setSelectedItem}
          />
        </TabsContent>
      </Tabs>

      <RevenueDetailDialog
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
        selectedItem={selectedItem}
      />
    </div>
  );
}
