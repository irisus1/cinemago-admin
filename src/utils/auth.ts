// utils/auth.ts
export const getAccessToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

export const setAccessToken = (token: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("accessToken", token);
};

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(
    new RegExp(
      `(?:^|; )${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}=([^;]*)`
    )
  );
  return m ? decodeURIComponent(m[1]) : null;
}

export function setCookie(
  name: string,
  value: string,
  options?: {
    days?: number;
    path?: string;
    sameSite?: "Lax" | "Strict" | "None";
    secure?: boolean;
  }
): void {
  if (typeof document === "undefined") return;

  const days = options?.days ?? 7;
  const path = options?.path ?? "/";
  const sameSite = options?.sameSite ?? "Lax";
  const secure =
    options?.secure ??
    (typeof location !== "undefined" && location.protocol === "https:");

  const expires = new Date();
  expires.setDate(expires.getDate() + days);

  let cookie = `${name}=${encodeURIComponent(
    value
  )}; Expires=${expires.toUTCString()}; Path=${path}; SameSite=${sameSite}`;
  if (secure) cookie += "; Secure";

  document.cookie = cookie;
}

export function deleteCookie(name: string, path: string = "/"): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=${path}; SameSite=Lax`;
}

export function getAllCookies(): Record<string, string> {
  if (typeof document === "undefined") return {};
  return document.cookie.split("; ").reduce((acc, cur) => {
    if (!cur) return acc;
    const idx = cur.indexOf("=");
    const k = decodeURIComponent(cur.slice(0, idx));
    const v = decodeURIComponent(cur.slice(idx + 1));
    acc[k] = v;
    return acc;
  }, {} as Record<string, string>);
}

export function hasCookie(name: string): boolean {
  return getCookie(name) !== null;
}
