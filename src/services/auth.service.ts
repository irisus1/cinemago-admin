import apiClient from "../lib/axios";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import type { User } from "./UserService";

// ===== Types khớp với BE hiện tại =====
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  // nếu BE muốn trả kèm user thì thêm:
  user?: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  phone: string;
  first_name: string;
  last_name: string;
}

export interface RefreshTokenRequest {
  refreshToken: string; // camelCase theo BE controller
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

// ===== Helpers =====
type ApiErrorBody = { message?: string; error?: string };

const getMsg = (e: unknown, fb: string) =>
  axios.isAxiosError<ApiErrorBody>(e)
    ? e.response?.data?.message ?? e.response?.data?.error ?? e.message ?? fb
    : fb;

// /auth/me có thể trả { data: User } hoặc { user: User }
type MeResponse = { data: User } | { user: User };
function pickUserFromMe(resp: MeResponse): User {
  return "data" in resp ? resp.data : resp.user;
}

type JwtPayloadBase = { exp?: number; iat?: number } & Record<string, unknown>;

class AuthService {
  /**
   * Đăng nhập bằng email + password
   * BE: POST /auth/login -> { accessToken, refreshToken }
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const { data } = await apiClient.post<LoginResponse>("/auth/login", {
        email,
        password,
      });

      // Lưu token
      if (data.accessToken)
        localStorage.setItem("access_token", data.accessToken);
      if (data.refreshToken)
        localStorage.setItem("refresh_token", data.refreshToken);
      if (data.user) localStorage.setItem("user", JSON.stringify(data.user));

      // Không còn "expires_at" từ BE => dùng exp trong JWT
      return data;
    } catch (e: unknown) {
      const msg = getMsg(
        e,
        "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin."
      );
      console.error("Login error:", e);
      throw new Error(msg);
    }
  }

  /**
   * Đăng ký
   * BE mẫu của bạn đang trả: { data: user, message }
   */
  async register(
    body: RegisterRequest
  ): Promise<{ data: User; message: string }> {
    try {
      const { data } = await apiClient.post<{ data: User; message: string }>(
        "/auth/register",
        body
      );
      return data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Đăng ký thất bại. Vui lòng thử lại.");
      console.error("Register error:", e);
      throw new Error(msg);
    }
  }

  /**
   * Đăng xuất
   * BE: POST /auth/logout (yêu cầu refreshToken trong body + cần auth)
   */
  async logout(): Promise<void> {
    try {
      const refreshToken = this.getRefreshToken();
      await apiClient.post("/auth/logout", { refreshToken });
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      this.clearLocalAuth();
    }
  }

  private clearLocalAuth() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("token_expires_at"); // không dùng nữa nhưng xoá cho sạch
    localStorage.removeItem("user");
  }

  /**
   * Lấy user hiện tại
   * Ưu tiên /auth/me (chuẩn auth), fallback sang /users/profile nếu cần
   * Shape hợp lệ: { data: User } hoặc { user: User }
   */
  async getCurrentUser(): Promise<User> {
    try {
      const res = await apiClient.get<MeResponse>("/auth/me");
      const user = pickUserFromMe(res.data);
      localStorage.setItem("user", JSON.stringify(user));
      return user;
    } catch (e1: unknown) {
      // fallback nếu dự án dùng /users/profile
      try {
        const res = await apiClient.get<{ data: User }>("/users/profile");
        const user = res.data.data;
        localStorage.setItem("user", JSON.stringify(user));
        return user;
      } catch (e2: unknown) {
        const msg = getMsg(e2, "Không thể lấy thông tin người dùng.");
        console.error("Get current user error:", e1, e2);
        throw new Error(msg);
      }
    }
  }

  // ===== Token utils =====
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getStoredUser(): User | null {
    const s = localStorage.getItem("user");
    if (!s) return null;
    try {
      return JSON.parse(s) as User;
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return localStorage.getItem("access_token");
  }

  getRefreshToken(): string | null {
    return localStorage.getItem("refresh_token");
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    const decoded = jwtDecode<JwtPayloadBase>(token);
    if (!decoded?.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return decoded.exp <= now;
  }

  getTokenRemainingTime(): number {
    const token = this.getToken();
    if (!token) return 0;
    const decoded = jwtDecode<JwtPayloadBase>(token);
    if (!decoded?.exp) return 0;
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, decoded.exp - now);
    // có thể lưu vào state để UI countdown
  }

  isTokenExpiringSoon(minutesThreshold = 5): boolean {
    const remain = this.getTokenRemainingTime();
    return remain > 0 && remain < minutesThreshold * 60;
  }

  getTokenInfo(): JwtPayloadBase | null {
    const token = this.getToken();
    if (!token) return null;
    return jwtDecode<JwtPayloadBase>(token);
  }

  clearExpiredToken(): void {
    if (this.isTokenExpired()) {
      console.warn("Token expired, clearing authentication data");
      this.clearLocalAuth();
    }
  }

  /**
   * Refresh token
   * BE: POST /auth/refresh -> { accessToken, refreshToken }
   * (Route của bạn hiện yêu cầu auth middleware — xem phần BE đề xuất bên dưới)
   */
  async refreshAccessToken(): Promise<RefreshTokenResponse> {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) throw new Error("No refresh token available");

      const body: RefreshTokenRequest = { refreshToken };
      const { data } = await apiClient.post<RefreshTokenResponse>(
        "/auth/refresh",
        body
      );

      if (data.accessToken)
        localStorage.setItem("access_token", data.accessToken);
      if (data.refreshToken)
        localStorage.setItem("refresh_token", data.refreshToken);

      // tuỳ bạn, có thể gọi getCurrentUser() để đồng bộ lại user
      return data;
    } catch (e: unknown) {
      console.error("Refresh token error:", e);
      this.clearExpiredToken();
      const msg = getMsg(
        e,
        "Không thể làm mới phiên đăng nhập. Vui lòng đăng nhập lại."
      );
      throw new Error(msg);
    }
  }

  // Refresh token helpers
  isRefreshTokenExpired(): boolean {
    const rt = this.getRefreshToken();
    if (!rt) return true;
    try {
      const decoded = jwtDecode<JwtPayloadBase>(rt);
      if (!decoded?.exp) return true;
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp < now;
    } catch {
      return true;
    }
  }

  getRefreshTokenRemainingTime(): number {
    const rt = this.getRefreshToken();
    if (!rt) return 0;
    try {
      const decoded = jwtDecode<JwtPayloadBase>(rt);
      if (!decoded?.exp) return 0;
      const now = Math.floor(Date.now() / 1000);
      return Math.max(0, decoded.exp - now);
    } catch {
      return 0;
    }
  }

  getStoredExpiresAt(): Date | null {
    const s = localStorage.getItem("token_expires_at");
    if (!s) return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
}

export default new AuthService();
