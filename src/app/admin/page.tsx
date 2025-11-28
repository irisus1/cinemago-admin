// app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Root() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    router.replace(token ? "/admin/dashboard" : "/login");
  }, [router]);

  return null; // Không cần render gì
}
