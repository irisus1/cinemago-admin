import api from "@/config/api";

export type SeatType = "NORMAL" | "VIP" | "COUPLE" | "EMPTY";

export type SeatCell = {
  row: string; // "A", "B", ...
  col: number; // 1, 2, ...
  type: SeatType;
};

export type Room = {
  id?: string;
  name: string;
  cinemaId: string;
  totalSeats?: number;
  vipPrice?: number;
  couplePrice?: number;
  createdAt?: string;
  isActive?: boolean;
  seatLayout?: SeatCell[];
};
// Lấy danh sách phòng chiếu
export const getRooms = (params?: {
  page?: number;
  limit?: number;
  cinemaId?: string;
  search?: string;
}) => api.get("/rooms/public", { params });

// Tạo phòng chiếu
export const createRoom = (data: Room) => {
  return api.post("/rooms", data);
};

// Cập nhật phòng chiếu

export const updateRoom = (id: string, data: Room) => {
  return api.put(`/rooms/${id}`, data);
};

//Xóa phòng chiếu
export const deleteRoom = (roomId: string) =>
  api.put(`/rooms/archive/${roomId}`);

// Khôi phục phòng chiếu
export const restoreRoom = (roomId: string) =>
  api.put(`/rooms/restore/${roomId}`);
