import React from "react";
import type { Movie, TheaterBlock, Showtime } from "@/lib/types";
export default function MovieDetailTheaters({
  movie,
  blocks,
  onPickShowtime,
  onBack,
}: {
  movie: Movie;
  blocks: TheaterBlock[];
  onPickShowtime: (st: Showtime) => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <button className="text-sm underline" onClick={onBack}>
        ← Back
      </button>
      <div className="flex gap-4">
        {movie.posterUrl && (
          <img
            src={movie.posterUrl}
            alt="poster"
            className="w-32 h-48 object-cover rounded"
          />
        )}
        <div>
          <div className="text-xl font-semibold">{movie.title}</div>
          <div className="text-sm text-gray-600">
            {movie.runtimeMin ? `${movie.runtimeMin} min` : ""}{" "}
            {movie.rating ? `• ${movie.rating}` : ""}
          </div>
          {movie.description && (
            <p className="text-sm mt-2 text-gray-700 max-w-xl">
              {movie.description}
            </p>
          )}
        </div>
      </div>
      <div>
        <div className="font-semibold mb-2">Theaters & Showtimes (Today)</div>
        <div className="space-y-4">
          {blocks.map((b) => (
            <div key={b.theater.id} className="border rounded-xl p-3">
              <div className="font-medium">{b.theater.name}</div>
              <div className="text-xs text-gray-500">{b.theater.address}</div>
              <div className="flex flex-wrap gap-2 mt-2">
                {b.showtimes.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => onPickShowtime(st)}
                    className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
                  >
                    {new Date(st.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    — {st.roomName || st.roomId}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
