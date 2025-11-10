import api from "@/config/api";
import axios from "axios";

export type SeatType = "NORMAL" | "VIP" | "COUPLE" | "EMPTY";

export type SeatCell = {
  row: string; // "A", "B", ...
  col: number; // 1, 2, ...
  type: SeatType;
};

export type Room = {
  id: string;
  name: string;
  cinemaId: string;
  totalSeats?: number;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
  seatLayout?: SeatCell[];
  // các trường thống kê nếu BE có:
  VIP?: number;
  COUPLE?: number;
};

export type RoomQuery = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  startTime?: Date | string;
  endTime?: Date | string;
  cinemaId?: string;
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

const toIso = (v?: Date | string) =>
  !v ? undefined : v instanceof Date ? v.toISOString() : v;

// Chỉ gửi đúng các field BE yêu cầu khi tạo/cập nhật
export type RoomCreate = {
  name: string;
  cinemaId: string;
  seatLayout?: SeatCell[];
  vipPrice: number;
  couplePrice: number;
};
export type RoomUpdate = Partial<RoomCreate>;

class RoomService {
  // GET /rooms/public -> { pagination, data }
  async getRooms(params?: RoomQuery): Promise<ServerPaginated<Room>> {
    try {
      const { data } = await api.get<ServerPaginated<Room>>("/rooms/public", {
        params: {
          ...params,
          startTime: toIso(params?.startTime),
          endTime: toIso(params?.endTime),
        },
      });
      return data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy danh sách phòng chiếu.");
      console.error("Get rooms error:", e);
      throw new Error(msg);
    }
  }

  // GET /rooms/public/:id -> { data: room }
  async getRoomById(id: string): Promise<Room> {
    try {
      const { data } = await api.get<{ data: Room }>(`/rooms/public/${id}`);
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy thông tin phòng chiếu.");
      console.error("Get room detail error:", e);
      throw new Error(msg);
    }
  }

  // POST /rooms -> { data: room }
  async createRoom(payload: RoomCreate): Promise<Room> {
    try {
      const { data } = await api.post<{ data: Room }>("/rooms", payload);
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể tạo phòng chiếu.");
      console.error("Create room error:", e);
      throw new Error(msg);
    }
  }

  // PUT /rooms/:id -> { data: room }
  async updateRoom(id: string, payload: RoomUpdate): Promise<Room> {
    try {
      const { data } = await api.put<{ data: Room }>(`/rooms/${id}`, payload);
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể cập nhật phòng chiếu.");
      console.error("Update room error:", e);
      throw new Error(msg);
    }
  }

  // PUT /rooms/archive/:id -> string
  async deleteRoom(id: string): Promise<string> {
    try {
      const { data } = await api.put<string>(`/rooms/archive/${id}`);
      return data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể xóa (archive) phòng chiếu.");
      console.error("Archive room error:", e);
      throw new Error(msg);
    }
  }

  // PUT /rooms/restore/:id -> string
  async restoreRoom(id: string): Promise<string> {
    try {
      const { data } = await api.put<string>(`/rooms/restore/${id}`);
      return data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể khôi phục phòng chiếu.");
      console.error("Restore room error:", e);
      throw new Error(msg);
    }
  }

  // POST /rooms/hold-seat -> string (message)
  async holdSeat(showtimeId: string, seatId: string): Promise<string> {
    try {
      const { data } = await api.post<string>("/rooms/hold-seat", {
        showtimeId,
        seatId,
      });
      return data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể giữ chỗ.");
      console.error("Hold seat error:", e);
      throw new Error(msg);
    }
  }

  // GET /rooms/held-seats/:showtimeId -> { data: string[] }
  async getHeldSeats(showtimeId: string): Promise<string[]> {
    try {
      const { data } = await api.get<{ data: string[] }>(
        `/rooms/held-seats/${showtimeId}`
      );
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy danh sách ghế đang giữ.");
      console.error("Get held seats error:", e);
      throw new Error(msg);
    }
  }
}

export const roomService = new RoomService();
