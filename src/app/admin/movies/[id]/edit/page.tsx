"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import FilmForm from "@/components/MovieForm";
import { getMovieById } from "@/services/MovieService";
import RefreshLoader from "@/components/Loading";

export default function EditMoviePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [film, setFilm] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await getMovieById(id);
        console.log(res.data.data);

        setFilm(res?.data?.data);
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
