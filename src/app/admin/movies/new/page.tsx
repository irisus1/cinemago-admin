"use client";

import { useRouter } from "next/navigation";
import FilmForm from "@/components/MovieForm";

export default function NewMoviePage() {
  const router = useRouter();
  return (
    <FilmForm mode="create" onSuccess={() => router.push("/admin/movies")} />
  );
}
