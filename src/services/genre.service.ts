import api from "@/config/api";
import axios from "axios";

// ==== Types ====
export interface Genre {
  id: string;
  name: string;
  description: string;
}

export type PageParams = {
  page?: number;
  limit?: number;
  search?: string;
};

export type PaginationMeta = {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type ServerPaginated<T> = {
  pagination: PaginationMeta;
  data: T[];
};

type ApiErrorBody = { message?: string };
const getMsg = (e: unknown, fb: string) =>
  axios.isAxiosError<ApiErrorBody>(e)
    ? e.response?.data?.message ?? e.message ?? fb
    : fb;

// ==== Service ====
class GenreService {
  // GET /genres/public -> { pagination, data }
  async getAllGenres(params?: PageParams): Promise<ServerPaginated<Genre>> {
    try {
      const { data } = await api.get<ServerPaginated<Genre>>("/genres/public", {
        params,
      });
      return data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy danh sách thể loại.");
      console.error("Get genres error:", e);
      throw new Error(msg);
    }
  }

  // POST /genres -> { data: Genre }
  async addGenre(payload: {
    name: string;
    description: string;
  }): Promise<Genre> {
    try {
      const { data } = await api.post<{ data: Genre }>("/genres", payload);
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể tạo thể loại.");
      console.error("Create genre error:", e);
      throw new Error(msg);
    }
  }

  // PUT /genres/:id -> { data: Genre }
  async updateGenre(
    id: string,
    payload: { name: string; description: string }
  ): Promise<Genre> {
    try {
      const { data } = await api.put<{ data: Genre }>(`/genres/${id}`, payload);
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể cập nhật thể loại.");
      console.error("Update genre error:", e);
      throw new Error(msg);
    }
  }

  // PUT /genres/archive/:id -> string
  async deleteGenre(id: string): Promise<string> {
    try {
      const { data } = await api.put<string>(`/genres/archive/${id}`);
      return data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể xóa (archive) thể loại.");
      console.error("Archive genre error:", e);
      throw new Error(msg);
    }
  }

  // PUT /genres/restore/:id -> string
  async restoreGenre(id: string): Promise<string> {
    try {
      const { data } = await api.put<string>(`/genres/restore/${id}`);
      return data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể khôi phục thể loại.");
      console.error("Restore genre error:", e);
      throw new Error(msg);
    }
  }
}

export const genreService = new GenreService();
