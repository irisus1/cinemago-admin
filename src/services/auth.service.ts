import apiClient from '../lib/axios';
import { jwtDecode } from "jwt-decode";

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface User {
  user_id: number;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  role_id: number;
  department_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  role?: {
    role_id: number;
    name: string;
    permissions: number;
  };
  department?: {
    department_id: number;
    name: string;
    code: string;
    description?: string;
    manager_name?: string;
    phone?: string;
    email?: string;
    is_active: boolean;
  };
}

export interface LoginResponse {
  message: string;
  user: User;
  token: string;
  refresh_token: string;
  expires_at: string;
  expires_in: number; // seconds until expiration
}

export interface RegisterRequest {
  email: string;
  password: string;
  phone: string;
  first_name: string;
  last_name: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  user: User;
  token: string;
  refresh_token: string;
  expires_at: string;
  expires_in: number;
}

class AuthService {
  /**
   * Đăng nhập với phone và password
   */
  async login(phone: string, password: string): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        phone,
        password,
      });

      // Lưu token, refresh token và user info vào localStorage
      if (response.data.token) {
        localStorage.setItem('access_token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Lưu refresh token và thông tin expiry
        if (response.data.refresh_token) {
          localStorage.setItem('refresh_token', response.data.refresh_token);
          console.log('Refresh token saved:', {
            length: response.data.refresh_token.length,
            preview: response.data.refresh_token.substring(0, 20) + '...'
          });
        } else {
          console.warn('No refresh_token in login response');
        }
        if (response.data.expires_at) {
          localStorage.setItem('token_expires_at', response.data.expires_at);
          console.log('Token expires at:', response.data.expires_at);
        }
      }

      return response.data;
    } catch (error: any) {
      console.error('Login error:', error);
      // Re-throw với message rõ ràng hơn
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error ||
                          'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
      throw new Error(errorMessage);
    }
  }

  /**
   * Đăng ký tài khoản mới
   */
  async register(data: RegisterRequest): Promise<{ message: string; user: User }> {
    try {
      const response = await apiClient.post('/auth/register', data);
      return response.data;
    } catch (error: any) {
      console.error('Register error:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error ||
                          'Đăng ký thất bại. Vui lòng thử lại.';
      throw new Error(errorMessage);
    }
  }

  /**
   * Đăng xuất
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Xóa token, refresh token và user info
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token_expires_at');
      localStorage.removeItem('user');
    }
  }

  /**
   * Lấy thông tin user hiện tại từ API
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<{ user: User }>('/auth/me');
      return response.data.user;
    } catch (error: any) {
      console.error('Get current user error:', error);
      const errorMessage = error.response?.data?.message || 
                          'Không thể lấy thông tin người dùng.';
      throw new Error(errorMessage);
    }
  }

  /**
   * Kiểm tra xem user đã đăng nhập chưa
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    return !!token;
  }

  /**
   * Lấy user từ localStorage
   */
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  }

  /**
   * Lấy token từ localStorage
   */
  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * Lấy refresh token từ localStorage
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  /**
   * Kiểm tra xem token có hết hạn không
   * @returns true nếu token đã hết hạn hoặc không tồn tại
   */
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) {
      return true;
    }

    const decoded = jwtDecode(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    // exp là Unix timestamp (seconds), so sánh với thời gian hiện tại
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp <= currentTime;
  }

  /**
   * Lấy thời gian còn lại của token (seconds)
   * @returns số giây còn lại, hoặc 0 nếu đã hết hạn/không hợp lệ
   */
  getTokenRemainingTime(): number {
    const token = this.getToken();
    if (!token) {
      return 0;
    }

    const decoded = jwtDecode(token);

    if (!decoded || !decoded.exp) {
      return 0;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const remainingTime = decoded.exp - currentTime;
    return remainingTime > 0 ? remainingTime : 0;
  }

  /**
   * Kiểm tra token sắp hết hạn (còn ít hơn X phút)
   * @param minutesThreshold - Ngưỡng cảnh báo (mặc định 5 phút)
   * @returns true nếu token sắp hết hạn
   */
  isTokenExpiringSoon(minutesThreshold: number = 5): boolean {
    const remainingSeconds = this.getTokenRemainingTime();
    const thresholdSeconds = minutesThreshold * 60;
    return remainingSeconds > 0 && remainingSeconds < thresholdSeconds;
  }

  /**
   * Lấy thông tin từ token (user_id, role, etc.)
   */
  getTokenInfo(): {
    user_id?: number;
    email?: string;
    role_id?: number;
    role_name?: string;
    first_name?: string;
    last_name?: string;
    exp?: number;
    iat?: number;
  } | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    return jwtDecode(token);
    
  }

  /**
   * Clear expired token và logout user
   */
  clearExpiredToken(): void {
    if (this.isTokenExpired()) {
      console.warn('Token expired, clearing authentication data');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token_expires_at');
      localStorage.removeItem('user');
    }
  }

  /**
   * Refresh access token sử dụng refresh token
   * @returns LoginResponse với token mới
   */
  async refreshAccessToken(): Promise<RefreshTokenResponse> {
    try {
      const refreshToken = this.getRefreshToken();
      
      console.log('Attempting to refresh token:', {
        hasRefreshToken: !!refreshToken,
        refreshTokenLength: refreshToken?.length || 0,
        refreshTokenPreview: refreshToken?.substring(0, 20) + '...'
      });

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Backend expects camelCase "refreshToken", not snake_case "refresh_token"
      const requestBody = { refreshToken: refreshToken };
      console.log('Sending refresh request with body:', requestBody);

      const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh', requestBody);

      // Lưu token mới và thông tin expiry
      if (response.data.token) {
        localStorage.setItem('access_token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        if (response.data.refresh_token) {
          localStorage.setItem('refresh_token', response.data.refresh_token);
        }
        if (response.data.expires_at) {
          localStorage.setItem('token_expires_at', response.data.expires_at);
        }
      }

      return response.data;
    } catch (error: any) {
      console.error('Refresh token error:', {
        error: error,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      // Nếu refresh token không hợp lệ hoặc hết hạn, xóa tất cả dữ liệu auth
      this.clearExpiredToken();
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error ||
                          'Không thể làm mới phiên đăng nhập. Vui lòng đăng nhập lại.';
      throw new Error(errorMessage);
    }
  }

  /**
   * Kiểm tra xem refresh token có hết hạn không
   * Refresh token thường có TTL dài hơn access token (7 lần theo backend)
   * @returns true nếu refresh token đã hết hạn hoặc không tồn tại
   */
  isRefreshTokenExpired(): boolean {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return true;
    }

    try {
      const decoded = jwtDecode(refreshToken);
      if (!decoded || !decoded.exp) {
        return true;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch {
      return true;
    }
  }

  /**
   * Lấy thời gian còn lại của refresh token (seconds)
   * @returns số giây còn lại, hoặc 0 nếu đã hết hạn/không hợp lệ
   */
  getRefreshTokenRemainingTime(): number {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return 0;
    }

    try {
      const decoded = jwtDecode(refreshToken);
      if (!decoded || !decoded.exp) {
        return 0;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const remainingTime = decoded.exp - currentTime;
      return remainingTime > 0 ? remainingTime : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Lấy thông tin expires_at đã lưu trong localStorage
   * @returns Date object hoặc null
   */
  getStoredExpiresAt(): Date | null {
    const expiresAt = localStorage.getItem('token_expires_at');
    if (!expiresAt) {
      return null;
    }
    
    try {
      return new Date(expiresAt);
    } catch {
      return null;
    }
  }
}

export default new AuthService();

