import api from "@/config/api";
import axios from "axios";

// ===== Types =====
export interface Showtime {
  id: string;
  movieId: string;
  cinemaId: string;
  roomId: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  price: number;
  language: string;
  subtitle: boolean;
  format: string; // e.g. "2D", "3D", "IMAX"
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ShowtimeQuery = {
  page?: number;
  limit?: number;
  movieId?: string;
  cinemaId?: string;
  isActive?: boolean;
  startTime?: Date | string;
  endTime?: Date | string;
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

// Helper: chuyển Date -> ISO cho params
function toIso(value?: Date | string): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

// ===== Service =====
class ShowtimeService {
  // GET /showtimes/public -> { pagination, data }
  async getShowtimes(
    params?: ShowtimeQuery
  ): Promise<ServerPaginated<Showtime>> {
    try {
      const { data } = await api.get<ServerPaginated<Showtime>>(
        "/showtimes/public",
        {
          params: {
            ...params,
            startTime: toIso(params?.startTime),
            endTime: toIso(params?.endTime),
          },
        }
      );
      return data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy danh sách suất chiếu.");
      console.error("Get showtimes error:", e);
      throw new Error(msg);
    }
  }

  // (tuỳ BE có route này) GET /showtimes/by-movie/:movieId -> { pagination, data }
  async getAllShowtimeByMovieId(
    movieId: string,
    params?: { page?: number; limit?: number }
  ): Promise<ServerPaginated<Showtime>> {
    try {
      const { data } = await api.get<ServerPaginated<Showtime>>(
        `/showtimes/by-movie/${movieId}`,
        { params }
      );
      return data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy suất chiếu theo phim.");
      console.error("Get showtimes by movie error:", e);
      throw new Error(msg);
    }
  }

  // GET /showtimes/:id -> { data }
  async getShowtimeById(id: string): Promise<Showtime> {
    try {
      const { data } = await api.get<{ data: Showtime }>(`/showtimes/${id}`);
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy thông tin suất chiếu.");
      console.error("Get showtime detail error:", e);
      throw new Error(msg);
    }
  }

  // POST /showtimes -> { data }
  async createShowtime(payload: {
    movieId: string;
    roomId: string;
    startTime: Date | string;
    endTime: Date | string;
    price: number;
    language: string;
    subtitle: boolean;
    format: string;
  }): Promise<Showtime> {
    try {
      const body = {
        ...payload,
        startTime: toIso(payload.startTime)!,
        endTime: toIso(payload.endTime)!,
      };
      const { data } = await api.post<{ data: Showtime }>("/showtimes", body);
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể tạo suất chiếu.");
      console.error("Create showtime error:", e);
      throw new Error(msg);
    }
  }

  // PUT /showtimes/:id -> { data }
  async updateShowtime(
    id: string,
    payload: Partial<{
      movieId: string;
      roomId: string;
      startTime: Date | string;
      endTime: Date | string;
      price: number;
      language: string;
      subtitle: boolean;
      format: string;
      isActive: boolean;
    }>
  ): Promise<Showtime> {
    try {
      const body = {
        ...payload,
        startTime: toIso(payload.startTime),
        endTime: toIso(payload.endTime),
      };
      const { data } = await api.put<{ data: Showtime }>(
        `/showtimes/${id}`,
        body
      );
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể cập nhật suất chiếu.");
      console.error("Update showtime error:", e);
      throw new Error(msg);
    }
  }

  // PUT /showtimes/archive/:id -> string
  async deleteShowtime(id: string): Promise<string> {
    try {
      const { data } = await api.put<string>(`/showtimes/archive/${id}`);
      return data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể xóa (archive) suất chiếu.");
      console.error("Archive showtime error:", e);
      throw new Error(msg);
    }
  }

  // PUT /showtimes/restore/:id -> string
  async restoreShowtime(id: string): Promise<string> {
    try {
      const { data } = await api.put<string>(`/showtimes/restore/${id}`);
      return data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể khôi phục suất chiếu.");
      console.error("Restore showtime error:", e);
      throw new Error(msg);
    }
  }

  // GET /showtimes/busy-rooms -> { data: string[] }
  async getBusyRoomIds(params: {
    startTime: Date | string;
    endTime: Date | string;
    cinemaId?: string;
  }): Promise<string[]> {
    try {
      const { data } = await api.get<{ data: string[] }>(
        "/showtimes/busy-rooms",
        {
          params: {
            ...params,
            startTime: toIso(params.startTime)!,
            endTime: toIso(params.endTime)!,
          },
        }
      );
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy danh sách phòng bận.");
      console.error("Get busy room ids error:", e);
      throw new Error(msg);
    }
  }
}

export const showtimeService = new ShowtimeService();
