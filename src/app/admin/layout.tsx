"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { adminTabs } from "@/constants/constants";
import { toast } from "sonner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (user.role !== "ADMIN") {
      toast.error("Bạn không có quyền truy cập trang quản trị!");
      router.push("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading) return null;

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        tabs={adminTabs} // truyền tabs từ constant hoặc props
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
