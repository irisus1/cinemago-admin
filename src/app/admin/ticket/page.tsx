"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
import { useBookingLogic } from "@/components/ticket/useBookingSheet";
import { FloatingIndicator } from "@/components/ticket/FloatingIndicator";
import { useAuth } from "@/context/AuthContext";

const todayLocalISODate = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const toUtcDayRangeFromLocalISO = (dateStr: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const today = todayLocalISODate();
    return toUtcDayRangeFromLocalISO(today);
  }

  const [y, m, d] = dateStr.split("-").map((n) => parseInt(n, 10));

  const localStart = new Date(y, m - 1, d, 0, 0, 0, 0);
  const localEndExclusive = new Date(y, m - 1, d + 1, 0, 0, 0, 0);

  const startTime = localStart.toISOString();
  const endTime = new Date(localEndExclusive.getTime() - 1).toISOString();

  return { startTime, endTime };
};

export default function AdminWalkupBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { user } = useAuth();

  const isRestrictedView =
    user?.role === "MANAGER" || user?.role === "EMPLOYEE";
  const userCinemaId = user?.cinemaId;

  const [dateStr, setDateStr] = useState<string>(() => {
    return searchParams.get("date") || todayLocalISODate();
  });

  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [selectedCinemaId, setSelectedCinemaId] = useState<string>("");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const bookingState = useBookingLogic({
    isOpen: isSheetOpen,
    movie: selectedMovie,
    cinemaId: selectedCinemaId,
    date: dateStr,
  });

  const dayRange = useMemo(() => toUtcDayRangeFromLocalISO(dateStr), [dateStr]);

  const updateUrl = (updates: {
    date?: string;
    cinemaId?: string;
    movieId?: string;
    sheetOpen?: string;
    showtimeId?: string;
  }) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const isUrlOpen = searchParams.get("sheetOpen") === "true";
    if (isUrlOpen && !isSheetOpen && selectedMovie) {
      setIsSheetOpen(true);
    }
  }, [searchParams, selectedMovie]);

  useEffect(() => {
    (async () => {
      try {
        const res = await cinemaService.getAllCinemas();
        const list = res?.data || [];
        setCinemas(list);

        const urlCinemaId = searchParams.get("cinemaId");
        const savedId = localStorage.getItem("admin_persistent_cinema_id");

        let targetId = "";

        if (urlCinemaId && list.some((c) => String(c.id) === urlCinemaId)) {
          targetId = urlCinemaId;
        } else if (savedId && list.some((c) => String(c.id) === savedId)) {
          targetId = savedId;
        } else if (list.length > 0) {
          targetId = String(list[0].id);
        }

        if (isRestrictedView && userCinemaId) {
          targetId = userCinemaId;
        }

        if (targetId) {
          setSelectedCinemaId(targetId);
          localStorage.setItem("admin_persistent_cinema_id", targetId);
          if (targetId !== urlCinemaId) {
            updateUrl({ cinemaId: targetId });
          }
        }
      } catch (error) {
        console.error("Failed to fetch cinemas", error);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!selectedCinemaId) return;

    (async () => {
      try {
        setLoading(true);

        const sts = await showTimeService.getShowTimes({
          startTime: dayRange.startTime,
          endTime: dayRange.endTime,
          cinemaId: selectedCinemaId,
          isActive: true,
        });
        const data = sts?.data ?? [];

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
          if (s.language && !curr.languages.includes(s.language))
            curr.languages.push(s.language);
          if (s.format && !curr.formats.includes(s.format))
            curr.formats.push(s.format);
          if (typeof s.price === "number") {
            curr.minPrice =
              curr.minPrice === null
                ? s.price
                : Math.min(curr.minPrice, s.price);
          }
          if (s.startTime) {
            curr.earliestStart =
              curr.earliestStart === null ||
              new Date(s.startTime) < new Date(curr.earliestStart)
                ? s.startTime
                : curr.earliestStart;
          }
          if (typeof s.subtitle === "boolean")
            curr.hasSubtitle = curr.hasSubtitle || s.subtitle;
          metaByMovieId[mid] = curr;
        }

        const ids = Object.keys(metaByMovieId);
        if (ids.length === 0) {
          if (!cancelled) setMovies([]);
          return;
        }

        const details = await Promise.all(
          ids.map((id) => movieService.getMovieById(id)),
        );

        const moviesEnriched = details.map((m) => {
          const meta = metaByMovieId[String(m.id)];
          return Object.assign({}, m, { showtimeMeta: meta });
        });

        if (!cancelled) {
          setMovies(moviesEnriched as Movie[]);

          const urlMovieId = searchParams.get("movieId");
          const urlSheetOpen = searchParams.get("sheetOpen");

          if (urlMovieId && urlSheetOpen === "true") {
            const foundMovie = moviesEnriched.find(
              (m) => String(m.id) === urlMovieId,
            );
            if (foundMovie) {
              setSelectedMovie(foundMovie as Movie);
              setIsSheetOpen(true);
            }
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayRange.startTime, dayRange.endTime, selectedCinemaId]);

  const handleCinemaChange = (newId: string) => {
    setSelectedCinemaId(newId);
    localStorage.setItem("admin_persistent_cinema_id", newId);
    updateUrl({ cinemaId: newId });
  };

  const handleDateChange = (iso: string) => {
    setDateStr(iso);
    updateUrl({ date: iso });
  };

  const handleMovieSelect = (movie: Movie) => {
    if (selectedMovie && String(selectedMovie.id) !== String(movie.id)) {
      if (
        bookingState.selectedSeats.length > 0 ||
        bookingState.selectedShowtime
      ) {
        bookingState.resetBookingSession();
      }
    }

    setSelectedMovie(movie);
    setIsSheetOpen(true);
    updateUrl({ movieId: String(movie.id), sheetOpen: "true" });
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    updateUrl({ sheetOpen: undefined, showtimeId: undefined });
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-3xl font-bold">Đặt vé trực tiếp</h1>

        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Chọn rạp:
            </label>
            <select
              className="rounded-md border px-3 py-2 text-sm bg-white min-w-[200px] disabled:bg-gray-100 disabled:text-gray-500"
              value={selectedCinemaId}
              onChange={(e) => handleCinemaChange(e.target.value)}
              disabled={isRestrictedView}
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
              minISO={todayLocalISODate()}
              onChangeISO={handleDateChange}
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
            Không có suất chiếu trong ngày đã chọn.
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
        onReopen={() => setIsSheetOpen(true)}
        movie={selectedMovie}
        cinemaId={selectedCinemaId}
        date={dateStr}
        bookingState={bookingState}
      />

      {!isSheetOpen && bookingState.selectedShowtime && (
        <FloatingIndicator
          count={bookingState.totalQty}
          movieName={
            bookingState.selectedShowtime.roomName
              ? `${selectedMovie?.title} - ${bookingState.selectedShowtime.roomName}`
              : selectedMovie?.title
          }
          formattedTime={bookingState.formattedTime}
          onReopen={() => setIsSheetOpen(true)}
        />
      )}

      <RefreshLoader isOpen={loading} />
    </div>
  );
}
