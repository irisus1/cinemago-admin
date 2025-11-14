import React from "react";
import MovieCard from "./MovieCard";
import type { Movie } from "@/services";
import { useRouter } from "next/navigation";

type MovieCardItem = Movie & {
  showtimeMeta?: {
    formats?: string[];
    languages?: string[];
    minPrice?: number | null;
    earliestStart?: string | null;
    hasSubtitle?: boolean | null;
  };
};

export default function MovieGrid({
  movies,
  date,
}: {
  movies: MovieCardItem[];
  date?: string;
}) {
  const router = useRouter();

  const goToTicket = (id?: string | number) => {
    if (id === undefined || id === null) return;
    router.push(`/admin/ticket/${id}`);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 justify-items-center">
      {movies.map((m) => (
        <MovieCard
          key={m.id}
          filmId={m.id}
          imageUrl={m.thumbnail}
          name={m.title}
          // truyền mảng tên trực tiếp
          type={(m.genres || []).map((g) => g.name)}
          duration={m.duration}
          isShowing={true}
          trailerURL={m.trailerUrl}
          twoDthreeD={m.showtimeMeta?.formats}
          languages={m.showtimeMeta?.languages}
          subtitle={m.showtimeMeta?.hasSubtitle}
          onSelect={goToTicket}
        />
      ))}
    </div>
  );
}
