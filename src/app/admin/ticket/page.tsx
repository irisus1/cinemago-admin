"use client";

import React, { useMemo, useState, useEffect } from "react";
import MovieGrid from "@/components/order-ticket/MovieGrid";
import MovieDetailTheaters from "@/components/order-ticket/MovieDetailTheaters";
import TicketQtyPicker from "@/components/order-ticket/TicketQtyPicker";
import SeatMapView from "@/components/order-ticket/SeatMap";
import ConcessionsList from "@/components/order-ticket/ConcessionsList";
import PaymentQR from "@/components/order-ticket/PaymentQR";
import ReceiptView from "@/components/order-ticket/ReceiptView";
import type {
  TheaterBlock,
  Showtime,
  SeatMap,
  Concession,
  PaymentIntent,
} from "@/lib/types";
import { api } from "@/lib/api";
import { showTimeService, movieService, type Genre, Movie } from "@/services";

/** Helpers */
const toLocalDayRange = (dateStr: string) => {
  // dateStr format: "YYYY-MM-DD"
  const d = new Date(dateStr + "T00:00:00");
  const startDate = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    0,
    0,
    0,
    0
  );
  const endDate = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    23,
    59,
    59,
    999
  );
  // Gửi ISO cho server. Nếu BE dùng timezone riêng, chỉnh tại đây.
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
};

interface ShowTime {
  id: string;
  movieId: string;
}

export default function AdminWalkupBookingPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // ====== Query theo ngày ======
  const [dateStr, setDateStr] = useState<string>(
    () => new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  );
  const dayRange = useMemo(() => toLocalDayRange(dateStr), [dateStr]);

  // ====== States chính ======
  const [movies, setMovies] = useState<Movie[]>([]);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [blocks, setBlocks] = useState<TheaterBlock[]>([]);
  const [showtime, setShowtime] = useState<Showtime | null>(null);
  const [qty, setQty] = useState(0);
  const [seatMap, setSeatMap] = useState<SeatMap | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [concessions, setConcessions] = useState<Concession[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [provider, setProvider] = useState<"vnpay" | "momo">("vnpay");
  const [payment, setPayment] = useState<PaymentIntent | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);

  // ====== Fetch list phim theo suất chiếu của ngày đã chọn ======
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);

        // 1) Lấy showtimes theo khoảng ngày
        const sts = await showTimeService.getShowTimes({
          startTime: dayRange.startDate,
          // endTime: dayRange.endDate,
        });

        // 2) Lấy danh sách movieId duy nhất
        const movieIdSet = new Set<string>(
          sts.data.map((s: ShowTime) => String(s.movieId || "")).filter(Boolean)
        );
        const ids = Array.from(movieIdSet);

        // 3) Lấy chi tiết từng phim
        const details = await Promise.all(
          ids.map(async (id) => {
            const res = await movieService.getMovieById(id);
            // đảm bảo có id để MovieGrid render
            return res;
          })
        );

        console.log(details);

        if (!cancelled) {
          setMovies(details);
          // Reset các selection khi đổi ngày
          setMovie(null);
          setBlocks([]);
          setShowtime(null);
          setQty(0);
          setSeatMap(null);
          setSelectedSeatIds([]);
          setPayment(null);
          setBookingId(null);
          setStep(1);
        }
      } catch (e) {
        if (!cancelled) {
          setMovies([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dayRange.startDate, dayRange.endDate]);

  // ====== Tính tổng ======
  const totalTickets = useMemo(
    () => (showtime ? qty * (showtime.basePrice || 0) : 0),
    [qty, showtime]
  );
  const totalConcessions = useMemo(
    () =>
      Object.entries(cart).reduce((s, [id, q]) => {
        const it = concessions.find((c) => c.id === id);
        return s + (it ? it.price * q : 0);
      }, 0),
    [cart, concessions]
  );
  const grandTotal = totalTickets + totalConcessions;

  // ====== Handlers ======
  const pickMovie = async (m: Movie) => {
    setMovie(m);
    setShowtime(null);
    setQty(0);
    setSeatMap(null);
    setSelectedSeatIds([]);
    setPayment(null);
    setBookingId(null);

    setLoading(true);
    try {
      // Lấy showtimes theo ngày đã chọn, gom theo rạp (block)
      const theaterBlocks = await api.getTheaterBlocksByRange(m.id, {
        startDate: dayRange.startDate,
        endDate: dayRange.endDate,
      });
      setBlocks(theaterBlocks || []);
    } finally {
      setLoading(false);
    }
  };

  const pickShowtime = (st: Showtime) => {
    setShowtime(st);
    setQty(0);
    setSelectedSeatIds([]);
    setSeatMap(null);
    setPayment(null);
    setBookingId(null);
  };

  const confirmQty = () => {
    if (!showtime || qty <= 0) return;
    setLoading(true);
    Promise.all([api.getSeatMap(showtime.id), api.getConcessions()])
      .then(([sm, cons]) => {
        setSeatMap(sm);
        setConcessions(cons);
      })
      .finally(() => setLoading(false));
  };

  const setCartQty = (id: string, q: number) =>
    setCart((prev) => ({ ...prev, [id]: Math.max(0, q) }));

  const canPay = selectedSeatIds.length === qty && qty > 0;

  const onPay = () => {
    setPaying(true);
    api
      .createBookingIntent({ provider, amount: grandTotal })
      .then((res) => {
        setPayment(res.payment);
        setBookingId(res.bookingId);
        setStep(5);
        const iv = setInterval(() => {
          api.pollPayment(res.payment.intentId).then((s) => {
            if (s.status !== "pending") {
              clearInterval(iv);
              if (s.status === "succeeded") setStep(6);
            }
          });
        }, 1500);
      })
      .finally(() => setPaying(false));
  };

  const onPrint = () => window.print();

  // ====== UI ======
  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-3xl font-bold">Admin Booking — Walk-Up</h1>

        {/* Chọn ngày để lọc suất chiếu */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">
            Chọn ngày:
          </label>
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
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
        <MovieGrid movies={movies} onPick={pickMovie} />
      </section>

      {/* Section 2: After choose a movie */}
      {movie && (
        <section className="mb-10">
          <MovieDetailTheaters
            movie={movie}
            blocks={blocks}
            onPickShowtime={pickShowtime}
            onBack={() => setMovie(null)}
          />
        </section>
      )}

      {/* Section 3: After choose a showtime */}
      {showtime && (
        <section className="mb-10">
          <TicketQtyPicker
            showtime={showtime}
            qty={qty}
            setQty={setQty}
            onNext={confirmQty}
            onBack={() => setShowtime(null)}
          />
        </section>
      )}

      {/* Section 4: Seat map + F&B */}
      {seatMap && (
        <section className="mb-10 grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
          <div>
            <SeatMapView
              seatMap={seatMap}
              selected={selectedSeatIds}
              setSelected={setSelectedSeatIds}
              maxSelect={qty}
            />
          </div>
          <div className="space-y-6">
            <div className="rounded-2xl border bg-white p-5">
              <div className="mb-2 font-semibold">Tóm tắt</div>
              <div className="space-y-1 text-base">
                <div>
                  Vé: <b>{qty}</b> → {totalTickets.toLocaleString()}₫
                </div>
                <div>F&B: {totalConcessions.toLocaleString()}₫</div>
                <div className="text-xl">
                  Tổng: <b>{grandTotal.toLocaleString()}₫</b>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border bg-white p-5">
              <ConcessionsList
                items={concessions}
                cart={cart}
                setQty={setCartQty}
              />
            </div>
            {(canPay || payment) && (
              <div className="rounded-2xl border bg-white p-5">
                <PaymentQR
                  payment={payment}
                  provider={provider}
                  setProvider={setProvider}
                  onPay={onPay}
                  paying={paying}
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Section 5: Receipt after success */}
      {bookingId && step === 6 && (
        <section className="mb-10">
          <ReceiptView bookingId={bookingId} onPrint={onPrint} />
        </section>
      )}
    </div>
  );
}
