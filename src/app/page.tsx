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
