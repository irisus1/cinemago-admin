"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiMenu,
  FiChevronDown,
  FiChevronRight,
  FiMapPin,
} from "react-icons/fi";
import { useState, useEffect } from "react";
import Image from "next/image";
import ProfileModal from "./profile/ProfileModal";
import AccountDropdown from "./profile/AccountDropdown";
import type { SidebarTab } from "@/constants/constants";
import { useAuth } from "@/context/AuthContext";
import { useCinemaStore } from "@/store/useCinemaStore";
import { cinemaService, type Cinema, type CinemaPublic } from "@/services";

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
  const { user } = useAuth();
  const pathname = usePathname();
  const [openProfile, setOpenProfile] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const { selectedCinemaId, setSelectedCinema } = useCinemaStore();
  const [currentCinema, setCurrentCinema] = useState<Cinema | CinemaPublic | null>(
    null
  );

  const filteredTabs = tabs
    .filter((tab) => {
      if (!user) return false;
      if (tab.allowedRoles && !tab.allowedRoles.includes(user.role))
        return false;
      return true;
    })
    .map((tab) => {
      if (tab.type === "group" && tab.children) {
        const validChildren = tab.children.filter(
          (child) =>
            !child.allowedRoles || child.allowedRoles.includes(user!.role)
        );

        if (validChildren.length === 1) {
          return {
            ...validChildren[0],
          };
        }

        return { ...tab, children: validChildren };
      }
      return tab;
    })
    .filter((tab) => {
      if (tab.type === "group" && tab.children.length === 0) {
        return false;
      }
      return true;
    });

  useEffect(() => {
    const fetchCinema = async () => {
      if (!user) return;

      const targetId = selectedCinemaId || user.cinemaId;

      if (!targetId) {
        setCurrentCinema(null);
        return;
      }

      try {
        const res = await cinemaService.getCinemaById(targetId);

        setCurrentCinema(res);
      } catch (e) {
        console.error(e);
      }
    };

    fetchCinema();
  }, [user, selectedCinemaId, setSelectedCinema]);

  const toggleGroup = (name: string) => {
    if (!isSidebarOpen) {
      setIsSidebarOpen(true);
      setOpenGroups((prev) => ({ ...prev, [name]: true }));
      return;
    }
    setOpenGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const renderCinemaSelector = () => {
    if (!user) return null;

    if (
      user.role === "MANAGER" ||
      user.role === "EMPLOYEE"

    ) {
      if (!currentCinema) {
        if (!selectedCinemaId) return null;

        return (
          <div className="flex justify-center py-4 border-b">
            <span className="text-gray-400 text-xs">...</span>
          </div>
        )
      }

      const cinemaName = currentCinema.name;
      if (!isSidebarOpen)
        return (
          <div className="flex justify-center py-4 border-b">
            <FiMapPin className="text-gray-600 w-6 h-6" title={cinemaName} />
          </div>
        );
      return (
        <div className="px-3 py-4 border-b">
          <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">
            Rạp chiếu phim
          </label>
          <div className="font-bold text-gray-800 flex items-center gap-2">
            <FiMapPin className="text-blue-600" />
            <span className="truncate">{cinemaName}</span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className={`${isSidebarOpen ? "w-[300px]" : "w-20"
        } bg-white shadow-lg transition-all duration-300 ease-in-out h-screen flex flex-col z-50 relative`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        {isSidebarOpen && (
          <div className="flex items-center gap-2">
            <Image
              src="/CinemaGo.svg"
              alt="CinemaGo"
              width={120}
              height={32}
              className="h-8 w-auto"
            />
          </div>
        )}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <FiMenu className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      {/* Cinema Selector */}
      {renderCinemaSelector()}

      <nav
        className={`p-3 flex-1 ${isSidebarOpen ? "overflow-y-auto" : "overflow-visible"
          }`}
      >
        <ul className="space-y-2">
          {filteredTabs.map((tab, index) => {
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
                    className={`flex items-center w-full px-3 py-3.5 rounded-xl justify-between text-[15px] ${isChildActive
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
                        ${isGroupOpen
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
                              className={`flex items-center px-3 py-2.5 rounded-lg text-[14px] ${isActive
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
                                className={`flex items-center px-3 py-2 rounded-md text-[14px] ${isActive
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
                  className={`flex items-center p-3 rounded-lg ${isActive
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
