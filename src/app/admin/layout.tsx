"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { adminTabs } from "@/constants/constants";
import Breadcrumbs from "@/app/admin/Breadcrumbs";
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { userDetail, fetchEmployeeDetail, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem("accessToken")) {
      alert("Có lỗi xác thực, vui lòng đăng nhập lại");
      logout();
      router.push("/login");
    }
    if (!userDetail) {
      fetchEmployeeDetail().catch((err) => {
        console.error(err);
        alert("Xác thực thất bại, vui lòng đăng nhập lại");
        logout();
        router.push("/login");
      });
    }
  }, [userDetail]);

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
          <Breadcrumbs />
          {children}
        </div>
      </div>
    </div>
  );
}
