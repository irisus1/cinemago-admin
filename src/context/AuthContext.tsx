"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import api from "@/config/api";
import { getCookie, setCookie, deleteCookie } from "@/utils/auth";
import { log } from "console";
import { isAbsolute } from "path";

interface User {
  id: string;
  fullname: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface AuthContextType {
  accessToken: string | null;
  refreshToken: string | null;
  userDetail: User | null;
  login: (email: string, password: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (
    email: string,
    newPassword: string,
    otp: string
  ) => Promise<void>;
  fetchEmployeeDetail: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    console.log(res);
    // === ĐIỂM THÊM VÀO Ở ĐÂY ===
    setAccessToken(res.data.accessToken);
    setRefreshToken(res.data.refreshToken);
    localStorage.setItem("accessToken", res.data.accessToken);

    setCookie("refreshToken", res.data.refreshToken, { path: "/" });

    // // Lưu vào localStorage nếu muốn giữ login sau reload
    // localStorage.setItem("accessToken", res.data.accessToken);
    // localStorage.setItem("refreshToken", res.data.refreshToken);
  };

  const forgotPassword = async (email: string) => {
    await api.post("/auth/forgot-password", { email });
    localStorage.setItem("resetEmail", email); // để dùng cho bước OTP + reset pass
  };

  const logout = async () => {
    if (refreshToken) {
      await api.post("/auth/logout", { token: refreshToken });
    }
    setAccessToken(null);
    setRefreshToken(null);
    setUserDetail(null);
    localStorage.removeItem("accessToken");
    deleteCookie("refreshToken");
    localStorage.removeItem("resetEmail");
  };

  const resetPassword = async (
    email: string,
    otp: string,
    newPassword: string
  ) => {
    const res = await api.post("/auth/reset-password", {
      email,
      newPassword,
      otp,
    });
    console.log(res);
    return res.data;
  };

  const fetchEmployeeDetail = async () => {
    if (!accessToken) return;
    const res = await api.get("/users/profile", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    setUserDetail(res.data.data);
  };

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        refreshToken,
        userDetail,
        login,
        forgotPassword,
        resetPassword,
        logout,
        fetchEmployeeDetail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
