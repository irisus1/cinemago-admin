"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
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
};

export default function ExportExcelModal({
    open,
    onClose,
    initialStartDate,
    initialEndDate,
    initialType,
}: Props) {
    const [loading, setLoading] = useState(false);
    const [cinemas, setCinemas] = useState<Cinema[]>([]);

    // Form State
    const [startDate, setStartDate] = useState(initialStartDate);
    const [endDate, setEndDate] = useState(initialEndDate);
    const [type, setType] = useState<string>(
        initialType === "all" || !initialType ? "all" : initialType
    );
    const [cinemaId, setCinemaId] = useState<string>("all");

    // Sync props to state when modal opens
    useEffect(() => {
        if (open) {
            setStartDate(initialStartDate);
            setEndDate(initialEndDate);
            setType(initialType === "all" || !initialType ? "all" : initialType);
            // Keep cinemaId as is or reset if needed? Let's keep it "all" by default or user choice
        }
    }, [open, initialStartDate, initialEndDate, initialType]);

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

            const blob = await dashboardService.exportRevenue({
                startDate,
                endDate,
                type: apiType,
                cinemaId: apiCinemaId,
            });

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `DoanhThu_${startDate}_${endDate}.xlsx`; // Tên file
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success("Xuất file báo cáo thành công!");
            onClose();
        } catch (error) {
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

                    {/* Row 2: Type */}
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

                    {/* Row 3: Cinema */}
                    <div className="space-y-2">
                        <Label>Rạp chiếu</Label>
                        <Select value={cinemaId} onValueChange={setCinemaId}>
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
