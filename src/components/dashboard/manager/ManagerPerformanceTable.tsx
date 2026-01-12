import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Eye } from "lucide-react";
import { ChartItem, fmtVND, fmtPercent } from "../utils";

interface ManagerPerformanceTableProps {
    data: ChartItem[];
    loading: boolean;
    setSelectedItem: (item: ChartItem) => void;
}

export function ManagerPerformanceTable({ data, loading, setSelectedItem }: ManagerPerformanceTableProps) {
    return (
        <Card className="shadow-sm border-0 ring-1 ring-gray-200 overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b">
                <CardTitle className="text-lg">Chi tiết hiệu suất phim</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                        <tr>
                            <th className="px-6 py-4">Phim</th>
                            <th className="px-6 py-4 text-center">Đánh giá</th>
                            <th className="px-6 py-4 text-center">Ghế đặt/Tổng</th>
                            <th className="px-6 py-4 text-right">Doanh thu Vé</th>
                            <th className="px-6 py-4 text-right">F&B</th>
                            <th className="px-6 py-4 text-right">Tổng thu</th>
                            <th className="px-6 py-4 text-center w-[200px]">Tỷ lệ lấp đầy</th>
                            <th className="px-6 py-4 text-center">Chi tiết</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            [...Array(3)].map((_, i) => (
                                <tr key={i}>
                                    <td colSpan={8} className="px-6 py-4">
                                        <div className="h-6 w-full bg-muted/20 animate-pulse rounded" />
                                    </td>
                                </tr>
                            ))
                        ) : data.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="px-6 py-8 text-center text-gray-500"
                                >
                                    Không có dữ liệu trong khoảng thời gian này.
                                </td>
                            </tr>
                        ) : (
                            data.map((item, idx) => (
                                <tr
                                    key={idx}
                                    className="hover:bg-gray-50/50 transition-colors"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {item.image ? (
                                                <img
                                                    src={item.image}
                                                    alt={item.name}
                                                    className="w-10 h-14 object-cover rounded shadow-sm"
                                                />
                                            ) : (
                                                <div className="w-10 h-14 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                                                    No img
                                                </div>
                                            )}
                                            <span className="font-medium text-gray-900 max-w-[200px] truncate" title={item.name}>
                                                {item.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {item.rating ? (
                                            <div className="flex items-center justify-center gap-1 text-yellow-500 font-medium">
                                                <span>{item.rating}</span>
                                                <Star className="w-3 h-3 fill-current" />
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center text-gray-600">
                                        <span className="font-semibold text-indigo-600">
                                            {item.bookedSeats}
                                        </span>
                                        <span className="text-gray-400 mx-1">/</span>
                                        <span>{item.totalSeats}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-600">
                                        {fmtVND(item.ticketRevenue)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-600">
                                        {fmtVND(item.fnbRevenue)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                        {fmtVND(item.revenue)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1 w-full">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="font-medium">{fmtPercent(item.occupancyRate)}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                <div
                                                    className={`h-2.5 rounded-full transition-all duration-300 ${(item.occupancyRate || 0) > 70
                                                            ? "bg-green-500"
                                                            : (item.occupancyRate || 0) > 30
                                                                ? "bg-yellow-500"
                                                                : "bg-red-500"
                                                        }`}
                                                    style={{ width: `${Math.min(item.occupancyRate || 0, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setSelectedItem(item)}
                                            className="hover:bg-indigo-50 text-indigo-600"
                                            title="Xem chi tiết"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
