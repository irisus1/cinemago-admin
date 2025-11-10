import React, { useMemo, useState } from "react";
import {
  FaTag,
  FaRegClock,
  FaGlobeAmericas,
  FaCommentDots,
} from "react-icons/fa";
import { FaRegCirclePlay } from "react-icons/fa6";
import TrailerModal from "./TrailerModal";

type MovieCardProps = {
  filmId?: string | number;
  imageUrl?: string;
  name?: string;
  // nhận sẵn tên thể loại: string[] | string
  type?: string[] | string | null | undefined;
  duration?: number | string;
  ageLimit?: string;
  isShowing?: unknown;
  trailerURL?: string;
  twoDthreeD?: string[] | null | undefined;
  languages?: string[] | string | null | undefined;
  subtitle?: unknown;
  onSelect?: (movieId?: string | number) => void;
};

const FALLBACK_POSTER =
  "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=1200&auto=format&fit=crop";

const MovieCard: React.FC<MovieCardProps> = ({
  filmId,
  imageUrl,
  name,
  type,
  duration,
  ageLimit,
  isShowing,
  trailerURL,
  twoDthreeD,
  languages,
  subtitle,
  onSelect,
}) => {
  const linkDetail = `/admin/ticket/${filmId ?? ""}`;
  const [videoOpen, setVideoOpen] = useState(false);

  const formatFlags = useMemo(
    () => (Array.isArray(twoDthreeD) ? twoDthreeD.map(String) : []),
    [twoDthreeD]
  );

  // typeText: nếu là mảng tên => join, nếu là string => giữ nguyên
  const typeText = useMemo(() => {
    if (!type) return "";
    return Array.isArray(type) ? type.filter(Boolean).join(", ") : String(type);
  }, [type]);

  const languageText = useMemo(() => {
    if (!languages) return "";
    return Array.isArray(languages)
      ? languages.filter(Boolean).map(String).join(", ")
      : String(languages);
  }, [languages]);

  const subtitleText = useMemo(() => (subtitle ? "Có" : "Không"), [subtitle]);

  return (
    <div className="flex flex-wrap justify-center gap-6 p-2 text-[0.7rem]">
      <div className="group flex w-full max-w-[300px] flex-col items-start gap-2">
        {/* Poster */}
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-gray-300 shadow-md transition duration-300 hover:shadow-lg">
          <img
            src={imageUrl || FALLBACK_POSTER}
            alt={name || "Movie Poster"}
            className="h-full w-full object-cover"
          />

          {/* 2D/3D */}
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
            </div>
          </div>

          {/* Overlay */}
          <div
            onClick={() => setVideoOpen(true)}
            className="absolute inset-0 z-10 hidden items-center justify-center bg-black/70 text-center opacity-0 transition-opacity duration-300 sm:flex sm:group-hover:opacity-100 text-[#F3EA28]"
          >
            <div className="flex w-full max-w-[85%] flex-col items-start justify-start space-y-4 px-6 text-left">
              <h3 className="mb-2 text-xl">{name}</h3>

              {typeText && (
                <p className="mt-2 flex items-center text-sm">
                  <FaTag className="mr-2 h-5 w-5 align-middle" />
                  {typeText}
                </p>
              )}

              {duration ? (
                <p className="mt-2 flex items-center text-sm">
                  <FaRegClock className="mr-2 h-5 w-5 align-middle" />
                  {typeof duration === "number" ? `${duration} phút` : duration}
                </p>
              ) : null}

              {languageText && (
                <p className="mt-2 flex items-center text-sm">
                  <FaGlobeAmericas className="mr-2 h-5 w-5 align-middle" />
                  Ngôn ngữ: {languageText}
                </p>
              )}

              <p className="mt-2 flex items-center text-sm">
                <FaCommentDots className="mr-2 h-5 w-5 align-middle" />
                Phụ đề: {subtitleText}
              </p>
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

          <div className=" flex items-center justify-between text-base">
            <button
              className="hidden items-center sm:flex cursor-pointer"
              onClick={() => setVideoOpen(true)}
            >
              <div className="mr-2 flex items-center justify-center ">
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
              className="h-[42px] w-full rounded-md bg-gray-900 text-white sm:w-[132px] cursor-pointer"
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
