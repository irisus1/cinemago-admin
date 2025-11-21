"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import MovieForm from "@/components/modal/MovieForm";

import ShowtimesCard from "./ShowTimeCard";
import { movieService, type Movie } from "@/services";

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loadingMovie, setLoadingMovie] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingMovie(true);

        const res = await movieService.getMovieById(id);
        if (!cancelled) setMovie(res);
      } finally {
        if (!cancelled) setLoadingMovie(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="space-y-6">
      <div>
        {loadingMovie && (
          <div className="text-sm text-gray-500">Đang tải chi tiết phim…</div>
        )}
        {movie && <MovieForm mode="view" readOnly film={movie} />}
      </div>

      {/* Suất chiếu (đã tách thành component riêng) */}
      <ShowtimesCard movieId={id} />
    </div>
  );
}
