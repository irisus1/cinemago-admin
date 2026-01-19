"use client";

import { useAuth } from "@/context/AuthContext";
import CinemaDetailView from "@/components/dashboard/CinemaDetailView";

export default function ManagerDashboard() {
    const { user } = useAuth();

    if (!user || user.role !== "MANAGER") {
        return (
            <div className="p-10 text-center">
                Bạn không có quyền truy cập trang này.
            </div>
        );
    }

    if (!user.cinemaId) {
        return (
            <div className="p-10 text-center">
                Tài khoản của bạn chưa được gán rạp nào.
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full p-4 md:p-8 bg-gray-50/50">
            <CinemaDetailView cinemaId={user.cinemaId} showCinemaNameHeader={true} />
        </div>
    );
}
