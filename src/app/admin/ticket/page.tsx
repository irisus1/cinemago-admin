"use client";

import React, { useMemo, useState, useEffect } from "react";
import MovieGrid from "@/components/booking/MovieGrid";
import {
  showTimeService,
  movieService,
  cinemaService,
  type Movie,
  Cinema,
} from "@/services";
import { DateNativeVN } from "@/components/DateNativeVN";
import BookingSheet from "./bookingSheet";
import RefreshLoader from "@/components/Loading";

/** Helpers */
/** Helpers */
const todayLocalISODate = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`; // YYYY-MM-DD (local VN)
};

const pad = (n: number) => String(n).padStart(2, "0");

const toUtcDayRangeFromLocalISO = (dateStr: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const today = todayLocalISODate();
    return toUtcDayRangeFromLocalISO(today);
  }

  const [y, m, d] = dateStr.split("-").map((n) => parseInt(n, 10));

  // local start / end (VN)
  const localStart = new Date(y, m - 1, d, 0, 0, 0, 0);
  const localEndExclusive = new Date(y, m - 1, d + 1, 0, 0, 0, 0);

  // chuyển sang ISO UTC có Z
  const startTime = localStart.toISOString(); // 27T17:00Z
  const endTime = new Date(localEndExclusive.getTime() - 1).toISOString(); // 28T16:59:59.999Z

  return { startTime, endTime };
};

export default function AdminWalkupBookingPage() {
  const [dateStr, setDateStr] = useState<string>(() => todayLocalISODate());
  // Khoảng UTC tương ứng với 00:00 - 23:59 ngày dateStr theo giờ VN
  const dayRange = useMemo(() => toUtcDayRangeFromLocalISO(dateStr), [dateStr]);

  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [selectedCinemaId, setSelectedCinemaId] = useState<string>("");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // 1. Fetch list rạp
        const res = await cinemaService.getAllCinemas();
        const list = res?.data || [];
        setCinemas(list);
        const savedId = localStorage.getItem("admin_persistent_cinema_id");

        const hasSaved =
          savedId && list.some((c) => String(c.id) === String(savedId));

        if (hasSaved) {
          setSelectedCinemaId(savedId as string);
        } else if (list.length > 0) {
          const defaultId = String(list[0].id);
          setSelectedCinemaId(defaultId);
          localStorage.setItem("admin_persistent_cinema_id", defaultId);

          // option: xoá id cũ cho sạch
          if (savedId && !hasSaved) {
            localStorage.removeItem("admin_persistent_cinema_id");
          }
        } else {
          // Không có rạp nào
          setSelectedCinemaId("");
          localStorage.removeItem("admin_persistent_cinema_id");
        }
      } catch (error) {
        console.error("Failed to fetch cinemas", error);
      }
    })();
  }, []);

  const handleCinemaChange = (newId: string) => {
    setSelectedCinemaId(newId);

    localStorage.setItem("admin_persistent_cinema_id", newId);
  };
  useEffect(() => {
    let cancelled = false;
    if (!selectedCinemaId) return;
    (async () => {
      try {
        setLoading(true);

        console.log(dayRange.startTime, dayRange.endTime);

        // 1) Lấy showtimes theo khoảng [start, end)
        const sts = await showTimeService.getShowTimes({
          startTime: dayRange.startTime,
          endTime: dayRange.endTime,
          cinemaId: selectedCinemaId,
          isActive: true,
        });

        console.log(sts);

        const data = sts?.data ?? [];

        // 2) Map movieId -> meta từ showtime (ngôn ngữ, định dạng, giá min, giờ sớm nhất)
        const metaByMovieId: Record<
          string,
          {
            languages: string[];
            formats: string[];
            minPrice: number | null;
            earliestStart: string | null;
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
            setMovies([]);
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
  }, [dayRange.startTime, dayRange.endTime, selectedCinemaId]);

  const handleMovieSelect = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setTimeout(() => setSelectedMovie(null), 300);
  };
  // ====== UI ======
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-3xl font-bold">Đặt vé tại rạp cho ngày hôm nay</h1>

        {/* Chọn ngày để lọc suất chiếu */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Chọn rạp:
            </label>
            <select
              className="rounded-md border px-3 py-2 text-sm bg-white min-w-[200px]"
              value={selectedCinemaId}
              onChange={(e) => handleCinemaChange(e.target.value)}
            >
              {cinemas.length === 0 && (
                <option value="">Đang tải rạp...</option>
              )}
              {cinemas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Chọn ngày:
            </label>

            <DateNativeVN
              valueISO={dateStr}
              onChangeISO={(iso) => {
                console.log("Ngày chọn:", iso);
                // setSelectedDate(iso)
                setDateStr(iso);
              }}
              className="relative "
              widthClass="w-full "
            />
          </div>
        </div>
      </div>

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
          <MovieGrid
            movies={movies}
            date={dateStr}
            cinemaId={selectedCinemaId}
            onMovieSelect={handleMovieSelect}
          />
        )}
      </section>
      <BookingSheet
        isOpen={isSheetOpen}
        onClose={handleCloseSheet}
        movie={selectedMovie}
        cinemaId={selectedCinemaId}
        date={dateStr}
      />

      <RefreshLoader isOpen={loading} />
    </div>
  );
}
