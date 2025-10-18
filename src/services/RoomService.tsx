import api from "@/config/api";

type RoomCreate = {
  name: string;
  city: string;
  address: string;
  longitude: number | null;
  latitude: number | null;
  isActive: boolean;
};

// Lấy danh sách phòng chiếu
export const getAllRooms = (params?: { page?: number; limit?: number }) =>
  api.get("/rooms/public", { params });
