export type Genre = {
  id: string;
  name: string;
  [k: string]: unknown;
};

export enum MovieStatus {
  COMING_SOON,
  NOW_SHOWING,
  ENDED,
}

export type Movie = {
  id?: string;
  title: string;
  description: string;
  duration: number;
  rating?: number;
  genres: Genre[];
  trailerUrl?: string;
  thumbnail?: string;
  releaseDate?: string;
  status?: MovieStatus;
  isActive?: boolean;
};

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
