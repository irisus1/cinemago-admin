import api from "@/config/api";
import axios from "axios";

export type SeatType = "NORMAL" | "VIP" | "COUPLE" | "EMPTY";

export type SeatCell = {
  row: string;
  col: number;
  type: SeatType;
};

export type SeatModal = {
  id: string;
  seatNumber: string;
  roomId: string;
  seatType: SeatType;
  createdAt: string;
  updatedAt: string;
  extraPrice: number;
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
  seats: SeatModal[];
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

export type HeldSeatResponse = {
  seatId: string;
  extraPrice: number;
  showtimeId?: string;
  userId: string;
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
    ? (e.response?.data?.message ?? e.message ?? fb)
    : fb;

const toIso = (v?: Date | string) =>
  !v ? undefined : v instanceof Date ? v.toISOString() : v;

export type RoomCreate = {
  name: string;
  cinemaId?: string;
  seatLayout?: SeatCell[];
  vipPrice: number;
  couplePrice: number;
};
export type RoomUpdate = Partial<RoomCreate>;

class RoomService {
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

  async releaseSeat(showtimeId: string, seatId: string): Promise<string> {
    try {
      const { data } = await api.post<string>("/rooms/release-seat", {
        showtimeId,
        seatId,
      });
      return data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể xóa giữ chỗ.");
      console.error("Release seat error:", e);
      throw new Error(msg);
    }
  }

  async getHeldSeats(showtimeId: string): Promise<HeldSeatResponse[]> {
    try {
      const { data } = await api.get<{ data: HeldSeatResponse[] }>(
        `/rooms/${showtimeId}/hold-seat`,
      );
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy danh sách ghế đang giữ.");
      console.error("Get held seats error:", e);
      throw new Error(msg);
    }
  }

  async getBusyRooms(startTime: string, endTime: string): Promise<string[]> {
    const res = await api.get<{ data: string[] }>(
      "/showtimes/public/get-busy-rooms",
      {
        params: {
          startTime,
          endTime,
        },
      },
    );

    return res.data?.data ?? res.data ?? [];
  }
}

export const roomService = new RoomService();
