// "use client";

// import { createContext, useContext, useState, ReactNode } from "react";
// import api from "@/config/api";
// import { getCookie, setCookie, deleteCookie } from "@/utils/auth";
// import { log } from "console";
// import { isAbsolute } from "path";

// interface User {
//   id: string;
//   fullname: string;
//   email: string;
//   role: string;
//   isActive: boolean;
// }

// interface AuthContextType {
//   accessToken: string | null;
//   refreshToken: string | null;
//   userDetail: User | null;
//   login: (email: string, password: string) => Promise<void>;
//   forgotPassword: (email: string) => Promise<void>;
//   resetPassword: (
//     email: string,
//     newPassword: string,
//     otp: string
//   ) => Promise<void>;
//   fetchEmployeeDetail: () => Promise<void>;
//   setUserDetail: (data: User) => void;
//   logout: () => Promise<void>;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export const AuthProvider = ({ children }: { children: ReactNode }) => {
//   const [accessToken, setAccessToken] = useState<string | null>(null);
//   const [refreshToken, setRefreshToken] = useState<string | null>(null);
//   const [userDetail, _setUserDetail] = useState<User | null>(null);

//   const login = async (email: string, password: string) => {
//     const res = await api.post("/auth/login", { email, password });
//     console.log(res);
//     // === ĐIỂM THÊM VÀO Ở ĐÂY ===
//     setAccessToken(res.data.accessToken);
//     setRefreshToken(res.data.refreshToken);
//     localStorage.setItem("accessToken", res.data.accessToken);

//     setCookie("refreshToken", res.data.refreshToken, { path: "/" });

//     // // Lưu vào localStorage nếu muốn giữ login sau reload
//     // localStorage.setItem("accessToken", res.data.accessToken);
//     // localStorage.setItem("refreshToken", res.data.refreshToken);
//   };

//   const forgotPassword = async (email: string) => {
//     await api.post("/auth/forgot-password", { email });
//     localStorage.setItem("resetEmail", email); // để dùng cho bước OTP + reset pass
//   };

//   const logout = async () => {
//     if (refreshToken) {
//       await api.post("/auth/logout", { token: refreshToken });
//     }
//     setAccessToken(null);
//     setRefreshToken(null);
//     setUserDetail(null);
//     localStorage.removeItem("accessToken");
//     deleteCookie("refreshToken");
//     localStorage.removeItem("resetEmail");
//   };

//   const resetPassword = async (
//     email: string,
//     otp: string,
//     newPassword: string
//   ) => {
//     const res = await api.post("/auth/reset-password", {
//       email,
//       newPassword,
//       otp,
//     });
//     console.log(res);
//     return res.data;
//   };

//   const setUserDetail = (data: User) => {
//     _setUserDetail(data); // Hàm này dùng để cập nhật state userDetail
//   };

//   const fetchEmployeeDetail = async () => {
//     if (!accessToken) return;
//     const res = await api.get("/users/profile", {
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//       },
//     });
//     console.log("auth: ", res);

//     setUserDetail(res.data.data);
//   };

//   return (
//     <AuthContext.Provider
//       value={{
//         accessToken,
//         refreshToken,
//         userDetail,
//         login,
//         forgotPassword,
//         resetPassword,
//         logout,
//         setUserDetail,
//         fetchEmployeeDetail,
//       }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) throw new Error("useAuth must be used within AuthProvider");
//   return context;
// };

"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { authService, userService, type User } from "@/services";
import api from "@/config/api";
import { toast } from "sonner";

// ======================== TYPES ========================
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoggingOut: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (
    email: string,
    otp: string,
    newPassword: string
  ) => Promise<void>;
}

// ======================== CONTEXT ========================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

// ======================== PROVIDER ========================
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // ===== INIT AUTH STATE =====
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Nếu access token đã hết hạn → clear local
        if (authService.isTokenExpired()) {
          console.warn("Token expired on init, clearing auth data");
          authService.clearLocalAuth();
          setUser(null);
          setIsLoading(false);
          return;
        }

        if (authService.isAuthenticated()) {
          // Lấy user từ localStorage (nếu có)
          const storedUser = authService.getStoredUser();
          if (storedUser) setUser(storedUser);

          // Gọi API lấy user mới nhất
          try {
            const res = await api.get<{ data: User }>("/users/profile");
            const currentUser = res.data.data;
            setUser(currentUser);
            localStorage.setItem("user", JSON.stringify(currentUser));
          } catch (e) {
            console.warn("Failed to fetch profile:", e);
          }
        }
      } catch (error) {
        console.error("Auth init error:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // ===== AUTO REFRESH TOKEN =====
  useEffect(() => {
    const checkAndRefresh = async () => {
      console.log("đã qua 60s");

      const hasToken = !!authService.getToken();
      if (!hasToken) return;

      //Nếu token hết hạn
      if (authService.isTokenExpired()) {
        try {
          await authService.refreshAccessToken();
          console.log("Token refreshed after expiration");
          await refreshUser();
        } catch (error) {
          console.warn("Token refresh failed:", error);
          await logout();
        }
      }
      // Nếu token sắp hết hạn
      else if (authService.isTokenExpiringSoon(1)) {
        try {
          await authService.refreshAccessToken();
          console.log("Token refreshed proactively");
        } catch {
          console.warn("Proactive refresh failed");
        }
      }
    };

    checkAndRefresh();
    const interval = setInterval(checkAndRefresh, 60000); // check mỗi phút
    return () => clearInterval(interval);
  }, []);

  // ===== LOGIN =====
  const login = async (email: string, password: string) => {
    try {
      const res = await authService.login(email, password);
      toast.success("Đăng nhập thành công!");
      if (res.user) {
        setUser(res.user);
        localStorage.setItem("user", JSON.stringify(res.user));
      } else {
        await refreshUser();
      }
    } catch (error) {
      throw error;
    }
  };

  // ===== LOGOUT =====
  const logout = async () => {
    setIsLoggingOut(true);
    try {
      await authService.logout();
      toast.success("Đã đăng xuất");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setIsLoggingOut(false);
    }
  };

  // ===== REFRESH USER INFO =====
  const refreshUser = async () => {
    try {
      const res = await userService.getMe();
      setUser(res);
      localStorage.setItem("user", JSON.stringify(res));
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  };

  // ===== FORGOT PASSWORD =====
  const forgotPassword = async (email: string) => {
    try {
      await api.post("/auth/forgot-password", { email });
      localStorage.setItem("resetEmail", email);
      toast.success("Mã xác thực đã được gửi đến email của bạn.");
    } catch (error) {
      toast.error("Không thể gửi mã xác thực.");
      throw error;
    }
  };

  // ===== RESET PASSWORD =====
  const resetPassword = async (
    email: string,
    otp: string,
    newPassword: string
  ) => {
    try {
      await api.post("/auth/reset-password", { email, otp, newPassword });
      toast.success("Đặt lại mật khẩu thành công!");
    } catch (error) {
      toast.error("Không thể đặt lại mật khẩu.");
      throw error;
    }
  };

  // ===== CONTEXT VALUE =====
  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoggingOut,
    isLoading,
    login,
    logout,
    refreshUser,
    forgotPassword,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
