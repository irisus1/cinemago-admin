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

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoggingOut: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (
    email: string,
    otp: string,
    newPassword: string,
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.location.pathname === "/login"
    ) {
      setIsLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        const token = authService.getToken();

        if (token) {
          if (!authService.isTokenExpired()) {
            await fetchProfile();
          } else {
            console.log("Token expired on init, attempting refresh...");
            await tryRefreshAndFetchProfile();
          }
        } else {
          console.log("No token found, checking refresh cookie...");
          await tryRefreshAndFetchProfile();
        }
      } catch (error) {
        console.error("Auth init failed:", error);
        authService.clearLocalAuth();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const fetchProfile = async () => {
    const storedUser = authService.getStoredUser();
    if (storedUser) setUser(storedUser);

    try {
      const res = await api.get<{ data: User }>("/users/profile");
      setUser(res.data.data);
      localStorage.setItem("user", JSON.stringify(res.data.data));
    } catch (e) {
      console.warn(
        "Fetch profile failed (server might be down or token invalid)",
        e,
      );
      throw e;
    }
  };

  const tryRefreshAndFetchProfile = async () => {
    try {
      await authService.refreshAccessToken();
      await fetchProfile();
    } catch (e) {
      console.warn("Refresh failed on init. Session really expired.");
      throw e;
    }
  };

  useEffect(() => {
    if (isLoading) return;
    const checkAndRefresh = async () => {
      console.log("đã qua 60s");

      const hasToken = !!authService.getToken();
      if (!hasToken) return;

      if (authService.isTokenExpired()) {
        try {
          await authService.refreshAccessToken();
          console.log("Token refreshed after expiration");
          await refreshUser();
        } catch (error) {
          console.warn("Token refresh failed:", error);
          await logout();
        }
      } else if (authService.isTokenExpiringSoon(1)) {
        try {
          await authService.refreshAccessToken();
          console.log("Token refreshed proactively");
        } catch {
          console.warn("Proactive refresh failed");
        }
      }
    };

    // checkAndRefresh();
    const interval = setInterval(checkAndRefresh, 60000);
    return () => clearInterval(interval);
  }, [isLoading]);

  const login = async (email: string, password: string) => {
    try {
      const res = await authService.login(email, password);

      console.log(res);

      await refreshUser();
      return user;
    } catch (error) {
      throw error;
    }
  };

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

  const refreshUser = async () => {
    try {
      const res = await userService.getMe();
      console.log(res);

      setUser(res);
      localStorage.setItem("user", JSON.stringify(res));
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      await api.post("/auth/forgot-password", { email });
      localStorage.setItem("resetEmail", email);
    } catch (error) {
      toast.error("Không thể gửi mã xác thực.");
      throw error;
    }
  };

  const resetPassword = async (
    email: string,
    otp: string,
    newPassword: string,
  ) => {
    try {
      await api.post("/auth/reset-password", { email, otp, newPassword });
      toast.success("Đặt lại mật khẩu thành công!");
    } catch (error) {
      toast.error("Không thể đặt lại mật khẩu.");
      throw error;
    }
  };

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
