import React, { useEffect, useMemo, useState } from "react";
import {
  FaTag,
  FaRegClock,
  FaGlobeAmericas,
  FaCommentDots,
} from "react-icons/fa";
import { FaRegCirclePlay } from "react-icons/fa6";
import TrailerModal from "./TrailerModal";
import { getAllGenres } from "@/services/MovieService";

type Tag = { id: string | number; name: string };

type MovieCardProps = {
  filmId?: string | number;
  imageUrl?: string;
  name?: string;
  country?: string;
  type?: unknown; // mảng ID tag (string|number) hoặc null
  duration?: number | string;
  ageLimit?: string; // "P" | "K" | "T13" | "T16" | "T18"
  isShowing?: unknown; // dùng truthy
  voice?: string;
  trailerURL?: string;
  twoDthreeD?: unknown; // ["2D", "3D"] hoặc null
  onSelect?: (movieId?: string | number) => void;
};

const FALLBACK_POSTER =
  "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=1200&auto=format&fit=crop";

const MovieCard: React.FC<MovieCardProps> = ({
  filmId,
  imageUrl,
  name,
  country,
  type,
  duration,
  ageLimit,
  isShowing,
  voice,
  trailerURL,
  twoDthreeD,
  onSelect,
}) => {
  const linkDetail = `/admin/ticket/${filmId ?? ""}`;
  const [videoOpen, setVideoOpen] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);

  const formatFlags = useMemo<string[]>(
    () => (Array.isArray(twoDthreeD) ? twoDthreeD.map(String) : []),
    [twoDthreeD]
  );
  const tagIds = useMemo<(string | number)[]>(
    () => (Array.isArray(type) ? (type as any[]).map((x) => x as any) : []),
    [type]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res: any = await getAllGenres({ limit: 100 });
        const list: Tag[] =
          res?._embedded?.tagResponseDtoList ??
          res?.data?._embedded?.tagResponseDtoList ??
          res?.items ??
          [];
        if (mounted) setAllTags(list);
      } catch {
        if (mounted) setAllTags([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const tagNameById = useMemo(
    () => new Map(allTags.map((t) => [String(t.id), t.name] as const)),
    [allTags]
  );

  const tagNames = useMemo(
    () =>
      tagIds
        .map((id) => tagNameById.get(String(id)))
        .filter(Boolean)
        .join(", "),
    [tagIds, tagNameById]
  );

  const ageLabel = useMemo(() => {
    if (ageLimit === "T13" || ageLimit === "T16") return "TEEN";
    if (ageLimit === "T18") return "ADULT";
    if (ageLimit === "P" || ageLimit === "K") return "KID";
    return "";
  }, [ageLimit]);

  return (
    // body font-size 0.7rem -> áp vào wrapper
    <div className="flex flex-wrap justify-center gap-6 p-2 text-[0.7rem]">
      <div className="group flex w-full max-w-md flex-col items-start gap-3">
        {/* Poster */}
        <div className="relative aspect-[2/3] w-full cursor-pointer overflow-hidden rounded-xl border border-gray-300 shadow-md transition duration-300 hover:shadow-lg">
          <img
            src={imageUrl || FALLBACK_POSTER}
            alt={name || "Movie Poster"}
            className="h-full w-full object-cover"
          />

          {/* 2D/3D + Age */}
          <div className="absolute left-0 top-0 flex items-center transition-transform duration-300 ease-in-out sm:group-hover:-translate-y-full">
            <div className="flex">
              {formatFlags.includes("2D") && (
                <div className="flex h-[45px] w-[46px] items-center justify-center bg-[#FF9933] shadow-md">
                  <span className="rounded-md border-2 border-black p-0.5 text-xs font-bold text-black">
                    2D
                  </span>
                </div>
              )}
              {formatFlags.includes("3D") && (
                <div className="flex h-[45px] w-[46px] items-center justify-center bg-[#663399] shadow-md">
                  <span className="rounded-md border-2 border-white p-0.5 text-xs font-bold text-white">
                    3D
                  </span>
                </div>
              )}
              <div className="flex h-[45px] w-[46px] flex-col items-center justify-center bg-[#FF0033] shadow-md">
                <span className="overflow-hidden text-sm font-bold text-white">
                  {ageLimit || ""}
                </span>
                <span className="bg-black px-0.5 text-[0.55rem] tracking-widest text-white">
                  {ageLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Overlay (content-text -> text-[#F3EA28], h3 -> text-[0.75rem]) */}
          <div
            onClick={() => setVideoOpen(true)}
            className="absolute inset-0 z-10 hidden items-center justify-center bg-black/70 text-center opacity-0 transition-opacity duration-300 sm:flex sm:group-hover:opacity-100 text-[#F3EA28]"
          >
            <div className="flex w-full max-w-[85%] flex-col items-start justify-start space-y-4 px-6 text-left">
              <h3 className="mb-2 text-[0.75rem]">{name}</h3>
              {tagNames && (
                <p className="mt-2 flex items-center">
                  <FaTag className="mr-2 h-5 w-5 align-middle" />
                  {tagNames}
                </p>
              )}
              {duration ? (
                <p className="mt-2 flex items-center">
                  <FaRegClock className="mr-2 h-5 w-5 align-middle" />
                  {typeof duration === "number" ? `${duration} phút` : duration}
                </p>
              ) : null}
              {country ? (
                <p className="mt-2 flex items-center">
                  <FaGlobeAmericas className="mr-2 h-5 w-5 align-middle" />
                  {country}
                </p>
              ) : null}
              {voice ? (
                <p className="mt-2 flex items-center">
                  <FaCommentDots className="mr-2 h-5 w-5 align-middle" />
                  {voice}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="w-full">
          <a
            href={onSelect ? undefined : linkDetail}
            onClick={onSelect ? () => onSelect(filmId) : undefined}
            className="mt-3 line-clamp-2 h-[48px] cursor-pointer text-center text-lg font-bold text-black"
          >
            {name} {ageLimit ? `(${ageLimit})` : ""}
          </a>

          <div className="mt-4 flex items-center justify-between pt-4 text-base">
            {/* Trailer (desktop) */}
            <button
              className="hidden items-center sm:flex"
              onClick={() => setVideoOpen(true)}
            >
              <div className="mr-2 flex items-center justify-center">
                <FaRegCirclePlay className="h-[31px] w-[31px] rounded-full bg-[#d9d9d9] text-[#fe1e3e]" />
              </div>
              <span className="border-b-2 text-black">Xem trailer</span>
            </button>

            <TrailerModal
              videoOpen={videoOpen}
              setVideoOpen={setVideoOpen}
              videoUrl={trailerURL}
            />

            <button
              className="h-[42px] w-full rounded-md bg-gray-900 text-white sm:w-[132px]"
              onClick={onSelect ? () => onSelect(filmId) : undefined}
            >
              {isShowing ? "Đặt vé" : "Tìm hiểu thêm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
