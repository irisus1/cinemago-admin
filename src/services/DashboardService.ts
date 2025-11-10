import api from "@/config/api";

//Lấy số phim
export const getMovieCount = async () => {
  return api.get("/movies/dashboard/total-count");
};

//Lấy số rạp chiếu
export const getCinemaCount = async () => {
  return api.get("/cinemas/dashboard/total-count");
};

//Lấy số người dùng
export const getUserCount = async () => {
  return api.get("/users/dashboard/total-count");
};

//Doanh thu theo giai đoạn
export const getRevenueByPeriod = async (params: {
  startDate: string;
  endDate: string;
}) => {
  return api.get("/bookings/dashboard/revenue", { params });
};

//Lấy doanh thu theo giai đoạn và phim
export const getRevenueByPeriodAndMovie = async (params: {
  startDate: string;
  endDate: string;
}) => {
  return api.get("/bookings/dashboard/revenue/movie", { params });
};

//Lấy doanh thu theo giai đoạn và rạp chiếu
export const getRevenueByPeriodAndCinema = async (params: {
  startDate: string;
  endDate: string;
}) => {
  return api.get("/bookings/dashboard/revenue/cinema", { params });
};
