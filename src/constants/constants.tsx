import { FiFilm, FiChrome, FiUser } from "react-icons/fi";
import { MdStars } from "react-icons/md";
import { TbTheater } from "react-icons/tb";
import { FaUserShield } from "react-icons/fa";
import { LucideTicket } from "lucide-react";
import { RxDashboard } from "react-icons/rx";
import { BiFoodMenu } from "react-icons/bi";

export const adminTabs = [
  {
    name: "Trang chủ",
    path: "/admin/dashboard",
    icon: <RxDashboard className="w-6 h-6" />,
  },
  {
    name: "Đặt vé trực tiếp",
    path: "/admin/ticket",
    icon: <LucideTicket className="w-6 h-6" />,
  },
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
    name: "Quản lý rạp chiếu phim",
    path: "/admin/cinema",
    icon: <TbTheater className="w-6 h-6" />,
  },
  {
    name: "Quản lý đồ ăn/uống",
    path: "/admin/food-drink",
    icon: <BiFoodMenu className="w-6 h-6" />,
  },
  {
    name: "Đánh giá phim",
    path: "/admin/reviews",
    icon: <MdStars className="w-6 h-6" />,
  },
  {
    name: "Quản lý người dùng",
    path: "/admin/users",
    icon: <FiUser className="w-6 h-6" />,
  },
  // {
  //   name: "Thông tin cá nhân",
  //   path: "/admin/me",
  //   icon: <FaUserShield className="w-6 h-6" />,
  // },
];
