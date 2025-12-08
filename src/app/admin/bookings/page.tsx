// src/app/admin/bookings/page.tsx
import { Metadata } from "next";
import BookingsListPage from "./BookingClient";

// ĐÂY LÀ CHỖ QUAN TRỌNG NHẤT
// Vì file này KHÔNG CÓ "use client", nên Metadata này hoạt động
// export const metadata: Metadata = {
//   title: "Quản lý đơn vé",
//   // Next.js sẽ tự ghép vào template ở RootLayout thành:
//   // "Quản lý đơn vé | CinemaGo"
// };

export default function BookingPage() {
  return <BookingsListPage />;
}
