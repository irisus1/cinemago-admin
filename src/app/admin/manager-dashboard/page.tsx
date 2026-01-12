"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import {
    CinemaRevenueItem,
    DailyRevenueGlobal,
    dashboardService,
    cinemaService,
    DateRangeParams,
    MovieRevenueItem,
    PeakHourItem,
    DailyRevenueBreakdown,
} from "@/services";
import {
    ChartItem,
    DATE_RANGE_OPTIONS,
    calculateDateRange,
    getVnEndDayInUtc,
    getVnStartDayInUtc,
    aggregateByMonth,
    type ChartItem as ChartItemType,
} from "@/components/dashboard/utils";
import ExportExcelModal from "@/components/modal/ExportExcelModal";
import RevenueDetailDialog from "@/components/dashboard/RevenueDetailDialog";

import { ManagerDashboardHeader } from "@/components/dashboard/manager/ManagerDashboardHeader";
import { ManagerSummaryCards } from "@/components/dashboard/manager/ManagerSummaryCards";
import { ManagerRevenueChart } from "@/components/dashboard/manager/ManagerRevenueChart";
import { ManagerPeakHoursChart } from "@/components/dashboard/manager/ManagerPeakHoursChart";
import { ManagerTopMoviesChart } from "@/components/dashboard/manager/ManagerTopMoviesChart";
import { ManagerPerformanceTable } from "@/components/dashboard/manager/ManagerPerformanceTable";
export default function ManagerDashboard() {
    const { user } = useAuth();

    const [cinemaName, setCinemaName] = useState<string>("Rạp của bạn");

    useEffect(() => {
        if (user?.role === "MANAGER" && user.cinemaId) {
            const fetchCinema = async () => {
                try {
                    const res = await cinemaService.getCinemaById(user.cinemaId!);
                    setCinemaName(res.name);
                } catch (e) {
                    console.error("Failed to fetch cinema name", e);
                }
            };
            fetchCinema();
        }
    }, [user]);

    // Date Logic
    // --- STATE ---
    const [rangeType, setRangeType] = useState<string>("month");
    const [startDate, setStartDate] = useState(() => calculateDateRange("month").start);
    const [endDate, setEndDate] = useState(() => calculateDateRange("month").end);
    const [type, setType] = useState<string>("all");

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

    const [topMovies, setTopMovies] = useState<ChartItem[]>([]);
    // State for Peak Hours
    const [peakHours, setPeakHours] = useState<PeakHourItem[]>([]);
    const [maxPeak, setMaxPeak] = useState<number>(0);
    const [peakSummary, setPeakSummary] = useState({ totalTickets: 0, totalBookings: 0 });

    const [selectedItem, setSelectedItem] = useState<ChartItem | null>(null);

    const [movieTableData, setMovieTableData] = useState<ChartItem[]>([]);
    const [dailyRevenue, setDailyRevenue] = useState<DailyRevenueGlobal[]>([]);

    // Helpers
    const mapMovieRevenue = (
        rbm: MovieRevenueItem[] | null | undefined,
        shouldAggregate: boolean
    ): ChartItem[] => {
        // Safety check: if api returns { data: [...] } instead of [...]
        const list = Array.isArray(rbm) ? rbm : [];

        return list.map((item) => {
            const name = item.movie?.name ?? item.movie?.title ?? "(Không xác định)";

            // Explicitly type to allow assignment of aggregated result
            let breakdown: (DailyRevenueBreakdown | DailyRevenueGlobal)[] = item.dailyBreakdown || [];
            if (shouldAggregate) {
                breakdown = aggregateByMonth(breakdown);
            }

            return {
                name,
                revenue: Number(item.totalRevenue ?? 0),
                ticketRevenue: Number(item.ticketRevenue ?? item.totalTicketRevenue ?? 0),
                fnbRevenue: Number(item.foodDrinkRevenue ?? item.totalFoodDrinkRevenue ?? 0),
                occupancyRate: Number(item.occupancyRate ?? 0),
                dailyBreakdown: breakdown,
                // Casts are still here because we haven't updated Movie type yet. 
                // To be fully clean we should update Movie type, but let's fix the main regression first.
                image: (item.movie as any)?.thumbnail,
                rating: (item.movie as any)?.rating,
                bookedSeats: Number(item.bookedSeats ?? 0),
                totalSeats: Number(item.totalSeats ?? 0),
            };
        }).sort((a, b) => b.revenue - a.revenue);
    };

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
            const formattedStartDate = getVnStartDayInUtc(startDate);
            const formattedEndDate = getVnEndDayInUtc(endDate);

            const apiType = type === "all" ? undefined : type;

            const [summaryRes, revMovieRes, peakRes] = await Promise.all([
                dashboardService.getRevenueByPeriod({
                    startDate: formattedStartDate,
                    endDate: formattedEndDate,
                    type: apiType,
                    cinemaId,
                }),
                dashboardService.getRevenueByPeriodAndMovie({
                    startDate: formattedStartDate,
                    endDate: formattedEndDate,
                    type: apiType,
                    cinemaId,
                }),
                dashboardService.getPeakHoursInMonth({
                    month: Number(selectedMonth),
                    year: Number(selectedYear),
                    cinemaId: user.cinemaId,
                    type: apiType,
                })
            ]);

            // summaryRes is now RevenueByPeriod { summary: {...}, daily: [...] }
            setSummary({
                totalRevenue: summaryRes.summary.totalRevenue,
                ticketRevenue: summaryRes.summary.totalTicketRevenue,
                fnbRevenue: summaryRes.summary.totalFoodDrinkRevenue,
                avgOccupancy: summaryRes.summary.occupancyRate || 0,
            });

            const isLongRange = ["last6months", "year"].includes(rangeType);
            let processedDaily = summaryRes.daily || [];
            if (isLongRange) {
                processedDaily = aggregateByMonth(processedDaily);
            }
            setDailyRevenue(processedDaily);

            // Correctly map and aggregate movie data
            const sortedMovies = mapMovieRevenue(revMovieRes, isLongRange);

            setTopMovies(sortedMovies.slice(0, 5));
            setMovieTableData(sortedMovies); // All for Table

            // Peak Hours - directly use the items from service
            setPeakHours(peakRes.allHours || []);
            setMaxPeak(peakRes.topPeakHour?.ticketCount || 0);
            setPeakSummary({
                totalTickets: peakRes.summary?.totalTickets || 0,
                totalBookings: peakRes.summary?.totalBookings || 0
            });

        } catch (error) {
            console.error("Failed to load dashboard data", error);
            // Reset data on error to avoid stale charts
            setSummary({
                totalRevenue: 0,
                ticketRevenue: 0,
                fnbRevenue: 0,
                avgOccupancy: 0,
            });
            setTopMovies([]);
            setMovieTableData([]);
            setDailyRevenue([]);
            setPeakHours([]);
            setPeakSummary({ totalTickets: 0, totalBookings: 0 });
        } finally {
            setLoading(false);
        }
    }, [user, startDate, endDate, rangeType, selectedMonth, selectedYear, type]);

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
            <ManagerDashboardHeader
                rangeType={rangeType}
                setRangeType={setRangeType}
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                loading={loading}
                onRefresh={refresh}
                onExport={() => setShowExportModal(true)}
                cinemaName={cinemaName}
                type={type}
                setType={setType}
            />

            <ExportExcelModal
                open={showExportModal}
                onClose={() => setShowExportModal(false)}
                initialStartDate={startDate}
                initialEndDate={endDate}
                initialRangeType={rangeType}
                fixedCinemaId={user?.cinemaId}
            />

            <RevenueDetailDialog
                open={!!selectedItem}
                onOpenChange={(open) => !open && setSelectedItem(null)}
                selectedItem={selectedItem}
            />

            <ManagerSummaryCards summary={summary} loading={loading} />

            <ManagerRevenueChart data={dailyRevenue} loading={loading} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ManagerPeakHoursChart
                    peakHours={peakHours}
                    maxPeak={maxPeak}
                    peakSummary={peakSummary}
                    loading={loading}
                    selectedMonth={selectedMonth}
                    setSelectedMonth={setSelectedMonth}
                    selectedYear={selectedYear}
                    setSelectedYear={setSelectedYear}
                    currentYear={currentYear}
                />

                <ManagerTopMoviesChart data={topMovies} loading={loading} />
            </div>

            <ManagerPerformanceTable
                data={movieTableData}
                loading={loading}
                setSelectedItem={setSelectedItem}
            />
        </div>
    );
}
