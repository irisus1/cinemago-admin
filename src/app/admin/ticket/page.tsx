"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import MovieGrid from "@/components/order-ticket/MovieGrid";
import type { TheaterBlock, Showtime } from "@/lib/types";
import { api } from "@/lib/api";
import { showTimeService, movieService, type Genre, Movie } from "@/services";
import { Calendar } from "lucide-react";

/** Helpers */
const todayLocalISODate = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const pad = (n: number) => String(n).padStart(2, "0");

// "YYYY-MM-DDTHH:mm:ss" (local-naive, không timezone)
const toLocalNaive = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
  `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

// [00:00, +1d 03:00) local-naive
const toLocalRangeTailNaive = (dateStr: string, tailHours = 3) => {
  // guard & clamp
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const today = todayLocalISODate();
    return toLocalRangeTailNaive(today, tailHours);
  }
  const t = Math.min(23, Math.max(0, tailHours));

  const [y, m, d] = dateStr.split("-").map((n) => parseInt(n, 10));
  const start = new Date(y, m - 1, d, 0, 0, 0, 0); // 00:00
  const end = new Date(y, m - 1, d + 1, t, 0, 0, 0); // +1d t:00

  return { startTime: toLocalNaive(start), endTime: toLocalNaive(end) };
};

export default function AdminWalkupBookingPage() {
  // ====== Query theo ngày ======
  const [dateStr, setDateStr] = useState<string>(() => todayLocalISODate());
  const dayRange = useMemo(() => toLocalRangeTailNaive(dateStr, 3), [dateStr]);

  // ====== States chính ======
  const [movies, setMovies] = useState<Movie[]>([]);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [blocks, setBlocks] = useState<TheaterBlock[]>([]);
  const [loading, setLoading] = useState(false);

  // ====== Fetch list phim theo suất chiếu của ngày đã chọn ======
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);

        // 1) Lấy showtimes theo khoảng [start, end)
        const sts = await showTimeService.getShowTimes({
          startTime: dayRange.startTime,
          endTime: dayRange.endTime,
        });

        const data = sts?.data ?? [];

        // 2) Map movieId -> meta từ showtime (ngôn ngữ, định dạng, giá min, giờ sớm nhất)
        const metaByMovieId: Record<
          string,
          {
            languages: string[];
            formats: string[];
            minPrice: number | null;
            earliestStart: string | null; // local-naive
            hasSubtitle: boolean | null;
          }
        > = {};

        for (const s of data) {
          const mid = String(s.movieId || "");
          if (!mid) continue;

          const curr = metaByMovieId[mid] || {
            languages: [],
            formats: [],
            minPrice: null,
            earliestStart: null,
            hasSubtitle: null,
          };

          if (s.language && !curr.languages.includes(s.language)) {
            curr.languages = curr.languages.concat(s.language);
          }
          if (s.format && !curr.formats.includes(s.format)) {
            curr.formats = curr.formats.concat(s.format);
          }
          if (typeof s.price === "number") {
            curr.minPrice =
              curr.minPrice == null
                ? s.price
                : Math.min(curr.minPrice, s.price);
          }
          if (s.startTime) {
            curr.earliestStart =
              curr.earliestStart == null ||
              new Date(s.startTime) < new Date(curr.earliestStart)
                ? s.startTime
                : curr.earliestStart;
          }
          if (typeof s.subtitle === "boolean") {
            curr.hasSubtitle =
              curr.hasSubtitle == null
                ? s.subtitle
                : curr.hasSubtitle || s.subtitle;
          }

          metaByMovieId[mid] = curr;
        }

        // 3) Lấy chi tiết từng phim
        const ids = Object.keys(metaByMovieId);
        if (ids.length === 0) {
          if (!cancelled) {
            setMovies([]); // <- để render empty-state
            setMovie(null);
            setBlocks([]);
          }
          return;
        }

        const details = await Promise.all(
          ids.map((id) => movieService.getMovieById(id))
        );

        // 4) Gắn showtimeMeta vào movie để MovieGrid dùng fallback khi field thiếu
        const moviesEnriched = details.map((m) => {
          const meta = metaByMovieId[String(m.id)];
          return Object.assign({}, m, { showtimeMeta: meta });
        });

        console.log(moviesEnriched);

        if (!cancelled) {
          setMovies(moviesEnriched as Movie[]);
          setMovie(null);
          setBlocks([]);
        }
      } catch {
        if (!cancelled) setMovies([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dayRange.startTime, dayRange.endTime]);

  const ref = useRef<HTMLInputElement>(null);
  const dmy = useMemo(
    () => (dateStr ? dateStr.split("-").reverse().join("/") : ""),
    [dateStr]
  );
  // ====== UI ======
  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-3xl font-bold">Đặt vé tại rạp cho ngày hôm nay</h1>

        {/* Chọn ngày để lọc suất chiếu */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">
            Chọn ngày:
          </label>
          {/* visible: dd/mm/yyyy */}
          <input
            type="text"
            readOnly
            value={dmy}
            onClick={() => (
              ref.current?.showPicker?.(), ref.current?.focus?.()
            )}
            className="rounded-md border px-3 py-2 text-sm cursor-pointer bg-white"
          />

          {/* hidden native date input (ISO) */}
          <input
            ref={ref}
            type="date"
            lang="vi" // cố gắng hiển thị dd/mm/yyyy nếu browser hỗ trợ
            value={dateStr} // giữ ISO YYYY-MM-DD cho tính toán/query
            onChange={(e) => setDateStr(e.target.value)}
            className="sr-only"
          />
        </div>
      </div>

      {/* Section 1: Movies from showtimes in selected day */}
      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold">
          Phim có suất chiếu trong ngày
        </h2>
        {loading && movies.length === 0 ? (
          <div className="mb-3 text-sm text-gray-600">Đang tải...</div>
        ) : null}

        {!loading && movies.length === 0 ? (
          <div className="text-sm text-gray-600 border rounded-md p-4">
            Không có suất chiếu trong khung giờ đã chọn.
          </div>
        ) : (
          <MovieGrid movies={movies} date={dateStr} />
        )}
      </section>
    </div>
  );
}
