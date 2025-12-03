import axios from "axios";
import api from "@/config/api";
import { jwtDecode } from "jwt-decode";
import type { User } from "./user.service";
import { ACCESS_TOKEN_KEY } from "@/constants/auth";
import {
  setRefreshTokenCookie,
  deleteRefreshTokenCookie,
  refreshAccessTokenAction,
} from "@/app/action/auth";

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user?: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  phone: string;
  first_name: string;
  last_name: string;
}

type ApiErrorBody = { message?: string; error?: string };
const getMsg = (e: unknown, fb: string) =>
  axios.isAxiosError<ApiErrorBody>(e)
    ? e.response?.data?.message ?? e.response?.data?.error ?? e.message ?? fb
    : fb;

type JwtPayloadBase = { exp?: number; iat?: number } & Record<string, unknown>;

class AuthService {
  // === LOGIN ===
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const { data } = await api.post<LoginResponse>("/auth/login", {
        email,
        password,
      });

      if (data.accessToken) {
        localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
        api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
      }

      if (data.refreshToken) {
        await setRefreshTokenCookie(data.refreshToken);
      }

      if (data.user) localStorage.setItem("user", JSON.stringify(data.user));

      return data;
    } catch (e) {
      throw new Error(getMsg(e, "Đăng nhập thất bại."));
    }
  }

  // === REGISTER ===
  async register(
    body: RegisterRequest
  ): Promise<{ data: User; message: string }> {
    try {
      const { data } = await api.post<{ data: User; message: string }>(
        "/auth/signup",
        body
      );
      return data;
    } catch (e) {
      throw new Error(getMsg(e, "Đăng ký thất bại."));
    }
  }

  // === LOGOUT ===
  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      console.warn("Logout error:", e);
    } finally {
      this.clearLocalAuth();
      await deleteRefreshTokenCookie();
    }
  }

  // === CHANGE PASS ===
  async changePassword(payload: {
    oldPassword: string;
    newPassword: string;
  }): Promise<string> {
    try {
      const { data } = await api.post<{ message: string }>(
        "/auth/change-password",
        payload
      );
      return data.message || "Đổi mật khẩu thành công.";
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể đổi mật khẩu.");
      console.error("Change password error:", e);
      throw new Error(msg);
    }
  }

  // === REFRESH TOKEN ===
  async refreshAccessToken(): Promise<{ accessToken: string }> {
    try {
      const newAccessToken = await refreshAccessTokenAction();

      if (newAccessToken) {
        localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
      }

      console.log("Token refreshed via Server Action");
      return { accessToken: newAccessToken };
    } catch (e) {
      this.clearLocalAuth();
      // await deleteRefreshTokenCookie(); // Action đã tự xóa nếu lỗi
      throw new Error("Phiên đăng nhập hết hạn.");
    }
  }

  // === Local token helpers ===
  getToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  clearLocalAuth() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem("user");
  }

  getStoredUser(): User | null {
    const s = localStorage.getItem("user");
    if (!s) return null;
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token && !this.isTokenExpired();
  }

  // === Token expiration ===
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    const decoded = jwtDecode<JwtPayloadBase>(token);
    const now = Math.floor(Date.now() / 1000);
    return !decoded.exp || decoded.exp <= now;
  }

  isTokenExpiringSoon(thresholdMinutes = 5): boolean {
    const token = this.getToken();
    if (!token) return false;
    const decoded = jwtDecode<JwtPayloadBase>(token);
    const now = Math.floor(Date.now() / 1000);
    if (!decoded.exp) return false;
    return decoded.exp - now < thresholdMinutes * 60;
  }
}

export const authService = new AuthService();
