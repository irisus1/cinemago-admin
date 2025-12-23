import axios from "axios";
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
  paymentMethod?: string;
  status?: string;
}

export interface CreateBookingRequest {
  showtimeId: string;
  seatIds: string[];
  foodDrinks: {
    foodDrinkId: string;
    quantity: number;
  }[];
}

/** nếu bạn đã có PaginationMeta & Paginated ở file chung thì import từ đó */
type PaginationMeta = {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type Paginated<T> = { pagination: PaginationMeta; data: T[] };

export type MyBookingParams = {
  page?: number;
  limit?: number;
  showtimeId?: string;
  type?: string;
  cinemaId?: string;
  status?: string;
};

type ApiErrorBody = { message?: string };
const getMsg = (e: unknown, fb: string) =>
  axios.isAxiosError<ApiErrorBody>(e)
    ? e.response?.data?.message ?? e.message ?? fb
    : fb;

class BookingService {
  async getAllBookings(params?: MyBookingParams): Promise<Paginated<Booking>> {
    try {
      const { data } = await api.get<Paginated<Booking>>(
        "/bookings/dashboard/get-all",
        {
          params,
        }
      );
      return data; // { pagination, data }
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy danh sách đơn đặt vé.");
      console.error("Get bookings error:", e);
      throw new Error(msg);
    }
  }
  /**
   * GET /bookings?page&limit
   * Lấy danh sách booking của user đang login (phân trang)
   */
  async getMyBookings(params?: MyBookingParams): Promise<Paginated<Booking>> {
    try {
      const { data } = await api.get<Paginated<Booking>>("/bookings", {
        params,
      });
      return data; // { pagination, data }
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy danh sách đơn đặt vé.");
      console.error("Get bookings error:", e);
      throw new Error(msg);
    }
  }

  /**
   * GET /bookings/:id
   * Lấy chi tiết 1 booking
   */
  async getBookingById(id: string): Promise<Booking> {
    try {
      const { data } = await api.get<{ data: Booking }>(`/bookings/${id}`);
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy chi tiết đơn đặt vé.");
      console.error("Get booking detail error:", e);
      throw new Error(msg);
    }
  }

  /**
   * POST /bookings
   * Tạo booking (phải gọi sau khi đã hold seat)
   */
  async createBooking(payload: CreateBookingRequest): Promise<Booking> {
    try {
      const { data } = await api.post<{ data: Booking; message?: string }>(
        "/bookings",
        payload
      );
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể tạo đơn đặt vé.");
      console.error("Create booking error:", e);
      throw new Error(msg);
    }
  }

  /**
   * GET /bookings/public/:showtimeId/booking-seat
   * Lấy danh sách ghế đã được đặt trong showtime
   */
  async getBookedSeats(showtimeId: string): Promise<BookingSeat[]> {
    try {
      const { data } = await api.get<{ data: BookingSeat[] }>(
        `/bookings/public/${showtimeId}/booking-seat`
      );
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy danh sách ghế đã đặt.");
      console.error("Get booked seats error:", e);
      throw new Error(msg);
    }
  }

  /**
   * PATCH /bookings/:id/status
   * Cập nhật trạng thái booking
   */
  async updateBookingStatus(id: string, status: string, paymentMethod?: string): Promise<Booking> {
    try {
      const { data } = await api.put<{ data: Booking }>(`/bookings/update-status/${id}`, {
        status,
        paymentMethod,
      });
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể cập nhật trạng thái đơn hàng.");
      console.error("Update booking status error:", e);
      throw new Error(msg);
    }
  }
}

export const bookingService = new BookingService();
export default bookingService;
