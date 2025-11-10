"use client";
import Image from "next/image";
import { notFound } from "next/navigation";
import { movieService } from "@/services";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { type Movie } from "@/services";

const FALLBACK =
  "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=1200&auto=format&fit=crop";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [loadingMovie, setLoadingMovie] = useState(false);
  const [movie, setMovie] = useState<Movie | null>(null);
  const fallbackHref = "/admin/tickets";
  // Lấy phim theo id (SSR)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingMovie(true);
        const film = await movieService
          .getMovieById(String(id))
          .catch(() => null);
        if (!cancelled) setMovie(film);
      } finally {
        if (!cancelled) setLoadingMovie(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleClick = () => {
    // Có lịch sử thì quay lại, không thì đi fallback
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  // Chuẩn hóa text
  const typeText = Array.isArray(movie?.genres)
    ? movie.genres
        .filter(Boolean)
        .map((genre) => genre.name)
        .join(", ")
    : "";

  const poster = movie?.thumbnail || FALLBACK;
  console.log(poster);

  return loadingMovie ? (
    <div className="text-sm text-gray-500">Đang tải chi tiết phim…</div>
  ) : (
    <div className="w-full">
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-medium text-black shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/20"
        aria-label={"Quay lại"}
      >
        {/* Icon mũi tên trái */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M10.5 19.5L3 12m0 0 7.5-7.5M3 12h18"
          />
        </svg>
        <span>Quay lại</span>
      </button>
      {/* LEFT: POSTER + BADGES */}
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        {/* 2 cột: dọc trên mobile, ngang trên md+ */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-16 lg:gap-20">
          {/* LEFT: poster cố định 128px */}
          <div className="w-[200px] md:w-[260px] lg:w-[320px] shrink-0">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl ring-1 ring-black/10 shadow-lg">
              <img
                src={poster} // URL cloudinary/unsplash
                alt={movie?.title || "Movie Poster"}
                className="object-cover" // giống h-full w-full object-cover
                sizes="128px" // hint cho browser
              />
            </div>
          </div>

          {/* RIGHT: chi tiết, chiếm phần còn lại */}
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-black">
              {movie?.title}
            </h1>

            <ul className="mt-5 space-y-3">
              {typeText && (
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 inline-block h-2 w-2 rounded-full bg-yellow-400" />
                  <span className="text-[15px] text-black">{typeText}</span>
                </li>
              )}
              {movie?.duration && (
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 inline-block h-2 w-2 rounded-full bg-yellow-400" />
                  <span className="text-[15px] text-black">
                    {typeof movie.duration === "number"
                      ? `${movie.duration}'`
                      : movie.duration}
                  </span>
                </li>
              )}
            </ul>

            <div className="mt-8">
              <h3 className="text-black text-xl font-extrabold uppercase tracking-wide">
                Mô tả
              </h3>
              {movie?.releaseDate && (
                <p className="mt-3 text-black">
                  Khởi chiếu:{" "}
                  {new Date(movie.releaseDate).toLocaleDateString("vi-VN", {
                    weekday: "long",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>

            {movie?.description && (
              <div className="mt-8">
                <h3 className="text-black text-xl font-extrabold uppercase tracking-wide">
                  Nội dung phim
                </h3>
                <p className="mt-3 text-black leading-7">{movie.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
