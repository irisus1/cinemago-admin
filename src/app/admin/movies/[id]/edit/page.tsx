"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FilmForm from "@/components/MovieForm";
import { getMovieById } from "@/services/MovieService";
import RefreshLoader from "@/components/Loading";

type Props = { params: { id: string } };

export default function EditMoviePage({ params }: Props) {
  const router = useRouter();
  const [film, setFilm] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getMovieById(params.id);
        setFilm(res?.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  if (loading) return <RefreshLoader isOpen />;

  return (
    <FilmForm
      mode="edit"
      film={film}
      onSuccess={() => router.push("/admin/movies")}
    />
  );
}
