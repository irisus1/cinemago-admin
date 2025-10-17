import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import authService, { User } from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Khởi tạo: Kiểm tra xem user đã đăng nhập chưa
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Kiểm tra token có hết hạn không
        if (authService.isTokenExpired()) {
          console.warn('Token expired on init, clearing auth data');
          authService.clearExpiredToken();
          setUser(null);
          setIsLoading(false);
          return;
        }

        if (authService.isAuthenticated()) {
          // Lấy user từ localStorage trước
          const storedUser = authService.getStoredUser();
          setUser(storedUser);

          // Sau đó fetch user mới nhất từ API
          try {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
            // Cập nhật lại localStorage với data mới
            localStorage.setItem('user', JSON.stringify(currentUser));
          } catch (error) {
            console.error('Failed to fetch current user:', error);
            // Nếu fetch fail, giữ user từ localStorage
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Auto-check token expiration và auto-refresh nếu cần
  useEffect(() => {
    const checkTokenExpiration = async () => {
      // Kiểm tra xem có access token và refresh token không
      const hasAccessToken = !!authService.getToken();
      const hasRefreshToken = !!authService.getRefreshToken();
      
      // Nếu không có access token, không cần check gì cả
      if (!hasAccessToken) {
        return;
      }
      
      if (authService.isTokenExpired()) {
        // Access token đã hết hạn
        if (hasRefreshToken && !authService.isRefreshTokenExpired()) {
          // Refresh token còn hợp lệ, thử refresh
          console.log('Access token expired, attempting to refresh...');
          try {
            await authService.refreshAccessToken();
            console.log('Token refreshed successfully');
            
            // Refresh user info sau khi có token mới
            await refreshUser();
          } catch (error) {
            console.error('Failed to refresh token:', error);
            // Refresh thất bại, logout user
            setUser(null);
            authService.clearExpiredToken();
          }
        } else {
          // Không có refresh token hoặc refresh token đã hết hạn
          console.warn('Token expired and no valid refresh token, logging out user');
          setUser(null);
          authService.clearExpiredToken();
        }
      } else if (authService.isTokenExpiringSoon(5)) {
        // Token sắp hết hạn trong 5 phút, proactively refresh
        if (hasRefreshToken && !authService.isRefreshTokenExpired()) {
          console.log('Token expiring soon, proactively refreshing...');
          try {
            await authService.refreshAccessToken();
            console.log('Token refreshed proactively');
          } catch (error) {
            console.error('Failed to proactively refresh token:', error);
            // Không logout ngay, để user tiếp tục dùng cho đến khi token thực sự hết hạn
          }
        }
      }
    };

    // Check ngay khi component mount
    checkTokenExpiration();

    // Check mỗi 60 giây
    const interval = setInterval(checkTokenExpiration, 60000);

    // Cleanup
    return () => clearInterval(interval);
  }, []);

  const login = async (phone: string, password: string) => {
    try {
      const response = await authService.login(phone, password);
      setUser(response.user);
    } catch (error) {
      // Re-throw để component xử lý error message
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      localStorage.setItem('user', JSON.stringify(currentUser));
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

