"use client";

import { useEffect, useState, useCallback } from "react";
import {
    dashboardService,
    cinemaService,
    MovieRevenueItem,
    PeakHourItem,
    DailyRevenueBreakdown,
    DailyRevenueGlobal,
} from "@/services";
import {
    ChartItem,
    calculateDateRange,
    getVnEndDayInUtc,
    getVnStartDayInUtc,
    aggregateByMonth,
} from "@/components/dashboard/utils";
import ExportExcelModal from "@/components/modal/ExportExcelModal";
import RevenueDetailDialog from "@/components/dashboard/RevenueDetailDialog";

import { ManagerDashboardHeader } from "@/components/dashboard/manager/ManagerDashboardHeader";
import { ManagerSummaryCards } from "@/components/dashboard/manager/ManagerSummaryCards";
import { ManagerRevenueChart } from "@/components/dashboard/manager/ManagerRevenueChart";
import { ManagerPeakHoursChart } from "@/components/dashboard/manager/ManagerPeakHoursChart";
import { ManagerTopMoviesChart } from "@/components/dashboard/manager/ManagerTopMoviesChart";
import { ManagerPerformanceTable } from "@/components/dashboard/manager/ManagerPerformanceTable";

interface CinemaDetailViewProps {
    cinemaId: string;
    initialRangeType?: string;
    showCinemaNameHeader?: boolean;
}

export default function CinemaDetailView({
    cinemaId,
    initialRangeType = "month",
    showCinemaNameHeader = true,
}: CinemaDetailViewProps) {
    // --- STATE ---
    const [cinemaName, setCinemaName] = useState<string>("Đang tải...");

    // Date Logic
    const [rangeType, setRangeType] = useState<string>(initialRangeType);
    const [startDate, setStartDate] = useState(() => calculateDateRange(initialRangeType).start);
    const [endDate, setEndDate] = useState(() => calculateDateRange(initialRangeType).end);
    const [type, setType] = useState<string>("all");

    // Export
    const [showExportModal, setShowExportModal] = useState(false);

    // Data
    const [loading, setLoading] = useState<boolean>(true);
    const [summary, setSummary] = useState({
        totalRevenue: 0,
        ticketRevenue: 0,
        fnbRevenue: 0,
        avgOccupancy: 0,
    });

    const [topMovies, setTopMovies] = useState<ChartItem[]>([]);
    const [movieTableData, setMovieTableData] = useState<ChartItem[]>([]);
    const [dailyRevenue, setDailyRevenue] = useState<DailyRevenueGlobal[]>([]);

    // Peak Hours
    const currentYear = new Date().getFullYear();
    const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
    const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
    const [peakHours, setPeakHours] = useState<PeakHourItem[]>([]);
    const [maxPeak, setMaxPeak] = useState<number>(0);
    const [peakSummary, setPeakSummary] = useState({ totalTickets: 0, totalBookings: 0 });

    const [selectedItem, setSelectedItem] = useState<ChartItem | null>(null);

    // Helpers
    const mapMovieRevenue = (
        rbm: MovieRevenueItem[] | null | undefined,
        shouldAggregate: boolean
    ): ChartItem[] => {
        const list = Array.isArray(rbm) ? rbm : [];
        return list
            .map((item) => {
                const name = item.movie?.name ?? item.movie?.title ?? "(Không xác định)";
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
                    image: (item.movie as any)?.thumbnail,
                    rating: (item.movie as any)?.rating,
                    bookedSeats: Number(item.bookedSeats ?? 0),
                    totalSeats: Number(item.totalSeats ?? 0),
                };
            })
            .sort((a, b) => b.revenue - a.revenue);
    };

    // Fetch Cinema Name
    useEffect(() => {
        const fetchCinemaInfo = async () => {
            if (cinemaId) {
                try {
                    const res = await cinemaService.getCinemaById(cinemaId);
                    setCinemaName(res.name || "Rạp không xác định");
                } catch (error) {
                    console.error("Lỗi lấy tên rạp:", error);
                    setCinemaName("Lỗi tải tên rạp");
                }
            }
        };
        fetchCinemaInfo();
    }, [cinemaId]);

    // Main Fetch
    const refresh = useCallback(async () => {
        if (!cinemaId) return;
        setLoading(true);

        try {
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
                    cinemaId: cinemaId,
                    type: apiType,
                }),
            ]);

            // Summary
            setSummary({
                totalRevenue: summaryRes.summary.totalRevenue,
                ticketRevenue: summaryRes.summary.totalTicketRevenue,
                fnbRevenue: summaryRes.summary.totalFoodDrinkRevenue,
                avgOccupancy: summaryRes.summary.occupancyRate || 0,
            });

            // Daily Chart
            const isLongRange = ["last6months", "year"].includes(rangeType);
            let processedDaily = summaryRes.daily || [];
            if (isLongRange) {
                processedDaily = aggregateByMonth(processedDaily);
            }
            setDailyRevenue(processedDaily);

            // Movies
            const sortedMovies = mapMovieRevenue(revMovieRes, isLongRange);
            setTopMovies(sortedMovies.slice(0, 5));
            setMovieTableData(sortedMovies);

            // Peak Hours
            setPeakHours(peakRes.allHours || []);
            setMaxPeak(peakRes.topPeakHour?.ticketCount || 0);
            setPeakSummary({
                totalTickets: peakRes.summary?.totalTickets || 0,
                totalBookings: peakRes.summary?.totalBookings || 0,
            });
        } catch (error) {
            console.error("Failed to load dashboard data", error);
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
    }, [cinemaId, startDate, endDate, rangeType, selectedMonth, selectedYear, type]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return (
        <div className="space-y-8">
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
                cinemaName={showCinemaNameHeader ? cinemaName : undefined}
                type={type}
                setType={setType}
            />

            <ExportExcelModal
                open={showExportModal}
                onClose={() => setShowExportModal(false)}
                initialStartDate={startDate}
                initialEndDate={endDate}
                initialRangeType={rangeType}
                fixedCinemaId={cinemaId}
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
