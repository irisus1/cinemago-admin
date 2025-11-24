"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FiMenu, FiSearch, FiLogOut } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import Image from "next/image";
import { UserCircle2 } from "lucide-react";
import ProfileModal from "./profile/ProfileModal";
import AccountDropdown from "./profile/AccountDropdown";

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
  const { logout, user } = useAuth();
  const [openProfile, setOpenProfile] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filteredTabs, setFilteredTabs] = useState<Tab[]>(tabs);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

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
      <div className="flex items-center justify-between p-3 border-b">
        {isSidebarOpen && (
          <h1 className="font-bold text-xl text-gray-800">CinemaGo</h1>
        )}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <FiMenu className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      {/* Search Bar */}
      <nav className="p-3 flex-1 overflow-y-auto">
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

      {/* <div className="border-t p-1">
        <div
          className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-100"
          onClick={() => setIsUserMenuOpen(true)}
        >
          {user?.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt="avatar"
              width={36}
              height={36}
              className="rounded-full object-cover"
            />
          ) : (
            <UserCircle2 className="w-9 h-9 text-gray-500" />
          )}

          {isSidebarOpen && (
            <div>
              <div className="font-semibold text-gray-800">
                {user?.fullname}
              </div>
              <div className="text-xs text-gray-500">{user?.email}</div>
            </div>
          )}
        </div>
      </div>

      {isUserMenuOpen && (
        <div className="absolute bottom-20 left-4 w-64 bg-white shadow-xl rounded-xl border p-2 z-50">
          <div className="flex flex-col items-center ">
            {user?.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                width={70}
                height={70}
                className="rounded-full object-cover"
                alt=""
              />
            ) : (
              <UserCircle2 className="w-14 h-14 text-gray-500" />
            )}

            <div className="font-semibold">{user?.fullname}</div>
            <div className="text-gray-500 text-sm">{user?.email}</div>
          </div>

          <div className="mt-4 space-y-2">
            <button
              onClick={() => {
                setIsUserMenuOpen(false);
                setIsProfileModalOpen(true);
              }}
              className="w-full py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
            >
              Thông tin cá nhân
            </button>

            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="w-full py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      )} */}
      <AccountDropdown
        isSidebarOpen={isSidebarOpen}
        onOpenProfile={() => setOpenProfile(true)}
      />

      <ProfileModal open={openProfile} onClose={() => setOpenProfile(false)} />
    </div>
  );
}
