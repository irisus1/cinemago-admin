import api from "@/config/api";
import axios from "axios";

// ===== Types =====
export interface ShowTime {
  id: string;
  movieId: string;
  cinemaId: string;
  cinemaName?: string;
  roomId: string;
  roomName?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  price: number;
  language: string;
  subtitle: boolean;
  format: string; // e.g. "2D", "3D", "IMAX"
  isActive: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ShowTimeQuery = {
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
class ShowTimeService {
  // GET /ShowTimes/public -> { pagination, data }
  async getShowTimes(
    params?: ShowTimeQuery
  ): Promise<ServerPaginated<ShowTime>> {
    try {
      const { data } = await api.get<ServerPaginated<ShowTime>>(
        "/ShowTimes/public",
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
      console.error("Get ShowTimes error:", e);
      throw new Error(msg);
    }
  }

  // (tuỳ BE có route này) GET /ShowTimes/by-movie/:movieId -> { pagination, data }
  async getAllShowTimeByMovieId(
    movieId: string,
    params?: { page?: number; limit?: number }
  ): Promise<ServerPaginated<ShowTime>> {
    try {
      const { data } = await api.get<ServerPaginated<ShowTime>>(
        `/ShowTimes/by-movie/${movieId}`,
        { params }
      );
      return data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy suất chiếu theo phim.");
      console.error("Get ShowTimes by movie error:", e);
      throw new Error(msg);
    }
  }

  // GET /ShowTimes/:id -> { data }
  async getShowTimeById(id: string): Promise<ShowTime> {
    try {
      const { data } = await api.get<{ data: ShowTime }>(`/ShowTimes/${id}`);
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy thông tin suất chiếu.");
      console.error("Get ShowTime detail error:", e);
      throw new Error(msg);
    }
  }

  // POST /ShowTimes -> { data }
  async createShowTime(payload: {
    movieId: string;
    roomId: string;
    startTime: Date | string;
    endTime: Date | string;
    price: number;
    language: string;
    subtitle: boolean;
    format: string;
  }): Promise<ShowTime> {
    try {
      const body = {
        ...payload,
        startTime: toIso(payload.startTime)!,
        endTime: toIso(payload.endTime)!,
      };
      const { data } = await api.post<{ data: ShowTime }>("/ShowTimes", body);
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể tạo suất chiếu.");
      console.error("Create ShowTime error:", e);
      throw new Error(msg);
    }
  }

  // PUT /ShowTimes/:id -> { data }
  async updateShowTime(
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
  ): Promise<ShowTime> {
    try {
      const body = {
        ...payload,
        startTime: toIso(payload.startTime),
        endTime: toIso(payload.endTime),
      };
      const { data } = await api.put<{ data: ShowTime }>(
        `/ShowTimes/${id}`,
        body
      );
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể cập nhật suất chiếu.");
      console.error("Update ShowTime error:", e);
      throw new Error(msg);
    }
  }

  // PUT /ShowTimes/archive/:id -> string
  async deleteShowTime(id: string): Promise<string> {
    try {
      const { data } = await api.put<string>(`/ShowTimes/archive/${id}`);
      return data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể xóa (archive) suất chiếu.");
      console.error("Archive ShowTime error:", e);
      throw new Error(msg);
    }
  }

  // PUT /ShowTimes/restore/:id -> string
  async restoreShowTime(id: string): Promise<string> {
    try {
      const { data } = await api.put<string>(`/ShowTimes/restore/${id}`);
      return data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể khôi phục suất chiếu.");
      console.error("Restore ShowTime error:", e);
      throw new Error(msg);
    }
  }

  // GET /ShowTimes/busy-rooms -> { data: string[] }
  async getBusyRoomIds(params: {
    startTime: Date | string;
    endTime: Date | string;
    cinemaId?: string;
  }): Promise<string[]> {
    try {
      const { data } = await api.get<{ data: string[] }>(
        "/ShowTimes/busy-rooms",
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

export const showTimeService = new ShowTimeService();
