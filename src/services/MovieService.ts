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

// Lấy danh sách thể loại
export const getAllGenres = (params?: {
  page?: number;
  limit?: number;
  search?: string;
}) => api.get("/genres/public", { params });
// Thêm thể loại
export const addGenre = (data: { name: string; description: string }) =>
  api.post("/genres", data);
// Cập nhật thể loại
export const updateGenre = (
  id: string,
  data: { name: string; description: string }
) => api.put(`/genres/${id}`, data);
// Xoá thể loại
export const deleteGenre = (id: string) => api.put(`/genres/archive/${id}`);
// Khôi phục thể loại
export const restoreGenre = (id: string) => api.put(`/genres/restore/${id}`);
