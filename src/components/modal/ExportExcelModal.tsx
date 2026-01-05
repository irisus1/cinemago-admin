"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DateNativeVN } from "../DateNativeVN";
import { dashboardService, cinemaService, type Cinema } from "@/services";

type Props = {
    open: boolean;
    onClose: () => void;
    initialStartDate: string;
    initialEndDate: string;
    initialType?: string; // "online" | "offline" | "all"
    initialRangeType?: string;
    fixedCinemaId?: string; // If provided, locks the cinema selection
};

export default function ExportExcelModal({
    open,
    onClose,
    initialStartDate,
    initialEndDate,
    initialType,
    initialRangeType,
    fixedCinemaId,
}: Props) {
    const [loading, setLoading] = useState(false);
    const [cinemas, setCinemas] = useState<Cinema[]>([]);

    // Date Range Logic from Dashboard
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
                const day = today.getDay();
                const diff = today.getDate() - day + (day === 0 ? -6 : 1);
                start.setDate(diff);
                break;
            case "last7days":
                start.setDate(today.getDate() - 7);
                break;
            case "month":
                start.setDate(1);
                break;
            case "lastMonth":
                start.setMonth(start.getMonth() - 1);
                start.setDate(1);
                end.setDate(0);
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

    // Form State
    const [rangeType, setRangeType] = useState<string>(initialRangeType || "custom");
    const [startDate, setStartDate] = useState(initialStartDate);
    const [endDate, setEndDate] = useState(initialEndDate);
    const [type, setType] = useState<string>(
        initialType === "all" || !initialType ? "all" : initialType
    );
    const [cinemaId, setCinemaId] = useState<string>(fixedCinemaId || "all");

    // Sync props to state when modal opens
    useEffect(() => {
        if (open) {
            setStartDate(initialStartDate);
            setEndDate(initialEndDate);
            setType(initialType === "all" || !initialType ? "all" : initialType);
            if (initialRangeType) {
                setRangeType(initialRangeType);
            }
            if (fixedCinemaId) {
                setCinemaId(fixedCinemaId);
            }
        }
    }, [open, initialStartDate, initialEndDate, initialType, initialRangeType, fixedCinemaId]);

    // Fetch cinemas on mount
    useEffect(() => {
        const fetchCinemas = async () => {
            try {
                const res = await cinemaService.getAllCinemas();
                setCinemas(res.data ?? []);
            } catch (error) {
                console.error("Failed to load cinemas", error);
            }
        };
        fetchCinemas();
    }, []);

    // Validating helpers
    const getVnStartDayInUtc = (dateStr: string) => {
        const [y, m, d] = dateStr.split("-").map(Number);
        const utcMidnight = Date.UTC(y, m - 1, d);
        return new Date(utcMidnight - 7 * 3600 * 1000).toISOString();
    };

    const getVnEndDayInUtc = (dateStr: string) => {
        const [y, m, d] = dateStr.split("-").map(Number);
        const utcMidnightNextDay = Date.UTC(y, m - 1, d + 1);
        return new Date(utcMidnightNextDay - 7 * 3600 * 1000 - 1).toISOString();
    };

    const handleExport = async () => {
        try {
            setLoading(true);
            const apiType = type === "all" ? undefined : type;
            const apiCinemaId = cinemaId === "all" ? undefined : cinemaId;
            const formattedStartDate = getVnStartDayInUtc(startDate);
            const formattedEndDate = getVnEndDayInUtc(endDate);

            // 1. Fetch Data Parallelly
            // Note: Managers (fixedCinemaId) cannot see global counts (users, total cinemas, total movies)
            const isManager = !!fixedCinemaId;

            const [
                usersCount,
                cinemasCount,
                moviesCount,
                revPeriod,
                revMovie,
                revCinema
            ] = await Promise.all([
                !isManager ? dashboardService.getUserCount() : Promise.resolve(0),
                !isManager ? dashboardService.getCinemaCount() : Promise.resolve(0),
                !isManager ? dashboardService.getMovieCount() : Promise.resolve(0),
                dashboardService.getRevenueByPeriod({
                    startDate: formattedStartDate,
                    endDate: formattedEndDate,
                    type: apiType,
                    cinemaId: apiCinemaId,
                }),
                dashboardService.getRevenueByPeriodAndMovie({
                    startDate: formattedStartDate,
                    endDate: formattedEndDate,
                    type: apiType,
                    cinemaId: apiCinemaId,
                }),
                dashboardService.getRevenueByPeriodAndCinema({
                    startDate: formattedStartDate,
                    endDate: formattedEndDate,
                    type: apiType,
                    cinemaId: apiCinemaId,
                }),
            ]);

            // 2. Prepare Data for Excel
            const wb = XLSX.utils.book_new();

            const formatDateVN = (isoDate: string) => {
                if (!isoDate) return "";
                const [y, m, d] = isoDate.split("-");
                return `${d}-${m}-${y}`;
            }

            const getTypeName = (t: string) => {
                if (t === "all") return "Tất cả (online, tại quầy)";
                if (t === "online") return "Online";
                return "Tại quầy (Offline)";
            };

            // --- Sheet 1: Tổng Quan (Overview) ---
            const overviewData: (string | number | undefined)[][] = [
                ["BÁO CÁO DOANH THU HỆ THỐNG CINEMAGO"],
                [""],
                ["Từ ngày", formatDateVN(startDate)],
                ["Đến ngày", formatDateVN(endDate)],
                ["Loại đơn", getTypeName(type)],
                ["Rạp áp dụng", cinemaId === "all" ? "Tất cả" : cinemas.find(c => c.id === cinemaId)?.name || cinemaId],
                [""],
            ];

            if (!isManager) {
                overviewData.push(
                    ["CHỈ SỐ TỔNG QUAN"],
                    ["Tổng người dùng", usersCount],
                    ["Tổng số rạp", cinemasCount],
                    ["Tổng số phim", moviesCount],
                    [""]
                );
            }

            overviewData.push(
                ["DOANH THU"],
                ["Tổng doanh thu", revPeriod.summary?.totalRevenue ?? 0],
                ["Doanh thu vé", revPeriod.summary?.totalTicketRevenue ?? 0],
                ["Doanh thu F&B", revPeriod.summary?.totalFoodDrinkRevenue ?? 0],
            );
            const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
            wsOverview["!cols"] = [{ wch: 25 }, { wch: 30 }];
            XLSX.utils.book_append_sheet(wb, wsOverview, "TongQuan");

            // --- Sheet 2: Doanh Thu Theo Phim (Movies) ---
            // Fallback to empty array if response is null/undefined
            const moviesList = Array.isArray(revMovie) ? revMovie : [];

            const movieData = moviesList.map(item => ({
                "Tên Phim": item.movie?.name || item.movie?.title || "N/A",
                "Tổng Doanh Thu": item.totalRevenue ?? 0,
                "Doanh Thu Vé": item.ticketRevenue ?? 0,
                "Doanh Thu F&B": item.foodDrinkRevenue ?? 0,
                "Ghế Đã Đặt": item.bookedSeats ?? 0,
                "Tổng Ghế": item.totalSeats ?? 0,
                "Tỉ Lệ Lấp Đầy (%)": item.occupancyRate ?? 0
            }));
            const wsMovies = XLSX.utils.json_to_sheet(movieData);
            wsMovies["!cols"] = [
                { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }
            ];
            XLSX.utils.book_append_sheet(wb, wsMovies, "DoanhThuPhim");

            // --- Sheet 3: Chi Tiết Doanh Thu Phim (Movie Daily Breakdown) ---
            const movieDetailData: any[] = [];
            moviesList.forEach((movie) => {
                const breakdown = movie.dailyBreakdown || [];
                breakdown.forEach((day: any) => {
                    movieDetailData.push({
                        "Tên Phim": movie.movie?.name || movie.movie?.title || "N/A",
                        "Ngày": formatDateVN(day.date),
                        "Tổng Doanh Thu": day.totalRevenue ?? 0,
                        "Doanh Thu Vé": day.ticketRevenue ?? 0,
                        "Doanh Thu F&B": day.foodDrinkRevenue ?? 0,
                        "Ghế Đã Đặt": day.bookedSeats ?? 0,
                        "Tổng Ghế": day.totalSeats ?? 0,
                        "Tỉ Lệ Lấp Đầy (%)": day.occupancyRate ?? 0
                    });
                });
            });

            if (movieDetailData.length > 0) {
                const wsMovieDetails = XLSX.utils.json_to_sheet(movieDetailData);
                wsMovieDetails["!cols"] = [
                    { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }
                ];
                XLSX.utils.book_append_sheet(wb, wsMovieDetails, "ChiTietPhim");
            }

            // --- Sheet 4: Doanh Thu Theo Rạp (Cinemas) ---
            const cinemasList = Array.isArray(revCinema) ? revCinema : [];

            const cinemaData = cinemasList.map(item => ({
                "Tên Rạp": item.cinema?.name || "N/A",
                "Tổng Doanh Thu": item.totalRevenue ?? 0,
                "Doanh Thu Vé": item.ticketRevenue ?? 0,
                "Doanh Thu F&B": item.foodDrinkRevenue ?? 0,
                "Ghế Đã Đặt": item.bookedSeats ?? 0,
                "Tổng Ghế": item.totalSeats ?? 0,
                "Tỉ Lệ Lấp Đầy (%)": item.occupancyRate ?? 0
            }));
            const wsCinemas = XLSX.utils.json_to_sheet(cinemaData);
            wsCinemas["!cols"] = [
                { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }
            ];
            XLSX.utils.book_append_sheet(wb, wsCinemas, "DoanhThuRap");

            // --- Sheet 5: Chi Tiết Doanh Thu Rạp (Cinema Daily Breakdown) ---
            const cinemaDetailData: any[] = [];
            cinemasList.forEach((cinema) => {
                const breakdown = cinema.dailyBreakdown || [];
                breakdown.forEach((day: any) => {
                    cinemaDetailData.push({
                        "Tên Rạp": cinema.cinema?.name || "N/A",
                        "Ngày": formatDateVN(day.date),
                        "Tổng Doanh Thu": day.totalRevenue ?? 0,
                        "Doanh Thu Vé": day.ticketRevenue ?? 0,
                        "Doanh Thu F&B": day.foodDrinkRevenue ?? 0,
                        "Ghế Đã Đặt": day.bookedSeats ?? 0,
                        "Tổng Ghế": day.totalSeats ?? 0,
                        "Tỉ Lệ Lấp Đầy (%)": day.occupancyRate ?? 0
                    });
                });
            });

            if (cinemaDetailData.length > 0) {
                const wsCinemaDetails = XLSX.utils.json_to_sheet(cinemaDetailData);
                wsCinemaDetails["!cols"] = [
                    { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }
                ];
                XLSX.utils.book_append_sheet(wb, wsCinemaDetails, "ChiTietRap");
            }

            // 3. Write File
            XLSX.writeFile(wb, `BaoCaoDoanhThu_${startDate}_${endDate}.xlsx`);

            toast.success("Xuất file báo cáo thành công!");
            onClose();
        } catch (error) {
            console.error("Export Error:", error);
            toast.error("Xuất báo cáo thất bại");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Xuất báo cáo doanh thu</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Range Select */}
                    <div className="space-y-2">
                        <Label>Khoảng thời gian</Label>
                        <Select
                            value={rangeType}
                            onValueChange={(val) => {
                                setRangeType(val);
                                const { start, end } = calculateDateRange(val);
                                setStartDate(start);
                                setEndDate(end);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn khoảng thời gian" />
                            </SelectTrigger>
                            <SelectContent>
                                {DATE_RANGE_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Row 1: Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Từ ngày</Label>
                            <DateNativeVN
                                valueISO={startDate}
                                onChangeISO={setStartDate}
                                widthClass="w-full"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Đến ngày</Label>
                            <DateNativeVN
                                valueISO={endDate}
                                onChangeISO={setEndDate}
                                widthClass="w-full"
                            />
                        </div>
                    </div>

                    {/* Row 2 & 3: Type & Cinema in same row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Loại đơn</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả</SelectItem>
                                    <SelectItem value="online">Online</SelectItem>
                                    <SelectItem value="offline">Offline</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Rạp chiếu</Label>
                            <Select
                                value={cinemaId}
                                onValueChange={setCinemaId}
                                disabled={!!fixedCinemaId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn rạp (hoặc tất cả)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả rạp</SelectItem>
                                    {cinemas.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Hủy
                    </Button>
                    <Button onClick={handleExport} disabled={loading} className="gap-2">
                        <Download className="h-4 w-4" />
                        {loading ? "Đang xuất..." : "Xuất Excel"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
