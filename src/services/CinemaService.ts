import api from "@/config/api";

type CinemaCreate = {
  name: string;
  city: string;
  address: string;
  longitude: number | null;
  latitude: number | null;
  isActive: boolean;
};

// Lấy danh sách rạp chiếu
export const getAllCinemas = (params?: { page?: number; limit?: number }) =>
  api.get("/cinemas/public", { params });

// Lấy chi tiết rạp chiếu theo ID
export const getCinemaById = (id: string) => api.get(`/cinemas/public/${id}`);

// Thêm rạp chiếu
export const addCinema = (data: CinemaCreate) => api.post("/cinemas", data);

// Cập nhật rạp chiếu
export const updateCinema = (id: string, data: Partial<CinemaCreate>) =>
  api.put(`/cinemas/${id}`, data);

// Xoá rạp chiếu
export const deleteCinema = (id: string) => api.put(`/cinemas/${id}/archive`);

// Khôi phục rạp chiếu
export const restoreCinema = (id: string) => api.put(`/cinemas/${id}/restore`);
