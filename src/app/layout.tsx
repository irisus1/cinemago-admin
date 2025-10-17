import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import AuthBridge from "./admin/authBrigde";
import "./global.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <AuthBridge />
        <AuthProvider>{children}</AuthProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
