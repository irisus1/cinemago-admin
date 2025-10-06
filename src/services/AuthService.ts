import api from "@/config/api";

// Đăng nhập
export const login = (email: string, password: string) =>
  api.post("/auth/login", { email, password });

// Quên mật khẩu
export const forgotPassword = (email: string) =>
  api.post("/auth/forgot-password", { email });

// Reset mật khẩu
export const resetPassword = (
  email: string,
  otp: string,
  newPassword: string
) => api.post("/auth/reset-password", { email, otp, newPassword });

// (nếu cần) Đăng ký
export const signup = (data: {
  email: string;
  password: string;
  fullname: string;
  gender: string;
}) => api.post("/auth/signup", data);

// (nếu cần) Đổi mật khẩu khi đã login
export const changePassword = (oldPassword: string, newPassword: string) =>
  api.post("/auth/change-password", { oldPassword, newPassword });
