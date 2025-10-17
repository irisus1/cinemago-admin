import {
  FiFilm,
  FiChrome,
  FiCalendar,
  FiPackage,
  FiList,
  FiFile,
  FiGift,
  FiShield,
  FiUser,
  FiLock,
} from "react-icons/fi";
import { RxDashboard } from "react-icons/rx";

export const adminTabs = [
  {
    name: "Quản lý phim",
    path: "/admin/movies",
    icon: <FiFilm className="w-6 h-6" />,
  },
  {
    name: "Quản lý thể loại phim",
    path: "/admin/genres",
    icon: <FiChrome className="w-6 h-6" />,
  },
  {
    name: "Biểu đồ suất phim",
    path: "/admin/film-show-management/chart",
    icon: <FiCalendar className="w-6 h-6" />,
  },
  {
    name: "Duyệt vé",
    path: "/admin/ticket-management/print-list",
    icon: <FiPackage className="w-6 h-6" />,
  },
  {
    name: "Danh sách rạp phim",
    path: "/admin/ticket-management/serve-list",
    icon: <FiPackage className="w-6 h-6" />,
  },
  {
    name: "Quản lý phòng",
    path: "/admin/room-management",
    icon: <FiList className="w-6 h-6" />,
  },
  {
    name: "Báo cáo & Thống kê",
    path: "/admin/statistic",
    icon: <FiFile className="w-6 h-6" />,
  },
  {
    name: "Quản lý sản phẩm ngoài",
    path: "/admin/additionalItem",
    icon: <FiGift className="w-6 h-6" />,
  },
  {
    name: "Quản lý tài khoản",
    path: "/admin/user-account",
    icon: <RxDashboard className="w-6 h-6" />,
  },
  {
    name: "Cài đặt hệ thống",
    path: "/admin/admin-param",
    icon: <FiShield className="w-6 h-6" />,
  },
  {
    name: "Quản lý nhân viên",
    path: "/admin/employee-management",
    icon: <FiUser className="w-6 h-6" />,
  },
  {
    name: "Quản lý sự kiện",
    path: "/admin/promotion-management",
    icon: <FiLock className="w-6 h-6" />,
  },
];
