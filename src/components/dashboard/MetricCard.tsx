import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type MetricCardProps = {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    loading: boolean;
    delta?: number;
};

function MetricCard({ title, value, icon, loading, delta }: MetricCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <Card className="h-[140px]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {icon}
                        {title}
                    </CardTitle>
                    {typeof delta === "number" && (
                        <span
                            className={`inline-flex items-center text-xs font-medium ${delta >= 0 ? "text-emerald-600" : "text-rose-600"
                                }`}
                        >
                            {delta >= 0 ? "+" : ""}
                            {Math.abs(delta)}%
                        </span>
                    )}
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="h-8 w-32 rounded bg-muted/40 animate-pulse" />
                    ) : (
                        <div className="text-xl md:text-2xl font-semibold">{value}</div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}

export default MetricCard;
