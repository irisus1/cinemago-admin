import React from "react";
import type { Movie } from "@/services";
import MovieCard from "./MovieCard";

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
  onMovieSelect,
}: {
  movies: MovieCardItem[];
  date?: string;
  cinemaId: string;
  onMovieSelect: (movie: MovieCardItem) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 justify-items-center">
      {movies.map((m) => (
        <MovieCard
          key={m.id}
          filmId={m.id}
          imageUrl={m.thumbnail}
          name={m.title}
          type={(m.genres || []).map((g) => g.name)}
          duration={m.duration}
          isShowing={true}
          trailerURL={m.trailerUrl}
          twoDthreeD={m.showtimeMeta?.formats}
          languages={m.showtimeMeta?.languages}
          subtitle={m.showtimeMeta?.hasSubtitle}
          onSelect={() => onMovieSelect(m)}
        />
      ))}
    </div>
  );
}
