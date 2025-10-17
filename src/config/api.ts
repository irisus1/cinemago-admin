import axios from "axios";
import { getCookie, setCookie, deleteCookie } from "@/utils/auth";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// let isRefreshing = false;
// let failedQueue: any[] = [];

// const processQueue = (error: any, token: string | null = null) => {
//   failedQueue.forEach((prom) => {
//     if (error) {
//       prom.reject(error);
//     } else {
//       prom.resolve(token);
//     }
//   });
//   failedQueue = [];
// };

// api.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const originalRequest = error.config;

//     if (error.response?.status === 401 && !originalRequest._retry) {
//       if (isRefreshing) {
//         return new Promise(function (resolve, reject) {
//           failedQueue.push({ resolve, reject });
//         })
//           .then((token) => {
//             originalRequest.headers.Authorization = `Bearer ${token}`;
//             return api(originalRequest);
//           })
//           .catch((err) => {
//             return Promise.reject(err);
//           });
//       }

//       originalRequest._retry = true;
//       isRefreshing = true;

//       try {
//         const refreshToken = getCookie("refreshToken");

//         if (!refreshToken) {
//           throw new Error("No refresh token found");
//         }

//         const res = await axios.post(
//           `${
//             process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1"
//           }/auth/refresh-token`,
//           { refreshToken: refreshToken },
//           { withCredentials: true }
//         );

//         const { accessToken, refreshToken: newRefresh } = res.data;

//         localStorage.setItem("accessToken", accessToken);
//         setCookie("refreshToken", newRefresh, { days: 7 });

//         api.defaults.headers.Authorization = `Bearer ${accessToken}`;
//         processQueue(null, accessToken);

//         originalRequest.headers.Authorization = `Bearer ${accessToken}`;
//         return api(originalRequest);
//       } catch (err) {
//         processQueue(err, null);
//         localStorage.removeItem("accessToken");
//         deleteCookie("refreshToken");
//         window.location.href = "/login";
//         return Promise.reject(err);
//       } finally {
//         isRefreshing = false;
//       }
//     }

//     return Promise.reject(error);
//   }
// );

export default api;
