"use server";

import { cookies } from "next/headers";
import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

// 1. Lưu Refresh Token (HTTP Only)
export async function setRefreshTokenCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set("refreshToken", token, {
    httpOnly: true, // Quan trọng: JS client không đọc được
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 ngày
  });
}

// 2. Xóa Refresh Token
export async function deleteRefreshTokenCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("refreshToken");
}

// 3. Lấy Refresh Token (Chỉ dùng được trong Server Component/Action khác)
export async function getRefreshTokenServer() {
  const cookieStore = await cookies();
  return cookieStore.get("refreshToken")?.value;
}

// 4. Gọi API Refresh Token từ phía Server Next.js
// Lý do: Vì cookie là HttpOnly, Client (api.ts) không đọc được để gửi trong body.
// Nên ta phải nhờ Server Action đọc cookie -> gọi Backend -> trả về AccessToken mới cho Client.
export async function refreshAccessTokenAction() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value;

  if (!refreshToken) throw new Error("No refresh token in cookie");

  try {
    // Gọi sang Backend (Spring/Nest/Node...)
    const { data } = await axios.post(`${BASE}/auth/refresh-token`, {
      refreshToken,
    });

    const newAccessToken = data?.accessToken;
    const newRefreshToken = data?.refreshToken;

    // Nếu Backend trả về refresh token mới, cập nhật luôn cookie
    if (newRefreshToken) {
      await setRefreshTokenCookie(newRefreshToken);
    }

    return newAccessToken as string;
  } catch (error) {
    // Nếu lỗi -> Xóa cookie luôn
    await deleteRefreshTokenCookie();
    throw error;
  }
}
