// src/app/admin/layout.tsx
// KHÔNG CÓ "use client" ở đây -> Metadata sẽ hoạt động!

import { Metadata } from "next";
import AdminLayoutClient from "./AdminLayoutClient"; // Import file Client vừa tạo ở trên

// Bạn có thể đặt Title mặc định cho toàn bộ Admin ở đây
export const metadata: Metadata = {
  title: {
    template: "%s ",
    default: "CinemaGo - Admin",
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Bọc toàn bộ logic Client bên trong
    <AdminLayoutClient>{children}</AdminLayoutClient>
  );
}
