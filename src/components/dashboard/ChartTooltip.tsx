import { fmtVND, ChartItem } from "./utils";

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data: ChartItem = payload[0].payload;


        return (
            <div className="bg-white p-3 border border-gray-200 rounded shadow-lg text-sm max-w-[250px]">
                <p className="font-semibold mb-1 border-b pb-1">{label}</p>
                <p className="text-gray-700">Doanh thu: {fmtVND(data.revenue)}</p>
                <p className="text-blue-600">Vé: {fmtVND(data.ticketRevenue)}</p>
                <p className="text-green-600">F&B: {fmtVND(data.fnbRevenue)}</p>
                {data.occupancyRate !== undefined && (
                    <p className="text-orange-600">
                        Lấp đầy: {data.occupancyRate}%
                    </p>
                )}
                <p className="text-xs text-gray-500 mt-1 italic">
                    (Click để xem chi tiết từng ngày)
                </p>
            </div>
        );
    }
    return null;
};

export default CustomTooltip;
