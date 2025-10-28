import { format } from "date-fns";
import api from "@/config/api";

export interface ShowtimeCreateDto {
  movieId: string;
  roomId: string;
  startTime: string; // "YYYY-MM-DD HH:mm:ss" hoặc ISO string
  endTime: string; // ← BẮT BUỘC (không optional)
  price: number; // nếu muốn cho phép bỏ trống thì để optional
  language: string;
  subtitle: boolean;
  format: string;
}

// services/MovieService.ts
export const getAllShowTimes = (params?: {
  page?: number;
  limit?: number;
  movieId?: string;
  cinemaid?: string;
  startTime?: string;
  endTime?: string;
}) => api.get("/showtimes/public", { params });

// services/ShowtimeService.ts
export const getAllShowTimeByMovieId = (
  movieId: string,
  params?: { page?: number; limit?: number }
) => api.get(`/showtimes/by-movie/${movieId}`, { params });

export const getShowTimeById = (id: string) => api.get(`/showtimes/${id}`);

export const createShowTime = (data: ShowtimeCreateDto) =>
  api.post("/showtimes", data);

export const updateShowTime = (id: string, data: ShowtimeCreateDto) =>
  api.put(`/showtimes/${id}`, data);

export const deleteShowTime = (id: string) =>
  api.put(`/showtimes/archive/${id}`);

export const restoreShowTime = (id: string) =>
  api.put(`/showtimes/restore/${id}`);
