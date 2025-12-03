import api from "@/config/api";
import axios from "axios";

export interface Cinema {
  id: string;
  name: string;
  city: string;
  address: string;
  longitude: number | null;
  latitude: number | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type CinemaPublic = Pick<
  Cinema,
  "id" | "name" | "city" | "address" | "longitude" | "latitude" | "isActive"
>;

export type PageParams = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean; // BE có hỗ trợ -> thêm vào params
  city?: string;
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

export type CreateCinemaRequest = Omit<
  Cinema,
  "id" | "createdAt" | "isActive" | "updatedAt"
>;
export type UpdateCinemaRequest = Partial<
  Omit<Cinema, "id" | "createdAt" | "updatedAt">
>;

type ApiErrorBody = { message?: string };
const getMsg = (e: unknown, fb: string) =>
  axios.isAxiosError<ApiErrorBody>(e)
    ? e.response?.data?.message ?? e.message ?? fb
    : fb;

class CinemaService {
  // GET /cinemas/public -> { pagination, data }
  async getAllCinemas(
    params?: PageParams
  ): Promise<ServerPaginated<CinemaPublic>> {
    try {
      const { data } = await api.get<ServerPaginated<CinemaPublic>>(
        "/cinemas/public",
        { params }
      );
      return data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy danh sách rạp chiếu.");
      console.error("Get cinemas error:", e);
      throw new Error(msg);
    }
  }

  // GET /cinemas/public/:id -> { data: cinema }
  async getCinemaById(id: string): Promise<CinemaPublic> {
    try {
      const { data } = await api.get<{ data: CinemaPublic }>(
        `/cinemas/public/${id}`
      );
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy thông tin rạp chiếu.");
      console.error("Get cinema detail error:", e);
      throw new Error(msg);
    }
  }

  // POST /cinemas -> { data: cinema }
  async addCinema(payload: CreateCinemaRequest): Promise<Cinema> {
    try {
      const { data } = await api.post<{ data: Cinema }>("/cinemas", payload);
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể tạo rạp chiếu.");
      console.error("Create cinema error:", e);
      throw new Error(msg);
    }
  }

  // PUT /cinemas/:id -> { data: cinema }
  async updateCinema(
    id: string,
    payload: UpdateCinemaRequest
  ): Promise<Cinema> {
    try {
      const { data } = await api.put<{ data: Cinema }>(
        `/cinemas/${id}`,
        payload
      );
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể cập nhật rạp chiếu.");
      console.error("Update cinema error:", e);
      throw new Error(msg);
    }
  }

  // PUT /cinemas/:id/archive -> string
  async deleteCinema(id: string): Promise<string> {
    try {
      const { data } = await api.put<string>(`/cinemas/${id}/archive`);
      return data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể xóa (archive) rạp chiếu.");
      console.error("Archive cinema error:", e);
      throw new Error(msg);
    }
  }

  // PUT /cinemas/:id/restore -> string
  async restoreCinema(id: string): Promise<string> {
    try {
      const { data } = await api.put<string>(`/cinemas/${id}/restore`);
      return data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể khôi phục rạp chiếu.");
      console.error("Restore cinema error:", e);
      throw new Error(msg);
    }
  }
}

export const cinemaService = new CinemaService();
