"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { LogOut, User } from "lucide-react";
import Image from "next/image";

export default function AccountDropdown({
  onOpenProfile,
  isSidebarOpen,
}: {
  onOpenProfile: () => void;
  isSidebarOpen: boolean;
}) {
  const { user, logout } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-100 transition">
        <Image
          src={user?.avatarUrl || "/default-avatar.png"}
          alt="avatar"
          width={80}
          height={80}
          className="w-10 h-10 rounded-full object-cover"
        />
        {isSidebarOpen && (
          <div className="flex flex-col text-left">
            <span className="font-semibold">{user?.fullname}</span>
            <span className="text-sm text-gray-500">{user?.email}</span>
          </div>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-64 shadow-lg rounded-xl p-2"
        align="end"
      >
        {/* Avatar + name */}
        <DropdownMenuLabel className="flex items-center gap-3 p-2">
          <Image
            src={user?.avatarUrl || "/default-avatar.png"}
            alt="avatar"
            width={80}
            height={80}
            className="w-12 h-12 rounded-full object-cover"
          />
          <div>
            <p className="font-semibold">{user?.fullname}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Tài khoản */}
        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer px-3 py-2"
          onClick={onOpenProfile}
        >
          <User className="w-4 h-4" />
          <span>Tài khoản</span>
        </DropdownMenuItem>

        {/* Đăng xuất */}
        <DropdownMenuItem
          onClick={logout}
          className="flex items-center gap-2 cursor-pointer px-3 py-2 text-red-600 focus:text-red-600"
        >
          <LogOut className="w-4 h-4" />
          <span>Đăng xuất</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
