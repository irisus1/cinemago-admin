// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

const REFRESH_DAYS = 7;

function expiresAfter(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function tryRefresh(req: NextRequest, redirectTo?: string) {
  const refreshToken = req.cookies.get("refreshToken")?.value;
  if (!refreshToken) return null;

  try {
    const r = await fetch(`${API}/auth/refresh-token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!r.ok) return null;

    const data = await r.json();
    const at = data?.accessToken as string | undefined;
    const rt = data?.refreshToken as string | undefined;
    if (!at) return null;

    const res = redirectTo
      ? NextResponse.redirect(new URL(redirectTo, req.url))
      : NextResponse.next();

    localStorage.setItem("accessToken", at);

    if (rt) {
      res.cookies.set("refreshToken", rt, {
        path: "/",
        sameSite: "lax",
        expires: expiresAfter(REFRESH_DAYS),
      });
    }

    return res;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessToken = req.cookies.get("accessToken")?.value || null;
  const refreshToken = req.cookies.get("refreshToken")?.value || null;

  if (pathname === "/") {
    if (accessToken) {
      return NextResponse.redirect(new URL("/admin/movies", req.url));
    }

    if (!accessToken && refreshToken) {
      const refreshed = await tryRefresh(req, "/admin/movies");
      if (refreshed) return refreshed;
    }

    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/admin")) {
    if (accessToken) return NextResponse.next();

    if (!accessToken && refreshToken) {
      const refreshed = await tryRefresh(req);
      if (refreshed) return refreshed;
    }

    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

// Chạy cho / và mọi route dưới /admin
export const config = {
  matcher: ["/", "/admin/:path*"],
};
