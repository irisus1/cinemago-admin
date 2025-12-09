"use server";

import { cookies } from "next/headers";
import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

// 1. Lưu Refresh Token (HTTP Only)
export async function setRefreshTokenCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

// 2. Xóa Refresh Token
export async function deleteRefreshTokenCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("refreshToken");
}

// 3. Lấy Refresh Token
export async function getRefreshTokenServer() {
  const cookieStore = await cookies();
  return cookieStore.get("refreshToken")?.value;
}

// 4. Gọi API Refresh Token từ phía Server Next.js
export async function refreshAccessTokenAction() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value;

  if (!refreshToken) return null;

  try {
    const { data } = await axios.post(`${BASE}/auth/refresh-token`, {
      refreshToken,
    });

    const newAccessToken = data?.accessToken;
    const newRefreshToken = data?.refreshToken;

    if (newRefreshToken) {
      await setRefreshTokenCookie(newRefreshToken);
    }

    return newAccessToken as string;
  } catch (error) {
    await deleteRefreshTokenCookie();

    console.error("Refresh Action failed:", error);
    return null;
  }
}
