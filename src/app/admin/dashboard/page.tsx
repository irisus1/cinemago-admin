"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  dashboardService,
  type MovieRevenueItem,
  type DailyRevenueGlobal,
  type DailyRevenueBreakdown,
  type Cinema,
  type PeakHourItem,
  type CinemaRevenueItem,
} from "@/services";
import ExportExcelModal from "@/components/modal/ExportExcelModal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cinemaService } from "@/services";
import {
  calculateDateRange,
  getVnStartDayInUtc,
  getVnEndDayInUtc,
  ChartItem,
  aggregateByMonth,
} from "@/components/dashboard/utils";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import OverviewTab from "@/components/dashboard/OverviewTab";
import RevenueDetailDialog from "@/components/dashboard/RevenueDetailDialog";
import CinemaDetailView from "@/components/dashboard/CinemaDetailView";
import { ManagerPeakHoursChart } from "@/components/dashboard/manager/ManagerPeakHoursChart"; // Reuse chart

export default function Dashboard() {
  const { user } = useAuth();

  // Tabs State
  const [activeTab, setActiveTab] = useState<string>("overview");

  const initialRange = calculateDateRange("last7days");
  const [rangeType, setRangeType] = useState<string>("last7days");
  const [startDate, setStartDate] = useState<string>(initialRange.start);
  const [endDate, setEndDate] = useState<string>(initialRange.end);
  const [type, setType] = useState<string>("all");

  const [overviewLoading, setOverviewLoading] = useState<boolean>(true);
  const [peakLoading, setPeakLoading] = useState<boolean>(true);
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

  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    (new Date().getMonth() + 1).toString(),
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    currentYear.toString(),
  );
  const [peakHours, setPeakHours] = useState<PeakHourItem[]>([]);
  const [maxPeak, setMaxPeak] = useState<number>(0);
  const [peakSummary, setPeakSummary] = useState({
    totalTickets: 0,
    totalBookings: 0,
  });

  // CACHING REFS
  const overviewCache = useRef<{
    hasLoaded: boolean;
    params: string;
  }>({ hasLoaded: false, params: "" });

  const peakCache = useRef<{
    hasLoaded: boolean;
    params: string;
  }>({ hasLoaded: false, params: "" });

  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [selectedCinemaId, setSelectedCinemaId] = useState<string>("");

  const [showExportModal, setShowExportModal] = useState(false);
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

  // --- HELPERS ---
  const mapMovieRevenue = (
    rbm: MovieRevenueItem[] | null | undefined,
    shouldAggregate: boolean,
  ): ChartItem[] => {
    if (!rbm || !Array.isArray(rbm)) return [];
    const mapped: ChartItem[] = rbm.map((item) => {
      const name = item.movie?.name ?? item.movie?.title ?? "(Không xác định)";
      let breakdown: (DailyRevenueBreakdown | DailyRevenueGlobal)[] =
        item.dailyBreakdown || [];
      if (shouldAggregate) breakdown = aggregateByMonth(breakdown);
      return {
        name,
        revenue: Number(item.totalRevenue ?? 0),
        ticketRevenue: Number(
          item.ticketRevenue ?? item.totalTicketRevenue ?? 0,
        ),
        fnbRevenue: Number(
          item.foodDrinkRevenue ?? item.totalFoodDrinkRevenue ?? 0,
        ),
        occupancyRate: Number(item.occupancyRate ?? 0),
        dailyBreakdown: breakdown,
      };
    });
    return mapped.sort((a, b) => b.revenue - a.revenue).slice(0, 12);
  };

  const mapCinemaRevenue = (
    rbc: CinemaRevenueItem[] | null | undefined,
    shouldAggregate: boolean,
  ): ChartItem[] => {
    if (!rbc || !Array.isArray(rbc)) return [];
    return rbc
      .map((item) => {
        const name = item.cinema?.name ?? "(Không xác định)";
        let breakdown: (DailyRevenueBreakdown | DailyRevenueGlobal)[] =
          item.dailyBreakdown || [];
        if (shouldAggregate) breakdown = aggregateByMonth(breakdown);
        return {
          name,
          revenue: Number(item.totalRevenue ?? 0),
          ticketRevenue: Number(
            item.ticketRevenue ?? item.totalTicketRevenue ?? 0,
          ),
          fnbRevenue: Number(
            item.foodDrinkRevenue ?? item.totalFoodDrinkRevenue ?? 0,
          ),
          occupancyRate: Number(item.occupancyRate ?? 0),
          dailyBreakdown: breakdown,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  };

  const fetchGeneralOverview = useCallback(async () => {
    const paramsSig = `${startDate}-${endDate}-${type}-${rangeType}`;

    if (activeTab !== "overview") return;

    if (
      overviewCache.current.hasLoaded &&
      overviewCache.current.params === paramsSig
    ) {
      return;
    }

    setOverviewLoading(true);
    setError("");

    try {
      const formattedStartDate = getVnStartDayInUtc(startDate);
      const formattedEndDate = getVnEndDayInUtc(endDate);
      const isLongRange = ["last6months", "year"].includes(rangeType);
      const apiType = type === "all" ? undefined : type;

      const [usersCount, cinemasCount, moviesCount] = await Promise.all([
        dashboardService.getUserCount(),
        dashboardService.getCinemaCount(),
        dashboardService.getMovieCount(),
      ]);

      const rev = await dashboardService.getRevenueByPeriod({
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        type: apiType,
      });

      setCounts({
        users: usersCount,
        cinemas: cinemasCount,
        movies: moviesCount,
      });

      setRevenue({
        total: Number(rev.summary.totalRevenue ?? 0),
        fnb: Number(rev.summary.totalFoodDrinkRevenue ?? 0),
        ticket: Number(rev.summary.totalTicketRevenue ?? 0),
      });

      let processedDaily = rev.daily || [];
      if (isLongRange) processedDaily = aggregateByMonth(processedDaily);
      setDailyRevenue(processedDaily);

      const [rbm, rbc] = await Promise.all([
        dashboardService
          .getRevenueByPeriodAndMovie({
            startDate: formattedStartDate,
            endDate: formattedEndDate,
            type: apiType,
          })
          .catch(() => null),
        dashboardService
          .getRevenueByPeriodAndCinema({
            startDate: formattedStartDate,
            endDate: formattedEndDate,
            type: apiType,
          })
          .catch(() => null),
      ]);

      if (rbm) setByMovie(mapMovieRevenue(rbm, isLongRange));
      if (rbc) setByCinema(mapCinemaRevenue(rbc, isLongRange));

      overviewCache.current = { hasLoaded: true, params: paramsSig };
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Có lỗi xảy ra khi tải dữ liệu chung.";
      setError(msg);
    } finally {
      setOverviewLoading(false);
    }
  }, [startDate, endDate, type, rangeType, activeTab]);

  const fetchPeakHoursData = useCallback(async () => {
    const paramsSig = `${selectedMonth}-${selectedYear}-${type}`;

    if (activeTab !== "overview") return;

    if (peakCache.current.hasLoaded && peakCache.current.params === paramsSig) {
      return;
    }

    setPeakLoading(true);

    try {
      const apiType = type === "all" ? undefined : type;
      const peakRes = await dashboardService
        .getPeakHoursInMonth({
          month: Number(selectedMonth),
          year: Number(selectedYear),
          type: apiType,
        })
        .catch(() => null);

      if (peakRes) {
        setPeakHours(peakRes.allHours || []);
        setMaxPeak(peakRes.topPeakHour?.ticketCount || 0);
        setPeakSummary({
          totalTickets: peakRes.summary?.totalTickets || 0,
          totalBookings: peakRes.summary?.totalBookings || 0,
        });
      }
      peakCache.current = { hasLoaded: true, params: paramsSig };
    } catch (e) {
      console.error("Peak hours fetch error", e);
    } finally {
      setPeakLoading(false);
    }
  }, [selectedMonth, selectedYear, type, activeTab]);

  useEffect(() => {
    void fetchGeneralOverview();
  }, [fetchGeneralOverview]);

  useEffect(() => {
    void fetchPeakHoursData();
  }, [fetchPeakHoursData]);

  const [hasVisitedCinema, setHasVisitedCinema] = useState(false);

  useEffect(() => {
    if (activeTab === "cinema" && !hasVisitedCinema) {
      setHasVisitedCinema(true);
    }
  }, [activeTab, hasVisitedCinema]);

  return (
    <div className="min-h-screen w-full p-6 md:p-10 space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="overview">Tổng quan hệ thống</TabsTrigger>
            <TabsTrigger value="cinema">Chi tiết từng rạp</TabsTrigger>
          </TabsList>
        </div>

        <div className={activeTab === "overview" ? "block" : "hidden"}>
          <DashboardHeader
            rangeType={rangeType}
            setRangeType={setRangeType}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            type={type}
            setType={setType}
            onRefresh={() => {
              overviewCache.current.hasLoaded = false;
              peakCache.current.hasLoaded = false;
              fetchGeneralOverview();
              fetchPeakHoursData();
            }}
            onExport={() => setShowExportModal(true)}
          />

          <div className="mt-6">
            <OverviewTab
              revenue={revenue}
              counts={counts}
              dailyRevenue={dailyRevenue}
              byMovie={byMovie}
              byCinema={byCinema}
              loading={overviewLoading}
              rangeType={rangeType}
              startDate={startDate}
              endDate={endDate}
              setSelectedItem={setSelectedItem}
            />
            <div className="mt-6">
              <ManagerPeakHoursChart
                peakHours={peakHours}
                maxPeak={maxPeak}
                peakSummary={peakSummary}
                loading={peakLoading}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                currentYear={currentYear}
              />
            </div>
          </div>
        </div>

        <div className={activeTab === "cinema" ? "block" : "hidden"}>
          {hasVisitedCinema && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-white p-4 rounded-lg shadow-sm">
                <span className="font-semibold whitespace-nowrap">
                  Chọn rạp:
                </span>
                <select
                  className="border rounded px-3 py-2 text-sm max-w-xs"
                  value={selectedCinemaId}
                  onChange={(e) => setSelectedCinemaId(e.target.value)}
                >
                  {cinemas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCinemaId ? (
                <CinemaDetailView
                  key={selectedCinemaId}
                  cinemaId={selectedCinemaId}
                  showCinemaNameHeader={false}
                />
              ) : (
                <div className="p-8 text-center text-gray-500">
                  Đang tải danh sách rạp...
                </div>
              )}
            </div>
          )}
        </div>
      </Tabs>

      <ExportExcelModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        initialStartDate={startDate}
        initialEndDate={endDate}
        initialType={type}
        initialRangeType={rangeType}
      />

      <RevenueDetailDialog
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
        selectedItem={selectedItem}
      />
    </div>
  );
}
