import api from "@/config/api";

// Lấy danh sách phim
export const getAllMovies = (params?: { page?: number; limit?: number }) =>
  api.get("/movies/public", { params });
// Lấy chi tiết phim theo ID
export const getMovieById = (id: string) => api.get(`/movies/public/${id}`);

// Thêm phim
export const addMovie = (data: FormData) =>
  api.post("/movies", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
// Cập nhật phim
export const updateMovie = (id: string, data: FormData) =>
  api.put(`/movies/${id}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });

//Cập nhật trạng thái phim
export const updateMovieStatus = (movieIds: string[], status: string) =>
  api.put("/movies/status", { movieIds, status });
// Xoá phim
export const deleteMovie = (id: string) => api.put(`/movies/archive/${id}`);
// Khôi phục phim
export const restoreMovie = (id: string) => api.put(`/movies/restore/${id}`);
