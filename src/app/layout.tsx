import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import "react-datepicker/dist/react-datepicker.css";
import "./global.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s ", // %s sẽ được thay thế bởi tiêu đề của trang con
    default: "CinemaGo - Admin", // Tiêu đề mặc định nếu trang con không set
  },
  description: "Hệ thống quản lý đặt vé xem phim",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>{children}</AuthProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
