// app/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Root() {
  const cookieStore = await cookies(); // <— await
  const token = cookieStore.get("accessToken")?.value;

  redirect(token ? "/admin/movies" : "/login");
}
