import api from "@/config/api";
import axios from "axios";
import type { Genre } from "./genre.service";

export interface Movie {
  id: string;
  title: string;
  description: string;
  duration: number;
  releaseDate: string;
  genres: Genre[];
  thumbnail: string;
  trailerUrl?: string;
  trailerPath?: string;
  isActive: boolean;
  status?: string;
  rating?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type MovieQuery = {
  page?: number;
  limit?: number;
  search?: string;
  rating?: number;
  genreQuery?: string;
  isActive?: boolean;
  status?: string;
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

class MovieService {
  async getAllMovies(params?: MovieQuery): Promise<ServerPaginated<Movie>> {
    try {
      const { data } = await api.get<ServerPaginated<Movie>>("/movies/public", {
        params,
      });
      return data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy danh sách phim.");
      console.error("Get movies error:", e);
      throw new Error(msg);
    }
  }

  async getMovieById(id: string): Promise<Movie> {
    try {
      const { data } = await api.get<{ data: Movie }>(`/movies/public/${id}`);
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy thông tin phim.");
      console.error("Get movie detail error:", e);
      throw new Error(msg);
    }
  }

  async addMovie(form: FormData): Promise<Movie> {
    try {
      const { data } = await api.post<{ data: Movie }>("/movies", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể tạo phim.");
      console.error("Create movie error:", e);
      throw new Error(msg);
    }
  }

  async updateMovie(id: string, form: FormData): Promise<Movie> {
    try {
      const { data } = await api.put<{ data: Movie }>(`/movies/${id}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể cập nhật phim.");
      console.error("Update movie error:", e);
      throw new Error(msg);
    }
  }

  async updateMovieStatus(movieIds: string[], status: string): Promise<string> {
    try {
      const { data } = await api.put<string>("/movies/status", {
        movieIds,
        status,
      });
      return data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể cập nhật trạng thái phim.");
      console.error("Update movie status error:", e);
      throw new Error(msg);
    }
  }

  async deleteMovie(id: string): Promise<string> {
    try {
      const { data } = await api.put<string>(`/movies/archive/${id}`);
      return data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể xóa (archive) phim.");
      console.error("Archive movie error:", e);
      throw new Error(msg);
    }
  }

  async restoreMovie(id: string): Promise<string> {
    try {
      const { data } = await api.put<string>(`/movies/restore/${id}`);
      return data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể khôi phục phim.");
      console.error("Restore movie error:", e);
      throw new Error(msg);
    }
  }
}

export const movieService = new MovieService();
