"use client";

import { useRouter } from "next/navigation";
import MovieForm from "@/components/modal/MovieForm";

export default function NewMoviePage() {
  const router = useRouter();
  return (
    <MovieForm mode="create" onSuccess={() => router.push("/admin/movies")} />
  );
}
