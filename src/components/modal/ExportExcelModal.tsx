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
    fixedCinemaId?: string; // If provided, locks the cinema selection
};

export default function ExportExcelModal({
    open,
    onClose,
    initialStartDate,
    initialEndDate,
    initialType,
    fixedCinemaId,
}: Props) {
    const [loading, setLoading] = useState(false);
    const [cinemas, setCinemas] = useState<Cinema[]>([]);

    // Form State
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
            if (fixedCinemaId) {
                setCinemaId(fixedCinemaId);
            }
        }
    }, [open, initialStartDate, initialEndDate, initialType, fixedCinemaId]);

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

    const handleExport = async () => {
        try {
            setLoading(true);
            const apiType = type === "all" ? undefined : type;
            const apiCinemaId = cinemaId === "all" ? undefined : cinemaId;

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
                    startDate,
                    endDate,
                    type: apiType,
                    cinemaId: apiCinemaId,
                }),
                dashboardService.getRevenueByPeriodAndMovie({
                    startDate,
                    endDate,
                    type: apiType,
                    cinemaId: apiCinemaId,
                }),
                dashboardService.getRevenueByPeriodAndCinema({
                    startDate,
                    endDate,
                    type: apiType,
                    cinemaId: apiCinemaId,
                }),
            ]);

            // 2. Prepare Data for Excel
            const wb = XLSX.utils.book_new();

            // --- Sheet 1: Tổng Quan (Overview) ---
            const overviewData: (string | number | undefined)[][] = [
                ["BÁO CÁO DOANH THU HỆ THỐNG CINEMAGO"],
                [""],
                ["Từ ngày", startDate],
                ["Đến ngày", endDate],
                ["Loại đơn", type.toUpperCase()],
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
                ["Tổng doanh thu", revPeriod.totalRevenue],
                ["Doanh thu vé", revPeriod.totalTicketRevenue],
                ["Doanh thu F&B", revPeriod.totalFoodDrinkRevenue],

            );
            const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
            // Auto-width columns
            wsOverview["!cols"] = [{ wch: 25 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(wb, wsOverview, "TongQuan");

            // --- Sheet 2: Doanh Thu Theo Phim (Movies) ---
            const movieData = (revMovie.sortedMovies?.length ? revMovie.sortedMovies : revMovie.moviesRevenue || []).map(item => ({
                "Tên Phim": item.movie?.name || item.movie?.title || "N/A",
                "Tổng Doanh Thu": item.totalRevenue,
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

            // --- Sheet 3: Doanh Thu Theo Rạp (Cinemas) ---
            const cinemaData = (revCinema.sortedCinemas?.length ? revCinema.sortedCinemas : revCinema.cinemasRevenue || []).map(item => ({
                "Tên Rạp": item.cinema?.name || "N/A",
                "Tổng Doanh Thu": item.totalRevenue,
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
