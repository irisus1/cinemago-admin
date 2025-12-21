// "use client";

// import { useEffect, useState } from "react";
// import Navbar from "@/components/Navbar";
// import Sidebar from "@/components/Sidebar";
// import { useAuth } from "@/context/AuthContext";
// import { useRouter } from "next/navigation";
// import { adminTabs } from "@/constants/constants";
// import { toast } from "sonner";

// export default function AdminLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   const [isSidebarOpen, setIsSidebarOpen] = useState(true);
//   const { user, isLoading } = useAuth();
//   const router = useRouter();

//   useEffect(() => {
//     if (isLoading) return;

//     if (!user) {
//       router.push("/login");
//       return;
//     }

//     if (user.role !== "ADMIN") {
//       toast.error("Bạn không có quyền truy cập trang quản trị!");
//       router.push("/login");
//     }
//   }, [isLoading, user, router]);

//   if (isLoading) return null;

//   return (
//     <div className="flex h-screen bg-gray-100">
//       <Sidebar
//         isSidebarOpen={isSidebarOpen}
//         setIsSidebarOpen={setIsSidebarOpen}
//         tabs={adminTabs} // truyền tabs từ constant hoặc props
//       />
//       <div className="flex-1 overflow-auto">
//         <div className="p-6">
//           <Navbar />

//           {children}
//         </div>
//       </div>
//     </div>
//   );
// }
// src/app/admin/AdminLayoutClient.tsx
"use client"; // File này PHẢI có use client

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

  // Logic bảo vệ trang
  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    // Initialize Cinema for Manager/Employee
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

    // Redirect EMPLOYEE who tries to access dashboard
    if (user.role === "EMPLOYEE" && pathname === "/admin/dashboard") {
      router.replace("/admin/ticket");
    }

  }, [isLoading, user, router, pathname, setSelectedCinema]);

  if (isLoading) return null; // Hoặc loading spinner

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
          {/* Render trang con ở đây */}
          {children}
        </div>
      </div>
    </div>
  );
}
