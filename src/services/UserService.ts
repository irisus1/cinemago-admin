import { changePassword } from "./AuthService";
import api from "@/config/api";

export type User = {
  id?: string;
  fullname: string;
  email: string;
  gender: string;
  role: "ADMIN" | "USER";
  password?: string;
  isActive?: boolean;
  createdAt?: string;
};

export const getMe = () => api.get("/users/profile");
// Lấy danh sách người dùng
export const getAllUsers = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}) => api.get("/users", { params });

// Tạo người dùng
export const createUser = (data: User) => {
  return api.post("/users", data);
};

// Cập nhật người dùng
export const updateUser = (id: string, data: User) => {
  return api.put(`/users/${id}`, data);
};

//Xóa người dùng
export const deleteUser = (userId: string) =>
  api.put(`/users/${userId}/archive`);

// Khôi phục người dùng
export const restoreUser = (userId: string) =>
  api.put(`/users/${userId}/restore`);
