import axios from "axios";
import api from "@/config/api";

export interface User {
  id: string;
  fullname: string;
  email: string;
  gender: string;
  role: "ADMIN" | "USER" | "SUPER_ADMIN" | "CINEMA_MANAGER" | "STAFF";
  cinemaId?: string;
  password?: string;
  isActive: boolean;
  createdAt?: string;
  avatarUrl: string;
  updatedAt?: string;
}

export type UserParams = {
  page?: number;
  limit?: number;
  search?: string;
  role?: "ADMIN" | "USER" | "SUPER_ADMIN" | "CINEMA_MANAGER" | "STAFF";
  isActive?: boolean;
};

type PaginationMeta = {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type Paginated<T> = { pagination: PaginationMeta; data: T[] };

export type CreateUserRequest = Omit<
  User,
  "id" | "createdAt" | "isActive" | "avatarUrl"
>;
export type UpdateUserRequest = Partial<Omit<User, "id" | "createdAt">>;

type ApiErrorBody = { message?: string };
const getMsg = (e: unknown, fb: string) =>
  axios.isAxiosError<ApiErrorBody>(e)
    ? e.response?.data?.message ?? e.message ?? fb
    : fb;

class UserService {
  async getMe(): Promise<User> {
    try {
      const { data } = await api.get<{ data: User }>("/users/profile");
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy thông tin người dùng.");
      console.error("Get user error:", e);
      throw new Error(msg);
    }
  }
  // Lấy danh sách người dùng (đã gõ kiểu phân trang)
  async getAllUsers(params?: UserParams): Promise<Paginated<User>> {
    try {
      const res = await api.get<Paginated<User>>("/users", { params });
      return res.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy danh sách người dùng.");
      console.error("Get users error:", e);
      throw new Error(msg);
    }
  }

  async getUserById(id: string): Promise<User> {
    try {
      const { data } = await api.get<{ data: User }>(`/users/${id}`);
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy danh sách người dùng.");
      console.error("Get users error:", e);
      throw new Error(msg);
    }
  }

  // Tạo người dùng (trả về user vừa tạo)
  async createUser(payload: CreateUserRequest): Promise<User> {
    try {
      const { data } = await api.post<{ data: User; message: string }>(
        "/users",
        payload
      );
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể tạo người dùng.");
      console.error("Create user error:", e);
      throw new Error(msg);
    }
  }

  // Cập nhật người dùng (trả về user đã cập nhật)
  async updateUser(id: string, payload: UpdateUserRequest): Promise<User> {
    try {
      const { data } = await api.put<{ data: User; message: string }>(
        `/users/${id}`,
        payload
      );
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể cập nhật người dùng.");
      console.error("Update user error:", e);
      throw new Error(msg);
    }
  }

  // Xóa (archive) người dùng — giả định API trả về User sau khi archive
  async deleteUser(userId: string): Promise<string> {
    try {
      const { data } = await api.put<string>(`/users/${userId}/archive`);
      return data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể xóa (archive) người dùng.");
      console.error("Archive user error:", e);
      throw new Error(msg);
    }
  }

  // Khôi phục người dùng — giả định API trả về User sau khi restore
  async restoreUser(userId: string): Promise<string> {
    try {
      const { data } = await api.put<string>(`/users/${userId}/restore`);
      return data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể khôi phục người dùng.");
      console.error("Restore user error:", e);
      throw new Error(msg);
    }
  }

  async updateProfile(form: FormData): Promise<User> {
    try {
      const { data } = await api.put<{ data: User; message?: string }>(
        "/users/profile",
        form,
        {
          // Quan trọng: override JSON default để axios tự gắn boundary
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể cập nhật hồ sơ người dùng.");
      console.error("Update profile error:", e);
      throw new Error(msg);
    }
  }
}

export const userService = new UserService();
