// // src/app/page.tsx
// "use client";

// import { useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { useAuth } from "@/context/AuthContext";

// export default function Root() {
//   const router = useRouter();
//   const { isAuthenticated, isLoading } = useAuth();

//   useEffect(() => {
//     if (isLoading) return; // chờ AuthProvider init + refresh xong

//     if (isAuthenticated) {
//       router.replace("/admin/dashboard");
//     } else {
//       router.replace("/login");
//     }
//   }, [isAuthenticated, isLoading, router]);

//   return null; // không cần render gì
// }
// app/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Root() {
  const cookieStore = await cookies();

  // Kiểm tra refreshToken thay vì accessToken
  // Vì accessToken bạn lưu ở LocalStorage, server không nhìn thấy được.
  // Nhưng refreshToken nằm trong Cookie, server nhìn thấy được.
  const refreshToken = cookieStore.get("refreshToken")?.value;

  // Nếu có refreshToken -> coi như đã đăng nhập -> vào admin
  // (Nếu refreshToken hết hạn thì vào admin sẽ bị đá ra login sau, nhưng UX sẽ mượt hơn)
  if (refreshToken) {
    redirect("/admin/dashboard");
  } else {
    redirect("/login");
  }
}
