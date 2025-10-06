"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FiMenu, FiSearch, FiLogOut } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";

interface Tab {
  name: string;
  path: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  tabs: { name: string; path: string; icon: React.ReactNode }[];
}

export default function Sidebar({
  isSidebarOpen,
  setIsSidebarOpen,
  tabs,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [filteredTabs, setFilteredTabs] = useState<Tab[]>(tabs);

  useEffect(() => {
    const normalized = searchTerm.normalize("NFC").toLowerCase();
    setFilteredTabs(
      tabs.filter((tab) =>
        tab.name.normalize("NFC").toLowerCase().includes(normalized)
      )
    );
  }, [searchTerm, tabs]);

  return (
    <div
      className={`${
        isSidebarOpen ? "w-[300px]" : "w-20"
      } bg-white shadow-lg transition-all duration-300 ease-in-out h-screen flex flex-col`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {isSidebarOpen && (
          <h1 className="font-bold text-xl text-gray-800">
            Các màn hình quản lý
          </h1>
        )}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <FiMenu className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      {/* Search */}
      {isSidebarOpen && (
        <div className="p-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm chức năng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <nav className="p-4 flex-1 overflow-y-auto">
        <ul className="space-y-2">
          {filteredTabs.map((tab, index) => {
            const isActive = pathname === tab.path;
            return (
              <li key={index}>
                <Link
                  href={tab.path}
                  className={`flex items-center p-3 rounded-lg ${
                    isActive ? "text-blue-500 font-bold" : "text-gray-700"
                  } hover:bg-gray-100`}
                >
                  <span
                    className={isActive ? "text-blue-500" : "text-gray-700"}
                  >
                    {tab.icon}
                  </span>
                  {isSidebarOpen && <span className="ml-3">{tab.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="border-t p-4">
        <button
          onClick={() => {
            logout();
            router.push("/admin/auth");
          }}
          className="flex items-center w-full p-3 rounded-lg text-gray-700 hover:bg-gray-100"
        >
          <FiLogOut className="w-6 h-6" />
          {isSidebarOpen && <span className="ml-3">Đăng xuất</span>}
        </button>
      </div>
    </div>
  );
}
