import api from "@/config/api";
import axios from "axios";

type ApiErrorBody = { message?: string };
const getMsg = (e: unknown, fb: string) =>
  axios.isAxiosError<ApiErrorBody>(e)
    ? (e.response?.data?.message ?? e.message ?? fb)
    : fb;

export type DateRangeParams = {
  startDate: string;
  endDate: string;
  type?: string;
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

export type DailyRevenueGlobal = {
  date: string;
  totalRevenue: number;
  totalFoodDrinkRevenue: number;
  totalTicketRevenue: number;
  ticketRevenue?: number;
  foodDrinkRevenue?: number;
  bookedSeats?: number;
  totalSeats?: number;
  occupancyRate?: number;
};

export type DailyRevenueBreakdown = {
  date: string;
  totalRevenue: number;
  foodDrinkRevenue: number;
  ticketRevenue: number;
  bookedSeats?: number;
  totalSeats?: number;
  occupancyRate?: number;
};

export type RevenueByPeriod = {
  summary: {
    totalRevenue: number;
    totalFoodDrinkRevenue: number;
    totalTicketRevenue: number;
    occupancyRate?: number;
  };
  daily: DailyRevenueGlobal[];
};

export type CinemaRevenueItem = {
  cinema: {
    id: string;
    name: string;
    city?: string;
    address?: string;
  } | null;
  totalRevenue: number;
  ticketRevenue?: number;
  foodDrinkRevenue?: number;
  totalTicketRevenue?: number;
  totalFoodDrinkRevenue?: number;
  bookedSeats?: number;
  totalSeats?: number;
  occupancyRate?: number;
  dailyBreakdown?: DailyRevenueBreakdown[];
};

export type MovieRevenueItem = {
  movie: {
    id: string;
    name?: string;
    title?: string;
  } | null;
  totalRevenue: number;
  ticketRevenue?: number;
  foodDrinkRevenue?: number;
  totalTicketRevenue?: number;
  totalFoodDrinkRevenue?: number;
  bookedSeats?: number;
  totalSeats?: number;
  occupancyRate?: number;
  dailyBreakdown?: DailyRevenueBreakdown[];
};

class DashboardService {
  async getMovieCount(): Promise<number> {
    try {
      const { data } = await api.get<{ data: { totalMovies: number } }>(
        "/movies/dashboard/total-count",
      );
      return data.data.totalMovies ?? 0;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy tổng số phim.");
      console.error("Get movie count error:", e);
      throw new Error(msg);
    }
  }

  async getCinemaCount(): Promise<number> {
    try {
      const { data } = await api.get<{ data: { totalCinemas: number } }>(
        "/cinemas/dashboard/total-count",
      );
      return data.data.totalCinemas ?? 0;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy tổng số rạp chiếu.");
      console.error("Get cinema count error:", e);
      throw new Error(msg);
    }
  }

  async getUserCount(): Promise<number> {
    try {
      const { data } = await api.get<{ data: { totalUsers: number } }>(
        "/users/dashboard/total-count",
      );
      return data.data.totalUsers ?? 0;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy tổng số người dùng.");
      console.error("Get user count error:", e);
      throw new Error(msg);
    }
  }

  async getRevenueByPeriod(params: DateRangeParams): Promise<RevenueByPeriod> {
    try {
      const { data } = await api.get<{ data: RevenueByPeriod }>(
        "/bookings/dashboard/revenue",
        { params },
      );

      const body = data.data;
      return body;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy doanh thu theo giai đoạn.");
      console.error("Lỗi getRevenueByPeriod:", e);
      throw new Error(msg);
    }
  }

  async getRevenueByPeriodAndCinema(
    params: DateRangeParams,
  ): Promise<CinemaRevenueItem[]> {
    try {
      const { data } = await api.get<{ data: CinemaRevenueItem[] }>(
        "/bookings/dashboard/revenue/cinema",
        { params },
      );
      console.log("cinema dashboard", data);
      return data.data || [];
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy doanh thu theo rạp chiếu.");
      console.error("Lỗi getRevenueByPeriodAndCinema:", e);
      throw new Error(msg);
    }
  }

  async getRevenueByPeriodAndMovie(
    params: DateRangeParams,
  ): Promise<MovieRevenueItem[]> {
    try {
      const { data } = await api.get<{ data: MovieRevenueItem[] }>(
        "/bookings/dashboard/revenue/movie",
        { params },
      );
      console.log("movie dashboard", data);
      return data.data || [];
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy doanh thu theo phim.");
      console.error("Lỗi getRevenueByPeriodAndMovie:", e);
      throw new Error(msg);
    }
  }

  async getPeakHoursInMonth(params: PeakHourParam): Promise<PeakHourResponse> {
    try {
      const { data } = await api.get<{ data: PeakHourResponse }>(
        "/bookings/dashboard/peak-hours",
        { params },
      );
      return data.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể lấy dữ liệu giờ cao điểm.");
      console.error("Lỗi getPeakHoursInMonth:", e);
      throw new Error(msg);
    }
  }

  async exportRevenue(params: DateRangeParams): Promise<Blob> {
    try {
      const response = await api.get("/bookings/dashboard/export", {
        params,
        responseType: "blob",
      });
      return response.data;
    } catch (e: unknown) {
      const msg = getMsg(e, "Không thể xuất file báo cáo.");
      console.error("Lỗi exportRevenue:", e);
      throw new Error(msg);
    }
  }
}

export const dashboardService = new DashboardService();
