"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Users,
  Building2,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  CalendarDays,
  Utensils,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  getMovieCount,
  getCinemaCount,
  getUserCount,
  getRevenueByPeriod,
  getRevenueByPeriodAndMovie,
  getRevenueByPeriodAndCinema,
} from "@/services/DashboardService";

export default function Dashboard() {
  // ===== Default range: today -> +7 days
  const todayISO = new Date().toISOString().slice(0, 10);
  const sevenDaysAfterISO = new Date(Date.now() + 7 * 86400000)
    .toISOString()
    .slice(0, 10);

  const [startDate, setStartDate] = useState(todayISO);
  const [endDate, setEndDate] = useState(sevenDaysAfterISO);

  // ===== Data state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [counts, setCounts] = useState({ users: 0, cinemas: 0, movies: 0 });
  const [revenue, setRevenue] = useState({ total: 0, fnb: 0, ticket: 0 });
  const [byMovie, setByMovie] = useState([]);
  const [byCinema, setByCinema] = useState([]);

  // ===== Helpers
  const fmtNumber = (n) => new Intl.NumberFormat().format(n);
  const fmtVND = (n) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(Math.max(0, Math.round(Number(n) || 0)));

  const refresh = useCallback(() => {
    setLoading(true);
    setError("");

    Promise.all([
      getUserCount(),
      getCinemaCount(),
      getMovieCount(),
      getRevenueByPeriod({ start: startDate, end: endDate }),
      getRevenueByPeriodAndMovie({ start: startDate, end: endDate }),
      getRevenueByPeriodAndCinema({ start: startDate, end: endDate }),
    ])
      .then(([u, c, m, rev, rbm, rbc]) => {
        // ---- Counts
        setCounts({
          users: u?.data.data.totalUsers ?? 0,
          cinemas: c?.data.data.totalCinemas ?? 0,
          movies: m?.data.data.totalMovies ?? 0,
        });

        // ---- Revenue period
        const total = Number(rev?.totalRevenue ?? 0);
        const fnb = Number(rev?.totalRevenueFromFoodDrink ?? 0);
        const ticket = Math.max(0, total - fnb);
        setRevenue({ total, fnb, ticket });

        // ---- Revenue by movie
        if (Array.isArray(rbm)) {
          const mapped = rbm.map((i) => ({
            name: i.movieName ?? i.name ?? i.title ?? "(unknown)",
            revenue: Number(i.revenue ?? i.totalRevenue ?? 0),
          }));
          mapped.sort((a, b) => b.revenue - a.revenue);
          setByMovie(mapped.slice(0, 12));
        } else if (
          rbm &&
          Array.isArray(rbm.sortedMovies) &&
          Array.isArray(rbm.moviesRevenue)
        ) {
          const mapped = rbm.sortedMovies.map((name, idx) => ({
            name: name ?? "(unknown)",
            revenue: Number(rbm.moviesRevenue[idx] ?? 0),
          }));
          mapped.sort((a, b) => b.revenue - a.revenue);
          setByMovie(mapped.slice(0, 12));
        }

        // ---- Revenue by cinema
        if (Array.isArray(rbc)) {
          const mapped = rbc.map((i) => ({
            name: i.cinemaName ?? i.name ?? i.branch ?? "(unknown)",
            revenue: Number(i.revenue ?? i.totalRevenue ?? 0),
          }));
          mapped.sort((a, b) => b.revenue - a.revenue);
          setByCinema(mapped);
        } else if (
          rbc &&
          Array.isArray(rbc.sortedCinemas) &&
          Array.isArray(rbc.cinemasRevenue)
        ) {
          const mapped = rbc.sortedCinemas.map((name, idx) => ({
            name: name ?? "(unknown)",
            revenue: Number(rbc.cinemasRevenue[idx] ?? 0),
          }));
          mapped.sort((a, b) => b.revenue - a.revenue);
          setByCinema(mapped);
        }
      })
      .catch((e) => setError(e?.message || "Fetch error"))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ===== UI
  return (
    <div className="min-h-screen w-full p-6 md:p-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Cinema Admin Dashboard
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[140px]"
            />
            <span className="text-muted-foreground">→</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[140px]"
            />
          </div>
          <Button onClick={refresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-rose-700 text-sm">
          {error}
        </div>
      ) : null}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <MetricCard
          title="Total Revenue"
          value={fmtVND(revenue.total)}
          icon={<DollarSign className="h-5 w-5" />}
          loading={loading}
        />
        <MetricCard
          title="Food & Drink"
          value={fmtVND(revenue.fnb)}
          icon={<Utensils className="h-5 w-5" />}
          loading={loading}
        />
        <MetricCard
          title="Ticket Revenue"
          value={fmtVND(revenue.ticket)}
          icon={<PieChartIcon className="h-5 w-5" />}
          loading={loading}
        />
        <MetricCard
          title="Users"
          value={fmtNumber(counts.users)}
          icon={<Users className="h-5 w-5" />}
          loading={loading}
        />
        <MetricCard
          title="Movies / Cinemas"
          value={`${fmtNumber(counts.movies)} / ${fmtNumber(counts.cinemas)}`}
          icon={<Building2 className="h-5 w-5" />}
          loading={loading}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="h-[380px]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              <CardTitle>Revenue Composition</CardTitle>
            </div>
            <Badge variant="secondary" className="gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> {startDate} → {endDate}
            </Badge>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <div className="h-full w-full animate-pulse rounded-xl bg-muted/40" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    dataKey="value"
                    data={[
                      { name: "Ticket", value: revenue.ticket },
                      { name: "Food & Drink", value: revenue.fnb },
                    ]}
                    innerRadius={60}
                    outerRadius={100}
                  >
                    {["#", "#"].map((_, i) => (
                      <Cell key={i} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmtVND(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="h-[380px]">
          <CardHeader className="flex items-center justify-between flex-row">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <CardTitle>Revenue by Cinema</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <div className="h-full w-full animate-pulse rounded-xl bg-muted/40" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCinema}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={fmtNumber} />
                  <Tooltip formatter={(v) => fmtVND(v)} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="h-[420px] xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <CardTitle>Top Movies by Revenue</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="h-[340px]">
            {loading ? (
              <div className="h-full w-full animate-pulse rounded-xl bg-muted/40" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byMovie}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tickFormatter={fmtNumber} />
                  <Tooltip formatter={(v) => fmtVND(v)} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, loading, delta }) {
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
          {typeof delta === "number" ? (
            <span
              className={`inline-flex items-center text-xs font-medium ${
                delta >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {delta >= 0 ? "+" : ""}
              {Math.abs(delta)}%
            </span>
          ) : null}
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
