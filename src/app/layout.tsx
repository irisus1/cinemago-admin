import { AuthProvider } from "@/context/AuthContext";
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
      </body>
    </html>
  );
}
