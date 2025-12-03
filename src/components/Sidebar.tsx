"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiMenu, FiChevronDown, FiChevronRight } from "react-icons/fi";
import { useState } from "react";

import ProfileModal from "./profile/ProfileModal";
import AccountDropdown from "./profile/AccountDropdown";
import type { SidebarTab } from "@/constants/constants";

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  tabs: SidebarTab[];
}

export default function Sidebar({
  isSidebarOpen,
  setIsSidebarOpen,
  tabs,
}: SidebarProps) {
  const pathname = usePathname();
  const [openProfile, setOpenProfile] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (name: string) => {
    if (!isSidebarOpen) {
      setIsSidebarOpen(true);
      setOpenGroups((prev) => ({ ...prev, [name]: true }));
      return;
    }
    setOpenGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div
      className={`${
        isSidebarOpen ? "w-[300px]" : "w-20"
      } bg-white shadow-lg transition-all duration-300 ease-in-out h-screen flex flex-col z-50 relative`} // Thêm z-50 để sidebar nổi lên trên nội dung chính
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

      <nav
        className={`p-3 flex-1 ${
          isSidebarOpen ? "overflow-y-auto" : "overflow-visible"
        }`}
      >
        <ul className="space-y-2">
          {tabs.map((tab, index) => {
            if (tab.type === "group") {
              const isChildActive = tab.children.some(
                (child) => child.path === pathname
              );
              const isGroupOpen = openGroups[tab.name] ?? isChildActive;

              return (
                <li key={index} className="group relative">
                  <button
                    type="button"
                    onClick={() => toggleGroup(tab.name)}
                    className={`flex items-center w-full px-3 py-3.5 rounded-xl justify-between text-[15px] ${
                      isChildActive
                        ? "text-blue-600 font-semibold bg-blue-50"
                        : "text-gray-700 hover:bg-gray-100"
                    } transition-colors duration-200`}
                  >
                    <div className="flex items-center">
                      <span
                        className={
                          isChildActive ? "text-blue-600" : "text-gray-700"
                        }
                      >
                        {tab.icon}
                      </span>
                      {isSidebarOpen && (
                        <span className="ml-3 truncate">{tab.name}</span>
                      )}
                    </div>

                    {isSidebarOpen && (
                      <span className="ml-2">
                        {isGroupOpen ? (
                          <FiChevronDown className="w-4 h-4" />
                        ) : (
                          <FiChevronRight className="w-4 h-4" />
                        )}
                      </span>
                    )}
                  </button>

                  {isSidebarOpen && (
                    <ul
                      className={`
                        ml-4 space-y-1 overflow-hidden
                        transition-all duration-300 ease-in-out
                        ${
                          isGroupOpen
                            ? "max-h-40 opacity-100 mt-1"
                            : "max-h-0 opacity-0"
                        }
                      `}
                    >
                      {tab.children.map((child, childIndex) => {
                        const isActive = pathname === child.path;
                        return (
                          <li key={childIndex}>
                            <Link
                              href={child.path}
                              className={`flex items-center px-3 py-2.5 rounded-lg text-[14px] ${
                                isActive
                                  ? "text-blue-600 font-semibold bg-blue-50"
                                  : "text-gray-700 hover:bg-gray-100"
                              } transition-colors duration-200`}
                            >
                              <span
                                className={
                                  isActive ? "text-blue-600" : "text-gray-700"
                                }
                              >
                                {child.icon}
                              </span>
                              <span className="ml-2 truncate">
                                {child.name}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {!isSidebarOpen && (
                    <div className="absolute left-full top-0 ml-2 w-48 bg-white border border-gray-200 shadow-xl rounded-lg p-2 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all z-50">
                      <div className="px-3 py-2 text-sm font-bold text-gray-500 border-b mb-1">
                        {tab.name}
                      </div>
                      <ul className="space-y-1">
                        {tab.children.map((child, childIndex) => {
                          const isActive = pathname === child.path;
                          return (
                            <li key={childIndex}>
                              <Link
                                href={child.path}
                                className={`flex items-center px-3 py-2 rounded-md text-[14px] ${
                                  isActive
                                    ? "text-blue-600 bg-blue-50 font-medium"
                                    : "text-gray-700 hover:bg-gray-100"
                                }`}
                              >
                                {child.icon}
                                <span className="ml-2">{child.name}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </li>
              );
            }

            const isActive = pathname === tab.path;

            return (
              <li key={index} className="group relative">
                <Link
                  href={tab.path}
                  className={`flex items-center p-3 rounded-lg ${
                    isActive
                      ? "text-blue-500 font-bold bg-blue-50"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span
                    className={isActive ? "text-blue-500" : "text-gray-700"}
                  >
                    {tab.icon}
                  </span>
                  {isSidebarOpen && (
                    <span className="ml-3 truncate">{tab.name}</span>
                  )}
                </Link>

                {!isSidebarOpen && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md whitespace-nowrap invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all z-50 pointer-events-none">
                    {tab.name}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <AccountDropdown
        isSidebarOpen={isSidebarOpen}
        onOpenProfile={() => setOpenProfile(true)}
      />
      <ProfileModal open={openProfile} onClose={() => setOpenProfile(false)} />
    </div>
  );
}
