import axios from "axios";
import api from "@/config/api";
import { jwtDecode } from "jwt-decode";
import type { User } from "./user.service";
import { ACCESS_TOKEN_KEY } from "@/constants/auth";
import { log } from "console";

export interface LoginResponse {
  accessToken: string;
  refreshToken: string; // BE vẫn trả về trong body
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
      if (data.refreshToken) this.setRefreshCookie(data.refreshToken); //  lưu refresh vào cookie
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
      const refreshToken = this.getRefreshCookie();
      await api.post("/auth/logout", { refreshToken });
    } catch (e) {
      console.warn("Logout error:", e);
    } finally {
      this.clearLocalAuth();
      this.deleteRefreshCookie();
    }
  }

  // === REFRESH TOKEN ===
  async refreshAccessToken(): Promise<{ accessToken: string }> {
    try {
      const refreshToken = this.getRefreshCookie();
      if (!refreshToken) throw new Error("No refresh token");

      const { data } = await api.post<{
        accessToken: string;
        refreshToken?: string;
      }>("/auth/refresh-token", { refreshToken });

      if (data.accessToken)
        localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      if (data.refreshToken) this.setRefreshCookie(data.refreshToken);

      return { accessToken: data.accessToken };
    } catch (e) {
      this.clearLocalAuth();
      this.deleteRefreshCookie();
      throw new Error(getMsg(e, "Không thể làm mới phiên đăng nhập."));
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
  // === Cookie helpers ===
  setRefreshCookie(token: string) {
    const exp = 7 * 24 * 60 * 60; // 7 ngày
    document.cookie = `refreshToken=${token}; Max-Age=${exp}; Path=/; SameSite=Strict; Secure`;
  }

  getRefreshCookie(): string | null {
    const match = document.cookie.match(/(^| )refreshToken=([^;]+)/);
    return match ? match[2] : null;
  }

  deleteRefreshCookie() {
    document.cookie =
      "refreshToken=; Max-Age=0; Path=/; SameSite=Strict; Secure";
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
