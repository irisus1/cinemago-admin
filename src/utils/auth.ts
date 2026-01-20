export const getAccessToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

export const setAccessToken = (token: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("accessToken", token);
};
