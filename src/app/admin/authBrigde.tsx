"use client";
import { useEffect } from "react";
import { getAccessToken, setAccessToken } from "@/utils/auth";

export default function AuthBridge() {
  useEffect(() => {
    const t = getAccessToken();
    if (t) setAccessToken(t); // đảm bảo cookie tồn tại nếu user reload/truy cập thẳng
  }, []);
  return null;
}
