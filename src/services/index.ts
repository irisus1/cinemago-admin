// Export all services
export { default as authService } from "./auth.service";
export { cinemaService } from "./cinema.service";
export { userService } from "./user.service";
export { genreService } from "./genre.service";
export { movieService } from "./movie.service";
export { showTimeService } from "./showtime.service";
export { roomService } from "./room.service";

// Export types
export type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
} from "./auth.service";

export type {
  User,
  UserParams,
  CreateUserRequest,
  UpdateUserRequest,
} from "./user.service";

export type {
  Cinema,
  CreateCinemaRequest,
  UpdateCinemaRequest,
} from "./cinema.service";

export type { Genre, PaginationMeta } from "./genre.service";

export type { Movie, MovieQuery } from "./movie.service";

export type { ShowTime, ShowTimeQuery } from "./showtime.service";

export type {
  Room,
  RoomQuery,
  RoomCreate,
  RoomUpdate,
  SeatType,
  SeatCell,
} from "./room.service";
