import React from "react";
import MovieCard from "./MovieCard"; // đường dẫn tới file bạn vừa chuyển TSX

interface Genre {
  id: string;
  // name: string;
  // description?: string;
}

interface Movie {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  releaseDate?: string;
  rating?: number;
  thumbnail?: string;
  trailerUrl?: string;
  genres?: Genre[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function MovieGrid({
  movies,
  onPick,
}: {
  movies: Movie[];
  onPick: (m: Movie) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {movies.map((m) => (
        <MovieCard
          key={m.id}
          filmId={m.id as any}
          imageUrl={m.thumbnail}
          name={m.title}
          country={(m as any).country} // nếu có
          type={(m as any).tagIds || (m as any).types || []}
          duration={m.duration}
          // ageLimit={m.rating}
          isShowing={true}
          voice={(m as any).voice}
          trailerURL={(m as any).trailerUrl}
          twoDthreeD={(m as any).formats} // ["2D","3D"] nếu có
          onSelect={() => onPick(m)} // dùng để chọn phim trong flow admin
        />
      ))}
    </div>
  );
}
