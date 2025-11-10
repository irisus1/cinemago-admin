export * from "./movie";


export type Movie = {
  id: string;
  title: string;
  posterUrl?: string;
  runtimeMin?: number;
  rating?: string;
  description?: string;
};
export type Theater = { id: string; name: string; address?: string };
export type Showtime = {
  id: string;
  startTime: string;
  roomId: string;
  roomName?: string;
  basePrice: number;
};
export type TheaterBlock = { theater: Theater; showtimes: Showtime[] };
export type Seat = {
  seatId: string;
  row: number;
  col: number;
  label: string;
  status: "available" | "sold" | "held";
};
export type SeatMap = {
  room: { id: string; name: string; rows: number; cols: number };
  seats: Seat[];
};
export type Concession = {
  id: string;
  name: string;
  type: "combo" | "item";
  price: number;
};
export type PaymentIntent = {
  provider: "vnpay" | "momo";
  intentId: string;
  qr: string;
  amount: number;
  expiresAt: string;
};

