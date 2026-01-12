import { DollarSign, Ticket, Utensils } from "lucide-react";
import MetricCard from "../MetricCard";
import { fmtVND } from "../utils";

interface SummaryData {
    totalRevenue: number;
    ticketRevenue: number;
    fnbRevenue: number;
}

interface ManagerSummaryCardsProps {
    summary: SummaryData;
    loading: boolean;
}

export function ManagerSummaryCards({ summary, loading }: ManagerSummaryCardsProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
                title="Tổng doanh thu"
                value={fmtVND(summary.totalRevenue)}
                icon={<DollarSign className="w-5 h-5 text-green-600" />}
                loading={loading}
            />
            <MetricCard
                title="Doanh thu Vé"
                value={fmtVND(summary.ticketRevenue)}
                icon={<Ticket className="w-5 h-5 text-blue-600" />}
                loading={loading}
            />
            <MetricCard
                title="Doanh thu F&B"
                value={fmtVND(summary.fnbRevenue)}
                icon={<Utensils className="w-5 h-5 text-orange-600" />}
                loading={loading}
            />
        </div>
    );
}
