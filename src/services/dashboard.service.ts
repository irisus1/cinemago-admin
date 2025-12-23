// src/services/DashboardService.ts
import api from "@/config/api";
import axios from "axios";

type ApiErrorBody = { message?: string };
const getMsg = (e: unknown, fb: string) =>
  axios.isAxiosError<ApiErrorBody>(e)
    ? e.response?.data?.message ?? e.message ?? fb
    : fb;

// ==== Kiểu dữ liệu ====
export type DateRangeParams = {
  startDate: string;
  endDate: string;
  type?: string; // nếu sau này bạn muốn filter theo loại booking
  cinemaId?: string;
};

export type PeakHourParam = {
  month: number;
  year: number;
  cinemaId?: string;
  type?: string;
};

export type PeakHourItem = {
  hour: number;
  formattedHour: string;
  ticketCount: number;
};

export type PeakHourResponse = {
  period: any;
  filters: any;
  summary: {
    totalTickets: number;
    totalBookings: number;
  };
  topPeakHour: PeakHourItem | null;
  top5PeakHours: PeakHourItem[];
  peakHours: PeakHourItem[];
  allHours: PeakHourItem[];
};

// Doanh thu theo giai đoạn
export type RevenueByPeriod = {
  totalRevenue: number;
  totalFoodDrinkRevenue: number;
  totalTicketRevenue: number;
  occupancyRate?: number;
};

export type CinemaRevenueItem = {
  cinema: {
    id: string;
    name: string;
    city?: string;
    address?: string;
  } | null;
  totalRevenue: number;
  // Extra fields from backend logic
  ticketRevenue?: number;
  foodDrinkRevenue?: number;
  bookedSeats?: number;
  totalSeats?: number;
  occupancyRate?: number;
};

export type CinemaRevenueResponse = {
  sortedCinemas: CinemaRevenueItem[];
  cinemasRevenue: CinemaRevenueItem[];
};

// Item doanh thu theo phim
export type MovieRevenueItem = {
  movie: {
    id: string;
    name?: string;
    title?: string;
  } | null;
  totalRevenue: number;
  // Extra fields from backend logic  
  ticketRevenue?: number;
  foodDrinkRevenue?: number;
  bookedSeats?: number;
  totalSeats?: number;
  occupancyRate?: number;
};

export type MovieRevenueResponse = {
  sortedMovies: MovieRevenueItem[];
  moviesRevenue: MovieRevenueItem[];
};


// ... (CinemaRevenueItem, CinemaRevenueResponse, MovieRevenueItem, MovieRevenueResponse definitions skipped)
class DashboardService {
  async getMovieCount(): Promise<number> {
    try {
      const { data } = await api.get<{ data: { totalMovies: number } }>(
        "/movies/dashboard/total-count"
      );
      return data.data.totalMovies ?? 0;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy tổng số phim.");
      console.error("Get movie count error:", e);
      throw new Error(msg);
    }
  }

  // GET /cinemas/dashboard/total-count -> { data: { totalCinemas } }
  async getCinemaCount(): Promise<number> {
    try {
      const { data } = await api.get<{ data: { totalCinemas: number } }>(
        "/cinemas/dashboard/total-count"
      );
      return data.data.totalCinemas ?? 0;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy tổng số rạp chiếu.");
      console.error("Get cinema count error:", e);
      throw new Error(msg);
    }
  }

  // GET /users/dashboard/total-count -> { data: { totalUsers } }
  async getUserCount(): Promise<number> {
    try {
      const { data } = await api.get<{ data: { totalUsers: number } }>(
        "/users/dashboard/total-count"
      );
      return data.data.totalUsers ?? 0;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy tổng số người dùng.");
      console.error("Get user count error:", e);
      throw new Error(msg);
    }
  }

  // GET /bookings/dashboard/revenue?startDate=&endDate= -> { data | body: RevenueByPeriod }
  async getRevenueByPeriod(params: DateRangeParams): Promise<RevenueByPeriod> {
    try {
      const { data } = await api.get<{ data: RevenueByPeriod }>(
        "/bookings/dashboard/revenue",
        { params }
      );

      const body = data.data;

      return {
        totalRevenue: Number(body.totalRevenue ?? 0),
        totalFoodDrinkRevenue: Number(body.totalFoodDrinkRevenue ?? 0),
        totalTicketRevenue: Number(body.totalTicketRevenue ?? 0),
        occupancyRate: Number(body.occupancyRate ?? 0),
      };
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy doanh thu theo giai đoạn.");
      console.error("Lỗi getRevenueByPeriod:", e);
      throw new Error(msg);
    }
  }
  // GET /bookings/dashboard/revenue/cinema?startDate=&endDate=&type=
  async getRevenueByPeriodAndCinema(
    params: DateRangeParams
  ): Promise<CinemaRevenueResponse> {
    try {
      const { data } = await api.get<{ data: CinemaRevenueResponse }>(
        "/bookings/dashboard/revenue/cinema",
        { params }
      );
      console.log("cinema dashboard", data);

      // data = { data: { cinemasRevenue, sortedCinemas } }
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy doanh thu theo rạp chiếu.");
      console.error("Lỗi getRevenueByPeriodAndCinema:", e);
      throw new Error(msg);
    }
  }

  // GET /bookings/dashboard/revenue/movie?startDate=&endDate=&type=
  async getRevenueByPeriodAndMovie(
    params: DateRangeParams
  ): Promise<MovieRevenueResponse> {
    try {
      const { data } = await api.get<{ data: MovieRevenueResponse }>(
        "/bookings/dashboard/revenue/movie",
        { params }
      );
      console.log("movie dashboard", data);

      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy doanh thu theo phim.");
      console.error("Lỗi getRevenueByPeriodAndMovie:", e);
      throw new Error(msg);
    }
  }

  // GET /bookings/dashboard/peak-hours?month=&year=&cinemaId=&type=
  async getPeakHoursInMonth(params: PeakHourParam): Promise<PeakHourResponse> {
    try {
      const { data } = await api.get<{ data: PeakHourResponse }>(
        "/bookings/dashboard/peak-hours",
        { params }
      );
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy dữ liệu giờ cao điểm.");
      console.error("Lỗi getPeakHoursInMonth:", e);
      throw new Error(msg);
    }
  }
}

export const dashboardService = new DashboardService();
