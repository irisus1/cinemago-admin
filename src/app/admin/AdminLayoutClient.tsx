"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { adminTabs } from "@/constants/constants";
import { toast } from "sonner";
import { useCinemaStore } from "@/store/useCinemaStore";

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { setSelectedCinema } = useCinemaStore();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (user.role === "MANAGER" || user.role === "EMPLOYEE") {
      if (user.cinemaId && user.cinemaName) {
        setSelectedCinema(user.cinemaId, user.cinemaName);
      }
    }

    const allowedRoles = ["ADMIN", "MANAGER", "EMPLOYEE"];
    if (!allowedRoles.includes(user.role)) {
      toast.error("Bạn không có quyền truy cập trang quản trị!");
      router.push("/login");
      return;
    }

    if (user.role === "EMPLOYEE" && pathname === "/admin/dashboard") {
      router.replace("/admin/ticket");
    }
  }, [isLoading, user, router, pathname, setSelectedCinema]);

  if (isLoading) return null;

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        tabs={adminTabs}
      />
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <Navbar />
          {children}
        </div>
      </div>
    </div>
  );
}
