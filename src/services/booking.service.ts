import api from "@/config/api";

export interface BookingSeat {
  id: string;
  seatId: string;
  showtimeId: string;
}

export interface BookingFoodDrink {
  id: string;
  foodDrinkId: string;
  quantity: number;
  totalPrice: number;
}

export interface Booking {
  id: string;
  userId: string | null;
  showtimeId: string;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
  bookingSeats: BookingSeat[];
  bookingFoodDrinks: BookingFoodDrink[];
}

export interface CreateBookingRequest {
  showtimeId: string;
  seatIds: string[];
  foodDrinks: {
    foodDrinkId: string;
    quantity: number;
  }[];
}

export const bookingService = {
  /**
   * GET /bookings/my?page&limit
   * Lấy danh sách booking của user đang login
   */
  async getMyBookings(page = 1, limit = 10) {
    const res = await api.get("/bookings", {
      params: { page, limit },
    });
    return res.data; // { pagination, data }
  },

  /**
   * GET /bookings/:id
   * Lấy chi tiết 1 booking
   */
  async getBookingById(id: string) {
    const res = await api.get(`/bookings/${id}`);
    return res.data.data as Booking;
  },

  /**
   * POST /bookings
   * Tạo booking (phải gọi sau khi đã hold seat)
   */
  async createBooking(payload: CreateBookingRequest) {
    const res = await api.post("/bookings", payload);
    return res.data.data as Booking;
  },

  /**
   * GET /bookings/showtime/:showtimeId/seats
   * Lấy danh sách ghế đã được đặt trong showtime
   */
  async getBookedSeats(showtimeId: string) {
    const res = await api.get(`/bookings/public/${showtimeId}/booking-seat`);
    return res.data.data as BookingSeat[];
  },
};

export default bookingService;
