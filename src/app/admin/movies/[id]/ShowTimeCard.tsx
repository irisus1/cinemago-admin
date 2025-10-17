"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Table, { Column } from "@/components/Table";
import { getShowTimesByMovieId } from "@/services/ShowtimeService";

type ShowTime = {
  id: string;
  cinemaName: string;
  roomName: string;
  startTime: string; // ISO
  endTime?: string; // ISO
  price?: number;
  status?: string;
  // các field ngôn ngữ có thể khác nhau tùy backend:
  language?: string;
  audioLang?: string;
  subtitleLang?: string;
  lang?: string;
};

export default function ShowtimesCard({
  movieId,
  onAddShowtime,
}: {
  movieId: string;
  onAddShowtime?: () => void;
}) {
  const [showtimes, setShowtimes] = useState<ShowTime[]>([]);
  const [loadingShow, setLoadingShow] = useState(false);
  const [filterLang, setFilterLang] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingShow(true);
        const res = await getShowTimesByMovieId({ movieid: movieId });
        const arr = (res.data?.data || []) as ShowTime[];
        if (!cancelled) setShowtimes(arr);
      } finally {
        if (!cancelled) setLoadingShow(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [movieId]);

  const withLangLabel = useMemo(() => {
    const toLabel = (s: ShowTime) => {
      if (s.language) return s.language;
      if (s.audioLang || s.subtitleLang) {
        const a = s.audioLang ?? "";
        const sub = s.subtitleLang ?? "";
        return sub ? `${a || "Unknown"} + Sub ${sub}` : a || sub || "Unknown";
      }
      return s.lang || "Unknown";
    };
    return showtimes.map((s) => ({ ...s, _langLabel: toLabel(s) }));
  }, [showtimes]);

  const langOptions = useMemo(() => {
    const set = new Set(withLangLabel.map((s) => s._langLabel));
    const arr = Array.from(set).sort((a, b) => {
      if (a === "Unknown") return 1;
      if (b === "Unknown") return -1;
      return a.localeCompare(b);
    });
    return arr;
  }, [withLangLabel]);

  const filteredShowtimes = useMemo(() => {
    if (!filterLang) return withLangLabel;
    return withLangLabel.filter((s) => s._langLabel === filterLang);
  }, [withLangLabel, filterLang]);

  const columns: Column<ShowTime & { _langLabel: string }>[] = useMemo(
    () => [
      { header: "Rạp", key: "cinemaName" },
      { header: "Phòng", key: "roomName" },
      { header: "Ngôn ngữ", key: "_langLabel" },
      {
        header: "Bắt đầu",
        key: "startTime",
        render: (v) =>
          v
            ? Intl.DateTimeFormat("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }).format(new Date(v as string))
            : "—",
      },
      {
        header: "Kết thúc",
        key: "endTime",
        render: (v) =>
          v
            ? Intl.DateTimeFormat("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }).format(new Date(v as string))
            : "—",
      },
      {
        header: "Giá (VND)",
        key: "price",
        render: (v) =>
          v == null ? "—" : new Intl.NumberFormat("vi-VN").format(Number(v)),
      },
      { header: "Trạng thái", key: "status" },
    ],
    []
  );

  return (
    <Card className="shadow-sm">
      {/* Header: Title (dòng 1) + Controls row (dòng 2) */}
      <CardHeader className="border-b space-y-3">
        <CardTitle className="text-2xl">Suất chiếu</CardTitle>

        {/* Hàng control nằm dưới title */}
        <div className="w-full flex flex-wrap items-center justify-between gap-2">
          {/* Bên trái: Select lọc ngôn ngữ */}
          <Select
            value={filterLang}
            onValueChange={(v) =>
              setFilterLang(v === "__ALL__" ? undefined : v)
            }
          >
            <SelectTrigger className="h-9 w-[220px]">
              <SelectValue placeholder="Lọc theo ngôn ngữ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Tất cả ngôn ngữ</SelectItem>
              {langOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Bên phải: Button thêm suất chiếu */}
          <Button
            size="sm"
            className="gap-1"
            onClick={onAddShowtime || (() => console.log("Add showtime"))}
          >
            <Plus className="h-4 w-4" />
            Thêm suất chiếu
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 overflow-x-auto">
        {loadingShow ? (
          <div className="text-sm text-muted-foreground">
            Đang tải suất chiếu…
          </div>
        ) : (
          <Table
            columns={columns}
            data={filteredShowtimes}
            getRowKey={(r) => r.id}
          />
        )}
      </CardContent>
    </Card>
  );
}
