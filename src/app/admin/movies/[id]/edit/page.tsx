"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import FilmForm from "@/components/MovieForm";
import RefreshLoader from "@/components/Loading";
import { movieService, type Movie } from "@/services";

export default function EditMoviePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [film, setFilm] = useState<Movie>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await movieService.getMovieById(id);
        console.log(res);

        setFilm(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <RefreshLoader isOpen />;

  return (
    <FilmForm
      mode="edit"
      film={film}
      onSuccess={() => router.push("/admin/movies", { scroll: false })}
    />
  );
}
