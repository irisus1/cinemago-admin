// utils/auth.ts
export const getAccessToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

export const setAccessToken = (token: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("accessToken", token);
  // mirror sang cookie để middleware đọc được (non-HttpOnly)
  document.cookie = `accessToken=${token}; path=/; samesite=lax`;
};

export const clearTokens = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  // expire cookie
  document.cookie =
    "accessToken=; path=/; samesite=lax; expires=Thu, 01 Jan 1970 00:00:00 GMT";
};

export const setRefreshToken = (token: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("refreshToken", token);
};
