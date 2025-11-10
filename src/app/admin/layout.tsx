"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { adminTabs } from "@/constants/constants";
import { ACCESS_TOKEN_KEY } from "@/constants/auth";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, refreshUser, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem(ACCESS_TOKEN_KEY)) {
      alert("Có lỗi xác thực, vui lòng đăng nhập lại");
      logout();
      router.push("/login");
    }
    if (!user) {
      refreshUser().catch((err) => {
        console.error(err);
        alert("Xác thực thất bại, vui lòng đăng nhập lại");
        logout();
        router.push("/login");
      });
    }
  }, [user, refreshUser, logout, router]);

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
