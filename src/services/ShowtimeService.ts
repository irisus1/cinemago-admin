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
