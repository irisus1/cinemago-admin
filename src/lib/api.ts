import type {
  Movie,
  TheaterBlock,
  Showtime,
  SeatMap,
  Concession,
  PaymentIntent,
} from "@/lib/types";

import {
  mockMovies,
  mockBlocksByMovie,
  seatMapByShowtime,
  mockConcessions,
  payments,
  placeholderQR,
} from "@/hooks/mockdata";

export const api = {
  getMoviesToday: (): Promise<Movie[]> =>
    new Promise((res) =>
      setTimeout(
        () =>
          res(
            mockMovies.filter((m) => (mockBlocksByMovie[m.id] || []).length > 0)
          ),
        300
      )
    ),
  getMovieDetail: (movieId: string): Promise<Movie> =>
    new Promise((res) =>
      setTimeout(() => res(mockMovies.find((m) => m.id === movieId)!), 200)
    ),
  getTheaterBlocks: (movieId: string): Promise<TheaterBlock[]> =>
    new Promise((res) =>
      setTimeout(() => res(mockBlocksByMovie[movieId] || []), 300)
    ),
  getSeatMap: (showtimeId: string): Promise<SeatMap> =>
    new Promise((res) =>
      setTimeout(() => res(seatMapByShowtime[showtimeId]), 250)
    ),
  getConcessions: (): Promise<Concession[]> =>
    new Promise((res) => setTimeout(() => res(mockConcessions), 200)),
  createBookingIntent: (payload: {
    provider: "vnpay" | "momo";
    amount: number;
  }): Promise<{ bookingId: string; payment: PaymentIntent }> =>
    new Promise((res) => {
      const intentId = `pi_${Math.random().toString(36).slice(2, 8)}`;
      payments[intentId] = { tries: 0, status: "pending" };
      setTimeout(
        () =>
          res({
            bookingId: `b_${Math.random().toString(36).slice(2, 8)}`,
            payment: {
              provider: payload.provider,
              intentId,
              qr: placeholderQR,
              amount: payload.amount,
              expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            },
          }),
        400
      );
    }),
  pollPayment: (
    intentId: string
  ): Promise<{ status: "pending" | "succeeded" | "failed" | "expired" }> =>
    new Promise((res) => {
      setTimeout(() => {
        const p = payments[intentId];
        if (!p) {
          res({ status: "failed" });
          return;
        }
        p.tries += 1;
        if (p.tries >= 3) p.status = "succeeded"; // succeed after ~3 polls
        res({ status: p.status });
      }, 800);
    }),
};
