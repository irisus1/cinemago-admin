// Movie domain types
export type Genre = {
  id: string;
  name: string;
  [k: string]: unknown;
};

export enum MovieStatus {
  COMING_SOON, // 0
  NOW_SHOWING, // 1
  ENDED, // 2
}

export type Movie = {
  id?: string;
  title: string;
  description: string;
  duration: number;
  rating?: number;
  genres: Genre[];
  trailerUrl?: string; // URL hiện có
  thumbnail?: string; // URL hiện có
  releaseDate?: string; // ISO
  status?: MovieStatus;
  isActive?: boolean;
};

// Phần chung cho response/pagination (nếu backend trả theo mẫu)
export type PageMeta = {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
};

export type Paged<T> = {
  data: T[];
  pagination: PageMeta;
};
