// adminTabs.tsx
import { FiFilm, FiChrome, FiUser } from "react-icons/fi";
import { MdStars } from "react-icons/md";
import { TbTheater } from "react-icons/tb";
import { LucideTicket } from "lucide-react";
import { RxDashboard } from "react-icons/rx";
import { BiFoodMenu } from "react-icons/bi";
import { MdOutlineBookmarks } from "react-icons/md";
import { MdOutlineSchedule } from "react-icons/md";
import { LuScreenShare } from "react-icons/lu";
import { GiFilmSpool } from "react-icons/gi";
import { GiTheaterCurtains } from "react-icons/gi";

export type SidebarTab =
  | {
    type?: "item"; // mặc định
    name: string;
    path: string;
    icon: React.ReactNode;
    allowedRoles?: string[]; // ["ADMIN", "MANAGER", "EMPLOYEE"]
  }
  | {
    type: "group";
    name: string;
    icon: React.ReactNode;
    allowedRoles?: string[];
    children: {
      name: string;
      path: string;
      icon: React.ReactNode;
      allowedRoles?: string[];
    }[];
  };

export const adminTabs: SidebarTab[] = [
  {
    name: "Trang chủ",
    path: "/admin/dashboard",
    icon: <RxDashboard className="w-6 h-6" />,
    allowedRoles: ["ADMIN", "MANAGER"],
  },
  {
    name: "Đặt vé trực tiếp",
    path: "/admin/ticket",
    icon: <LucideTicket className="w-6 h-6" />,
    allowedRoles: ["ADMIN", "MANAGER", "EMPLOYEE"],
  },
  {
    name: "Quản lý đơn vé",
    path: "/admin/bookings",
    icon: <MdOutlineBookmarks className="w-6 h-6" />,
    allowedRoles: ["ADMIN", "MANAGER"],
  },

  // ==== GROUP: Phim & suất chiếu ====
  {
    type: "group",
    name: "Phim & suất chiếu",
    icon: <GiFilmSpool className="w-6 h-6" />,
    allowedRoles: ["ADMIN", "MANAGER"],
    children: [
      {
        name: "Quản lý phim",
        path: "/admin/movies",
        icon: <FiFilm className="w-5 h-5" />,
      },
      {
        name: "Quản lý suất chiếu",
        path: "/admin/showtimes",
        icon: <MdOutlineSchedule className="w-5 h-5" />,
      },
    ],
  },

  // ==== GROUP: Rạp & phòng chiếu ====
  {
    type: "group",
    name: "Rạp & phòng chiếu",
    icon: <GiTheaterCurtains className="w-6 h-6" />,
    allowedRoles: ["ADMIN", "MANAGER"],
    children: [
      {
        name: "Quản lý rạp chiếu phim",
        path: "/admin/cinema",
        icon: <TbTheater className="w-5 h-5" />,
        allowedRoles: ["ADMIN"], // Manager không quản lý danh sách rạp (họ chỉ quản lý rạp của họ -> sẽ xử lý logic riêng hoặc ẩn luôn tab này nếu không cần thiết. Theo yêu cầu: Manager xem Báo cáo, Phim, Lịch chiếu.)
        // Theo prompt: MANAGER xem "Quản lý phim, Lịch chiếu, Báo cáo". "Quản lý rạp" không được nhắc đến explicit là được xem list rạp. 
        // Tuy nhiên, nếu Manager quản lý 1 rạp, họ có thể cần vào xem detail rạp của họ. 
        // Tạm thời để ADMIN cho "Quản lý rạp chiếu phim" (list), nếu Manager cần xem rạp của mình thì họ sẽ xem qua Dashboard hoặc trang Profile rạp riêng.
        // Prompt nói: ẩn menu hệ thống như "Quản lý Tài khoản", "Cấu hình hệ thống".
        // Và "Cinema Selector... Manager: Ẩn dropdown, hiển thị tên rạp".
        // Để an toàn, tôi sẽ để ADMIN cho submenu "Quản lý rạp chiếu phim". "Quản lý phòng chiếu" thì Manager cần để tạo phòng cho rạp họ? 
        // Prompt không nói rõ "Quản lý phòng chiếu". Chắc chắn là có.
      },
      {
        name: "Quản lý phòng chiếu",
        path: "/admin/rooms",
        icon: <LuScreenShare className="w-5 h-5" />,
        allowedRoles: ["ADMIN", "MANAGER"],
      },
    ],
  },

  {
    name: "Quản lý thể loại phim",
    path: "/admin/genres",
    icon: <FiChrome className="w-6 h-6" />,
    allowedRoles: ["ADMIN", "MANAGER"],
  },
  {
    name: "Quản lý đồ ăn/uống",
    path: "/admin/food-drink",
    icon: <BiFoodMenu className="w-6 h-6" />,
    allowedRoles: ["ADMIN", "MANAGER"],
  },
  {
    name: "Đánh giá phim",
    path: "/admin/reviews",
    icon: <MdStars className="w-6 h-6" />,
    allowedRoles: ["ADMIN", "MANAGER"],
  },
  {
    name: "Quản lý người dùng",
    path: "/admin/users",
    icon: <FiUser className="w-6 h-6" />,
    allowedRoles: ["ADMIN"],
  },
];
