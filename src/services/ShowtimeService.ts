import api from "@/config/api";
// services/MovieService.ts
export const getShowTimesByMovieId = (params?: {
  page?: number;
  limit?: number;
  movieid: string;
  cinemaid?: string;
  startTime?: Date;
  endTime?: Date;
}) => api.get("/showtimes/public", { params });

// services/ShowtimeService.ts
export const getAllShowTimeByMovieId = (
  movieId: string,
  params?: { page?: number; limit?: number }
) => api.get(`/showtimes/by-movie/${movieId}`, { params });

export const getShowTimeById = (id: string) => api.get(`/showtimes/${id}`);

export const createShowTime = (data: {
  movieId: string;
  cinemaId: string;
  roomId: string;
  startTime: Date;
  endTime: Date;
}) => api.post("/showtimes", data);

export const updateShowTime = (
  id: string,
  data: {
    movieId: string;
    cinemaId: string;
    roomId: string;
    startTime: Date;
    endTime: Date;
  }
) => api.put(`/showtimes/${id}`, data);

export const deleteShowTime = (id: string) =>
  api.put(`/showtimes/archive/${id}`);

export const restoreShowTime = (id: string) =>
  api.put(`/showtimes/restore/${id}`);
