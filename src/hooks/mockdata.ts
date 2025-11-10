import type {
  Movie,
  TheaterBlock,
  SeatMap,
  Concession,
  PaymentIntent,
  Showtime,
} from "@/lib/types";

const todayISO = new Date();
const todayStr = () => new Date().toISOString().slice(0, 10);

export const mockMovies: Movie[] = [
  {
    id: "m1",
    title: "Dune: Part Two",
    posterUrl:
      "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?q=80&w=600&auto=format&fit=crop",
    runtimeMin: 166,
    rating: "T16",
    description: "Sci‑fi epic.",
  },
  {
    id: "m2",
    title: "Inside Out 2",
    posterUrl:
      "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=600&auto=format&fit=crop",
    runtimeMin: 96,
    rating: "P",
    description: "Family animation.",
  },
  {
    id: "m3",
    title: "A Quiet Place: Day One",
    posterUrl:
      "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?q=80&w=600&auto=format&fit=crop",
    runtimeMin: 100,
    rating: "T18",
    description: "Horror thriller.",
  },
];

const time = (h: number, m = 0) =>
  new Date(new Date().setHours(h, m, 0, 0)).toISOString();

export const mockBlocksByMovie: Record<string, TheaterBlock[]> = {
  m1: [
    {
      theater: { id: "t1", name: "Galaxy Nguyễn Trãi", address: "Q.5, TP.HCM" },
      showtimes: [
        {
          id: "st_m1_1",
          startTime: time(18, 30),
          roomId: "r101",
          roomName: "Room 1",
          basePrice: 90000,
        },
        {
          id: "st_m1_2",
          startTime: time(21, 0),
          roomId: "r101",
          roomName: "Room 1",
          basePrice: 90000,
        },
      ],
    },
    {
      theater: { id: "t2", name: "CGV Vincom", address: "Q.1, TP.HCM" },
      showtimes: [
        {
          id: "st_m1_3",
          startTime: time(19, 15),
          roomId: "r22",
          roomName: "Room 5",
          basePrice: 100000,
        },
      ],
    },
  ],
  m2: [
    {
      theater: { id: "t3", name: "BHD Thảo Điền", address: "Q.2, TP.HCM" },
      showtimes: [
        {
          id: "st_m2_1",
          startTime: time(17, 45),
          roomId: "r6",
          roomName: "R6",
          basePrice: 80000,
        },
      ],
    },
  ],
  m3: [],
};

const makeSeatMap = (
  roomId: string,
  name: string,
  rows = 8,
  cols = 12
): SeatMap => {
  const seats = [] as SeatMap["seats"];
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const label = String.fromCharCode(64 + r) + c;
      const sold =
        (r === 3 && (c === 5 || c === 6)) || (r === 6 && c % 5 === 0);
      const held = r === 4 && c === 8;
      seats.push({
        seatId: `${roomId}_${label}`,
        row: r,
        col: c,
        label,
        status: sold ? "sold" : held ? "held" : "available",
      });
    }
  }
  return { room: { id: roomId, name, rows, cols }, seats };
};

export const seatMapByShowtime: Record<string, SeatMap> = {
  st_m1_1: makeSeatMap("r101", "Room 1"),
  st_m1_2: makeSeatMap("r101", "Room 1"),
  st_m1_3: makeSeatMap("r22", "Room 5", 9, 14),
  st_m2_1: makeSeatMap("r6", "R6", 7, 10),
};

export const mockConcessions: Concession[] = [
  {
    id: "c1",
    name: "Combo 1 (Popcorn + 2 Drinks)",
    type: "combo",
    price: 120000,
  },
  { id: "c2", name: "Popcorn Caramel", type: "item", price: 60000 },
  { id: "c3", name: "Coke 500ml", type: "item", price: 25000 },
];

export const payments: Record<
  string,
  { tries: number; status: "pending" | "succeeded" | "failed" | "expired" }
> = {};

export const placeholderQR =
  "data:image/svg+xml;base64," +
  btoa(
    `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><rect width='256' height='256' fill='#fff'/><rect x='16' y='16' width='224' height='224' fill='none' stroke='#000' stroke-width='8'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='18'>QR Placeholder</text></svg>`
  );
