import { DailyRevenueBreakdown } from "@/services";

export type ChartItem = {
    name: string;
    revenue: number;
    ticketRevenue: number;
    fnbRevenue: number;
    occupancyRate: number;
    dailyBreakdown?: DailyRevenueBreakdown[];
};

export const PIE_COLORS: string[] = ["#4f46e5", "#22c55e"];

export const DATE_RANGE_OPTIONS = [
    { label: "Hôm nay", value: "today" },
    { label: "Hôm qua", value: "yesterday" },
    { label: "Tuần này", value: "week" },
    { label: "7 ngày qua", value: "last7days" },
    { label: "Tháng này", value: "month" },
    { label: "Tháng trước", value: "lastMonth" },
    { label: "6 tháng qua", value: "last6months" },
    { label: "1 năm", value: "year" },
];

export const fmtNumber = (n: number | string): string =>
    new Intl.NumberFormat().format(Number(n) || 0);

export const fmtVND = (n: number | string): string =>
    new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(Math.max(0, Math.round(Number(n) || 0)));

export const truncateText = (text: string, maxLength: number = 15) => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

export const calculateDateRange = (type: string) => {
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

export const getVnStartDayInUtc = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const utcMidnight = Date.UTC(y, m - 1, d);
    return new Date(utcMidnight - 7 * 3600 * 1000).toISOString();
};

export const getVnEndDayInUtc = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const utcMidnightNextDay = Date.UTC(y, m - 1, d + 1);
    return new Date(utcMidnightNextDay - 7 * 3600 * 1000 - 1).toISOString();
};
