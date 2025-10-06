import api from "@/config/api";

// Lấy danh sách phim
export const getAllMovies = () => api.get("/movies/public");
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
// Xoá phim
export const deleteMovie = (id: string) => api.put(`/movies/archive/${id}`);

// Lấy danh sách thể loại
export const getAllGenres = () => api.get("/genres/public");
// Thêm thể loại
export const addGenre = (data: { name: string }) => api.post("/genres", data);
// Cập nhật thể loại
export const updateGenre = (id: string, data: { name: string }) =>
  api.put(`/genres/${id}`, data);
// Xoá thể loại
export const deleteGenre = (id: string) => api.put(`/genres/archive/${id}`);
// Khôi phục thể loại
export const restoreGenre = (id: string) => api.put(`/genres/restore/${id}`);
