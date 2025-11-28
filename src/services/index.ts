import { reviewService } from "./review.service";
// Export all services
export { authService } from "./auth.service";
export { cinemaService } from "./cinema.service";
export { userService } from "./user.service";
export { genreService } from "./genre.service";
export { movieService } from "./movie.service";
export { showTimeService } from "./showtime.service";
export { roomService } from "./room.service";
export { foodDrinkService } from "./food.service";
export { paymentService } from "./payment.service";
export { bookingService } from "./booking.service";
export { reviewService } from "./review.service";

// Export types
export type { LoginResponse, RegisterRequest } from "./auth.service";

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
  SeatModal,
} from "./room.service";

export type {
  FoodDrink,
  FoodDrinkPublic,
  CreateFoodDrinkRequest,
  UpdateFoodDrinkRequest,
} from "./food.service";

export type { CreatePaymentRequest } from "./payment.service";

export type {
  BookingSeat,
  Booking,
  BookingFoodDrink,
  CreateBookingRequest,
} from "./booking.service";

export type {
  Review,
  ReviewOverview,
  UserDetail,
  GetReviewsParams,
} from "./review.service";
